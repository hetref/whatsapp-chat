import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  variables: {
    header: Record<string, string>;
    body: Record<string, string>;
    footer: Record<string, string>;
  };
}

/**
 * Send template message via WhatsApp Cloud API using user-specific credentials
 */
async function sendTemplateMessage(
  to: string,
  templateName: string,
  language: string,
  accessToken: string,
  phoneNumberId: string,
  apiVersion: string,
  variables: {
    header: Record<string, string>;
    body: Record<string, string>;
    footer: Record<string, string>;
  }
): Promise<{ messages: { id: string }[] }> {
  try {
    const whatsappApiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // Build template parameters for each component
    const templateComponents = [];

    // Add header parameters if header variables exist
    if (Object.keys(variables.header).length > 0) {
      const headerParams = Object.keys(variables.header)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => ({
          type: 'text',
          text: variables.header[key]
        }));
      
      templateComponents.push({
        type: 'header',
        parameters: headerParams
      });
    }

    // Add body parameters if body variables exist
    if (Object.keys(variables.body).length > 0) {
      const bodyParams = Object.keys(variables.body)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => ({
          type: 'text',
          text: variables.body[key]
        }));
      
      templateComponents.push({
        type: 'body',
        parameters: bodyParams
      });
    }

    // Add footer parameters if footer variables exist
    if (Object.keys(variables.footer).length > 0) {
      const footerParams = Object.keys(variables.footer)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => ({
          type: 'text',
          text: variables.footer[key]
        }));
      
      templateComponents.push({
        type: 'footer',
        parameters: footerParams
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
        ...(templateComponents.length > 0 && { components: templateComponents })
      }
    };

    console.log('Sending template message:', JSON.stringify(messageData, null, 2));

    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
 * Now uses user-specific access tokens and phone number IDs
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
    const { to, templateName, templateData, variables }: SendTemplateRequest = await request.json();

    // Validate required parameters
    if (!to || !templateName || !templateData) {
      console.error('Missing required parameters:', { to: !!to, templateName: !!templateName, templateData: !!templateData });
      return NextResponse.json(
        { error: 'Missing required parameters: to, templateName, templateData' },
        { status: 400 }
      );
    }

    // Get user's WhatsApp API credentials
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('access_token, phone_number_id, api_version, access_token_added')
      .eq('id', user.id)
      .single();

    if (settingsError || !settings) {
      console.error('User settings not found:', settingsError);
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured. Please complete setup.' },
        { status: 400 }
      );
    }

    if (!settings.access_token_added || !settings.access_token || !settings.phone_number_id) {
      console.error('WhatsApp API credentials not configured for user:', user.id);
      return NextResponse.json(
        { error: 'WhatsApp Access Token not configured. Please complete setup.' },
        { status: 400 }
      );
    }

    const accessToken = settings.access_token;
    const phoneNumberId = settings.phone_number_id;
    const apiVersion = settings.api_version || 'v23.0';

    console.log(`Sending template message: ${templateName} to ${to}`);

    // Send template message via WhatsApp using user-specific credentials
    const messageResponse = await sendTemplateMessage(
      to, 
      templateName, 
      templateData.language, 
      accessToken,
      phoneNumberId,
      apiVersion,
      variables
    );
    const messageId = messageResponse.messages?.[0]?.id;

    if (!messageId) {
      throw new Error('No message ID returned from WhatsApp API');
    }

    // Generate content for display in chat
    let displayContent = templateName;
    const bodyComponent = templateData.components.find(c => c.type === 'BODY');
    if (bodyComponent?.text) {
      displayContent = bodyComponent.text;
      // Replace variables in display content using body variables
      Object.entries(variables.body).forEach(([key, value]) => {
        displayContent = displayContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      });
    }

    // Store message in database
    const timestamp = new Date().toISOString();
    
    // Process template components for storage with variables replaced
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

    // Helper function to replace variables in text
    const replaceVariables = (text: string, componentVariables: Record<string, string>) => {
      let result = text;
      Object.entries(componentVariables).forEach(([key, value]) => {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      });
      return result;
    };

    templateData.components.forEach(component => {
      switch (component.type) {
        case 'HEADER':
          processedComponents.header = {
            format: component.format || 'TEXT',
            text: component.text ? replaceVariables(component.text, variables.header) : component.text,
            media_url: null // Media URLs would be handled separately for headers with media
          };
          break;
        case 'BODY':
          processedComponents.body = {
            text: component.text ? replaceVariables(component.text, variables.body) : component.text
          };
          break;
        case 'FOOTER':
          processedComponents.footer = {
            text: component.text ? replaceVariables(component.text, variables.footer) : component.text
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
      sender_id: to, // Recipient phone number (sender in DB)
      receiver_id: user.id, // Current authenticated user (receiver in DB)
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
 * GET handler for checking API status (now user-specific)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's WhatsApp API credentials
    const { data: settings } = await supabase
      .from('user_settings')
      .select('access_token_added, api_version')
      .eq('id', user.id)
      .single();

    const isConfigured = settings?.access_token_added || false;
    const apiVersion = settings?.api_version || 'v23.0';
    
    return NextResponse.json({
      status: 'WhatsApp Send Template API',
      configured: isConfigured,
      version: apiVersion,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'WhatsApp Send Template API',
      configured: false,
      error: 'Failed to check configuration',
      timestamp: new Date().toISOString()
    });
  }
} 