import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { generatePresignedUploadUrl, isWhatsAppSupportedFileType } from '@/lib/aws-s3';
import { checkStorageLimit, checkSubscriptionActive } from '@/lib/plan-limits';

/**
 * GET /api/media - List user's media files (metadata only, no presigned URLs)
 * Query params: ?type=image|video|audio|document &search=<query> &page=1 &limit=20 &cursor=<uuid>
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const search = searchParams.get('search')?.trim();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20', 10)), 100);
  const cursor = searchParams.get('cursor');

  const where: any = { userId };
  if (type && ['image', 'video', 'audio', 'document'].includes(type)) {
    where.mediaType = type;
  }
  if (search) {
    where.fileName = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // Count total matching items across the entire collection
  const totalCount = await prisma.mediaFile.count({ where });
  const totalPages = Math.ceil(totalCount / limit);

  // If cursor is provided, preserve cursor-based pagination
  if (cursor) {
    const mediaFiles = await prisma.mediaFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      cursor: { id: cursor },
      skip: 1,
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

    return NextResponse.json({
      items,
      nextCursor,
      pagination: {
        page: 1,
        limit,
        totalCount,
        totalPages,
        hasNextPage: hasMore,
        hasPrevPage: false,
      },
    });
  }

  // Standard Page-Based Pagination
  const validPage = Math.max(1, isNaN(page) ? 1 : page);
  const skip = (validPage - 1) * limit;

  const items = await prisma.mediaFile.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
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

  return NextResponse.json({
    items,
    pagination: {
      page: validPage,
      limit,
      totalCount,
      totalPages,
      hasNextPage: validPage < totalPages,
      hasPrevPage: validPage > 1,
    },
  });
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
