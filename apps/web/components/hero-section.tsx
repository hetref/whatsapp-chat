"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import {
  ArrowUpRight,
  MessageSquare,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import LogoIcon from "@/components/logo-icon";

export interface NavLink {
  label: string;
  href: string;
}

export interface FeatureItem {
  title: string;
  description: string;
  icon: "message" | "shield";
}

export interface HeroSectionProps {
  brandName?: string;
  navLinks?: NavLink[];
  headingLine1?: string;
  headingLine2Prefix?: string;
  headingHighlight?: string;
  description?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  features?: FeatureItem[];
  backgroundImage?: string;
}

const defaultNavLinks: NavLink[] = [
  { label: "Home", href: "/#" },
  { label: "Features", href: "/#features" },
  { label: "Resources", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
];

const defaultFeatures: FeatureItem[] = [
  { title: "Direct Cloud API", description: "Sub-second Speed", icon: "message" },
  { title: "Smart Broadcasts", description: "with Total Control", icon: "shield" },
];

const iconMap = {
  message: MessageSquare,
  shield: ShieldCheck,
};

export function HeroSection({
  brandName = "WaChat",
  navLinks = defaultNavLinks,
  headingLine1 = "The Best Conversations Begin",
  headingLine2Prefix = "When",
  headingHighlight = "You Connect",
  description = "From personal customer care to high-impact broadcasts, discover a calm, powerful way to connect with the audience that truly matters most.",
  primaryCtaLabel = "Start for Free",
  primaryCtaHref = "/sign-up",
  secondaryCtaLabel = "Get Started",
  secondaryCtaHref = "/#pricing",
  features = defaultFeatures,
  backgroundImage = "https://assets.watermelon.sh/hero-22-bg.avif",
}: HeroSectionProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Sticky Fixed Top Navigation Bar with Translucent Blur on Scroll */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${scrolled
          ? "bg-[#FAF8F5]/85 supports-[backdrop-filter]:bg-[#FAF8F5]/80 backdrop-blur-sm border-b border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] py-3 sm:py-3.5"
          : "bg-transparent border-b border-transparent py-5 sm:py-6"
          }`}
      >
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-between gap-6 w-full">
          {/* Brand Logo */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 text-xl font-semibold tracking-[-0.035em] text-stone-900 transition-transform active:scale-[0.97]"
          >
            <LogoIcon className="size-8 text-[#5F7C65] transition-transform group-hover:scale-105" />
            <span>{brandName}</span>
          </Link>

          {/* Center Navigation Links - Floating cleanly without box background */}
          <nav
            aria-label="Main Navigation"
            className="hidden items-center gap-10 lg:flex"
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-stone-900/85 hover:text-stone-950 transition-opacity hover:opacity-70"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {isLoaded && isSignedIn ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/protected"
                  className="hidden sm:inline-flex min-h-10 items-center justify-center rounded-sm bg-[#5F7C65] hover:bg-[#526D57] px-5 text-sm font-normal text-white shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_0_rgba(0,0,0,0.18)] outline outline-black/15 transition-all active:scale-[0.97]"
                >
                  Dashboard
                </Link>
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/sign-in"
                  className="hidden sm:inline-flex min-h-10 items-center text-sm font-medium text-stone-900 hover:opacity-70 transition-opacity"
                >
                  Log in
                </Link>
                <Link
                  href={primaryCtaHref}
                  className="inline-flex min-h-10 items-center justify-center rounded-sm bg-[#5F7C65] hover:bg-[#526D57] px-5 text-sm font-normal text-white shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_0_rgba(0,0,0,0.18)] outline outline-black/15 transition-all active:scale-[0.97]"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="p-2 rounded-md hover:bg-black/5 lg:hidden text-stone-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-6 right-6 mt-2 z-50 rounded-2xl bg-white/95 backdrop-blur-2xl p-6 shadow-2xl border border-stone-200/80 animate-hero-slide-down">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-base font-medium text-stone-800 hover:text-[#5F7C65] transition-colors py-1"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-stone-200 flex flex-col gap-3">
                {isLoaded && isSignedIn ? (
                  <Link
                    href="/protected"
                    className="w-full text-center py-2.5 rounded-sm bg-[#5F7C65] text-white font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Open Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/sign-in"
                      className="w-full text-center py-2.5 rounded-sm border border-stone-300 text-stone-900 font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Log in
                    </Link>
                    <Link
                      href="/sign-up"
                      className="w-full text-center py-2.5 rounded-sm bg-[#5F7C65] text-white font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Get Started Free
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section Container */}
      <section className="relative isolate min-h-[100dvh] w-full overflow-hidden bg-[#FAF8F5] text-emerald-950">
        {/* Background Graphic with responsive positioning */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src={backgroundImage}
            alt=""
            fetchPriority="high"
            className="animate-hero-img absolute inset-0 h-full w-full object-cover object-[78%_top] sm:object-right-top transition-all duration-700"
          />
          {/* Soft atmospheric gradient vignette to ensure flawless contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAF8F5] via-[#FAF8F5]/85 to-transparent lg:w-3/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F5] via-transparent to-transparent lg:hidden" />
        </div>

        <div className="relative z-10 flex min-h-[100dvh] w-full flex-col justify-between px-6 pb-6 pt-28 sm:px-10 sm:pt-32 lg:px-16 max-w-[1440px] mx-auto">
          {/* Hero Center Body */}
          <div className="relative z-10 grid flex-1 grid-cols-1 items-center pb-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,1fr)]">
            <div className="animate-hero-blur max-w-2xl">
              {/* Split Headline with Editorial Georgia Italic Accent */}
              <h1 className="text-[clamp(2.5rem,4.4vw,4.65rem)] leading-[1.08] font-normal tracking-[-0.055em] text-balance text-emerald-950">
                <span className="block">{headingLine1}</span>
                <span className="block pb-1">
                  {headingLine2Prefix}{" "}
                  <span className="font-[Georgia,serif] text-[0.96em] font-normal tracking-[-0.05em] italic text-[#2D583F]">
                    {headingHighlight}
                  </span>
                </span>
              </h1>

              {/* Concise, calm product description */}
              <p className="mt-6 text-base sm:text-lg leading-[1.45] font-normal text-stone-700 max-w-lg text-pretty">
                {description}
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={primaryCtaHref}
                  className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-[#5F7C65] hover:bg-[#526D57] px-6 text-sm font-normal text-white shadow-[inset_0_2px_5px_0px_rgba(255,255,255,0.22),inset_0_-2px_5px_0px_rgba(0,0,0,0.18)] outline outline-black/15 transition-all duration-200 active:scale-[0.97]"
                >
                  <span>{primaryCtaLabel}</span>
                  <ArrowUpRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link
                  href={secondaryCtaHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-sm px-6 text-sm font-semibold text-stone-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/75 active:scale-[0.97]"
                >
                  {secondaryCtaLabel}
                </Link>
              </div>

              {/* Product Value Indicators */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-stone-600">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#5F7C65]" />
                  Free tier available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#5F7C65]" />
                  Zero message markups
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#5F7C65]" />
                  Instant setup
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Feature Badges - 2 pills matching reference screenshot */}
          <div className="relative z-20 flex flex-wrap items-center gap-4 sm:gap-8 pb-4 pt-2">
            {features.map((feature, idx) => {
              const Icon = iconMap[feature.icon] || MessageSquare;
              return (
                <div
                  key={feature.title}
                  style={{ animationDelay: `${idx * 150}ms` }}
                  className="animate-hero-card flex items-center gap-3 rounded-full bg-white/70 px-4 py-2 shadow-xs backdrop-blur-md outline outline-black/5 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#5F7C65] shadow-xs outline -outline-offset-1 outline-black/10">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="leading-tight">
                    <span className="block text-xs sm:text-sm font-semibold text-stone-900">
                      {feature.title}
                    </span>
                    <span className="block text-[11px] font-medium text-stone-500">
                      {feature.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
