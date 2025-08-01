import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// WhatsApp Cloud API configuration
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v17.0';

/**
 * POST handler for sending WhatsApp messages
 * Accepts message data and sends it via WhatsApp Cloud API
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse request body
    const { to, message } = await request.json();

    // Validate required parameters
    if (!to || !message) {
      return new NextResponse('Missing required parameters: to, message', { status: 400 });
    }

    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      console.error('WhatsApp API credentials not configured');
      return new NextResponse('WhatsApp API not configured', { status: 500 });
    }

    // Prepare WhatsApp API request
    const whatsappApiUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    const messageData = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: {
        body: message
      }
    };

    console.log('Sending message to WhatsApp API:', {
      to,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
    });

    // Send message via WhatsApp Cloud API
    const whatsappResponse = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    const responseData = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      console.error('WhatsApp API error:', responseData);
      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to send message via WhatsApp API', 
          details: responseData 
        }), 
        { status: whatsappResponse.status }
      );
    }

    // Get the message ID from WhatsApp response
    const messageId = responseData.messages?.[0]?.id;
    const timestamp = new Date().toISOString();

    console.log('Message sent successfully via WhatsApp API:', messageId);

    // Store the sent message in our database
    const { error: dbError } = await supabase
      .from('messages')
      .insert([{
        id: messageId || `outgoing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender_id: user.id,
        receiver_id: to,
        content: message,
        timestamp: timestamp,
        is_sent_by_me: true
      }]);

    if (dbError) {
      console.error('Error storing sent message in database:', dbError);
      // Don't fail the request if database storage fails, message was already sent
    }

    // Update last_active for the sender (current user)
    await supabase
      .from('users')
      .upsert([{
        id: user.id,
        name: user.user_metadata?.full_name || user.email || 'Unknown User',
        last_active: timestamp
      }], {
        onConflict: 'id'
      });

    // Return success response
    return NextResponse.json({
      success: true,
      messageId: messageId,
      timestamp: timestamp,
      whatsappResponse: responseData
    });

  } catch (error) {
    console.error('Error in send-message API:', error);
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
  const isConfigured = !!(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN);
  
  return NextResponse.json({
    status: 'WhatsApp Send Message API',
    configured: isConfigured,
    version: WHATSAPP_API_VERSION,
    timestamp: new Date().toISOString()
  });
} 