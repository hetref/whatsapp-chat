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

const STATUS_RANK: Record<string, number> = {
  PENDING: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  FAILED: 5,
};

async function processStatusUpdate(statusItem: any) {
  const messageId = statusItem?.id;
  const rawStatus = statusItem?.status;
  const timestampSec = statusItem?.timestamp ? parseInt(statusItem.timestamp, 10) : null;
  const statusDate = timestampSec ? new Date(timestampSec * 1000) : new Date();

  if (!messageId || !rawStatus) return;

  const targetStatus = String(rawStatus).toUpperCase();
  if (!['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(targetStatus)) return;

  const existing = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, status: true, deliveredAt: true },
  });

  if (!existing) {
    console.log(`[Webhook Status] Message ${messageId} not found in database yet. Status: ${targetStatus}`);
    return;
  }

  const currentRank = STATUS_RANK[existing.status] || 0;
  const newRank = STATUS_RANK[targetStatus] || 0;

  if (newRank < currentRank && currentRank !== STATUS_RANK.FAILED) {
    return;
  }

  const updateData: any = {};
  if (targetStatus === 'FAILED') {
    updateData.status = 'FAILED';
    if (Array.isArray(statusItem.errors) && statusItem.errors.length > 0) {
      const err = statusItem.errors[0];
      updateData.errorMessage = err.error_data?.details || err.message || err.title || `Error ${err.code}`;
    } else {
      updateData.errorMessage = 'Message delivery failed';
    }
  } else if (targetStatus === 'READ') {
    updateData.status = 'READ';
    updateData.isRead = true;
    updateData.readAt = statusDate;
    if (!existing.deliveredAt) {
      updateData.deliveredAt = statusDate;
    }
  } else if (targetStatus === 'DELIVERED') {
    updateData.status = 'DELIVERED';
    updateData.deliveredAt = statusDate;
  } else if (targetStatus === 'SENT') {
    updateData.status = 'SENT';
  }

  try {
    await prisma.message.update({
      where: { id: messageId },
      data: updateData,
    });
    console.log(`[Webhook Status] Updated ${messageId} -> ${targetStatus}`);
  } catch (e) {
    console.error(`[Webhook Status] Error updating ${messageId}:`, e);
  }
}

