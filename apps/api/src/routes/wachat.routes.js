import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { prisma } from '@repo/db';
import {
    MAX_MEDIA_BATCH,
    MAX_MEDIA_FILE_SIZE_BYTES,
    buildS3KeyForMedia,
    checkS3ObjectExists,
    extractMediaIdFromS3Key,
    getFileExtensionFromMimeType,
    generatePresignedGetUrlByKey,
    generatePresignedUploadUrl,
    getMediaTypeFromMimeType,
    getUserMediaPrefix,
    isWhatsAppSupportedFileType,
} from '../services/aws-s3.service.js';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024, files: 10 },
});

function getUserId(req, res) {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body?.userId;
    if (!userId || typeof userId !== 'string') {
        res.status(401).json({ error: 'Unauthorized: missing x-user-id' });
        return null;
    }

    return userId;
}

function cleanPhoneNumber(input) {
    return String(input || '').replace(/\s+/g, '').replace(/[^\d]/g, '');
}

async function getUserSettings(userId) {
    return prisma.userSettings.findUnique({
        where: { id: userId },
        select: {
            accessToken: true,
            phoneNumberId: true,
            apiVersion: true,
            businessAccountId: true,
            accessTokenAdded: true,
        },
    });
}

function extractVariables(text) {
    const variableRegex = /\{\{(\d+)\}\}/g;
    const variables = [];
    let match;

    while ((match = variableRegex.exec(text)) !== null) {
        const varNum = Number.parseInt(match[1], 10);
        if (!variables.includes(varNum)) {
            variables.push(varNum);
        }
    }

    return variables.sort((a, b) => a - b);
}

function validateTemplateComponents(components) {
    if (!Array.isArray(components) || components.length === 0) {
        return 'Components array is required and cannot be empty';
    }

    let hasBody = false;
    let headerCount = 0;
    let footerCount = 0;
    let buttonsCount = 0;

    for (const component of components) {
        if (!component.type) {
            return 'Component type is required';
        }

        switch (component.type) {
            case 'HEADER': {
                headerCount += 1;
                if (headerCount > 1) return 'Only one HEADER component is allowed';
                if (!component.format) return 'HEADER component requires format field';
                if (component.format === 'TEXT') {
                    if (!component.text) return 'TEXT HEADER component requires text field';
                    const headerVariables = extractVariables(component.text);
                    if (headerVariables.length > 0) {
                        if (!component.example || !component.example.header_text) {
                            return `HEADER contains variables (${headerVariables.map((v) => `{{${v}}}`).join(', ')}) but no examples provided.`;
                        }
                        if (component.example.header_text.length !== headerVariables.length) {
                            return `HEADER has ${headerVariables.length} variable(s) but ${component.example.header_text.length} example(s) provided.`;
                        }
                    }
                }
                break;
            }
            case 'BODY': {
                hasBody = true;
                if (!component.text) return 'BODY component requires text field';
                if (component.text.length > 1024) return 'BODY text must be 1024 characters or less';
                const bodyVariables = extractVariables(component.text);
                if (bodyVariables.length > 0) {
                    if (!component.example || !component.example.body_text || !component.example.body_text[0]) {
                        return `BODY contains variables (${bodyVariables.map((v) => `{{${v}}}`).join(', ')}) but no examples provided.`;
                    }
                    if (component.example.body_text[0].length !== bodyVariables.length) {
                        return `BODY has ${bodyVariables.length} variable(s) but ${component.example.body_text[0].length} example(s) provided.`;
                    }
                }
                break;
            }
            case 'FOOTER': {
                footerCount += 1;
                if (footerCount > 1) return 'Only one FOOTER component is allowed';
                if (!component.text) return 'FOOTER component requires text field';
                if (component.text.length > 60) return 'FOOTER text must be 60 characters or less';
                if (extractVariables(component.text).length > 0) return 'FOOTER does not support variables';
                break;
            }
            case 'BUTTONS': {
                buttonsCount += 1;
                if (buttonsCount > 1) return 'Only one BUTTONS component is allowed';
                if (!component.buttons || !Array.isArray(component.buttons) || component.buttons.length === 0) {
                    return 'BUTTONS component requires buttons array';
                }
                if (component.buttons.length > 10) return 'Maximum 10 buttons are allowed';
                for (const button of component.buttons) {
                    if (!button.type || !button.text) return 'Button type and text are required';
                    if (button.text.length > 25) return 'Button text must be 25 characters or less';
                    if (button.type === 'URL' && !button.url) return 'URL button requires url field';
                    if (button.type === 'PHONE_NUMBER' && !button.phone_number) return 'PHONE_NUMBER button requires phone_number field';
                }
                break;
            }
            default:
                return `Invalid component type: ${component.type}`;
        }
    }

    if (!hasBody) return 'BODY component is required';
    return null;
}

function mapStatusColor(status) {
    switch (String(status || '').toUpperCase()) {
        case 'APPROVED': return 'text-green-600 bg-green-50';
        case 'PENDING': return 'text-yellow-600 bg-yellow-50';
        case 'REJECTED': return 'text-red-600 bg-red-50';
        case 'PAUSED': return 'text-orange-600 bg-orange-50';
        default: return 'text-gray-600 bg-gray-50';
    }
}

function mapCategoryIcon(category) {
    switch (String(category || '').toUpperCase()) {
        case 'MARKETING': return '📢';
        case 'UTILITY': return '🔧';
        case 'AUTHENTICATION': return '🔐';
        default: return '📄';
    }
}

function formatComponents(components) {
    const formatted = { header: null, body: null, footer: null, buttons: [] };
    if (!Array.isArray(components)) return formatted;

    for (const component of components) {
        switch (String(component.type || '').toUpperCase()) {
            case 'HEADER': formatted.header = component; break;
            case 'BODY': formatted.body = component; break;
            case 'FOOTER': formatted.footer = component; break;
            case 'BUTTONS': formatted.buttons = component.buttons || []; break;
            default: break;
        }
    }

    return formatted;
}

