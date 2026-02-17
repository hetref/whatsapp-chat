/**
 * Razorpay Integration Utilities
 * Handles recurring subscription payments for SaaS
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';

// Environment variables validation
const NEXT_PUBLIC_RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const RAZORPAY_PLAN_ID = process.env.RAZORPAY_PLAN_ID; // Legacy / Silver plan ID
const RAZORPAY_SILVER_PLAN_ID = process.env.RAZORPAY_SILVER_PLAN_ID;
const RAZORPAY_GOLD_PLAN_ID = process.env.RAZORPAY_GOLD_PLAN_ID;

if (!NEXT_PUBLIC_RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn('⚠️ Razorpay credentials not configured. Payment features will be disabled.');
}

/**
 * Initialize Razorpay instance
 */
export function getRazorpayInstance(): Razorpay | null {
  if (!NEXT_PUBLIC_RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: NEXT_PUBLIC_RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}

/**
 * Create Razorpay Subscription for recurring payments
 * This creates a subscription that auto-charges the user every month
 */
export async function createRazorpaySubscription(
  userId: string,
  customerId?: string,
  options?: {
    totalCount?: number;
    startAt?: number;
    expireBy?: number;
    planTier?: 'SILVER' | 'GOLD';
  }
) {
  const razorpay = getRazorpayInstance();

  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  const planId = getRazorpayPlanId(options?.planTier);
  if (!planId) {
    throw new Error('Razorpay Plan ID not configured for the selected tier.');
  }

  try {
    const subscriptionData: any = {
      plan_id: planId,
      total_count: options?.totalCount || 120, // 10 years max
      quantity: 1,
      customer_notify: 1, // Razorpay sends email/SMS
      notes: {
        userId,
        purpose: 'wachat_premium_subscription',
      },
    };

    // Add customer ID if provided
    if (customerId) {
      subscriptionData.customer_id = customerId;
    }

    // Optional: Start at a specific time
    if (options?.startAt) {
      subscriptionData.start_at = options.startAt;
    }

    // Optional: Link expiry time
    if (options?.expireBy) {
      subscriptionData.expire_by = options.expireBy;
    }

    const subscription = await razorpay.subscriptions.create(subscriptionData);
    return subscription;
  } catch (error: any) {
    console.error('Error creating Razorpay subscription:', error);
    throw new Error(error.error?.description || 'Failed to create subscription');
  }
}

/**
 * Fetch subscription details from Razorpay
 */
export async function fetchSubscriptionDetails(subscriptionId: string) {
  const razorpay = getRazorpayInstance();

  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  try {
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw new Error('Failed to fetch subscription details');
  }
}

/**
 * Cancel Razorpay subscription
 * @param cancelAtCycleEnd - If true, subscription continues till current period ends
 */
export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd: boolean = true
) {
  const razorpay = getRazorpayInstance();

  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  try {
    const subscription = await razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
    return subscription;
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    throw new Error(error.error?.description || 'Failed to cancel subscription');
  }
}

/**
 * Pause Razorpay subscription (temporarily stop billing)
 */
export async function pauseRazorpaySubscription(subscriptionId: string) {
  const razorpay = getRazorpayInstance();

  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  try {
    const subscription = await razorpay.subscriptions.pause(subscriptionId);
    return subscription;
  } catch (error: any) {
    console.error('Error pausing subscription:', error);
    throw new Error(error.error?.description || 'Failed to pause subscription');
  }
}

/**
 * Resume a paused Razorpay subscription
 */
export async function resumeRazorpaySubscription(subscriptionId: string) {
  const razorpay = getRazorpayInstance();

  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  try {
    const subscription = await razorpay.subscriptions.resume(subscriptionId);
    return subscription;
  } catch (error: any) {
    console.error('Error resuming subscription:', error);
    throw new Error(error.error?.description || 'Failed to resume subscription');
  }
}

/**
 * Create Razorpay order for one-time payment (kept for backwards compatibility)
 */
export async function createRazorpayOrder(amount: number, userId: string) {
  const razorpay = getRazorpayInstance();

  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  try {
    const shortId = userId.slice(-8);
    const timestamp = Date.now().toString().slice(-10);
    const receipt = `rcpt_${shortId}_${timestamp}`;

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
      notes: {
        userId,
        purpose: 'subscription_payment',
      },
    });

    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error('Failed to create payment order');
  }
}

/**
 * Verify Razorpay subscription payment signature
 */
export function verifySubscriptionSignature(
  subscriptionId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret key not configured');
  }

  try {
    const body = paymentId + '|' + subscriptionId;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying subscription signature:', error);
    return false;
  }
}

/**
 * Verify Razorpay payment signature (for one-time payments)
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret key not configured');
  }

  try {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying Razorpay signature:', error);
    return false;
  }
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    throw new Error('Razorpay webhook secret not configured');
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 */
export async function fetchPaymentDetails(paymentId: string) {
  const razorpay = getRazorpayInstance();

  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw new Error('Failed to fetch payment details');
  }
}

/**
 * Create Razorpay customer
 */
export async function createRazorpayCustomer(
  name: string,
  email: string,
  contact?: string
) {
  const razorpay = getRazorpayInstance();

  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  try {
    const customerData: any = {
      name,
      email,
      fail_existing: '0', // Return existing customer if email matches
    };

    if (contact) {
      customerData.contact = contact;
    }

    const customer = await razorpay.customers.create(customerData);
    return customer;
  } catch (error) {
    console.error('Error creating Razorpay customer:', error);
    throw new Error('Failed to create customer');
  }
}

/**
 * Calculate billing period from subscription charge date
 */
export function calculateBillingPeriod(chargeAt: Date = new Date()) {
  const currentPeriodStart = new Date(chargeAt);
  const currentPeriodEnd = new Date(chargeAt);
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

  return {
    currentPeriodStart,
    currentPeriodEnd,
  };
}

/**
 * Format amount for display (₹500.00)
 */
export function formatAmount(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Check if Razorpay is properly configured
 */
export function isRazorpayConfigured(): boolean {
  return !!(NEXT_PUBLIC_RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

/**
 * Get Razorpay Plan ID for a specific plan tier
 */
export function getRazorpayPlanId(tier?: 'SILVER' | 'GOLD'): string | undefined {
  if (tier === 'GOLD') return RAZORPAY_GOLD_PLAN_ID;
  if (tier === 'SILVER') return RAZORPAY_SILVER_PLAN_ID || RAZORPAY_PLAN_ID;
  // Default to Silver / legacy
  return RAZORPAY_SILVER_PLAN_ID || RAZORPAY_PLAN_ID;
}

// Keep for backwards compatibility
export const calculateNextBillingPeriod = calculateBillingPeriod;
