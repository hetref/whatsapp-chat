"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, LoaderCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WhatsAppSetupGate({ children }: { children: ReactNode }) {
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  const checkSetup = useCallback(async () => {
    setChecking(true);
    setError("");

    try {
      const response = await fetch("/api/settings/status", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not check WhatsApp setup.");
      setSetupComplete(result.setupComplete === true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not check WhatsApp setup.");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkSetup();
  }, [checkSetup]);

  if (checking) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-sm text-stone-500 dark:text-stone-400">
        <LoaderCircle className="size-5 animate-spin" />
        Checking WhatsApp setup...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div role="alert" className="max-w-md space-y-4 rounded-2xl border border-destructive/30 bg-card p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void checkSetup()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!setupComplete) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-[#FAF8F5]/50 dark:bg-[#0C0F0D]">
        <div className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white/80 p-2 shadow-sm backdrop-blur-md dark:border-stone-800/80 dark:bg-[#131915]/80">
          <div className="space-y-6 rounded-[calc(1.5rem-0.25rem)] border border-stone-200/60 bg-[#FAF8F5]/80 p-8 text-center dark:border-stone-800/60 dark:bg-[#18201B]/90">
            <div className="flex justify-center">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <AlertCircle className="size-10 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-[-0.025em] text-stone-900 dark:text-stone-100">Setup Required</h2>
              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                Please complete your WhatsApp Cloud API setup to access WhatsApp Flows. Configure either the Access Token or Webhook to continue.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link href="/protected/setup" className="block">
                <Button className="w-full rounded-xl bg-[#5F7C65] text-white shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2)] hover:bg-[#526D57]" size="lg">
                  <Settings className="mr-2 size-4" />
                  Configure Setup
                </Button>
              </Link>
              <p className="text-xs text-stone-500 dark:text-stone-400">Setup typically takes less than 2 minutes</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
