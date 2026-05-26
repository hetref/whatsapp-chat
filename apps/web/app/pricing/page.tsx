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
import { InteractivePricingCard } from "@/components/ui/pricing";
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

const CUSTOM_PLAN_FEATURES = [
  { label: "Flexible contacts from 15 upward", included: true },
  { label: "Storage from 10 GB to 250 GB", included: true },
  { label: "Bulk Messaging", included: true },
  { label: "API Access", included: true },
  { label: "Monthly billing in INR", included: true },
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

  const handleCustomPlan = async () => {
    if (!isSignedIn) {
      router.push("/sign-in?redirect_url=/pricing");
      return;
    }

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
          <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.tier;
              const isPopular = "popular" in plan && plan.popular;
              const planCtaText = isCurrent
                ? "Current Plan"
                : plan.tier === "FREE"
                  ? "Get Started"
                  : "Subscribe";

              return (
                <InteractivePricingCard
                  key={plan.tier}
                  planName={plan.name}
                  planDescription={plan.description}
                  fixedPrice={plan.price}
                  features={plan.features}
                  ctaText={planCtaText}
                  onCtaClick={() => handleSubscribe(plan.tier)}
                  ctaDisabled={loading === plan.tier || checkingStatus || isCurrent}
                  currency="₹"
                  highlighted={isPopular || plan.tier === "GOLD"}
                  showSlider={false}
                  fullWidth
                  className={`relative overflow-hidden ${plan.tier === "GOLD"
                    ? "border-amber-500 dark:border-amber-400"
                    : isPopular
                      ? "border-primary/50"
                      : "border-border"
                    }`}
                />
              );
            })}
          </div>

          <div className="mt-10 max-w-3xl mx-auto">
            <InteractivePricingCard
              planName="Build Your Plan"
              planDescription="Adjust contacts and storage to fit your workspace, with monthly pricing in INR."
              fixedPrice={499}
              pricePerUnit={0.75}
              unitName="contact"
              minUnits={15}
              maxUnits={100000}
              initialUnits={15}
              step={5}
              secondaryUnitName="GB storage"
              secondaryLabel="Storage"
              secondaryMinUnits={10}
              secondaryMaxUnits={250}
              secondaryInitialUnits={10}
              secondaryPricePerUnit={8}
              secondaryStep={5}
              features={CUSTOM_PLAN_FEATURES}
              ctaText="Continue to Billing"
              onCtaClick={handleCustomPlan}
              currency="₹"
              highlighted
              showSlider
              fullWidth
              className="border-primary/40"
            />
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
