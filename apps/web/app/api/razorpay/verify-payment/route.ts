/**
 * POST /api/razorpay/verify-payment
 * Verify Razorpay payment and activate subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import {
  verifyRazorpaySignature,
  fetchPaymentDetails,
  calculateNextBillingPeriod,
} from '@/lib/razorpay';

interface VerifyPaymentBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
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
    const body: VerifyPaymentBody = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required payment parameters' },
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

    // Fetch payment details from Razorpay
    const paymentDetails = await fetchPaymentDetails(razorpay_payment_id);

    // Verify payment status
    if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
      return NextResponse.json(
        { error: 'Payment not successful' },
        { status: 400 }
      );
    }

    // Get user with subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!user || !user.subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Calculate billing period
    const { currentPeriodStart, currentPeriodEnd } = calculateNextBillingPeriod();

    // Update subscription to ACTIVE
    const updatedSubscription = await prisma.subscription.update({
      where: { id: user.subscription.id },
      data: {
        status: 'ACTIVE',
        startDate: user.subscription.startDate || currentPeriodStart,
        currentPeriodStart,
        currentPeriodEnd,
        autoRenew: true, // Reset autoRenew when new payment is made
        cancelledAt: null, // Clear any previous cancellation
        razorpayCustomerId: paymentDetails.customer_id || null,
      },
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        subscriptionId: user.subscription.id,
        userId,
        amount: Number(paymentDetails.amount) / 100, // Convert from paise to rupees
        currency: paymentDetails.currency,
        status: paymentDetails.status === 'captured' ? 'CAPTURED' : 'AUTHORIZED',
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpaySignature: razorpay_signature,
        paymentMethod: paymentDetails.method,
        billingPeriodStart: currentPeriodStart,
        billingPeriodEnd: currentPeriodEnd,
      },
    });

    // Activate user account
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified and subscription activated',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        currentPeriodStart: updatedSubscription.currentPeriodStart,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
        plan: user.subscription.plan,
      },
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
