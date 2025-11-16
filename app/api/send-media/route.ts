import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { uploadFileToS3, isWhatsAppSupportedFileType } from '@/lib/aws-s3';

export const runtime = 'nodejs';

interface MediaUploadResult {
  id: string;
  url: string;
}

/**
 * Upload media to WhatsApp and get media ID using user-specific credentials
 */
async function uploadMediaToWhatsApp(
  file: File,
  accessToken: string,
  phoneNumberId: string,
  apiVersion: string
): Promise<MediaUploadResult | null> {
  try {
    if (!accessToken || !phoneNumberId) {
      console.error('WhatsApp API credentials not provided');
      return null;
    }

    console.log(`Uploading to WhatsApp: ${file.name} (${file.type}, ${file.size} bytes)`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', file.type);
    formData.append('messaging_product', 'whatsapp');

    const uploadResponse = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('WhatsApp media upload failed:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });
      return null;
    }

    const result = await uploadResponse.json();
    console.log('Media uploaded to WhatsApp successfully:', {
      mediaId: result.id,
      fileName: file.name,
      fileType: file.type
    });

    return {
      id: result.id,
      url: `https://graph.facebook.com/${apiVersion}/${result.id}`,
    };
  } catch (error: unknown) {
    console.error('Error uploading media:', error);
    return null;
  }
}

/**
 * Send WhatsApp media message after uploading
 */
async function sendMediaMessage(
  to: string,
  mediaId: string,
  mediaType: string,
  caption: string | null,
  accessToken: string,
  phoneNumberId: string,
  apiVersion: string
): Promise<{ messages: Array<{ id: string }> }> {
  const messageData: {
    messaging_product: string;
    to: string;
    type: string;
    image?: { id: string; caption?: string };
    video?: { id: string; caption?: string };
    audio?: { id: string };
    document?: { id: string; filename?: string };
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
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      }
    );

    if (!response.ok) {
    const errorText = await response.text();
    console.error('WhatsApp API error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`WhatsApp API error: ${response.status} - ${errorText}`);
  }

    return await response.json();
  } catch (error: unknown) {
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
 * Now uses user-specific access tokens and phone number IDs
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      console.error('Authentication error: No user ID');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const to = formData.get('to') as string;
    const files = formData.getAll('files') as File[];
    const captions = formData.getAll('captions') as string[];

    // Validate required parameters
    if (!to || files.length === 0) {
      console.error('Missing required parameters:', { to: !!to, filesCount: files.length });
      return NextResponse.json(
        { error: 'Missing required parameters: to, files' },
        { status: 400 }
      );
    }

    // Get user's WhatsApp API credentials
    const settings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        phoneNumberId: true,
        apiVersion: true
      }
    });

    if (!settings) {
      console.error('User settings not found for user:', userId);
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured. Please complete setup.' },
        { status: 400 }
      );
    }

    if (!settings.accessToken || !settings.phoneNumberId) {
      console.error('WhatsApp API credentials not configured for user:', userId);
      return NextResponse.json(
        { error: 'WhatsApp Access Token not configured. Please complete setup.' },
        { status: 400 }
      );
    }

    const accessToken = settings.accessToken;
    const phoneNumberId = settings.phoneNumberId;
    const apiVersion = settings.apiVersion || 'v23.0';

    // Clean phone number for database consistency
    const cleanPhoneNumber = to.replace(/\s+/g, '').replace(/[^\d]/g, '');

    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { id: cleanPhoneNumber }
    });

    // Create user if they don't exist
    if (!existingUser) {
      console.log(`Creating new user: ${cleanPhoneNumber}`);
      try {
        await prisma.user.create({
          data: {
            id: cleanPhoneNumber,
            name: cleanPhoneNumber, // Use phone number as default name
            lastActive: new Date()
          }
        });
      } catch (userError: unknown) {
        console.error('Failed to create user:', userError);
        // Continue anyway as this shouldn't block media sending
      }
    }

    // Validate file types before processing
    const unsupportedFiles = files.filter(file => !isWhatsAppSupportedFileType(file.type));
    if (unsupportedFiles.length > 0) {
      console.error('Unsupported file types detected:', unsupportedFiles.map(f => ({ name: f.name, type: f.type })));
      return new NextResponse(
        JSON.stringify({
          error: 'Unsupported file types',
          message: `WhatsApp does not support the following file types: ${unsupportedFiles.map(f => f.type).join(', ')}`,
          unsupportedFiles: unsupportedFiles.map(f => ({ name: f.name, type: f.type }))
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    const timestamp = new Date().toISOString();

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const caption = captions[i] || '';

      console.log(`Processing file ${i + 1}/${files.length}: ${file.name} (${file.type}, ${file.size} bytes)`);

      try {
        // Upload media to WhatsApp using user-specific credentials
        const mediaUpload = await uploadMediaToWhatsApp(file, accessToken, phoneNumberId, apiVersion);
        if (!mediaUpload) {
          throw new Error('Failed to upload media to WhatsApp');
        }

        // Determine media type
        const mediaType = getWhatsAppMediaType(file.type);

        // Send media message using user-specific credentials
        const messageResponse = await sendMediaMessage(
          cleanPhoneNumber,
          mediaUpload.id,
          mediaType,
          caption,
          accessToken,
          phoneNumberId,
          apiVersion
        );
        const messageId = messageResponse.messages?.[0]?.id;

        console.log(`Media message sent successfully: ${messageId}`);

        // Upload to S3 for our records
        const mediaIdForS3 = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const s3Url = await uploadFileToS3(file, userId, mediaIdForS3);

        // Store in database
        const messageObject = {
          id: messageId || `outgoing_media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          senderId: userId, // Current authenticated user (sender)
          receiverId: cleanPhoneNumber, // Recipient phone number (receiver)
          content: caption || `[${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}]`,
          timestamp: new Date(timestamp),
          isSentByMe: true,
          isRead: true, // Outgoing messages are already "read" by the sender
          messageType: mediaType,
          mediaData: JSON.stringify({
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

        try {
          await prisma.message.create({
            data: messageObject
          });
          console.log('Message stored successfully in database:', messageObject.id);
        } catch (dbError: unknown) {
          console.error('Error storing message in database:', dbError);
        }

        results.push({
          success: true,
          filename: file.name,
          messageId: messageId,
          mediaType: mediaType,
          s3Uploaded: !!s3Url,
        });

      } catch (error: unknown) {
        console.error(`Error processing file ${file.name}:`, error);
        results.push({
          success: false,
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Note: Removed user last_active update to avoid RLS policy issues
    // The user's last_active will be updated by the webhook when they receive messages
    // or by other parts of the application where the user context is clearer

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

  } catch (error: unknown) {
    console.error('Error in send-media API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for checking API status (now user-specific)
 */
export async function GET() {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's WhatsApp API credentials
    const settings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        apiVersion: true
      }
    });

    const isConfigured = settings?.accessToken || false;
    const apiVersion = settings?.apiVersion || 'v23.0';

    return NextResponse.json({
      status: 'WhatsApp Send Media API',
      configured: isConfigured,
      version: apiVersion,
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({
      status: 'WhatsApp Send Media API',
      configured: false,
      error: 'Failed to check configuration',
      timestamp: new Date().toISOString()
    });
  }
} 