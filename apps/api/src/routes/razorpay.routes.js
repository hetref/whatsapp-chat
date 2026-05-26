import { Router } from 'express';
import { prisma } from '@repo/db';
import {
    applyPlanLimits,
    ensureUser,
} from '../services/plan-limits.service.js';
import {
    calculateBillingPeriod,
    cancelRazorpaySubscription,
    createRazorpayCustomer,
    createRazorpayOrder,
    createRazorpaySubscription,
    fetchPaymentDetails,
    fetchSubscriptionDetails,
    getRazorpayPlanId,
    isRazorpayConfigured,
    updateRazorpaySubscriptionPlan,
    verifyRazorpaySignature,
    verifySubscriptionSignature,
} from '../services/razorpay.service.js';

const router = Router();

const PLAN_PRICES = {
    FREE: 0,
    SILVER: 499,
    GOLD: 999,
};

const PLAN_HIERARCHY = {
    FREE: 0,
    SILVER: 1,
    GOLD: 2,
};

function getUserId(req, res) {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body?.userId;
    if (!userId || typeof userId !== 'string') {
        res.status(401).json({ error: 'Unauthorized: missing x-user-id' });
        return null;
    }

    return userId;
}

async function getUserWithSubscription(userId) {
    return prisma.user.findUnique({
        where: { id: userId },
        include: {
            subscription: {
                include: { plan: true },
            },
        },
    });
}

router.post('/razorpay/create-order', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        if (!isRazorpayConfigured()) {
            res.status(503).json({ error: 'Payment system not configured' });
            return;
        }

        const requestedTier = req.body?.planTier === 'GOLD' ? 'GOLD' : 'SILVER';
        const amount = PLAN_PRICES[requestedTier];

        await ensureUser(userId);

        const user = await getUserWithSubscription(userId);
        if (user?.subscription?.status === 'ACTIVE') {
            res.status(400).json({ error: 'You already have an active subscription' });
            return;
        }

        const plan = await prisma.subscriptionPlan.findFirst({ where: { name: requestedTier, isActive: true } });
        if (!plan) {
            res.status(404).json({ error: `${requestedTier} plan not available` });
            return;
        }

        const order = await createRazorpayOrder(amount, userId);

        if (!user.subscription) {
            await prisma.subscription.create({
                data: {
                    userId,
                    planId: plan.id,
                    status: 'INACTIVE',
                    autoRenew: true,
                },
            });
        } else {
            await prisma.subscription.update({
                where: { id: user.subscription.id },
                data: {
                    planId: plan.id,
                    status: 'INACTIVE',
                    autoRenew: true,
                    cancelledAt: null,
                },
            });
        }

        res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
            },
            plan: {
                name: plan.displayName,
                price: Number(plan.price),
                currency: plan.currency,
            },
        });
    } catch (error) {
        next(error);
    }
});

