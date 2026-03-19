import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Github,
  Terminal,
  Database,
  Lock,
  MessageCircle,
  Cloud,
  Code2,
  Server,
  Settings,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const ENV_VARS = [
  { name: "DATABASE_URL", desc: "NeonDB PostgreSQL connection string" },
  {
    name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    desc: "Clerk publishable key (from Clerk dashboard)",
  },
  {
    name: "CLERK_SECRET_KEY",
    desc: "Clerk secret key (from Clerk dashboard)",
  },
  {
    name: "WHATSAPP_ACCESS_TOKEN",
    desc: "Permanent system user token from Meta",
  },
  {
    name: "WHATSAPP_PHONE_NUMBER_ID",
    desc: "Your WhatsApp Business phone number ID",
  },
  {
    name: "WHATSAPP_BUSINESS_ACCOUNT_ID",
    desc: "Your WhatsApp Business account ID",
  },
  {
    name: "WHATSAPP_VERIFY_TOKEN",
    desc: "Custom token for webhook verification",
  },
  { name: "AWS_ACCESS_KEY_ID", desc: "AWS IAM access key for S3" },
  { name: "AWS_SECRET_ACCESS_KEY", desc: "AWS IAM secret key for S3" },
  { name: "AWS_REGION", desc: "AWS region (e.g. ap-south-1)" },
  { name: "AWS_S3_BUCKET_NAME", desc: "S3 bucket name for media storage" },
];

const PREREQUISITES = [
  {
    icon: Code2,
    color: "text-green-600",
    bg: "bg-green-500/10",
    name: "Node.js 18+",
    desc: "JavaScript runtime environment",
  },
  {
    icon: Database,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    name: "NeonDB Account",
    desc: "Serverless PostgreSQL database (free tier available)",
  },
  {
    icon: Lock,
    color: "text-purple-600",
    bg: "bg-purple-500/10",
    name: "Clerk Account",
    desc: "Authentication & user management (free tier available)",
  },
  {
    icon: MessageCircle,
    color: "text-green-600",
    bg: "bg-green-500/10",
    name: "Meta Business Account",
    desc: "WhatsApp Business API access via Meta Developer Portal",
  },
  {
    icon: Cloud,
    color: "text-orange-600",
    bg: "bg-orange-500/10",
    name: "AWS Account",
    desc: "S3 bucket for media file storage",
  },
  {
    icon: Settings,
    color: "text-slate-600",
    bg: "bg-slate-500/10",
    name: "Git",
    desc: "Version control to clone the repository",
  },
];

const SETUP_STEPS = [
  {
    title: "Clone the Repository",
    commands: [
      "git clone https://github.com/hetref/whatsapp-chat.git",
      "cd whatsapp-chat",
    ],
  },
  {
    title: "Install Dependencies",
    commands: ["npm install"],
  },
  {
    title: "Configure Environment Variables",
    description:
      "Copy the example environment file and fill in your credentials:",
    commands: ["cp .env.example .env.local"],
    showEnvTable: true,
  },
  {
    title: "Set Up the Database",
    commands: ["npx prisma migrate dev"],
    note: "This creates all required database tables in your NeonDB instance.",
  },
  {
    title: "Start the Development Server",
    commands: ["npm run dev"],
    note: "Open http://localhost:3000 in your browser.",
  },
];

const WHATSAPP_STEPS = [
  {
    title: "Create a Meta Developer Account",
    desc: "Go to developers.facebook.com and create an app with the WhatsApp product enabled.",
  },
  {
    title: "Generate an Access Token",
    desc: "Create a permanent system user token with whatsapp_business_messaging and whatsapp_business_management permissions.",
  },
  {
    title: "Configure Webhooks",
    desc: "Point your webhook URL to your deployment (e.g., https://yourdomain.com/api/webhook/your-token) to receive incoming messages and status updates.",
  },
  {
    title: "Add a Phone Number",
    desc: "Register a phone number for your WhatsApp Business account. Meta provides a free test number for development.",
  },
];

