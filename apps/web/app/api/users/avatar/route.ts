import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import {
  uploadUserAvatar,
  deleteUserAvatar,
  getUserAvatarPresignedUrl,
  getUserAvatarStream,
} from '@/lib/aws-s3';

export const runtime = 'nodejs';

/**
 * GET /api/users/avatar
 * Redirects to a fresh, secure S3 presigned URL for the user's avatar.
 * Query params: ?userId=<userId>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      const { userId } = await auth();
      targetUserId = userId;
    }

    if (!targetUserId) {
      return new NextResponse('User ID required', { status: 400 });
    }

    // 1. Try generating a 7-day presigned URL for the user's avatar
    const presignedUrl = await getUserAvatarPresignedUrl(targetUserId, 604800);
    if (presignedUrl) {
      // Fast redirect to the secure S3 presigned URL
      return NextResponse.redirect(presignedUrl, {
        status: 307,
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      });
    }

    // 2. Fallback: stream bytes directly if redirect is unavailable
    const avatarStream = await getUserAvatarStream(targetUserId);
    if (avatarStream) {
      return new NextResponse(avatarStream.buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': avatarStream.contentType,
          'Content-Length': avatarStream.buffer.length.toString(),
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    }

    return new NextResponse('Avatar not found', { status: 404 });
  } catch (error) {
    console.error('[API /users/avatar GET] Error serving avatar:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * POST /api/users/avatar
 * Uploads a new user avatar to S3 using a single deterministic key `avatars/${userId}/avatar`.
 * Atomically replaces previous avatars (no duplicate files) and returns the secure image URL.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Validate MIME type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image (PNG, JPG, WEBP, GIF)' }, { status: 400 });
    }

    // Validate size (max 5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: 'Avatar image cannot exceed 5MB' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3 & generate presigned URL
    const { presignedUrl } = await uploadUserAvatar(userId, buffer, file.type);

    // Stable endpoint with cache-busting timestamp
    const avatarUrl = `/api/users/avatar?userId=${encodeURIComponent(userId)}&v=${Date.now()}`;

    // Update database user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        image: avatarUrl,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl: avatarUrl,
      presignedUrl,
      message: 'Avatar uploaded to S3 successfully.',
    });
  } catch (error: any) {
    console.error('[API /users/avatar POST] Error uploading avatar:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload avatar to S3' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/avatar
 * Removes user avatar from S3 and clears user.image in the database.
 */
export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete avatar in S3
    await deleteUserAvatar(userId);

    // Clear user image in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        image: null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Avatar removed successfully.',
    });
  } catch (error: any) {
    console.error('[API /users/avatar DELETE] Error removing avatar:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to remove avatar' },
      { status: 500 }
    );
  }
}
