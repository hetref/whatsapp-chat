import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { generatePresignedUploadUrl, isWhatsAppSupportedFileType } from '@/lib/aws-s3';
import { checkStorageLimit, checkSubscriptionActive } from '@/lib/plan-limits';

/**
 * GET /api/media - List user's media files (metadata only, no presigned URLs)
 * Query params: ?type=image|video|audio|document &cursor=<uuid> &limit=50
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  const where: Record<string, unknown> = { userId };
  if (type && ['image', 'video', 'audio', 'document'].includes(type)) {
    where.mediaType = type;
  }

  const mediaFiles = await prisma.mediaFile.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      s3Key: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      mediaType: true,
      createdAt: true,
    },
  });

  const hasMore = mediaFiles.length > limit;
  const items = hasMore ? mediaFiles.slice(0, limit) : mediaFiles;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ items, nextCursor });
}

/**
 * POST /api/media - Get presigned upload URLs for new media files.
 * Body: { files: [{ fileName, fileSize, mimeType }] }
 * Returns presigned PUT URLs + mediaFile IDs (DB records created immediately).
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subCheck = await checkSubscriptionActive(userId);
  if (!subCheck.active) {
    return NextResponse.json(
      { error: 'Subscription inactive', message: subCheck.message },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { files } = body as { files: { fileName: string; fileSize: number; mimeType: string }[] };

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  if (files.length > 10) {
    return NextResponse.json({ error: 'Max 10 files per upload' }, { status: 400 });
  }

  // Validate each file
  for (const f of files) {
    if (f.fileSize > 25 * 1024 * 1024) {
      return NextResponse.json({ error: `${f.fileName} exceeds 25MB limit` }, { status: 400 });
    }
    if (!isWhatsAppSupportedFileType(f.mimeType)) {
      return NextResponse.json({ error: `${f.fileName}: unsupported file type` }, { status: 400 });
    }
  }

  const totalSize = files.reduce((s, f) => s + f.fileSize, 0);
  const storageCheck = await checkStorageLimit(userId, totalSize);
  if (!storageCheck.allowed) {
    return NextResponse.json({ error: 'Storage limit reached. Upgrade your plan.' }, { status: 403 });
  }

  // Use a prefix specific to the media library
  const senderPrefix = `user_${userId}`;
  const results = [];

  for (const f of files) {
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const presigned = await generatePresignedUploadUrl(senderPrefix, mediaId, f.mimeType, f.fileSize, 600);

    if (!presigned) {
      return NextResponse.json({ error: `Failed to generate upload URL for ${f.fileName}` }, { status: 500 });
    }

    // Determine media type
    let mediaType = 'document';
    if (f.mimeType.startsWith('image/')) mediaType = 'image';
    else if (f.mimeType.startsWith('video/')) mediaType = 'video';
    else if (f.mimeType.startsWith('audio/')) mediaType = 'audio';

    // Create DB record immediately so it appears in Media page
    const record = await prisma.mediaFile.create({
      data: {
        userId,
        s3Key: presigned.s3Key,
        fileName: f.fileName,
        mimeType: f.mimeType,
        fileSize: f.fileSize,
        mediaType,
      },
    });

    results.push({
      id: record.id,
      uploadUrl: presigned.uploadUrl,
      s3Key: presigned.s3Key,
      mediaId,
      fileName: f.fileName,
      mimeType: f.mimeType,
    });
  }

  return NextResponse.json({ uploads: results });
}

/**
 * DELETE /api/media - Delete a media library file by ID.
 * Query params: ?id=<uuid>
 */
export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get('id');

  if (!mediaId) {
    return NextResponse.json({ error: 'Missing media ID' }, { status: 400 });
  }

  try {
    // Check if the media file belongs to the user
    const mediaFile = await prisma.mediaFile.findFirst({
      where: {
        id: mediaId,
        userId,
      },
    });

    if (!mediaFile) {
      return NextResponse.json({ error: 'Media file not found' }, { status: 404 });
    }

    // Delete the database record
    await prisma.mediaFile.delete({
      where: {
        id: mediaId,
      },
    });

    // Decrement the user's storage used bytes counter
    // This frees up their active Media Library quota
    const { decrementStorageUsed } = await import('@/lib/plan-limits');
    await decrementStorageUsed(userId, mediaFile.fileSize);

    // Note: We do NOT delete the physical file from S3 using deleteFromS3 here.
    // This allows existing chat messages referencing this media's S3 key to still load and display the media correctly.
    // The media is successfully removed from the Media Library list, which meets the user's requirement.

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[MediaDelete] Error:', err);
    return NextResponse.json({ error: 'Failed to delete media file' }, { status: 500 });
  }
}
