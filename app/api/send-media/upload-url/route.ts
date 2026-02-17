/**
 * POST /api/send-media/upload-url
 * Generate presigned S3 upload URLs for direct client-side upload.
 * This bypasses the Vercel serverless function body size limit (4.5MB)
 * so users can upload files up to 25MB (WhatsApp's limit).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generatePresignedUploadUrl, isWhatsAppSupportedFileType } from '@/lib/aws-s3';
import { checkStorageLimit, checkSubscriptionActive } from '@/lib/plan-limits';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB - WhatsApp limit

interface FileInfo {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subCheck = await checkSubscriptionActive(userId);
    if (!subCheck.active) {
      return NextResponse.json(
        { error: 'Messaging blocked', message: subCheck.message },
        { status: 403 }
      );
    }

    const body = await request.json();
    const files: FileInfo[] = body.files;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'No files specified' },
        { status: 400 }
      );
    }

    // Validate all files before generating URLs
    for (const file of files) {
      if (!file.fileName || !file.fileSize || !file.mimeType) {
        return NextResponse.json(
          { error: 'Each file must have fileName, fileSize, and mimeType' },
          { status: 400 }
        );
      }

      if (file.fileSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `${file.fileName}: File size exceeds 25MB limit` },
          { status: 400 }
        );
      }

      if (!isWhatsAppSupportedFileType(file.mimeType)) {
        return NextResponse.json(
          { error: `${file.fileName}: File type '${file.mimeType}' is not supported by WhatsApp` },
          { status: 400 }
        );
      }
    }

    // Check total storage limit
    const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
    const storageCheck = await checkStorageLimit(userId, totalSize);
    if (!storageCheck.allowed) {
      return NextResponse.json(
        { error: 'Storage limit reached. Upgrade your plan for more storage.' },
        { status: 403 }
      );
    }

    // Generate presigned upload URLs for each file
    const uploadUrls = [];
    for (const file of files) {
      const mediaId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const result = await generatePresignedUploadUrl(
        userId,
        mediaId,
        file.mimeType,
        file.fileSize
      );

      if (!result) {
        return NextResponse.json(
          { error: `Failed to generate upload URL for ${file.fileName}` },
          { status: 500 }
        );
      }

      uploadUrls.push({
        fileName: file.fileName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        uploadUrl: result.uploadUrl,
        s3Key: result.s3Key,
        mediaId,
      });
    }

    return NextResponse.json({ uploadUrls });
  } catch (error) {
    console.error('Error generating upload URLs:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URLs' },
      { status: 500 }
    );
  }
}
