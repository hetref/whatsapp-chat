import { Router } from 'express';
import { prisma } from '@repo/db';
import {
    applyPlanLimits,
    checkSubscriptionActive,
    ensureUser,
    formatBytes,
    getUserPlanInfo,
} from '../services/plan-limits.service.js';

const router = Router();

function getUserId(req, res) {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body?.userId;
    if (!userId || typeof userId !== 'string') {
        res.status(401).json({ error: 'Unauthorized: missing x-user-id' });
        return null;
    }

    return userId;
}

async function expireIfNeeded(subscription) {
    if (!subscription?.currentPeriodEnd) return false;
    if (new Date(subscription.currentPeriodEnd) >= new Date()) return false;
    if (subscription.status === 'EXPIRED') return true;

    await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
    });
    await applyPlanLimits(subscription.userId, 'FREE');
    return true;
}

router.get('/subscription/status', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        await ensureUser(userId);

        let user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                subscription: { include: { plan: true } },
                payments: { orderBy: { createdAt: 'desc' }, take: 5 },
            },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        if (!user.subscription) {
            const planInfo = await getUserPlanInfo(userId);
            return res.json({
                hasSubscription: false,
                isActive: true,
                status: 'FREE',
                planTier: 'FREE',
                daysRemaining: null,
                usage: planInfo
                    ? {
                        contactsUsed: planInfo.contactsUsed,
                        contactsLimit: planInfo.contactsLimit,
                        groupsUsed: planInfo.groupsUsed,
                        groupsLimit: planInfo.groupsLimit,
                        storageUsed: Number(planInfo.storageUsedBytes),
                        storageLimit: Number(planInfo.storageLimitBytes),
                        storageUsedFormatted: formatBytes(planInfo.storageUsedBytes),
                        storageLimitFormatted: formatBytes(planInfo.storageLimitBytes),
                        bulkSendEnabled: planInfo.bulkSendEnabled,
                        apiAccessEnabled: planInfo.apiAccessEnabled,
                    }
                    : null,
                message: 'Free plan. Upgrade for more features.',
            });
        }

        const expired = await expireIfNeeded(user.subscription);
        if (expired) {
            user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    subscription: { include: { plan: true } },
                    payments: { orderBy: { createdAt: 'desc' }, take: 5 },
                },
            });
        }

        const subscription = user.subscription;
        const now = new Date();
        const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
        const isExpired = Boolean(periodEnd && periodEnd < now);
        const daysRemaining = periodEnd && !isExpired
            ? Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

        const hasAccess = !isExpired && ['ACTIVE', 'CANCELLED'].includes(subscription.status);

        if (!hasAccess && user.planTier !== 'FREE') {
            await applyPlanLimits(userId, 'FREE');
            user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    subscription: { include: { plan: true } },
                    payments: { orderBy: { createdAt: 'desc' }, take: 5 },
                },
            });
        }

        const planInfo = await getUserPlanInfo(userId);
        const subCheck = await checkSubscriptionActive(userId);

        res.json({
            hasSubscription: true,
            isActive: subCheck.active,
            daysRemaining,
            planTier: user.planTier,
            messagingBlocked: !subCheck.active,
            messagingBlockedReason: subCheck.active ? null : subCheck.message,
            usage: planInfo
                ? {
                    contactsUsed: planInfo.contactsUsed,
                    contactsLimit: planInfo.contactsLimit,
                    groupsUsed: planInfo.groupsUsed,
                    groupsLimit: planInfo.groupsLimit,
                    storageUsed: Number(planInfo.storageUsedBytes),
                    storageLimit: Number(planInfo.storageLimitBytes),
                    storageUsedFormatted: formatBytes(planInfo.storageUsedBytes),
                    storageLimitFormatted: formatBytes(planInfo.storageLimitBytes),
                    bulkSendEnabled: planInfo.bulkSendEnabled,
                    apiAccessEnabled: planInfo.apiAccessEnabled,
                }
                : null,
            subscription: {
                id: subscription.id,
                status: isExpired ? 'EXPIRED' : subscription.status,
                startDate: subscription.startDate,
                currentPeriodStart: subscription.currentPeriodStart,
                currentPeriodEnd: subscription.currentPeriodEnd,
                autoRenew: subscription.autoRenew,
                cancelledAt: subscription.cancelledAt,
                razorpaySubscriptionId: subscription.razorpaySubscriptionId,
                plan: subscription.plan
                    ? {
                        name: subscription.plan.name,
                        displayName: subscription.plan.displayName,
                        description: subscription.plan.description,
                        price: Number(subscription.plan.price),
                        currency: subscription.plan.currency,
                    }
                    : null,
            },
            recentPayments: user.payments.map((payment) => ({
                id: payment.id,
                amount: Number(payment.amount),
                currency: payment.currency,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                billingPeriodStart: payment.billingPeriodStart,
                billingPeriodEnd: payment.billingPeriodEnd,
                createdAt: payment.createdAt,
            })),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/subscription/payments', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const subscription = await prisma.subscription.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!subscription) {
            res.json({ payments: [] });
            return;
        }

        const payments = await prisma.payment.findMany({
            where: { subscriptionId: subscription.id },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                razorpayPaymentId: true,
                razorpayOrderId: true,
                paymentMethod: true,
                billingPeriodStart: true,
                billingPeriodEnd: true,
                failureReason: true,
                createdAt: true,
            },
        });

        res.json({
            payments: payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/subscription/cancel', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const subscription = await prisma.subscription.findUnique({
            where: { userId },
            include: { plan: true },
        });

        if (!subscription) {
            res.status(404).json({ error: 'No subscription found' });
            return;
        }

        if (subscription.status === 'CANCELLED') {
            res.status(400).json({ error: 'Subscription already cancelled' });
            return;
        }

        const updatedSubscription = await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status: 'CANCELLED',
                autoRenew: false,
                cancelledAt: new Date(),
            },
        });

        res.json({
            success: true,
            message: 'Subscription cancelled successfully',
            subscription: {
                id: updatedSubscription.id,
                status: updatedSubscription.status,
                cancelledAt: updatedSubscription.cancelledAt,
                currentPeriodEnd: updatedSubscription.currentPeriodEnd,
                accessUntil: updatedSubscription.currentPeriodEnd,
                plan: subscription.plan,
            },
        });
    } catch (error) {
        next(error);
    }
});

router.delete('/subscription/cancel', async (req, res, next) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const subscription = await prisma.subscription.findUnique({
            where: { userId },
            include: { plan: true },
        });

        if (!subscription) {
            res.status(404).json({ error: 'No subscription found' });
            return;
        }

        if (subscription.status !== 'CANCELLED') {
            res.status(400).json({ error: 'Subscription is not cancelled' });
            return;
        }

        const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
        if (!periodEnd || periodEnd < new Date()) {
            res.status(400).json({ error: 'Subscription period has expired. Please create a new subscription.' });
            return;
        }

        const updatedSubscription = await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status: 'ACTIVE',
                autoRenew: true,
                cancelledAt: null,
            },
        });

        res.json({
            success: true,
            message: 'Subscription reactivated successfully',
            subscription: {
                id: updatedSubscription.id,
                status: updatedSubscription.status,
                autoRenew: updatedSubscription.autoRenew,
                currentPeriodEnd: updatedSubscription.currentPeriodEnd,
                plan: subscription.plan,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
