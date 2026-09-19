import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { downloadAndUploadToS3 } from '@/lib/aws-s3';
import { incrementStorageUsed, checkSubscriptionActive } from '@/lib/plan-limits';
import { getOrCreateUser } from '@/lib/user-sync';

export const runtime = 'nodejs';

// TypeScript interfaces for webhook payload
interface WhatsAppContact {
  wa_id: string;
  profile?: {
    name: string;
  };
}

interface MediaInfo {
  id: string;
  mime_type: string;
  sha256: string;
  filename?: string;
  caption?: string;
  voice?: boolean;
}

interface WhatsAppReaction {
  message_id: string;
  emoji?: string;
}

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'reaction' | 'button' | 'interactive';
  text?: {
    body: string;
  };
  image?: MediaInfo;
  document?: MediaInfo;
  audio?: MediaInfo;
  video?: MediaInfo;
  sticker?: MediaInfo;
  reaction?: WhatsAppReaction;
  button?: {
    text: string;
    payload?: string;
  };
  interactive?: {
    type: string;
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

function normalizeReactions(raw: unknown): Array<{ emoji: string; from: string; timestamp: string }> {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => ({
        emoji: String(entry?.emoji || ''),
        from: String(entry?.from || ''),
        timestamp: String(entry?.timestamp || ''),
      }))
      .filter((entry) => entry.emoji || entry.from || entry.timestamp);
  }
  return [];
}

async function upsertMessageReaction(params: {
  userId: string;
  messageId: string;
  emoji: string;
  from: string;
  timestamp: string;
}) {
  const message = await prisma.message.findUnique({
    where: { id: params.messageId },
    select: { id: true, userId: true, reactions: true },
  });

  if (!message || message.userId !== params.userId) {
    return { updated: false, reason: 'not_found' as const };
  }

  const current = normalizeReactions(message.reactions);
  const filtered = current.filter((reaction) => reaction.from !== params.from);

  if (params.emoji) {
    filtered.push({ emoji: params.emoji, from: params.from, timestamp: params.timestamp });
  }

  await prisma.message.update({
    where: { id: params.messageId },
    data: { reactions: filtered },
  });

  return { updated: true };
}

/**
 * GET handler for WhatsApp webhook verification
 * WhatsApp calls this endpoint to verify user-specific webhook URLs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: webhookToken } = await params;
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const verifyToken = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('[Webhook GET /:token] Verification attempt for token:', webhookToken?.substring(0, 8) + '...');

    if (mode !== 'subscribe') {
      console.warn('[Webhook GET /:token] Invalid mode:', mode);
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (!verifyToken) {
      console.warn('[Webhook GET /:token] No verify token provided');
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (!webhookToken) {
      console.warn('[Webhook GET /:token] No webhook token in URL');
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Find user by webhook token
    const settings = await prisma.userSettings.findFirst({
      where: { webhookToken: webhookToken },
      select: { id: true, verifyToken: true, webhookToken: true },
    });

    if (!settings) {
      console.error('[Webhook GET /:token] Webhook token not found:', webhookToken?.substring(0, 8));
      return new NextResponse('Forbidden', { status: 403 });
    }

    const envVerifyToken =
      process.env.META_WEBHOOK_VERIFY_TOKEN ||
      process.env.WHATSAPP_VERIFY_TOKEN ||
      process.env.VERIFY_TOKEN ||
      process.env.WEBHOOK_VERIFY_TOKEN;
    const isEnvMatch = envVerifyToken && verifyToken === envVerifyToken;

    // Verify against user's verifyToken, webhookToken, or env token
    const isValidToken =
      settings.verifyToken === verifyToken ||
      settings.webhookToken === verifyToken ||
      isEnvMatch;

    if (!isValidToken) {
      console.warn('[Webhook GET /:token] Verify token mismatch');
      return new NextResponse('Forbidden', { status: 403 });
    }

    console.log('[Webhook GET /:token] Verified successfully for user:', settings.id);

    // Mark webhook as verified for this user
    await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        webhookVerified: true,
        updatedAt: new Date(),
      },
    });

    return new NextResponse(challenge, { status: 200 });
  } catch (error: unknown) {
    console.error('[Webhook GET /:token] Error in webhook verification:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Get media URL from WhatsApp API using user-specific access token
 */
