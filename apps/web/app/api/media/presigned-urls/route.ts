import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { generatePresignedUrlByKey } from '@/lib/aws-s3';

/**
 * POST /api/media/presigned-urls
 * Body: { ids: string[] }
 * Returns a map of mediaFile id -> presigned GET URL for displaying media.
 * Generates URLs in batch for efficient loading.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!ids || ids.length === 0) {
    return NextResponse.json({ urls: {} });
  }

  // Cap batch size
  const batchIds = ids.slice(0, 50);

  // Fetch media files owned by this user
  const mediaFiles = await prisma.mediaFile.findMany({
    where: { id: { in: batchIds }, userId },
    select: { id: true, s3Key: true },
  });

  // Generate presigned URLs in parallel
  const urlEntries = await Promise.all(
    mediaFiles.map(async (mf) => {
      const url = await generatePresignedUrlByKey(mf.s3Key, 3600);
      return [mf.id, url] as const;
    })
  );

  const urls: Record<string, string | null> = {};
  for (const [id, url] of urlEntries) {
    urls[id] = url;
  }

  return NextResponse.json({ urls });
}
