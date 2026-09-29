"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, updateUser, changePassword, signOut } from "@/lib/auth-client";
import { useSubscriptionStatus } from "@/components/subscription-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LogoIcon from "@/components/logo-icon";
import {
  User as UserIcon,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Fingerprint,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Sparkles,
  Clock,
  HardDrive,
  Users,
  CreditCard,
  ArrowRight,
  RefreshCw,
  LogOut,
  Camera,
  Laptop,
  Globe,
  Activity,
  Layers,
  Cpu,
  Database,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { planTier, usage, isActive: subActive } = useSubscriptionStatus();

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>("profile");

  // Profile info state
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Copy ID state
  const [copiedId, setCopiedId] = useState(false);

  // Sync state when session loads
  useEffect(() => {
    if (session?.user) {
      if (session.user.name && !name) {
        setName(session.user.name);
      }
      if (session.user.image && !imageUrl) {
        setImageUrl(session.user.image);
      }
    }
  }, [session?.user]);

  if (isPending) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-[#FAF8F5]/50 dark:bg-[#0C0F0D]">
        <div className="size-14 rounded-2xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 border border-[#5F7C65]/25 flex items-center justify-center text-[#5F7C65] mb-4">
          <Loader2 className="size-7 animate-spin text-[#5F7C65]" />
        </div>
        <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
          Loading sovereign profile &amp; credentials...
        </p>
      </div>
    );
  }

  const user = session?.user;
  if (!user) return null;

  const initials = (user.name || "User")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Password strength calculation
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const strengthScore = [hasMinLength, hasUpperCase, hasNumber, hasSpecial].filter(Boolean).length;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const getStrengthLabel = () => {
    if (!newPassword) return { label: "None", color: "bg-stone-200 dark:bg-stone-700" };
    if (strengthScore <= 1) return { label: "Weak", color: "bg-amber-500" };
    if (strengthScore === 2) return { label: "Fair", color: "bg-amber-400" };
    if (strengthScore === 3) return { label: "Good", color: "bg-[#8EAE95]" };
    return { label: "Strong", color: "bg-[#5F7C65]" };
  };

  const handleCopyId = () => {
    if (!user.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileSaving(true);

    try {
      const result = await updateUser({
        name: name.trim() || user.name || "",
        image: imageUrl.trim() || undefined,
      });

      if (result.error) {
        setProfileMessage({ type: "error", text: result.error.message || "Failed to update profile." });
      } else {
        setProfileMessage({ type: "success", text: "Profile details updated successfully." });
        router.refresh();
      }
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err?.message || "Failed to update profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }

    setPasswordSaving(true);

    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: revokeOthers,
      });

      if (result.error) {
        setPasswordMessage({ type: "error", text: result.error.message || "Failed to change password." });
      } else {
        setPasswordMessage({
          type: "success",
          text: `Password updated successfully.${revokeOthers ? " Other active sessions have been revoked." : ""}`,
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPasswordMessage({ type: "error", text: err?.message || "Failed to change password." });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Contacts progress percentage
  const contactsLimit = usage?.contactsLimit || (planTier === "FREE" ? 10 : 15000);
  const contactsUsed = usage?.contactsUsed || 0;
  const contactsPct = Math.min(100, Math.round((contactsUsed / contactsLimit) * 100));

  // Storage progress
  const storageLimit = usage?.storageLimit || 524288000; // 500MB default
  const storageUsed = usage?.storageUsed || 0;
  const storagePct = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

  return (
    <div className="h-full overflow-y-auto bg-[#FAF8F5]/50 dark:bg-[#0C0F0D]">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20 space-y-8">
        {/* ========================================================================= */}
        {/* 1. HEADER SECTION                                                         */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-stone-200/60 dark:border-stone-800/60">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 mb-3">
              <LogoIcon className="size-3.5 text-[#5F7C65]" />
              <span>Identity &amp; Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-100">
              Account{" "}
              <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">
                Settings
              </span>
            </h1>
            <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base mt-1 max-w-2xl leading-relaxed">
              Manage your personal credentials, workspace identity, authentication safeguards, and session status.
            </p>
          </div>

          {/* Quick status pill strip */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/25">
              <span className="size-1.5 rounded-full bg-[#5F7C65] animate-pulse" />
              Verified Identity
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-mono uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700">
              Tier: {planTier || "Free"}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. EXECUTIVE BENTO ROW: Main Identity Card + Capacity & Security Card     */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Main Identity Doppelrand Card (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5 flex flex-col justify-between">
            <div className="h-full rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-5 sm:p-6 border border-stone-200/60 dark:border-stone-800/60 flex flex-col justify-between space-y-6">
              {/* Top Profile Summary */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Avatar with concentric ring */}
                <div className="relative group shrink-0">
                  <div className="size-20 sm:size-22 rounded-2xl bg-gradient-to-br from-[#5F7C65] to-[#2D583F] text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-white dark:border-stone-800 ring-4 ring-[#5F7C65]/20 overflow-hidden">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name || "User Avatar"}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="tracking-wider">{initials}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-center shadow-xs">
                    <ShieldCheck className="size-3.5 text-[#5F7C65]" />
                  </div>
                </div>

                {/* Identity Information */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 truncate">
                      {user.name || "Unnamed User"}
                    </h2>
                    <Badge
                      variant="outline"
                      className="text-[11px] bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border-[#5F7C65]/30 font-semibold uppercase tracking-wider"
                    >
                      Active
                    </Badge>
                  </div>

                  <p className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-2 truncate">
                    <Mail className="size-3.5 text-[#5F7C65] shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </p>

                  <div className="pt-1 flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700/80 text-[11px] font-mono text-stone-600 dark:text-stone-300 shadow-2xs">
                      <Fingerprint className="size-3 text-[#5F7C65] shrink-0" />
                      <span className="truncate max-w-[150px] sm:max-w-[220px]">
                        {user.id}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        title="Copy Sovereign User ID"
                        className="p-0.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors ml-0.5"
                      >
                        {copiedId ? (
                          <Check className="size-3 text-[#5F7C65]" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                    {copiedId && (
                      <span className="text-[11px] font-medium text-[#2D583F] dark:text-[#8EAE95] animate-fade-in">
                        Copied!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Metadata Badges */}
              <div className="pt-4 border-t border-stone-200/60 dark:border-stone-800/60 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60">
                  <span className="text-[10px] uppercase font-semibold text-stone-400 dark:text-stone-500 tracking-wider block">
                    Security Level
                  </span>
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 mt-0.5">
                    <Shield className="size-3.5 text-[#5F7C65]" />
                    Argon2id Encrypted
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60">
                  <span className="text-[10px] uppercase font-semibold text-stone-400 dark:text-stone-500 tracking-wider block">
                    Auth System
                  </span>
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 mt-0.5">
                    <Layers className="size-3.5 text-[#5F7C65]" />
                    Better Auth Native
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white/60 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60">
                  <span className="text-[10px] uppercase font-semibold text-stone-400 dark:text-stone-500 tracking-wider block">
                    Cloud Connection
                  </span>
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 mt-0.5">
                    <Activity className="size-3.5 text-[#5F7C65]" />
                    Live Cloud API
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Workspace Capacity & Governance Card (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5 flex flex-col justify-between">
            <div className="h-full rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-5 sm:p-6 border border-stone-200/60 dark:border-stone-800/60 flex flex-col justify-between space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-[#5F7C65]/12 border border-[#5F7C65]/20 flex items-center justify-center text-[#5F7C65]">
                    <CreditCard className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Workspace Capacity
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Active Plan &amp; Storage Quotas
                    </p>
                  </div>
                </div>

                <Link
                  href="/protected/billing"
                  className="text-xs font-semibold text-[#2D583F] dark:text-[#8EAE95] hover:underline flex items-center gap-1"
                >
                  Manage
                  <ArrowRight className="size-3" />
                </Link>
              </div>

              {/* Progress 1: Contacts */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                    <Users className="size-3.5 text-stone-400" />
                    Active Contacts
                  </span>
                  <span className="font-mono text-stone-800 dark:text-stone-200 font-semibold">
                    {contactsUsed.toLocaleString()} / {contactsLimit.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full bg-stone-200/80 dark:bg-stone-700/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5F7C65] rounded-full transition-all duration-500"
                    style={{ width: `${contactsPct}%` }}
                  />
                </div>
              </div>

              {/* Progress 2: Storage */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                    <HardDrive className="size-3.5 text-stone-400" />
                    Media Storage
                  </span>
                  <span className="font-mono text-stone-800 dark:text-stone-200 font-semibold">
                    {usage?.storageUsedFormatted || "0 B"} / {usage?.storageLimitFormatted || "500 MB"}
                  </span>
                </div>
                <div className="h-2 w-full bg-stone-200/80 dark:bg-stone-700/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5F7C65] rounded-full transition-all duration-500"
                    style={{ width: `${storagePct}%` }}
                  />
                </div>
              </div>

              {/* Security Shield Banner */}
              <div className="p-3 rounded-xl bg-[#5F7C65]/8 dark:bg-[#5F7C65]/15 border border-[#5F7C65]/20 flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-[#5F7C65] shrink-0" />
                <p className="text-[11px] text-[#2D583F] dark:text-[#8EAE95] font-medium leading-tight">
                  Your credentials and API secrets are protected with hardware-accelerated encryption.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. SETTINGS TABS INTERFACE                                                */}
        {/* ========================================================================= */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Custom Aesthetic Tabs List */}
          <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800/80 pb-3">
            <TabsList className="bg-stone-200/60 dark:bg-stone-800/60 p-1 rounded-xl h-auto gap-1 border border-stone-200/70 dark:border-stone-700/70">
              <TabsTrigger
                value="profile"
                className="rounded-lg px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-[#2D583F] dark:data-[state=active]:text-[#8EAE95] data-[state=active]:shadow-xs transition-all flex items-center gap-2"
              >
                <UserIcon className="size-3.5" />
                <span>Identity &amp; Profile</span>
              </TabsTrigger>

              <TabsTrigger
                value="security"
                className="rounded-lg px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-[#2D583F] dark:data-[state=active]:text-[#8EAE95] data-[state=active]:shadow-xs transition-all flex items-center gap-2"
              >
                <KeyRound className="size-3.5" />
                <span>Password &amp; Credentials</span>
              </TabsTrigger>

              <TabsTrigger
                value="sessions"
                className="rounded-lg px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-[#2D583F] dark:data-[state=active]:text-[#8EAE95] data-[state=active]:shadow-xs transition-all flex items-center gap-2"
              >
                <Shield className="size-3.5" />
                <span>System Security</span>
              </TabsTrigger>
            </TabsList>

            <span className="hidden sm:inline-block text-xs text-stone-400 font-mono">
              Better Auth v1.1
            </span>
          </div>

          {/* ======================================================================= */}
          {/* TAB 1: IDENTITY & PROFILE                                              */}
          {/* ======================================================================= */}
          <TabsContent value="profile" className="focus-visible:outline-none">
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5">
              <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-6 sm:p-8 border border-stone-200/60 dark:border-stone-800/60 space-y-6">
                {/* Section Title */}
                <div className="flex items-center gap-3 pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
                  <div className="size-10 rounded-xl bg-[#5F7C65]/12 border border-[#5F7C65]/20 flex items-center justify-center text-[#5F7C65]">
                    <UserIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                      Personal Identity &amp; Profile Details
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Your display name is visible across chat conversations and message audit records.
                    </p>
                  </div>
                </div>

                {profileMessage && (
                  <div
                    className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs animate-fade-in ${
                      profileMessage.type === "success"
                        ? "bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/25"
                        : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/40"
                    }`}
                  >
                    {profileMessage.type === "success" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-[#5F7C65]" />
                    ) : (
                      <AlertCircle className="size-4 shrink-0" />
                    )}
                    <span className="font-medium">{profileMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                  {/* Grid for Name and Avatar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Display Name Input */}
                    <div>
                      <Label
                        htmlFor="displayName"
                        className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5"
                      >
                        Display Name
                      </Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                        <Input
                          id="displayName"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="pl-10 h-11 rounded-xl bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 focus-visible:ring-[#5F7C65]"
                        />
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Leave blank to retain current system name.
                      </p>
                    </div>

                    {/* Avatar Image URL Input */}
                    <div>
                      <Label
                        htmlFor="avatarUrl"
                        className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5"
                      >
                        Avatar Image URL (Optional)
                      </Label>
                      <div className="relative">
                        <Camera className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                        <Input
                          id="avatarUrl"
                          type="url"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://example.com/avatar.jpg"
                          className="pl-10 h-11 rounded-xl bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 focus-visible:ring-[#5F7C65]"
                        />
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Direct public image link or S3 media asset.
                      </p>
                    </div>
                  </div>

                  {/* Primary Sovereign Email (Read-only) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label
                        htmlFor="accountEmail"
                        className="text-xs font-semibold text-stone-700 dark:text-stone-300"
                      >
                        Primary Account Email
                      </Label>
                      <span className="text-[11px] font-semibold text-[#2D583F] dark:text-[#8EAE95] flex items-center gap-1">
                        <ShieldCheck className="size-3.5 text-[#5F7C65]" />
                        Sovereign Identifier
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                      <Input
                        id="accountEmail"
                        type="email"
                        disabled
                        value={user.email}
                        className="pl-10 h-11 rounded-xl bg-stone-100/70 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-700 text-stone-600 dark:text-stone-400 cursor-not-allowed font-medium"
                      />
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Account email is permanently linked to your authentication provider for sovereign security.
                    </p>
                  </div>

                  {/* Save Profile Button with Button-in-Button architecture */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="group inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-[#5F7C65] hover:bg-[#526D57] active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all duration-200 disabled:opacity-50 cursor-pointer"
                    >
                      <span>Save Profile Changes</span>
                      <span className="size-6 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                        {profileSaving ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </TabsContent>

          {/* ======================================================================= */}
          {/* TAB 2: PASSWORD & CREDENTIALS                                          */}
          {/* ======================================================================= */}
          <TabsContent value="security" className="focus-visible:outline-none">
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5">
              <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-6 sm:p-8 border border-stone-200/60 dark:border-stone-800/60 space-y-6">
                {/* Section Title */}
                <div className="flex items-center gap-3 pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
                  <div className="size-10 rounded-xl bg-[#5F7C65]/12 border border-[#5F7C65]/20 flex items-center justify-center text-[#5F7C65]">
                    <KeyRound className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                      Authentication Password &amp; Credentials
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Change your account password and manage session invalidation across all devices.
                    </p>
                  </div>
                </div>

                {passwordMessage && (
                  <div
                    className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs animate-fade-in ${
                      passwordMessage.type === "success"
                        ? "bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/25"
                        : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/40"
                    }`}
                  >
                    {passwordMessage.type === "success" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-[#5F7C65]" />
                    ) : (
                      <AlertCircle className="size-4 shrink-0" />
                    )}
                    <span className="font-medium">{passwordMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-5 max-w-xl">
                  {/* Current Password */}
                  <div>
                    <Label
                      htmlFor="currentPassword"
                      className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5"
                    >
                      Current Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="pl-10 pr-10 h-11 rounded-xl bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 focus-visible:ring-[#5F7C65]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                        title={showCurrentPassword ? "Hide password" : "Show password"}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label
                        htmlFor="newPassword"
                        className="text-xs font-semibold text-stone-700 dark:text-stone-300"
                      >
                        New Password
                      </Label>
                      {newPassword.length > 0 && (
                        <span className="text-[11px] font-mono font-medium text-stone-500">
                          Strength:{" "}
                          <strong className="text-stone-800 dark:text-stone-200 font-semibold">
                            {getStrengthLabel().label}
                          </strong>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="pl-10 pr-10 h-11 rounded-xl bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 focus-visible:ring-[#5F7C65]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                        title={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>

                    {/* Interactive Password Strength Indicator */}
                    {newPassword.length > 0 && (
                      <div className="mt-2.5 space-y-2 animate-fade-in">
                        <div className="grid grid-cols-4 gap-1.5 h-1.5">
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className={`rounded-full transition-all duration-300 ${
                                strengthScore >= step
                                  ? getStrengthLabel().color
                                  : "bg-stone-200 dark:bg-stone-800"
                              }`}
                            />
                          ))}
                        </div>

                        {/* Requirements Checklist */}
                        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-stone-500">
                          <span
                            className={`flex items-center gap-1.5 ${
                              hasMinLength ? "text-[#2D583F] dark:text-[#8EAE95] font-semibold" : ""
                            }`}
                          >
                            <Check className={`size-3 ${hasMinLength ? "opacity-100 text-[#5F7C65]" : "opacity-30"}`} />
                            8+ Characters
                          </span>
                          <span
                            className={`flex items-center gap-1.5 ${
                              hasUpperCase ? "text-[#2D583F] dark:text-[#8EAE95] font-semibold" : ""
                            }`}
                          >
                            <Check className={`size-3 ${hasUpperCase ? "opacity-100 text-[#5F7C65]" : "opacity-30"}`} />
                            Uppercase letter
                          </span>
                          <span
                            className={`flex items-center gap-1.5 ${
                              hasNumber ? "text-[#2D583F] dark:text-[#8EAE95] font-semibold" : ""
                            }`}
                          >
                            <Check className={`size-3 ${hasNumber ? "opacity-100 text-[#5F7C65]" : "opacity-30"}`} />
                            Numeric digit
                          </span>
                          <span
                            className={`flex items-center gap-1.5 ${
                              hasSpecial ? "text-[#2D583F] dark:text-[#8EAE95] font-semibold" : ""
                            }`}
                          >
                            <Check className={`size-3 ${hasSpecial ? "opacity-100 text-[#5F7C65]" : "opacity-30"}`} />
                            Special character
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label
                        htmlFor="confirmPassword"
                        className="text-xs font-semibold text-stone-700 dark:text-stone-300"
                      >
                        Confirm New Password
                      </Label>
                      {confirmPassword.length > 0 && (
                        <span
                          className={`text-[11px] font-semibold flex items-center gap-1 ${
                            passwordsMatch ? "text-[#2D583F] dark:text-[#8EAE95]" : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {passwordsMatch ? (
                            <>
                              <CheckCircle2 className="size-3 text-[#5F7C65]" />
                              Passwords match
                            </>
                          ) : (
                            <>
                              <AlertCircle className="size-3" />
                              Does not match
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="pl-10 pr-10 h-11 rounded-xl bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 focus-visible:ring-[#5F7C65]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Revoke other sessions checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start gap-3 p-3 rounded-xl bg-stone-100/60 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 cursor-pointer">
                      <Checkbox
                        id="revokeOthers"
                        checked={revokeOthers}
                        onCheckedChange={(checked) => setRevokeOthers(Boolean(checked))}
                        className="mt-0.5 data-[state=checked]:bg-[#5F7C65] data-[state=checked]:border-[#5F7C65]"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-stone-800 dark:text-stone-200 block">
                          Revoke other active sessions upon update
                        </span>
                        <span className="text-stone-500 dark:text-stone-400 mt-0.5 block">
                          Immediately signs out all other computers, browsers, and mobile devices currently logged into this account.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Update Password Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordSaving || (newPassword.length > 0 && !passwordsMatch)}
                      className="group inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-[#5F7C65] hover:bg-[#526D57] active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all duration-200 disabled:opacity-50 cursor-pointer"
                    >
                      <span>Update Password</span>
                      <span className="size-6 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                        {passwordSaving ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Lock className="size-3.5" />
                        )}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </TabsContent>

          {/* ======================================================================= */}
          {/* TAB 3: SYSTEM SECURITY & PROTOCOL                                      */}
          {/* ======================================================================= */}
          <TabsContent value="sessions" className="focus-visible:outline-none">
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5">
              <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-6 sm:p-8 border border-stone-200/60 dark:border-stone-800/60 space-y-6">
                {/* Section Title */}
                <div className="flex items-center gap-3 pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
                  <div className="size-10 rounded-xl bg-[#5F7C65]/12 border border-[#5F7C65]/20 flex items-center justify-center text-[#5F7C65]">
                    <Shield className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                      Sovereign Cryptographic Architecture
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Your authentication engine runs locally on verified database instances with end-to-end auditability.
                    </p>
                  </div>
                </div>

                {/* 4-Bento Grid of Technical Safeguards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card 1 */}
                  <div className="p-4 rounded-xl border border-stone-200/70 dark:border-stone-800/80 bg-white/70 dark:bg-stone-800/40 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Cpu className="size-4 text-[#5F7C65]" />
                      <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                        Cryptographic Password Hashing
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      Passwords are processed using high-cost Scrypt / Argon2id salted key-derivation algorithms, completely immune to rainbow table attacks.
                    </p>
                  </div>

                  {/* Card 2 */}
                  <div className="p-4 rounded-xl border border-stone-200/70 dark:border-stone-800/80 bg-white/70 dark:bg-stone-800/40 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Lock className="size-4 text-[#5F7C65]" />
                      <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                        HTTP-Only Sovereign Cookies
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      Session tokens are stored in signed, encrypted HTTP-only browser cookies with Strict SameSite policies, mitigating XSS exposure.
                    </p>
                  </div>

                  {/* Card 3 */}
                  <div className="p-4 rounded-xl border border-stone-200/70 dark:border-stone-800/80 bg-white/70 dark:bg-stone-800/40 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Database className="size-4 text-[#5F7C65]" />
                      <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                        Neon PostgreSQL Storage
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      User identity, encrypted credentials, and access records reside in your isolated database schema with serverless TLS 1.3 tunnels.
                    </p>
                  </div>

                  {/* Card 4 */}
                  <div className="p-4 rounded-xl border border-stone-200/70 dark:border-stone-800/80 bg-white/70 dark:bg-stone-800/40 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Activity className="size-4 text-[#5F7C65]" />
                      <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                        Meta Cloud API Verification
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      Two-factor registered phone numbers and WhatsApp Business API gateways communicate over authenticated Webhook tokens.
                    </p>
                  </div>
                </div>

                {/* Session Sign Out Danger Zone */}
                <div className="pt-4 border-t border-stone-200/60 dark:border-stone-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      Sign Out of Current Session
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Terminates your current browser session and deletes the active authentication cookie.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      signOut({
                        fetchOptions: {
                          onSuccess: () => {
                            router.push("/");
                            router.refresh();
                          },
                        },
                      })
                    }
                    className="h-9 px-4 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50"
                  >
                    <LogOut className="size-3.5 mr-1.5" />
                    Sign Out Now
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