router.post('/razorpay/create-subscription', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        if (!isRazorpayConfigured()) {
            res.status(500).json({ error: 'Payment system not configured' });
            return;
        }

        const planTier = req.body?.planTier === 'GOLD' ? 'GOLD' : 'SILVER';
        if (!getRazorpayPlanId(planTier)) {
            res.status(500).json({ error: `Subscription plan not configured for ${planTier}` });
            return;
        }

        await ensureUser(userId);
        let user = await getUserWithSubscription(userId);

        if (user?.subscription?.status === 'ACTIVE' && user.subscription.razorpaySubscriptionId && user.subscription.autoRenew) {
            res.status(400).json({ error: 'You already have an active subscription. Cancel it first to switch plans.' });
            return;
        }

        const plan = await prisma.subscriptionPlan.findFirst({
            where: { isActive: true, name: planTier },
        });

        if (!plan) {
            res.status(500).json({ error: `No ${planTier} plan configured` });
            return;
        }

        const customerName = req.body?.customerName || 'WaChat User';
        const customerEmail = req.body?.customerEmail || `${userId}@wachat.app`;
        const customerPhone = req.body?.customerPhone;

        let razorpayCustomerId = user?.subscription?.razorpayCustomerId;
        if (!razorpayCustomerId) {
            const customer = await createRazorpayCustomer(customerName, customerEmail, customerPhone);
            razorpayCustomerId = customer.id;
        }

        if (!user.subscription) {
            await prisma.subscription.create({
                data: {
                    userId,
                    planId: plan.id,
                    status: 'INACTIVE',
                    razorpayCustomerId,
                    autoRenew: true,
                },
            });
        } else {
            await prisma.subscription.update({
                where: { id: user.subscription.id },
                data: {
                    razorpayCustomerId,
                    planId: plan.id,
                    status: 'INACTIVE',
                    autoRenew: true,
                    cancelledAt: null,
                },
            });
        }

        user = await getUserWithSubscription(userId);

        const rzpSubscription = await createRazorpaySubscription(
            userId,
            razorpayCustomerId,
            { totalCount: 120, planTier }
        );

        await prisma.subscription.update({
            where: { id: user.subscription.id },
            data: { razorpaySubscriptionId: rzpSubscription.id },
        });

        res.json({
            success: true,
            subscription_id: rzpSubscription.id,
            razorpay: {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
                subscription_id: rzpSubscription.id,
                name: 'WaChat',
                description: `${plan.displayName} - Rs ${Number(plan.price)}/month`,
                prefill: {
                    name: customerName,
                    email: customerEmail,
                    contact: customerPhone || '',
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

router.post('/razorpay/verify-payment', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            res.status(400).json({ error: 'Missing required payment parameters' });
            return;
        }

        const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            res.status(400).json({ error: 'Invalid payment signature' });
            return;
        }

        const paymentDetails = await fetchPaymentDetails(razorpay_payment_id);
        if (!['captured', 'authorized'].includes(paymentDetails.status)) {
            res.status(400).json({ error: 'Payment not successful' });
            return;
        }

        const user = await getUserWithSubscription(userId);
        if (!user?.subscription) {
            res.status(404).json({ error: 'Subscription not found' });
            return;
        }

        const { currentPeriodStart, currentPeriodEnd } = calculateBillingPeriod();

        const updatedSubscription = await prisma.subscription.update({
            where: { id: user.subscription.id },
            data: {
                status: 'ACTIVE',
                startDate: user.subscription.startDate || currentPeriodStart,
                currentPeriodStart,
                currentPeriodEnd,
                autoRenew: true,
                cancelledAt: null,
                razorpayCustomerId: paymentDetails.customer_id || null,
            },
        });

        const payment = await prisma.payment.create({
            data: {
                subscriptionId: user.subscription.id,
                userId,
                amount: Number(paymentDetails.amount) / 100,
                currency: paymentDetails.currency,
                status: paymentDetails.status === 'captured' ? 'CAPTURED' : 'AUTHORIZED',
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                razorpaySignature: razorpay_signature,
                paymentMethod: paymentDetails.method,
                billingPeriodStart: currentPeriodStart,
                billingPeriodEnd: currentPeriodEnd,
            },
        });

        const planTier = user.subscription.plan?.name || 'FREE';
        await applyPlanLimits(userId, planTier);

        res.json({
            success: true,
            message: 'Payment verified and subscription activated',
            subscription: {
                id: updatedSubscription.id,
                status: updatedSubscription.status,
                currentPeriodStart: updatedSubscription.currentPeriodStart,
                currentPeriodEnd: updatedSubscription.currentPeriodEnd,
            },
            payment: {
                id: payment.id,
                amount: Number(payment.amount),
                currency: payment.currency,
                status: payment.status,
            },
        });
    } catch (error) {
        next(error);
    }
});

router.post('/razorpay/verify-subscription', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body || {};
        if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
            res.status(400).json({ error: 'Missing required parameters' });
            return;
        }

        const isValid = verifySubscriptionSignature(razorpay_subscription_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            res.status(400).json({ error: 'Invalid payment signature' });
            return;
        }

        const rzpSubscription = await fetchSubscriptionDetails(razorpay_subscription_id);
        if (!['created', 'authenticated', 'active'].includes(rzpSubscription.status)) {
            res.status(400).json({ error: `Subscription status is ${rzpSubscription.status}. Cannot activate.` });
            return;
        }

        const payment = await fetchPaymentDetails(razorpay_payment_id);
        const user = await getUserWithSubscription(userId);
        if (!user?.subscription) {
            res.status(404).json({ error: 'Subscription not found' });
            return;
        }

        const { currentPeriodStart, currentPeriodEnd } = calculateBillingPeriod();

        const updatedSubscription = await prisma.subscription.update({
            where: { id: user.subscription.id },
            data: {
                status: 'ACTIVE',
                razorpaySubscriptionId: razorpay_subscription_id,
                startDate: user.subscription.startDate || currentPeriodStart,
                currentPeriodStart,
                currentPeriodEnd,
                autoRenew: true,
                cancelledAt: null,
            },
        });

        const paymentRecord = await prisma.payment.create({
            data: {
                subscriptionId: user.subscription.id,
                userId,
                amount: Number(payment.amount) / 100,
                currency: payment.currency,
                status: payment.status === 'captured' ? 'CAPTURED' : 'AUTHORIZED',
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_subscription_id,
                razorpaySignature: razorpay_signature,
                paymentMethod: payment.method,
                billingPeriodStart: currentPeriodStart,
                billingPeriodEnd: currentPeriodEnd,
            },
        });

        const planTier = user.subscription.plan?.name || 'FREE';
        await applyPlanLimits(userId, planTier);

        res.json({
            success: true,
            message: 'Subscription activated successfully',
            subscription: {
                id: updatedSubscription.id,
                status: updatedSubscription.status,
                currentPeriodStart: updatedSubscription.currentPeriodStart,
                currentPeriodEnd: updatedSubscription.currentPeriodEnd,
                autoRenew: updatedSubscription.autoRenew,
            },
            payment: {
                id: paymentRecord.id,
                amount: Number(paymentRecord.amount),
                currency: paymentRecord.currency,
                status: paymentRecord.status,
            },
        });
    } catch (error) {
        next(error);
    }
});