function normalizeReactions(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw
            .map((entry) => ({
                emoji: String(entry?.emoji || ''),
                from: String(entry?.from || ''),
                timestamp: String(entry?.timestamp || ''),
            }))
            .filter((entry) => entry.emoji || entry.from || entry.timestamp);
    }
    return [];
}

function upsertReactionList({ reactions, emoji, from, timestamp }) {
    const current = normalizeReactions(reactions);
    const filtered = current.filter((reaction) => reaction.from !== from);

    if (emoji) {
        filtered.push({ emoji, from, timestamp });
    }

    return filtered;
}

async function sendTextMessage({ to, message, accessToken, phoneNumberId, apiVersion }) {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: message },
        }),
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
}

async function sendReactionMessage({ to, messageId, emoji, accessToken, phoneNumberId, apiVersion }) {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'reaction',
            reaction: {
                message_id: messageId,
                emoji: emoji || '',
            },
        }),
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
}

async function sendTemplateMessage({ to, templateName, language, templateData, variables, accessToken, phoneNumberId, apiVersion, mediaUrl, mediaId }) {
    const headerComponent = templateData.components.find((c) => c.type === 'HEADER');
    const hasMediaHeader = headerComponent?.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComponent.format);

    const templateComponents = [];
    if (hasMediaHeader && (mediaUrl || mediaId) && headerComponent?.format) {
        const mediaType = headerComponent.format.toLowerCase();
        const mediaParameter = { type: mediaType };
        mediaParameter[mediaType] = mediaId ? { id: mediaId } : { link: mediaUrl };
        templateComponents.push({ type: 'header', parameters: [mediaParameter] });
    } else if (variables?.header && Object.keys(variables.header).length > 0) {
        const headerParams = Object.keys(variables.header)
            .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
            .map((key) => ({ type: 'text', text: variables.header[key] }));
        templateComponents.push({ type: 'header', parameters: headerParams });
    }

    if (variables?.body && Object.keys(variables.body).length > 0) {
        const bodyParams = Object.keys(variables.body)
            .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
            .map((key) => ({ type: 'text', text: variables.body[key] }));
        templateComponents.push({ type: 'body', parameters: bodyParams });
    }

    if (variables?.footer && Object.keys(variables.footer).length > 0) {
        const footerParams = Object.keys(variables.footer)
            .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
            .map((key) => ({ type: 'text', text: variables.footer[key] }));
        templateComponents.push({ type: 'footer', parameters: footerParams });
    }

    const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
            name: templateName,
            language: { code: language },
            ...(templateComponents.length > 0 && { components: templateComponents }),
        },
    };

    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
}

async function sendMediaMessage({ to, media, mediaType, caption, accessToken, phoneNumberId, apiVersion, filename }) {
    const mediaPayload = 'id' in media
        ? { ...media, ...(caption && { caption }), ...(mediaType === 'document' && filename && { filename }) }
        : { ...media, ...(caption && { caption }), ...(mediaType === 'document' && filename && { filename }) };

    const payload = {
        messaging_product: 'whatsapp',
        to,
        type: mediaType,
        [mediaType]: mediaType === 'audio'
            ? ('id' in media ? { id: media.id } : { link: media.link })
            : mediaPayload,
    };

    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
}

async function getOrCreateContact(userId, to, contactName = null) {
    const phoneNumber = cleanPhoneNumber(to);
    if (!/^\d{10,15}$/.test(phoneNumber)) {
        throw new Error('Invalid phone number format');
    }

    let contact = await prisma.contact.findUnique({
        where: {
            contacts_user_id_phone_number_key: {
                userId,
                phoneNumber,
            },
        },
    });

    if (!contact) {
        contact = await prisma.contact.create({
            data: {
                userId,
                phoneNumber,
                customName: contactName,
                lastActive: new Date(),
            },
        });
    }

    return contact;
}

router.get('/conversations', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const rows = await prisma.$queryRaw`
      WITH latest_messages AS (
        SELECT DISTINCT ON (m.contact_id)
          m.contact_id,
          m.content,
          m.message_type,
          m.timestamp AS last_message_time,
          m.is_sent_by_me
        FROM messages m
        WHERE m.user_id = ${userId}
        ORDER BY m.contact_id, m.timestamp DESC
      ),
      unread_counts AS (
        SELECT m.contact_id, COUNT(*) AS unread_count
        FROM messages m
        WHERE m.user_id = ${userId} AND m.is_read = false AND m.is_sent_by_me = false
        GROUP BY m.contact_id
      )
      SELECT
        c.id,
        c.phone_number,
        c.custom_name,
        c.whatsapp_name,
        c.last_active,
        COALESCE(uc.unread_count, 0) AS unread_count,
        lm.last_message_time,
        lm.content AS last_message,
        lm.message_type AS last_message_type,
        lm.is_sent_by_me AS is_last_message_from_me
      FROM contacts c
      LEFT JOIN latest_messages lm ON lm.contact_id = c.id
      LEFT JOIN unread_counts uc ON uc.contact_id = c.id
      WHERE c.user_id = ${userId}
      ORDER BY CASE WHEN lm.last_message_time IS NOT NULL THEN lm.last_message_time ELSE c.created_at END DESC
    `;

        const conversations = rows.map((row) => ({
            id: row.id,
            phone_number: row.phone_number,
            name: row.custom_name || row.whatsapp_name || row.phone_number,
            custom_name: row.custom_name,
            whatsapp_name: row.whatsapp_name,
            last_active: row.last_active,
            unread_count: Number(row.unread_count),
            last_message_time: row.last_message_time,
            last_message: row.last_message,
            last_message_type: row.last_message_type,
            last_message_sender: row.is_last_message_from_me ? userId : row.phone_number,
        }));

        res.json({ conversations });
    } catch (error) {
        next(error);
    }
});

