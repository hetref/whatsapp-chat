/**
 * POST /api/razorpay/webhook
 * Handle Razorpay webhooks for automated payment updates
 * 
 * Webhook events handled (Subscriptions API):
 * - subscription.activated: First payment successful, subscription active
 * - subscription.charged: Recurring payment captured (auto-renewal)
 * - subscription.cancelled: Subscription cancelled
 * - subscription.paused: Subscription paused
 * - subscription.resumed: Subscription resumed
 * - subscription.pending: Payment pending/retrying
 * - subscription.halted: Payment failed, subscription halted
 * 
 * Legacy events (Orders API - still supported):
 * - payment.captured: One-time payment successful
 * - payment.failed: Payment failed
 * - payment.authorized: Payment authorized
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWebhookSignature, calculateNextBillingPeriod } from '@/lib/razorpay';
import { applyPlanLimits, PLAN_DEFAULTS } from '@/lib/plan-limits';
import type { PlanTier } from '@/lib/plan-limits';

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('Missing webhook signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const subscriptionEntity = payload.payload?.subscription?.entity;

    console.log(`📨 Webhook received: ${event}`);

    // Handle different webhook events
    switch (event) {
      // === SUBSCRIPTION EVENTS (Recurring Payments) ===
      case 'subscription.activated':
        await handleSubscriptionActivated(subscriptionEntity, paymentEntity);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(subscriptionEntity, paymentEntity);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(subscriptionEntity);
        break;

      case 'subscription.paused':
        await handleSubscriptionPaused(subscriptionEntity);
        break;

      case 'subscription.resumed':
        await handleSubscriptionResumed(subscriptionEntity);
        break;

      case 'subscription.pending':
        await handleSubscriptionPending(subscriptionEntity);
        break;

      case 'subscription.halted':
        await handleSubscriptionHalted(subscriptionEntity);
        break;

      // === LEGACY ONE-TIME PAYMENT EVENTS ===
      case 'payment.captured':
        await handlePaymentCaptured(paymentEntity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(paymentEntity);
        break;

      case 'payment.authorized':
        await handlePaymentAuthorized(paymentEntity);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// ========================================
// SUBSCRIPTION EVENT HANDLERS (RECURRING)
// ========================================

/**
 * Handle subscription.activated event
 * Called when user completes first payment and subscription becomes active
 */
async function handleSubscriptionActivated(subscription: any, payment: any) {
  if (!subscription) return;

  const { id: subscriptionId, customer_id: customerId, notes } = subscription;
  const userId = notes?.userId;

  if (!userId) {
    console.error('No userId in subscription notes');
    return;
  }

  // Find user's subscription record
  const userSubscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!userSubscription) {
    console.error(`Subscription not found for user: ${userId}`);
    return;
  }

  // Calculate billing period
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

  // Update subscription to ACTIVE
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: 'ACTIVE',
      razorpaySubscriptionId: subscriptionId,
      razorpayCustomerId: customerId,
      startDate: userSubscription.startDate || currentPeriodStart,
      currentPeriodStart,
      currentPeriodEnd,
      autoRenew: true,
    },
  });

  // Create payment record if payment entity exists
  if (payment) {
    const existingPayment = await prisma.payment.findUnique({
      where: { razorpayPaymentId: payment.id },
    });

    if (!existingPayment) {
      await prisma.payment.create({
        data: {
          subscriptionId: userSubscription.id,
          userId,
          amount: payment.amount / 100,
          currency: payment.currency || 'INR',
          status: 'CAPTURED',
          razorpayPaymentId: payment.id,
          razorpayOrderId: subscriptionId, // Use subscription ID as reference
          paymentMethod: payment.method,
          billingPeriodStart: currentPeriodStart,
          billingPeriodEnd: currentPeriodEnd,
        },
      });
    }
  }

  // Activate user and apply plan limits based on subscription plan
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: userSubscription.planId },
  });

  const planTier = (plan?.name as PlanTier) || 'SILVER';
  await applyPlanLimits(userId, planTier);
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
  });

  console.log(`✅ Subscription activated for user: ${userId} (plan: ${planTier})`);
}

/**
 * Handle subscription.charged event
 * Called when recurring payment is captured (auto-renewal)
 */
async function handleSubscriptionCharged(subscription: any, payment: any) {
  if (!subscription || !payment) return;

  const { id: subscriptionId, notes } = subscription;
  const userId = notes?.userId;

  if (!userId) {
    // Try to find by subscription ID
    const dbSubscription = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    });

    if (!dbSubscription) {
      console.error('Could not find subscription for charged event');
      return;
    }

    await processSubscriptionRenewal(dbSubscription, payment, subscriptionId);
    return;
  }

  // Find user's subscription
  const userSubscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!userSubscription) {
    console.error(`Subscription not found for user: ${userId}`);
    return;
  }

  await processSubscriptionRenewal(userSubscription, payment, subscriptionId);
  console.log(`💰 Subscription renewed for user: ${userId}`);
}

