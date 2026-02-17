/**
 * GET /api/subscription/status
 * Get current user's subscription status and details
 * 
 * This endpoint auto-creates users in the database if they only exist in Clerk.
 * This ensures smooth UX - users can check status before subscribing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getUserPlanInfo, formatBytes, checkSubscriptionActive } from '@/lib/plan-limits';
import type { PlanTier } from '@/lib/plan-limits';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with subscription details
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Last 5 payments
        },
      },
    });

    // Auto-create user if they exist in Clerk but not in our database
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          isActive: false,
        },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });
      console.log(`✅ Auto-created user in database: ${userId}`);
    }

    // If no subscription, return as free user
    if (!user.subscription) {
      const planInfo = await getUserPlanInfo(userId);
      const subActiveCheck = await checkSubscriptionActive(userId);
      return NextResponse.json({
        hasSubscription: false,
        isActive: true, // Free users are active
        daysRemaining: null,
        status: 'FREE',
        planTier: 'FREE',
        messagingBlocked: !subActiveCheck.active,
        messagingBlockedReason: subActiveCheck.active ? null : subActiveCheck.message,
        usage: planInfo ? {
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
        } : null,
        message: 'Free plan. Upgrade for more features.',
      });
    }

    // For INACTIVE subscriptions (not yet paid), treat as free
    if (user.subscription.status === 'INACTIVE') {
      const planInfo = await getUserPlanInfo(userId);
      const subActiveCheck = await checkSubscriptionActive(userId);
      return NextResponse.json({
        hasSubscription: true,
        isActive: true, // Free users are active
        daysRemaining: null,
        planTier: user.planTier || 'FREE',
        messagingBlocked: !subActiveCheck.active,
        messagingBlockedReason: subActiveCheck.active ? null : subActiveCheck.message,
        usage: planInfo ? {
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
        } : null,
        subscription: {
          id: user.subscription.id,
          status: 'INACTIVE',
          startDate: user.subscription.startDate,
          currentPeriodStart: user.subscription.currentPeriodStart,
          currentPeriodEnd: user.subscription.currentPeriodEnd,
          autoRenew: user.subscription.autoRenew,
          cancelledAt: user.subscription.cancelledAt,
          daysRemaining: null,
          isExpired: false,
          plan: {
            name: user.subscription.plan.name,
            displayName: user.subscription.plan.displayName,
            description: user.subscription.plan.description,
            price: Number(user.subscription.plan.price),
            currency: user.subscription.plan.currency,
          },
        },
        recentPayments: [],
        message: 'Subscription pending. Complete payment to activate.',
      });
    }

    // Check if subscription billing period has ended (only for ACTIVE/CANCELLED)
    const now = new Date();
    const isExpired = user.subscription.currentPeriodEnd
      ? new Date(user.subscription.currentPeriodEnd) < now
      : false; // If no end date and already active, not expired yet

    // Calculate days remaining (only if not expired)
    let daysRemaining = 0;
    if (user.subscription.currentPeriodEnd && !isExpired) {
      const endDate = new Date(user.subscription.currentPeriodEnd);
      const diffTime = endDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Determine if user should have access
    // Access is granted if:
    // 1. Status is ACTIVE and billing period hasn't ended
    // 2. Status is CANCELLED but billing period hasn't ended (they paid for this period)
    // 3. Status is PAUSED (paused subscriptions still have access until period ends)
    const hasAccess = !isExpired &&
      (user.subscription.status === 'ACTIVE' ||
        user.subscription.status === 'CANCELLED' ||
        user.subscription.status === 'PAUSED');

    // If subscription expired, update status in database and downgrade to FREE
    if (isExpired &&
      user.subscription.status !== 'EXPIRED') {
      const { applyPlanLimits } = await import('@/lib/plan-limits');
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: user.subscription.id },
          data: { status: 'EXPIRED' },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { isActive: false },
        }),
      ]);
      await applyPlanLimits(userId, 'FREE');
    }

    // Also sync User.isActive — in the freemium model, users are always "active"
    // (they just have limited features). We keep isActive to distinguish paid subscribers.
    if (user.isActive !== hasAccess) {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: hasAccess },
      });
    }

    // If user still has access (e.g. CANCELLED but period not expired),
    // ensure plan limits match the subscription tier they paid for.
    // This fixes cases where the webhook prematurely downgraded to FREE.
    const subscriptionPlanTier = (user.subscription.plan.name as PlanTier) || 'SILVER';
    if (hasAccess && user.planTier !== subscriptionPlanTier) {
      const { applyPlanLimits } = await import('@/lib/plan-limits');
      await applyPlanLimits(userId, subscriptionPlanTier);
      console.log(`🔄 Restored plan limits to ${subscriptionPlanTier} for user ${userId} (was ${user.planTier})`);
    }

    const planInfo = await getUserPlanInfo(userId);
    const subActiveCheck = await checkSubscriptionActive(userId);
    // Use the effective plan tier (may have been restored above)
    const effectivePlanTier = hasAccess ? subscriptionPlanTier : (user.planTier || 'FREE');

    return NextResponse.json({
      hasSubscription: true,
      isActive: hasAccess, // Calculated dynamically, not from DB
      daysRemaining,
      planTier: effectivePlanTier,
      messagingBlocked: !subActiveCheck.active,
      messagingBlockedReason: subActiveCheck.active ? null : subActiveCheck.message,
      usage: planInfo ? {
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
      } : null,
      subscription: {
        id: user.subscription.id,
        status: isExpired ? 'EXPIRED' : user.subscription.status,
        startDate: user.subscription.startDate,
        currentPeriodStart: user.subscription.currentPeriodStart,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        autoRenew: user.subscription.autoRenew,
        cancelledAt: user.subscription.cancelledAt,
        razorpaySubscriptionId: user.subscription.razorpaySubscriptionId, // Needed for cancel/pause
        daysRemaining,
        isExpired,
        plan: {
          name: user.subscription.plan.name,
          displayName: user.subscription.plan.displayName,
          description: user.subscription.plan.description,
          price: Number(user.subscription.plan.price),
          currency: user.subscription.plan.currency,
        },
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
    console.error('Error fetching subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
