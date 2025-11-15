import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/**
 * GET - Get all broadcast messages for a group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: groupId } = await params;

    // Verify group ownership
    const group = await prisma.chatGroup.findFirst({
      where: {
        id: groupId,
        ownerId: userId
      }
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get all messages that are broadcast messages for this group
    // These are messages where media_data contains broadcast_group_id = groupId
    const messages = await prisma.message.findMany({
      where: {
        receiverId: userId
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Filter messages that belong to this broadcast group
    // Check if media_data contains broadcast_group_id matching our groupId
    const broadcastMessages = messages.filter(msg => {
      if (!msg.mediaData) return false;
      try {
        const mediaData = typeof msg.mediaData === 'string' 
          ? JSON.parse(msg.mediaData) 
          : msg.mediaData;
        return (mediaData as any).broadcast_group_id === groupId;
      } catch {
        return false;
      }
    });

    // Group messages by their timestamp to identify unique broadcasts
    // (same broadcast sent to multiple people will have same timestamp)
    const uniqueBroadcasts = new Map();
    broadcastMessages.forEach(msg => {
      const key = msg.timestamp.toISOString(); // Use timestamp as key to group same broadcast
      if (!uniqueBroadcasts.has(key) || msg.id < uniqueBroadcasts.get(key).id) {
        // Keep the first message (or the one with smallest ID) for each timestamp
        uniqueBroadcasts.set(key, msg);
      }
    });

    // Convert map to array and format for display
    const formattedMessages = Array.from(uniqueBroadcasts.values()).map(msg => ({
      id: msg.id,
      sender_id: msg.senderId,
      receiver_id: msg.receiverId,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      is_sent_by_me: true, // All broadcast messages are sent by the user
      message_type: msg.messageType,
      media_data: msg.mediaData,
      is_read: true
    }));

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      count: formattedMessages.length
    });

  } catch (error) {
    console.error('Error in get broadcast messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

