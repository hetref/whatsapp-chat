import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';
import { uploadFileToS3, isWhatsAppSupportedFileType } from '@/lib/aws-s3';
import { incrementStorageUsed } from '@/lib/plan-limits';

export const runtime = 'nodejs';

interface MediaUploadResult {
    id: string;
    url: string;
}

/**
 * Upload media to WhatsApp and get media ID
 */
async function uploadMediaToWhatsApp(
    file: File,
    accessToken: string,
    phoneNumberId: string,
    apiVersion: string
): Promise<MediaUploadResult> {
    try {
        console.log(`[WC API] Uploading to WhatsApp: ${file.name} (${file.type}, ${file.size} bytes)`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', file.type);
        formData.append('messaging_product', 'whatsapp');

        const uploadResponse = await fetch(
            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: formData,
            }
        );

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('[WC API] WhatsApp media upload failed:', {
                status: uploadResponse.status,
                error: errorText
            });
            throw new Error(`WhatsApp media upload failed: ${errorText}`);
        }

        const result = await uploadResponse.json();
        console.log('[WC API] Media uploaded to WhatsApp:', result.id);

        return {
            id: result.id,
            url: `https://graph.facebook.com/${apiVersion}/${result.id}`,
        };
    } catch (error) {
        console.error('[WC API] Error uploading media:', error);
        throw error;
    }
}

/**
 * Send WhatsApp media message after uploading
 */
async function sendMediaMessage(
    to: string,
    mediaId: string,
    mediaType: string,
    caption: string | null,
    filename: string | null,
    accessToken: string,
    phoneNumberId: string,
    apiVersion: string
): Promise<{ messages: Array<{ id: string }> }> {
    const messageData: {
        messaging_product: string;
        to: string;
        type: string;
        image?: { id: string; caption?: string };
        video?: { id: string; caption?: string };
        audio?: { id: string };
        document?: { id: string; caption?: string; filename?: string };
    } = {
        messaging_product: 'whatsapp',
        to: to,
        type: mediaType,
    };

    // Configure message based on media type
    switch (mediaType) {
        case 'image':
            messageData.image = {
                id: mediaId,
                ...(caption && { caption }),
            };
            break;
        case 'video':
            messageData.video = {
                id: mediaId,
                ...(caption && { caption }),
            };
            break;
        case 'audio':
            messageData.audio = {
                id: mediaId,
            };
            break;
        case 'document':
            messageData.document = {
                id: mediaId,
                ...(caption && { caption }),
                ...(filename && { filename }),
            };
            break;
    }

    const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageData),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[WC API] WhatsApp API error:', errorText);
        throw new Error(`WhatsApp API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

/**
 * Get WhatsApp media type from file MIME type
 */
function getWhatsAppMediaType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
}

/**
 * POST /api/wc/messages/media
 * Send media messages via WhatsApp Cloud API
 * 
 * Authentication: Required (API Key)
 * 
 * Request: multipart/form-data
 * - to: Recipient phone number (E.164 format)
 * - files: One or more media files
 * - captions: Optional captions for each file (array)
 * 
 * Supported Media Types:
 * - Images: JPG, PNG, WebP (max 5MB)
 * - Videos: MP4, 3GP (max 16MB)
 * - Audio: AAC, MP3, AMR, OGG (max 16MB)
 * - Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX (max 100MB)
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate the request
        const authResult = await authenticateApiRequest(request);

        if (!authResult.success) {
            return authResult.response;
        }

        const { userId, settings } = authResult.data;

        // Parse form data
        const formData = await request.formData();
        const to = formData.get('to') as string;
        const files = formData.getAll('files') as File[];
        const captions = formData.getAll('captions') as string[];

        // Validate required fields
        if (!to || typeof to !== 'string') {
            return createErrorResponse('Missing or invalid field: to (phone number required)', 400, 'INVALID_PARAMETERS');
        }

        if (!files || files.length === 0) {
            return createErrorResponse('Missing files. At least one media file is required', 400, 'NO_FILES');
        }

        // Validate file types
        const unsupportedFiles = files.filter(file => !isWhatsAppSupportedFileType(file.type));
        if (unsupportedFiles.length > 0) {
            return createErrorResponse(
                `Unsupported file types: ${unsupportedFiles.map(f => f.type).join(', ')}`,
                400,
                'UNSUPPORTED_FILE_TYPE'
            );
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

        const results = [];
        const timestamp = new Date();

        // Process each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const caption = captions[i] || '';

            console.log(`[WC API] Processing file ${i + 1}/${files.length}: ${file.name}`);

            try {
                // Upload media to WhatsApp
                const mediaUpload = await uploadMediaToWhatsApp(
                    file,
                    settings.accessToken,
                    settings.phoneNumberId,
                    settings.apiVersion
                );

                // Determine media type
                const mediaType = getWhatsAppMediaType(file.type);

                // Send media message
                const messageResponse = await sendMediaMessage(
                    cleanPhoneNumber,
                    mediaUpload.id,
                    mediaType,
                    caption || null,
                    file.name,
                    settings.accessToken,
                    settings.phoneNumberId,
                    settings.apiVersion
                );

                const messageId = messageResponse.messages?.[0]?.id;

                console.log(`[WC API] Media message sent successfully: ${messageId}`);

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

                // Upload to S3 for our records
                let s3Uploaded = false;
                let mediaIdForS3 = '';
                try {
                    mediaIdForS3 = `wc_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const s3UploadedBytes = await uploadFileToS3(file, userId, mediaIdForS3);
                    s3Uploaded = s3UploadedBytes > 0;
                    if (s3Uploaded) {
                        await incrementStorageUsed(userId, s3UploadedBytes);
                    }
                } catch (s3Error) {
                    console.error('[WC API] S3 upload failed (continuing anyway):', s3Error);
                }

                // Store in database - metadata only, no presigned URL
                try {
                    await prisma.message.create({
                        data: {
                            id: messageId || `wc_media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            userId: userId,
                            contactId: contact.id,
                            content: caption || `[${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}]`,
                            timestamp: timestamp,
                            isSentByMe: true,
                            isRead: true,
                            messageType: mediaType,
                            mediaData: JSON.stringify({
                                type: mediaType,
                                id: mediaIdForS3,
                                mime_type: file.type,
                                filename: file.name,
                                caption: caption,
                                s3_uploaded: s3Uploaded,
                                s3_owner_id: userId,
                                whatsapp_media_id: mediaUpload.id,
                                upload_timestamp: timestamp.toISOString()
                            })
                        }
                    });
                } catch (dbError) {
                    console.error('[WC API] Error storing message in database:', dbError);
                }

                results.push({
                    success: true,
                    filename: file.name,
                    message_id: messageId,
                    media_type: mediaType,
                    media_id: mediaUpload.id,
                    caption: caption || null,
                    s3_uploaded: s3Uploaded
                });

            } catch (error) {
                console.error(`[WC API] Error processing file ${file.name}:`, error);
                results.push({
                    success: false,
                    filename: file.name,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        return createSuccessResponse(
            {
                recipient: to,
                total_files: files.length,
                success_count: successCount,
                failure_count: failureCount,
                results: results,
                timestamp: timestamp.toISOString()
            },
            failureCount === 0
                ? 'All media messages sent successfully'
                : `${successCount} of ${files.length} media messages sent successfully`,
            200
        );

    } catch (error) {
        console.error('[WC API] Error in media message endpoint:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500,
            'INTERNAL_ERROR'
        );
    }
}
