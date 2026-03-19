"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import Script from "next/script";
import {
  Check,
  X,
  ArrowRight,
  Loader2,
  Shield,
  Crown,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      { label: "Bulk Messaging", included: true },
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
      { label: "Bulk Messaging", included: true },
      { label: "API Access", included: true },
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check subscription status if signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      checkSubscriptionStatus();
    }
  }, [isLoaded, isSignedIn]);

  const checkSubscriptionStatus = async () => {
    try {
      setCheckingStatus(true);
      const res = await fetch("/api/subscription/status");
      const data = await res.json();

      if (data.subscription?.status === "ACTIVE") {
        setCurrentPlan(data.planTier || "FREE");
      } else {
        setCurrentPlan(data.planTier || "FREE");
      }
    } catch (err) {
      console.error("Error checking status:", err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubscribe = async (tier: string) => {
    // Redirect to sign-in if not authenticated
    if (!isSignedIn) {
      router.push("/sign-in?redirect_url=/pricing");
      return;
    }

    // FREE tier - just go to dashboard
    if (tier === "FREE") {
      router.push("/protected");
      return;
    }

    // If already on this plan, go to dashboard
    if (currentPlan === tier) {
      router.push("/protected");
      return;
    }

    // If signed in, redirect to billing page for subscription management
    router.push("/protected/billing");
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <div className="min-h-screen flex flex-col">
        <Navbar />

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Simple Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Plans for Every Business
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free and upgrade as your business grows. No hidden fees.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.tier;
              const isPopular = "popular" in plan && plan.popular;

              return (
                <Card
                  key={plan.tier}
                  className={`relative overflow-hidden shadow-lg ${isPopular
                    ? "border-2 border-primary/40 scale-105"
                    : "border"
                    }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
                      Most Popular
                    </div>
                  )}

                  {plan.tier === "GOLD" && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1 text-sm font-medium rounded-bl-lg flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Premium
                    </div>
                  )}

                  <CardHeader className="text-center pb-2 pt-8">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="text-center pb-4">
                    <div className="mb-6">
                      {plan.price === 0 ? (
                        <span className="text-5xl font-bold">Free</span>
                      ) : (
                        <>
                          <span className="text-5xl font-bold">
                            ₹{plan.price}
                          </span>
                          <span className="text-muted-foreground">/month</span>
                        </>
                      )}
                    </div>

                    <ul className="space-y-3 text-left">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-3">
                          <div
                            className={`h-5 w-5 rounded-full flex items-center justify-center ${feature.included
                              ? "bg-primary/10"
                              : "bg-muted"
                              }`}
                          >
                            {feature.included ? (
                              <Check className="h-3 w-3 text-primary" />
                            ) : (
                              <X className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <span
                            className={`text-sm ${feature.included
                              ? ""
                              : "text-muted-foreground"
                              }`}
                          >
                            {feature.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-4 pb-8">
                    {error && (
                      <p className="text-sm text-destructive text-center">
                        {error}
                      </p>
                    )}

                    <Button
                      className={`w-full h-12 text-lg ${plan.tier === "GOLD"
                        ? "bg-amber-500 hover:bg-amber-600"
                        : ""
                        }`}
                      variant={plan.tier === "FREE" ? "outline" : "default"}
                      onClick={() => handleSubscribe(plan.tier)}
                      disabled={
                        loading === plan.tier || checkingStatus || isCurrent
                      }
                    >
                      {loading === plan.tier || checkingStatus ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isCurrent ? (
                        "Current Plan"
                      ) : plan.tier === "FREE" ? (
                        <>
                          Get Started
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      ) : (
                        <>
                          Subscribe
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>

                    {plan.price > 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        Auto-renews monthly. Cancel anytime.
                      </p>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Trust Badges */}
          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground mb-6">
              Trusted & Secure Payments
            </p>
            <div className="flex items-center justify-center gap-8 opacity-60">
              <Shield className="h-8 w-8" />
              <span className="text-lg font-semibold">Razorpay</span>
              <span className="text-sm">256-bit SSL</span>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
