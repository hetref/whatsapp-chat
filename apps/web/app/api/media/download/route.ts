import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || '';

export async function GET(request: NextRequest) {
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
    // Retrieve media item from database to verify ownership and get S3 key
    const mediaItem = await prisma.mediaFile.findFirst({
      where: {
        id: mediaId,
        userId,
      },
    });

    if (!mediaItem) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: mediaItem.s3Key,
    });

    const s3Response = await s3Client.send(command);
    const body = s3Response.Body;

    if (!body) {
      return NextResponse.json({ error: 'Empty file body' }, { status: 500 });
    }

    // Convert readable stream to response
    const bytes = await body.transformToByteArray();

    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        'Content-Type': mediaItem.mimeType,
        'Content-Length': bytes.length.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(mediaItem.fileName)}"`,
      },
    });
  } catch (err) {
    console.error('[MediaDownloadProxy] Error:', err);
    return NextResponse.json({ error: 'Failed to download media' }, { status: 500 });
  }
}
