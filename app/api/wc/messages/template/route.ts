import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';

interface TemplateVariable {
    type: string;
    text: string;
}

interface TemplateComponent {
    type: string;
    parameters?: TemplateVariable[];
}

/**
 * POST /api/wc/messages/template
 * Send a template message via WhatsApp Cloud API
 * 
 * Authentication: Required (API Key)
 * 
 * Request Body:
 * {
 *   "to": "+1234567890",           // Recipient phone number (E.164 format)
 *   "template": {
 *     "name": "order_confirmation", // Template name
 *     "language": "en_US",          // Language code
 *     "components": [               // Optional: Template components with variables
 *       {
 *         "type": "header",         // Component type: header, body, footer, button
 *         "parameters": [
 *           {
 *             "type": "text",       // Parameter type: text, currency, date_time, image, video, document
 *             "text": "John Doe"    // Parameter value
 *           }
 *         ]
 *       },
 *       {
 *         "type": "body",
 *         "parameters": [
 *           { "type": "text", "text": "ORD-12345" },
 *           { "type": "text", "text": "December 25, 2025" }
 *         ]
 *       }
 *     ]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate the request
        const authResult = await authenticateApiRequest(request);

        if (!authResult.success) {
            return authResult.response;
        }

        const { userId, settings } = authResult.data;

        // Parse and validate request body
        const body = await request.json();
        const { to, template } = body;

        // Validate required fields
        if (!to || typeof to !== 'string') {
            return createErrorResponse('Missing or invalid field: to (phone number required)', 400, 'INVALID_PARAMETERS');
        }

        if (!template || typeof template !== 'object') {
            return createErrorResponse('Missing or invalid field: template (template object required)', 400, 'INVALID_PARAMETERS');
        }

        if (!template.name || typeof template.name !== 'string') {
            return createErrorResponse('Missing or invalid field: template.name (template name required)', 400, 'INVALID_PARAMETERS');
        }

        if (!template.language || typeof template.language !== 'string') {
            return createErrorResponse('Missing or invalid field: template.language (language code required)', 400, 'INVALID_PARAMETERS');
        }

        // Clean and validate phone number
        const cleanPhoneNumber = to.replace(/\s+/g, '').replace(/[^\d]/g, '');

        // Validate phone number format (10-15 digits)
        const phoneRegex = /^\d{10,15}$/;
        if (!phoneRegex.test(cleanPhoneNumber)) {
            return createErrorResponse(
                'Invalid phone number format. Use E.164 format (e.g., +1234567890) or digits only (1234567890)',
                400,
                'INVALID_PHONE_NUMBER'
            );
        }

        // Prepare WhatsApp API request
        const whatsappApiUrl = `https://graph.facebook.com/${settings.apiVersion}/${settings.phoneNumberId}/messages`;

        const messageData = {
            messaging_product: 'whatsapp',
            to: cleanPhoneNumber,
            type: 'template',
            template: {
                name: template.name,
                language: {
                    code: template.language
                },
                ...(template.components && template.components.length > 0 && {
                    components: template.components
                })
            }
        };

        console.log('[WC API] Sending template message:', {
            to: cleanPhoneNumber,
            templateName: template.name,
            language: template.language,
            componentsCount: template.components?.length || 0,
            userId
        });

        // Send message via WhatsApp Cloud API
        const whatsappResponse = await fetch(whatsappApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageData),
        });

        const responseData = await whatsappResponse.json();

        if (!whatsappResponse.ok) {
            console.error('[WC API] WhatsApp API error:', responseData);
            return NextResponse.json(
                {
                    success: false,
                    message: 'Failed to send template message via WhatsApp API',
                    error: {
                        code: 'WHATSAPP_API_ERROR',
                        details: responseData.error || responseData
                    }
                },
                { status: whatsappResponse.status }
            );
        }

        const messageId = responseData.messages?.[0]?.id;
        const timestamp = new Date();

        console.log('[WC API] Template message sent successfully:', messageId);

        // Generate display content for database
        let displayContent = `Template: ${template.name}`;

        // If body component has parameters, create a display version
        const bodyComponent = template.components?.find((c: TemplateComponent) => c.type === 'body');
        if (bodyComponent?.parameters) {
            const bodyText = bodyComponent.parameters.map((p: TemplateVariable) => p.text).join(', ');
            displayContent = `${template.name} - ${bodyText}`;
        }

        // Find or create contact for this phone number
        let contact = await prisma.contact.findUnique({
            where: {
                contacts_user_id_phone_number_key: {
                    userId: userId,
                    phoneNumber: cleanPhoneNumber
                }
            }
        });

        if (!contact) {
            // Create new contact
            contact = await prisma.contact.create({
                data: {
                    userId: userId,
                    phoneNumber: cleanPhoneNumber,
                    lastActive: timestamp
                }
            });
        } else {
            // Update last active time
            await prisma.contact.update({
                where: { id: contact.id },
                data: { lastActive: timestamp }
            });
        }

        // Store message in database
        try {
            await prisma.message.create({
                data: {
                    id: messageId || `wc_template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    userId: userId,
                    contactId: contact.id,
                    content: displayContent,
                    timestamp: timestamp,
                    isSentByMe: true,
                    isRead: true,
                    messageType: 'template',
                    mediaData: JSON.stringify({
                        type: 'template',
                        template_name: template.name,
                        language: template.language,
                        components: template.components || []
                    })
                }
            });
        } catch (dbError) {
            console.error('[WC API] Error storing message in database:', dbError);
            // Don't fail the request if database storage fails
        }

        return createSuccessResponse(
            {
                message_id: messageId,
                recipient: to,
                template_name: template.name,
                language: template.language,
                timestamp: timestamp.toISOString(),
                whatsapp_response: responseData
            },
            'Template message sent successfully',
            200
        );

    } catch (error) {
        console.error('[WC API] Error in template message endpoint:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500,
            'INTERNAL_ERROR'
        );
    }
}
