import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST handler for marking webhook as verified
 * This is called internally after successful webhook verification
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
    const body = await request.json();
    const { verified } = body;

    if (typeof verified !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid verified value' },
        { status: 400 }
      );
    }

    console.log(`Setting webhook_verified to ${verified} for user:`, user.id);

    // Update webhook_verified status
    const { data: settings, error: dbError } = await supabase
      .from('user_settings')
      .update({
        webhook_verified: verified,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to update webhook status' },
        { status: 500 }
      );
    }

    console.log('Webhook verification status updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Webhook verification status updated',
      webhook_verified: settings.webhook_verified,
    });

  } catch (error) {
    console.error('Error in verify webhook API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

