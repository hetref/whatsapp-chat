import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('conversationId'); // Still called conversationId for backwards compat
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!contactId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Verify the contact belongs to this user
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId: userId
      }
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found or access denied' },
        { status: 404 }
      );
    }

    // Get messages for the conversation
    // We'll get them in DESC order (newest first) to ensure we get recent messages
    // but we'll reverse them in the response to display chronologically
    const messages = await prisma.message.findMany({
      where: {
        userId: userId,
        contactId: contactId
      },
      orderBy: { timestamp: 'desc' }, // Get newest first to ensure recent messages
      take: limit,
      skip: offset,
      select: {
        id: true,
        userId: true,
        contactId: true,
        content: true,
        timestamp: true,
        isSentByMe: true,
        isRead: true,
        messageType: true,
        mediaData: true,
        readAt: true
      }
    });

    // Convert to the format expected by the frontend and reverse to show chronologically
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      sender_id: msg.isSentByMe ? userId : contact.phoneNumber,
      receiver_id: msg.isSentByMe ? contact.phoneNumber : userId,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      is_sent_by_me: msg.isSentByMe,
      is_read: msg.isRead,
      message_type: msg.messageType,
      media_data: msg.mediaData,
      read_at: msg.readAt?.toISOString() || null
    })).reverse(); // Reverse to display chronologically (oldest first)

    return NextResponse.json({ messages: formattedMessages });
  } catch (error: unknown) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