router.post('/razorpay/cancel-subscription', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const cancelAtCycleEnd = req.body?.cancelAtCycleEnd ?? true;

        const user = await getUserWithSubscription(userId);
        if (!user?.subscription) {
            res.status(404).json({ error: 'No subscription found' });
            return;
        }

        const subscription = user.subscription;

        if (!subscription.razorpaySubscriptionId) {
            res.status(400).json({ error: 'No active Razorpay subscription found' });
            return;
        }

        if (subscription.status === 'CANCELLED') {
            res.status(400).json({ error: 'Subscription is already cancelled' });
            return;
        }

        const cancelledSubscription = await cancelRazorpaySubscription(subscription.razorpaySubscriptionId, cancelAtCycleEnd);

        const updatedSubscription = await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                autoRenew: false,
                cancelledAt: new Date(),
                status: cancelAtCycleEnd ? subscription.status : 'CANCELLED',
            },
        });

        await prisma.payment.create({
            data: {
                subscriptionId: subscription.id,
                userId,
                amount: 0,
                currency: 'INR',
                status: 'CAPTURED',
                paymentMethod: 'event_cancel',
                billingPeriodStart: subscription.currentPeriodStart ?? new Date(),
                billingPeriodEnd: subscription.currentPeriodEnd ?? new Date(),
            },
        });

        if (!cancelAtCycleEnd) {
            await applyPlanLimits(userId, 'FREE');
        }

        res.json({
            success: true,
            message: cancelAtCycleEnd
                ? 'Subscription will be cancelled at the end of the billing period'
                : 'Subscription cancelled immediately',
            subscription: {
                id: updatedSubscription.id,
                status: updatedSubscription.status,
                autoRenew: updatedSubscription.autoRenew,
                cancelledAt: updatedSubscription.cancelledAt,
                currentPeriodEnd: updatedSubscription.currentPeriodEnd,
            },
            razorpayStatus: cancelledSubscription.status,
        });
    } catch (error) {
        next(error);
    }
});

