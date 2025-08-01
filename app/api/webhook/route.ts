import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { downloadAndUploadToS3 } from '@/lib/aws-s3';

// WhatsApp webhook verification token (set this in your environment variables)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'your-verify-token';

// WhatsApp API configuration for media downloads
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0';

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
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Verify the webhook
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.log('Webhook verification failed');
      return new NextResponse('Forbidden', { status: 403 });
    }
  } catch (error) {
    console.error('Error in webhook verification:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Get media URL from WhatsApp API
 */
async function getWhatsAppMediaUrl(mediaId: string): Promise<string | null> {
  try {
    if (!WHATSAPP_ACCESS_TOKEN) {
      console.error('WhatsApp access token not configured');
      return null;
    }

    // Get media info from WhatsApp API
    const mediaInfoResponse = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
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
  } catch (error) {
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
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    console.log('Received webhook payload:', JSON.stringify(body, null, 2));

    // Extract message data from WhatsApp webhook payload
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages: WhatsAppMessage[] = value?.messages || [];
    const contacts: WhatsAppContact[] = value?.contacts || [];
    
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
      if (mediaData && mediaData.id && WHATSAPP_ACCESS_TOKEN) {
        console.log(`Processing media upload for ${messageType}: ${mediaData.id}`);
        
        // Get WhatsApp media URL first
        const whatsappMediaUrl = await getWhatsAppMediaUrl(mediaData.id);
        
        if (whatsappMediaUrl) {
          console.log(`Downloading and uploading ${messageType} to S3...`);
          
          // Download from WhatsApp and upload to S3
          s3MediaUrl = await downloadAndUploadToS3(
            whatsappMediaUrl,
            phoneNumber, // sender ID for folder structure
            mediaData.id, // media ID for filename
            mediaData.mime_type || 'application/octet-stream',
            WHATSAPP_ACCESS_TOKEN
          );
          
          if (s3MediaUrl) {
            console.log(`Successfully uploaded ${messageType} to S3: ${s3MediaUrl}`);
          } else {
            console.error(`Failed to upload ${messageType} to S3`);
          }
        } else {
          console.error(`Failed to get WhatsApp media URL for ${mediaData.id}`);
        }
      }

      // Check if user exists in our database
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', phoneNumber)
        .single();

      // Create user if they don't exist
      if (!existingUser) {
        console.log(`Creating new user: ${contactName}`);
        const { error: userError } = await supabase
          .from('users')
          .insert([{
            id: phoneNumber,
            name: contactName,
            last_active: messageTimestamp
          }]);

        if (userError) {
          console.error('Error creating user:', userError);
          continue; // Skip this message if user creation fails
        }
      } else {
        // Update last_active timestamp for existing user
        const { error: updateError } = await supabase
          .from('users')
          .update({ last_active: messageTimestamp })
          .eq('id', phoneNumber);

        if (updateError) {
          console.error('Error updating user last_active:', updateError);
        }
      }

      // Find the receiver - this should be the authenticated user who owns the WhatsApp Business account
      const businessOwnerId = process.env.WHATSAPP_BUSINESS_OWNER_ID;
      let receiverId = businessOwnerId;
      
      if (!receiverId) {
        // Try to find a user in the system (this is a fallback approach)
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .neq('id', phoneNumber) // Don't select the sender
          .limit(1);
        
        if (users && users.length > 0) {
          receiverId = users[0].id;
        } else {
          // If no users found, we'll create a placeholder system user
          receiverId = 'whatsapp-business-account';
          
          // Ensure the system user exists
          const { error: systemUserError } = await supabase
            .from('users')
            .upsert([{
              id: receiverId,
              name: 'WhatsApp Business Account',
              last_active: messageTimestamp
            }], {
              onConflict: 'id'
            });

          if (systemUserError) {
            console.error('Error creating system user:', systemUserError);
          }
        }
      }

      console.log(`Message receiver identified as: ${receiverId}`);

      // Prepare message object for database with S3 URL
      const messageObject = {
        id: message.id, // Use WhatsApp message ID
        sender_id: phoneNumber,
        receiver_id: receiverId,
        content: content,
        timestamp: messageTimestamp,
        is_sent_by_me: false,
        message_type: messageType,
        media_data: mediaData ? JSON.stringify({
          ...mediaData,
          media_url: s3MediaUrl, // Use S3 URL instead of WhatsApp URL
          s3_uploaded: !!s3MediaUrl, // Flag to indicate if uploaded to S3
          upload_timestamp: s3MediaUrl ? new Date().toISOString() : null
        }) : null
      };

      // Store the incoming message with S3 media URL
      const { error: messageError } = await supabase
        .from('messages')
        .insert([messageObject]);

      if (messageError) {
        console.error('Error storing message:', messageError);
      } else {
        console.log(`${messageType} message stored successfully: ${message.id} (from: ${phoneNumber} to: ${receiverId})`);
        if (mediaData) {
          console.log('Media data stored with S3 URL:', {
            type: mediaData.type,
            id: mediaData.id,
            s3_uploaded: !!s3MediaUrl,
            has_s3_url: !!s3MediaUrl
          });
        }
      }
    }

    // Acknowledge receipt to WhatsApp
    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}