"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import Script from "next/script";
import {
  Check,
  MessageCircle,
  Users,
  FileText,
  Zap,
  Shield,
  ArrowRight,
  Loader2,
} from "lucide-react";
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

const FEATURES = [
  { icon: MessageCircle, text: "Unlimited WhatsApp Messages" },
  { icon: Users, text: "Unlimited Contacts & Groups" },
  { icon: FileText, text: "Template Management" },
  { icon: Zap, text: "Bulk Messaging" },
  { icon: Shield, text: "Secure API Access" },
];

export default function PricingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null,
  );
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
        setSubscriptionStatus("ACTIVE");
      } else {
        setSubscriptionStatus(data.subscription?.status || "INACTIVE");
      }
    } catch (err) {
      console.error("Error checking status:", err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubscribe = async () => {
    // Redirect to sign-in if not authenticated
    if (!isSignedIn) {
      router.push("/sign-in?redirect_url=/pricing");
      return;
    }

    // If already active, go to dashboard
    if (subscriptionStatus === "ACTIVE") {
      router.push("/protected");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create subscription (recurring)
      const subRes = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const subData = await subRes.json();

      if (subData.error) {
        throw new Error(subData.error);
      }

      // Open Razorpay checkout for subscription
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: subData.subscription_id,
        name: "WaChat",
        description: "Premium Subscription - ₹500/month (Auto-renewal)",
        handler: async function (response: any) {
          // Verify subscription
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
              // Redirect to dashboard
              router.push("/protected?payment=success");
            } else {
              setError(verifyData.error || "Subscription verification failed");
            }
          } catch (err: any) {
            setError(err.message || "Subscription verification failed");
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
        prefill: {
          name: "",
          email: "",
          contact: "",
        },
        theme: {
          color: "#10B981",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      setError(err.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg"
            >
              <MessageCircle className="h-6 w-6 text-primary" />
              <span className="text-primary">WaChat</span>
            </Link>

            <div className="flex items-center gap-4">
              {isSignedIn ? (
                <Link href="/protected">
                  <Button variant="outline">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/sign-in">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Simple Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              One Plan. Everything Included.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your WhatsApp Business
              communications. No hidden fees, no feature limits.
            </p>
          </div>

          {/* Pricing Card */}
          <div className="max-w-md mx-auto">
            <Card className="relative overflow-hidden border-2 border-primary/20 shadow-xl">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
                Most Popular
              </div>

              <CardHeader className="text-center pb-2 pt-8">
                <CardTitle className="text-2xl">Premium</CardTitle>
                <CardDescription>Full access to all features</CardDescription>
              </CardHeader>

              <CardContent className="text-center pb-4">
                <div className="mb-6">
                  <span className="text-5xl font-bold">₹500</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="space-y-3 text-left">
                  {FEATURES.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature.text}</span>
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
                  className="w-full h-12 text-lg"
                  onClick={handleSubscribe}
                  disabled={loading || checkingStatus}
                >
                  {loading || checkingStatus ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : subscriptionStatus === "ACTIVE" ? (
                    <>
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  ) : (
                    <>
                      Subscribe Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Auto-renews monthly. Cancel anytime from your dashboard.
                </p>
              </CardFooter>
            </Card>
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

        {/* Footer */}
        <footer className="border-t mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} WaChat. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
