/**
 * POST /api/razorpay/resume-subscription
 * Resume a paused subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { resumeRazorpaySubscription } from '@/lib/razorpay';
import { applyPlanLimits, PlanTier } from '@/lib/plan-limits';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!user || !user.subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    const subscription = user.subscription;

    if (!subscription.razorpaySubscriptionId) {
      return NextResponse.json(
        { error: 'No Razorpay subscription found' },
        { status: 400 }
      );
    }

    if (subscription.status !== 'PAUSED') {
      return NextResponse.json(
        { error: 'Can only resume paused subscriptions' },
        { status: 400 }
      );
    }

    // Resume subscription in Razorpay
    const resumedSubscription = await resumeRazorpaySubscription(
      subscription.razorpaySubscriptionId
    );

    // Update local subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        autoRenew: true,
      },
    });

    // Activate user and re-apply plan limits
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    // Re-apply the correct plan limits for the subscription tier
    const planTier = (subscription.plan?.name as PlanTier) || 'SILVER';
    await applyPlanLimits(userId, planTier);

    // Log resume event in subscription activity
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        userId,
        amount: 0,
        currency: 'INR',
        status: 'CAPTURED',
        paymentMethod: 'event_resume',
        billingPeriodStart: subscription.currentPeriodStart ?? new Date(),
        billingPeriodEnd: subscription.currentPeriodEnd ?? new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully!',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        autoRenew: updatedSubscription.autoRenew,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
      },
      razorpayStatus: resumedSubscription.status,
    });
  } catch (error: any) {
    console.error('Error resuming subscription:', error);
    return NextResponse.json(
      { error: 'Failed to resume subscription' },
      { status: 500 }
    );
  }
}
