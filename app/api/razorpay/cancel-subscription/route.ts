/**
 * POST /api/razorpay/cancel-subscription
 * Cancel a recurring subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { cancelRazorpaySubscription } from '@/lib/razorpay';

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

    // If immediate cancellation, deactivate user
    if (!cancelAtCycleEnd) {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
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
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
