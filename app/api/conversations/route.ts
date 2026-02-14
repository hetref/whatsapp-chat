import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

interface ConversationRow {
  id: string;
  phone_number: string;
  custom_name?: string;
  whatsapp_name?: string;
  last_active: Date;
  unread_count: bigint;
  last_message_time?: Date;
  last_message?: string;
  last_message_type?: string;
  is_last_message_from_me?: boolean;
}

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

    // Get conversations for the authenticated user from their contacts
    const conversationsRaw = await prisma.$queryRaw<ConversationRow[]>`
      WITH latest_messages AS (
        SELECT DISTINCT ON (m.contact_id)
          m.contact_id,
          m.content,
          m.message_type,
          m.timestamp AS last_message_time,
          m.is_sent_by_me
        FROM messages m
        WHERE m.user_id = ${userId}
        ORDER BY m.contact_id, m.timestamp DESC
      ),
      unread_counts AS (
        SELECT
          m.contact_id,
          COUNT(*) AS unread_count
        FROM messages m
        WHERE m.user_id = ${userId} 
          AND m.is_read = false 
          AND m.is_sent_by_me = false
        GROUP BY m.contact_id
      )
      SELECT
        c.id,
        c.phone_number,
        c.custom_name,
        c.whatsapp_name,
        c.last_active,
        COALESCE(uc.unread_count, 0) AS unread_count,
        lm.last_message_time,
        lm.content AS last_message,
        lm.message_type AS last_message_type,
        lm.is_sent_by_me AS is_last_message_from_me
      FROM contacts c
      LEFT JOIN latest_messages lm ON lm.contact_id = c.id
      LEFT JOIN unread_counts uc ON uc.contact_id = c.id
      WHERE c.user_id = ${userId}
      ORDER BY 
        CASE WHEN lm.last_message_time IS NOT NULL THEN lm.last_message_time ELSE c.created_at END DESC
    `;

    // Convert BigInt values to numbers and format for frontend
    const conversations = conversationsRaw.map(conversation => ({
      id: conversation.id,
      phone_number: conversation.phone_number,
      name: conversation.custom_name || conversation.whatsapp_name || conversation.phone_number,
      custom_name: conversation.custom_name,
      whatsapp_name: conversation.whatsapp_name,
      last_active: conversation.last_active,
      unread_count: Number(conversation.unread_count),
      last_message_time: conversation.last_message_time,
      last_message: conversation.last_message,
      last_message_type: conversation.last_message_type,
      last_message_sender: conversation.is_last_message_from_me ? userId : conversation.phone_number,
    }));

    return NextResponse.json({ conversations });
  } catch (error: unknown) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
