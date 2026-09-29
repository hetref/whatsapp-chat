import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import {
  uploadUserAvatar,
  deleteUserAvatar,
  getUserAvatarStream,
} from '@/lib/aws-s3';

export const runtime = 'nodejs';

/**
 * GET /api/users/avatar
 * Serves the user avatar directly from S3 with HTTP caching headers.
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

    const avatarStream = await getUserAvatarStream(targetUserId);
    if (!avatarStream) {
      return new NextResponse('Avatar not found', { status: 404 });
    }

    return new NextResponse(avatarStream.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': avatarStream.contentType,
        'Content-Length': avatarStream.buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('[API /users/avatar GET] Error serving avatar:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * POST /api/users/avatar
 * Uploads a new user avatar to S3, automatically cleans up any previous avatar files,
 * and updates user.image in the database.
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

    // Upload to S3 & delete any previous avatar files for this user
    await uploadUserAvatar(userId, buffer, file.type);

    // Reference URL with cache-busting timestamp
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
      message: 'Avatar uploaded and updated successfully.',
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

    // Delete all avatar files in S3 for this user
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
