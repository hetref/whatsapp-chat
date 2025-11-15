import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/**
 * POST - Broadcast a message to all group members
 * Sends messages via WhatsApp and stores them in the database
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const { message, templateName = null, templateData = null, variables = null } = body;

    // Validate input
    if (!message && !templateName) {
      return NextResponse.json(
        { error: 'Message or template name is required' },
        { status: 400 }
      );
    }

    // Verify group ownership and get group details
    const group = await prisma.chatGroup.findFirst({
      where: {
        id: groupId,
        ownerId: userId
      }
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get all group members
    const members = await prisma.groupMember.findMany({
      where: {
        groupId: groupId
      },
      select: {
        userId: true
      }
    });

    if (!members || members.length === 0) {
      return NextResponse.json(
        { error: 'Group has no members' },
        { status: 400 }
      );
    }

    // Get user settings for WhatsApp credentials
    const settings = await prisma.userSettings.findUnique({
      where: {
        id: userId
      },
      select: {
        accessToken: true,
        phoneNumberId: true,
        apiVersion: true
      }
    });

    if (!settings || !settings.accessToken || !settings.phoneNumberId) {
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured' },
        { status: 400 }
      );
    }

    const accessToken = settings.accessToken;
    const phoneNumberId = settings.phoneNumberId;
    const apiVersion = settings.apiVersion || 'v23.0';
    const whatsappApiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const timestamp = new Date().toISOString();
    
    // Helper function to replace variables in text
    const replaceVariables = (text: string, componentVariables: Record<string, string>) => {
      let result = text;
      Object.entries(componentVariables).forEach(([key, value]) => {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      });
      return result;
    };

    // Send message to each member individually
    for (const member of members) {
      try {
        const cleanPhoneNumber = member.userId.replace(/\s+/g, '').replace(/[^\d]/g, '');
        let whatsappResponse;
        let messageContent = message;
        let messageMediaData = null;

        if (templateName && templateData) {
          // Build template components for WhatsApp API
          const templateComponents = [];

          // Add header parameters
          if (variables?.header && Object.keys(variables.header).length > 0) {
            const headerParams = Object.keys(variables.header)
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => ({ type: 'text', text: variables.header[key] }));
            templateComponents.push({ type: 'header', parameters: headerParams });
          }

          // Add body parameters
          if (variables?.body && Object.keys(variables.body).length > 0) {
            const bodyParams = Object.keys(variables.body)
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => ({ type: 'text', text: variables.body[key] }));
            templateComponents.push({ type: 'body', parameters: bodyParams });
          }

          // Add footer parameters
          if (variables?.footer && Object.keys(variables.footer).length > 0) {
            const footerParams = Object.keys(variables.footer)
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => ({ type: 'text', text: variables.footer[key] }));
            templateComponents.push({ type: 'footer', parameters: footerParams });
          }

          // Send template message via WhatsApp API
          const templateMessage = {
            messaging_product: 'whatsapp',
            to: cleanPhoneNumber,
            type: 'template',
            template: {
              name: templateName,
              language: {
                code: templateData.language || 'en'
              },
              ...(templateComponents.length > 0 && { components: templateComponents })
            }
          };

          whatsappResponse = await fetch(whatsappApiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(templateMessage),
          });

          // Process template components for storage with variables replaced
          interface ProcessedComponent {
            format?: string;
            text?: string;
            media_url?: string | null;
          }
          
          interface ProcessedButton {
            type: string;
            text: string;
            url?: string;
            phone_number?: string;
          }
          
          const processedComponents = {
            header: null as ProcessedComponent | null,
            body: null as ProcessedComponent | null,
            footer: null as ProcessedComponent | null,
            buttons: [] as ProcessedButton[]
          };

          templateData.components?.forEach((component: { type: string; format?: string; text?: string; buttons?: ProcessedButton[] }) => {
            switch (component.type) {
              case 'HEADER':
                processedComponents.header = {
                  format: component.format || 'TEXT',
                  text: component.text && variables?.header ? replaceVariables(component.text, variables.header) : component.text,
                  media_url: null
                };
                break;
              case 'BODY':
                processedComponents.body = {
                  text: component.text && variables?.body ? replaceVariables(component.text, variables.body) : component.text
                };
                break;
              case 'FOOTER':
                processedComponents.footer = {
                  text: component.text && variables?.footer ? replaceVariables(component.text, variables.footer) : component.text
                };
                break;
              case 'BUTTONS':
                if (component.buttons) {
                  processedComponents.buttons = component.buttons.map((button) => ({
                    type: button.type,
                    text: button.text,
                    url: button.url,
                    phone_number: button.phone_number
                  }));
                }
                break;
            }
          });

          // Generate display content from body with variables replaced
          const bodyComponent = templateData.components?.find((c: { type: string }) => c.type === 'BODY');
          messageContent = bodyComponent?.text && variables?.body 
            ? replaceVariables(bodyComponent.text, variables.body)
            : (message || `Template: ${templateName}`);

          // Store template info in media_data for display
          messageMediaData = JSON.stringify({
            type: 'template',
            template_name: templateName,
            template_id: templateData.id,
            language: templateData.language,
            variables: variables,
            original_content: bodyComponent?.text || templateName,
            header: processedComponents.header,
            body: processedComponents.body,
            footer: processedComponents.footer,
            buttons: processedComponents.buttons,
            broadcast_group_id: groupId // Mark as broadcast message
          });
        } else {
          // Send text message via WhatsApp API
          const textMessage = {
            messaging_product: 'whatsapp',
            to: cleanPhoneNumber,
            type: 'text',
            text: {
              body: message
            }
          };

          whatsappResponse = await fetch(whatsappApiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(textMessage),
          });
          
          // Mark text message as broadcast
          messageMediaData = JSON.stringify({
            broadcast_group_id: groupId
          });
        }

        const responseData = await whatsappResponse.json();

        if (whatsappResponse.ok) {
          results.success++;

          // Store the broadcast message in the database for this recipient
          const messageId = responseData.messages?.[0]?.id || `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const messageObject = {
            id: messageId,
            senderId: cleanPhoneNumber, // The recipient's phone number
            receiverId: userId, // The broadcaster (current user)
            content: messageContent,
            timestamp: new Date(),
            isSentByMe: true, // Sent by the current user
            isRead: true, // Outgoing messages are already "read"
            messageType: templateName ? 'template' : 'text',
            mediaData: messageMediaData
          };

          // Store in database
          try {
            await prisma.message.create({
              data: messageObject
            });
            console.log(`Broadcast message stored for ${member.userId}`);
          } catch (dbError) {
            console.error(`Error storing broadcast message for ${member.userId}:`, dbError);
          }
        } else {
          results.failed++;
          results.errors.push(`${member.userId}: ${responseData.error?.message || 'Unknown error'}`);
          console.error(`WhatsApp API error for ${member.userId}:`, responseData);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`${member.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Error sending to ${member.userId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Broadcast sent to ${results.success}/${members.length} members`,
      results: {
        total: members.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
    });

  } catch (error) {
    console.error('Error in broadcast API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