router.get('/messages', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const contactId = String(req.query.conversationId || '');
        const limit = Number.parseInt(String(req.query.limit || '50'), 10);
        const offset = Number.parseInt(String(req.query.offset || '0'), 10);

        if (!contactId) {
            res.status(400).json({ error: 'conversationId is required' });
            return;
        }

        const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
        if (!contact) {
            res.status(404).json({ error: 'Contact not found or access denied' });
            return;
        }

        const messages = await prisma.message.findMany({
            where: { userId, contactId },
            orderBy: { timestamp: 'desc' },
            take: limit,
            skip: offset,
            select: {
                id: true,
                userId: true,
                contactId: true,
                content: true,
                timestamp: true,
                isSentByMe: true,
                isRead: true,
                messageType: true,
                mediaData: true,
                reactions: true,
                readAt: true,
            },
        });

        const formatted = messages.map((msg) => ({
            id: msg.id,
            sender_id: msg.isSentByMe ? userId : contact.phoneNumber,
            receiver_id: msg.isSentByMe ? contact.phoneNumber : userId,
            content: msg.content,
            timestamp: msg.timestamp.toISOString(),
            is_sent_by_me: msg.isSentByMe,
            is_read: msg.isRead,
            message_type: msg.messageType,
            media_data: msg.mediaData,
            reactions: msg.reactions,
            read_at: msg.readAt?.toISOString() || null,
        })).reverse();

        res.json({ messages: formatted });
    } catch (error) {
        next(error);
    }
});

router.post('/messages/react', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const messageId = String(req.body?.messageId || '').trim();
        const emoji = String(req.body?.emoji || '').trim();

        if (!messageId) {
            res.status(400).json({ error: 'messageId is required' });
            return;
        }

        const message = await prisma.message.findUnique({
            where: { id: messageId },
            select: { id: true, userId: true, contactId: true, reactions: true, mediaData: true },
        });

        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }

        if (message.userId !== userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        if (message.mediaData) {
            try {
                const parsed = typeof message.mediaData === 'string' ? JSON.parse(message.mediaData) : message.mediaData;
                if (parsed?.broadcast_group_id) {
                    res.status(400).json({ error: 'Reactions are not supported for broadcast messages' });
                    return;
                }
            } catch {
                // ignore
            }
        }

        const contact = await prisma.contact.findFirst({ where: { id: message.contactId, userId } });
        if (!contact) {
            res.status(404).json({ error: 'Contact not found for message' });
            return;
        }

        const settings = await getUserSettings(userId);
        if (!settings?.accessToken || !settings.phoneNumberId) {
            res.status(400).json({ error: 'WhatsApp credentials not configured. Please complete setup.' });
            return;
        }

        const apiVersion = settings.apiVersion || 'v23.0';
        await sendReactionMessage({
            to: cleanPhoneNumber(contact.phoneNumber),
            messageId,
            emoji,
            accessToken: settings.accessToken,
            phoneNumberId: settings.phoneNumberId,
            apiVersion,
        });

        const updatedReactions = upsertReactionList({
            reactions: message.reactions,
            emoji,
            from: userId,
            timestamp: new Date().toISOString(),
        });

        await prisma.message.update({
            where: { id: messageId },
            data: { reactions: updatedReactions },
        });

        res.json({
            success: true,
            messageId,
            reactions: updatedReactions,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/messages/mark-read', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const { otherUserId } = req.body || {};
        if (!otherUserId) {
            res.status(400).json({ error: 'Missing otherUserId parameter' });
            return;
        }

        const updateResult = await prisma.message.updateMany({
            where: {
                userId,
                contactId: otherUserId,
                isSentByMe: false,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        res.json({ success: true, markedCount: updateResult.count, timestamp: new Date().toISOString() });
    } catch (error) {
        next(error);
    }
});

router.get('/messages/mark-read', (_req, res) => {
    res.json({ status: 'Mark Messages as Read API', timestamp: new Date().toISOString() });
});

router.get('/groups', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const groups = await prisma.chatGroup.findMany({
            where: { ownerId: userId },
            include: {
                _count: { select: { members: true } },
                members: {
                    include: {
                        contact: {
                            select: {
                                id: true,
                                phoneNumber: true,
                                customName: true,
                                whatsappName: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const formatted = groups.map((group) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            created_at: group.createdAt,
            updated_at: group.updatedAt,
            owner_id: group.ownerId,
            member_count: group._count.members,
            members: group.members.map((member) => ({
                id: member.id,
                contact_id: member.contactId,
                added_at: member.addedAt,
                contact: member.contact,
            })),
        }));

        res.json({ success: true, groups: formatted });
    } catch (error) {
        next(error);
    }
});

router.post('/groups', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const { name, description, memberIds } = req.body || {};
        if (!name || !String(name).trim()) {
            res.status(400).json({ error: 'Group name is required' });
            return;
        }

        const group = await prisma.$transaction(async (tx) => {
            const created = await tx.chatGroup.create({
                data: {
                    ownerId: userId,
                    name: String(name).trim(),
                    description: description ? String(description).trim() : null,
                },
            });

            if (Array.isArray(memberIds) && memberIds.length > 0) {
                await tx.groupMember.createMany({
                    data: memberIds.map((contactId) => ({ groupId: created.id, contactId })),
                    skipDuplicates: true,
                });
            }

            return created;
        });

        res.json({ success: true, message: 'Group created successfully', group });
    } catch (error) {
        next(error);
    }
});

router.put('/groups/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;
        const groupId = req.params.id;
        const { name, description } = req.body || {};

        if (!name || !String(name).trim()) {
            res.status(400).json({ error: 'Group name is required' });
            return;
        }

        const existing = await prisma.chatGroup.findFirst({ where: { id: groupId, ownerId: userId } });
        if (!existing) {
            res.status(404).json({ error: 'Group not found or unauthorized' });
            return;
        }

        const group = await prisma.chatGroup.update({
            where: { id: groupId },
            data: {
                name: String(name).trim(),
                description: description ? String(description).trim() : null,
            },
        });

        res.json({ success: true, message: 'Group updated successfully', group });
    } catch (error) {
        next(error);
    }
});

router.delete('/groups/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;
        const groupId = req.params.id;

        const existing = await prisma.chatGroup.findFirst({ where: { id: groupId, ownerId: userId } });
        if (!existing) {
            res.status(404).json({ error: 'Group not found or unauthorized' });
            return;
        }

        await prisma.chatGroup.delete({ where: { id: groupId } });
        res.json({ success: true, message: 'Group deleted successfully' });
    } catch (error) {
        next(error);
    }
});

