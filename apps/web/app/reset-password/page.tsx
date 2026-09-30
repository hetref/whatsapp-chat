"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LogoIcon from "@/components/logo-icon";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing or invalid reset token. Please request a new link.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        setError(result.error.message || "Failed to reset password. The link may have expired.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Please try again.");
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
            Set new password
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Choose a secure password for your WaChat account
          </p>
        </div>

        {/* Success State */}
        {success ? (
          <div className="text-center py-4">
            <div className="size-12 rounded-full bg-[#5F7C65]/15 text-[#5F7C65] dark:text-[#8EAE95] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
              Password reset successful
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
              Your password has been updated. You can now sign in with your new credentials.
            </p>
            <Link href="/sign-in">
              <Button className="w-full h-10 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white">
                Sign in to WaChat
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-3">
                <AlertCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300 flex-1 leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            {!token ? (
              <div className="text-center py-4">
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
                  No reset token found in this link. Please request a new password reset link.
                </p>
                <Link href="/forgot-password">
                  <Button variant="outline" className="rounded-xl">
                    Request new link
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    New password
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="h-10 rounded-xl bg-stone-50/60 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 transition-colors focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Confirm new password
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="h-10 rounded-xl bg-stone-50/60 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 transition-colors focus:outline-none"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white font-medium text-sm transition-all shadow-xs mt-2"
                >
                  {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  <span>Reset Password</span>
                </Button>
              </form>
            )}

            <div className="mt-8 text-center text-xs text-stone-500 dark:text-stone-400">
              <Link
                href="/sign-in"
                className="font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF8F5] dark:bg-[#0C0F0D]">
          <Loader2 className="size-8 animate-spin text-[#5F7C65]" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
