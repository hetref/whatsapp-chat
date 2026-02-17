/**
 * POST /api/razorpay/verify-upgrade
 * Verify the one-time upgrade payment and then upgrade the subscription plan.
 * Called after the user pays the price difference (e.g. ₹500 for Silver → Gold).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  verifyRazorpaySignature,
  fetchPaymentDetails,
  updateRazorpaySubscriptionPlan,
} from '@/lib/razorpay';
import { applyPlanLimits } from '@/lib/plan-limits';
import type { PlanTier } from '@/lib/plan-limits';

interface VerifyUpgradeBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  newPlanTier: 'SILVER' | 'GOLD';
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: VerifyUpgradeBody = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, newPlanTier } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !newPlanTier) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!['SILVER', 'GOLD'].includes(newPlanTier)) {
      return NextResponse.json(
        { error: 'Invalid plan tier' },
        { status: 400 }
      );
    }

    // Verify payment signature
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Fetch payment details from Razorpay to confirm it's captured
    const payment = await fetchPaymentDetails(razorpay_payment_id);

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return NextResponse.json(
        { error: `Payment status is ${payment.status}. Cannot proceed with upgrade.` },
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
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const subscription = user.subscription;

    if (subscription.status !== 'ACTIVE' || !subscription.razorpaySubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription to upgrade' },
        { status: 400 }
      );
    }

    // Get the new plan from database
    const newPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true, name: newPlanTier },
    });

    if (!newPlan) {
      return NextResponse.json(
        { error: `No ${newPlanTier} plan configured` },
        { status: 500 }
      );
    }

    // Update Razorpay subscription to the new plan (billing changes at next cycle)
    await updateRazorpaySubscriptionPlan(
      subscription.razorpaySubscriptionId,
      newPlanTier,
      'cycle_end'
    );

    // Update local DB with the new plan
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { planId: newPlan.id },
    });

    // Record the upgrade payment
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        userId,
        amount: Number(payment.amount) / 100, // paise → rupees
        currency: payment.currency,
        status: payment.status === 'captured' ? 'CAPTURED' : 'AUTHORIZED',
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpaySignature: razorpay_signature,
        paymentMethod: payment.method,
        billingPeriodStart: subscription.currentPeriodStart ?? new Date(),
        billingPeriodEnd: subscription.currentPeriodEnd ?? new Date(),
      },
    });

    // Apply new plan limits immediately
    await applyPlanLimits(userId, newPlanTier as PlanTier);

    return NextResponse.json({
      success: true,
      message: `Upgraded to ${newPlan.displayName}! Your features are active now. From your next billing cycle you will be charged ₹${newPlan.price}/month.`,
    });
  } catch (error: any) {
    console.error('Error verifying upgrade:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify upgrade payment' },
      { status: 500 }
    );
  }
}
