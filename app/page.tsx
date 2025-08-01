import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { MessageCircle, Users, Zap, Shield } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="w-full border-b border-b-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex justify-between items-center p-4 px-6">
          <div className="flex items-center gap-2 font-bold text-xl">
            <MessageCircle className="h-8 w-8 text-green-600" />
            <span>WhatsApp Web</span>
          </div>
          {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Connect with the
              <span className="text-green-600 block">world instantly</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Send and receive messages, share photos, and stay connected with friends and family through our secure WhatsApp-like messaging platform.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/auth/login"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-colors"
            >
              Get Started
            </Link>
            <Link 
              href="/auth/signup"
              className="border border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 px-8 py-4 rounded-full font-semibold text-lg transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why choose our platform?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Send and receive messages instantly with real-time updates and minimal latency.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold">Secure & Private</h3>
              <p className="text-muted-foreground">
                Your conversations are protected with end-to-end encryption and advanced security.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold">Stay Connected</h3>
              <p className="text-muted-foreground">
                Connect with friends, family, and colleagues from anywhere in the world.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-green-600" />
            <span className="font-semibold">WhatsApp Web</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Powered by{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              className="font-semibold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>{" "}
            and{" "}
            <a
              href="https://nextjs.org"
              target="_blank"
              className="font-semibold hover:underline"
              rel="noreferrer"
            >
              Next.js
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
