import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { uploadFileToS3, isWhatsAppSupportedFileType, generatePresignedUrlByKey } from '@/lib/aws-s3';
import { checkContactsLimit, checkStorageLimit, incrementStorageUsed, checkSubscriptionActive } from '@/lib/plan-limits';

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
 * Send WhatsApp media message using either media ID or link URL
 */
async function sendMediaMessage(
  to: string,
  media: { id: string } | { link: string },
  mediaType: string,
  caption: string | null,
  accessToken: string,
  phoneNumberId: string,
  apiVersion: string,
  filename?: string
): Promise<{ messages: Array<{ id: string }> }> {
  const mediaPayload = 'id' in media
    ? { ...media, ...(caption && { caption }), ...(mediaType === 'document' && filename && { filename }) }
    : { ...media, ...(caption && { caption }), ...(mediaType === 'document' && filename && { filename }) };

  const messageData: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to: to,
    type: mediaType,
    [mediaType]: mediaPayload,
  };

  // Audio doesn't support captions
  if (mediaType === 'audio') {
    const audioPayload = 'id' in media ? { id: media.id } : { link: media.link };
    messageData[mediaType] = audioPayload;
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
 * 
 * Supports two modes:
 * 1. JSON body (for large files): Files are pre-uploaded to S3 via presigned URLs.
 *    The server generates a presigned GET URL and sends to WhatsApp using the `link` parameter.
 *    This bypasses the Vercel body size limit (4.5MB).
 * 
 * 2. FormData body (for small files / legacy): Files are sent in the request body.
 *    Limited to ~4.5MB total payload by Vercel.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subCheck = await checkSubscriptionActive(userId);
    if (!subCheck.active) {
      return NextResponse.json(
        { error: 'Messaging blocked', message: subCheck.message, subscriptionStatus: subCheck.status },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // Route to appropriate handler based on content type
    if (contentType.includes('application/json')) {
      return handleS3MediaSend(request, userId);
    } else {
      return handleFormDataMediaSend(request, userId);
    }
  } catch (error: unknown) {
    console.error('Error in send-media API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * New flow: Files already uploaded to S3 via presigned URLs.
 * Generate presigned GET URLs and send to WhatsApp using `link` parameter.
 */
interface S3MediaFile {
  s3Key: string;
  mediaId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  caption?: string;
}

async function handleS3MediaSend(request: NextRequest, userId: string) {
  const body = await request.json();
  const { to, files } = body as { to: string; files: S3MediaFile[] };

  if (!to || !files || files.length === 0) {
    return NextResponse.json(
      { error: 'Missing required parameters: to, files' },
      { status: 400 }
    );
  }

  // Get WhatsApp API credentials
  const settings = await prisma.userSettings.findUnique({
    where: { id: userId },
    select: { accessToken: true, phoneNumberId: true, apiVersion: true }
  });

  if (!settings?.accessToken || !settings?.phoneNumberId) {
    return NextResponse.json(
      { error: 'WhatsApp credentials not configured. Please complete setup.' },
      { status: 400 }
    );
  }

  const { accessToken, phoneNumberId, apiVersion: rawApiVersion } = settings;
  const apiVersion = rawApiVersion || 'v23.0';
  const cleanPhoneNumber = to.replace(/\s+/g, '').replace(/[^\d]/g, '');

  // Find or create contact
  let contact = await prisma.contact.findUnique({
    where: {
      contacts_user_id_phone_number_key: { userId, phoneNumber: cleanPhoneNumber }
    }
  });

  if (!contact) {
    const contactCheck = await checkContactsLimit(userId);
    if (!contactCheck.allowed) {
      return NextResponse.json(
        { error: `Contacts limit reached (${contactCheck.current}/${contactCheck.limit}). Upgrade your plan.` },
        { status: 403 }
      );
    }

    try {
      contact = await prisma.contact.create({
        data: { userId, phoneNumber: cleanPhoneNumber, lastActive: new Date() }
      });
    } catch {
      return NextResponse.json({ error: 'Failed to create contact record' }, { status: 500 });
    }
  }

  const results = [];
  const timestamp = new Date();

  for (const file of files) {
    try {
      const mediaType = getWhatsAppMediaType(file.mimeType);

      // Generate a presigned GET URL for WhatsApp to download the file
      const presignedUrl = await generatePresignedUrlByKey(file.s3Key, 3600);
      if (!presignedUrl) {
        throw new Error('Failed to generate download URL for uploaded file');
      }

      // Send to WhatsApp using link parameter
      const messageResponse = await sendMediaMessage(
        cleanPhoneNumber,
        { link: presignedUrl },
        mediaType,
        file.caption || null,
        accessToken,
        phoneNumberId,
        apiVersion,
        file.fileName
      );
      const messageId = messageResponse.messages?.[0]?.id;

      // Track storage usage
      await incrementStorageUsed(userId, file.fileSize);

      // Store message in database
      const messageObject = {
        id: messageId || `outgoing_media_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        userId,
        contactId: contact.id,
        content: file.caption || `[${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}]`,
        timestamp,
        isSentByMe: true,
        isRead: true,
        messageType: mediaType,
        mediaData: JSON.stringify({
          type: mediaType,
          id: file.mediaId,
          mime_type: file.mimeType,
          filename: file.fileName,
          caption: file.caption || '',
          s3_uploaded: true,
          s3_owner_id: userId,
          upload_timestamp: timestamp.toISOString(),
        }),
      };

      try {
        await prisma.message.create({ data: messageObject });
      } catch (dbError) {
        console.error('Error storing message in database:', dbError);
      }

      results.push({ success: true, filename: file.fileName, messageId, mediaType, s3Uploaded: true });
    } catch (error: unknown) {
      console.error(`Error processing file ${file.fileName}:`, error);
      results.push({
        success: false,
        filename: file.fileName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return NextResponse.json({
    success: failureCount === 0,
    totalFiles: files.length,
    successCount,
    failureCount,
    results,
    timestamp: timestamp.toISOString(),
  });
}

/**
 * Legacy flow: Files sent as FormData in request body.
 * Limited to ~4.5MB total payload by Vercel serverless function limits.
 */
async function handleFormDataMediaSend(request: NextRequest, userId: string) {
  const formData = await request.formData();
  const to = formData.get('to') as string;
  const files = formData.getAll('files') as File[];
  const captions = formData.getAll('captions') as string[];

  if (!to || files.length === 0) {
    return NextResponse.json(
      { error: 'Missing required parameters: to, files' },
      { status: 400 }
    );
  }

  const settings = await prisma.userSettings.findUnique({
    where: { id: userId },
    select: { accessToken: true, phoneNumberId: true, apiVersion: true }
  });

  if (!settings?.accessToken || !settings?.phoneNumberId) {
    return NextResponse.json(
      { error: 'WhatsApp credentials not configured. Please complete setup.' },
      { status: 400 }
    );
  }

  const { accessToken, phoneNumberId, apiVersion: rawApiVersion } = settings;
  const apiVersion = rawApiVersion || 'v23.0';
  const cleanPhoneNumber = to.replace(/\s+/g, '').replace(/[^\d]/g, '');

  let contact = await prisma.contact.findUnique({
    where: {
      contacts_user_id_phone_number_key: { userId, phoneNumber: cleanPhoneNumber }
    }
  });

  if (!contact) {
    const contactCheck = await checkContactsLimit(userId);
    if (!contactCheck.allowed) {
      return NextResponse.json(
        { error: `Contacts limit reached (${contactCheck.current}/${contactCheck.limit}). Upgrade your plan.` },
        { status: 403 }
      );
    }

    try {
      contact = await prisma.contact.create({
        data: { userId, phoneNumber: cleanPhoneNumber, lastActive: new Date() }
      });
    } catch {
      return NextResponse.json({ error: 'Failed to create contact record' }, { status: 500 });
    }
  }

  const unsupportedFiles = files.filter(file => !isWhatsAppSupportedFileType(file.type));
  if (unsupportedFiles.length > 0) {
    return NextResponse.json(
      {
        error: 'Unsupported file types',
        message: `WhatsApp does not support: ${unsupportedFiles.map(f => f.type).join(', ')}`,
        unsupportedFiles: unsupportedFiles.map(f => ({ name: f.name, type: f.type }))
      },
      { status: 400 }
    );
  }

  const totalFileSize = files.reduce((sum, f) => sum + f.size, 0);
  const storageCheck = await checkStorageLimit(userId, totalFileSize);
  if (!storageCheck.allowed) {
    return NextResponse.json(
      { error: 'Storage limit reached. Upgrade your plan for more storage.' },
      { status: 403 }
    );
  }

  const results = [];
  const timestamp = new Date();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const caption = captions[i] || '';

    try {
      const mediaUpload = await uploadMediaToWhatsApp(file, accessToken, phoneNumberId, apiVersion);
      if (!mediaUpload) {
        throw new Error('Failed to upload media to WhatsApp');
      }

      const mediaType = getWhatsAppMediaType(file.type);

      const messageResponse = await sendMediaMessage(
        cleanPhoneNumber,
        { id: mediaUpload.id },
        mediaType,
        caption,
        accessToken,
        phoneNumberId,
        apiVersion
      );
      const messageId = messageResponse.messages?.[0]?.id;

      const mediaIdForS3 = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const s3UploadedBytes = await uploadFileToS3(file, userId, mediaIdForS3);
      const s3Uploaded = s3UploadedBytes > 0;

      if (s3Uploaded) {
        await incrementStorageUsed(userId, s3UploadedBytes);
      }

      const messageObject = {
        id: messageId || `outgoing_media_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        userId,
        contactId: contact.id,
        content: caption || `[${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}]`,
        timestamp,
        isSentByMe: true,
        isRead: true,
        messageType: mediaType,
        mediaData: JSON.stringify({
          type: mediaType,
          id: mediaIdForS3,
          mime_type: file.type,
          filename: file.name,
          caption,
          s3_uploaded: s3Uploaded,
          s3_owner_id: userId,
          upload_timestamp: timestamp.toISOString(),
          whatsapp_media_id: mediaUpload.id,
        }),
      };

      try {
        await prisma.message.create({ data: messageObject });
      } catch (dbError) {
        console.error('Error storing message in database:', dbError);
      }

      results.push({ success: true, filename: file.name, messageId, mediaType, s3Uploaded });
    } catch (error: unknown) {
      console.error(`Error processing file ${file.name}:`, error);
      results.push({
        success: false,
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return NextResponse.json({
    success: failureCount === 0,
    totalFiles: files.length,
    successCount,
    failureCount,
    results,
    timestamp: timestamp.toISOString(),
  });
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