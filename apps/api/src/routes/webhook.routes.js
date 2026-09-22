import { Router } from 'express';
import { prisma } from '@repo/db';
import { chatEventBus } from '../services/event-bus.service.js';

const router = Router();

const STATUS_RANK = {
    PENDING: 1,
    SENT: 2,
    DELIVERED: 3,
    READ: 4,
    FAILED: 5,
};

function normalizeStatus(status) {
    const s = String(status || '').toUpperCase();
    if (s === 'SENT' || s === 'DELIVERED' || s === 'READ' || s === 'FAILED' || s === 'PENDING') {
        return s;
    }
    return null;
}

function normalizeReactions(raw) {
    if (!raw) return [];
    let list = raw;
    if (typeof list === 'string') {
        try {
            list = JSON.parse(list);
        } catch {
            return [];
        }
    }
    if (Array.isArray(list)) {
        return list
            .map((entry) => ({
                emoji: String(entry?.emoji || ''),
                from: String(entry?.from || ''),
                timestamp: String(entry?.timestamp || ''),
            }))
            .filter((entry) => entry.emoji && entry.from);
    }
    return [];
}

/**
 * Common GET verification logic for Meta webhooks
 */
async function handleVerification(req, res, pathToken = null) {
    try {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        console.log('[API Webhook GET] Verification attempt:', {
            mode,
            pathToken: pathToken ? '***' : null,
            token: token ? '***' : null,
        });

        if (mode !== 'subscribe') {
            return res.status(403).send('Forbidden');
        }

        const effectiveToken = token || pathToken;
        if (!effectiveToken) {
            return res.status(403).send('Forbidden: No token provided');
        }

        const envVerifyToken =
            process.env.META_WEBHOOK_VERIFY_TOKEN ||
            process.env.WHATSAPP_VERIFY_TOKEN ||
            process.env.VERIFY_TOKEN ||
            process.env.WEBHOOK_VERIFY_TOKEN;
        const isEnvMatch = envVerifyToken && (token === envVerifyToken || pathToken === envVerifyToken);

        const settings = await prisma.userSettings.findFirst({
            where: {
                OR: [
                    { verifyToken: effectiveToken },
                    { webhookToken: effectiveToken },
                    ...(pathToken ? [{ webhookToken: pathToken }] : []),
                ],
            },
            select: { id: true, verifyToken: true, webhookToken: true },
        });

        if (!settings && !isEnvMatch) {
            console.warn('[API Webhook GET] Verification failed: token mismatch');
            return res.status(403).send('Forbidden');
        }

        if (settings) {
            await prisma.userSettings.update({
                where: { id: settings.id },
                data: { webhookVerified: true, updatedAt: new Date() },
            });
            console.log(`[API Webhook GET] Verified and updated userSettings for ${settings.id}`);
        }

        return res.status(200).send(challenge);
    } catch (error) {
        console.error('[API Webhook GET] Error:', error);
        return res.status(500).send('Internal Server Error');
    }
}

/**
 * Handle incoming statuses (sent, delivered, read, failed)
 */