async function getWhatsAppMediaUrl(
  mediaId: string,
  accessToken: string,
  apiVersion: string
): Promise<string | null> {
  try {
    if (!accessToken) {
      console.error('[Webhook /:token] Access token not provided');
      return null;
    }

    const mediaInfoResponse = await fetch(
      `https://graph.facebook.com/${apiVersion}/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!mediaInfoResponse.ok) {
      console.error('[Webhook /:token] Failed to get media info:', await mediaInfoResponse.text());
      return null;
    }

    const mediaInfo = await mediaInfoResponse.json();
    return mediaInfo.url;
  } catch (error: unknown) {
    console.error('[Webhook /:token] Error getting WhatsApp media URL:', error);
    return null;
  }
}

/**
 * Process different message types and extract content
 */
function processMessageContent(message: WhatsAppMessage) {
  let content = '';
  const messageType = message.type;
  let mediaData = null;

  switch (message.type) {
    case 'text':
      content = message.text?.body || '';
      break;

    case 'button':
      content = message.button?.text || '[Button Response]';
      break;

    case 'interactive':
      if (message.interactive?.button_reply?.title) {
        content = message.interactive.button_reply.title;
      } else if (message.interactive?.list_reply?.title) {
        content = message.interactive.list_reply.title;
      } else {
        content = '[Interactive Response]';
      }
      break;

    case 'image':
      content = message.image?.caption || '[Image]';
      mediaData = {
        type: 'image',
        id: message.image?.id,
        mime_type: message.image?.mime_type,
        sha256: message.image?.sha256,
        caption: message.image?.caption,
      };
      break;

    case 'document':
      content = `[Document: ${message.document?.filename || 'Unknown'}]`;
      mediaData = {
        type: 'document',
        id: message.document?.id,
        mime_type: message.document?.mime_type,
        sha256: message.document?.sha256,
        filename: message.document?.filename,
      };
      break;

    case 'audio':
      content = message.audio?.voice ? '[Voice Message]' : '[Audio]';
      mediaData = {
        type: 'audio',
        id: message.audio?.id,
        mime_type: message.audio?.mime_type,
        sha256: message.audio?.sha256,
        voice: message.audio?.voice,
      };
      break;

    case 'video':
      content = message.video?.caption || '[Video]';
      mediaData = {
        type: 'video',
        id: message.video?.id,
        mime_type: message.video?.mime_type,
        sha256: message.video?.sha256,
        caption: message.video?.caption,
      };
      break;

    case 'sticker':
      content = '[Sticker]';
      mediaData = {
        type: 'sticker',
        id: message.sticker?.id,
        mime_type: message.sticker?.mime_type,
        sha256: message.sticker?.sha256,
      };
      break;

    default:
      content = `[Message: ${message.type}]`;
      console.warn('[Webhook /:token] Non-standard message type:', message.type);
  }

  return { content, messageType, mediaData };
}

/**
 * POST handler for incoming WhatsApp messages for a specific tenant token
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: webhookToken } = await params;
    const body = await request.json();

    console.log('[Webhook POST /:token] Received payload for token:', webhookToken?.substring(0, 8) + '...');

    if (!webhookToken) {
      console.error('[Webhook POST /:token] No webhook token in URL');
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Find user by webhook token
    const userSettings = await prisma.userSettings.findFirst({
      where: { webhookToken: webhookToken },
      select: { id: true, accessToken: true, apiVersion: true, phoneNumberId: true, businessAccountId: true },
    });

    if (!userSettings) {
      console.error('[Webhook POST /:token] No user found for webhook token:', webhookToken?.substring(0, 8));
      return new NextResponse('OK', { status: 200 });
    }

    const businessOwnerId = userSettings.id;
    const accessToken = userSettings.accessToken;
    const apiVersion = userSettings.apiVersion || 'v23.0';

    // Ensure user record exists in prisma.user
    await getOrCreateUser(businessOwnerId);

    // Check if subscription is active
    const subCheck = await checkSubscriptionActive(businessOwnerId);
    if (!subCheck.active) {
      console.log(`⛔ Incoming message blocked for user ${businessOwnerId}: subscription ${subCheck.status}`);
      return new NextResponse('OK', { status: 200 });
    }

    const entries = Array.isArray(body?.entry) ? body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        const messages: WhatsAppMessage[] = value.messages || [];
        const contacts: WhatsAppContact[] = value.contacts || [];

        if (messages.length === 0) continue;

        // Auto-link phone number ID if received from Meta and not yet stored or updated
        const phoneNumberId = value.metadata?.phone_number_id ? String(value.metadata.phone_number_id) : null;
        if (phoneNumberId && userSettings.phoneNumberId !== phoneNumberId) {
          console.log(`[Webhook POST /:token] Auto-updating phoneNumberId for user ${businessOwnerId}: ${phoneNumberId}`);
          await prisma.userSettings.update({
            where: { id: businessOwnerId },
            data: { phoneNumberId, updatedAt: new Date() },
          });
          userSettings.phoneNumberId = phoneNumberId;
        }

        // Process each incoming message
        for (const message of messages) {
          const rawSender = message.from;
          const cleanPhone = String(rawSender).replace(/\s+/g, '').replace(/[^\d]/g, '');
          const messageTimestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

          // Find contact profile from contacts array if available
          const contactInfo = contacts.find(
            (c: WhatsAppContact) =>
              c.wa_id === rawSender || c.wa_id.replace(/\D/g, '') === cleanPhone
          );
          const contactName = contactInfo?.profile?.name || rawSender;

          console.log(`[Webhook POST /:token] Processing ${message.type} from ${contactName} (${cleanPhone})`);

          // Look up contact by clean phone or raw phone
          let existingContact = await prisma.contact.findFirst({
            where: {
              userId: businessOwnerId,
              OR: [
                { phoneNumber: cleanPhone },
                { phoneNumber: `+${cleanPhone}` },
                { phoneNumber: rawSender },
              ],
            },
          });

          // Create contact if they don't exist
          if (!existingContact) {
            console.log(`[Webhook POST /:token] Creating new contact for user ${businessOwnerId}: ${contactName} (${cleanPhone})`);
            try {
              existingContact = await prisma.contact.create({
                data: {
                  userId: businessOwnerId,
                  phoneNumber: cleanPhone,
                  whatsappName: contactName !== rawSender && contactName !== cleanPhone ? contactName : null,
                  lastActive: new Date(messageTimestamp),
                },
              });
            } catch (contactError: unknown) {
              console.warn('[Webhook POST /:token] Contact creation race condition, re-querying:', contactError);
              existingContact = await prisma.contact.findFirst({
                where: {
                  userId: businessOwnerId,
                  OR: [{ phoneNumber: cleanPhone }, { phoneNumber: rawSender }],
                },
              });
              if (!existingContact) {
                console.error('[Webhook POST /:token] Failed to obtain contact record');
                continue;
              }
            }
          } else {
            // Update lastActive and whatsappName
            try {
              await prisma.contact.update({
                where: { id: existingContact.id },
                data: {
                  lastActive: new Date(messageTimestamp),
                  whatsappName:
                    contactName && contactName !== rawSender && contactName !== cleanPhone
                      ? contactName
                      : existingContact.whatsappName,
                },
              });
            } catch (updateError: unknown) {
              console.error('[Webhook POST /:token] Error updating contact last_active:', updateError);
            }
          }

          // Handle reaction messages
          if (message.type === 'reaction') {
            const reactionTargetId = message.reaction?.message_id;
            const emoji = message.reaction?.emoji || '';

            if (!reactionTargetId) {
              console.warn('[Webhook POST /:token] Reaction message missing target message_id', message.id);
              continue;
            }

            const result = await upsertMessageReaction({
              userId: businessOwnerId,
              messageId: reactionTargetId,
              emoji,
              from: cleanPhone,
              timestamp: messageTimestamp,
            });

            if (result.updated) {
              console.log(`[Webhook POST /:token] Reaction updated: ${reactionTargetId} (${emoji || 'removed'})`);
            } else {
              console.warn(`[Webhook POST /:token] Reaction target not found: ${reactionTargetId}`);
            }

            continue;
          }

          // Process message content
          const { content, messageType, mediaData } = processMessageContent(message);

          // Handle media upload to S3 if applicable
          let s3UploadSuccess = false;
          if (mediaData && mediaData.id && accessToken) {
            console.log(`[Webhook POST /:token] Processing media upload for ${messageType}: ${mediaData.id}`);
            try {
              const whatsappMediaUrl = await getWhatsAppMediaUrl(mediaData.id, accessToken, apiVersion);
              if (whatsappMediaUrl && /^\d+$/.test(mediaData.id)) {
                const s3UploadedBytes = await downloadAndUploadToS3(
                  whatsappMediaUrl,
                  cleanPhone,
                  mediaData.id,
                  mediaData.mime_type || 'application/octet-stream',
                  accessToken
                );
                s3UploadSuccess = s3UploadedBytes > 0;
                if (s3UploadSuccess) {
                  await incrementStorageUsed(businessOwnerId, s3UploadedBytes);
                }
              }
            } catch (mediaErr) {
              console.error('[Webhook POST /:token] Error processing media upload:', mediaErr);
            }
          }

          const messageObject = {
            id: message.id,
            user_id: businessOwnerId,
            contact_id: existingContact.id,
            content: content,
            timestamp: messageTimestamp,
            is_sent_by_me: false,
            is_read: false,
            message_type: messageType,
            media_data: mediaData
              ? JSON.stringify({
                  ...mediaData,
                  s3_uploaded: s3UploadSuccess,
                  s3_owner_id: cleanPhone,
                  upload_timestamp: s3UploadSuccess ? new Date().toISOString() : null,
                  upload_error: !s3UploadSuccess && mediaData.id ? 'Failed to upload to S3' : null,
                })
              : null,
          };

          // Store incoming message with upsert to prevent unique key constraint errors on retries
          try {
            await prisma.message.upsert({
              where: { id: messageObject.id },
              update: {
                content: messageObject.content,
                isRead: messageObject.is_read,
                mediaData: messageObject.media_data || undefined,
              },
              create: {
                id: messageObject.id,
                userId: messageObject.user_id,
                contactId: messageObject.contact_id,
                content: messageObject.content,
                timestamp: new Date(messageObject.timestamp),
                isSentByMe: messageObject.is_sent_by_me,
                isRead: messageObject.is_read,
                messageType: messageObject.message_type,
                mediaData: messageObject.media_data || undefined,
              },
            });
            console.log(`[Webhook POST /:token] ${messageType} message stored successfully: ${message.id} (from: ${cleanPhone})`);
          } catch (messageError: unknown) {
            console.error('[Webhook POST /:token] Error storing message:', messageError);
          }
        }
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: unknown) {
    console.error('[Webhook POST /:token] Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
