import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get conversations for the authenticated user
    // This replaces the Supabase user_conversations view
    const conversationsRaw = await prisma.$queryRaw`
      WITH user_messages AS (
        SELECT
          m.*,
          CASE
            WHEN m.sender_id = ${userId} THEN m.receiver_id
            ELSE m.sender_id
          END AS other_user_id
        FROM messages m
        WHERE m.sender_id = ${userId} OR m.receiver_id = ${userId}
      ),
      latest_messages AS (
        SELECT DISTINCT ON (other_user_id)
          other_user_id,
          content,
          message_type,
          timestamp AS last_message_time,
          sender_id AS last_message_sender
        FROM user_messages
        ORDER BY other_user_id, timestamp DESC
      ),
      unread_counts AS (
        SELECT
          other_user_id,
          COUNT(*) AS unread_count
        FROM user_messages
        WHERE receiver_id = ${userId} AND is_read = false
        GROUP BY other_user_id
      )
      SELECT
        u.id,
        u.name,
        u.custom_name,
        u.whatsapp_name,
        u.last_active,
        COALESCE(uc.unread_count, 0) AS unread_count,
        lm.last_message_time,
        lm.content AS last_message,
        lm.message_type AS last_message_type,
        lm.last_message_sender
      FROM users u
      JOIN (SELECT DISTINCT other_user_id FROM user_messages) conv
        ON conv.other_user_id = u.id
      LEFT JOIN unread_counts uc ON uc.other_user_id = u.id
      LEFT JOIN latest_messages lm ON lm.other_user_id = u.id
      ORDER BY lm.last_message_time DESC NULLS LAST
    `;

    // Convert BigInt values to numbers for JSON serialization
    const conversations = (conversationsRaw as any[]).map(conversation => ({
      ...conversation,
      unread_count: Number(conversation.unread_count),
    }));

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