router.get('/groups/:id/members', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;
        const groupId = req.params.id;

        const group = await prisma.chatGroup.findFirst({ where: { id: groupId, ownerId: userId } });
        if (!group) {
            res.status(404).json({ error: 'Group not found or unauthorized' });
            return;
        }

        const members = await prisma.groupMember.findMany({
            where: { groupId },
            include: {
                contact: {
                    select: {
                        id: true,
                        phoneNumber: true,
                        customName: true,
                        whatsappName: true,
                        lastActive: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            members: members.map((member) => ({
                id: member.id,
                contact_id: member.contactId,
                added_at: member.addedAt.toISOString(),
                contact: {
                    id: member.contact.id,
                    phone_number: member.contact.phoneNumber,
                    custom_name: member.contact.customName,
                    whatsapp_name: member.contact.whatsappName,
                    last_active: member.contact.lastActive.toISOString(),
                },
            })),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/groups/:id/members', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;
        const groupId = req.params.id;
        const { contactIds } = req.body || {};

        if (!Array.isArray(contactIds) || contactIds.length === 0) {
            res.status(400).json({ error: 'Contact IDs array is required' });
            return;
        }

        const group = await prisma.chatGroup.findFirst({ where: { id: groupId, ownerId: userId } });
        if (!group) {
            res.status(404).json({ error: 'Group not found or unauthorized' });
            return;
        }

        const result = await prisma.groupMember.createMany({
            data: contactIds.map((contactId) => ({ groupId, contactId })),
            skipDuplicates: true,
        });

        res.json({ success: true, message: `${result.count} member(s) added successfully`, added: result.count });
    } catch (error) {
        next(error);
    }
});

router.delete('/groups/:id/members', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;
        const groupId = req.params.id;
        const contactIdToRemove = String(req.query.contactId || '');

        if (!contactIdToRemove) {
            res.status(400).json({ error: 'Contact ID is required' });
            return;
        }

        const group = await prisma.chatGroup.findFirst({ where: { id: groupId, ownerId: userId } });
        if (!group) {
            res.status(404).json({ error: 'Group not found or unauthorized' });
            return;
        }

        const result = await prisma.groupMember.deleteMany({ where: { groupId, contactId: contactIdToRemove } });
        if (result.count === 0) {
            res.status(404).json({ error: 'Member not found in group' });
            return;
        }

        res.json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
        next(error);
    }
});

router.get('/groups/:id/messages', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;
        const groupId = req.params.id;

        const group = await prisma.chatGroup.findFirst({ where: { id: groupId, ownerId: userId } });
        if (!group) {
            res.status(404).json({ error: 'Group not found or unauthorized' });
            return;
        }

        const messages = await prisma.message.findMany({ where: { userId }, orderBy: { timestamp: 'asc' } });
        const broadcastMessages = messages.filter((msg) => {
            if (!msg.mediaData) return false;
            try {
                const mediaData = typeof msg.mediaData === 'string' ? JSON.parse(msg.mediaData) : msg.mediaData;
                return mediaData.broadcast_group_id === groupId;
            } catch {
                return false;
            }
        });

        const uniqueBroadcasts = new Map();
        for (const msg of broadcastMessages) {
            const key = msg.timestamp.toISOString();
            if (!uniqueBroadcasts.has(key) || msg.id < uniqueBroadcasts.get(key).id) {
                uniqueBroadcasts.set(key, msg);
            }
        }

        const formattedMessages = Array.from(uniqueBroadcasts.values()).map((msg) => ({
            id: msg.id,
            sender_id: msg.userId,
            receiver_id: msg.contactId,
            content: msg.content,
            timestamp: msg.timestamp.toISOString(),
            is_sent_by_me: true,
            message_type: msg.messageType,
            media_data: msg.mediaData,
            reactions: msg.reactions,
            is_read: true,
        }));

        res.json({ success: true, messages: formattedMessages, count: formattedMessages.length });
    } catch (error) {
        next(error);
    }
});

