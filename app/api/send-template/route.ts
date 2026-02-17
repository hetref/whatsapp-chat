import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { checkSubscriptionActive, checkContactsLimit } from '@/lib/plan-limits';

interface SendTemplateRequest {
  to: string;
  contactName?: string; // Optional: Name of the contact (used when creating new users)
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
  mediaUrl?: string; // URL for IMAGE/VIDEO/DOCUMENT headers (publicly accessible URL)
  mediaId?: string; // Media ID for IMAGE/VIDEO/DOCUMENT headers (uploaded to Facebook)
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
  },
  variables: {
    header: Record<string, string>;
    body: Record<string, string>;
    footer: Record<string, string>;
  },
  mediaUrl?: string,
  mediaId?: string
): Promise<{ messages: { id: string }[] }> {
  try {
    const whatsappApiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // Build template parameters for each component
    const templateComponents = [];

    // Check if template has a media header (IMAGE/VIDEO/DOCUMENT)
    const headerComponent = templateData.components.find(c => c.type === 'HEADER');
    const hasMediaHeader = headerComponent?.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComponent.format);

    // Add header parameters
    if (hasMediaHeader && (mediaUrl || mediaId) && headerComponent?.format) {
      // Media header - supports both URL (link) and uploaded media (id)
      // Format according to WhatsApp Business API documentation
      const mediaType = headerComponent.format.toLowerCase();
      const mediaParameter: Record<string, any> = {
        type: mediaType
      };

      // Use media ID if provided (preferred method - more reliable)
      // Otherwise use URL (must be publicly accessible)
      if (mediaId) {
        mediaParameter[mediaType] = {
          id: mediaId
        };
      } else if (mediaUrl) {
        mediaParameter[mediaType] = {
          link: mediaUrl
        };
      }

      templateComponents.push({
        type: 'header',
        parameters: [mediaParameter]
      });
    } else if (Object.keys(variables.header).length > 0) {
      // Text header with variables
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
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      console.error('Authentication error: No user ID');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check subscription is active (not paused/expired/cancelled)
    const subCheck = await checkSubscriptionActive(userId);
    if (!subCheck.active) {
      return NextResponse.json(
        { error: 'Messaging blocked', message: subCheck.message, subscriptionStatus: subCheck.status },
        { status: 403 }
      );
    }

    // Parse request body
    const { to, contactName, templateName, templateData, variables, mediaUrl, mediaId }: SendTemplateRequest = await request.json();

    // Validate required parameters
    if (!to || !templateName || !templateData) {
      console.error('Missing required parameters:', { to: !!to, templateName: !!templateName, templateData: !!templateData });
      return NextResponse.json(
        { error: 'Missing required parameters: to, templateName, templateData' },
        { status: 400 }
      );
    }

    // Get user's WhatsApp API credentials
    const settings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        phoneNumberId: true,
        apiVersion: true
      }
    });

    if (!settings) {
      console.error('User settings not found for user:', userId);
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured. Please complete setup.' },
        { status: 400 }
      );
    }

    if (!settings.accessToken || !settings.phoneNumberId) {
      console.error('WhatsApp API credentials not configured for user:', userId);
      return NextResponse.json(
        { error: 'WhatsApp Access Token not configured. Please complete setup.' },
        { status: 400 }
      );
    }

    const accessToken = settings.accessToken;
    const phoneNumberId = settings.phoneNumberId;
    const apiVersion = settings.apiVersion || 'v23.0';

    // Clean phone number for database consistency
    const cleanPhoneNumber = to.replace(/\s+/g, '').replace(/[^\d]/g, '');

    // Find or create contact for this user
    let contact = await prisma.contact.findUnique({
      where: {
        contacts_user_id_phone_number_key: {
          userId: userId,
          phoneNumber: cleanPhoneNumber
        }
      }
    });

    // Create contact if it doesn't exist (DO NOT update existing contacts unless provided)
    if (!contact) {
      // Check contacts limit before creating a new contact
      const contactsCheck = await checkContactsLimit(userId);
      if (!contactsCheck.allowed) {
        return NextResponse.json(
          { error: `Contacts limit reached (${contactsCheck.current}/${contactsCheck.limit}). Upgrade your plan to add more contacts.` },
          { status: 403 }
        );
      }

      console.log(`Creating new contact ${cleanPhoneNumber} for user ${userId} with name: ${contactName || cleanPhoneNumber}`);
      try {
        contact = await prisma.contact.create({
          data: {
            userId: userId,
            phoneNumber: cleanPhoneNumber,
            customName: contactName || null, // Use provided contact name if available
            lastActive: new Date()
          }
        });
      } catch (contactError: unknown) {
        console.error('Error creating contact:', contactError);
        return NextResponse.json(
          { error: 'Failed to create contact record' },
          { status: 500 }
        );
      }
    } else {
      console.log(`Contact already exists: ${cleanPhoneNumber} for user ${userId}, skipping update (existing name: ${contact.customName || contact.phoneNumber})`);
    }

    console.log(`Sending template message: ${templateName} to ${to}`);

    // Validate media URL or ID if template has media header
    const headerComponent = templateData.components.find(c => c.type === 'HEADER');
    const hasMediaHeader = headerComponent?.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComponent.format);

    if (hasMediaHeader && !mediaUrl && !mediaId && headerComponent?.format) {
      return NextResponse.json(
        {
          error: `This template requires a ${headerComponent.format.toLowerCase()} for the header. Provide either a publicly accessible URL (mediaUrl) or a Media ID (mediaId).`,
          details: 'You can upload media to Facebook and get a Media ID, or provide a direct HTTPS URL to the media file.'
        },
        { status: 400 }
      );
    }

    // Validate URL format if URL is provided
    if (mediaUrl) {
      try {
        const url = new URL(mediaUrl);
        if (!url.protocol.startsWith('https')) {
          return NextResponse.json(
            { error: 'Media URL must use HTTPS protocol' },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid media URL format. Please provide a valid HTTPS URL.' },
          { status: 400 }
        );
      }
    }

    // Send template message via WhatsApp using user-specific credentials
    const messageResponse = await sendTemplateMessage(
      cleanPhoneNumber,
      templateName,
      templateData.language,
      accessToken,
      phoneNumberId,
      apiVersion,
      templateData,
      variables,
      mediaUrl,
      mediaId
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
    const timestamp = new Date();

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
            media_url: mediaUrl || mediaId || null // Store media URL or ID if provided
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
      userId: userId, // Current authenticated user (owner)
      contactId: contact.id, // Contact involved in this message
      content: displayContent,
      timestamp: timestamp,
      isSentByMe: true,
      isRead: true, // Outgoing messages are already "read" by the sender
      messageType: 'template',
      mediaData: JSON.stringify({
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
      })
    };

    try {
      await prisma.message.create({
        data: messageObject
      });
      console.log('Template message stored successfully in database:', messageObject.id);
    } catch (dbError: unknown) {
      console.error('Error storing template message in database:', dbError);
      // Don't fail the request if database storage fails
    }

    return NextResponse.json({
      success: true,
      messageId: messageId,
      templateName: templateName,
      displayContent: displayContent,
      timestamp: timestamp.toISOString(),
    });

  } catch (error: unknown) {
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

    // Get user's WhatsApp API credentials
    const settings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        apiVersion: true
      }
    });

    const isConfigured = settings?.accessToken || false;
    const apiVersion = settings?.apiVersion || 'v23.0';

    return NextResponse.json({
      status: 'WhatsApp Send Template API',
      configured: isConfigured,
      version: apiVersion,
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({
      status: 'WhatsApp Send Template API',
      configured: false,
      error: 'Failed to check configuration',
      timestamp: new Date().toISOString()
    });
  }
} 