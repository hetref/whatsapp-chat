/**
 * POST /api/razorpay/pause-subscription
 * Pause a recurring subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { pauseRazorpaySubscription } from '@/lib/razorpay';

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

    if (subscription.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Can only pause active subscriptions' },
        { status: 400 }
      );
    }

    // Pause subscription in Razorpay
    const pausedSubscription = await pauseRazorpaySubscription(
      subscription.razorpaySubscriptionId
    );

    // Update local subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'PAUSED',
        autoRenew: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription paused successfully. You can resume anytime.',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        autoRenew: updatedSubscription.autoRenew,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
      },
      razorpayStatus: pausedSubscription.status,
    });
  } catch (error: any) {
    console.error('Error pausing subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to pause subscription' },
      { status: 500 }
    );
  }
}