async function processStatusUpdate(statusItem, metadata = null) {
    const messageId = statusItem?.id;
    const rawStatus = statusItem?.status;
    const timestampSec = statusItem?.timestamp ? Number.parseInt(statusItem.timestamp, 10) : null;
    const statusDate = timestampSec ? new Date(timestampSec * 1000) : new Date();
    const recipientId = statusItem?.recipient_id;

    if (!messageId || !rawStatus) {
        return;
    }

    const targetStatus = normalizeStatus(rawStatus);
    if (!targetStatus) {
        console.log(`[API Webhook] Unknown status received: ${rawStatus}`);
        return;
    }

    // Look up existing message
    const existingMessage = await prisma.message.findUnique({
        where: { id: messageId },
        select: {
            id: true,
            userId: true,
            contactId: true,
            status: true,
            isRead: true,
            readAt: true,
            deliveredAt: true,
            errorMessage: true,
        },
    });

    if (!existingMessage) {
        console.log(`[API Webhook Status] Message ${messageId} not found in database yet (may be pending create). Status: ${targetStatus}`);
        return;
    }

    const currentRank = STATUS_RANK[existingMessage.status] || 0;
    const newRank = STATUS_RANK[targetStatus] || 0;

    // Do not downgrade status (e.g. READ should not downgrade to DELIVERED or SENT)
    if (newRank < currentRank && currentRank !== STATUS_RANK.FAILED) {
        console.log(`[API Webhook Status] Ignoring status downgrade for ${messageId}: current ${existingMessage.status} (rank ${currentRank}) vs new ${targetStatus} (rank ${newRank})`);
        return;
    }

    const updateData = {};
    let errorDetails = null;

    if (targetStatus === 'FAILED') {
        updateData.status = 'FAILED';
        if (Array.isArray(statusItem.errors) && statusItem.errors.length > 0) {
            const err = statusItem.errors[0];
            errorDetails = err.error_data?.details || err.message || err.title || `Error code ${err.code}`;
            updateData.errorMessage = errorDetails;
        } else {
            updateData.errorMessage = 'Message delivery failed';
        }
    } else if (targetStatus === 'READ') {
        updateData.status = 'READ';
        updateData.isRead = true;
        updateData.readAt = statusDate;
        if (!existingMessage.deliveredAt) {
            updateData.deliveredAt = statusDate;
        }
    } else if (targetStatus === 'DELIVERED') {
        updateData.status = 'DELIVERED';
        updateData.deliveredAt = statusDate;
    } else if (targetStatus === 'SENT') {
        updateData.status = 'SENT';
    }

    try {
        const updated = await prisma.message.update({
            where: { id: messageId },
            data: updateData,
            select: {
                id: true,
                userId: true,
                contactId: true,
                status: true,
                isRead: true,
                readAt: true,
                deliveredAt: true,
                errorMessage: true,
            },
        });

        console.log(`[API Webhook Status] Updated message ${messageId} -> ${targetStatus} for user ${updated.userId}`);

        // Broadcast real-time status update to SSE clients
        chatEventBus.publishStatusUpdate({
            userId: updated.userId,
            contactId: updated.contactId,
            messageId: updated.id,
            status: targetStatus,
            deliveredAt: updated.deliveredAt?.toISOString() || null,
            readAt: updated.readAt?.toISOString() || null,
            errorMessage: updated.errorMessage || null,
            recipientId: recipientId || null,
            timestamp: statusDate.toISOString(),
        });
    } catch (err) {
        console.error(`[API Webhook Status] Error updating message status ${messageId}:`, err);
    }
}

/**
 * Common POST processor for incoming WhatsApp webhooks
 */
