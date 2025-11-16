import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { generatePresignedUrl } from '@/lib/aws-s3';

export const runtime = 'nodejs';

/**
 * POST handler for refreshing S3 pre-signed URLs
 * This is useful when URLs expire and need to be regenerated
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
    if (message.senderId !== userId && message.receiverId !== userId) {
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
        { error: 'Media data incomplete' },
        { status: 400 }
      );
    }

    // Determine which identifier was used as the S3 owner when the media was stored
    const ownerIdForS3 = message.isSentByMe ? message.receiverId : message.senderId;

    // Generate new pre-signed URL
    const newUrl = await generatePresignedUrl(
      ownerIdForS3,
      mediaData.id,
      mediaData.mime_type
    );

    if (!newUrl) {
      console.error('Failed to generate new pre-signed URL');
      return NextResponse.json(
        { error: 'Failed to generate media URL' },
        { status: 500 }
      );
    }

    // Update the media_data with new URL
    const updatedMediaData = {
      ...mediaData,
      media_url: newUrl,
      s3_uploaded: true,
      url_refreshed_at: new Date().toISOString()
    };

    // Update the message in database
    try {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          mediaData: JSON.stringify(updatedMediaData)
        }
      });
    } catch (updateError) {
      console.error('Error updating message with new URL:', updateError);
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      );
    }

    console.log(`Successfully refreshed media URL for message: ${messageId}`);

    // Return the new URL
    return NextResponse.json({
      success: true,
      messageId: messageId,
      mediaUrl: newUrl, // Changed from newUrl to mediaUrl for consistency
      refreshedAt: updatedMediaData.url_refreshed_at
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
    status: 'Media URL Refresh API',
    timestamp: new Date().toISOString()
  });
} 