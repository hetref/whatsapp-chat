import { prisma } from '@repo/db';

export const PLAN_DEFAULTS = {
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

export function formatBytes(bytes) {
    const b = typeof bytes === 'bigint' ? Number(bytes) : Number(bytes || 0);
    if (!b) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function ensureUser(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;

    return prisma.user.create({
        data: {
            id: userId,
            isActive: true,
            planTier: 'FREE',
            contactsLimit: PLAN_DEFAULTS.FREE.contactsLimit,
            groupsLimit: PLAN_DEFAULTS.FREE.groupsLimit,
            storageLimitBytes: PLAN_DEFAULTS.FREE.storageLimitBytes,
            bulkSendEnabled: PLAN_DEFAULTS.FREE.bulkSendEnabled,
            apiAccessEnabled: PLAN_DEFAULTS.FREE.apiAccessEnabled,
        },
    });
}

export async function applyPlanLimits(userId, tier) {
    const safeTier = PLAN_DEFAULTS[tier] ? tier : 'FREE';
    const defaults = PLAN_DEFAULTS[safeTier];

    return prisma.user.update({
        where: { id: userId },
        data: {
            planTier: safeTier,
            contactsLimit: defaults.contactsLimit,
            groupsLimit: defaults.groupsLimit,
            storageLimitBytes: defaults.storageLimitBytes,
            bulkSendEnabled: defaults.bulkSendEnabled,
            apiAccessEnabled: defaults.apiAccessEnabled,
            isActive: safeTier !== 'FREE',
        },
    });
}

export async function getUserPlanInfo(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            planTier: true,
            contactsLimit: true,
            groupsLimit: true,
            storageLimitBytes: true,
            storageUsedBytes: true,
            bulkSendEnabled: true,
            apiAccessEnabled: true,
            _count: {
                select: {
                    contacts: true,
                    groups: true,
                },
            },
        },
    });

    if (!user) return null;

    return {
        planTier: user.planTier,
        contactsLimit: user.contactsLimit,
        groupsLimit: user.groupsLimit,
        storageLimitBytes: user.storageLimitBytes,
        storageUsedBytes: user.storageUsedBytes,
        bulkSendEnabled: user.bulkSendEnabled,
        apiAccessEnabled: user.apiAccessEnabled,
        contactsUsed: user._count.contacts,
        groupsUsed: user._count.groups,
    };
}

export async function checkSubscriptionActive(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            planTier: true,
            subscription: {
                select: {
                    status: true,
                    currentPeriodEnd: true,
                },
            },
        },
    });

    if (!user) {
        return { active: false, status: 'UNKNOWN', planTier: 'FREE', message: 'User not found.' };
    }

    const planTier = user.planTier || 'FREE';
    if (planTier === 'FREE') {
        return { active: true, status: 'FREE', planTier, message: '' };
    }

    const subStatus = user.subscription?.status;
    if (!subStatus) {
        return { active: false, status: 'NO_SUBSCRIPTION', planTier, message: 'No active subscription found. Please subscribe.' };
    }

    if (subStatus === 'ACTIVE') {
        return { active: true, status: subStatus, planTier, message: '' };
    }

    if (subStatus === 'CANCELLED') {
        const periodEnd = user.subscription?.currentPeriodEnd;
        if (periodEnd && new Date(periodEnd) > new Date()) {
            return { active: true, status: subStatus, planTier, message: '' };
        }

        return { active: false, status: subStatus, planTier, message: 'Your cancelled subscription has ended. Please renew.' };
    }

    if (subStatus === 'PAUSED') {
        return { active: false, status: subStatus, planTier, message: 'Your subscription is paused. Resume to continue.' };
    }

    if (subStatus === 'PAST_DUE') {
        return { active: false, status: subStatus, planTier, message: 'Payment failed or overdue. Please update payment and retry.' };
    }

    if (subStatus === 'EXPIRED') {
        return { active: false, status: subStatus, planTier, message: 'Subscription expired. Please renew.' };
    }

    return { active: false, status: subStatus, planTier, message: 'Subscription is not active.' };
}
