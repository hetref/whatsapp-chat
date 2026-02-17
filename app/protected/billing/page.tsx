"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import {
  useSubscription,
  formatSubscriptionStatus,
  formatAmount,
  canMakePayment,
} from "@/hooks/use-subscription";
import type { PaymentData } from "@/hooks/use-subscription";
import { useSubscriptionStatus } from "@/components/subscription-guard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  CreditCard,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowDown,
  Pause,
  Play,
  XCircle,
  Check,
  X,
  Crown,
  Zap,
  Users,
  HardDrive,
  MessageSquare,
  Key,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLANS = [
  {
    tier: "FREE" as const,
    name: "Free",
    price: 0,
    description: "Get started with basic features",
    features: [
      { label: "10 Contacts", included: true },
      { label: "2 Broadcast Groups", included: true },
      { label: "5 GB Storage", included: true },
      { label: "Bulk Messaging", included: false },
      { label: "API Access", included: false },
    ],
  },
  {
    tier: "SILVER" as const,
    name: "Silver",
    price: 499,
    description: "For growing businesses",
    popular: true,
    features: [
      { label: "15,000 Contacts", included: true },
      { label: "100 Broadcast Groups", included: true },
      { label: "40 GB Storage", included: true },
      { label: "Bulk Messaging (10K)", included: true },
      { label: "API Access", included: true },
    ],
  },
  {
    tier: "GOLD" as const,
    name: "Gold",
    price: 999,
    description: "For large-scale operations",
    features: [
      { label: "80,000 Contacts", included: true },
      { label: "500 Broadcast Groups", included: true },
      { label: "160 GB Storage", included: true },
      { label: "Bulk Messaging (80K)", included: true },
      { label: "API Access", included: true },
    ],
  },
];

