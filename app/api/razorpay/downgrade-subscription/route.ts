/**
 * POST /api/razorpay/downgrade-subscription
 * Downgrade an active Gold subscription to Silver.
 * No payment needed — the user already paid for a higher plan.
 * Plan limits are applied immediately; billing changes at the next cycle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  updateRazorpaySubscriptionPlan,
  isRazorpayConfigured,
} from '@/lib/razorpay';
import { applyPlanLimits } from '@/lib/plan-limits';
import type { PlanTier } from '@/lib/plan-limits';

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
    const newPlanTier = body.planTier as string;

    if (newPlanTier !== 'SILVER') {
      return NextResponse.json(
        { error: 'Can only downgrade to Silver' },
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

    if (subscription.status !== 'ACTIVE' || !subscription.razorpaySubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription to downgrade' },
        { status: 400 }
      );
    }

    // Must be on Gold to downgrade to Silver
    if (subscription.plan.name !== 'GOLD') {
      return NextResponse.json(
        { error: 'Only Gold plan can be downgraded to Silver' },
        { status: 400 }
      );
    }

    // Get Silver plan from database
    const silverPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true, name: 'SILVER' },
    });

    if (!silverPlan) {
      return NextResponse.json(
        { error: 'Silver plan not configured' },
        { status: 500 }
      );
    }

    // Update the Razorpay subscription plan to Silver (billing changes at next cycle)
    await updateRazorpaySubscriptionPlan(
      subscription.razorpaySubscriptionId,
      'SILVER',
      'cycle_end'
    );

    // Update local DB immediately with Silver plan
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { planId: silverPlan.id },
    });

    // Apply Silver plan limits immediately
    await applyPlanLimits(userId, 'SILVER' as PlanTier);

    // Log downgrade event in subscription activity
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        userId,
        amount: 0,
        currency: 'INR',
        status: 'CAPTURED',
        paymentMethod: 'event_downgrade',
        billingPeriodStart: subscription.currentPeriodStart ?? new Date(),
        billingPeriodEnd: subscription.currentPeriodEnd ?? new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Downgraded to Silver. Your limits have been updated. From your next billing cycle you will be charged ₹${silverPlan.price}/month.`,
    });
  } catch (error: any) {
    console.error('Error downgrading subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to downgrade subscription' },
      { status: 500 }
    );
  }
}
