import AWS from 'aws-sdk';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_BUCKET_NAME || '';

/**
 * Map common MIME types to file extensions
 */
export function getFileExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
  };

  return mimeToExt[mimeType] || 'bin';
}

/**
 * Download media from URL and upload to S3
 */
export async function downloadAndUploadToS3(
  mediaUrl: string,
  senderId: string,
  mediaId: string,
  mimeType: string,
  accessToken: string
): Promise<string | null> {
  try {
    console.log(`Downloading media from: ${mediaUrl}`);
    
    // Download the media file
    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to download media: ${response.status} ${response.statusText}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const fileExtension = getFileExtensionFromMimeType(mimeType);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    console.log(`Uploading to S3: ${s3Key} (${buffer.byteLength} bytes)`);

    // Upload to S3
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: Buffer.from(buffer),
      ContentType: mimeType,
      ACL: 'private' as const,
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    console.log('S3 upload successful:', uploadResult.Location);

    // Generate pre-signed URL (valid for 24 hours)
    const presignedUrl = await generatePresignedUrl(senderId, mediaId, mimeType);
    return presignedUrl;

  } catch (error) {
    console.error('Error in downloadAndUploadToS3:', error);
    return null;
  }
}

/**
 * Upload File object directly to S3
 */
export async function uploadFileToS3(
  file: File,
  senderId: string,
  mediaId: string
): Promise<string | null> {
  try {
    const fileExtension = getFileExtensionFromMimeType(file.type);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    console.log(`Uploading file to S3: ${s3Key} (${file.size} bytes)`);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'private' as const,
      Metadata: {
        'original-filename': file.name,
        'upload-timestamp': new Date().toISOString(),
      },
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    console.log('S3 file upload successful:', uploadResult.Location);

    // Generate pre-signed URL (valid for 24 hours)
    const presignedUrl = await generatePresignedUrl(senderId, mediaId, file.type);
    return presignedUrl;

  } catch (error) {
    console.error('Error in uploadFileToS3:', error);
    return null;
  }
}

/**
 * Generate a pre-signed URL for an existing S3 object
 */
export async function generatePresignedUrl(
  senderId: string,
  mediaId: string,
  mimeType: string
): Promise<string | null> {
  try {
    const fileExtension = getFileExtensionFromMimeType(mimeType);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Expires: 86400, // 24 hours
    };

    const presignedUrl = await s3.getSignedUrlPromise('getObject', params);
    console.log(`Generated pre-signed URL for: ${s3Key}`);
    return presignedUrl;

  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return null;
  }
}

/**
 * Check if a file exists in S3
 */
export async function checkS3FileExists(
  senderId: string,
  mediaId: string,
  mimeType: string
): Promise<boolean> {
  try {
    const fileExtension = getFileExtensionFromMimeType(mimeType);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    await s3.headObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    }).promise();

    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(
  senderId: string,
  mediaId: string,
  mimeType: string
): Promise<boolean> {
  try {
    const fileExtension = getFileExtensionFromMimeType(mimeType);
    const s3Key = `${senderId}/${mediaId}.${fileExtension}`;

    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    }).promise();

    console.log(`Deleted from S3: ${s3Key}`);
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    return false;
  }
} 