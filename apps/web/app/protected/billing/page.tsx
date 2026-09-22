"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Mail,
  Phone,
  ArrowRight,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { toast, Toaster } from "@/components/ui/toast";
import LogoIcon from "@/components/logo-icon";
import { useSubscriptionStatus } from "@/components/subscription-guard";

export default function BillingPage() {
  const { planTier } = useSubscriptionStatus();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isPaidUser = Boolean(planTier && planTier.toUpperCase() !== "FREE");

  const emailAddress = "support@wachat.tech";
  const phoneNumber = "+918828316840";
  const formattedPhone = "+91 88283 16840";

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast(`${text} copied to clipboard`, "success", 2000);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FAF8F5]/50 dark:bg-[#0C0F0D] text-stone-900 dark:text-stone-100">
      <Toaster />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 pb-20">
        {/* ======================================================================= */}
        {/* HEADER SECTION - Editorial Botanical Typography                         */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20">
                <LogoIcon className="size-3.5 text-[#5F7C65]" />
                <span>Subscription &amp; Capacity Governance</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-100 flex items-center gap-3 flex-wrap">
              <span>
                Plans &amp;{" "}
                <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">
                  Pricing
                </span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold font-mono uppercase tracking-wider bg-amber-500/12 text-amber-700 dark:text-amber-400 border border-amber-500/25 shadow-2xs">
                Beta
              </span>
            </h1>
            <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Transparent, sovereign pricing designed for sustainable engagement. All billing and tier provisioning are currently in <strong className="font-semibold text-stone-800 dark:text-stone-200">Beta</strong>. Start completely free with full Cloud API integration, or request tailored enterprise access for high-volume broadcast campaigns.
            </p>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PRICING CARDS - 2-Tier Architecture matching Landing Page               */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto pt-2">
          {/* Tier 1: Free Forever */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white/85 dark:bg-stone-900/70 backdrop-blur-md border border-stone-200/80 dark:border-stone-800/80 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] flex flex-col justify-between transition-all hover:border-stone-300 dark:hover:border-stone-700">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono mb-3">
                Starter
              </div>
              <h3 className="font-semibold text-2xl text-stone-900 dark:text-stone-100">
                Free Forever
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 mb-6 leading-relaxed">
                Ideal for individuals, test environments, and getting started with WhatsApp Cloud API.
              </p>

              <div className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#2D583F] dark:text-[#8EAE95] mb-6">
                &#8377;0
                <span className="text-xs sm:text-sm font-normal text-stone-500 font-mono">
                  {" "}/ month
                </span>
              </div>

              <ul className="space-y-3.5 text-xs sm:text-sm text-stone-600 dark:text-stone-300 mb-8 border-t border-stone-200/70 dark:border-stone-800/70 pt-6">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-[#5F7C65] shrink-0" />
                  <span><strong>10</strong> Active Contacts</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-[#5F7C65] shrink-0" />
                  <span><strong>2</strong> Broadcast Groups</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-[#5F7C65] shrink-0" />
                  <span><strong>5 GB</strong> Encrypted S3 Media Storage</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-[#5F7C65] shrink-0" />
                  <span>Full Meta Cloud API integration</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-[#5F7C65] shrink-0" />
                  <span>Standard Community Support</span>
                </li>
              </ul>
            </div>

            {!isPaidUser ? (
              <div className="inline-flex items-center justify-center w-full py-3 rounded-xl border border-stone-200/80 dark:border-stone-700/80 bg-stone-100/70 dark:bg-stone-800/50 text-stone-700 dark:text-stone-300 font-medium text-xs font-mono gap-1.5 shadow-2xs">
                <CheckCircle2 className="size-3.5 text-[#5F7C65]" />
                <span>Current Active Plan</span>
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-full py-3 rounded-xl border border-stone-200/80 dark:border-stone-700/80 bg-stone-50 dark:bg-stone-800/30 text-stone-500 font-medium text-xs font-mono gap-1.5">
                <span>Base Tier Included</span>
              </div>
            )}
          </div>

          {/* Tier 2: Growth & Enterprise (Tailored Best Price) */}
          <div className="rounded-2xl border-2 border-[#5F7C65] bg-white/95 dark:bg-stone-900/90 backdrop-blur-md p-1.5 shadow-[0_8px_30px_-4px_rgba(45,88,63,0.16)] flex flex-col justify-between relative transform lg:-translate-y-1">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#5F7C65] text-white shadow-xs font-mono">
              Tailored for Business
            </div>

            <div className="rounded-[calc(1rem-0.125rem)] p-6 sm:p-8 flex flex-col justify-between flex-1">
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 font-mono mb-3">
                  Custom Volume
                </div>
                <h3 className="font-semibold text-2xl text-stone-900 dark:text-stone-100">
                  Growth &amp; Enterprise
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 mb-6 leading-relaxed">
                  Designed for high-impact broadcasts, support teams, and customized enterprise deployments.
                </p>

                <div className="mb-6">
                  <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#2D583F] dark:text-[#8EAE95]">
                    Best Price Guarantee
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Custom rates based on your monthly contact &amp; broadcast scale
                  </div>
                </div>

                <ul className="space-y-3.5 text-xs sm:text-sm text-stone-600 dark:text-stone-300 mb-8 border-t border-stone-200/70 dark:border-stone-800/70 pt-6">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="size-4 text-[#5F7C65] shrink-0" />
                    <span><strong>Custom / Unlimited</strong> Contacts</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="size-4 text-[#5F7C65] shrink-0" />
                    <span><strong>Unlimited</strong> Broadcast Groups</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="size-4 text-[#5F7C65] shrink-0" />
                    <span><strong>Scalable S3 Storage</strong> for media &amp; docs</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="size-4 text-[#5F7C65] shrink-0" />
                    <span><strong>Priority Support</strong> via WhatsApp &amp; Direct Phone</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="size-4 text-[#5F7C65] shrink-0" />
                    <span>Template assistance &amp; Meta verification guidance</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="size-4 text-[#5F7C65] shrink-0" />
                    <span>Dedicated onboarding &amp; custom webhooks</span>
                  </li>
                </ul>
              </div>

              {isPaidUser ? (
                <div className="inline-flex items-center justify-center w-full py-3.5 rounded-xl border border-[#5F7C65]/30 bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] font-semibold text-xs sm:text-sm font-mono gap-2 shadow-2xs">
                  <CheckCircle2 className="size-4 text-[#5F7C65]" />
                  <span>Current Active Plan ({planTier})</span>
                </div>
              ) : (
                <a
                  href={`mailto:${emailAddress}?subject=WaChat%20Pricing%20%26%20Access%20Request`}
                  className="inline-flex items-center justify-center w-full py-3.5 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white font-medium text-xs sm:text-sm shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(0,0,0,0.18)] transition-all active:scale-[0.98] gap-2 cursor-pointer"
                >
                  <span>Request Access</span>
                  <ArrowRight className="size-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* DIRECT CONTACT SUPPORT BANNER - Matching Landing Page                   */}
        {/* ======================================================================= */}
        <div className="max-w-5xl mx-auto rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
          <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-6 sm:p-7 border border-stone-200/60 dark:border-stone-800/60">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2D583F] dark:text-[#8EAE95] font-mono">
                  <span className="size-2 rounded-full bg-[#5F7C65] animate-pulse" />
                  Direct Pricing Support
                </div>
                <h4 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100 mt-1">
                  Have specific volume requirements?
                </h4>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
                  Talk directly with our team for bulk pricing, agency tiers, or custom self-hosted setups.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {/* Email Button */}
                <div className="flex items-center rounded-xl border border-stone-300/80 dark:border-stone-700 bg-white dark:bg-stone-800 overflow-hidden shadow-2xs">
                  <a
                    href={`mailto:${emailAddress}?subject=WaChat%20Pricing%20%26%20Access%20Request`}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-stone-800 dark:text-stone-200 hover:text-[#5F7C65] dark:hover:text-[#8EAE95] transition-colors"
                  >
                    <Mail className="size-4 text-[#5F7C65]" />
                    <span>{emailAddress}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(emailAddress, "email")}
                    title="Copy email address"
                    className="px-2.5 py-2 border-l border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
                  >
                    {copiedField === "email" ? (
                      <Check className="size-3.5 text-[#5F7C65]" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>

                {/* Phone Call Button */}
                <div className="flex items-center rounded-xl border border-stone-300/80 dark:border-stone-700 bg-white dark:bg-stone-800 overflow-hidden shadow-2xs">
                  <a
                    href={`tel:${phoneNumber}`}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-stone-800 dark:text-stone-200 hover:text-[#5F7C65] dark:hover:text-[#8EAE95] transition-colors"
                  >
                    <Phone className="size-4 text-[#5F7C65]" />
                    <span>{formattedPhone}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(phoneNumber, "phone")}
                    title="Copy phone number"
                    className="px-2.5 py-2 border-l border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
                  >
                    {copiedField === "phone" ? (
                      <Check className="size-3.5 text-[#5F7C65]" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* TRUST & ARCHITECTURE PILLARS (Bento 3 Columns)                         */}
        {/* ======================================================================= */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 shadow-2xs space-y-2">
            <div className="size-8 rounded-xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#5F7C65] dark:text-[#8EAE95] flex items-center justify-center">
              <Zap className="size-4" />
            </div>
            <h5 className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
              0% Per-Message Markups
            </h5>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Pay Meta directly for WhatsApp conversations at official wholesale rates with zero middleware surcharge.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 shadow-2xs space-y-2">
            <div className="size-8 rounded-xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#5F7C65] dark:text-[#8EAE95] flex items-center justify-center">
              <ShieldCheck className="size-4" />
            </div>
            <h5 className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
              Complete Data Sovereignty
            </h5>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Encrypted AWS S3 asset storage and tenant isolation ensuring you retain 100% ownership over all records.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 shadow-2xs space-y-2">
            <div className="size-8 rounded-xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#5F7C65] dark:text-[#8EAE95] flex items-center justify-center">
              <MessageSquare className="size-4" />
            </div>
            <h5 className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
              Dedicated Onboarding
            </h5>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Direct assistance with Meta Business Manager verification, phone line registration, and webhook setup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
