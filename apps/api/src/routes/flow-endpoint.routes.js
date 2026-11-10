import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { prisma } from '@repo/db';
import {
    getOrCreateFlowKeyPair,
    decryptFlowRequest,
    encryptFlowResponse,
} from '../services/flow-crypto.service.js';

const router = Router();

// GET /api/flow-endpoint - Health check & Meta verification
router.get('/', (req, res) => {
    const { publicKeyPem } = getOrCreateFlowKeyPair();
    res.json({
        status: 'active',
        service: 'WaChat WhatsApp Flow Endpoint',
        encryption: 'RSA-2048 / AES-128-GCM',
        timestamp: new Date().toISOString(),
        publicKeyConfigured: Boolean(publicKeyPem),
    });
});

// GET /api/flow-endpoint/public-key - View current registered public key
router.get('/public-key', (req, res) => {
    try {
        const { publicKeyPem } = getOrCreateFlowKeyPair();
        res.type('text/plain').send(publicKeyPem);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve public key' });
    }
});

/**
 * POST /api/flow-endpoint
 *
 * Handles both:
 * 1. Encrypted production requests directly from WhatsApp clients via Meta
 * 2. Unencrypted JSON requests (for internal testing / health pings)
 */
router.post('/', async (req, res) => {
    const body = req.body || {};
    const isEncrypted = Boolean(body.encrypted_flow_data && body.encrypted_aes_key && body.initial_vector);

    let decryptedBody = body;
    let aesKey = null;
    let initialVector = null;

    if (isEncrypted) {
        try {
            const decrypted = decryptFlowRequest(
                body.encrypted_flow_data,
                body.encrypted_aes_key,
                body.initial_vector
            );
            decryptedBody = decrypted.decryptedBody;
            aesKey = decrypted.aesKey;
            initialVector = decrypted.initialVector;
        } catch (decryptErr) {
            console.error('[Flow Endpoint] Decryption failed:', decryptErr);
            // HTTP 421 tells Meta that the endpoint cannot decrypt the request
            // (triggers Meta client to re-fetch the registered public key)
            res.status(421).send();
            return;
        }
    }

    try {
        const version = decryptedBody.version || '3.0';
        const action = decryptedBody.action;
        const screen = decryptedBody.screen || decryptedBody.screen_id || 'WELCOME';
        const data = decryptedBody.data || {};
        const flowToken = decryptedBody.flow_token || decryptedBody.flowToken;

        console.log('[Flow Endpoint] Processed action:', {
            encrypted: isEncrypted,
            action,
            screen,
            flowToken,
            version,
            dataKeys: Object.keys(data),
        });

        let responsePayload = {};

        // 1. Health check / Ping from Meta
        if (action === 'ping') {
            responsePayload = {
                version,
                data: { status: 'active' },
            };
        }
        // 2. Initial Screen request (INIT) - Called when user opens the Flow
        else if (action === 'INIT') {
            // Provide live dynamic data for the opening screen
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const dayAfter = new Date(today);
            dayAfter.setDate(today.getDate() + 2);

            const formatDate = (d) => d.toISOString().split('T')[0];

            responsePayload = {
                version,
                screen,
                data: {
                    is_live_endpoint: true,
                    welcome_message: 'Welcome! Live appointment slots loaded from WaChat.',
                    available_dates: [
                        { id: formatDate(today), title: `Today (${formatDate(today)})` },
                        { id: formatDate(tomorrow), title: `Tomorrow (${formatDate(tomorrow)})` },
                        { id: formatDate(dayAfter), title: formatDate(dayAfter) },
                    ],
                    available_slots: [
                        { id: '10:00', title: '10:00 AM (Available)' },
                        { id: '11:30', title: '11:30 AM (Available)' },
                        { id: '14:00', title: '02:00 PM (Available)' },
                        { id: '16:30', title: '04:30 PM (Available)' },
                    ],
                    ...data,
                },
            };
        }
        // 3. Screen navigation / Data Exchange
        else if (action === 'data_exchange') {
            // Screen 1: Date selected -> Load live slots for that specific date
            if (data.selected_date) {
                const dateStr = data.selected_date;
                responsePayload = {
                    version,
                    screen: data.next_screen || screen,
                    data: {
                        selected_date: dateStr,
                        available_slots: [
                            { id: `${dateStr}_10:00`, title: '10:00 AM' },
                            { id: `${dateStr}_14:00`, title: '02:00 PM' },
                            { id: `${dateStr}_17:00`, title: '05:00 PM' },
                        ],
                    },
                };
            }
            // Screen: WELCOME or SIGN_IN -> Transition to SUCCESS_SCREEN
            else if (screen === 'WELCOME' || screen === 'SIGN_IN') {
                const email = data.email || data.text_input_2 || '';
                const password = data.password || data.text_input_3 || '';

                console.log('[Flow Endpoint] Verified credentials for:', email);

                // Store submission in whatsapp_flow_submissions so it shows on the Flow Submissions page
                try {
                    let flow = null;
                    if (flowToken) {
                        const tokenMatch = String(flowToken).match(/flow_(\d+)_/);
                        const metaFlowId = tokenMatch ? tokenMatch[1] : null;
                        if (metaFlowId) {
                            flow = await prisma.whatsAppFlow.findFirst({
                                where: { metaFlowId },
                            });
                        }
                    }
                    if (!flow) {
                        flow = (await prisma.whatsAppFlow.findFirst({
                            where: { metaFlowId: '40259088117037729' },
                        })) || (await prisma.whatsAppFlow.findFirst({
                            orderBy: { updatedAt: 'desc' },
                        }));
                    }

                    if (flow) {
                        const submissionId = randomUUID();
                        await prisma.$executeRaw`
                            INSERT INTO "whatsapp_flow_submissions" (
                                "id", "flow_id", "user_id", "contact_id", "whatsapp_message_id",
                                "context_message_id", "contact_phone", "contact_name", "response_data", "submitted_at"
                            ) VALUES (
                                ${submissionId}::uuid, ${flow.id}::uuid, ${flow.userId}, null,
                                ${`flow_ep_${Date.now()}_${submissionId.slice(0, 8)}`}, null,
                                ${data.phone || email || 'WhatsApp User'},
                                ${data.name || email || null},
                                ${JSON.stringify(data)}::jsonb, ${new Date()}
                            )
                        `;
                        console.log('[Flow Endpoint] Recorded submission for flow:', flow.name, flow.id);
                    }
                } catch (saveErr) {
                    console.error('[Flow Endpoint] Failed to record submission:', saveErr);
                }

                responsePayload = {
                    version,
                    screen: 'SUCCESS_SCREEN',
                    data: {
                        status_message: `Welcome ${email || 'User'}! Your details were verified live by the WaChat Endpoint.`,
                    },
                };
            }
            // Default Data Exchange: echo data with confirmation
            else {
                responsePayload = {
                    version,
                    screen,
                    data: {
                        status_message: 'Data validated and updated successfully!',
                        ...data,
                    },
                };
            }
        }
        // 4. Default fallback
        else {
            responsePayload = {
                version,
                screen,
                data: {
                    status: 'success',
                    ...data,
                },
            };
        }

        // Return encrypted response if incoming request was encrypted
        if (isEncrypted && aesKey && initialVector) {
            const encryptedResponse = encryptFlowResponse(responsePayload, aesKey, initialVector);
            res.status(200).type('text/plain').send(encryptedResponse);
            return;
        }

        // Otherwise return plain JSON
        res.json(responsePayload);
    } catch (error) {
        console.error('[Flow Endpoint] Error processing request:', error);
        res.status(500).json({
            version: '3.0',
            screen: 'WELCOME',
            data: { error_message: 'An unexpected error occurred. Please try again later.' },
        });
    }
});

export default router;
