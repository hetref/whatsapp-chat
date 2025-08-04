import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// WhatsApp Cloud API configuration
const WHATSAPP_PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0';

interface SendTemplateRequest {
  to: string;
  templateName: string;
  templateData: {
    id: string;
    name: string;
    language: string;
    components: Array<{
      type: string;
      format?: string;
      text?: string;
      buttons?: Array<{
        type: string;
        text: string;
        url?: string;
        phone_number?: string;
      }>;
    }>;
  };
  variables: Record<string, string>;
}

/**
 * Send template message via WhatsApp Cloud API
 */
async function sendTemplateMessage(
  to: string,
  templateName: string,
  language: string,
  variables: Record<string, string>
): Promise<{ messages: { id: string }[] }> {
  try {
    const whatsappApiUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    // Build template parameters for variables
    const templateParameters = [];
    const sortedVariables = Object.keys(variables)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(key => variables[key]);

    if (sortedVariables.length > 0) {
      templateParameters.push({
        type: 'body',
        parameters: sortedVariables.map(value => ({
          type: 'text',
          text: value
        }))
      });
    }

    const messageData = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: language
        },
        ...(templateParameters.length > 0 && { components: templateParameters })
      }
    };

    console.log('Sending template message:', JSON.stringify(messageData, null, 2));

    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WhatsApp template message send failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        templateName,
        to
      });
      throw new Error(`Failed to send template message: ${errorText}`);
    }

    const result = await response.json();
    console.log('Template message sent successfully:', result);
    return result;

  } catch (error) {
    console.error('Error sending template message:', error);
    throw error;
  }
}

/**
 * POST handler for sending template messages
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
    const { to, templateName, templateData, variables }: SendTemplateRequest = await request.json();

    // Validate required parameters
    if (!to || !templateName || !templateData) {
      console.error('Missing required parameters:', { to: !!to, templateName: !!templateName, templateData: !!templateData });
      return new NextResponse('Missing required parameters: to, templateName, templateData', { status: 400 });
    }

    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      console.error('WhatsApp API credentials not configured');
      return new NextResponse('WhatsApp API not configured', { status: 500 });
    }

    console.log(`Sending template message: ${templateName} to ${to}`);

    // Send template message via WhatsApp
    const messageResponse = await sendTemplateMessage(to, templateName, templateData.language, variables);
    const messageId = messageResponse.messages?.[0]?.id;

    if (!messageId) {
      throw new Error('No message ID returned from WhatsApp API');
    }

    // Generate content for display in chat
    let displayContent = templateName;
    const bodyComponent = templateData.components.find(c => c.type === 'BODY');
    if (bodyComponent?.text) {
      displayContent = bodyComponent.text;
      // Replace variables in display content
      Object.entries(variables).forEach(([key, value]) => {
        displayContent = displayContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      });
    }

    // Store message in database
    const timestamp = new Date().toISOString();
    
    // Process template components for storage
    const processedComponents = {
      header: null as {
        format: string;
        text?: string;
        media_url?: string | null;
      } | null,
      body: null as {
        text?: string;
      } | null,
      footer: null as {
        text?: string;
      } | null,
      buttons: [] as Array<{
        type: string;
        text: string;
        url?: string;
        phone_number?: string;
      }>
    };

    templateData.components.forEach(component => {
      switch (component.type) {
        case 'HEADER':
          processedComponents.header = {
            format: component.format || 'TEXT',
            text: component.text,
            media_url: null // Media URLs would be handled separately for headers with media
          };
          break;
        case 'BODY':
          processedComponents.body = {
            text: component.text
          };
          break;
        case 'FOOTER':
          processedComponents.footer = {
            text: component.text
          };
          break;
        case 'BUTTONS':
          if (component.buttons) {
            processedComponents.buttons = component.buttons.map(button => ({
              type: button.type,
              text: button.text,
              url: button.url,
              phone_number: button.phone_number
            }));
          }
          break;
      }
    });

    const messageObject = {
      id: messageId,
      sender_id: user.id,
      receiver_id: to,
      content: displayContent,
      timestamp: timestamp,
      is_sent_by_me: true,
      is_read: true, // Outgoing messages are already "read" by the sender
      message_type: 'template',
      media_data: JSON.stringify({
        type: 'template',
        template_name: templateName,
        template_id: templateData.id,
        language: templateData.language,
        variables: variables,
        original_content: bodyComponent?.text || templateName,
        // Add processed template components for rich display
        header: processedComponents.header,
        body: processedComponents.body,
        footer: processedComponents.footer,
        buttons: processedComponents.buttons
      }),
    };

    const { error: dbError } = await supabase
      .from('messages')
      .insert([messageObject]);

    if (dbError) {
      console.error('Error storing template message in database:', dbError);
      // Don't fail the request if database storage fails
    } else {
      console.log('Template message stored successfully in database:', messageObject.id);
    }

    return NextResponse.json({
      success: true,
      messageId: messageId,
      templateName: templateName,
      displayContent: displayContent,
      timestamp: timestamp,
    });

  } catch (error) {
    console.error('Error in send-template API:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * GET handler for checking API status
 */
export async function GET() {
  const isConfigured = !!(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN);
  
  return NextResponse.json({
    status: 'WhatsApp Send Template API',
    configured: isConfigured,
    version: WHATSAPP_API_VERSION,
    timestamp: new Date().toISOString()
  });
} 