router.post('/razorpay/upgrade-subscription', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        if (!isRazorpayConfigured()) {
            res.status(500).json({ error: 'Payment system not configured' });
            return;
        }

        const newPlanTier = req.body?.planTier;
        if (!['SILVER', 'GOLD'].includes(newPlanTier)) {
            res.status(400).json({ error: 'Invalid plan tier' });
            return;
        }

        const user = await getUserWithSubscription(userId);
        if (!user?.subscription) {
            res.status(404).json({ error: 'No subscription found' });
            return;
        }

        const subscription = user.subscription;
        if (subscription.status !== 'ACTIVE' || !subscription.razorpaySubscriptionId) {
            res.status(400).json({ error: 'No active subscription to upgrade' });
            return;
        }

        const currentPlanName = subscription.plan.name;
        if ((PLAN_HIERARCHY[newPlanTier] ?? 0) <= (PLAN_HIERARCHY[currentPlanName] ?? 0)) {
            res.status(400).json({ error: 'Can only upgrade to a higher plan' });
            return;
        }

        const currentPrice = PLAN_PRICES[currentPlanName] ?? 0;
        const newPrice = PLAN_PRICES[newPlanTier] ?? 0;
        const upgradeCost = newPrice - currentPrice;
        if (upgradeCost <= 0) {
            res.status(400).json({ error: 'Invalid upgrade - no price difference' });
            return;
        }

        const lastPayment = await prisma.payment.findFirst({
            where: {
                subscriptionId: subscription.id,
                status: 'CAPTURED',
                NOT: { paymentMethod: { startsWith: 'event_' } },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (lastPayment?.paymentMethod === 'upi') {
            res.status(422).json({
                error: 'Your subscription was created with UPI which does not support plan changes. Cancel and re-subscribe to the new plan.',
                code: 'UPI_PLAN_CHANGE_NOT_SUPPORTED',
            });
            return;
        }

        const order = await createRazorpayOrder(upgradeCost, userId);

        res.json({
            success: true,
            order_id: order.id,
            amount: upgradeCost,
            currency: 'INR',
            currentPlan: currentPlanName,
            newPlan: newPlanTier,
        });
    } catch (error) {
        next(error);
    }
});

router.post('/razorpay/verify-upgrade', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            newPlanTier,
        } = req.body || {};

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !newPlanTier) {
            res.status(400).json({ error: 'Missing required parameters' });
            return;
        }

        if (!['SILVER', 'GOLD'].includes(newPlanTier)) {
            res.status(400).json({ error: 'Invalid plan tier' });
            return;
        }

        const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            res.status(400).json({ error: 'Invalid payment signature' });
            return;
        }

        const payment = await fetchPaymentDetails(razorpay_payment_id);
        if (!['captured', 'authorized'].includes(payment.status)) {
            res.status(400).json({ error: `Payment status is ${payment.status}. Cannot proceed.` });
            return;
        }

        const user = await getUserWithSubscription(userId);
        if (!user?.subscription) {
            res.status(404).json({ error: 'Subscription not found' });
            return;
        }

        const subscription = user.subscription;
        if (subscription.status !== 'ACTIVE' || !subscription.razorpaySubscriptionId) {
            res.status(400).json({ error: 'No active subscription to upgrade' });
            return;
        }

        const newPlan = await prisma.subscriptionPlan.findFirst({ where: { isActive: true, name: newPlanTier } });
        if (!newPlan) {
            res.status(500).json({ error: `No ${newPlanTier} plan configured` });
            return;
        }

        let razorpayPlanUpdated = true;
        try {
            await updateRazorpaySubscriptionPlan(subscription.razorpaySubscriptionId, newPlanTier, 'cycle_end');
        } catch (error) {
            if (error?.code === 'UPI_PLAN_CHANGE_NOT_SUPPORTED') {
                razorpayPlanUpdated = false;
            } else {
                throw error;
            }
        }

        await prisma.subscription.update({
            where: { id: subscription.id },
            data: { planId: newPlan.id },
        });

        await prisma.payment.create({
            data: {
                subscriptionId: subscription.id,
                userId,
                amount: Number(payment.amount) / 100,
                currency: payment.currency,
                status: payment.status === 'captured' ? 'CAPTURED' : 'AUTHORIZED',
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                razorpaySignature: razorpay_signature,
                paymentMethod: payment.method,
                billingPeriodStart: subscription.currentPeriodStart ?? new Date(),
                billingPeriodEnd: subscription.currentPeriodEnd ?? new Date(),
            },
        });

        await applyPlanLimits(userId, newPlanTier);

        res.json({
            success: true,
            message: razorpayPlanUpdated
                ? `Upgraded to ${newPlan.displayName}. Features are active now.`
                : `Upgraded to ${newPlan.displayName}. Features are active now, but renewal price may remain old because UPI plan change is restricted.`,
        });
    } catch (error) {
        if (error?.code === 'UPI_PLAN_CHANGE_NOT_SUPPORTED') {
            res.status(422).json({ error: error.message, code: error.code });
            return;
        }

        next(error);
    }
});