/**
 * Process subscription renewal payment
 */
async function processSubscriptionRenewal(
  userSubscription: any,
  payment: any,
  subscriptionId: string
) {
  // Calculate new billing period
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

  // Update subscription with new billing period
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart,
      currentPeriodEnd,
    },
  });

  // Create payment record
  const existingPayment = await prisma.payment.findUnique({
    where: { razorpayPaymentId: payment.id },
  });

  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        subscriptionId: userSubscription.id,
        userId: userSubscription.userId,
        amount: payment.amount / 100,
        currency: payment.currency || 'INR',
        status: 'CAPTURED',
        razorpayPaymentId: payment.id,
        razorpayOrderId: subscriptionId,
        paymentMethod: payment.method,
        billingPeriodStart: currentPeriodStart,
        billingPeriodEnd: currentPeriodEnd,
      },
    });
  }

  // Ensure user is active with correct plan limits
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: userSubscription.planId },
  });
  const planTier = (plan?.name as PlanTier) || 'SILVER';
  await applyPlanLimits(userSubscription.userId, planTier);
  await prisma.user.update({
    where: { id: userSubscription.userId },
    data: { isActive: true },
  });
}

/**
 * Handle subscription.cancelled event
 * If the current billing period hasn't ended, keep plan benefits active
 * until the period expires. The /api/subscription/status endpoint handles
 * the actual downgrade when the period ends.
 */
async function handleSubscriptionCancelled(subscription: any) {
  if (!subscription) return;

  const { id: subscriptionId, notes, ended_at } = subscription;
  const userId = notes?.userId;

  // Find subscription by ID or user
  let userSubscription;
  if (userId) {
    userSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });
  } else {
    userSubscription = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    });
  }

  if (!userSubscription) {
    console.error('Subscription not found for cancellation');
    return;
  }

  // Update subscription status
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: 'CANCELLED',
      autoRenew: false,
      cancelledAt: ended_at ? new Date(ended_at * 1000) : new Date(),
    },
  });

  // Check if the current billing period still has remaining time
  const now = new Date();
  const periodEnd = userSubscription.currentPeriodEnd;
  const hasRemainingPeriod = periodEnd && new Date(periodEnd) > now;

  if (hasRemainingPeriod) {
    // User paid for this period — keep their plan benefits until it expires.
    // The /api/subscription/status endpoint will downgrade when the period ends.
    console.log(`🚫 Subscription cancelled for user: ${userSubscription.userId} - benefits active until ${periodEnd}`);
  } else {
    // Period already ended or no period data — downgrade immediately
    await applyPlanLimits(userSubscription.userId, 'FREE');
    await prisma.user.update({
      where: { id: userSubscription.userId },
      data: { isActive: false },
    });
    console.log(`🚫 Subscription cancelled for user: ${userSubscription.userId} - downgraded to FREE`);
  }
}

/**
 * Handle subscription.paused event
 */
async function handleSubscriptionPaused(subscription: any) {
  if (!subscription) return;

  const { id: subscriptionId, notes } = subscription;
  const userId = notes?.userId;

  // Find subscription
  let userSubscription;
  if (userId) {
    userSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });
  } else {
    userSubscription = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    });
  }

  if (!userSubscription) {
    console.error('Subscription not found for pause');
    return;
  }

  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: 'PAUSED',
      autoRenew: false,
    },
  });

  // Keep plan limits unchanged but block messaging by marking user inactive
  await prisma.user.update({
    where: { id: userSubscription.userId },
    data: { isActive: false },
  });

  console.log(`⏸️ Subscription paused for user: ${userSubscription.userId} - messaging blocked, limits preserved`);
}

/**
 * Handle subscription.resumed event
 */
async function handleSubscriptionResumed(subscription: any) {
  if (!subscription) return;

  const { id: subscriptionId, notes } = subscription;
  const userId = notes?.userId;

  // Find subscription
  let userSubscription;
  if (userId) {
    userSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });
  } else {
    userSubscription = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    });
  }

  if (!userSubscription) {
    console.error('Subscription not found for resume');
    return;
  }

  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: 'ACTIVE',
      autoRenew: true,
    },
  });

  // Re-apply plan limits and reactivate user
  const resumedPlan = await prisma.subscriptionPlan.findUnique({
    where: { id: userSubscription.planId },
  });
  const resumedTier = (resumedPlan?.name as PlanTier) || 'SILVER';
  await applyPlanLimits(userSubscription.userId, resumedTier);
  await prisma.user.update({
    where: { id: userSubscription.userId },
    data: { isActive: true },
  });

  console.log(`▶️ Subscription resumed for user: ${userSubscription.userId} (plan: ${resumedTier})`);
}

/**
 * Handle subscription.pending event
 * Payment is being retried
 */