export default function OpenSourcePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 py-20 md:py-28">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="text-sm px-4 py-1.5">
              Open Source &middot; MIT License
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Self-Host WaChat on
              <span className="text-primary block mt-2">
                Your Own Infrastructure
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              WaChat is fully open source. Deploy it on your own servers with
              complete control over your data, or contribute to the project and
              shape its future.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href="https://github.com/hetref/whatsapp-chat"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <Github className="h-4 w-4" />
                View Repository
              </a>
              <a
                href="#setup"
                className="inline-flex items-center justify-center gap-2 border border-border hover:bg-accent px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Setup Guide
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Prerequisites */}
        <section className="px-6 py-16 bg-muted/30" id="prerequisites">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <Badge variant="secondary" className="mb-4">
                Prerequisites
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold">
                What You&apos;ll Need
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {PREREQUISITES.map((prereq) => (
                <Card key={prereq.name} className="p-4 flex items-start gap-3">
                  <div
                    className={`h-9 w-9 rounded-lg ${prereq.bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <prereq.icon className={`h-4 w-4 ${prereq.color}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{prereq.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {prereq.desc}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Setup Guide */}
        <section className="px-6 py-20" id="setup">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">
                Setup Guide
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold">
                Deploy in 5 Steps
              </h2>
            </div>

            <div className="space-y-8">
              {SETUP_STEPS.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="font-semibold text-lg">{step.title}</h3>

                    {step.description && (
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    )}

                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto space-y-1">
                      {step.commands.map((cmd, i) => (
                        <div key={i}>
                          <span className="text-muted-foreground select-none">
                            ${" "}
                          </span>
                          <code>{cmd}</code>
                        </div>
                      ))}
                    </div>

                    {step.note && (
                      <p className="text-xs text-muted-foreground">
                        {step.note}
                      </p>
                    )}

                    {/* Environment Variables Table */}
                    {step.showEnvTable && (
                      <div className="border rounded-lg overflow-hidden mt-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="text-left p-3 font-semibold">
                                Variable
                              </th>
                              <th className="text-left p-3 font-semibold">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {ENV_VARS.map((v) => (
                              <tr key={v.name}>
                                <td className="p-3 font-mono text-xs whitespace-nowrap">
                                  {v.name}
                                </td>
                                <td className="p-3 text-muted-foreground text-xs">
                                  {v.desc}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WhatsApp Cloud API Setup */}
        <section className="px-6 py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <Badge variant="secondary" className="mb-4">
                Meta Cloud API
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold">
                Setting Up WhatsApp Cloud API
              </h2>
            </div>

            <div className="space-y-4">
              {WHATSAPP_STEPS.map((step, i) => (
                <Card key={i} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{step.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Deployment Options */}
        <section className="px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <Badge variant="secondary" className="mb-4">
                Deployment
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold">
                Deploy Anywhere
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Card className="p-6 text-center hover:shadow-md transition-all duration-200">
                <Cloud className="h-10 w-10 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold mb-1">Vercel</h3>
                <p className="text-xs text-muted-foreground">
                  One-click deploy with automatic SSL and edge functions.
                </p>
              </Card>
              <Card className="p-6 text-center hover:shadow-md transition-all duration-200">
                <Server className="h-10 w-10 mx-auto mb-3 text-purple-600" />
                <h3 className="font-semibold mb-1">Docker</h3>
                <p className="text-xs text-muted-foreground">
                  Containerized deployment for any cloud provider.
                </p>
              </Card>
              <Card className="p-6 text-center hover:shadow-md transition-all duration-200">
                <Terminal className="h-10 w-10 mx-auto mb-3 text-orange-600" />
                <h3 className="font-semibold mb-1">VPS</h3>
                <p className="text-xs text-muted-foreground">
                  Traditional server setup with PM2 or systemd.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section className="px-6 py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <Badge variant="secondary" className="mb-4">
                Architecture
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold">
                System Architecture
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-primary" />
                  Frontend
                </h3>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    Next.js App Router with Server &amp; Client Components
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    Shadcn/ui component library with Tailwind CSS
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    Optimistic UI updates for instant feedback
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    Dark mode support with next-themes
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    Responsive design for all device sizes
                  </li>
                </ul>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Server className="h-5 w-5 text-blue-600" />
                  Backend
                </h3>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    Next.js API Routes for server-side logic
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    Prisma ORM with NeonDB (PostgreSQL)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    AWS S3 for media storage with pre-signed URLs
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    Clerk Auth for secure authentication
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    Multi-tenant architecture with data isolation
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* Contributing CTA */}
        <section className="py-20 md:py-28 px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Contribute to WaChat
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              WaChat is built by the community, for the community. Whether
              it&apos;s a bug fix, new feature, or documentation improvement
              &mdash; every contribution matters.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href="https://github.com/hetref/whatsapp-chat"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <Github className="h-4 w-4" />
                View on GitHub
              </a>
              <a
                href="https://github.com/hetref/whatsapp-chat/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-border hover:bg-accent px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Report an Issue
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
