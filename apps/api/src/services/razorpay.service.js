import Razorpay from 'razorpay';
import crypto from 'node:crypto';

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_PLAN_ID = process.env.RAZORPAY_PLAN_ID;
const RAZORPAY_SILVER_PLAN_ID = process.env.RAZORPAY_SILVER_PLAN_ID;
const RAZORPAY_GOLD_PLAN_ID = process.env.RAZORPAY_GOLD_PLAN_ID;

export function isRazorpayConfigured() {
    return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

function getRazorpay() {
    if (!isRazorpayConfigured()) {
        throw new Error('Razorpay not configured');
    }

    return new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
    });
}

export function getRazorpayPlanId(planTier) {
    if (planTier === 'GOLD') return RAZORPAY_GOLD_PLAN_ID;
    if (planTier === 'SILVER') return RAZORPAY_SILVER_PLAN_ID || RAZORPAY_PLAN_ID;
    return RAZORPAY_SILVER_PLAN_ID || RAZORPAY_PLAN_ID;
}

export async function createRazorpayCustomer(name, email, contact) {
    const razorpay = getRazorpay();
    const payload = {
        name,
        email,
        fail_existing: '0',
    };

    if (contact) payload.contact = contact;
    return razorpay.customers.create(payload);
}

export async function createRazorpaySubscription(userId, customerId, options = {}) {
    const razorpay = getRazorpay();
    const planId = getRazorpayPlanId(options.planTier);
    if (!planId) {
        throw new Error(`Razorpay plan not configured for ${options.planTier || 'default'}`);
    }

    const data = {
        plan_id: planId,
        total_count: options.totalCount || 120,
        quantity: 1,
        customer_notify: 1,
        notes: {
            userId,
            purpose: 'wachat_subscription',
        },
    };

    if (customerId) data.customer_id = customerId;
    if (options.startAt) data.start_at = options.startAt;
    if (options.expireBy) data.expire_by = options.expireBy;

    return razorpay.subscriptions.create(data);
}

export async function cancelRazorpaySubscription(subscriptionId, cancelAtCycleEnd = true) {
    const razorpay = getRazorpay();
    return razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
}

export async function updateRazorpaySubscriptionPlan(subscriptionId, newPlanTier, scheduleAt = 'cycle_end') {
    const razorpay = getRazorpay();
    const newPlanId = getRazorpayPlanId(newPlanTier);
    if (!newPlanId) {
        throw new Error(`Plan ID not configured for ${newPlanTier}`);
    }

    try {
        return await razorpay.subscriptions.update(subscriptionId, {
            plan_id: newPlanId,
            schedule_change_at: scheduleAt,
        });
    } catch (error) {
        const description = error?.error?.description || '';
        if (String(description).toLowerCase().includes('payment mode is upi')) {
            const upiError = new Error('Your subscription was created with UPI which does not support plan changes. Cancel and re-subscribe on the new plan.');
            upiError.code = 'UPI_PLAN_CHANGE_NOT_SUPPORTED';
            throw upiError;
        }

        throw new Error(description || 'Failed to update subscription plan');
    }
}

export async function createRazorpayOrder(amountRupees, userId) {
    const razorpay = getRazorpay();
    const shortId = String(userId || '').slice(-8);
    const timestamp = Date.now().toString().slice(-10);

    return razorpay.orders.create({
        amount: Math.round(Number(amountRupees) * 100),
        currency: 'INR',
        receipt: `rcpt_${shortId}_${timestamp}`,
        notes: {
            userId,
            purpose: 'subscription_payment',
        },
    });
}

export async function fetchPaymentDetails(paymentId) {
    const razorpay = getRazorpay();
    return razorpay.payments.fetch(paymentId);
}

export async function fetchSubscriptionDetails(subscriptionId) {
    const razorpay = getRazorpay();
    return razorpay.subscriptions.fetch(subscriptionId);
}

export function verifyRazorpaySignature(orderId, paymentId, signature) {
    if (!RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay key secret not configured');
    }

    const expected = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

    return expected === signature;
}

export function verifySubscriptionSignature(subscriptionId, paymentId, signature) {
    if (!RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay key secret not configured');
    }

    const expected = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${paymentId}|${subscriptionId}`)
        .digest('hex');

    return expected === signature;
}

export function calculateBillingPeriod(startDate = new Date()) {
    const currentPeriodStart = new Date(startDate);
    const currentPeriodEnd = new Date(startDate);
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
    return { currentPeriodStart, currentPeriodEnd };
}