async function handleSubscriptionPending(subscription: any) {
  if (!subscription) return;

  const { id: subscriptionId, notes } = subscription;
  const userId = notes?.userId;

  // Find subscription
  let userSubscription;
  if (userId) {
    userSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });
  } else {
    userSubscription = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    });
  }

  if (!userSubscription) {
    console.error('Subscription not found for pending');
    return;
  }

  // Set to PAST_DUE - payment is being retried, block messaging
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: { status: 'PAST_DUE' },
  });

  await prisma.user.update({
    where: { id: userSubscription.userId },
    data: { isActive: false },
  });

  console.log(`⏳ Subscription pending for user: ${userSubscription.userId} - messaging blocked until payment`);
}

/**
 * Handle subscription.halted event
 * Payment failed after all retry attempts
 */
async function handleSubscriptionHalted(subscription: any) {
  if (!subscription) return;

  const { id: subscriptionId, notes } = subscription;
  const userId = notes?.userId;

  // Find subscription
  let userSubscription;
  if (userId) {
    userSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });
  } else {
    userSubscription = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    });
  }

  if (!userSubscription) {
    console.error('Subscription not found for halt');
    return;
  }

  // Set to EXPIRED - subscription halted due to payment failure
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: 'EXPIRED',
      autoRenew: false,
    },
  });

  // Deactivate user and downgrade to FREE plan
  await applyPlanLimits(userSubscription.userId, 'FREE');
  await prisma.user.update({
    where: { id: userSubscription.userId },
    data: { isActive: false },
  });

  console.log(`🛑 Subscription halted for user: ${userSubscription.userId}`);
}

// ========================================
// LEGACY ONE-TIME PAYMENT HANDLERS
// ========================================

/**
 * Handle payment.captured event
 */
async function handlePaymentCaptured(payment: any) {
  if (!payment) return;

  const { id: paymentId, order_id: orderId, amount, notes } = payment;
  const userId = notes?.userId;

  if (!userId) {
    console.error('No userId in payment notes');
    return;
  }

  // Find user's subscription
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    console.error(`Subscription not found for user: ${userId}`);
    return;
  }

  // Calculate billing period
  const { currentPeriodStart, currentPeriodEnd } = calculateNextBillingPeriod();

  // Update subscription to ACTIVE
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      startDate: subscription.startDate || currentPeriodStart,
      currentPeriodStart,
      currentPeriodEnd,
    },
  });

  // Create payment record if not exists
  const existingPayment = await prisma.payment.findUnique({
    where: { razorpayPaymentId: paymentId },
  });

  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        userId,
        amount: amount / 100, // Convert from paise
        currency: 'INR',
        status: 'CAPTURED',
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        paymentMethod: payment.method,
        billingPeriodStart: currentPeriodStart,
        billingPeriodEnd: currentPeriodEnd,
      },
    });
  }

  // Activate user
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
  });

  console.log(`✅ Payment captured for user: ${userId}`);
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payment: any) {
  if (!payment) return;

  const { id: paymentId, order_id: orderId, amount, notes, error_description } = payment;
  const userId = notes?.userId;

  if (!userId) {
    console.error('No userId in payment notes');
    return;
  }

  // Find user's subscription
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    console.error(`Subscription not found for user: ${userId}`);
    return;
  }

  // Update subscription to PAST_DUE if it was ACTIVE
  if (subscription.status === 'ACTIVE') {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'PAST_DUE' },
    });
  }

  // Create failed payment record
  const { currentPeriodStart, currentPeriodEnd } = calculateNextBillingPeriod();

  await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      userId,
      amount: amount / 100,
      currency: 'INR',
      status: 'FAILED',
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      paymentMethod: payment.method,
      failureReason: error_description,
      billingPeriodStart: currentPeriodStart,
      billingPeriodEnd: currentPeriodEnd,
    },
  });

  console.log(`❌ Payment failed for user: ${userId} - ${error_description}`);
}

/**
 * Handle payment.authorized event
 */
async function handlePaymentAuthorized(payment: any) {
  if (!payment) return;

  const { id: paymentId, order_id: orderId, amount, notes } = payment;
  const userId = notes?.userId;

  if (!userId) {
    console.error('No userId in payment notes');
    return;
  }

  // Find user's subscription
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    console.error(`Subscription not found for user: ${userId}`);
    return;
  }

  // Create payment record with AUTHORIZED status
  const { currentPeriodStart, currentPeriodEnd } = calculateNextBillingPeriod();

  const existingPayment = await prisma.payment.findUnique({
    where: { razorpayPaymentId: paymentId },
  });

  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        userId,
        amount: amount / 100,
        currency: 'INR',
        status: 'AUTHORIZED',
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        paymentMethod: payment.method,
        billingPeriodStart: currentPeriodStart,
        billingPeriodEnd: currentPeriodEnd,
      },
    });
  }

  console.log(`✅ Payment authorized for user: ${userId}`);
}
