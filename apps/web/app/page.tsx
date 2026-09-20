import Link from "next/link";
import Image from "next/image";
import {
  MessageSquare,
  Users,
  FileText,
  HardDrive,
  Send,
  Key,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Shield,
  Zap,
  Lock,
  Layers,
} from "lucide-react";
import { HeroSection } from "@/components/hero-section";
import { PricingSection } from "@/components/pricing-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 selection:bg-[#5F7C65]/20 selection:text-[#2D583F]">
      {/* Editorial Botanical Hero Section */}
      <HeroSection />

      <main className="flex-1">
        {/* Stats Bar */}
        <section className="border-y border-stone-200/80 bg-[#F4F1EB]">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x-0 md:divide-x divide-stone-200">
              <div className="px-4">
                <div className="text-3xl md:text-4xl font-semibold tracking-tight text-emerald-950">
                  15+
                </div>
                <div className="text-xs sm:text-sm font-medium text-stone-600 mt-1">
                  Built-in Capabilities
                </div>
              </div>
              <div className="px-4">
                <div className="text-3xl md:text-4xl font-semibold tracking-tight text-emerald-950">
                  &lt; 100ms
                </div>
                <div className="text-xs sm:text-sm font-medium text-stone-600 mt-1">
                  API Message Latency
                </div>
              </div>
              <div className="px-4">
                <div className="text-3xl md:text-4xl font-semibold tracking-tight text-emerald-950">
                  99.9%
                </div>
                <div className="text-xs sm:text-sm font-medium text-stone-600 mt-1">
                  Delivery Reliability
                </div>
              </div>
              <div className="px-4">
                <div className="text-3xl md:text-4xl font-semibold tracking-tight text-emerald-950">
                  0%
                </div>
                <div className="text-xs sm:text-sm font-medium text-stone-600 mt-1">
                  Per-Message Markups
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Proposition */}
        <section className="py-24 md:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] border border-[#5F7C65]/20 mb-4">
                Platform Overview
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-[-0.04em] text-emerald-950 mb-5 text-balance">
                Built for Teams That{" "}
                <span className="font-[Georgia,serif] italic text-[#2D583F]">
                  Value Relationships
                </span>
              </h2>
              <p className="text-stone-600 text-base sm:text-lg leading-relaxed text-pretty">
                Whether you&apos;re a boutique brand, high-growth startup, or established business, WaChat provides a calm, unified foundation for every customer conversation.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="group p-8 rounded-2xl bg-white/80 backdrop-blur-md border border-stone-200/80 hover:border-[#5F7C65]/50 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="size-12 rounded-xl bg-[#5F7C65]/10 text-[#5F7C65] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <MessageSquare className="size-6" />
                </div>
                <h3 className="font-semibold text-xl text-stone-900 mb-2.5">
                  Effortless Customer Messaging
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Real-time incoming and outgoing conversations, multi-agent inbox, instant delivery status indicators, and smart contact tagging.
                </p>
              </div>

              <div className="group p-8 rounded-2xl bg-white/80 backdrop-blur-md border border-stone-200/80 hover:border-[#5F7C65]/50 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="size-12 rounded-xl bg-[#5F7C65]/10 text-[#5F7C65] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Users className="size-6" />
                </div>
                <h3 className="font-semibold text-xl text-stone-900 mb-2.5">
                  Targeted Broadcast Campaigns
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Deliver personalized announcements directly to segmented groups with zero per-message markup and complete read-rate analytics.
                </p>
              </div>

              <div className="group p-8 rounded-2xl bg-white/80 backdrop-blur-md border border-stone-200/80 hover:border-[#5F7C65]/50 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="size-12 rounded-xl bg-[#5F7C65]/10 text-[#5F7C65] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Shield className="size-6" />
                </div>
                <h3 className="font-semibold text-xl text-stone-900 mb-2.5">
                  Private &amp; Fully Sovereign
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Retain 100% ownership over your audience, media assets, and chat history with encrypted AWS S3 storage and multi-tenant data isolation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 md:py-32 px-6 bg-[#F4F1EB]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] border border-[#5F7C65]/20 mb-4">
                Capabilities
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-[-0.04em] text-emerald-950 mb-5 text-balance">
                Everything You Need to{" "}
                <span className="font-[Georgia,serif] italic text-[#2D583F]">
                  Grow &amp; Engage
                </span>
              </h2>
              <p className="text-stone-600 text-base sm:text-lg leading-relaxed text-pretty">
                Direct integration with the Meta WhatsApp Cloud API &mdash; uncompromising speed, absolute reliability, and zero middleware fees.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: MessageSquare,
                  title: "Real-time Multi-Agent Inbox",
                  desc: "Send and receive WhatsApp chats instantly. Unread counters, contact profiles, delivery receipts, and fast search.",
                },
                {
                  icon: Users,
                  title: "Dynamic Broadcast Groups",
                  desc: "Segment your audience into targeted groups and send custom campaigns. Each recipient experiences a private 1-on-1 chat.",
                },
                {
                  icon: FileText,
                  title: "Visual Template Studio",
                  desc: "Design interactive templates with quick-reply buttons, dynamic variables, and live approval status from Meta.",
                },
                {
                  icon: HardDrive,
                  title: "Cloud Media Vault",
                  desc: "Securely store and distribute high-res images, PDFs, videos, and voice notes backed by encrypted AWS S3 storage.",
                },
                {
                  icon: Send,
                  title: "Audience Campaign Launcher",
                  desc: "Import CSV lists, map custom recipient variables, schedule blasts, and track read-rate performance in real time.",
                },
                {
                  icon: Key,
                  title: "Developer APIs & Webhooks",
                  desc: "Integrate with your CRM, payment gateways, and custom applications with scoped API tokens and live event streams.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="group p-7 rounded-2xl bg-white/85 backdrop-blur-md border border-stone-200/80 hover:border-[#5F7C65]/50 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="size-11 rounded-xl bg-[#5F7C65]/10 text-[#5F7C65] flex items-center justify-center mb-5 group-hover:bg-[#5F7C65] group-hover:text-white transition-colors">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold text-lg text-stone-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 md:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] border border-[#5F7C65]/20 mb-4">
                How It Works
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-[-0.04em] text-emerald-950 mb-5 text-balance">
                Get Started in{" "}
                <span className="font-[Georgia,serif] italic text-[#2D583F]">
                  Three Simple Steps
                </span>
              </h2>
              <p className="text-stone-600 text-base sm:text-lg leading-relaxed text-pretty">
                Connect your WhatsApp Business number and begin communicating with customers in minutes.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
              {[
                {
                  step: "01",
                  title: "Connect Meta Account",
                  desc: "Link your Meta Business account and verified WhatsApp phone number with direct credentials in your dashboard.",
                },
                {
                  step: "02",
                  title: "Design & Segment",
                  desc: "Draft approved message templates, import contacts, and organize custom broadcast segments for your campaigns.",
                },
                {
                  step: "03",
                  title: "Engage & Delight",
                  desc: "Send personalized updates, automate key replies, and provide fast, personal service that your customers love.",
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="p-8 rounded-2xl bg-white/80 backdrop-blur-md border border-stone-200/80 text-center relative"
                >
                  <div className="size-12 rounded-full bg-[#5F7C65] text-white flex items-center justify-center text-lg font-semibold mx-auto mb-6 shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.25)]">
                    {s.step}
                  </div>
                  <h3 className="font-semibold text-xl text-stone-900 mb-2.5">
                    {s.title}
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section id="tech-stack" className="py-24 md:py-32 px-6 bg-[#F4F1EB]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] border border-[#5F7C65]/20 mb-4">
                Architecture
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-[-0.04em] text-emerald-950 mb-5 text-balance">
                Engineered with{" "}
                <span className="font-[Georgia,serif] italic text-[#2D583F]">
                  Modern Precision
                </span>
              </h2>
              <p className="text-stone-600 text-base sm:text-lg leading-relaxed text-pretty">
                High-performance stack designed for data integrity, sub-second delivery, and peace of mind.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: "Next.js 15", desc: "React Framework" },
                { name: "TypeScript", desc: "Type Safety" },
                { name: "Prisma", desc: "Database Layer" },
                { name: "NeonDB", desc: "Serverless Postgres" },
                { name: "Clerk", desc: "Identity & Auth" },
                { name: "AWS S3", desc: "Encrypted Storage" },
                { name: "Tailwind CSS", desc: "Modern UI Styling" },
                { name: "Shadcn/ui", desc: "Accessible Tokens" },
                { name: "Razorpay", desc: "Billing & Invoicing" },
                { name: "Meta Cloud API", desc: "Direct Gateway" },
                { name: "Webhooks", desc: "Event Delivery" },
                { name: "Vercel", desc: "Global Edge Network" },
              ].map((tech) => (
                <div
                  key={tech.name}
                  className="p-4 rounded-xl bg-white/80 backdrop-blur-md border border-stone-200/80 text-center hover:border-[#5F7C65]/50 transition-colors"
                >
                  <div className="font-semibold text-sm text-stone-900">
                    {tech.name}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    {tech.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Core Architectural Pillars */}
            <div className="grid sm:grid-cols-3 gap-6 mt-10">
              <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-stone-200/80 text-center">
                <Shield className="size-8 text-[#5F7C65] mx-auto mb-3" />
                <h3 className="font-semibold text-base text-stone-900 mb-1">
                  Bank-Grade Encryption
                </h3>
                <p className="text-xs sm:text-sm text-stone-600">
                  JWT validation, encrypted AWS S3 storage, sanitized inputs, and pre-signed ephemeral asset URLs.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-stone-200/80 text-center">
                <Zap className="size-8 text-[#5F7C65] mx-auto mb-3" />
                <h3 className="font-semibold text-base text-stone-900 mb-1">
                  Zero Latency Overhead
                </h3>
                <p className="text-xs sm:text-sm text-stone-600">
                  Database indexing, connection pooling, lightweight bundle sizing, and instantaneous delivery.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-stone-200/80 text-center">
                <Lock className="size-8 text-[#5F7C65] mx-auto mb-3" />
                <h3 className="font-semibold text-base text-stone-900 mb-1">
                  Isolated Tenant Security
                </h3>
                <p className="text-xs sm:text-sm text-stone-600">
                  Strict user-scoped data segregation protecting your contacts, conversations, and API keys.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Data Ownership & Sovereignty */}
        <section className="py-24 md:py-32 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="p-10 md:p-14 rounded-3xl bg-gradient-to-br from-white/90 to-[#F4F1EB] border border-stone-300/80 shadow-xl text-center space-y-6">
              <div className="inline-flex items-center justify-center size-14 rounded-full bg-[#5F7C65]/15 text-[#5F7C65] mx-auto">
                <Layers className="size-7" />
              </div>
              <h2 className="text-3xl md:text-4xl font-normal tracking-[-0.04em] text-emerald-950">
                Complete Platform Ownership &amp;{" "}
                <span className="font-[Georgia,serif] italic text-[#2D583F]">
                  Flexibility
                </span>
              </h2>
              <p className="text-stone-600 max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
                Run securely on our zero-maintenance managed cloud, or deploy on your own private infrastructure. You retain total ownership of your customer relationships, media, and communication history.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <Link
                  href="/open-source"
                  className="inline-flex items-center justify-center gap-2 bg-[#5F7C65] hover:bg-[#526D57] text-white px-7 py-3 rounded-sm font-medium transition-all shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.22)] active:scale-[0.98]"
                >
                  Self-Hosting Guide
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 border border-stone-300 bg-white/50 hover:bg-white text-stone-900 px-7 py-3 rounded-sm font-medium transition-all active:scale-[0.98]"
                >
                  View Cloud Plans
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section with Free Tier & Contact Us for Best Price */}
        <PricingSection />

        {/* Built by DevAlly */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <Image
              src="/devally-logo-large.png"
              alt="DevAlly"
              width={160}
              height={48}
              className="mx-auto opacity-80"
            />
            <p className="text-sm text-stone-600">
              WaChat is built and maintained by the DevAlly team &mdash; crafting production-grade software tools that matter.
            </p>
          </div>
        </section>

        {/* Final Botanical CTA Section */}
        <section className="py-20 md:py-28 px-6">
          <div className="max-w-5xl mx-auto rounded-3xl bg-[#1B3526] text-white p-12 md:p-16 border border-emerald-900/40 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-[-0.04em]">
                Ready to Transform Your{" "}
                <span className="font-[Georgia,serif] italic text-[#88BE99]">
                  Customer Communication?
                </span>
              </h2>
              <p className="text-stone-300 text-base sm:text-lg leading-relaxed text-pretty">
                Join forward-thinking companies delivering fast, personalized customer care on WhatsApp. Start free today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-3">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 bg-white text-[#1B3526] hover:bg-stone-100 px-8 py-3.5 rounded-sm font-medium transition-all shadow-md active:scale-[0.98]"
                >
                  Get Started Free
                  <ArrowUpRight className="size-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 border border-white/30 text-white hover:bg-white/10 px-8 py-3.5 rounded-sm font-medium transition-all active:scale-[0.98]"
                >
                  View Pricing Plans
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