/**
 * GET handler for WhatsApp webhook verification
 * WhatsApp calls this endpoint to verify the webhook URL.
 * Supports verifyToken, webhookToken, and environment tokens.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('[Webhook GET] Verification attempt:', { mode, token: token ? '***' : null });

    if (mode !== 'subscribe') {
      console.warn('[Webhook GET] Invalid mode:', mode);
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (!token) {
      console.warn('[Webhook GET] No verify_token provided');
      return new NextResponse('Forbidden', { status: 403 });
    }

    const envVerifyToken =
      process.env.META_WEBHOOK_VERIFY_TOKEN ||
      process.env.WHATSAPP_VERIFY_TOKEN ||
      process.env.VERIFY_TOKEN ||
      process.env.WEBHOOK_VERIFY_TOKEN;
    const isEnvMatch = envVerifyToken && token === envVerifyToken;

    // Check if the token matches any user's verifyToken OR webhookToken
    const settings = await prisma.userSettings.findFirst({
      where: {
        OR: [
          { verifyToken: token },
          { webhookToken: token },
        ],
      },
      select: { id: true, verifyToken: true, webhookToken: true },
    });

    if (!settings && !isEnvMatch) {
      console.warn('[Webhook GET] Verification failed: token does not match any user or env token');
      return new NextResponse('Forbidden', { status: 403 });
    }

    console.log('[Webhook GET] Webhook verified successfully for:', settings?.id || 'env_token');

    if (settings) {
      await prisma.userSettings.update({
        where: { id: settings.id },
        data: {
          webhookVerified: true,
          updatedAt: new Date(),
        },
      });
    }

    return new NextResponse(challenge, { status: 200 });
  } catch (error: unknown) {
    console.error('[Webhook GET] Error in webhook verification:', error);
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
      console.error('[Webhook] WhatsApp access token not provided for media fetch');
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
      console.error('[Webhook] Failed to get media info:', await mediaInfoResponse.text());
      return null;
    }

    const mediaInfo = await mediaInfoResponse.json();
    console.log('[Webhook] Media info retrieved:', { id: mediaId, url: mediaInfo.url });

    return mediaInfo.url;
  } catch (error: unknown) {
    console.error('[Webhook] Error getting WhatsApp media URL:', error);
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
      console.warn('[Webhook] Non-standard message type:', message.type);
  }

  return { content, messageType, mediaData };
}

/**
 * POST handler for incoming WhatsApp messages
 * WhatsApp sends real-time message events to this endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[Webhook POST] Received payload:', JSON.stringify(body, null, 2));

    const entries = Array.isArray(body?.entry) ? body.entry : [];
    if (entries.length === 0) {
      return new NextResponse('OK', { status: 200 });
    }

    for (const entry of entries) {
      const wabaId = entry?.id ? String(entry.id) : null;
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        const messages: WhatsAppMessage[] = value.messages || [];
        const contacts: WhatsAppContact[] = value.contacts || [];

        // Process status updates (sent, delivered, read, failed)
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        if (statuses.length > 0) {
          console.log(`[Webhook POST] Processing ${statuses.length} status updates`);
          for (const s of statuses) {
            await processStatusUpdate(s);
          }
        }

        // If this change contains no messages, continue
        if (messages.length === 0) {
          continue;
        }

        const rawPhoneId = value.metadata?.phone_number_id;
        const phoneNumberIdStr = rawPhoneId ? String(rawPhoneId) : null;
        const displayPhoneNumber = value.metadata?.display_phone_number
          ? String(value.metadata.display_phone_number).replace(/\D/g, '')
          : null;

        console.log('[Webhook POST] Incoming message:', {
          phoneNumberId: phoneNumberIdStr,
          wabaId,
          displayPhoneNumber,
          messageCount: messages.length,
        });

        // 1. Robust business owner lookup: check phoneNumberId, WABA ID, or displayPhoneNumber
        let userSettings = null;

        if (phoneNumberIdStr) {
          userSettings = await prisma.userSettings.findFirst({
            where: { phoneNumberId: phoneNumberIdStr },
            select: { id: true, accessToken: true, apiVersion: true, phoneNumberId: true, businessAccountId: true },
          });
        }

        if (!userSettings && wabaId) {
          userSettings = await prisma.userSettings.findFirst({
            where: { businessAccountId: wabaId },
            select: { id: true, accessToken: true, apiVersion: true, phoneNumberId: true, businessAccountId: true },
          });

          // If found by WABA ID and phoneNumberId is provided, auto-sync it to UserSettings!
          if (userSettings && phoneNumberIdStr && userSettings.phoneNumberId !== phoneNumberIdStr) {
            await prisma.userSettings.update({
              where: { id: userSettings.id },
              data: { phoneNumberId: phoneNumberIdStr, updatedAt: new Date() },
            });
            userSettings.phoneNumberId = phoneNumberIdStr;
            console.log(`[Webhook POST] Auto-linked phoneNumberId ${phoneNumberIdStr} to user ${userSettings.id}`);
          }
        }

        if (!userSettings && displayPhoneNumber) {
          userSettings = await prisma.userSettings.findFirst({
            where: { phoneNumber: { contains: displayPhoneNumber } },
            select: { id: true, accessToken: true, apiVersion: true, phoneNumberId: true, businessAccountId: true },
          });
        }

        // Fallback: If only 1 user in system has WhatsApp credentials, route to them
        if (!userSettings) {
          const activeUsers = await prisma.userSettings.findMany({
            where: { accessToken: { not: null } },
            select: { id: true, accessToken: true, apiVersion: true, phoneNumberId: true, businessAccountId: true },
            take: 2,
          });

          if (activeUsers.length === 1) {
            userSettings = activeUsers[0];
            if (phoneNumberIdStr && userSettings.phoneNumberId !== phoneNumberIdStr) {
              await prisma.userSettings.update({
                where: { id: userSettings.id },
                data: {
                  phoneNumberId: phoneNumberIdStr,
                  ...(wabaId && !userSettings.businessAccountId ? { businessAccountId: wabaId } : {}),
                  updatedAt: new Date(),
                },
              });
              userSettings.phoneNumberId = phoneNumberIdStr;
              console.log(`[Webhook POST] Routed to active user ${userSettings.id} and updated phoneNumberId to ${phoneNumberIdStr}`);
            }
          }
        }

        if (!userSettings) {
          console.error('[Webhook POST] No user found for phone_number_id:', phoneNumberIdStr, 'or WABA ID:', wabaId);
          continue;
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
          continue;
        }

        // 2. Process each incoming message
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

          console.log(`[Webhook POST] Processing ${message.type} from ${contactName} (${cleanPhone})`);

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
            console.log(`[Webhook POST] Creating new contact for user ${businessOwnerId}: ${contactName} (${cleanPhone})`);
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
              console.warn('[Webhook POST] Contact creation race condition, re-querying:', contactError);
              existingContact = await prisma.contact.findFirst({
                where: {
                  userId: businessOwnerId,
                  OR: [{ phoneNumber: cleanPhone }, { phoneNumber: rawSender }],
                },
              });
              if (!existingContact) {
                console.error('[Webhook POST] Failed to obtain contact record');
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
              console.error('[Webhook POST] Error updating contact last_active:', updateError);
            }
          }

          // Handle reaction messages
          if (message.type === 'reaction') {
            const reactionTargetId = message.reaction?.message_id;
            const emoji = message.reaction?.emoji || '';

            if (!reactionTargetId) {
              console.warn('[Webhook POST] Reaction message missing target message_id', message.id);
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
              console.log(`[Webhook POST] Reaction updated: ${reactionTargetId} (${emoji || 'removed'})`);
            } else {
              console.warn(`[Webhook POST] Reaction target not found: ${reactionTargetId}`);
            }

            continue;
          }

          // Process message content
          const { content, messageType, mediaData } = processMessageContent(message);

          // Handle media upload to S3 if applicable
          let s3UploadSuccess = false;
          if (mediaData && mediaData.id && accessToken) {
            console.log(`[Webhook POST] Processing media download for ${messageType}: ${mediaData.id}`);
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
              console.error('[Webhook POST] Error processing media upload:', mediaErr);
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
            console.log(`[Webhook POST] ${messageType} message stored successfully: ${message.id} (from: ${cleanPhone})`);
          } catch (messageError: unknown) {
            console.error('[Webhook POST] Error storing message:', messageError);
          }
        }
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: unknown) {
    console.error('[Webhook POST] Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}