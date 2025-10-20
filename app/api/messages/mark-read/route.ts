import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST handler to mark messages as read
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { otherUserId } = await request.json();

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'Missing otherUserId parameter' },
        { status: 400 }
      );
    }

    console.log(`Marking messages as read for conversation with ${otherUserId}`);

    // Call the database function to mark messages as read
    const { data, error } = await supabase.rpc('mark_messages_as_read', {
      other_user_id: otherUserId
    });

    if (error) {
      console.error('Error marking messages as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark messages as read', details: error.message },
        { status: 500 }
      );
    }

    const markedCount = data || 0;
    console.log(`Marked ${markedCount} messages as read`);

    return NextResponse.json({
      success: true,
      markedCount: markedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
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