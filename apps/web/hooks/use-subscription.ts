"use client";

import { useState, useEffect, useCallback } from "react";

export interface SubscriptionData {
  subscription: {
    id: string;
    status: "INACTIVE" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED" | "PAUSED";
    startDate: string | null;
    currentPeriodEnd: string | null;
    autoRenew: boolean;
    razorpaySubscriptionId?: string | null;
    plan: {
      id: string;
      name: string;
      price: number;
      currency: string;
      interval: string;
    };
  } | null;
  daysRemaining: number | null;
  isActive: boolean;
}

export interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  razorpayPaymentId: string | null;
  paymentMethod: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  createdAt: string;
}

interface UseSubscriptionReturn {
  data: SubscriptionData | null;
  payments: PaymentData[];
  loading: boolean;
  paymentsLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  fetchPayments: () => Promise<void>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  reactivateSubscription: () => Promise<{ success: boolean; error?: string }>;
}

/**
 * Custom hook for managing subscription state
 * Provides subscription data, payment history, and actions
 */
export function useSubscription(): UseSubscriptionReturn {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription status
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch("/api/subscription/status");
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || "Failed to fetch subscription");
      }
      
      setData(result);
    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch payment history
  const fetchPayments = useCallback(async () => {
    try {
      setPaymentsLoading(true);
      
      const res = await fetch("/api/subscription/payments");
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || "Failed to fetch payments");
      }
      
      setPayments(result.payments || []);
    } catch (err: any) {
      console.error("Error fetching payments:", err);
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  // Cancel subscription
  const cancelSubscription = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        return { success: false, error: result.error };
      }
      
      // Refresh subscription data
      await refresh();
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [refresh]);

  // Reactivate subscription
  const reactivateSubscription = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "DELETE",
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        return { success: false, error: result.error };
      }
      
      // Refresh subscription data
      await refresh();
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [refresh]);

  // Load subscription data on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    payments,
    loading,
    paymentsLoading,
    error,
    refresh,
    fetchPayments,
    cancelSubscription,
    reactivateSubscription,
  };
}

/**
 * Check if subscription is in a payable state (needs payment to use)
 * CANCELLED is NOT included because if period is still valid, user can just reactivate
 * Once period expires, status becomes EXPIRED automatically
 */
export function canMakePayment(status: string | undefined): boolean {
  return !status || ["INACTIVE", "EXPIRED"].includes(status);
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(status: string): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    ACTIVE: { label: "Active", variant: "default" },
    INACTIVE: { label: "Inactive", variant: "secondary" },
    PAST_DUE: { label: "Past Due", variant: "destructive" },
    CANCELLED: { label: "Cancelled", variant: "outline" },
    EXPIRED: { label: "Expired", variant: "destructive" },
    PAUSED: { label: "Paused", variant: "outline" },
  };
  
  return statusMap[status] || { label: status, variant: "secondary" };
}

/**
 * Format currency amount
 */
export function formatAmount(amount: number, currency: string = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
