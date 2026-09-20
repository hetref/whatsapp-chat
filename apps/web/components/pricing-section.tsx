"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Mail,
  Phone,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PricingSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const emailAddress = "pricing@devally.in";
  const phoneNumber = "+918828316840";
  const formattedPhone = "+91 88283 16840";

  return (
    <section id="pricing" className="py-24 md:py-32 px-6 bg-[#F4F1EB]">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] border border-[#5F7C65]/20 mb-4">
            Pricing &amp; Plans
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-[-0.04em] text-emerald-950 mb-5 text-balance">
            Simple,{" "}
            <span className="font-[Georgia,serif] italic text-[#2D583F]">
              Flexible
            </span>{" "}
            Plans
          </h2>
          <p className="text-stone-600 text-base sm:text-lg leading-relaxed text-pretty">
            Start completely free, or connect with our team to get the best custom pricing tailored to your exact conversation volume.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="p-8 sm:p-10 rounded-2xl bg-white/80 backdrop-blur-md border border-stone-200/80 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-stone-100 text-stone-700 mb-3">
                Starter
              </div>
              <h3 className="font-semibold text-2xl text-stone-900">
                Free Forever
              </h3>
              <p className="text-sm text-stone-600 mt-1 mb-6">
                Ideal for individuals, test environments, and getting started with WhatsApp Cloud API.
              </p>

              <div className="text-4xl font-semibold tracking-tight text-emerald-950 mb-6">
                &#8377;0
                <span className="text-sm font-normal text-stone-500">
                  {" "}/ month
                </span>
              </div>

              <ul className="space-y-3.5 text-sm text-stone-600 mb-8 border-t border-stone-100 pt-6">
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

            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center w-full py-3 rounded-sm border border-stone-300 bg-white hover:bg-stone-50 text-stone-900 font-medium text-sm transition-all shadow-xs active:scale-[0.98]"
            >
              Get Started Free
            </Link>
          </div>

          {/* Business & Growth Tier (Tailored Best Price) */}
          <div className="p-8 sm:p-10 rounded-2xl bg-white border-2 border-[#5F7C65] shadow-xl flex flex-col justify-between relative transform md:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#5F7C65] text-white shadow-xs">
              Tailored for Business
            </div>

            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] mb-3">
                Custom Volume
              </div>
              <h3 className="font-semibold text-2xl text-stone-900">
                Growth &amp; Enterprise
              </h3>
              <p className="text-sm text-stone-600 mt-1 mb-6">
                Designed for high-impact broadcasts, support teams, and customized enterprise deployments.
              </p>

              <div className="mb-6">
                <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#2D583F]">
                  Best Price Guarantee
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  Custom rates based on your monthly contact &amp; broadcast scale
                </div>
              </div>

              <ul className="space-y-3.5 text-sm text-stone-600 mb-8 border-t border-stone-100 pt-6">
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

            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center justify-center w-full py-3.5 rounded-sm bg-[#5F7C65] hover:bg-[#526D57] text-white font-medium text-sm shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.22)] transition-all active:scale-[0.98] gap-2 cursor-pointer"
            >
              <span>Contact Us for Best Price</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Direct Contact Banner Below Cards */}
        <div className="mt-12 max-w-4xl mx-auto rounded-2xl bg-white/90 border border-stone-200/80 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2D583F]">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Direct Pricing Support
              </div>
              <h4 className="text-lg font-semibold text-stone-900 mt-1">
                Have specific volume requirements?
              </h4>
              <p className="text-sm text-stone-600 mt-0.5">
                Talk directly with our team for bulk pricing, agency tiers, or custom self-hosted setups.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* Email Button */}
              <div className="flex items-center rounded-sm border border-stone-300 bg-white overflow-hidden shadow-xs">
                <a
                  href={`mailto:${emailAddress}?subject=WaChat%20Custom%20Pricing%20Inquiry`}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-stone-800 hover:text-[#5F7C65] hover:bg-stone-50 transition-colors"
                >
                  <Mail className="size-4 text-[#5F7C65]" />
                  <span>{emailAddress}</span>
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(emailAddress, "email-banner")}
                  title="Copy email address"
                  className="px-2.5 py-2 border-l border-stone-200 hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                >
                  {copiedField === "email-banner" ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>

              {/* Phone Call Button */}
              <div className="flex items-center rounded-sm border border-stone-300 bg-white overflow-hidden shadow-xs">
                <a
                  href={`tel:${phoneNumber}`}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-stone-800 hover:text-[#5F7C65] hover:bg-stone-50 transition-colors"
                >
                  <Phone className="size-4 text-[#5F7C65]" />
                  <span>{formattedPhone}</span>
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(phoneNumber, "phone-banner")}
                  title="Copy phone number"
                  className="px-2.5 py-2 border-l border-stone-200 hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                >
                  {copiedField === "phone-banner" ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Contact Us Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-stone-200 p-6 sm:p-8 rounded-2xl shadow-2xl">
          <DialogHeader className="text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] w-fit mb-2">
              Best Price Request
            </div>
            <DialogTitle className="text-2xl font-normal tracking-tight text-emerald-950">
              Get the Best Price for{" "}
              <span className="font-[Georgia,serif] italic text-[#2D583F]">
                Your Business
              </span>
            </DialogTitle>
            <DialogDescription className="text-stone-600 text-sm mt-1">
              Contact our product team directly. We will evaluate your contact volume, broadcast requirements, and configure the most cost-effective tier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            {/* Email Card */}
            <div className="p-4 rounded-xl border border-stone-200 bg-[#FAF8F5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-[#5F7C65]/10 text-[#5F7C65] flex items-center justify-center shrink-0">
                  <Mail className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Email Inquiry
                  </div>
                  <div className="text-sm font-semibold text-stone-900 select-all">
                    {emailAddress}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={`mailto:${emailAddress}?subject=WaChat%20Custom%20Pricing%20Inquiry`}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#5F7C65] hover:bg-[#526D57] text-white text-xs font-medium transition-all"
                >
                  <span>Send Email</span>
                  <ArrowRight className="size-3" />
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(emailAddress, "modal-email")}
                  className="p-1.5 rounded-sm border border-stone-300 bg-white hover:bg-stone-100 text-stone-600 transition-colors"
                  title="Copy email"
                >
                  {copiedField === "modal-email" ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Direct Phone Call Card */}
            <div className="p-4 rounded-xl border border-stone-200 bg-[#FAF8F5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-[#5F7C65]/10 text-[#5F7C65] flex items-center justify-center shrink-0">
                  <Phone className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Direct Phone Support
                  </div>
                  <div className="text-sm font-semibold text-stone-900 select-all">
                    {formattedPhone}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={`tel:${phoneNumber}`}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#5F7C65] hover:bg-[#526D57] text-white text-xs font-medium transition-all"
                >
                  <span>Call Now</span>
                  <ArrowRight className="size-3" />
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(phoneNumber, "modal-phone")}
                  className="p-1.5 rounded-sm border border-stone-300 bg-white hover:bg-stone-100 text-stone-600 transition-colors"
                  title="Copy phone number"
                >
                  {copiedField === "modal-phone" ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-200 text-center">
            <p className="text-xs text-stone-500">
              Our team typically responds within 1 business hour. Available Monday through Saturday.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
