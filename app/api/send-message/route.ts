import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/**
 * POST handler for sending WhatsApp messages
 * Accepts message data and sends it via WhatsApp Cloud API
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

    // Parse request body
    const { to, message } = await request.json();

    // Validate required parameters
    if (!to || !message) {
      console.error('Missing required parameters:', { to: !!to, message: !!message });
      return NextResponse.json(
        { error: 'Missing required parameters: to, message' },
        { status: 400 }
      );
    }

    // Check if this is a template message (from ChatWindow template selector)
    let isTemplateMessage = false;
    let templateData = null;
    let displayMessage = message;
    
    try {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.type === 'template') {
        isTemplateMessage = true;
        templateData = parsedMessage;
        displayMessage = parsedMessage.displayMessage || parsedMessage.templateName;
        console.log('Detected template message:', templateData.templateName);
      }
    } catch (e) {
      // Not a JSON message, treat as regular text
    }

    // Clean and validate phone number format for WhatsApp API
    // WhatsApp expects phone numbers without + prefix, with country code
    const cleanPhoneNumber = to.replace(/\s+/g, '').replace(/[^\d]/g, ''); // Remove all non-digits including +
    
    // Validate phone number format (10-15 digits without + prefix)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(cleanPhoneNumber)) {
      return NextResponse.json(
        { 
          error: 'Invalid phone number format', 
          message: 'Phone number must contain 10-15 digits (e.g., 918097296453)' 
        },
        { status: 400 }
      );
    }

    // Get user settings for WhatsApp credentials
    const userSettings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        phoneNumberId: true,
        apiVersion: true
      }
    });

    if (!userSettings) {
      console.error('Settings not found for user:', userId);
      return NextResponse.json(
        { error: 'User settings not found. Please configure your WhatsApp settings first.' },
        { status: 400 }
      );
    }

    const accessToken = userSettings.accessToken;
    const phoneNumberId = userSettings.phoneNumberId;
    const apiVersion = userSettings.apiVersion || 'v23.0';

    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { id: cleanPhoneNumber }
    });

    // Create user if they don't exist
    if (!existingUser) {
      console.log(`Creating new user: ${cleanPhoneNumber}`);
      try {
        await prisma.user.create({
          data: {
            id: cleanPhoneNumber,
            name: cleanPhoneNumber, // Use phone number as default name
            lastActive: new Date()
          }
        });
      } catch (userError) {
        console.error('Error creating user:', userError);
        return NextResponse.json(
          { error: 'Failed to create user record' },
          { status: 500 }
        );
      }
    }

    // Prepare WhatsApp API request
    const whatsappApiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    
    let messageData;
    let responseData;

    if (isTemplateMessage && templateData) {
      // Handle template message
      const templateComponents = [];
      const variables = templateData.variables || {};

      // Add header parameters if header variables exist
      if (variables.header && Object.keys(variables.header).length > 0) {
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
      if (variables.body && Object.keys(variables.body).length > 0) {
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
      if (variables.footer && Object.keys(variables.footer).length > 0) {
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

      messageData = {
        messaging_product: 'whatsapp',
        to: cleanPhoneNumber,
        type: 'template',
        template: {
          name: templateData.templateName,
          language: {
            code: templateData.templateData?.language || 'en'
          },
          ...(templateComponents.length > 0 && { components: templateComponents })
        }
      };
    } else {
      // Handle regular text message
      messageData = {
        messaging_product: 'whatsapp',
        to: cleanPhoneNumber, // Use cleaned phone number
        type: 'text',
        text: {
          body: message
        }
      };
    }

    console.log('Sending message to WhatsApp API:', {
      to: cleanPhoneNumber,
      originalTo: to,
      message: isTemplateMessage ? `Template: ${templateData?.templateName}` : message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      type: isTemplateMessage ? 'template' : 'text',
      userId: userId
    });

    // Send message via WhatsApp Cloud API using user-specific access token
    const whatsappResponse = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    responseData = await whatsappResponse.json();

    console.log('WhatsApp response:', responseData);

    if (!whatsappResponse.ok) {
      console.error('WhatsApp API error:', responseData);
      return NextResponse.json(
        { 
          error: 'Failed to send message via WhatsApp API', 
          details: responseData 
        }, 
        { status: whatsappResponse.status }
      );
    }

    // Get the message ID from WhatsApp response
    const messageId = responseData.messages?.[0]?.id;
    const timestamp = new Date().toISOString();

    console.log('Message sent successfully via WhatsApp API:', messageId);

    // Prepare message object for database insertion
    // sender_id is the authenticated user (who is sending the message)
    // receiver_id is the phone number (who is receiving the message)
    let mediaDataForDb = null;
    
    if (isTemplateMessage && templateData) {
      // Store template metadata for proper display
      mediaDataForDb = JSON.stringify({
        type: 'template',
        template_name: templateData.templateName,
        template_id: templateData.templateData?.id,
        language: templateData.templateData?.language || 'en',
        variables: templateData.variables,
        original_content: templateData.templateData?.components?.find(c => c.type === 'BODY')?.text || templateData.templateName
      });
    }
    
    const messageObject = {
      id: messageId || `outgoing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender_id: userId, // Current authenticated user (sender)
      receiver_id: cleanPhoneNumber, // Recipient phone number (receiver)
      content: displayMessage, // Use display message for templates
      timestamp: timestamp,
      is_sent_by_me: true,
      is_read: true, // Outgoing messages are already "read" by the sender
      message_type: isTemplateMessage ? 'template' : 'text',
      media_data: mediaDataForDb
    };

    console.log('Storing message in database:', {
      id: messageObject.id,
      sender_id: messageObject.sender_id, // Auth user
      receiver_id: messageObject.receiver_id, // Phone number
      content: messageObject.content.substring(0, 50) + (messageObject.content.length > 50 ? '...' : ''),
      timestamp: messageObject.timestamp,
      message_type: messageObject.message_type
    });

    // Store the sent message in our database
    try {
      const insertedMessage = await prisma.message.create({
        data: {
          id: messageObject.id,
          senderId: messageObject.sender_id,
          receiverId: messageObject.receiver_id,
          content: messageObject.content,
          timestamp: new Date(messageObject.timestamp),
          isSentByMe: messageObject.is_sent_by_me,
          isRead: messageObject.is_read,
          messageType: messageObject.message_type,
          mediaData: messageObject.media_data
        }
      });
      console.log('Message stored successfully in database:', insertedMessage.id);
    } catch (dbError) {
      console.error('Error storing sent message in database:', dbError);
      // Don't fail the request if database storage fails, message was already sent
    }

    // Update last_active for the sender (current user)
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActive: new Date(timestamp) }
      });
    } catch (userUpdateError) {
      console.error('Error updating user last_active:', userUpdateError);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      messageId: messageObject.id,
      timestamp: timestamp,
      whatsappResponse: responseData,
      storedInDb: true
    });

  } catch (error) {
    console.error('Error in send-message API:', error);
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

    // Get user settings for WhatsApp credentials
    const userSettings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        phoneNumberId: true,
        apiVersion: true
      }
    });

    const isConfigured = userSettings?.accessToken && userSettings?.phoneNumberId;
    const apiVersion = userSettings?.apiVersion || 'v23.0';
    
    return NextResponse.json({
      status: 'WhatsApp Send Message API',
      configured: isConfigured,
      version: apiVersion,
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({
      status: 'WhatsApp Send Message API',
      configured: false,
      error: 'Failed to check configuration',
      timestamp: new Date().toISOString()
    });
  }
} 