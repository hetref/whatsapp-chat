/**
 * POST /api/razorpay/create-subscription
 * Create a Razorpay subscription for recurring monthly payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  createRazorpaySubscription,
  createRazorpayCustomer,
  getRazorpayPlanId,
  isRazorpayConfigured,
} from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    // Check if Razorpay is configured
    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    // Check if Razorpay plan ID is configured
    const razorpayPlanId = getRazorpayPlanId();
    if (!razorpayPlanId) {
      return NextResponse.json(
        { error: 'Subscription plan not configured. Please set RAZORPAY_PLAN_ID.' },
        { status: 500 }
      );
    }

    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current user details from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { error: 'User not found in authentication system' },
        { status: 404 }
      );
    }

    // Get user from database (should exist from when they accessed the app)
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    // If user doesn't exist in our DB, create them
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          isActive: false,
        },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      });
    }

    // Check if already has active subscription
    if (user.subscription?.status === 'ACTIVE' && user.subscription?.razorpaySubscriptionId) {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    // Get the subscription plan from database (must exist - seeded)
    const subscriptionPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
    });

    if (!subscriptionPlan) {
      return NextResponse.json(
        { error: 'No subscription plan configured. Please run database seed.' },
        { status: 500 }
      );
    }

    // Create or get Razorpay customer
    let razorpayCustomerId = user.subscription?.razorpayCustomerId;
    
    if (!razorpayCustomerId) {
      const email = clerkUser.emailAddresses[0]?.emailAddress || `${userId}@wachat.app`;
      const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'WaChat User';
      const phone = clerkUser.phoneNumbers[0]?.phoneNumber;

      const customer = await createRazorpayCustomer(name, email, phone);
      razorpayCustomerId = customer.id;
    }

    // Create or update subscription record in database
    let subscription = user.subscription;
    
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          planId: subscriptionPlan.id,
          status: 'INACTIVE',
          razorpayCustomerId,
          autoRenew: true,
        },
        include: { plan: true },
      });
    } else {
      subscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: { razorpayCustomerId },
        include: { plan: true },
      });
    }

    // Create Razorpay subscription (this uses RAZORPAY_PLAN_ID from env)
    const rzpSubscription = await createRazorpaySubscription(
      userId,
      razorpayCustomerId,
      { totalCount: 120 }
    );

    // Store the Razorpay subscription ID
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { razorpaySubscriptionId: rzpSubscription.id },
    });

    return NextResponse.json({
      success: true,
      subscription_id: rzpSubscription.id,
      razorpay: {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: rzpSubscription.id,
        name: 'WaChat',
        description: `${subscriptionPlan.displayName} - ₹${subscriptionPlan.price}/month`,
        prefill: {
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          contact: clerkUser.phoneNumbers[0]?.phoneNumber || '',
        },
      },
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

