import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { incrementStorageUsed } from '@/lib/plan-limits';

/**
 * POST /api/media/confirm-upload
 * Body: { ids: string[] }
 * Called after client finishes uploading files to S3 via presigned URLs.
 * Increments storage usage tracking.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: 'No ids provided' }, { status: 400 });
  }

  const mediaFiles = await prisma.mediaFile.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true, fileSize: true },
  });

  const totalBytes = mediaFiles.reduce((sum, mf) => sum + mf.fileSize, 0);
  if (totalBytes > 0) {
    await incrementStorageUsed(userId, totalBytes);
  }

  return NextResponse.json({ confirmed: mediaFiles.length });
}
