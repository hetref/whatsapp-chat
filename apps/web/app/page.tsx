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
  Github,
  Star,
  CheckCircle2,
  Code2,
  Server,
  Shield,
  Zap,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-6 py-24 md:py-32 lg:py-40">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-blue-500/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center space-y-6 max-w-4xl mx-auto">
              <Badge
                variant="secondary"
                className="text-sm font-medium px-4 py-1.5"
              >
                Powered by Meta WhatsApp Cloud API
              </Badge>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                The WhatsApp Business
                <span className="text-primary block mt-2">
                  Platform You Deserve
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Manage your Meta WhatsApp Cloud API with a powerful, open-source
                dashboard. Real-time messaging, broadcast groups, template
                management, media library, and more &mdash; all in one place.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3.5 rounded-lg font-semibold transition-colors shadow-lg shadow-primary/20"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://github.com/hetref/whatsapp-chat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-border hover:bg-accent px-8 py-3.5 rounded-lg font-semibold transition-colors"
                >
                  <Github className="h-4 w-4" />
                  Star on GitHub
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pt-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Free tier available
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Self-hostable
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold">15+</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Core Features
                </div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">100%</div>
                <div className="text-sm text-muted-foreground mt-1">
                  TypeScript
                </div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">MIT</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Licensed
                </div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">Self-Host</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Or Use Cloud
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Proposition */}
        <section className="py-20 md:py-28 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <Badge variant="secondary" className="mb-4">
                Why WaChat
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Built for Businesses That Take Communication Seriously
              </h2>
              <p className="text-muted-foreground">
                Whether you&apos;re a startup or an enterprise, WaChat gives you
                the tools to manage WhatsApp at scale.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 hover:shadow-md transition-all duration-200">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  SaaS or Self-Hosted
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Use our managed cloud platform and get started in seconds, or
                  deploy on your own infrastructure with full control over your
                  data.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-all duration-200">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Enterprise-Grade Security
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Clerk authentication, encrypted storage with AWS S3, database
                  isolation, input validation, and HTTPS-only pre-signed URLs.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-all duration-200">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                  <Code2 className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Open Source & Extensible
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fully open source under MIT license. Extend with your own
                  integrations, contribute back, or fork for custom workflows.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 md:py-28 px-6 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <Badge variant="secondary" className="mb-4">
                Features
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need to Manage WhatsApp at Scale
              </h2>
              <p className="text-muted-foreground">
                A comprehensive platform built on top of the Meta WhatsApp Cloud
                API with all the features your business needs.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6 hover:shadow-md transition-all duration-200 group">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Real-time Messaging
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Send and receive WhatsApp messages in real-time. Read
                  receipts, unread indicators, contact management, and smart
                  conversation sorting.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-all duration-200 group">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/15 transition-colors">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Broadcast Groups
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Create broadcast groups and send personalized messages to
                  multiple contacts simultaneously. Each recipient sees it as a
                  personal message.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-all duration-200 group">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/15 transition-colors">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Template Management
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Create and manage WhatsApp message templates with a visual
                  builder. Multi-language support, dynamic variables, and
                  approval tracking.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-all duration-200 group">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4 group-hover:bg-orange-500/15 transition-colors">
                  <HardDrive className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Media Library</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Upload and manage images, videos, documents, and audio files.
                  Reuse media across conversations with S3-backed cloud storage.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-all duration-200 group">
                <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center mb-4 group-hover:bg-rose-500/15 transition-colors">
                  <Send className="h-5 w-5 text-rose-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Bulk Sender</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Send template messages to thousands of contacts at once with
                  CSV upload, custom variable mapping, and delivery tracking.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-all duration-200 group">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/15 transition-colors">
                  <Key className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">API & Webhooks</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Generate API keys for external integrations. Configure
                  webhooks for incoming messages and real-time status updates.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 md:py-28 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <Badge variant="secondary" className="mb-4">
                How It Works
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Get Started in Minutes
              </h2>
              <p className="text-muted-foreground">
                Connect your Meta Business account and start managing WhatsApp
                conversations right away.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-5">
                  1
                </div>
                <h3 className="font-semibold text-lg mb-2">Connect</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Link your Meta Business account and WhatsApp phone number.
                  Enter your API credentials in the dashboard.
                </p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-5">
                  2
                </div>
                <h3 className="font-semibold text-lg mb-2">Configure</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Set up your message templates, broadcast groups, and webhook
                  endpoints for your specific use case.
                </p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-5">
                  3
                </div>
                <h3 className="font-semibold text-lg mb-2">Engage</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Start messaging, managing conversations, and growing your
                  customer engagement at scale.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="py-20 md:py-28 px-6 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <Badge variant="secondary" className="mb-4">
                Tech Stack
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Built with Modern Technologies
              </h2>
              <p className="text-muted-foreground">
                Production-grade infrastructure for reliability, performance,
                and developer experience.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: "Next.js", desc: "React Framework" },
                { name: "TypeScript", desc: "Type Safety" },
                { name: "Prisma", desc: "Database ORM" },
                { name: "NeonDB", desc: "PostgreSQL" },
                { name: "Clerk", desc: "Authentication" },
                { name: "AWS S3", desc: "Media Storage" },
                { name: "Tailwind", desc: "Styling" },
                { name: "Shadcn/ui", desc: "Components" },
                { name: "Razorpay", desc: "Payments" },
                { name: "Meta API", desc: "WhatsApp" },
                { name: "Webhooks", desc: "Real-time" },
                { name: "Vercel", desc: "Deployment" },
              ].map((tech) => (
                <Card
                  key={tech.name}
                  className="p-4 text-center hover:shadow-md transition-all duration-200"
                >
                  <div className="font-semibold text-sm">{tech.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {tech.desc}
                  </div>
                </Card>
              ))}
            </div>

            {/* Security & Performance highlights */}
            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              <Card className="p-5 text-center">
                <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-sm mb-1">
                  Secure by Default
                </h3>
                <p className="text-xs text-muted-foreground">
                  JWT auth, encrypted storage, input validation, HTTPS-only
                </p>
              </Card>
              <Card className="p-5 text-center">
                <Zap className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
                <h3 className="font-semibold text-sm mb-1">Optimized</h3>
                <p className="text-xs text-muted-foreground">
                  Database indexes, code splitting, lazy loading, caching
                </p>
              </Card>
              <Card className="p-5 text-center">
                <Lock className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-sm mb-1">Data Isolation</h3>
                <p className="text-xs text-muted-foreground">
                  Multi-tenant architecture with per-user data isolation
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Open Source Callout */}
        <section className="py-20 md:py-28 px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 md:p-12 border-primary/20 bg-gradient-to-br from-primary/5 to-blue-500/5">
              <div className="text-center space-y-5">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 mx-auto">
                  <Github className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">
                  Open Source & Self-Hostable
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  WaChat is fully open source under the MIT license. Self-host
                  it on your own infrastructure with complete control over your
                  data, or use our managed cloud platform.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Link
                    href="/open-source"
                    className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Self-Hosting Guide
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="https://github.com/hetref/whatsapp-chat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 border border-border hover:bg-accent px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    <Star className="h-4 w-4" />
                    Star on GitHub
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-20 md:py-28 px-6 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <Badge variant="secondary" className="mb-4">
                Pricing
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-muted-foreground">
                Start free and scale as your business grows. No hidden fees.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 hover:shadow-md transition-all duration-200">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">Free</h3>
                  <div className="text-3xl font-bold mt-2">
                    &#8377;0
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    10 Contacts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    2 Broadcast Groups
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    5 GB Storage
                  </li>
                </ul>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center w-full gap-2 border border-border hover:bg-accent px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  Get Started
                </Link>
              </Card>

              <Card className="p-6 border-primary/40 shadow-md relative">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">Silver</h3>
                  <div className="text-3xl font-bold mt-2">
                    &#8377;499
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    15,000 Contacts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    100 Broadcast Groups
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    40 GB Storage
                  </li>
                </ul>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  Subscribe
                </Link>
              </Card>

              <Card className="p-6 hover:shadow-md transition-all duration-200">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">Gold</h3>
                  <div className="text-3xl font-bold mt-2">
                    &#8377;999
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    80,000 Contacts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    500 Broadcast Groups
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    160 GB Storage
                  </li>
                </ul>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center w-full gap-2 border border-border hover:bg-accent px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  Subscribe
                </Link>
              </Card>
            </div>

            <div className="text-center mt-8">
              <Link
                href="/pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                View full pricing details &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Built by DevAlly */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <Image
              src="/devally-logo-large.png"
              alt="DevAlly"
              width={180}
              height={54}
              className="mx-auto dark:invert opacity-80"
            />
            <p className="text-muted-foreground">
              WaChat is built and maintained by the DevAlly team &mdash;
              crafting developer tools and SaaS products that matter.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 md:py-28 px-6 bg-primary text-primary-foreground">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Scale Your WhatsApp Business?
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Join businesses using WaChat to manage their WhatsApp
              communications. Start for free, upgrade when you&apos;re ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 bg-white text-primary hover:bg-white/90 px-8 py-3.5 rounded-lg font-semibold transition-colors"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white hover:bg-white/10 px-8 py-3.5 rounded-lg font-semibold transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
