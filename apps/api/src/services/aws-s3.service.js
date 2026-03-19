import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const AWS_REGION = process.env.AWS_REGION;
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
        }
        : undefined,
});

const MIME_TO_EXT = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/amr': 'amr',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
};

const WHATSAPP_SUPPORTED_TYPES = new Set([
    'audio/aac',
    'audio/mp4',
    'audio/mpeg',
    'audio/amr',
    'audio/ogg',
    'audio/opus',
    'application/vnd.ms-powerpoint',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'text/plain',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/3gpp',
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

function assertS3Configured() {
    if (!AWS_REGION || !AWS_BUCKET_NAME) {
        throw new Error('AWS S3 is not configured. Set AWS_REGION and AWS_BUCKET_NAME.');
    }
}

export function getUserMediaPrefix(userId) {
    const safeUserId = String(userId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    return `user_${safeUserId}`;
}

export function getFileExtensionFromMimeType(mimeType) {
    return MIME_TO_EXT[String(mimeType || '').toLowerCase()] || 'bin';
}

export function isWhatsAppSupportedFileType(mimeType) {
    return WHATSAPP_SUPPORTED_TYPES.has(String(mimeType || '').toLowerCase());
}

export function getMediaTypeFromMimeType(mimeType) {
    const type = String(mimeType || '').toLowerCase();
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    return 'document';
}

export function buildS3KeyForMedia({ userId, mediaId, mimeType }) {
    const ext = getFileExtensionFromMimeType(mimeType);
    return `${getUserMediaPrefix(userId)}/${mediaId}.${ext}`;
}

export function extractMediaIdFromS3Key(s3Key) {
    const fileName = String(s3Key || '').split('/').pop() || '';
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

export async function generatePresignedUploadUrl({ userId, mediaId, mimeType, fileSize, expiresIn = 600 }) {
    assertS3Configured();

    if (!isWhatsAppSupportedFileType(mimeType)) {
        throw new Error(`Unsupported mime type: ${mimeType}`);
    }

    const size = Number(fileSize);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE_BYTES) {
        throw new Error('Invalid file size. Max allowed size is 25MB.');
    }

    const s3Key = buildS3KeyForMedia({ userId, mediaId, mimeType });
    const command = new PutObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: s3Key,
        ContentType: mimeType,
        ContentLength: size,
        Metadata: {
            'upload-timestamp': new Date().toISOString(),
            'file-size': String(size),
            'content-type': mimeType,
            'owner-id': String(userId),
        },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: Math.min(Math.max(expiresIn, 60), 900) });
    return { uploadUrl, s3Key };
}

export async function generatePresignedGetUrlByKey(s3Key, expiresIn = 1800) {
    assertS3Configured();
    const command = new GetObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: s3Key,
    });

    return getSignedUrl(s3Client, command, { expiresIn: Math.min(Math.max(expiresIn, 60), 3600) });
}

export async function checkS3ObjectExists(s3Key) {
    assertS3Configured();

    try {
        const command = new HeadObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: s3Key,
        });

        await s3Client.send(command);
        return true;
    } catch {
        return false;
    }
}

export const MAX_MEDIA_BATCH = 10;
export const MAX_MEDIA_FILE_SIZE_BYTES = MAX_FILE_SIZE_BYTES;
