import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadFileToS3 } from '@/lib/aws-s3';

// WhatsApp Cloud API configuration
const WHATSAPP_PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0';

interface MediaUploadResult {
  id: string;
  url: string;
}

/**
 * Upload media to WhatsApp and get media ID
 */
async function uploadMediaToWhatsApp(file: File): Promise<MediaUploadResult | null> {
  try {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.error('WhatsApp API credentials not configured');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', file.type);
    formData.append('messaging_product', 'whatsapp');

    const uploadResponse = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('WhatsApp media upload failed:', errorText);
      return null;
    }

    const result = await uploadResponse.json();
    console.log('Media uploaded to WhatsApp:', result);

    return {
      id: result.id,
      url: `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${result.id}`,
    };
  } catch (error) {
    console.error('Error uploading media to WhatsApp:', error);
    return null;
  }
}

/**
 * Send media message via WhatsApp
 */
async function sendMediaMessage(
  to: string,
  mediaId: string,
  mediaType: string,
  caption?: string
): Promise<{ messages: { id: string }[] }> {
  try {
    const whatsappApiUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const messageData: {
      messaging_product: string;
      to: string;
      type: string;
      image?: { id: string; caption?: string };
      video?: { id: string; caption?: string };
      audio?: { id: string };
      document?: { id: string };
    } = {
      messaging_product: 'whatsapp',
      to: to,
      type: mediaType,
    };

    // Configure message based on media type
    switch (mediaType) {
      case 'image':
        messageData.image = {
          id: mediaId,
          ...(caption && { caption }),
        };
        break;
      case 'video':
        messageData.video = {
          id: mediaId,
          ...(caption && { caption }),
        };
        break;
      case 'audio':
        messageData.audio = {
          id: mediaId,
        };
        break;
      case 'document':
        messageData.document = {
          id: mediaId,
        };
        break;
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }

    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WhatsApp message send failed:', errorText);
      throw new Error(`Failed to send message: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending media message:', error);
    throw error;
  }
}

/**
 * Get WhatsApp media type from file MIME type
 */
function getWhatsAppMediaType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

/**
 * POST handler for sending media messages
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const to = formData.get('to') as string;
    const files = formData.getAll('files') as File[];
    const captions = formData.getAll('captions') as string[];

    // Validate required parameters
    if (!to || files.length === 0) {
      console.error('Missing required parameters:', { to: !!to, filesCount: files.length });
      return new NextResponse('Missing required parameters: to, files', { status: 400 });
    }

    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      console.error('WhatsApp API credentials not configured');
      return new NextResponse('WhatsApp API not configured', { status: 500 });
    }

    const results = [];
    const timestamp = new Date().toISOString();

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const caption = captions[i] || '';

      console.log(`Processing file ${i + 1}/${files.length}: ${file.name} (${file.type}, ${file.size} bytes)`);

      try {
        // Upload media to WhatsApp
        const mediaUpload = await uploadMediaToWhatsApp(file);
        if (!mediaUpload) {
          throw new Error('Failed to upload media to WhatsApp');
        }

        // Determine media type
        const mediaType = getWhatsAppMediaType(file.type);

        // Send media message
        const messageResponse = await sendMediaMessage(to, mediaUpload.id, mediaType, caption);
        const messageId = messageResponse.messages?.[0]?.id;

        console.log(`Media message sent successfully: ${messageId}`);

        // Upload to S3 for our records
        const mediaIdForS3 = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const s3Url = await uploadFileToS3(file, user.id, mediaIdForS3);

        // Store in database
        const messageObject = {
          id: messageId || `outgoing_media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sender_id: user.id,
          receiver_id: to,
          content: caption || `[${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}]`,
          timestamp: timestamp,
          is_sent_by_me: true,
          message_type: mediaType,
          media_data: JSON.stringify({
            type: mediaType,
            id: mediaIdForS3,
            mime_type: file.type,
            filename: file.name,
            caption: caption,
            media_url: s3Url,
            s3_uploaded: !!s3Url,
            upload_timestamp: timestamp,
            whatsapp_media_id: mediaUpload.id,
          }),
        };

        const { error: dbError } = await supabase
          .from('messages')
          .insert([messageObject]);

        if (dbError) {
          console.error('Error storing message in database:', dbError);
        } else {
          console.log('Message stored successfully in database:', messageObject.id);
        }

        results.push({
          success: true,
          filename: file.name,
          messageId: messageId,
          mediaType: mediaType,
          s3Uploaded: !!s3Url,
        });

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        results.push({
          success: false,
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update last_active for the sender
    const { error: userUpdateError } = await supabase
      .from('users')
      .upsert([{
        id: user.id,
        name: user.user_metadata?.full_name || user.email || 'Unknown User',
        last_active: timestamp
      }], {
        onConflict: 'id'
      });

    if (userUpdateError) {
      console.error('Error updating user last_active:', userUpdateError);
    }

    // Return results
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      totalFiles: files.length,
      successCount,
      failureCount,
      results,
      timestamp,
    });

  } catch (error) {
    console.error('Error in send-media API:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { status: 500 }
    );
  }
}

/**
 * GET handler for checking API status
 */
export async function GET() {
  const isConfigured = !!(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN);
  
  return NextResponse.json({
    status: 'WhatsApp Send Media API',
    configured: isConfigured,
    version: WHATSAPP_API_VERSION,
    timestamp: new Date().toISOString()
  });
} 