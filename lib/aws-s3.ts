import AWS from 'aws-sdk';

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

/**
 * Get file extension from MIME type
 */
function getFileExtensionFromMimeType(mimeType: string): string {
  const mimeToExtension: { [key: string]: string } = {
    // Images
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    
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
    
    // Audio
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/aac': 'aac',
    
    // Video
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm',
    'video/3gpp': '3gp',
  };

  return mimeToExtension[mimeType.toLowerCase()] || 'bin';
}

/**
 * Download media from WhatsApp API and upload to S3
 */
export async function downloadAndUploadToS3(
  mediaUrl: string,
  senderId: string,
  mediaId: string,
  mimeType: string,
  accessToken: string
): Promise<string | null> {
  try {
    if (!BUCKET_NAME) {
      console.error('AWS_BUCKET_NAME environment variable not set');
      return null;
    }

    console.log(`Downloading media from WhatsApp API: ${mediaId}`);
    
    // Download media from WhatsApp API
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!mediaResponse.ok) {
      console.error('Failed to download media from WhatsApp:', await mediaResponse.text());
      return null;
    }

    // Get file buffer
    const mediaBuffer = await mediaResponse.arrayBuffer();
    const buffer = Buffer.from(mediaBuffer);

    // Generate S3 key (filename) with sender folder structure
    const fileExtension = getFileExtensionFromMimeType(mimeType);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    console.log(`Uploading to S3: ${s3Key} (${buffer.length} bytes, ${mimeType})`);

    // Upload to S3
    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'private', // Keep files private for security
      Metadata: {
        'whatsapp-media-id': mediaId,
        'sender-id': senderId,
        'uploaded-at': new Date().toISOString(),
      },
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    console.log(`Successfully uploaded to S3: ${uploadResult.Location}`);

    // Generate a pre-signed URL for accessing the file (valid for 24 hours)
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Expires: 24 * 60 * 60, // 24 hours
    });

    return signedUrl;

  } catch (error) {
    console.error('Error downloading and uploading media to S3:', error);
    return null;
  }
}

/**
 * Generate a new pre-signed URL for an existing S3 object
 */
export function generatePresignedUrl(senderId: string, mediaId: string, mimeType: string): string | null {
  try {
    if (!BUCKET_NAME) {
      console.error('AWS_BUCKET_NAME environment variable not set');
      return null;
    }

    const fileExtension = getFileExtensionFromMimeType(mimeType);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Expires: 24 * 60 * 60, // 24 hours
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return null;
  }
}

/**
 * Check if a file exists in S3
 */
export async function checkS3FileExists(senderId: string, mediaId: string, mimeType: string): Promise<boolean> {
  try {
    if (!BUCKET_NAME) {
      return false;
    }

    const fileExtension = getFileExtensionFromMimeType(mimeType);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    await s3.headObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    }).promise();

    return true;
  } catch {
    // File doesn't exist or error occurred
    return false;
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(senderId: string, mediaId: string, mimeType: string): Promise<boolean> {
  try {
    if (!BUCKET_NAME) {
      return false;
    }

    const fileExtension = getFileExtensionFromMimeType(mimeType);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    }).promise();

    console.log(`Successfully deleted from S3: ${s3Key}`);
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    return false;
  }
} 