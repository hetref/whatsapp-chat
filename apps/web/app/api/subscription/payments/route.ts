import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/subscription/payments
 * Fetch payment history for the current user
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!subscription) {
      return NextResponse.json({ payments: [] });
    }

    // Fetch all payments for this subscription
    const payments = await prisma.payment.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        razorpayPaymentId: true,
        razorpayOrderId: true,
        paymentMethod: true,
        billingPeriodStart: true,
        billingPeriodEnd: true,
        failureReason: true,
        createdAt: true,
      },
    });

    // Convert Decimal to number for JSON serialization
    const formattedPayments = payments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
    }));

    return NextResponse.json({ payments: formattedPayments });
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}
