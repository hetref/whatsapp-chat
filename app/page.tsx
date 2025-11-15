import { EnvVarWarning } from "@/components/env-var-warning";
import AuthButton from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { GitHubStarButton } from "@/components/github-star-button";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { 
  MessageCircle, 
  Users, 
  Zap, 
  Shield, 
  Radio,
  MessageSquare,
  Upload,
  Database,
  Code2,
  CheckCircle2,
  ArrowRight,
  Server,
  Cloud,
  Lock,
  Globe,
  BarChart3,
  FileText,
  Image as ImageIcon,
  Video,
  Headphones,
  Download,
  Rocket,
  Star,
  Github
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-b-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex justify-between items-center p-4 px-6">
          <div className="flex items-center gap-2 font-bold text-xl">
            <MessageCircle className="h-8 w-8 text-green-600" />
            <span>WaChat</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium hover:text-green-600 transition-colors">Features</a>
            <a href="#tech-stack" className="text-sm font-medium hover:text-green-600 transition-colors">Tech Stack</a>
            <a href="#self-hosting" className="text-sm font-medium hover:text-green-600 transition-colors">Self-Hosting</a>
            <a href="https://github.com/hetref/whatsapp-chat" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-green-600 transition-colors">Documentation</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <GitHubStarButton />
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-green-950/20 dark:via-blue-950/20 dark:to-purple-950/20 px-6 py-24 md:py-32">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25"></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
              <Rocket className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Production-Ready WhatsApp Business Platform</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Enterprise WhatsApp
              <span className="block text-green-600">Business Integration</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              A fully functional, production-ready WhatsApp Business platform built with Next.js 15, Supabase, and WhatsApp Cloud API. Real-time messaging, broadcast groups, template management, and more.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/auth/login"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-colors shadow-lg shadow-green-600/30"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link 
                href="https://github.com/hetref/whatsapp-chat"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 px-8 py-4 rounded-full font-semibold text-lg transition-colors"
              >
                <Github className="h-5 w-5" />
                View on GitHub
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 pt-8">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Real-time Messaging</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Broadcast Groups</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Template Manager</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Media Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y bg-muted/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">15+</div>
              <div className="text-sm text-muted-foreground mt-1">Core Features</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">100%</div>
              <div className="text-sm text-muted-foreground mt-1">TypeScript</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">Real-time</div>
              <div className="text-sm text-muted-foreground mt-1">WebSockets</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">Production</div>
              <div className="text-sm text-muted-foreground mt-1">Ready</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4">About WaChat</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Choose WaChat?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              An enterprise-grade WhatsApp Business integration platform that enables businesses to manage customer conversations through a modern, intuitive web interface.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
                <Rocket className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Production Ready</h3>
              <p className="text-muted-foreground">
                Built for scale with enterprise-grade architecture, security, and performance optimizations out of the box.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                <Radio className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Everything</h3>
              <p className="text-muted-foreground">
                Instant message delivery using WebSockets with sub-second latency and optimistic UI updates.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure by Default</h3>
              <p className="text-muted-foreground">
                Row-level security, encrypted storage, and authentication built-in with Supabase Auth.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4">Complete Feature List</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Everything You Need
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              A comprehensive suite of features for professional WhatsApp messaging
            </p>
          </div>

          <Tabs defaultValue="messaging" className="w-full">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-2 md:grid-cols-4 mb-12">
              <TabsTrigger value="messaging">Messaging</TabsTrigger>
              <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
            </TabsList>

            <TabsContent value="messaging" className="space-y-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="p-6">
                  <MessageSquare className="h-8 w-8 text-green-600 mb-3" />
                  <h3 className="font-semibold mb-2">Real-time Chat</h3>
                  <p className="text-sm text-muted-foreground">Send and receive messages instantly with WebSocket-based real-time sync.</p>
                </Card>
                <Card className="p-6">
                  <CheckCircle2 className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold mb-2">Read Receipts</h3>
                  <p className="text-sm text-muted-foreground">Track message status with read/unread indicators and timestamps.</p>
                </Card>
                <Card className="p-6">
                  <Zap className="h-8 w-8 text-yellow-600 mb-3" />
                  <h3 className="font-semibold mb-2">Optimistic UI</h3>
                  <p className="text-sm text-muted-foreground">Instant message display before server confirmation for better UX.</p>
                </Card>
                <Card className="p-6">
                  <Badge className="h-8 w-8 flex items-center justify-center text-green-600 mb-3">99</Badge>
                  <h3 className="font-semibold mb-2">Unread Indicators</h3>
                  <p className="text-sm text-muted-foreground">Visual badges and separators showing unread messages.</p>
                </Card>
                <Card className="p-6">
                  <ArrowRight className="h-8 w-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold mb-2">Auto-scroll</h3>
                  <p className="text-sm text-muted-foreground">Jump to unread messages automatically with smart scrolling.</p>
                </Card>
                <Card className="p-6">
                  <Users className="h-8 w-8 text-orange-600 mb-3" />
                  <h3 className="font-semibold mb-2">Contact Management</h3>
                  <p className="text-sm text-muted-foreground">Custom names, search, and smart sorting by activity.</p>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="broadcast" className="space-y-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="p-6">
                  <Users className="h-8 w-8 text-green-600 mb-3" />
                  <h3 className="font-semibold mb-2">Broadcast Groups</h3>
                  <p className="text-sm text-muted-foreground">Create and manage broadcast groups with custom names and descriptions.</p>
                </Card>
                <Card className="p-6">
                  <MessageCircle className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold mb-2">Personal Delivery</h3>
                  <p className="text-sm text-muted-foreground">Each member receives broadcasts as individual personal messages.</p>
                </Card>
                <Card className="p-6">
                  <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold mb-2">Individual Tracking</h3>
                  <p className="text-sm text-muted-foreground">Track read status and engagement per member.</p>
                </Card>
                <Card className="p-6">
                  <Radio className="h-8 w-8 text-orange-600 mb-3" />
                  <h3 className="font-semibold mb-2">Real-time Broadcast</h3>
                  <p className="text-sm text-muted-foreground">Messages appear instantly in broadcast window.</p>
                </Card>
                <Card className="p-6">
                  <FileText className="h-8 w-8 text-red-600 mb-3" />
                  <h3 className="font-semibold mb-2">Template Broadcasts</h3>
                  <p className="text-sm text-muted-foreground">Send template messages to entire groups efficiently.</p>
                </Card>
                <Card className="p-6">
                  <Badge className="h-8 w-8 flex items-center justify-center text-green-600 mb-3">∞</Badge>
                  <h3 className="font-semibold mb-2">Unlimited Members</h3>
                  <p className="text-sm text-muted-foreground">Add unlimited contacts to your broadcast groups.</p>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="templates" className="space-y-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="p-6">
                  <FileText className="h-8 w-8 text-green-600 mb-3" />
                  <h3 className="font-semibold mb-2">Visual Builder</h3>
                  <p className="text-sm text-muted-foreground">Create templates with real-time preview and validation.</p>
                </Card>
                <Card className="p-6">
                  <Globe className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold mb-2">Multi-language</h3>
                  <p className="text-sm text-muted-foreground">Support for 14+ languages including English, Spanish, Arabic, Hindi, and more.</p>
                </Card>
                <Card className="p-6">
                  <Code2 className="h-8 w-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold mb-2">Dynamic Variables</h3>
                  <p className="text-sm text-muted-foreground">Use {`{{1}}`}, {`{{2}}`} for personalized content.</p>
                </Card>
                <Card className="p-6">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mb-3" />
                  <h3 className="font-semibold mb-2">Status Tracking</h3>
                  <p className="text-sm text-muted-foreground">Monitor approval status (Pending, Approved, Rejected).</p>
                </Card>
                <Card className="p-6">
                  <MessageSquare className="h-8 w-8 text-orange-600 mb-3" />
                  <h3 className="font-semibold mb-2">Button Types</h3>
                  <p className="text-sm text-muted-foreground">Quick Reply, URL, Phone Number, and Catalog buttons.</p>
                </Card>
                <Card className="p-6">
                  <ImageIcon className="h-8 w-8 text-red-600 mb-3" />
                  <h3 className="font-semibold mb-2">Media Headers</h3>
                  <p className="text-sm text-muted-foreground">Add image, video, or document headers to templates.</p>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="p-6">
                  <ImageIcon className="h-8 w-8 text-green-600 mb-3" />
                  <h3 className="font-semibold mb-2">Image Messages</h3>
                  <p className="text-sm text-muted-foreground">JPG, PNG, WebP, GIF support with captions and previews.</p>
                </Card>
                <Card className="p-6">
                  <Video className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold mb-2">Video Messages</h3>
                  <p className="text-sm text-muted-foreground">MP4, MOV, AVI with native HTML5 player.</p>
                </Card>
                <Card className="p-6">
                  <Headphones className="h-8 w-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold mb-2">Audio Messages</h3>
                  <p className="text-sm text-muted-foreground">MP3, AAC, voice messages with waveform display.</p>
                </Card>
                <Card className="p-6">
                  <FileText className="h-8 w-8 text-orange-600 mb-3" />
                  <h3 className="font-semibold mb-2">Documents</h3>
                  <p className="text-sm text-muted-foreground">PDF, DOC, XLS, PPT with download support.</p>
                </Card>
                <Card className="p-6">
                  <Upload className="h-8 w-8 text-green-600 mb-3" />
                  <h3 className="font-semibold mb-2">Drag & Drop</h3>
                  <p className="text-sm text-muted-foreground">Intuitive file upload with multi-file selection.</p>
                </Card>
                <Card className="p-6">
                  <Download className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold mb-2">Download Manager</h3>
                  <p className="text-sm text-muted-foreground">Efficient file downloads with progress tracking.</p>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section id="tech-stack" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4">Technology Stack</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Built with Modern Technologies
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Powered by the best tools and frameworks for performance, scalability, and developer experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Code2 className="h-6 w-6 text-green-600" />
                Frontend
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">Next.js 15</div>
                    <div className="text-sm text-muted-foreground">App Router, Server Components, API Routes</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">React 19</div>
                    <div className="text-sm text-muted-foreground">Modern hooks, Suspense, Server Actions</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">TypeScript 5</div>
                    <div className="text-sm text-muted-foreground">Type safety, better DX, fewer bugs</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">Tailwind CSS</div>
                    <div className="text-sm text-muted-foreground">Utility-first styling, responsive design</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">Shadcn/ui</div>
                    <div className="text-sm text-muted-foreground">Beautiful, accessible components</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Server className="h-6 w-6 text-blue-600" />
                Backend
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">Supabase</div>
                    <div className="text-sm text-muted-foreground">PostgreSQL database, Auth, Real-time</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">WhatsApp Cloud API</div>
                    <div className="text-sm text-muted-foreground">Meta&apos;s official WhatsApp Business API</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">AWS S3</div>
                    <div className="text-sm text-muted-foreground">Scalable media storage with pre-signed URLs</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">PostgreSQL Functions</div>
                    <div className="text-sm text-muted-foreground">Database-level business logic</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">Row Level Security</div>
                    <div className="text-sm text-muted-foreground">Database-level access control</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <Radio className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Real-time</h3>
              <p className="text-sm text-muted-foreground">WebSocket connections for instant updates</p>
            </Card>
            <Card className="p-6 text-center">
              <Lock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Secure</h3>
              <p className="text-sm text-muted-foreground">Authentication, encryption, RLS policies</p>
            </Card>
            <Card className="p-6 text-center">
              <Zap className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Optimized</h3>
              <p className="text-sm text-muted-foreground">Strategic indexes, caching, code splitting</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Self-Hosting Section */}
      <section id="self-hosting" className="py-24 px-6 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4">Self-Hosting Guide</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Deploy Your Own Instance
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Complete control over your data with easy self-hosting options
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 mb-12">
            <div>
              <h3 className="text-2xl font-bold mb-6">Quick Setup</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <h4 className="font-semibold mb-1">Clone Repository</h4>
                    <code className="text-sm bg-muted px-3 py-1 rounded block">
                      git clone https://github.com/hetref/whatsapp-chat
                    </code>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <h4 className="font-semibold mb-1">Install Dependencies</h4>
                    <code className="text-sm bg-muted px-3 py-1 rounded block">
                      npm install
                    </code>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <div>
                    <h4 className="font-semibold mb-1">Setup Environment</h4>
                    <code className="text-sm bg-muted px-3 py-1 rounded block">
                      cp .env.example .env.local
                    </code>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
                  <div>
                    <h4 className="font-semibold mb-1">Run Development Server</h4>
                    <code className="text-sm bg-muted px-3 py-1 rounded block">
                      npm run dev
                    </code>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-6">Prerequisites</h3>
              <div className="space-y-3">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Code2 className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-semibold">Node.js 18+</div>
                      <div className="text-sm text-muted-foreground">JavaScript runtime</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-semibold">Supabase Account</div>
                      <div className="text-sm text-muted-foreground">PostgreSQL database & auth</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-semibold">Meta Business Account</div>
                      <div className="text-sm text-muted-foreground">WhatsApp Business API access</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Cloud className="h-5 w-5 text-orange-600" />
                    <div>
                      <div className="font-semibold">AWS Account</div>
                      <div className="text-sm text-muted-foreground">S3 storage for media files</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          <Card className="p-8 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-start gap-4">
              <FileText className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold mb-2">Complete Documentation</h3>
                <p className="text-muted-foreground mb-4">
                  Detailed setup guide with database migrations, environment variables, WhatsApp API configuration, and deployment instructions available in the README.
                </p>
                <Link 
                  href="https://github.com/hetref/whatsapp-chat#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold"
                >
                  Read Full Documentation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Security & Performance Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4">Security & Performance</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Enterprise-Grade Quality
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="h-8 w-8 text-green-600" />
                <h3 className="text-2xl font-bold">Security Features</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Row Level Security (RLS) policies for data isolation</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Supabase Auth with secure session management</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Input validation and XSS prevention</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Encrypted storage with AWS S3</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">HTTPS-only with secure pre-signed URLs</span>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="h-8 w-8 text-yellow-600" />
                <h3 className="text-2xl font-bold">Performance</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Strategic database indexes for fast queries</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Smart caching and lazy loading for media</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Optimistic UI updates for instant feedback</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Code splitting and dynamic imports</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">WebSocket connections for real-time sync</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-green-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-green-50">
            Deploy your own WhatsApp Business platform in minutes. Star the project on GitHub and join the community!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 bg-white text-green-600 hover:bg-green-50 px-8 py-4 rounded-full font-semibold text-lg transition-colors shadow-lg"
            >
              Start Building Now
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link 
              href="https://github.com/hetref/whatsapp-chat"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-2 border-white text-white hover:bg-white/10 px-8 py-4 rounded-full font-semibold text-lg transition-colors"
            >
              <Star className="h-5 w-5" />
              Star on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-xl mb-4">
                <MessageCircle className="h-6 w-6 text-green-600" />
                <span>WaChat</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Enterprise WhatsApp Business integration platform built with Next.js and Supabase.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#tech-stack" className="hover:text-foreground transition-colors">Tech Stack</a></li>
                <li><a href="#self-hosting" className="hover:text-foreground transition-colors">Self-Hosting</a></li>
                <li><a href="/auth/login" className="hover:text-foreground transition-colors">Get Started</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="https://github.com/hetref/whatsapp-chat" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="https://github.com/hetref/whatsapp-chat#readme" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    Setup Guide
                  </a>
                </li>
                <li>
                  <a href="https://github.com/hetref/whatsapp-chat/issues" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Community</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="https://github.com/hetref/whatsapp-chat" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://github.com/hetref/whatsapp-chat/issues" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    Issues
                  </a>
                </li>
                <li>
                  <a href="https://github.com/hetref/whatsapp-chat/discussions" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    Discussions
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <Separator className="my-8" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>
              © 2025 WaChat. Built with ❤️ using{" "}
              <a href="https://nextjs.org" target="_blank" className="font-semibold hover:underline" rel="noreferrer">
                Next.js
              </a>
              {" "}and{" "}
              <a href="https://supabase.com" target="_blank" className="font-semibold hover:underline" rel="noreferrer">
                Supabase
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              <a 
                href="https://github.com/hetref/whatsapp-chat" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Open Source on GitHub
              </a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
