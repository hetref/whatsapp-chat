"use client";

import { useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SubscriptionGuardProps {
  children: ReactNode;
  allowedPaths?: string[];
}

interface UsageInfo {
  contactsUsed: number;
  contactsLimit: number;
  groupsUsed: number;
  groupsLimit: number;
  storageUsed: number;
  storageLimit: number;
  storageUsedFormatted: string;
  storageLimitFormatted: string;
  bulkSendEnabled: boolean;
  apiAccessEnabled: boolean;
}

interface SubscriptionStatus {
  isActive: boolean;
  planTier: string;
  usage: UsageInfo | null;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  daysRemaining: number | null;
  messagingBlocked: boolean;
  messagingBlockedReason: string | null;
}

// Pages that require specific feature access
const FEATURE_RESTRICTED_PATHS: Record<string, 'bulkSend' | 'apiAccess'> = {
  "/protected/bulk-sender": "bulkSend",
  "/protected/api-keys": "apiAccess",
};

/**
 * Subscription Guard Component
 * In the freemium model, all users can access most pages.
 * Only specific feature pages (bulk sender, API keys) are locked for free users.
 */
export function SubscriptionGuard({
  children,
  allowedPaths = [],
}: SubscriptionGuardProps) {
  const pathname = usePathname();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Always-allowed paths (exact match only unless they have sub-routes)
  const alwaysAllowedExact = [
    "/protected",
    ...allowedPaths,
  ];

  const alwaysAllowedPrefix = [
    "/protected/billing",
    "/protected/setup",
    "/protected/templates",
  ];

  const isAlwaysAllowed =
    alwaysAllowedExact.includes(pathname) ||
    alwaysAllowedPrefix.some(
      (path) => pathname === path || pathname.startsWith(path + "/"),
    );

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/subscription/status");
        const data = await res.json();
        if (res.ok) {
          setStatus(data);
        }
      } catch (err) {
        console.error("Subscription check error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [pathname]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Always allow certain paths
  if (isAlwaysAllowed) {
    return <>{children}</>;
  }

  // Check feature-restricted paths
  const requiredFeature = Object.entries(FEATURE_RESTRICTED_PATHS).find(
    ([path]) => pathname === path || pathname.startsWith(path + "/"),
  );

  if (requiredFeature) {
    const [, feature] = requiredFeature;

    // If status or usage is unavailable, block access by default (fail-closed)
    if (!status?.usage) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">Upgrade Required</CardTitle>
              <CardDescription>
                {feature === "bulkSend"
                  ? "Bulk messaging is available on Silver and Gold plans."
                  : "API access is available on Silver and Gold plans."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" asChild>
                <Link href="/protected/billing">
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Plans
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    const hasAccess =
      feature === "bulkSend"
        ? status.usage.bulkSendEnabled
        : status.usage.apiAccessEnabled;

    if (!hasAccess) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">Upgrade Required</CardTitle>
              <CardDescription>
                {feature === "bulkSend"
                  ? "Bulk messaging is available on Silver and Gold plans."
                  : "API access is available on Silver and Gold plans."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" asChild>
                <Link href="/protected/billing">
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Plans
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // All other pages are accessible to everyone
  return <>{children}</>;
}

/**
 * Hook to check subscription status with plan info
 */
export function useSubscriptionStatus() {
  const [data, setData] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/subscription/status");
        const result = await res.json();
        if (res.ok) {
          setData(result);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    check();
  }, []);

  return {
    isActive: data?.isActive ?? null,
    planTier: data?.planTier ?? "FREE",
    usage: data?.usage ?? null,
    subscriptionStatus: data?.subscription?.status ?? null,
    messagingBlocked: data?.messagingBlocked ?? false,
    messagingBlockedReason: data?.messagingBlockedReason ?? null,
    loading,
  };
}
