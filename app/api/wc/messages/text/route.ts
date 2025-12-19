import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';

/**
 * POST /api/wc/messages/text
 * Send a text message via WhatsApp Cloud API
 * 
 * Authentication: Required (API Key)
 * 
 * Request Body:
 * {
 *   "to": "+1234567890",      // Recipient phone number (E.164 format)
 *   "text": "Hello World!"     // Message text (max 4096 characters)
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
        const { to, text } = body;

        // Validate required fields
        if (!to || typeof to !== 'string') {
            return createErrorResponse('Missing or invalid field: to (phone number required)', 400, 'INVALID_PARAMETERS');
        }

        if (!text || typeof text !== 'string') {
            return createErrorResponse('Missing or invalid field: text (message text required)', 400, 'INVALID_PARAMETERS');
        }

        // Validate text length (WhatsApp limit is 4096 characters)
        if (text.length > 4096) {
            return createErrorResponse('Text message exceeds maximum length of 4096 characters', 400, 'TEXT_TOO_LONG');
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

        // Ensure user exists in database
        await prisma.user.upsert({
            where: { id: cleanPhoneNumber },
            update: { lastActive: new Date() },
            create: {
                id: cleanPhoneNumber,
                name: cleanPhoneNumber,
                lastActive: new Date()
            }
        });

        // Prepare WhatsApp API request
        const whatsappApiUrl = `https://graph.facebook.com/${settings.apiVersion}/${settings.phoneNumberId}/messages`;

        const messageData = {
            messaging_product: 'whatsapp',
            to: cleanPhoneNumber,
            type: 'text',
            text: {
                body: text
            }
        };

        console.log('[WC API] Sending text message:', {
            to: cleanPhoneNumber,
            textLength: text.length,
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
                    message: 'Failed to send message via WhatsApp API',
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

        console.log('[WC API] Message sent successfully:', messageId);

        // Store message in database
        try {
            await prisma.message.create({
                data: {
                    id: messageId || `wc_text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    senderId: userId,
                    receiverId: cleanPhoneNumber,
                    content: text,
                    timestamp: timestamp,
                    isSentByMe: true,
                    isRead: true,
                    messageType: 'text'
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
                text: text,
                timestamp: timestamp.toISOString(),
                whatsapp_response: responseData
            },
            'Text message sent successfully',
            200
        );

    } catch (error) {
        console.error('[WC API] Error in text message endpoint:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500,
            'INTERNAL_ERROR'
        );
    }
}
