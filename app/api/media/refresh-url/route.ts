import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { generatePresignedUrl } from '@/lib/aws-s3';

export const runtime = 'nodejs';

const PRESIGNED_URL_EXPIRY = 1800; // 30 minutes in seconds

/**
 * POST handler for generating S3 pre-signed URLs on demand
 * Returns a presigned URL valid for 30 minutes without storing it in the database
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { messageId } = await request.json();

    // Validate required parameters
    if (!messageId) {
      return NextResponse.json(
        { error: 'Missing required parameter: messageId' },
        { status: 400 }
      );
    }

    // Get the message from database
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      console.error('Message not found:', messageId);
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this message
    if (message.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if message has media data
    if (!message.mediaData) {
      return NextResponse.json(
        { error: 'Message has no media data' },
        { status: 400 }
      );
    }

    let mediaData;
    try {
      // Handle both string and object mediaData
      if (typeof message.mediaData === 'string') {
        mediaData = JSON.parse(message.mediaData);
      } else {
        mediaData = message.mediaData;
      }
    } catch (error) {
      console.error('Error parsing media data:', error);
      return NextResponse.json(
        { error: 'Invalid media data' },
        { status: 400 }
      );
    }

    // Check that media has the required identifiers
    if (!mediaData.id || !mediaData.mime_type) {
      return NextResponse.json(
        { error: 'Media data incomplete - missing id or mime_type' },
        { status: 400 }
      );
    }

    // Determine the S3 owner ID based on how the media was stored
    // For outgoing messages (sent by user), the owner is the userId
    // For incoming messages (received from contacts), the owner is the sender's phone number
    const ownerIdForS3 = mediaData.s3_owner_id || message.userId;

    // Generate new pre-signed URL (30 minutes expiry)
    const presignedUrl = await generatePresignedUrl(
      ownerIdForS3,
      mediaData.id,
      mediaData.mime_type,
      PRESIGNED_URL_EXPIRY
    );

    if (!presignedUrl) {
      console.error('Failed to generate pre-signed URL');
      return NextResponse.json(
        { error: 'Failed to generate media URL' },
        { status: 500 }
      );
    }

    console.log(`Generated presigned URL for message: ${messageId} (expires in ${PRESIGNED_URL_EXPIRY}s)`);

    // Return the URL and expiry info - NOT stored in DB
    return NextResponse.json({
      success: true,
      messageId: messageId,
      mediaUrl: presignedUrl,
      expiresIn: PRESIGNED_URL_EXPIRY,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in refresh-url API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for checking API status
 */
export async function GET() {
  return NextResponse.json({
    status: 'Media URL Generation API',
    timestamp: new Date().toISOString()
  });
} 