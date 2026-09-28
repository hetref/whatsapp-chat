"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LogoIcon from "@/components/logo-icon";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/protected";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn.email({
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF8F5] dark:bg-[#0C0F0D] p-4 text-stone-900 dark:text-stone-100">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-xl p-8 sm:p-10 animate-in fade-in-50 zoom-in-98 duration-200">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <LogoIcon className="size-8 text-[#5F7C65] transition-transform group-hover:scale-105" />
            <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              WaChat
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Welcome back
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Sign in to manage your WhatsApp messaging & conversations
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-3">
            <AlertCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300 flex-1 leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 h-10 rounded-xl bg-stone-50/60 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#5F7C65] hover:text-[#526D57] dark:text-[#7EA285] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="mt-1.5 h-10 rounded-xl bg-stone-50/60 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white font-medium text-sm transition-all shadow-xs mt-2"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : null}
            <span>Sign In</span>
          </Button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 text-center text-xs text-stone-500 dark:text-stone-400">
          Don't have an account?{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-[#5F7C65] hover:text-[#526D57] dark:text-[#7EA285] transition-colors inline-flex items-center gap-0.5"
          >
            Sign up <ArrowRight className="size-3" />
          </Link>
        </div>

      </div>
    </div>
  );
}