router.post('/razorpay/downgrade-subscription', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        if (!isRazorpayConfigured()) {
            res.status(500).json({ error: 'Payment system not configured' });
            return;
        }

        const newPlanTier = req.body?.planTier;
        if (newPlanTier !== 'SILVER') {
            res.status(400).json({ error: 'Can only downgrade to Silver' });
            return;
        }

        const user = await getUserWithSubscription(userId);
        if (!user?.subscription) {
            res.status(404).json({ error: 'No subscription found' });
            return;
        }

        const subscription = user.subscription;
        if (subscription.status !== 'ACTIVE' || !subscription.razorpaySubscriptionId) {
            res.status(400).json({ error: 'No active subscription to downgrade' });
            return;
        }

        if (subscription.plan.name !== 'GOLD') {
            res.status(400).json({ error: 'Only Gold plan can be downgraded to Silver' });
            return;
        }

        const silverPlan = await prisma.subscriptionPlan.findFirst({
            where: { isActive: true, name: 'SILVER' },
        });

        if (!silverPlan) {
            res.status(500).json({ error: 'Silver plan not configured' });
            return;
        }

        await updateRazorpaySubscriptionPlan(subscription.razorpaySubscriptionId, 'SILVER', 'cycle_end');

        await prisma.subscription.update({
            where: { id: subscription.id },
            data: { planId: silverPlan.id },
        });

        await applyPlanLimits(userId, 'SILVER');

        await prisma.payment.create({
            data: {
                subscriptionId: subscription.id,
                userId,
                amount: 0,
                currency: 'INR',
                status: 'CAPTURED',
                paymentMethod: 'event_downgrade',
                billingPeriodStart: subscription.currentPeriodStart ?? new Date(),
                billingPeriodEnd: subscription.currentPeriodEnd ?? new Date(),
            },
        });

        res.json({
            success: true,
            message: `Downgraded to Silver. From next cycle, renewal will be Rs ${Number(silverPlan.price)}/month.`,
        });
    } catch (error) {
        if (error?.code === 'UPI_PLAN_CHANGE_NOT_SUPPORTED') {
            res.status(422).json({ error: error.message, code: error.code });
            return;
        }

        next(error);
    }
});

export default router;
