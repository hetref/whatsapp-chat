/**
 * POST /api/razorpay/cancel-subscription
 * Cancel a recurring subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { cancelRazorpaySubscription } from '@/lib/razorpay';
import { applyPlanLimits } from '@/lib/plan-limits';

interface CancelSubscriptionBody {
  cancelAtCycleEnd?: boolean; // If true, subscription ends at current period end
}

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

    // Parse request body
    const body: CancelSubscriptionBody = await req.json().catch(() => ({}));
    const cancelAtCycleEnd = body.cancelAtCycleEnd ?? true; // Default to end of cycle

    // Get user's subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
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
        { error: 'No active Razorpay subscription found' },
        { status: 400 }
      );
    }

    // Guard: don't try to cancel an already-cancelled subscription in Razorpay
    if (subscription.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400 }
      );
    }

    // Cancel subscription in Razorpay
    const cancelledSubscription = await cancelRazorpaySubscription(
      subscription.razorpaySubscriptionId,
      cancelAtCycleEnd
    );

    // Update local subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        autoRenew: false,
        cancelledAt: new Date(),
        // Keep ACTIVE if cancelling at cycle end, otherwise set to CANCELLED
        status: cancelAtCycleEnd ? subscription.status : 'CANCELLED',
      },
    });

    // Log cancellation event in subscription activity
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

    // If immediate cancellation, deactivate user and downgrade to FREE limits
    if (!cancelAtCycleEnd) {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      await applyPlanLimits(userId, 'FREE');
    }

    return NextResponse.json({
      success: true,
      message: cancelAtCycleEnd
        ? `Subscription will be cancelled at the end of the billing period (${subscription.currentPeriodEnd?.toLocaleDateString()})`
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
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
