/**
 * POST /api/subscription/cancel
 * Cancel user's subscription (stops auto-renewal)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

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
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Check if already cancelled
    if (subscription.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Subscription already cancelled' },
        { status: 400 }
      );
    }

    // Update subscription status to CANCELLED
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        autoRenew: false,
        cancelledAt: new Date(),
      },
    });

    // Note: We don't deactivate the user immediately
    // They can continue using the service until currentPeriodEnd

    return NextResponse.json({
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
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subscription/cancel
 * Reactivate a cancelled subscription (before expiry)
 */
export async function DELETE(req: NextRequest) {
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
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Check if it can be reactivated
    if (subscription.status !== 'CANCELLED') {
      return NextResponse.json(
        { error: 'Subscription is not cancelled' },
        { status: 400 }
      );
    }

    // Check if subscription period is still valid
    const now = new Date();
    const periodEnd = subscription.currentPeriodEnd;
    
    if (!periodEnd || new Date(periodEnd) < now) {
      return NextResponse.json(
        { error: 'Subscription period has expired. Please create a new subscription.' },
        { status: 400 }
      );
    }

    // Reactivate subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        autoRenew: true,
        cancelledAt: null,
      },
    });

    return NextResponse.json({
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
    console.error('Error reactivating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}