export default function BillingPage() {
  const {
    data,
    payments,
    loading,
    paymentsLoading,
    error,
    refresh,
    fetchPayments,
  } = useSubscription();

  const { planTier } = useSubscriptionStatus();

  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Handle subscribe to a specific plan
  const handleSubscribe = async (tier: "SILVER" | "GOLD") => {
    try {
      setPaymentLoading(tier);
      setActionError(null);
      setActionSuccess(null);

      const subRes = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier: tier }),
      });

      const subData = await subRes.json();

      if (subData.error) {
        throw new Error(subData.error);
      }

      const plan = PLANS.find((p) => p.tier === tier);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: subData.subscription_id,
        name: "WaChat",
        description: `${plan?.name} Plan - ₹${plan?.price}/month`,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/razorpay/verify-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setActionSuccess(
                `${plan?.name} plan activated! Refreshing...`,
              );
              refresh();
              fetchPayments();
              // Reload to update sidebar
              setTimeout(() => window.location.reload(), 1500);
            } else {
              setActionError(
                verifyData.error || "Subscription verification failed",
              );
            }
          } catch (err: any) {
            setActionError(err.message || "Subscription verification failed");
          }
        },
        modal: {
          ondismiss: function () {
            setPaymentLoading(null);
          },
        },
        theme: {
          color: tier === "GOLD" ? "#d97706" : "#64748b",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      setActionError(err.message || "Failed to create subscription");
    } finally {
      setPaymentLoading(null);
    }
  };

  // Handle upgrade (Silver → Gold: pay the difference via Razorpay order)
  const handleUpgrade = async (tier: "SILVER" | "GOLD") => {
    try {
      setPaymentLoading(tier);
      setActionError(null);
      setActionSuccess(null);

      // Step 1: Create an order for the price difference
      const res = await fetch("/api/razorpay/upgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier: tier }),
      });

      const result = await res.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const plan = PLANS.find((p) => p.tier === tier);

      // Step 2: Open Razorpay checkout for the difference amount
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: result.amount * 100, // in paise
        currency: result.currency,
        order_id: result.order_id,
        name: "WaChat",
        description: `Upgrade to ${plan?.name} Plan (difference)`,
        handler: async function (response: any) {
          try {
            // Step 3: Verify payment and upgrade
            const verifyRes = await fetch("/api/razorpay/verify-upgrade", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                newPlanTier: tier,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setActionSuccess(verifyData.message);
              refresh();
              fetchPayments();
              setTimeout(() => window.location.reload(), 1500);
            } else {
              setActionError(
                verifyData.error || "Upgrade verification failed",
              );
            }
          } catch (err: any) {
            setActionError(err.message || "Upgrade verification failed");
          }
        },
        modal: {
          ondismiss: function () {
            setPaymentLoading(null);
          },
        },
        theme: {
          color: "#d97706",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      setActionError(err.message || "Failed to create upgrade order");
    } finally {
      setPaymentLoading(null);
    }
  };

  // Handle downgrade (Gold → Silver: no payment needed)
  const handleDowngrade = async (tier: "SILVER") => {
    if (
      !confirm(
        "Downgrade to Silver? Your plan limits will be updated immediately. Billing will change to ₹499/month from your next cycle.",
      )
    ) {
      return;
    }

    try {
      setActionLoading("downgrade");
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch("/api/razorpay/downgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier: tier }),
      });

      const result = await res.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setActionSuccess(result.message);
      refresh();
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setActionError(err.message || "Failed to downgrade subscription");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle cancel subscription
  const handleCancel = async (immediately = false) => {
    if (
      !confirm(
        immediately
          ? "Are you sure you want to cancel immediately? You will be downgraded to the Free plan."
          : "Are you sure you want to cancel? Your current plan will remain active until the end of the billing period.",
      )
    ) {
      return;
    }

    try {
      setActionLoading("cancel");
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch("/api/razorpay/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelAtCycleEnd: !immediately }),
      });

      const result = await res.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setActionSuccess(result.message);
      refresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel subscription");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle pause
  const handlePause = async () => {
    if (!confirm("Pause your subscription? You can resume anytime.")) return;

    try {
      setActionLoading("pause");
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch("/api/razorpay/pause-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      setActionSuccess(result.message);
      refresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to pause subscription");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle resume
  const handleResume = async () => {
    try {
      setActionLoading("resume");
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch("/api/razorpay/resume-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      setActionSuccess(result.message);
      refresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to resume subscription");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getPaymentStatusBadge = (payment: PaymentData) => {
    const isEvent = payment.paymentMethod?.startsWith("event_");

    if (isEvent) {
      const eventType = payment.paymentMethod?.replace("event_", "");
      const eventLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        cancel: { label: "Cancelled", variant: "destructive" },
        pause: { label: "Paused", variant: "outline" },
        resume: { label: "Resumed", variant: "default" },
        downgrade: { label: "Downgraded", variant: "secondary" },
      };
      const config = eventLabels[eventType || ""] || { label: eventType || "Event", variant: "secondary" as const };
      return <Badge variant={config.variant}>{config.label}</Badge>;
    }

    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      CAPTURED: "default",
      PENDING: "secondary",
      FAILED: "destructive",
      REFUNDED: "outline",
      AUTHORIZED: "secondary",
    };
    const labels: Record<string, string> = {
      CAPTURED: "Subscribed",
      PENDING: "Pending",
      FAILED: "Failed",
      REFUNDED: "Refunded",
      AUTHORIZED: "Authorized",
    };
    return <Badge variant={variants[payment.status] || "secondary"}>{labels[payment.status] || payment.status}</Badge>;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const subscription = data?.subscription;
  const status = subscription?.status || "FREE";
  const currentTier = planTier || "FREE";

  // When subscription is cancelled (but benefits still active until period ends),
  // show FREE as the billing plan. Features still work via the effective plan tier.
  const isCancelledWithBenefits = status === "CANCELLED" && subscription?.currentPeriodEnd
    && new Date(subscription.currentPeriodEnd) > new Date();
  const displayTier = status === "CANCELLED" ? "FREE" : currentTier;
  const hasActiveSubscription = status === "ACTIVE" && subscription?.autoRenew && !!subscription?.razorpaySubscriptionId;

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <div className="h-full overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Plans & Billing</h1>
              <p className="text-muted-foreground">
                Choose the plan that&apos;s right for your business
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Alerts */}
          {actionError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {actionError}
            </div>
          )}

          {actionSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-600 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              {actionSuccess}
            </div>
          )}

          {/* Plan Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = displayTier === plan.tier;
              const isDowngrade =
                (displayTier === "GOLD" && plan.tier === "SILVER") ||
                (displayTier !== "FREE" && plan.tier === "FREE");
              const isUpgrade =
                (displayTier === "FREE" && plan.tier !== "FREE") ||
                (displayTier === "SILVER" && plan.tier === "GOLD");

              return (
                <Card
                  key={plan.tier}
                  className={`relative ${plan.popular ? "border-primary shadow-md" : ""} ${isCurrent ? "ring-2 ring-primary" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Popular
                      </Badge>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4">
                      <Badge variant="outline" className="bg-background">
                        Current
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="pt-2">
                      {plan.price === 0 ? (
                        <span className="text-3xl font-bold">Free</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">
                            ₹{plan.price}
                          </span>
                          <span className="text-muted-foreground">/mo</span>
                        </>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <Separator />
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          {feature.included ? (
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span
                            className={
                              feature.included
                                ? ""
                                : "text-muted-foreground"
                            }
                          >
                            {feature.label}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2">
                      {isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>
                          Current Plan
                        </Button>
                      ) : plan.tier === "FREE" ? (
                        isDowngrade &&
                        subscription?.razorpaySubscriptionId &&
                        status !== "CANCELLED" &&
                        subscription.autoRenew && (
                          <Button
                            variant="outline"
                            className="w-full text-destructive hover:text-destructive"
                            onClick={() => handleCancel(false)}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === "cancel" ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Downgrade
                          </Button>
                        )
                      ) : hasActiveSubscription && isDowngrade && plan.tier === "SILVER" ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleDowngrade("SILVER")}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === "downgrade" ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4 mr-2" />
                          )}
                          Downgrade
                        </Button>
                      ) : (
                        <Button
                          className={`w-full ${plan.tier === "GOLD" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                          onClick={() =>
                            hasActiveSubscription && isUpgrade
                              ? handleUpgrade(plan.tier)
                              : handleSubscribe(plan.tier)
                          }
                          disabled={paymentLoading !== null}
                        >
                          {paymentLoading === plan.tier ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4 mr-2" />
                          )}
                          {isUpgrade ? "Upgrade" : isCancelledWithBenefits ? "Re-subscribe" : "Subscribe"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Subscription Management */}
          {subscription &&
            status !== "FREE" &&
            status !== "INACTIVE" &&
            subscription.razorpaySubscriptionId && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Subscription Management
                      </CardTitle>
                      <CardDescription>
                        {(() => {
                          const planName = subscription.plan
                            ? subscription.plan.name.charAt(0).toUpperCase() + subscription.plan.name.slice(1).toLowerCase() + " Plan"
                            : "";
                          if (status === "ACTIVE" && subscription.autoRenew)
                            return `${planName} · Renews on ${formatDate(subscription.currentPeriodEnd ?? null)}`;
                          if (status === "ACTIVE" && !subscription.autoRenew)
                            return `${planName} · Cancels at end of period · Access until ${formatDate(subscription.currentPeriodEnd ?? null)}`;
                          if (status === "PAUSED")
                            return `${planName} · Your subscription is paused`;
                          if (status === "CANCELLED")
                            return `${planName} · Access until ${formatDate(subscription.currentPeriodEnd ?? null)}`;
                          return planName;
                        })()}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        formatSubscriptionStatus(status).variant
                      }
                    >
                      {formatSubscriptionStatus(status).label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {status === "ACTIVE" && subscription.autoRenew && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePause}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === "pause" ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Pause className="h-4 w-4 mr-2" />
                          )}
                          Pause Subscription
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleCancel(false)}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === "cancel" ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Cancel Subscription
                        </Button>
                      </>
                    )}

                    {status === "ACTIVE" && !subscription.autoRenew && (
                      <p className="text-sm text-muted-foreground">
                        Cancellation scheduled. Your plan benefits remain active until {formatDate(subscription.currentPeriodEnd ?? null)}.
                      </p>
                    )}

                    {status === "CANCELLED" && (
                      <p className="text-sm text-muted-foreground">
                        Your subscription has been cancelled. Plan benefits remain active until {formatDate(subscription.currentPeriodEnd ?? null)}. After that you will be moved to the Free plan.
                      </p>
                    )}

                    {status === "PAUSED" && (
                      <>
                        <Button
                          size="sm"
                          onClick={handleResume}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === "resume" ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          Resume Subscription
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleCancel(true)}
                          disabled={actionLoading !== null}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Subscription
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Subscription Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Subscription Activity</CardTitle>
                  <CardDescription>
                    View your payments and subscription events
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchPayments}
                  disabled={paymentsLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${paymentsLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No activity yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => {
                    const isEvent = payment.paymentMethod?.startsWith("event_");
                    const eventType = payment.paymentMethod?.replace("event_", "") || "";

                    const eventConfig: Record<string, { icon: typeof CreditCard; label: string; iconClass: string; bgClass: string }> = {
                      cancel: { icon: XCircle, label: "Subscription Cancelled", iconClass: "text-destructive", bgClass: "bg-destructive/10" },
                      pause: { icon: Pause, label: "Subscription Paused", iconClass: "text-amber-500", bgClass: "bg-amber-500/10" },
                      resume: { icon: Play, label: "Subscription Resumed", iconClass: "text-green-500", bgClass: "bg-green-500/10" },
                      downgrade: { icon: ArrowDown, label: "Downgraded to Silver", iconClass: "text-muted-foreground", bgClass: "bg-muted" },
                    };

                    const config = isEvent ? eventConfig[eventType] : null;
                    const EventIcon = config?.icon || CreditCard;

                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isEvent ? (config?.bgClass || "bg-muted") : "bg-primary/10"
                            }`}>
                            <EventIcon className={`h-4 w-4 ${isEvent ? (config?.iconClass || "text-muted-foreground") : "text-primary"
                              }`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {isEvent
                                ? config?.label || "Subscription Event"
                                : formatAmount(payment.amount, payment.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(payment.createdAt)}
                              {!isEvent && payment.paymentMethod &&
                                ` · ${payment.paymentMethod}`}
                            </p>
                          </div>
                        </div>
                        {getPaymentStatusBadge(payment)}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
