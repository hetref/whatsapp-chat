import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePresignedUrl } from '@/lib/aws-s3';

/**
 * POST handler for refreshing S3 pre-signed URLs
 * This is useful when URLs expire and need to be regenerated
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse request body
    const { messageId } = await request.json();

    // Validate required parameters
    if (!messageId) {
      return new NextResponse('Missing required parameter: messageId', { status: 400 });
    }

    // Get the message from database
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('Message not found:', messageError);
      return new NextResponse('Message not found', { status: 404 });
    }

    // Check if user has access to this message
    if (message.sender_id !== user.id && message.receiver_id !== user.id) {
      return new NextResponse('Access denied', { status: 403 });
    }

    // Check if message has media data
    if (!message.media_data) {
      return new NextResponse('Message has no media data', { status: 400 });
    }

    let mediaData;
    try {
      mediaData = JSON.parse(message.media_data);
    } catch (error) {
      console.error('Error parsing media data:', error);
      return new NextResponse('Invalid media data', { status: 400 });
    }

    // Check if media was uploaded to S3
    if (!mediaData.s3_uploaded || !mediaData.id || !mediaData.mime_type) {
      return new NextResponse('Media not available in S3', { status: 400 });
    }

    // Generate new pre-signed URL
    const newUrl = generatePresignedUrl(
      message.sender_id,
      mediaData.id,
      mediaData.mime_type
    );

    if (!newUrl) {
      console.error('Failed to generate new pre-signed URL');
      return new NextResponse('Failed to generate media URL', { status: 500 });
    }

    // Update the media_data with new URL
    const updatedMediaData = {
      ...mediaData,
      media_url: newUrl,
      url_refreshed_at: new Date().toISOString()
    };

    // Update the message in database
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        media_data: JSON.stringify(updatedMediaData)
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error updating message with new URL:', updateError);
      return new NextResponse('Failed to update message', { status: 500 });
    }

    console.log(`Successfully refreshed media URL for message: ${messageId}`);

    // Return the new URL
    return NextResponse.json({
      success: true,
      messageId: messageId,
      newUrl: newUrl,
      refreshedAt: updatedMediaData.url_refreshed_at
    });

  } catch (error) {
    console.error('Error in refresh-url API:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }), 
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