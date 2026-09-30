"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, changePassword } from "@/lib/auth-client";
import { useSubscriptionStatus } from "@/components/subscription-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  HardDrive,
  Users,
  CreditCard,
  ArrowRight,
  Camera,
  Upload,
  Phone,
  Building2,
  Globe,
  MapPin,
  Info,
  Share2,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Smartphone,
  BadgeCheck,
  Activity,
  Server,
  Radio,
  CheckCheck,
  BarChart3,
  TrendingUp,
  HelpCircle,
  Calendar,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppBusinessProfileData {
  phone_number_id: string;
  business_account_id: string | null;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
  code_verification_status: string;
  status: string;
  name_status?: string;
  account_mode?: string;
  is_official_business_account: boolean;
  about: string;
  address: string;
  description: string;
  email: string;
  profile_picture_url: string | null;
  websites: string[];
  vertical: string;
  waba_name?: string | null;
  timezone?: string | null;
  currency?: string | null;
  webhook_verified?: boolean;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

interface InsightsData {
  range: string;
  dateRange: {
    start: string;
    end: string;
    label: string;
    days: number;
  };
  quality: {
    rating: string;
    status: string;
    throughput: string;
    historyText: string;
  };
  allMessages: {
    sent: number;
    delivered: number;
    received: number;
    read: number;
    deliveryRate: number;
    readRate: number;
  };
  messagesDelivered: {
    total: number;
    marketing: number;
    marketingLite: number;
    utility: number;
    authentication: number;
    authenticationInternational: number;
    aiProvider: number;
    service: number;
  };
  freeMessagesDelivered: {
    total: number;
    freeCustomerService: number;
    freeEntryPoint: number;
  };
  paidMessagesDelivered: {
    total: number;
    marketing: number;
    marketingLite: number;
    utility?: number;
    authentication?: number;
    authenticationInternational?: number;
    aiProvider?: number;
    service?: number;
  };
  approximateTotalCharges: {
    currency: string;
    totalFormatted: string;
    marketing: string;
    marketingLite: string;
    utility?: string;
    authentication?: string;
    authenticationInternational?: string;
    aiProvider?: string;
    service?: string;
  };
  timelineCount?: number;
}

const META_VERTICALS = [
  { value: "UNDEFINED", label: "Select a Category" },
  { value: "PROF_SERVICES", label: "Professional Services" },
  { value: "AUTO", label: "Automotive" },
  { value: "BEAUTY", label: "Beauty, Spa and Salon" },
  { value: "APPAREL", label: "Clothing and Apparel" },
  { value: "EDU", label: "Education" },
  { value: "ENTERTAIN", label: "Entertainment" },
  { value: "EVENT_PLAN", label: "Event Planning and Service" },
  { value: "FINANCE", label: "Finance and Banking" },
  { value: "GROCERY", label: "Food and Grocery" },
  { value: "GOVT", label: "Public Service" },
  { value: "HOTEL", label: "Hotel and Lodging" },
  { value: "HEALTH", label: "Medical and Health" },
  { value: "NONPROFIT", label: "Non-profit" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "RETAIL", label: "Shopping and Retail" },
  { value: "TRAVEL", label: "Travel and Transportation" },
  { value: "OTHER", label: "Other" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { planTier, usage } = useSubscriptionStatus();

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>("whatsapp-profile");

  // WhatsApp Meta Profile States
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaProfile, setMetaProfile] = useState<WhatsAppBusinessProfileData | null>(null);

  // Editable Profile Form States
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [about, setAbout] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [website1, setWebsite1] = useState("");
  const [website2, setWebsite2] = useState("");
  const [vertical, setVertical] = useState("PROF_SERVICES");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  // Delivery Insights States
  const [insightsRange, setInsightsRange] = useState<"7d" | "30d" | "90d">("30d");
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Action states
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  // Hidden file input reference for Meta avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copy states
  const [copiedPhoneId, setCopiedPhoneId] = useState(false);
  const [copiedWabaId, setCopiedWabaId] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);

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

  // Load WhatsApp Business Profile from Meta Graph API
  const loadWhatsAppProfile = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setSyncingMeta(true);
      else setMetaLoading(true);

      const res = await fetch("/api/whatsapp/business-profile");
      const data = await res.json();

      if (data.connected && data.data) {
        setMetaConnected(true);
        setMetaProfile(data.data);

        // Pre-fill editable fields
        setDisplayNameInput(data.data.verified_name || data.data.user?.name || "");
        setAbout(data.data.about || "");
        setDescription(data.data.description || "");
        setAddress(data.data.address || "");
        setEmail(data.data.email || "");
        setVertical(data.data.vertical || "PROF_SERVICES");
        setProfilePictureUrl(data.data.profile_picture_url || null);

        const sites = data.data.websites || [];
        setWebsite1(sites[0] || "");
        setWebsite2(sites[1] || "");

        if (isRefresh) {
          setProfileMessage({ type: "success", text: "Synced live WhatsApp Business profile from Meta." });
        }
      } else {
        setMetaConnected(false);
        setMetaProfile(null);
      }
    } catch (err) {
      console.warn("Error loading WhatsApp profile from Meta:", err);
      setMetaConnected(false);
    } finally {
      setMetaLoading(false);
      setSyncingMeta(false);
    }
  }, []);

  // Load Insights data
  const loadInsights = useCallback(async (range: "7d" | "30d" | "90d" = "30d") => {
    try {
      setInsightsLoading(true);
      const res = await fetch(`/api/whatsapp/insights?range=${range}`);
      const data = await res.json();
      if (data.success) {
        setInsightsData(data);
      }
    } catch (e) {
      console.warn("Error loading WhatsApp insights:", e);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWhatsAppProfile();
    loadInsights("30d");
  }, [loadWhatsAppProfile, loadInsights]);

  // Refetch insights on range change
  const handleRangeChange = (newRange: "7d" | "30d" | "90d") => {
    setInsightsRange(newRange);
    loadInsights(newRange);
  };

  // Handle saving profile changes to Meta
  const handleSaveToMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    const websitesArray = [website1.trim(), website2.trim()].filter(Boolean);

    try {
      const res = await fetch("/api/whatsapp/business-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayNameInput.trim(),
          name: displayNameInput.trim(),
          about: about.trim(),
          description: description.trim(),
          address: address.trim(),
          email: email.trim(),
          websites: websitesArray,
          vertical: vertical,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile on Meta.");
      }

      if (data.displayNameNotice) {
        setProfileMessage({
          type: "warning",
          text: `WhatsApp profile updated on Meta! Note on display name: ${data.displayNameNotice}`,
        });
      } else {
        setProfileMessage({
          type: "success",
          text: "WhatsApp Business profile updated successfully on Meta!",
        });
      }

      // Reload profile to confirm changes
      await loadWhatsAppProfile(true);

      // Notify layout sidebar & avatar dropdown to synchronize immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("whatsapp-profile-updated"));
      }
    } catch (err: unknown) {
      console.error("Save profile error:", err);
      setProfileMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update profile on Meta.",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle direct avatar upload to Meta via Resumable Upload API
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileMessage({ type: "error", text: "Please select an image file (JPEG, PNG, or WEBP)." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage({ type: "error", text: "Image file size must be 5MB or smaller." });
      return;
    }

    setAvatarUploading(true);
    setProfileMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/whatsapp/business-profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload avatar to Meta.");
      }

      setProfileMessage({
        type: "success",
        text: "WhatsApp profile picture updated successfully on Meta!",
      });

      if (data.profile_picture_url) {
        setProfilePictureUrl(data.profile_picture_url);
      }

      // Re-fetch profile to refresh picture
      await loadWhatsAppProfile(true);

      // Notify layout sidebar & avatar dropdown to synchronize immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("whatsapp-profile-updated"));
      }
    } catch (err: unknown) {
      console.error("Avatar upload error:", err);
      setProfileMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to upload avatar to Meta.",
      });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle password update
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
    } catch (err: unknown) {
      setPasswordMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to change password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (sessionLoading || metaLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-[#FAF8F5]/50 dark:bg-[#0C0F0D]">
        <div className="size-14 rounded-2xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 border border-[#5F7C65]/25 flex items-center justify-center text-[#5F7C65] mb-4">
          <Loader2 className="size-7 animate-spin text-[#5F7C65]" />
        </div>
        <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
          Loading connected Meta WhatsApp Business profile...
        </p>
      </div>
    );
  }

  const user = session?.user;
  if (!user) return null;

  // Contacts progress percentage
  const contactsLimit = usage?.contactsLimit || (planTier === "FREE" ? 10 : 15000);
  const contactsUsed = usage?.contactsUsed || 0;
  const contactsPct = Math.min(100, Math.round((contactsUsed / contactsLimit) * 100));

  // Storage progress
  const storageLimit = usage?.storageLimit || 524288000;
  const storageUsed = usage?.storageUsed || 0;
  const storagePct = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

  const effectiveDisplayName = displayNameInput.trim() || metaProfile?.verified_name || user.name || "WhatsApp Business";
  const displayPhone = metaProfile?.display_phone_number || "Not configured";
  const activeAvatarUrl = profilePictureUrl || metaProfile?.profile_picture_url || user.image;

  // Extract initials (up to 2 characters) for fallback display
  const userInitials =
    effectiveDisplayName
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "W";

  // Format quality rating color
  const getQualityBadgeColor = (rating?: string) => {
    switch (rating?.toUpperCase()) {
      case "GREEN":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
      case "YELLOW":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25";
      case "RED":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25";
      default:
        return "bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/25";
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#FAF8F5]/50 dark:bg-[#0C0F0D]">
      {/* Hidden file input for Meta avatar upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-16 space-y-8 max-w-7xl mx-auto">
        {/* ========================================================================= */}
        {/* 1. HEADER SECTION                                                         */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-stone-200/60 dark:border-stone-800/60">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 mb-3">
              <LogoIcon className="size-3.5 text-[#5F7C65]" />
              <span>WhatsApp Business Profile &amp; Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-100">
              Account{" "}
              <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">
                Settings
              </span>
            </h1>
            <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base mt-1 max-w-2xl leading-relaxed">
              Manage your personal credentials, workspace identity, connected Meta WhatsApp Business profile, customer appearance, and message delivery insights.
            </p>
          </div>

          {/* Quick status pill strip */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {metaConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/25">
                <span className="size-1.5 rounded-full bg-[#5F7C65] animate-pulse" />
                Meta Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                <AlertCircle className="size-3.5" />
                Setup Needed
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-mono uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700">
              Tier: {planTier || "Free"}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. EXECUTIVE BENTO ROW: WhatsApp Identity Card + Workspace Capacity Card  */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Main WhatsApp Identity Doppelrand Card (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5 flex flex-col justify-between">
            <div className="h-full rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-5 sm:p-6 border border-stone-200/60 dark:border-stone-800/60 flex flex-col justify-center">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Meta Avatar with concentric ring & direct upload trigger */}
                <div className="relative group shrink-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="size-20 sm:size-22 rounded-2xl bg-gradient-to-br from-[#5F7C65] to-[#2D583F] text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-white dark:border-stone-800 ring-4 ring-[#5F7C65]/20 overflow-hidden cursor-pointer relative"
                    title="Click to change WhatsApp Business profile picture on Meta"
                  >
                    {activeAvatarUrl ? (
                      <img
                        src={activeAvatarUrl}
                        alt={effectiveDisplayName}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="tracking-wider">{userInitials}</span>
                    )}

                    {/* Hover upload overlay */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                      {avatarUploading ? (
                        <Loader2 className="size-6 animate-spin text-white" />
                      ) : (
                        <>
                          <Camera className="size-5 mb-0.5" />
                          <span className="text-[9px] uppercase font-semibold tracking-wider">Change</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute -bottom-1 -right-1 size-7 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-center shadow-xs text-stone-600 dark:text-stone-300 hover:text-[#5F7C65] transition-colors cursor-pointer"
                    title="Upload photo to Meta"
                  >
                    {avatarUploading ? (
                      <Loader2 className="size-3.5 animate-spin text-[#5F7C65]" />
                    ) : (
                      <Camera className="size-3.5" />
                    )}
                  </button>
                </div>

                {/* Identity Information & Actions */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 truncate">
                      {effectiveDisplayName}
                    </h2>
                    {metaProfile?.is_official_business_account && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-full">
                        <BadgeCheck className="size-3 text-sky-600" />
                        Verified Business
                      </span>
                    )}
                    {metaConnected && (
                      <Badge
                        variant="outline"
                        className="text-[11px] bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border-[#5F7C65]/30 font-semibold uppercase tracking-wider"
                      >
                        {metaProfile?.status || "Active"}
                      </Badge>
                    )}
                    {metaProfile?.quality_rating && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-semibold font-mono uppercase px-2 py-0.5 rounded-full border",
                          getQualityBadgeColor(metaProfile.quality_rating)
                        )}
                      >
                        Quality: {metaProfile.quality_rating}
                      </span>
                    )}
                  </div>

                  {/* Connected Phone & Email */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-stone-600 dark:text-stone-400 font-mono">
                    <p className="flex items-center gap-1.5">
                      <Phone className="size-3.5 text-[#5F7C65] shrink-0" />
                      <span className="font-semibold text-stone-800 dark:text-stone-200">{displayPhone}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail className="size-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  </div>

                  {/* Meta Identifiers Strip */}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {/* User ID copy */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700/80 text-[11px] font-mono text-stone-600 dark:text-stone-300 shadow-2xs">
                      <Fingerprint className="size-3 text-stone-400 shrink-0" />
                      <span className="truncate max-w-[120px]">{user.id}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(user.id);
                          setCopiedUserId(true);
                          setTimeout(() => setCopiedUserId(false), 2000);
                        }}
                        title="Copy Workspace User ID"
                        className="p-0.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors ml-0.5"
                      >
                        {copiedUserId ? <Check className="size-3 text-[#5F7C65]" /> : <Copy className="size-3" />}
                      </button>
                    </div>

                    {/* Phone Number ID */}
                    {metaConnected && metaProfile && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700/80 text-[11px] font-mono text-stone-600 dark:text-stone-300 shadow-2xs">
                        <span className="text-stone-400 font-sans text-[10px] uppercase font-semibold">Phone ID:</span>
                        <span>{metaProfile.phone_number_id}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(metaProfile.phone_number_id);
                            setCopiedPhoneId(true);
                            setTimeout(() => setCopiedPhoneId(false), 2000);
                          }}
                          title="Copy Phone Number ID"
                          className="p-0.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors ml-0.5"
                        >
                          {copiedPhoneId ? <Check className="size-3 text-[#5F7C65]" /> : <Copy className="size-3" />}
                        </button>
                      </div>
                    )}

                    {/* Sync Button */}
                    {metaConnected && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          loadWhatsAppProfile(true);
                          loadInsights(insightsRange);
                        }}
                        disabled={syncingMeta}
                        className="h-7 px-2.5 rounded-lg border-stone-200/80 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-[#5F7C65] text-xs gap-1.5 shadow-2xs"
                        title="Sync live details from Meta"
                      >
                        <RefreshCw className={cn("size-3", syncingMeta && "animate-spin text-[#5F7C65]")} />
                        <span>Sync Meta</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workspace Capacity Card (5 cols, matching Image 1) */}
          <div className="lg:col-span-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5 flex flex-col justify-between">
            <div className="h-full rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-5 sm:p-6 border border-stone-200/60 dark:border-stone-800/60 flex flex-col justify-center space-y-4">
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
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TABS INTERFACE                                                         */}
        {/* ========================================================================= */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800/80 pb-3 flex-wrap gap-2">
            <TabsList className="bg-stone-200/60 dark:bg-stone-800/60 p-1 rounded-xl h-auto gap-1 border border-stone-200/70 dark:border-stone-700/70 flex-wrap">
              <TabsTrigger
                value="whatsapp-profile"
                className="rounded-lg px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-[#2D583F] dark:data-[state=active]:text-[#8EAE95] data-[state=active]:shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="size-3.5" />
                <span>WhatsApp Business Profile</span>
              </TabsTrigger>

              <TabsTrigger
                value="insights"
                className="rounded-lg px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-[#2D583F] dark:data-[state=active]:text-[#8EAE95] data-[state=active]:shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <BarChart3 className="size-3.5" />
                <span>Delivery Insights</span>
              </TabsTrigger>

              <TabsTrigger
                value="meta-details"
                className="rounded-lg px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-[#2D583F] dark:data-[state=active]:text-[#8EAE95] data-[state=active]:shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="size-3.5" />
                <span>Meta Technical Status</span>
              </TabsTrigger>

              <TabsTrigger
                value="security"
                className="rounded-lg px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-[#2D583F] dark:data-[state=active]:text-[#8EAE95] data-[state=active]:shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <KeyRound className="size-3.5" />
                <span>Account &amp; Security</span>
              </TabsTrigger>
            </TabsList>

            <span className="hidden sm:inline-block text-xs text-stone-400 font-mono">
              Meta Graph API v23.0
            </span>
          </div>

          {/* ======================================================================= */}
          {/* TAB 1: WHATSAPP BUSINESS PROFILE (with Live Smartphone Preview)         */}
          {/* ======================================================================= */}
          <TabsContent value="whatsapp-profile" className="focus-visible:outline-none">
            {!metaConnected ? (
              <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-2 shadow-sm">
                <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#FAF8F5]/80 dark:bg-[#18201B]/90 p-8 text-center space-y-5 border border-stone-200/60 dark:border-stone-800/60 max-w-xl mx-auto">
                  <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center mx-auto">
                    <AlertCircle className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                      WhatsApp Cloud Account Not Connected
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1.5 leading-relaxed">
                      To manage your WhatsApp Business Profile, profile picture, category, and business details, you need to connect your WhatsApp account via Setup first.
                    </p>
                  </div>
                  <Link href="/protected/setup" className="inline-block pt-2">
                    <Button className="bg-[#5F7C65] hover:bg-[#526D57] text-white rounded-xl shadow-xs px-5">
                      Go to Setup
                      <ArrowRight className="size-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left 7 Columns: Profile Form */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5">
                    <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-6 sm:p-8 border border-stone-200/60 dark:border-stone-800/60 space-y-6">
                      
                      {/* Section Title */}
                      <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-[#5F7C65]/12 border border-[#5F7C65]/20 flex items-center justify-center text-[#5F7C65]">
                            <Building2 className="size-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                              Business Profile Information
                            </h3>
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                              These details are displayed to customers when they view your profile on WhatsApp.
                            </p>
                          </div>
                        </div>
                      </div>

                      {profileMessage && (
                        <div
                          className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs animate-fade-in ${
                            profileMessage.type === "success"
                              ? "bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/25"
                              : profileMessage.type === "warning"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25"
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

                      {/* Profile Picture Card */}
                      <div className="p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 bg-white/70 dark:bg-stone-800/40 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="relative size-16 rounded-2xl bg-gradient-to-br from-[#5F7C65] to-[#2D583F] text-white flex items-center justify-center font-bold text-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden shrink-0">
                              {activeAvatarUrl ? (
                                <img
                                  src={activeAvatarUrl}
                                  alt={effectiveDisplayName}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <span>{userInitials}</span>
                              )}
                              {avatarUploading && (
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                                  <Loader2 className="size-6 animate-spin text-white" />
                                </div>
                              )}
                            </div>

                            <div>
                              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                WhatsApp Profile Picture
                              </h4>
                              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                Visible on your WhatsApp business card. Max 5MB (Square JPG or PNG recommended).
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={avatarUploading}
                              className="rounded-xl border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-[#5F7C65]/10 hover:text-[#5F7C65] text-xs h-9 px-3 gap-1.5 shadow-2xs"
                            >
                              {avatarUploading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Upload className="size-3.5" />
                              )}
                              <span>Change Photo</span>
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Edit Profile Form */}
                      <form onSubmit={handleSaveToMeta} className="space-y-5">
                        {/* Display Name (Editable!) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                              Business Display Name
                            </Label>
                            <span className="text-[11px] text-stone-400 font-mono">
                              {displayNameInput.length}/75
                            </span>
                          </div>
                          <div className="relative">
                            <Input
                              value={displayNameInput}
                              onChange={(e) => setDisplayNameInput(e.target.value)}
                              placeholder="e.g. DevAlly NZ"
                              maxLength={75}
                              className="rounded-xl border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 text-sm pl-9 text-stone-900 dark:text-stone-100 focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65]"
                            />
                            <Building2 className="size-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">
                            Your customer-facing WhatsApp business name. Updates your workspace profile and submits display name to Meta.
                          </p>
                        </div>

                        {/* Category (Vertical) */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                            Business Category
                          </Label>
                          <select
                            value={vertical}
                            onChange={(e) => setVertical(e.target.value)}
                            className="w-full h-10 px-3 py-2 text-sm rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#5F7C65]/30 focus:border-[#5F7C65] transition-all shadow-2xs"
                          >
                            {META_VERTICALS.map((v) => (
                              <option key={v.value} value={v.value}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Description (max 512 chars) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                              Description
                            </Label>
                            <span className={cn(
                              "text-[11px] font-mono",
                              description.length > 512 ? "text-red-500 font-bold" : "text-stone-400"
                            )}>
                              {description.length}/512
                            </span>
                          </div>
                          <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Provide a detailed overview of your business, services, and working hours..."
                            maxLength={512}
                            rows={3}
                            className="rounded-xl border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 text-sm focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65]"
                          />
                        </div>

                        {/* Address (max 256 chars) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                              Business Address
                            </Label>
                            <span className="text-[11px] text-stone-400 font-mono">
                              {address.length}/256
                            </span>
                          </div>
                          <div className="relative">
                            <Input
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="e.g. 123 Victoria Street, Auckland, New Zealand"
                              maxLength={256}
                              className="rounded-xl border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 text-sm pl-9"
                            />
                            <MapPin className="size-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        {/* Email (max 128 chars) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                              Business Contact Email
                            </Label>
                            <span className="text-[11px] text-stone-400 font-mono">
                              {email.length}/128
                            </span>
                          </div>
                          <div className="relative">
                            <Input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="e.g. support@devally.in"
                              maxLength={128}
                              className="rounded-xl border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 text-sm pl-9"
                            />
                            <Mail className="size-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        {/* Websites (Up to 2) */}
                        <div className="space-y-3">
                          <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                            Websites (Up to 2)
                          </Label>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-stone-500">Website 1</span>
                              <span className="text-[11px] text-stone-400 font-mono">{website1.length}/256</span>
                            </div>
                            <div className="relative">
                              <Input
                                value={website1}
                                onChange={(e) => setWebsite1(e.target.value)}
                                placeholder="Primary Website (e.g. https://devally.in)"
                                maxLength={256}
                                className="rounded-xl border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 text-sm pl-9"
                              />
                              <Globe className="size-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-stone-500">Website 2 (Optional)</span>
                              <span className="text-[11px] text-stone-400 font-mono">{website2.length}/256</span>
                            </div>
                            <div className="relative">
                              <Input
                                value={website2}
                                onChange={(e) => setWebsite2(e.target.value)}
                                placeholder="Secondary Website (e.g. https://docs.devally.in)"
                                maxLength={256}
                                className="rounded-xl border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 text-sm pl-9"
                              />
                              <Globe className="size-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        {/* About / Status Message (max 139 chars) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                              About Text (WhatsApp Status Line)
                            </Label>
                            <span className="text-[11px] text-stone-400 font-mono">
                              {about.length}/139
                            </span>
                          </div>
                          <Input
                            value={about}
                            onChange={(e) => setAbout(e.target.value)}
                            placeholder="e.g. Empowering businesses through automated WhatsApp communication"
                            maxLength={139}
                            className="rounded-xl border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 text-sm"
                          />
                        </div>

                        {/* Submit Button */}
                        <div className="pt-3">
                          <Button
                            type="submit"
                            disabled={profileSaving}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] px-6 py-2.5 text-sm font-medium text-white shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_0_rgba(0,0,0,0.18)] outline outline-black/10 transition-all active:scale-[0.97] cursor-pointer"
                          >
                            {profileSaving ? (
                              <>
                                <Loader2 className="size-4 animate-spin text-white" />
                                <span>Saving to Meta...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-4 text-white" />
                                <span>Save Changes to Meta</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </form>

                    </div>
                  </div>
                </div>

                {/* Right 5 Columns: Authentic WhatsApp Smartphone Live Preview Card */}
                <div className="lg:col-span-5 sticky top-6 space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Smartphone className="size-4 text-[#5F7C65]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Live Customer Preview
                    </span>
                  </div>

                  {/* Device Card Shell */}
                  <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/90 shadow-lg p-3">
                    <div className="rounded-[calc(1.5rem-0.375rem)] bg-stone-50 dark:bg-[#131915] border border-stone-200/60 dark:border-stone-800/60 p-6 flex flex-col items-center text-center space-y-4">
                      
                      {/* Avatar */}
                      <div className="size-24 rounded-full bg-gradient-to-br from-[#5F7C65] to-[#2D583F] text-white flex items-center justify-center font-bold text-3xl shadow-md border-4 border-white dark:border-stone-800 ring-2 ring-stone-200 dark:ring-stone-700 overflow-hidden">
                        {activeAvatarUrl ? (
                          <img
                            src={activeAvatarUrl}
                            alt={effectiveDisplayName}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span>{effectiveDisplayName.substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>

                      {/* Name & Phone */}
                      <div>
                        <div className="flex items-center justify-center gap-1.5">
                          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                            {effectiveDisplayName}
                          </h3>
                          {metaProfile?.is_official_business_account && (
                            <BadgeCheck className="size-4 text-sky-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                          {displayPhone}
                        </p>
                      </div>

                      {/* Mockup Action Buttons */}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          className="flex flex-col items-center gap-1 text-[11px] font-medium text-[#2D583F] dark:text-[#8EAE95] hover:opacity-80 transition-opacity"
                        >
                          <div className="size-9 rounded-full bg-[#5F7C65]/12 border border-[#5F7C65]/20 flex items-center justify-center">
                            <Share2 className="size-4" />
                          </div>
                          <span>Share</span>
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="w-full border-t border-stone-200/70 dark:border-stone-800/70 pt-3 text-left space-y-3.5">
                        
                        {/* Category */}
                        <div className="flex items-start gap-3 text-xs">
                          <Building2 className="size-4 text-stone-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              {META_VERTICALS.find((v) => v.value === vertical)?.label || "Professional Services"}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        {description && (
                          <div className="flex items-start gap-3 text-xs">
                            <Info className="size-4 text-stone-400 shrink-0 mt-0.5" />
                            <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed break-words">
                              {description}
                            </p>
                          </div>
                        )}

                        {/* Address */}
                        {address && (
                          <div className="flex items-start gap-3 text-xs">
                            <MapPin className="size-4 text-stone-400 shrink-0 mt-0.5" />
                            <span className="text-stone-600 dark:text-stone-400 text-[11px] break-words">
                              {address}
                            </span>
                          </div>
                        )}

                        {/* Email */}
                        {email && (
                          <div className="flex items-start gap-3 text-xs">
                            <Mail className="size-4 text-stone-400 shrink-0 mt-0.5" />
                            <span className="text-stone-600 dark:text-stone-400 text-[11px] break-all">
                              {email}
                            </span>
                          </div>
                        )}

                        {/* Website 1 */}
                        {website1 && (
                          <div className="flex items-start gap-3 text-xs">
                            <Globe className="size-4 text-stone-400 shrink-0 mt-0.5" />
                            <a
                              href={website1.startsWith("http") ? website1 : `https://${website1}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#2D583F] dark:text-[#8EAE95] hover:underline text-[11px] flex items-center gap-1 break-all"
                            >
                              <span>{website1}</span>
                              <ExternalLink className="size-2.5 shrink-0" />
                            </a>
                          </div>
                        )}

                        {/* Website 2 */}
                        {website2 && (
                          <div className="flex items-start gap-3 text-xs">
                            <Globe className="size-4 text-stone-400 shrink-0 mt-0.5" />
                            <a
                              href={website2.startsWith("http") ? website2 : `https://${website2}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#2D583F] dark:text-[#8EAE95] hover:underline text-[11px] flex items-center gap-1 break-all"
                            >
                              <span>{website2}</span>
                              <ExternalLink className="size-2.5 shrink-0" />
                            </a>
                          </div>
                        )}

                        {/* About Message */}
                        {about && (
                          <div className="pt-2 border-t border-stone-200/50 dark:border-stone-800/50">
                            <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider">
                              About
                            </span>
                            <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5 italic">
                              "{about}"
                            </p>
                          </div>
                        )}

                      </div>

                    </div>
                  </div>

                  <p className="text-[11px] text-stone-400 dark:text-stone-500 text-center px-4 leading-normal">
                    This experience represents how customers view your business profile on WhatsApp across iOS and Android devices.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ======================================================================= */}
          {/* TAB 2: MESSAGE DELIVERY INSIGHTS (Matching Meta Manager Screenshot)      */}
          {/* ======================================================================= */}
          <TabsContent value="insights" className="focus-visible:outline-none space-y-6">
            {!metaConnected ? (
              <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 p-6 text-center">
                <AlertCircle className="size-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  Connect your WhatsApp Account in Setup to unlock delivery insights.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Header Banner ("See the complete picture") */}
                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="size-11 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
                      <TrendingUp className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100">
                        See the complete picture
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Track messaging performance, delivery confirmation, and discover tailored recommendations.
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://business.facebook.com/wa/manage/phone-numbers/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-[#5F7C65]/10 hover:text-[#5F7C65] transition-colors shadow-2xs shrink-0"
                  >
                    <span>See insights in Meta</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>

                {/* 2. Last 30 Day Quality Card */}
                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-5 shadow-xs space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Last 30 day quality
                  </h4>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-semibold font-mono uppercase px-2.5 py-1 rounded-full border",
                        getQualityBadgeColor(insightsData?.quality?.rating || metaProfile?.quality_rating)
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current animate-pulse" />
                      {insightsData?.quality?.rating || metaProfile?.quality_rating || "GREEN"}
                    </span>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      {insightsData?.quality?.historyText || "No data to show"}
                    </p>
                  </div>
                </div>

                {/* 3. Message delivery insights header & filter */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <BarChart3 className="size-4 text-[#5F7C65]" />
                      <span>Message delivery insights</span>
                    </h3>

                    {/* Date range picker dropdown */}
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3.5 text-stone-400" />
                      <select
                        value={insightsRange}
                        onChange={(e) => handleRangeChange(e.target.value as "7d" | "30d" | "90d")}
                        disabled={insightsLoading}
                        className="h-8 px-3 text-xs font-medium rounded-lg border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#5F7C65]"
                      >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">
                          {insightsData?.dateRange?.label || "Aug 31, 2026 - Sep 30, 2026"}
                        </option>
                        <option value="90d">Last 90 Days</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Note: All insights data is approximate and may differ from what's shown on your invoices due to small variations in data processing.
                  </p>
                </div>

                {/* 4. The 5 Insight Cards Grid (Matching Screenshot) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                  
                  {/* Card 1: All Messages */}
                  <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-5 shadow-xs space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-indigo-500" />
                          <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                            All Messages
                          </h4>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                            <span className="text-indigo-400 font-mono">---</span>
                            Messages sent
                            <HelpCircle className="size-3 text-stone-400" />
                          </span>
                          <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {insightsData?.allMessages?.sent ?? 0}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                            <span className="text-indigo-400 font-mono">---</span>
                            Messages delivered
                            <HelpCircle className="size-3 text-stone-400" />
                          </span>
                          <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {insightsData?.allMessages?.delivered ?? 0}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                            <span className="text-indigo-400 font-mono">---</span>
                            Messages received
                            <HelpCircle className="size-3 text-stone-400" />
                          </span>
                          <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {insightsData?.allMessages?.received ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Rate Bar */}
                    <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                        <span>Delivery Rate</span>
                        <span className="font-mono font-bold text-[#5F7C65]">
                          {insightsData?.allMessages?.deliveryRate ?? 100}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-stone-200/80 dark:bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#5F7C65] rounded-full"
                          style={{ width: `${insightsData?.allMessages?.deliveryRate ?? 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Messages Delivered */}
                  {(() => {
                    const deliveredMarketing = insightsData?.messagesDelivered?.marketing ?? 0;
                    const deliveredMarketingLite = insightsData?.messagesDelivered?.marketingLite ?? 0;
                    const deliveredUtility = insightsData?.messagesDelivered?.utility ?? 0;
                    const deliveredAuth = insightsData?.messagesDelivered?.authentication ?? 0;
                    const deliveredAuthIntl = insightsData?.messagesDelivered?.authenticationInternational ?? 0;
                    const deliveredAiProvider = insightsData?.messagesDelivered?.aiProvider ?? 0;
                    let deliveredService = insightsData?.messagesDelivered?.service ?? 0;

                    // In WhatsApp Cloud API, all Free Customer Service conversations belong to the Service category.
                    const freeCustomerServiceCount = insightsData?.freeMessagesDelivered?.freeCustomerService ?? 0;
                    if (freeCustomerServiceCount > deliveredService) {
                      deliveredService = freeCustomerServiceCount;
                    }

                    // Ensure the category breakdown always matches the delivered total
                    const categorySum =
                      deliveredMarketing +
                      deliveredMarketingLite +
                      deliveredUtility +
                      deliveredAuth +
                      deliveredAuthIntl +
                      deliveredAiProvider +
                      deliveredService;

                    const rawTotal = insightsData?.messagesDelivered?.total ?? 0;
                    if (rawTotal > categorySum) {
                      deliveredService += (rawTotal - categorySum);
                    }

                    const finalTotal =
                      deliveredMarketing +
                      deliveredMarketingLite +
                      deliveredUtility +
                      deliveredAuth +
                      deliveredAuthIntl +
                      deliveredAiProvider +
                      deliveredService;

                    return (
                      <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-5 shadow-xs space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                            <div className="flex items-center gap-2">
                              <span className="size-2 rounded-full bg-emerald-500" />
                              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                                Messages Delivered
                                <HelpCircle className="size-3 text-stone-400" />
                              </h4>
                            </div>
                            <span className="text-xs font-mono font-bold text-stone-800 dark:text-stone-200">
                              {finalTotal}
                            </span>
                          </div>

                          <div className="space-y-2 pt-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-sky-400 font-mono">---</span> Marketing
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {deliveredMarketing}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-amber-400 font-mono">---</span> Marketing - lite
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {deliveredMarketingLite}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-rose-400 font-mono">---</span> Utility
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {deliveredUtility}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-stone-400 font-mono">---</span> Authentication
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {deliveredAuth}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-stone-400 font-mono">---</span> Authentication - international
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {deliveredAuthIntl}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-teal-400 font-mono">---</span> AI Provider
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {deliveredAiProvider}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-emerald-400 font-mono">---</span> Service
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {deliveredService}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card 3: Free Messages Delivered */}
                  {(() => {
                    const freeCustService = insightsData?.freeMessagesDelivered?.freeCustomerService ?? 0;
                    const freeEntryPoint = insightsData?.freeMessagesDelivered?.freeEntryPoint ?? 0;
                    const freeTotal = Math.max(insightsData?.freeMessagesDelivered?.total ?? 0, freeCustService + freeEntryPoint);

                    return (
                      <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-5 shadow-xs space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                            <div className="flex items-center gap-2">
                              <span className="size-2 rounded-full bg-sky-500" />
                              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                                Free Messages Delivered
                                <HelpCircle className="size-3 text-stone-400" />
                              </h4>
                            </div>
                            <span className="text-xs font-mono font-bold text-stone-800 dark:text-stone-200">
                              {freeTotal}
                            </span>
                          </div>

                          <div className="space-y-2.5 pt-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-sky-400 font-mono">---</span>
                                Free customer service
                                <HelpCircle className="size-3 text-stone-400" />
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {freeCustService}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-indigo-400 font-mono">---</span>
                                Free entry point
                                <HelpCircle className="size-3 text-stone-400" />
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {freeEntryPoint}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 text-[11px] text-sky-800 dark:text-sky-300">
                          WhatsApp grants 1,000 free service tier conversations per business account each month.
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card 4: Paid Messages Delivered */}
                  {(() => {
                    const paidMarketing = insightsData?.paidMessagesDelivered?.marketing ?? 0;
                    const paidMarketingLite = insightsData?.paidMessagesDelivered?.marketingLite ?? 0;
                    const paidUtility = insightsData?.paidMessagesDelivered?.utility ?? 0;
                    const paidAuth = insightsData?.paidMessagesDelivered?.authentication ?? 0;
                    const paidAuthIntl = insightsData?.paidMessagesDelivered?.authenticationInternational ?? 0;
                    const paidAiProvider = insightsData?.paidMessagesDelivered?.aiProvider ?? 0;
                    const paidService = insightsData?.paidMessagesDelivered?.service ?? 0;
                    const paidTotal =
                      paidMarketing +
                      paidMarketingLite +
                      paidUtility +
                      paidAuth +
                      paidAuthIntl +
                      paidAiProvider +
                      paidService;

                    return (
                      <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-5 shadow-xs space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                            <div className="flex items-center gap-2">
                              <span className="size-2 rounded-full bg-purple-500" />
                              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                                Paid Messages Delivered
                                <HelpCircle className="size-3 text-stone-400" />
                              </h4>
                            </div>
                            <span className="text-xs font-mono font-bold text-stone-800 dark:text-stone-200">
                              {paidTotal}
                            </span>
                          </div>

                          <div className="space-y-2 pt-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-sky-400 font-mono">---</span> Marketing
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {paidMarketing}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-amber-400 font-mono">---</span> Marketing - lite
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {paidMarketingLite}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-rose-400 font-mono">---</span> Utility
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {paidUtility}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-stone-400 font-mono">---</span> Authentication
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {paidAuth}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-stone-400 font-mono">---</span> Authentication - international
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {paidAuthIntl}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-teal-400 font-mono">---</span> AI Provider
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {paidAiProvider}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                <span className="text-emerald-400 font-mono">---</span> Service
                              </span>
                              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                                {paidService}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-[11px] text-purple-800 dark:text-purple-300">
                          Paid messages are billed based on Meta's conversation-based pricing model by country.
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card 5: Approximate Total Charges */}
                  <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-5 shadow-xs space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-600" />
                          <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                            Approximate Total Charges
                            <HelpCircle className="size-3 text-stone-400" />
                          </h4>
                        </div>
                        <span className="text-xs font-mono font-bold text-stone-800 dark:text-stone-200">
                          {insightsData?.approximateTotalCharges?.totalFormatted ?? "₹0.00 INR"}
                        </span>
                      </div>

                      <div className="space-y-2 pt-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                            <span className="text-sky-400 font-mono">---</span> Marketing
                          </span>
                          <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {insightsData?.approximateTotalCharges?.marketing ?? "₹ 0.00 INR"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                            <span className="text-amber-400 font-mono">---</span> Marketing - lite
                          </span>
                          <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {insightsData?.approximateTotalCharges?.marketingLite ?? "₹ 0.00 INR"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                            <span className="text-rose-400 font-mono">---</span> Utility
                          </span>
                          <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {insightsData?.approximateTotalCharges?.utility ?? "₹ 0.00 INR"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                            <span className="text-stone-400 font-mono">---</span> Authentication
                          </span>
                          <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {insightsData?.approximateTotalCharges?.authentication ?? "₹ 0.00 INR"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                            <span className="text-stone-400 font-mono">---</span> Authentication - international
                          </span>
                          <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {insightsData?.approximateTotalCharges?.authenticationInternational ?? "₹ 0.00 INR"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                            <span className="text-teal-400 font-mono">---</span> AI Provider
                          </span>
                          <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {insightsData?.approximateTotalCharges?.aiProvider ?? "₹ 0.00 INR"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                            <span className="text-emerald-400 font-mono">---</span> Service
                          </span>
                          <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {insightsData?.approximateTotalCharges?.service ?? "₹ 0.00 INR"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-[11px] text-stone-600 dark:text-stone-400">
                      Invoiced by Meta directly to your linked Meta Business payment method.
                    </div>
                  </div>

                </div>
              </div>
            )}
          </TabsContent>

          {/* ======================================================================= */}
          {/* TAB 3: META TECHNICAL STATUS & PARAMETERS                                */}
          {/* ======================================================================= */}
          <TabsContent value="meta-details" className="focus-visible:outline-none space-y-6">
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5 max-w-4xl">
              <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-6 sm:p-8 border border-stone-200/60 dark:border-stone-800/60 space-y-6">
                
                {/* Title */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800/60 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-[#5F7C65]/12 border border-[#5F7C65]/20 flex items-center justify-center text-[#5F7C65]">
                      <Server className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                        Meta Cloud API &amp; Account Parameters
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Live infrastructure telemetry queried directly from Meta Graph API.
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://business.facebook.com/wa/manage/phone-numbers/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D583F] dark:text-[#8EAE95] hover:underline"
                  >
                    <span>Meta WhatsApp Manager</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>

                {/* Quick Insights Telemetry Callout */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#5F7C65]/10 via-[#2D583F]/10 to-transparent border border-[#5F7C65]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-[#5F7C65]/20 text-[#2D583F] dark:text-[#8EAE95] flex items-center justify-center">
                      <BarChart3 className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                        Live Messaging Insights
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        {insightsData?.allMessages?.sent ?? 0} sent • {insightsData?.allMessages?.delivered ?? 0} delivered • {insightsData?.allMessages?.received ?? 0} received
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("insights")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2D583F] dark:text-[#8EAE95] hover:underline cursor-pointer"
                  >
                    <span>View Full Delivery Insights</span>
                    <ArrowRight className="size-3" />
                  </button>
                </div>

                {/* Technical Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Parameter: Phone ID */}
                  <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Phone Number ID</span>
                    <div className="flex items-center justify-between font-mono text-xs font-semibold text-stone-800 dark:text-stone-200">
                      <span>{metaProfile?.phone_number_id || "Not configured"}</span>
                      {metaProfile?.phone_number_id && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(metaProfile.phone_number_id);
                            setCopiedPhoneId(true);
                            setTimeout(() => setCopiedPhoneId(false), 2000);
                          }}
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                        >
                          {copiedPhoneId ? <Check className="size-3.5 text-[#5F7C65]" /> : <Copy className="size-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Parameter: WABA ID */}
                  <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">WABA ID</span>
                    <div className="flex items-center justify-between font-mono text-xs font-semibold text-stone-800 dark:text-stone-200">
                      <span>{metaProfile?.business_account_id || "Auto-managed"}</span>
                      {metaProfile?.business_account_id && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(metaProfile.business_account_id || "");
                            setCopiedWabaId(true);
                            setTimeout(() => setCopiedWabaId(false), 2000);
                          }}
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                        >
                          {copiedWabaId ? <Check className="size-3.5 text-[#5F7C65]" /> : <Copy className="size-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Parameter: Quality Rating */}
                  <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Quality Rating</span>
                    <div>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-semibold font-mono uppercase px-2 py-0.5 rounded-full border",
                        getQualityBadgeColor(metaProfile?.quality_rating)
                      )}>
                        <Activity className="size-3" />
                        {metaProfile?.quality_rating || "UNKNOWN"}
                      </span>
                    </div>
                  </div>

                  {/* Parameter: Code Verification Status */}
                  <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Code Verification</span>
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <CheckCheck className="size-3.5 text-[#5F7C65]" />
                      <span>{metaProfile?.code_verification_status || "VERIFIED"}</span>
                    </p>
                  </div>

                  {/* Parameter: Name Approval Status */}
                  <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Name Approval Status</span>
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <BadgeCheck className="size-3.5 text-sky-600" />
                      <span>{metaProfile?.name_status || "APPROVED"}</span>
                    </p>
                  </div>

                  {/* Parameter: Account Mode */}
                  <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Account Mode</span>
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <Radio className="size-3.5 text-[#5F7C65]" />
                      <span>{metaProfile?.account_mode || "LIVE"}</span>
                    </p>
                  </div>

                  {/* Parameter: WABA Account Name */}
                  {metaProfile?.waba_name && (
                    <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">WABA Account Name</span>
                      <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                        {metaProfile.waba_name}
                      </p>
                    </div>
                  )}

                  {/* Parameter: Timezone & Currency */}
                  {(metaProfile?.timezone || metaProfile?.currency) && (
                    <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Timezone &amp; Currency</span>
                      <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                        {metaProfile.timezone || "UTC"} ({metaProfile.currency || "USD"})
                      </p>
                    </div>
                  )}

                  {/* Parameter: Webhook Sync Status */}
                  <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Webhook Verification</span>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-[#5F7C65]" />
                      <span>Active &amp; Subscribed</span>
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </TabsContent>

          {/* ======================================================================= */}
          {/* TAB 4: ACCOUNT & SECURITY (Password Change & Credentials)                */}
          {/* ======================================================================= */}
          <TabsContent value="security" className="focus-visible:outline-none">
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-1.5 max-w-3xl">
              <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-6 sm:p-8 border border-stone-200/60 dark:border-stone-800/60 space-y-6">
                
                {/* Title */}
                <div className="flex items-center gap-3 pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
                  <div className="size-10 rounded-xl bg-[#5F7C65]/12 border border-[#5F7C65]/20 flex items-center justify-center text-[#5F7C65]">
                    <KeyRound className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                      Password &amp; Credentials
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Update your workspace login password and configure session revocation.
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

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Current Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        required
                        className="rounded-xl border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 pr-10 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                      >
                        {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        required
                        className="rounded-xl border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 pr-10 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        required
                        className="rounded-xl border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 pr-10 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Revoke others checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="revokeOthers"
                      checked={revokeOthers}
                      onCheckedChange={(checked) => setRevokeOthers(Boolean(checked))}
                    />
                    <label
                      htmlFor="revokeOthers"
                      className="text-xs text-stone-600 dark:text-stone-400 cursor-pointer"
                    >
                      Revoke all other active device sessions upon password change
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={passwordSaving}
                      className="rounded-xl bg-[#5F7C65] hover:bg-[#526D57] text-white px-5 h-10 text-sm font-medium shadow-xs cursor-pointer"
                    >
                      {passwordSaving ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <span>Update Password</span>
                      )}
                    </Button>
                  </div>
                </form>

              </div>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
