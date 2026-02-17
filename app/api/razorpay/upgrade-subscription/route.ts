/**
 * POST /api/razorpay/upgrade-subscription
 * Create a Razorpay order for the price difference when upgrading Silver → Gold.
 * The actual plan upgrade happens only after payment is verified via /api/razorpay/verify-upgrade.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  createRazorpayOrder,
  isRazorpayConfigured,
} from '@/lib/razorpay';

// Price map (in ₹) — must match PLANS on the billing page
const PLAN_PRICES: Record<string, number> = {
  SILVER: 499,
  GOLD: 999,
};

const PLAN_HIERARCHY: Record<string, number> = {
  FREE: 0,
  SILVER: 1,
  GOLD: 2,
};

export async function POST(req: NextRequest) {
  try {
    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const newPlanTier = body.planTier as 'SILVER' | 'GOLD';

    if (!newPlanTier || !['SILVER', 'GOLD'].includes(newPlanTier)) {
      return NextResponse.json(
        { error: 'Invalid plan tier' },
        { status: 400 }
      );
    }

    // Get user with subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!user?.subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    const subscription = user.subscription;

    // Must have an active subscription with a Razorpay subscription ID
    if (subscription.status !== 'ACTIVE' || !subscription.razorpaySubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription to upgrade' },
        { status: 400 }
      );
    }

    // Must be upgrading to a higher plan
    const currentPlanName = subscription.plan.name;
    if ((PLAN_HIERARCHY[newPlanTier] ?? 0) <= (PLAN_HIERARCHY[currentPlanName] ?? 0)) {
      return NextResponse.json(
        { error: 'Can only upgrade to a higher plan' },
        { status: 400 }
      );
    }

    // Calculate the price difference
    const currentPrice = PLAN_PRICES[currentPlanName] ?? 0;
    const newPrice = PLAN_PRICES[newPlanTier] ?? 0;
    const upgradeCost = newPrice - currentPrice;

    if (upgradeCost <= 0) {
      return NextResponse.json(
        { error: 'Invalid upgrade — no price difference' },
        { status: 400 }
      );
    }

    // Create a one-time Razorpay order for the difference amount
    const order = await createRazorpayOrder(upgradeCost, userId);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: upgradeCost,
      currency: 'INR',
      currentPlan: currentPlanName,
      newPlan: newPlanTier,
    });
  } catch (error: any) {
    console.error('Error creating upgrade order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create upgrade order' },
      { status: 500 }
    );
  }
}