router.post('/groups/:id/broadcast', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;
        const groupId = req.params.id;
        const { message, templateName = null, templateData = null, variables = null } = req.body || {};

        if (!message && !templateName) {
            res.status(400).json({ error: 'Message or template name is required' });
            return;
        }

        const group = await prisma.chatGroup.findFirst({ where: { id: groupId, ownerId: userId } });
        if (!group) {
            res.status(404).json({ error: 'Group not found or unauthorized' });
            return;
        }

        const members = await prisma.groupMember.findMany({
            where: { groupId },
            include: { contact: { select: { id: true, phoneNumber: true } } },
        });

        if (members.length === 0) {
            res.status(400).json({ error: 'Group has no members' });
            return;
        }

        const settings = await getUserSettings(userId);
        if (!settings?.accessToken || !settings?.phoneNumberId) {
            res.status(400).json({ error: 'WhatsApp credentials not configured' });
            return;
        }

        const accessToken = settings.accessToken;
        const phoneNumberId = settings.phoneNumberId;
        const apiVersion = settings.apiVersion || 'v23.0';

        const results = { success: 0, failed: 0, errors: [] };

        for (const member of members) {
            try {
                const cleanPhone = cleanPhoneNumber(member.contact.phoneNumber);
                let messageResponse;
                let content = message;
                let mediaData = { broadcast_group_id: groupId };

                if (templateName && templateData) {
                    messageResponse = await sendTemplateMessage({
                        to: cleanPhone,
                        templateName,
                        language: templateData.language || 'en',
                        templateData,
                        variables: variables || { header: {}, body: {}, footer: {} },
                        accessToken,
                        phoneNumberId,
                        apiVersion,
                    });

                    const bodyComponent = templateData.components?.find((c) => c.type === 'BODY');
                    content = bodyComponent?.text || message || `Template: ${templateName}`;
                    mediaData = {
                        type: 'template',
                        template_name: templateName,
                        template_id: templateData.id,
                        language: templateData.language,
                        variables: variables || {},
                        original_content: bodyComponent?.text || templateName,
                        broadcast_group_id: groupId,
                    };
                } else {
                    messageResponse = await sendTextMessage({
                        to: cleanPhone,
                        message,
                        accessToken,
                        phoneNumberId,
                        apiVersion,
                    });
                }

                const messageId = messageResponse.messages?.[0]?.id || `broadcast_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

                await prisma.message.create({
                    data: {
                        id: messageId,
                        userId,
                        contactId: member.contact.id,
                        content,
                        timestamp: new Date(),
                        isSentByMe: true,
                        isRead: true,
                        messageType: templateName ? 'template' : 'text',
                        mediaData: JSON.stringify(mediaData),
                    },
                });

                results.success += 1;
            } catch (error) {
                results.failed += 1;
                results.errors.push(`${member.contact.phoneNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        res.json({
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
        next(error);
    }
});

router.get('/templates', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const settings = await getUserSettings(userId);
        if (!settings?.accessTokenAdded || !settings.accessToken || !settings.businessAccountId) {
            res.status(400).json({ error: 'WhatsApp credentials not configured. Please complete setup.' });
            return;
        }

        const status = String(req.query.status || '');
        const limit = String(req.query.limit || '50');
        const fields = String(req.query.fields || 'id,name,status,category,language,components,previous_category,rejected_reason,quality_score');

        const params = new URLSearchParams({ fields, limit });
        if (status) params.append('status', status);

        const apiVersion = settings.apiVersion || 'v23.0';
        const response = await fetch(`https://graph.facebook.com/${apiVersion}/${settings.businessAccountId}/message_templates?${params.toString()}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${settings.accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const templatesData = await response.json();
        if (!response.ok) {
            res.status(response.status).json({ error: 'Failed to fetch templates', details: templatesData });
            return;
        }

        const transformed = (templatesData.data || []).map((template) => ({
            ...template,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_color: mapStatusColor(template.status),
            category_icon: mapCategoryIcon(template.category),
            formatted_components: formatComponents(template.components),
        }));

        res.json({
            success: true,
            data: transformed,
            pagination: templatesData.paging || null,
            total_count: transformed.length,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/templates/create', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const settings = await getUserSettings(userId);
        if (!settings?.accessTokenAdded || !settings.accessToken || !settings.businessAccountId) {
            res.status(400).json({ error: 'WhatsApp credentials not configured. Please complete setup.' });
            return;
        }

        const templateData = req.body || {};
        if (!templateData.name || !templateData.category || !templateData.language || !templateData.components) {
            res.status(400).json({ error: 'Missing required fields', message: 'name, category, language, and components are required' });
            return;
        }

        if (templateData.name.length > 512) {
            res.status(400).json({ error: 'Invalid template name', message: 'Template name must be 512 characters or less' });
            return;
        }

        if (!['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(templateData.category)) {
            res.status(400).json({ error: 'Invalid category', message: 'Category must be MARKETING, UTILITY, or AUTHENTICATION' });
            return;
        }

        const validationError = validateTemplateComponents(templateData.components);
        if (validationError) {
            res.status(400).json({ error: 'Invalid components', message: validationError });
            return;
        }

        const apiVersion = settings.apiVersion || 'v23.0';
        const response = await fetch(`https://graph.facebook.com/${apiVersion}/${settings.businessAccountId}/message_templates`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${settings.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: templateData.name,
                category: templateData.category,
                language: templateData.language,
                components: templateData.components,
                ...(templateData.message_send_ttl_seconds && { message_send_ttl_seconds: templateData.message_send_ttl_seconds }),
            }),
        });

        const responseData = await response.json();
        if (!response.ok) {
            const userErrorMessage = responseData?.error?.error_user_msg || responseData?.error?.message || 'Failed to create template';
            const userErrorTitle = responseData?.error?.error_user_title || 'Template Creation Failed';
            res.status(response.status).json({ success: false, error: userErrorTitle, message: userErrorMessage, details: responseData });
            return;
        }

        res.json({
            success: true,
            data: {
                id: responseData.id,
                status: responseData.status,
                category: responseData.category,
                name: templateData.name,
                language: templateData.language,
                components: templateData.components,
            },
            message: 'Template created successfully',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

router.delete('/templates/delete', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const settings = await getUserSettings(userId);
        if (!settings?.accessTokenAdded || !settings.accessToken || !settings.businessAccountId) {
            res.status(400).json({ error: 'WhatsApp credentials not configured. Please complete setup.' });
            return;
        }

        const { templateId, templateName } = req.body || {};
        if (!templateId || !templateName) {
            res.status(400).json({ error: 'Missing required fields', message: 'templateId and templateName are required' });
            return;
        }

        const apiVersion = settings.apiVersion || 'v23.0';
        const params = new URLSearchParams({ name: templateName });
        const response = await fetch(`https://graph.facebook.com/${apiVersion}/${settings.businessAccountId}/message_templates?${params.toString()}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${settings.accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const responseData = await response.json();
        if (!response.ok) {
            const userErrorMessage = responseData?.error?.error_user_msg || responseData?.error?.message || 'Failed to delete template';
            const userErrorTitle = responseData?.error?.error_user_title || 'Template Deletion Failed';
            res.status(response.status).json({ success: false, error: userErrorTitle, message: userErrorMessage, details: responseData });
            return;
        }

        res.json({
            success: true,
            message: 'Template deleted successfully',
            templateId,
            templateName,
            data: responseData,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/send-message', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const { to, message } = req.body || {};
        if (!to || !message) {
            res.status(400).json({ error: 'Missing required parameters: to, message' });
            return;
        }

        const settings = await getUserSettings(userId);
        if (!settings?.accessToken || !settings.phoneNumberId) {
            res.status(400).json({ error: 'WhatsApp credentials not configured. Please complete setup.' });
            return;
        }

        const contact = await getOrCreateContact(userId, to);
        const apiVersion = settings.apiVersion || 'v23.0';
        const response = await sendTextMessage({
            to: cleanPhoneNumber(to),
            message,
            accessToken: settings.accessToken,
            phoneNumberId: settings.phoneNumberId,
            apiVersion,
        });

        const messageId = response.messages?.[0]?.id;
        if (!messageId) {
            throw new Error('No message ID returned from WhatsApp API');
        }

        const timestamp = new Date();
        await prisma.message.create({
            data: {
                id: messageId,
                userId,
                contactId: contact.id,
                content: message,
                timestamp,
                isSentByMe: true,
                isRead: true,
                messageType: 'text',
            },
        });

        res.json({ success: true, messageId, timestamp: timestamp.toISOString() });
    } catch (error) {
        next(error);
    }
});

router.get('/send-message', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const settings = await getUserSettings(userId);
        res.json({
            status: 'WhatsApp Send Message API',
            configured: Boolean(settings?.accessToken),
            version: settings?.apiVersion || 'v23.0',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/send-template', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const {
            to,
            contactName,
            templateName,
            templateData,
            variables = { header: {}, body: {}, footer: {} },
            mediaUrl,
            mediaId,
        } = req.body || {};

        if (!to || !templateName || !templateData) {
            res.status(400).json({ error: 'Missing required parameters: to, templateName, templateData' });
            return;
        }

        const settings = await getUserSettings(userId);
        if (!settings?.accessToken || !settings.phoneNumberId) {
            res.status(400).json({ error: 'WhatsApp Access Token not configured. Please complete setup.' });
            return;
        }

        const headerComponent = templateData.components.find((c) => c.type === 'HEADER');
        const hasMediaHeader = headerComponent?.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComponent.format);
        if (hasMediaHeader && !mediaUrl && !mediaId) {
            res.status(400).json({ error: `This template requires a ${headerComponent.format.toLowerCase()} in the header.` });
            return;
        }

        const contact = await getOrCreateContact(userId, to, contactName || null);
        const apiVersion = settings.apiVersion || 'v23.0';
        const response = await sendTemplateMessage({
            to: cleanPhoneNumber(to),
            templateName,
            language: templateData.language,
            templateData,
            variables,
            accessToken: settings.accessToken,
            phoneNumberId: settings.phoneNumberId,
            apiVersion,
            mediaUrl,
            mediaId,
        });

        const messageId = response.messages?.[0]?.id;
        if (!messageId) {
            throw new Error('No message ID returned from WhatsApp API');
        }

        let displayContent = templateName;
        const bodyComponent = templateData.components.find((c) => c.type === 'BODY');
        if (bodyComponent?.text) {
            displayContent = bodyComponent.text;
            for (const [key, value] of Object.entries(variables.body || {})) {
                displayContent = displayContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
            }
        }

        const timestamp = new Date();
        await prisma.message.create({
            data: {
                id: messageId,
                userId,
                contactId: contact.id,
                content: displayContent,
                timestamp,
                isSentByMe: true,
                isRead: true,
                messageType: 'template',
                mediaData: JSON.stringify({
                    type: 'template',
                    template_name: templateName,
                    template_id: templateData.id,
                    language: templateData.language,
                    variables,
                    original_content: bodyComponent?.text || templateName,
                }),
            },
        });

        res.json({
            success: true,
            messageId,
            templateName,
            displayContent,
            timestamp: timestamp.toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/send-template', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const settings = await getUserSettings(userId);
        res.json({
            status: 'WhatsApp Send Template API',
            configured: Boolean(settings?.accessToken),
            version: settings?.apiVersion || 'v23.0',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

function normalizeFilesFromBody(rawFiles) {
    if (!rawFiles) return [];
    if (Array.isArray(rawFiles)) return rawFiles;
    if (typeof rawFiles === 'string') {
        try {
            const parsed = JSON.parse(rawFiles);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
}

async function createPresignedUploadsForUser({ userId, files, expiresIn = 600 }) {
    const uploads = [];

    for (const file of files) {
        const fileName = String(file.fileName || '').trim();
        const mimeType = String(file.mimeType || '').trim().toLowerCase();
        const fileSize = Number(file.fileSize || 0);

        if (!fileName || !mimeType || !Number.isFinite(fileSize) || fileSize <= 0) {
            throw new Error('Each file must include fileName, mimeType, and fileSize.');
        }

        if (fileSize > MAX_MEDIA_FILE_SIZE_BYTES) {
            throw new Error(`${fileName} exceeds 25MB limit.`);
        }

        if (!isWhatsAppSupportedFileType(mimeType)) {
            throw new Error(`${fileName} has unsupported mime type: ${mimeType}`);
        }

        const mediaId = `media_${Date.now()}_${randomUUID().slice(0, 8)}`;
        const presigned = await generatePresignedUploadUrl({
            userId,
            mediaId,
            mimeType,
            fileSize,
            expiresIn,
        });

        const mediaRecord = await prisma.mediaFile.create({
            data: {
                userId,
                s3Key: presigned.s3Key,
                fileName,
                mimeType,
                fileSize,
                mediaType: getMediaTypeFromMimeType(mimeType),
            },
            select: { id: true, s3Key: true },
        });

        uploads.push({
            id: mediaRecord.id,
            mediaId,
            fileName,
            mimeType,
            fileSize,
            s3Key: mediaRecord.s3Key,
            uploadUrl: presigned.uploadUrl,
        });
    }

    return uploads;
}

router.post('/send-media/upload-url', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const files = normalizeFilesFromBody(req.body?.files);
        const requestedExpiry = Number(req.body?.expiresIn || 600);

        if (!files.length) {
            res.status(400).json({ error: 'No files provided' });
            return;
        }

        if (files.length > MAX_MEDIA_BATCH) {
            res.status(400).json({ error: `Maximum ${MAX_MEDIA_BATCH} files per request` });
            return;
        }

        const uploads = await createPresignedUploadsForUser({
            userId,
            files,
            expiresIn: requestedExpiry,
        });

        res.json({ success: true, uploads });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate upload URLs';
        if (message.includes('AWS S3 is not configured')) {
            res.status(503).json({ error: message });
            return;
        }
        if (message.includes('unsupported mime type') || message.includes('Max') || message.includes('required') || message.includes('25MB') || message.includes('Invalid file size')) {
            res.status(400).json({ error: message });
            return;
        }
        next(error);
    }
});

router.post('/send-media', upload.array('files', 10), async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        if (Array.isArray(req.files) && req.files.length > 0) {
            res.status(400).json({
                error: 'Direct multipart uploads are disabled.',
                message: 'Use /api/send-media/upload-url to upload to S3 first, then call /api/send-media with s3Key references.',
            });
            return;
        }

        const to = req.body?.to;
        const files = normalizeFilesFromBody(req.body?.files);

        if (!to || !files.length) {
            res.status(400).json({ error: 'Missing required parameters: to, files[]' });
            return;
        }

        const settings = await getUserSettings(userId);
        if (!settings?.accessToken || !settings.phoneNumberId) {
            res.status(400).json({ error: 'WhatsApp credentials not configured. Please complete setup.' });
            return;
        }

        const apiVersion = settings.apiVersion || 'v23.0';
        const cleanPhone = cleanPhoneNumber(to);
        const contact = await getOrCreateContact(userId, cleanPhone);
        const results = [];

        for (const file of files) {
            const s3Key = String(file.s3Key || '').trim();
            const mimeType = String(file.mimeType || '').toLowerCase().trim();
            const caption = String(file.caption || '').trim();
            const fileName = String(file.fileName || '').trim() || 'attachment';
            const mediaId = String(file.mediaId || extractMediaIdFromS3Key(s3Key));

            if (!s3Key || !mimeType || !mediaId) {
                results.push({
                    success: false,
                    s3Key,
                    error: 'Each file must include s3Key, mimeType, and mediaId',
                });
                continue;
            }

            if (!isWhatsAppSupportedFileType(mimeType)) {
                results.push({
                    success: false,
                    s3Key,
                    error: `Unsupported mime type: ${mimeType}`,
                });
                continue;
            }

            const ownedMedia = await prisma.mediaFile.findFirst({
                where: { userId, s3Key },
                select: { id: true, s3Key: true, mimeType: true, fileName: true },
            });

            if (!ownedMedia) {
                results.push({
                    success: false,
                    s3Key,
                    error: 'Media not found or not owned by user',
                });
                continue;
            }

            const exists = await checkS3ObjectExists(s3Key);
            if (!exists) {
                results.push({
                    success: false,
                    s3Key,
                    error: 'Uploaded object not found in S3',
                });
                continue;
            }

            const mediaType = getMediaTypeFromMimeType(mimeType);

            try {
                const mediaUrl = await generatePresignedGetUrlByKey(s3Key, 900);
                const messageResponse = await sendMediaMessage({
                    to: cleanPhone,
                    media: { link: mediaUrl },
                    mediaType,
                    caption,
                    accessToken: settings.accessToken,
                    phoneNumberId: settings.phoneNumberId,
                    apiVersion,
                    filename: fileName,
                });

                const messageId = messageResponse.messages?.[0]?.id || `outgoing_media_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
                const timestamp = new Date();

                await prisma.message.create({
                    data: {
                        id: messageId,
                        userId,
                        contactId: contact.id,
                        content: caption || `[${mediaType}]`,
                        timestamp,
                        isSentByMe: true,
                        isRead: true,
                        messageType: mediaType,
                        mediaData: JSON.stringify({
                            type: mediaType,
                            id: mediaId,
                            mime_type: mimeType,
                            filename: fileName,
                            caption,
                            s3_key: s3Key,
                            s3_uploaded: true,
                            s3_owner_id: getUserMediaPrefix(userId),
                            upload_timestamp: timestamp.toISOString(),
                        }),
                    },
                });

                results.push({ success: true, filename: fileName, messageId, mediaType, s3Key });
            } catch (error) {
                results.push({
                    success: false,
                    filename: fileName,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.length - successCount;

        res.json({
            success: failureCount === 0,
            totalFiles: results.length,
            successCount,
            failureCount,
            results,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/send-media', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const settings = await getUserSettings(userId);
        res.json({
            status: 'WhatsApp Send Media API',
            configured: Boolean(settings?.accessToken),
            version: settings?.apiVersion || 'v23.0',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/media', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const type = String(req.query.type || '');
        const cursor = String(req.query.cursor || '');
        const limit = Math.min(Number.parseInt(String(req.query.limit || '50'), 10), 100);

        const where = { userId };
        if (type && ['image', 'video', 'audio', 'document'].includes(type)) {
            where.mediaType = type;
        }

        const mediaFiles = await prisma.mediaFile.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            select: {
                id: true,
                s3Key: true,
                fileName: true,
                mimeType: true,
                fileSize: true,
                mediaType: true,
                createdAt: true,
            },
        });

        const hasMore = mediaFiles.length > limit;
        const items = hasMore ? mediaFiles.slice(0, limit) : mediaFiles;
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        res.json({ items, nextCursor });
    } catch (error) {
        next(error);
    }
});

router.post('/media', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const files = normalizeFilesFromBody(req.body?.files);
        const requestedExpiry = Number(req.body?.expiresIn || 600);

        if (!files.length) {
            res.status(400).json({ error: 'No files provided' });
            return;
        }

        if (files.length > MAX_MEDIA_BATCH) {
            res.status(400).json({ error: `Maximum ${MAX_MEDIA_BATCH} files per request` });
            return;
        }

        const uploads = await createPresignedUploadsForUser({
            userId,
            files,
            expiresIn: requestedExpiry,
        });

        res.json({ uploads });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate upload URLs';
        if (message.includes('AWS S3 is not configured')) {
            res.status(503).json({ error: message });
            return;
        }
        if (message.includes('unsupported mime type') || message.includes('Max') || message.includes('required') || message.includes('25MB') || message.includes('Invalid file size')) {
            res.status(400).json({ error: message });
            return;
        }
        next(error);
    }
});

router.post('/media/confirm-upload', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const ids = normalizeFilesFromBody(req.body?.ids) || req.body?.ids;
        const normalizedIds = Array.isArray(ids) ? ids.map((id) => String(id)).filter(Boolean) : [];

        if (!normalizedIds.length) {
            res.status(400).json({ error: 'No ids provided' });
            return;
        }

        const mediaFiles = await prisma.mediaFile.findMany({
            where: { userId, id: { in: normalizedIds } },
            select: { id: true, fileSize: true },
        });

        const totalBytes = mediaFiles.reduce((sum, media) => sum + media.fileSize, 0);
        if (totalBytes > 0) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    storageUsedBytes: {
                        increment: BigInt(totalBytes),
                    },
                },
            });
        }

        res.json({ confirmed: mediaFiles.length });
    } catch (error) {
        next(error);
    }
});

