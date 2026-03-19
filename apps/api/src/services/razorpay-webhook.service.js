import crypto from 'crypto';
import { prisma } from '@repo/db';
import { env } from '../config/env.js';

const PLAN_DEFAULTS = {
    FREE: {
        contactsLimit: 10,
        groupsLimit: 2,
        storageLimitBytes: BigInt(5 * 1024 * 1024 * 1024),
        bulkSendEnabled: false,
        apiAccessEnabled: false,
    },
    SILVER: {
        contactsLimit: 15000,
        groupsLimit: 100,
        storageLimitBytes: BigInt(40) * BigInt(1024 * 1024 * 1024),
        bulkSendEnabled: true,
        apiAccessEnabled: true,
    },
    GOLD: {
        contactsLimit: 80000,
        groupsLimit: 500,
        storageLimitBytes: BigInt(160) * BigInt(1024 * 1024 * 1024),
        bulkSendEnabled: true,
        apiAccessEnabled: true,
    },
};

const SUBSCRIPTION_STATUS_MAP = {
    'subscription.activated': 'ACTIVE',
    'subscription.charged': 'ACTIVE',
    'subscription.cancelled': 'CANCELLED',
    'subscription.paused': 'PAUSED',
    'subscription.resumed': 'ACTIVE',
    'subscription.pending': 'PAST_DUE',
    'subscription.halted': 'INACTIVE',
};

function epochToDate(value) {
    if (!value || Number.isNaN(Number(value))) {
        return null;
    }

    return new Date(Number(value) * 1000);
}

function parsePayload(rawBody) {
    const rawText = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
    return {
        rawText,
        payload: JSON.parse(rawText || '{}'),
    };
}

function verifySignature(rawText, signature) {
    if (!env.razorpayWebhookSecret) {
        throw Object.assign(new Error('RAZORPAY_WEBHOOK_SECRET is not configured'), { statusCode: 500 });
    }

    const expected = crypto
        .createHmac('sha256', env.razorpayWebhookSecret)
        .update(rawText)
        .digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const incomingBuffer = Buffer.from(signature || '');

    if (expectedBuffer.length !== incomingBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, incomingBuffer);
}

async function getSubscriptionRecord(payload) {
    const subscriptionEntity = payload?.payload?.subscription?.entity;
    const paymentEntity = payload?.payload?.payment?.entity;

    const razorpaySubscriptionId =
        subscriptionEntity?.id || paymentEntity?.subscription_id || paymentEntity?.order_id || null;
    const userIdFromNotes = subscriptionEntity?.notes?.userId || paymentEntity?.notes?.userId || null;

    if (razorpaySubscriptionId) {
        const subscription = await prisma.subscription.findFirst({
            where: { razorpaySubscriptionId },
        });

        if (subscription) {
            return { subscription, razorpaySubscriptionId };
        }
    }

    if (userIdFromNotes) {
        const subscription = await prisma.subscription.findUnique({
            where: { userId: userIdFromNotes },
        });

        if (subscription) {
            return { subscription, razorpaySubscriptionId };
        }
    }

    return { subscription: null, razorpaySubscriptionId };
}

async function upsertPayment({ subscription, paymentEntity, fallbackStatus = 'CAPTURED', fallbackOrderId = null }) {
    if (!subscription || !paymentEntity?.id) {
        return;
    }

    const existing = await prisma.payment.findFirst({
        where: { razorpayPaymentId: paymentEntity.id },
    });

    const data = {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        amount: Number(paymentEntity.amount || 0) / 100,
        currency: paymentEntity.currency || 'INR',
        status: (paymentEntity.status || fallbackStatus || 'CAPTURED').toUpperCase(),
        razorpayPaymentId: paymentEntity.id,
        razorpayOrderId: paymentEntity.order_id || fallbackOrderId || subscription.razorpaySubscriptionId,
        paymentMethod: paymentEntity.method || null,
        billingPeriodStart: subscription.currentPeriodStart || null,
        billingPeriodEnd: subscription.currentPeriodEnd || null,
    };

    if (existing) {
        await prisma.payment.update({ where: { id: existing.id }, data });
        return;
    }

    await prisma.payment.create({ data });
}

