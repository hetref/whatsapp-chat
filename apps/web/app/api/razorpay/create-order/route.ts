/**
 * POST /api/razorpay/create-order
 * Create a Razorpay order for subscription payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { createRazorpayOrder, isRazorpayConfigured } from '@/lib/razorpay';

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

    // Check if Razorpay is configured
    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 503 }
      );
    }

    // Get or create user in database
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!user) {
      // Create user if doesn't exist
      user = await prisma.user.create({
        data: { id: userId },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });
    }

    // Check if user already has an active subscription
    if (user.subscription?.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    // Get the Premium plan
    const premiumPlan = await prisma.subscriptionPlan.findUnique({
      where: { name: 'PREMIUM' },
    });

    if (!premiumPlan || !premiumPlan.isActive) {
      return NextResponse.json(
        { error: 'Premium plan not available' },
        { status: 404 }
      );
    }

    // Create Razorpay order
    const order = await createRazorpayOrder(
      Number(premiumPlan.price),
      userId
    );

    // Create or update subscription record with INACTIVE status
    let subscription = user.subscription;
    
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          planId: premiumPlan.id,
          status: 'INACTIVE',
          autoRenew: true,
        },
        include: {
          plan: true,
        },
      });
    }

    // Return order details for frontend
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      plan: {
        name: premiumPlan.displayName,
        price: Number(premiumPlan.price),
        currency: premiumPlan.currency,
      },
      subscription: {
        id: subscription?.id || 'creating',
        status: subscription?.status || 'INACTIVE',
      },
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
