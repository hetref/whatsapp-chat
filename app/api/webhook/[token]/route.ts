import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { downloadAndUploadToS3 } from '@/lib/aws-s3';

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

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker';
  text?: {
    body: string;
  };
  image?: MediaInfo;
  document?: MediaInfo;
  audio?: MediaInfo;
  video?: MediaInfo;
  sticker?: MediaInfo;
}

/**
 * GET handler for WhatsApp webhook verification
 * WhatsApp will call this endpoint to verify your webhook URL
 * Uses unique token per user for enhanced security and multi-tenancy
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
    console.log("SEARCHPARAMS:", mode, verifyToken, challenge);

    console.log('Webhook verification attempt for token:', webhookToken?.substring(0, 8) + '...');

    if (mode !== 'subscribe') {
      console.log('Invalid mode:', mode);
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (!verifyToken) {
      console.log('No verify token provided');
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (!webhookToken) {
      console.log('No webhook token in URL');
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Find user by webhook token
    const settings = await prisma.userSettings.findFirst({
      where: { webhookToken: webhookToken },
      select: { id: true, verifyToken: true, webhookToken: true }
    });
    const error = null;

    console.log("SETTINGS:", settings, error, webhookToken);

    if (error || !settings) {
      console.error('Webhook verification failed: webhook token not found');
      console.error('Error details:', error);
      console.error('Looking for webhook_token:', webhookToken);

      // Check if there are any settings for debugging
      const allSettings = await prisma.userSettings.findMany({
        select: { id: true, webhookToken: true },
        take: 1
      });

      console.error('Debug - Sample settings:', allSettings);

      return new NextResponse('Forbidden', { status: 403 });
    }

    // Verify the verify_token matches
    if (settings.verifyToken !== verifyToken) {
      console.log('Webhook verification failed: verify token mismatch');
      return new NextResponse('Forbidden', { status: 403 });
    }

    console.log('Webhook verified successfully for user:', settings.id);

    // Mark webhook as verified for this user
    await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        webhookVerified: true,
        updatedAt: new Date()
      }
    });

    return new NextResponse(challenge, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in webhook verification:', error);
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
      console.error('WhatsApp access token not provided');
      return null;
    }

    // Get media info from WhatsApp API
    const mediaInfoResponse = await fetch(
      `https://graph.facebook.com/${apiVersion}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!mediaInfoResponse.ok) {
      console.error('Failed to get media info:', await mediaInfoResponse.text());
      return null;
    }

    const mediaInfo = await mediaInfoResponse.json();
    console.log('WhatsApp media info retrieved:', { id: mediaId, url: mediaInfo.url });

    return mediaInfo.url;
  } catch (error: unknown) {
    console.error('Error getting WhatsApp media URL:', error);
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
      content = `[Unsupported message type: ${message.type}]`;
      console.warn('Unsupported message type:', message.type);
  }

  return { content, messageType, mediaData };
}

/**
 * POST handler for incoming WhatsApp messages
 * WhatsApp will send message data to this endpoint
 * Uses unique token per user for enhanced security and multi-tenancy
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: webhookToken } = await params;
    const body = await request.json();

    console.log('Received webhook payload for token:', webhookToken?.substring(0, 8) + '...');

    if (!webhookToken) {
      console.error('No webhook token in URL');
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Find user by webhook token
    const userSettings = await prisma.userSettings.findFirst({
      where: { webhookToken: webhookToken },
      select: { id: true, accessToken: true, apiVersion: true, phoneNumberId: true }
    });

    if (!userSettings) {
      console.error('No user found for webhook token:', webhookToken?.substring(0, 8) + '...');

      // Debug: Check if there are any settings
      const debugSettings = await prisma.userSettings.findMany({
        select: { id: true, webhookToken: true },
        take: 1
      });

      console.error('Debug - Sample settings:', debugSettings);

      // Still acknowledge to avoid retries
      return new NextResponse('OK', { status: 200 });
    }

    const businessOwnerId = userSettings.id;
    const accessToken = userSettings.accessToken;
    const apiVersion = userSettings.apiVersion || 'v23.0';

    console.log('Found business owner:', businessOwnerId);

    // Extract message data from WhatsApp webhook payload
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages: WhatsAppMessage[] = value?.messages || [];
    const contacts: WhatsAppContact[] = value?.contacts || [];

    // Extract the phone number ID that received the message
    const phoneNumberId = value?.metadata?.phone_number_id;

    // Verify this message is for the correct user
    if (phoneNumberId && userSettings.phoneNumberId !== phoneNumberId) {
      console.warn('Phone number ID mismatch. Expected:', userSettings.phoneNumberId, 'Got:', phoneNumberId);
      return new NextResponse('OK', { status: 200 });
    }

    // Process each incoming message
    for (const message of messages) {
      const phoneNumber = message.from;
      const messageTimestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

      // Find contact information
      const contact = contacts.find((c: WhatsAppContact) => c.wa_id === phoneNumber);
      const contactName = contact?.profile?.name || phoneNumber;

      console.log(`Processing ${message.type} message from ${contactName} (${phoneNumber})`);

      // Process message content based on type
      const { content, messageType, mediaData } = processMessageContent(message);

      // Handle media upload to S3 if it's a media message
      let s3MediaUrl = null;
      let s3UploadSuccess = false;

      if (mediaData && mediaData.id && accessToken) {
        console.log(`Processing media upload for ${messageType}: ${mediaData.id}`);

        try {
          // Get WhatsApp media URL first
          const whatsappMediaUrl = await getWhatsAppMediaUrl(
            mediaData.id,
            accessToken,
            apiVersion
          );

          if (whatsappMediaUrl) {
            console.log(`Downloading and uploading ${messageType} to S3...`);

            // Validate media ID format
            if (!/^\d+$/.test(mediaData.id)) {
              throw new Error(`Invalid media ID format: ${mediaData.id}`);
            }

            // Download from WhatsApp and upload to S3
            s3MediaUrl = await downloadAndUploadToS3(
              whatsappMediaUrl,
              phoneNumber,
              mediaData.id,
              mediaData.mime_type || 'application/octet-stream',
              accessToken
            );

            if (s3MediaUrl) {
              console.log(`Successfully uploaded ${messageType} to S3: ${s3MediaUrl}`);
              s3UploadSuccess = true;
            } else {
              console.error(`Failed to upload ${messageType} to S3`);
            }
          } else {
            console.error(`Failed to get WhatsApp media URL for ${mediaData.id}`);
          }
        } catch (error) {
          console.error(`Error processing media upload for ${mediaData.id}:`, error);
        }
      }

      // Check if user exists in our database
      const existingUser = await prisma.user.findUnique({
        where: { id: phoneNumber }
      });

      // Create user if they don't exist
      if (!existingUser) {
        console.log(`Creating new user: ${contactName}`);
        try {
          await prisma.user.create({
            data: {
              id: phoneNumber,
              name: contactName,
              lastActive: new Date(messageTimestamp)
            }
          });
        } catch (userError) {
          console.error('Error creating user:', userError);
          continue;
        }
      } else {
        // Update last_active timestamp
        try {
          await prisma.user.update({
            where: { id: phoneNumber },
            data: { lastActive: new Date(messageTimestamp) }
          });
        } catch (updateError: unknown) {
          console.error('Error updating user last_seen:', updateError);
        }
      }

      // The receiver is the business owner
      const receiverId = businessOwnerId;

      console.log(`Message receiver identified as: ${receiverId}`);

      // Prepare message object with S3 URL
      const messageObject = {
        id: message.id,
        sender_id: phoneNumber,
        receiver_id: receiverId,
        content: content,
        timestamp: messageTimestamp,
        is_sent_by_me: false,
        is_read: false,
        message_type: messageType,
        media_data: mediaData ? JSON.stringify({
          ...mediaData,
          media_url: s3MediaUrl,
          s3_uploaded: s3UploadSuccess,
          upload_timestamp: s3UploadSuccess ? new Date().toISOString() : null,
          upload_error: !s3UploadSuccess && mediaData.id ? 'Failed to upload to S3' : null
        }) : null
      };

      // Store the message
      try {
        await prisma.message.create({
          data: {
            id: messageObject.id,
            senderId: messageObject.sender_id,
            receiverId: messageObject.receiver_id,
            content: messageObject.content,
            timestamp: new Date(messageObject.timestamp),
            isSentByMe: messageObject.is_sent_by_me,
            isRead: messageObject.is_read,
            messageType: messageObject.message_type,
            mediaData: messageObject.media_data || undefined
          }
        });
        console.log(`${messageType} message stored successfully: ${messageObject.id}`);
        if (mediaData) {
          console.log('Media data stored:', {
            type: mediaData.type,
            id: mediaData.id,
            s3_uploaded: s3UploadSuccess,
            has_s3_url: !!s3MediaUrl
          });
        }
      } catch (messageError) {
        console.error('Error storing message:', messageError);
      }
    }

    // Acknowledge receipt to WhatsApp
    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