async function syncUserPlanLimits(subscription, status) {
    const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: subscription.planId },
        select: { name: true },
    });

    const tier = plan?.name && PLAN_DEFAULTS[plan.name] ? plan.name : 'FREE';
    const defaults = PLAN_DEFAULTS[tier];

    const isActive = status === 'ACTIVE' || status === 'CANCELLED';

    await prisma.user.update({
        where: { id: subscription.userId },
        data: {
            planTier: tier,
            contactsLimit: defaults.contactsLimit,
            groupsLimit: defaults.groupsLimit,
            storageLimitBytes: defaults.storageLimitBytes,
            bulkSendEnabled: defaults.bulkSendEnabled,
            apiAccessEnabled: defaults.apiAccessEnabled,
            isActive,
        },
    });
}

async function updateSubscriptionFromEvent({ event, payload, subscription, razorpaySubscriptionId }) {
    const subscriptionEntity = payload?.payload?.subscription?.entity;
    const paymentEntity = payload?.payload?.payment?.entity;

    const mappedStatus = SUBSCRIPTION_STATUS_MAP[event] || null;
    if (!subscription || !mappedStatus) {
        return;
    }

    const currentPeriodStart = epochToDate(subscriptionEntity?.current_start) || subscription.currentPeriodStart;
    const currentPeriodEnd = epochToDate(subscriptionEntity?.current_end) || subscription.currentPeriodEnd;
    const endedAt = epochToDate(subscriptionEntity?.ended_at);

    const data = {
        status: mappedStatus,
        razorpaySubscriptionId: razorpaySubscriptionId || subscription.razorpaySubscriptionId,
        razorpayCustomerId: subscriptionEntity?.customer_id || subscription.razorpayCustomerId,
        currentPeriodStart,
        currentPeriodEnd,
        autoRenew: mappedStatus !== 'CANCELLED' && mappedStatus !== 'INACTIVE',
        endDate: endedAt || (mappedStatus === 'CANCELLED' ? currentPeriodEnd : subscription.endDate),
        updatedAt: new Date(),
    };

    await prisma.subscription.update({ where: { id: subscription.id }, data });
    await upsertPayment({
        subscription: { ...subscription, ...data },
        paymentEntity,
        fallbackStatus: mappedStatus === 'PAST_DUE' ? 'FAILED' : 'CAPTURED',
        fallbackOrderId: razorpaySubscriptionId,
    });
    await syncUserPlanLimits(subscription, mappedStatus);
}

async function handleLegacyPaymentEvent(event, payload) {
    const paymentEntity = payload?.payload?.payment?.entity;
    if (!paymentEntity?.id) {
        return;
    }

    const { subscription } = await getSubscriptionRecord(payload);
    if (!subscription) {
        console.warn('Razorpay payment event received without matching subscription:', paymentEntity.id);
        return;
    }

    const fallbackStatus = event === 'payment.failed' ? 'FAILED' : event === 'payment.authorized' ? 'AUTHORIZED' : 'CAPTURED';
    await upsertPayment({
        subscription,
        paymentEntity,
        fallbackStatus,
        fallbackOrderId: paymentEntity.order_id,
    });
}

export async function processRazorpayWebhook(rawBody, signature) {
    const { rawText, payload } = parsePayload(rawBody);

    if (!verifySignature(rawText, signature)) {
        throw Object.assign(new Error('Invalid Razorpay webhook signature'), { statusCode: 401 });
    }

    const event = payload?.event;
    if (!event) {
        throw Object.assign(new Error('Invalid webhook payload: event is missing'), { statusCode: 400 });
    }

    if (event.startsWith('subscription.')) {
        const { subscription, razorpaySubscriptionId } = await getSubscriptionRecord(payload);

        if (!subscription) {
            console.warn('Subscription webhook received but no subscription record found for event:', event);
            return { event, handled: false };
        }

        await updateSubscriptionFromEvent({ event, payload, subscription, razorpaySubscriptionId });
        return { event, handled: true };
    }

    if (event.startsWith('payment.')) {
        await handleLegacyPaymentEvent(event, payload);
        return { event, handled: true };
    }

    console.log('Received unsupported webhook event:', event);
    return { event, handled: false };
}