async function handleWebhookPost(req, res, pathToken = null) {
    try {
        const body = req.body;
        console.log('[API Webhook POST] Received payload:', JSON.stringify(body, null, 2));

        const entries = Array.isArray(body?.entry) ? body.entry : [];
        if (entries.length === 0) {
            return res.status(200).send('OK');
        }

        for (const entry of entries) {
            const wabaId = entry?.id ? String(entry.id) : null;
            const changes = Array.isArray(entry?.changes) ? entry.changes : [];

            for (const change of changes) {
                const value = change?.value;
                if (!value) continue;

                const rawPhoneId = value.metadata?.phone_number_id;
                const phoneNumberIdStr = rawPhoneId ? String(rawPhoneId) : null;
                const displayPhoneNumber = value.metadata?.display_phone_number
                    ? String(value.metadata.display_phone_number).replace(/\D/g, '')
                    : null;

                // 1. Process Status Updates (delivery and read receipts)
                const statuses = Array.isArray(value.statuses) ? value.statuses : [];
                if (statuses.length > 0) {
                    console.log(`[API Webhook POST] Processing ${statuses.length} status updates...`);
                    for (const statusItem of statuses) {
                        await processStatusUpdate(statusItem, value.metadata);
                    }
                }

                // 2. Process Incoming Messages
                const messages = Array.isArray(value.messages) ? value.messages : [];
                if (messages.length === 0) {
                    continue;
                }

                // Resolve business owner for inbound messages
                let userSettings = null;
                if (pathToken) {
                    userSettings = await prisma.userSettings.findFirst({
                        where: { webhookToken: pathToken },
                        select: { id: true, accessToken: true, apiVersion: true, phoneNumberId: true, businessAccountId: true },
                    });
                }

                if (!userSettings && phoneNumberIdStr) {
                    userSettings = await prisma.userSettings.findFirst({
                        where: { phoneNumberId: phoneNumberIdStr },
                        select: { id: true, accessToken: true, apiVersion: true, phoneNumberId: true, businessAccountId: true },
                    });
                }

                if (!userSettings && wabaId) {
                    userSettings = await prisma.userSettings.findFirst({
                        where: { businessAccountId: wabaId },
                        select: { id: true, accessToken: true, apiVersion: true, phoneNumberId: true, businessAccountId: true },
                    });
                }

                if (!userSettings && displayPhoneNumber) {
                    userSettings = await prisma.userSettings.findFirst({
                        where: { phoneNumber: { contains: displayPhoneNumber } },
                        select: { id: true, accessToken: true, apiVersion: true, phoneNumberId: true, businessAccountId: true },
                    });
                }

                if (!userSettings) {
                    console.warn('[API Webhook POST] No userSettings matched for incoming messages:', {
                        phoneNumberId: phoneNumberIdStr,
                        wabaId,
                        pathToken: pathToken ? '***' : null,
                    });
                    continue;
                }

                const businessOwnerId = userSettings.id;
                const contacts = Array.isArray(value.contacts) ? value.contacts : [];

                for (const message of messages) {
                    const rawSender = message.from;
                    const cleanPhone = String(rawSender).replace(/\s+/g, '').replace(/[^\d]/g, '');
                    const messageTimestamp = new Date(parseInt(message.timestamp, 10) * 1000);

                    const contactInfo = contacts.find((c) => c.wa_id === rawSender || c.wa_id?.replace(/\D/g, '') === cleanPhone);
                    const contactName = contactInfo?.profile?.name || rawSender;

                    let existingContact = await prisma.contact.findFirst({
                        where: {
                            userId: businessOwnerId,
                            OR: [
                                { phoneNumber: cleanPhone },
                                { phoneNumber: `+${cleanPhone}` },
                                { phoneNumber: rawSender },
                            ],
                        },
                    });

                    if (!existingContact) {
                        try {
                            existingContact = await prisma.contact.create({
                                data: {
                                    userId: businessOwnerId,
                                    phoneNumber: cleanPhone,
                                    whatsappName: contactName !== rawSender && contactName !== cleanPhone ? contactName : null,
                                    lastActive: messageTimestamp,
                                },
                            });
                        } catch {
                            existingContact = await prisma.contact.findFirst({
                                where: {
                                    userId: businessOwnerId,
                                    OR: [{ phoneNumber: cleanPhone }, { phoneNumber: rawSender }],
                                },
                            });
                        }
                    }

                    if (!existingContact) continue;

                    // Update contact lastActive timestamp
                    prisma.contact.update({
                        where: { id: existingContact.id },
                        data: { lastActive: messageTimestamp },
                    }).catch(() => {});

                    // Process WhatsApp reaction events
                    if (message.type === 'reaction') {
                        const reactionTargetId = message.reaction?.message_id;
                        const emoji = message.reaction?.emoji || '';

                        console.log(`[API Webhook POST] Incoming reaction for target message ${reactionTargetId} from ${cleanPhone}: "${emoji}"`);

                        if (!reactionTargetId) {
                            console.warn('[API Webhook POST] Reaction missing target message_id', message.id);
                            continue;
                        }

                        try {
                            // Purge any dummy message previously created with this reaction message ID
                            await prisma.message.deleteMany({
                                where: {
                                    id: message.id,
                                    OR: [
                                        { content: '[reaction]' },
                                        { messageType: 'reaction' },
                                    ],
                                },
                            }).catch(() => {});

                            // Find target message (by primary ID or falling back to businessOwnerId)
                            let targetMessage = await prisma.message.findUnique({
                                where: { id: reactionTargetId },
                                select: { id: true, userId: true, contactId: true, reactions: true },
                            });

                            if (!targetMessage) {
                                targetMessage = await prisma.message.findFirst({
                                    where: {
                                        id: reactionTargetId,
                                        userId: businessOwnerId,
                                    },
                                    select: { id: true, userId: true, contactId: true, reactions: true },
                                });
                            }

                            if (!targetMessage) {
                                console.warn(`[API Webhook POST] Target message not found in DB: ${reactionTargetId}`);
                                continue;
                            }

                            const currentReactions = normalizeReactions(targetMessage.reactions);
                            const cleanSenderPhone = cleanPhone.replace(/\D/g, '');

                            // Remove existing reaction by this sender
                            const filtered = currentReactions.filter((r) => {
                                const rFromClean = String(r.from || '').replace(/\D/g, '');
                                if (cleanSenderPhone && rFromClean === cleanSenderPhone) return false;
                                if (r.from === cleanPhone || r.from === rawSender) return false;
                                return true;
                            });

                            // If emoji is provided, append the new reaction (empty emoji indicates reaction removal)
                            if (emoji) {
                                filtered.push({
                                    emoji,
                                    from: cleanPhone,
                                    timestamp: messageTimestamp.toISOString(),
                                });
                            }

                            await prisma.message.update({
                                where: { id: targetMessage.id },
                                data: { reactions: filtered },
                            });

                            console.log(`[API Webhook POST] Updated reactions for message ${targetMessage.id}:`, filtered);

                            // Broadcast real-time reaction update to SSE clients
                            chatEventBus.publishReactionUpdate({
                                userId: targetMessage.userId || businessOwnerId,
                                contactId: targetMessage.contactId || existingContact.id,
                                messageId: targetMessage.id,
                                reactions: filtered,
                                timestamp: messageTimestamp.toISOString(),
                            });
                        } catch (reactionErr) {
                            console.error('[API Webhook POST] Error updating message reaction:', reactionErr);
                        }

                        // MUST continue so reaction message does NOT get created as a chat bubble!
                        continue;
                    }

                    let content = '';
                    let messageType = message.type || 'text';
                    let mediaData = null;

                    switch (message.type) {
                        case 'text':
                            content = message.text?.body || '';
                            break;
                        case 'image':
                            content = message.image?.caption || '[Image]';
                            mediaData = { type: 'image', id: message.image?.id, mime_type: message.image?.mime_type, caption: message.image?.caption };
                            break;
                        case 'video':
                            content = message.video?.caption || '[Video]';
                            mediaData = { type: 'video', id: message.video?.id, mime_type: message.video?.mime_type, caption: message.video?.caption };
                            break;
                        case 'audio':
                            content = message.audio?.voice ? '[Voice Message]' : '[Audio]';
                            mediaData = { type: 'audio', id: message.audio?.id, mime_type: message.audio?.mime_type, voice: message.audio?.voice };
                            break;
                        case 'document':
                            content = `[Document: ${message.document?.filename || 'File'}]`;
                            mediaData = { type: 'document', id: message.document?.id, filename: message.document?.filename, mime_type: message.document?.mime_type };
                            break;
                        case 'button':
                            content = message.button?.text || message.button?.payload || '[Button Reply]';
                            messageType = 'text';
                            break;
                        case 'interactive':
                            if (message.interactive?.button_reply?.title) {
                                content = message.interactive.button_reply.title;
                            } else if (message.interactive?.list_reply?.title) {
                                content = message.interactive.list_reply.title;
                            } else {
                                content = '[Interactive Response]';
                            }
                            messageType = 'text';
                            break;
                        default:
                            content = `[${message.type || 'Message'}]`;
                    }

                    try {
                        const savedMessage = await prisma.message.upsert({
                            where: { id: message.id },
                            update: {
                                content,
                                isRead: false,
                                mediaData: mediaData ? JSON.stringify(mediaData) : undefined,
                            },
                            create: {
                                id: message.id,
                                userId: businessOwnerId,
                                contactId: existingContact.id,
                                content,
                                timestamp: messageTimestamp,
                                isSentByMe: false,
                                isRead: false,
                                messageType,
                                status: 'DELIVERED',
                                deliveredAt: messageTimestamp,
                                mediaData: mediaData ? JSON.stringify(mediaData) : undefined,
                            },
                        });

                        console.log(`[API Webhook POST] Stored incoming message ${savedMessage.id} from ${cleanPhone}`);

                        // Publish new message event
                        chatEventBus.publishNewMessage({
                            userId: businessOwnerId,
                            contactId: existingContact.id,
                            message: {
                                id: savedMessage.id,
                                sender_id: cleanPhone,
                                receiver_id: businessOwnerId,
                                content: savedMessage.content,
                                timestamp: savedMessage.timestamp.toISOString(),
                                is_sent_by_me: false,
                                is_read: false,
                                message_type: savedMessage.messageType,
                                media_data: savedMessage.mediaData,
                                reactions: savedMessage.reactions,
                                status: 'delivered',
                            },
                        });
                    } catch (err) {
                        console.error('[API Webhook POST] Error upserting message:', err);
                    }
                }
            }
        }

        return res.status(200).send('OK');
    } catch (error) {
        console.error('[API Webhook POST] Error processing webhook:', error);
        return res.status(500).send('Internal Server Error');
    }
}

// Verification Handshake
router.get('/', (req, res) => handleVerification(req, res));
router.get('/:token', (req, res) => handleVerification(req, res, req.params.token));

// Incoming Event Processing
router.post('/', (req, res) => handleWebhookPost(req, res));
router.post('/:token', (req, res) => handleWebhookPost(req, res, req.params.token));

export default router;