router.post('/media/presigned-urls', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const ids = normalizeFilesFromBody(req.body?.ids) || req.body?.ids;
        const normalizedIds = Array.isArray(ids) ? ids.map((id) => String(id)).filter(Boolean).slice(0, 50) : [];

        if (!normalizedIds.length) {
            res.json({ urls: {} });
            return;
        }

        const mediaFiles = await prisma.mediaFile.findMany({
            where: { userId, id: { in: normalizedIds } },
            select: { id: true, s3Key: true },
        });

        const urls = {};
        await Promise.all(
            mediaFiles.map(async (mediaFile) => {
                const url = await generatePresignedGetUrlByKey(mediaFile.s3Key, 3600);
                urls[mediaFile.id] = url;
            })
        );

        res.json({ urls });
    } catch (error) {
        next(error);
    }
});

router.get('/media/refresh-url', (_req, res) => {
    res.json({
        status: 'Media URL Generation API',
        timestamp: new Date().toISOString(),
    });
});

router.post('/media/refresh-url', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const messageId = String(req.body?.messageId || '');
        if (!messageId) {
            res.status(400).json({ error: 'Missing required parameter: messageId' });
            return;
        }

        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }

        if (message.userId !== userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        if (!message.mediaData) {
            res.status(400).json({ error: 'Message has no media data' });
            return;
        }

        const mediaData = typeof message.mediaData === 'string'
            ? JSON.parse(message.mediaData)
            : message.mediaData;

        const s3KeyCandidates = [];
        const directS3Key = mediaData?.s3_key ? String(mediaData.s3_key) : '';
        const mediaId = mediaData?.id ? String(mediaData.id) : '';
        const mimeType = mediaData?.mime_type ? String(mediaData.mime_type) : '';
        const s3OwnerIdRaw = mediaData?.s3_owner_id ? String(mediaData.s3_owner_id) : '';

        if (directS3Key) {
            s3KeyCandidates.push(directS3Key);
        }

        if (mediaId && mimeType) {
            const ext = getFileExtensionFromMimeType(mimeType);

            // Current normalized key format used by API uploads.
            s3KeyCandidates.push(buildS3KeyForMedia({ userId, mediaId, mimeType }));

            // Legacy inbound webhook format: <phone>/<mediaId>.<ext>
            if (s3OwnerIdRaw) {
                const ownerClean = cleanPhoneNumber(s3OwnerIdRaw);
                if (ownerClean) {
                    s3KeyCandidates.push(`${ownerClean}/${mediaId}.${ext}`);
                }

                // Historical user-prefixed variants.
                const ownerWithoutPrefix = s3OwnerIdRaw.replace(/^user_/, '');
                s3KeyCandidates.push(buildS3KeyForMedia({ userId: ownerWithoutPrefix, mediaId, mimeType }));
            }
        }

        const uniqueCandidates = [...new Set(s3KeyCandidates.filter(Boolean))];
        if (uniqueCandidates.length === 0) {
            res.status(400).json({ error: 'Media data incomplete - missing s3 key and media identifiers' });
            return;
        }

        let resolvedS3Key = '';
        for (const candidate of uniqueCandidates) {
            const exists = await checkS3ObjectExists(candidate);
            if (exists) {
                resolvedS3Key = candidate;
                break;
            }
        }

        if (!resolvedS3Key) {
            res.status(404).json({ error: 'Media file not found in storage' });
            return;
        }

        const presignedUrl = await generatePresignedGetUrlByKey(resolvedS3Key, 1800);

        res.json({
            success: true,
            messageId,
            s3Key: resolvedS3Key,
            mediaUrl: presignedUrl,
            expiresIn: 1800,
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

export default router;
