/**
 * POST /api/razorpay/verify-subscription
 * Verify subscription payment and activate the subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  verifySubscriptionSignature,
  fetchSubscriptionDetails,
  fetchPaymentDetails,
  calculateBillingPeriod,
} from '@/lib/razorpay';
import { applyPlanLimits } from '@/lib/plan-limits';
import type { PlanTier } from '@/lib/plan-limits';

interface VerifySubscriptionBody {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
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
    const body: VerifySubscriptionBody = await req.json();
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify subscription payment signature
    const isValid = verifySubscriptionSignature(
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Fetch subscription details from Razorpay
    const rzpSubscription = await fetchSubscriptionDetails(razorpay_subscription_id);

    // Valid statuses after payment: created (just paid), authenticated, active
    // Razorpay may take a moment to update status from created → active
    const validStatuses = ['created', 'authenticated', 'active'];
    if (!validStatuses.includes(rzpSubscription.status)) {
      return NextResponse.json(
        { error: `Subscription status is ${rzpSubscription.status}. Cannot activate.` },
        { status: 400 }
      );
    }

    // Fetch payment details
    const payment = await fetchPaymentDetails(razorpay_payment_id);

    // Get user with subscription
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
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Calculate billing period (starts now, ends in 30 days)
    const { currentPeriodStart, currentPeriodEnd } = calculateBillingPeriod();

    // Update subscription to ACTIVE
    const updatedSubscription = await prisma.subscription.update({
      where: { id: user.subscription.id },
      data: {
        status: 'ACTIVE',
        razorpaySubscriptionId: razorpay_subscription_id,
        startDate: user.subscription.startDate || currentPeriodStart,
        currentPeriodStart,
        currentPeriodEnd,
        autoRenew: true, // Subscriptions auto-renew by default
        cancelledAt: null,
      },
    });

    // Create payment record
    const paymentRecord = await prisma.payment.create({
      data: {
        subscriptionId: user.subscription.id,
        userId,
        amount: Number(payment.amount) / 100, // Convert from paise to rupees
        currency: payment.currency,
        status: payment.status === 'captured' ? 'CAPTURED' : 'AUTHORIZED',
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_subscription_id, // Use subscription ID as reference
        razorpaySignature: razorpay_signature,
        paymentMethod: payment.method,
        billingPeriodStart: currentPeriodStart,
        billingPeriodEnd: currentPeriodEnd,
      },
    });

    // Activate user account and apply plan limits
    const planTier = (user.subscription.plan.name as string).toUpperCase() as PlanTier;
    await applyPlanLimits(userId, planTier);
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully!',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        currentPeriodStart: updatedSubscription.currentPeriodStart,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
        autoRenew: updatedSubscription.autoRenew,
        plan: {
          id: user.subscription.plan.id,
          name: user.subscription.plan.name,
          displayName: user.subscription.plan.displayName,
          price: Number(user.subscription.plan.price),
          currency: user.subscription.plan.currency,
        },
      },
      payment: {
        id: paymentRecord.id,
        amount: Number(paymentRecord.amount),
        currency: paymentRecord.currency,
        status: paymentRecord.status,
      },
    });
  } catch (error: any) {
    console.error('Error verifying subscription:', error);
    return NextResponse.json(
      { error: 'Failed to verify subscription' },
      { status: 500 }
    );
  }
}
