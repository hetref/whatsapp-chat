import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/**
 * POST handler to mark messages as read
 * Marks all unread messages from a specific contact as read
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

    // Parse request body - otherUserId is the contact ID (UUID)
    const { otherUserId } = await request.json();

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'Missing otherUserId parameter' },
        { status: 400 }
      );
    }

    console.log(`Marking messages as read for conversation with contact ${otherUserId}`);

    // Mark messages as read where:
    // - userId is the current user (business owner)
    // - contactId is the other user (contact)
    // - isSentByMe is false (messages received from contact)
    // - isRead is false (not already read)
    const updateResult = await prisma.message.updateMany({
      where: {
        userId: userId,
        contactId: otherUserId,
        isSentByMe: false,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    const markedCount = updateResult.count;
    console.log(`Marked ${markedCount} messages as read`);

    return NextResponse.json({
      success: true,
      markedCount: markedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Error in mark-read API:', error);
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
    status: 'Mark Messages as Read API',
    timestamp: new Date().toISOString()
  });
}