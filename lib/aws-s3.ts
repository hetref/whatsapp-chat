import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configure AWS SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || '';

/**
 * Map common MIME types to file extensions
 */
export function getFileExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: { [key: string]: string } = {
    // Images
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/svg+xml': 'svg',
    // Videos
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm',
    'video/3gpp': '3gp',
    'video/x-flv': 'flv',
    // Audio
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/amr': 'amr',
    'audio/opus': 'opus',
    // Documents
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z',
    'application/json': 'json',
    'application/xml': 'xml',
    'text/html': 'html',
    'text/css': 'css',
    'text/javascript': 'js',
    'application/javascript': 'js',
    'application/rtf': 'rtf',
    'application/vnd.oasis.opendocument.text': 'odt',
    'application/vnd.oasis.opendocument.spreadsheet': 'ods',
    'application/vnd.oasis.opendocument.presentation': 'odp',
  };
  return mimeToExt[mimeType.toLowerCase()] || 'bin';
}

/**
 * Check if file type is supported by WhatsApp Cloud API
 */
export function isWhatsAppSupportedFileType(mimeType: string): boolean {
  const supportedTypes = [
    // Audio
    'audio/aac',
    'audio/mp4',
    'audio/mpeg',
    'audio/amr',
    'audio/ogg',
    'audio/opus',
    // Documents
    'application/vnd.ms-powerpoint',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'text/plain',
    'application/vnd.ms-excel',
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    // Videos
    'video/mp4',
    'video/3gpp',
  ];

  return supportedTypes.includes(mimeType.toLowerCase());
}

/**
 * Download file from WhatsApp and upload to S3
 * Handles authentication for WhatsApp media URLs
 * Returns the number of bytes uploaded, or -1 on failure
 */
export async function downloadAndUploadToS3(
  fileUrl: string,
  senderId: string,
  mediaId: string,
  mimeType: string,
  whatsappAccessToken?: string
): Promise<number> {
  try {
    console.log(`Downloading file from URL: ${fileUrl}`);

    // Security validation
    if (!fileUrl || !senderId || !mediaId || !mimeType) {
      throw new Error('Missing required parameters for S3 upload');
    }

    // Validate sender ID format (should be a phone number)
    if (!/^\d{10,15}$/.test(senderId)) {
      throw new Error(`Invalid sender ID format: ${senderId}`);
    }

    // Validate media ID format (should be numeric)
    if (!/^\d+$/.test(mediaId)) {
      throw new Error(`Invalid media ID format: ${mediaId}`);
    }

    // Check if file type is supported by WhatsApp
    if (!isWhatsAppSupportedFileType(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Prepare headers for WhatsApp authentication
    const headers: Record<string, string> = {};

    // Check if this is a WhatsApp media URL and add authentication
    if (fileUrl.includes('lookaside.fbsbx.com') || fileUrl.includes('graph.facebook.com')) {
      if (whatsappAccessToken) {
        headers['Authorization'] = `Bearer ${whatsappAccessToken}`;
        console.log('Added WhatsApp authentication header for media download');
      } else {
        throw new Error('WhatsApp media URL detected but no access token provided');
      }
    }

    // Download the file with proper authentication and timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    // Validate content type
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.startsWith(mimeType.split('/')[0])) {
      console.warn(`Content type mismatch: expected ${mimeType}, got ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file size (25MB limit for WhatsApp)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (buffer.length > maxSize) {
      throw new Error(`File too large: ${buffer.length} bytes (max: ${maxSize})`);
    }

    if (buffer.length === 0) {
      throw new Error('Downloaded file is empty');
    }

    console.log(`Downloaded file: ${buffer.length} bytes`);

    // Generate S3 key with sanitized sender ID
    const fileExtension = getFileExtensionFromMimeType(mimeType);
    const sanitizedSenderId = senderId.replace(/[^0-9]/g, ''); // Remove non-numeric chars
    const s3Key = `${sanitizedSenderId}/${mediaId}.${fileExtension}`;

    console.log(`Uploading to S3: ${s3Key} (${buffer.length} bytes)`);

    // Upload to S3 with enhanced metadata
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'private',
      Metadata: {
        'sender-id': sanitizedSenderId,
        'media-id': mediaId,
        'upload-timestamp': new Date().toISOString(),
        'original-url': fileUrl,
        'file-size': buffer.length.toString(),
        'content-type': mimeType,
      },
    });

    await s3Client.send(uploadCommand);
    console.log('S3 upload successful');

    // Return the number of bytes uploaded
    return buffer.length;

  } catch (error) {
    console.error('Error in downloadAndUploadToS3:', error);
    return -1;
  }
}

/**
 * Upload a File object directly to S3
 * Returns the number of bytes uploaded, or -1 on failure
 */
export async function uploadFileToS3(
  file: File,
  senderId: string,
  mediaId: string
): Promise<number> {
  try {
    const fileExtension = getFileExtensionFromMimeType(file.type);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    console.log(`Uploading file to S3: ${s3Key} (${file.size} bytes)`);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'private',
      Metadata: {
        'original-filename': file.name,
        'upload-timestamp': new Date().toISOString(),
      },
    });

    await s3Client.send(uploadCommand);
    console.log('S3 file upload successful');

    return buffer.length;

  } catch (error) {
    console.error('Error in uploadFileToS3:', error);
    return -1;
  }
}

/**
 * Generate a presigned URL for accessing S3 object
 */
export async function generatePresignedUrl(
  senderId: string,
  mediaId: string,
  mimeType: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const fileExtension = getFileExtensionFromMimeType(mimeType);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    console.log(`Generated presigned URL for ${s3Key} (expires in ${expiresIn}s)`);

    return presignedUrl;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return null;
  }
}

/**
 * Check if file exists in S3
 */
export async function checkS3FileExists(
  senderId: string,
  mediaId: string,
  mimeType: string
): Promise<boolean> {
  try {
    const fileExtension = getFileExtensionFromMimeType(mimeType);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(
  senderId: string,
  mediaId: string,
  mimeType: string
): Promise<boolean> {
  try {
    const fileExtension = getFileExtensionFromMimeType(mimeType);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    await s3Client.send(command);
    console.log(`Deleted S3 object: ${s3Key}`);
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    return false;
  }
} 