import { prisma } from '@/lib/db';

export type PlanTier = 'FREE' | 'SILVER' | 'GOLD';

export const PLAN_DEFAULTS: Record<PlanTier, {
  contactsLimit: number;
  groupsLimit: number;
  storageLimitBytes: bigint;
  bulkSendEnabled: boolean;
  apiAccessEnabled: boolean;
}> = {
  FREE: {
    contactsLimit: 10,
    groupsLimit: 2,
    storageLimitBytes: BigInt(5 * 1024 * 1024 * 1024), // 5 GB
    bulkSendEnabled: false,
    apiAccessEnabled: false,
  },
  SILVER: {
    contactsLimit: 15000,
    groupsLimit: 100,
    storageLimitBytes: BigInt(40) * BigInt(1024 * 1024 * 1024), // 40 GB
    bulkSendEnabled: true,
    apiAccessEnabled: true,
  },
  GOLD: {
    contactsLimit: 80000,
    groupsLimit: 500,
    storageLimitBytes: BigInt(160) * BigInt(1024 * 1024 * 1024), // 160 GB
    bulkSendEnabled: true,
    apiAccessEnabled: true,
  },
};

export interface UserPlanInfo {
  planTier: PlanTier;
  contactsLimit: number;
  groupsLimit: number;
  storageLimitBytes: bigint;
  storageUsedBytes: bigint;
  bulkSendEnabled: boolean;
  apiAccessEnabled: boolean;
  contactsUsed: number;
  groupsUsed: number;
}

/**
 * Get user's plan info including current usage
 */
export async function getUserPlanInfo(userId: string): Promise<UserPlanInfo | null> {
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
    planTier: user.planTier as PlanTier,
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

/**
 * Check if user can create more contacts
 */
export async function checkContactsLimit(userId: string, additionalCount = 1): Promise<{ allowed: boolean; current: number; limit: number }> {
  const info = await getUserPlanInfo(userId);
  if (!info) return { allowed: false, current: 0, limit: 0 };

  return {
    allowed: info.contactsUsed + additionalCount <= info.contactsLimit,
    current: info.contactsUsed,
    limit: info.contactsLimit,
  };
}

/**
 * Check if user can create more groups
 */
export async function checkGroupsLimit(userId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const info = await getUserPlanInfo(userId);
  if (!info) return { allowed: false, current: 0, limit: 0 };

  return {
    allowed: info.groupsUsed < info.groupsLimit,
    current: info.groupsUsed,
    limit: info.groupsLimit,
  };
}

/**
 * Check if user has storage capacity for a file
 */
export async function checkStorageLimit(userId: string, fileSizeBytes: number): Promise<{ allowed: boolean; used: bigint; limit: bigint }> {
  const info = await getUserPlanInfo(userId);
  if (!info) return { allowed: false, used: BigInt(0), limit: BigInt(0) };

  return {
    allowed: info.storageUsedBytes + BigInt(fileSizeBytes) <= info.storageLimitBytes,
    used: info.storageUsedBytes,
    limit: info.storageLimitBytes,
  };
}

/**
 * Check if user has a specific feature enabled
 */
export async function checkFeatureAccess(userId: string, feature: 'bulkSend' | 'apiAccess'): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      bulkSendEnabled: true,
      apiAccessEnabled: true,
    },
  });

  if (!user) return false;

  if (feature === 'bulkSend') return user.bulkSendEnabled;
  if (feature === 'apiAccess') return user.apiAccessEnabled;
  return false;
}

/**
 * Increment user's storage used counter
 */
export async function incrementStorageUsed(userId: string, bytes: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      storageUsedBytes: { increment: bytes },
    },
  });
}

/**
 * Apply plan tier defaults to a user (used on subscription change)
 */
export async function applyPlanLimits(userId: string, tier: PlanTier): Promise<void> {
  const defaults = PLAN_DEFAULTS[tier];
  await prisma.user.update({
    where: { id: userId },
    data: {
      planTier: tier,
      contactsLimit: defaults.contactsLimit,
      groupsLimit: defaults.groupsLimit,
      storageLimitBytes: defaults.storageLimitBytes,
      bulkSendEnabled: defaults.bulkSendEnabled,
      apiAccessEnabled: defaults.apiAccessEnabled,
    },
  });
}

/**
 * Check if user's subscription is active (not paused/expired/cancelled/halted).
 * FREE tier users are always considered active.
 * Returns { active, status, message } so callers can return proper error responses.
 */
export async function checkSubscriptionActive(userId: string): Promise<{
  active: boolean;
  status: string;
  planTier: PlanTier;
  message: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      planTier: true,
      subscription: {
        select: { status: true },
      },
    },
  });

  if (!user) {
    return { active: false, status: 'UNKNOWN', planTier: 'FREE', message: 'User not found.' };
  }

  const planTier = user.planTier as PlanTier;

  // FREE users don't need an active subscription
  if (planTier === 'FREE') {
    return { active: true, status: 'FREE', planTier, message: '' };
  }

  const subStatus = user.subscription?.status;

  if (!subStatus) {
    return { active: false, status: 'NO_SUBSCRIPTION', planTier, message: 'No active subscription found. Please subscribe to a plan.' };
  }

  switch (subStatus) {
    case 'ACTIVE':
      return { active: true, status: subStatus, planTier, message: '' };
    case 'PAUSED':
      return { active: false, status: subStatus, planTier, message: 'Your subscription is paused. Resume your subscription to send and receive messages.' };
    case 'PAST_DUE':
      return { active: false, status: subStatus, planTier, message: 'Your subscription payment is past due. Please update your payment method.' };
    case 'CANCELLED':
      return { active: false, status: subStatus, planTier, message: 'Your subscription has been cancelled. Please resubscribe to continue.' };
    case 'EXPIRED':
      return { active: false, status: subStatus, planTier, message: 'Your subscription has expired. Please renew to continue.' };
    case 'INACTIVE':
      return { active: false, status: subStatus, planTier, message: 'Your subscription is inactive. Please complete your payment.' };
    default:
      return { active: false, status: subStatus, planTier, message: 'Your subscription is not active. Please check your subscription status.' };
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: bigint | number): string {
  const b = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  if (b === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
