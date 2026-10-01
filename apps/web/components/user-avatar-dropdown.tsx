"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { authClient, signOut } from "@/lib/auth-client";
import { User, Settings, CreditCard, LogOut, Loader2, Phone, BadgeCheck, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAvatarDropdownProps {
  className?: string;
  align?: "start" | "center" | "end";
  metaName?: string;
  metaPhone?: string;
  metaImage?: string | null;
  isVerified?: boolean;
}

interface MetaSummary {
  verified_name?: string;
  display_phone_number?: string;
  profile_picture_url?: string | null;
  is_official_business_account?: boolean;
}

export function UserAvatarDropdown({
  className,
  align = "end",
  metaName,
  metaPhone,
  metaImage,
  isVerified,
}: UserAvatarDropdownProps) {
  const { data: session, isPending } = authClient.useSession();
  const [internalMeta, setInternalMeta] = useState<MetaSummary | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dropdownImageError, setDropdownImageError] = useState(false);
  const [dropdownImageLoaded, setDropdownImageLoaded] = useState(false);
  const router = useRouter();

  // Load Meta WhatsApp Business Profile if props not explicitly provided
  const loadMetaProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/business-profile");
      const data = await res.json();
      if (data.connected && data.data) {
        setInternalMeta({
          verified_name: data.data.verified_name,
          display_phone_number: data.data.display_phone_number,
          profile_picture_url: data.data.profile_picture_url,
          is_official_business_account: data.data.is_official_business_account,
        });
      }
    } catch {
      // Graceful fallback to session user
    }
  }, []);

  useEffect(() => {
    loadMetaProfile();

    const handleUpdate = () => {
      loadMetaProfile();
    };

    window.addEventListener("whatsapp-profile-updated", handleUpdate);
    return () => {
      window.removeEventListener("whatsapp-profile-updated", handleUpdate);
    };
  }, [loadMetaProfile]);

  if (isPending) {
    return (
      <div className={cn("size-8 rounded-full bg-stone-200/70 dark:bg-stone-800 animate-pulse", className)} />
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const effectiveName =
    metaName || internalMeta?.verified_name || user.name || "WhatsApp Business";
  const effectivePhone =
    metaPhone || internalMeta?.display_phone_number || "";

  const rawImage =
    metaImage !== undefined
      ? metaImage
      : internalMeta?.profile_picture_url !== undefined
      ? internalMeta.profile_picture_url
      : user.image;

  // Clean empty strings or invalid strings
  const effectiveImage =
    rawImage && typeof rawImage === "string" && rawImage.trim().length > 0 && rawImage !== "null" && rawImage !== "undefined"
      ? rawImage.trim()
      : null;

  const effectiveVerified =
    isVerified !== undefined
      ? isVerified
      : Boolean(internalMeta?.is_official_business_account);

  // Extract initials (max 2 characters)
  const initials =
    effectiveName
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "W";

  const handleSignOut = async () => {
    try {
      setLoggingOut(true);
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/");
            router.refresh();
          },
        },
      });
    } catch (err) {
      console.error("Sign out error:", err);
      router.push("/");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="User Account Menu"
          className={cn(
            "relative size-8 rounded-full flex items-center justify-center font-bold text-xs text-white bg-gradient-to-br from-[#5F7C65] to-[#2D583F] hover:ring-2 hover:ring-[#5F7C65]/40 transition-all select-none focus:outline-hidden overflow-hidden shrink-0 shadow-2xs cursor-pointer",
            className
          )}
        >
          {/* Always display clean initials as base */}
          <span className="tracking-wider text-[11px] font-bold select-none">{initials}</span>

          {/* Smoothly overlay image only if present and not broken */}
          {effectiveImage && !imageError && (
            <img
              src={effectiveImage}
              alt=""
              aria-hidden="true"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={cn(
                "absolute inset-0 size-full rounded-full object-cover transition-opacity duration-200",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
            />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={8}
          className="z-50 min-w-64 overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-2 shadow-xl animate-in fade-in-50 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
        >
          {/* User Header with Meta Business info & Avatar */}
          <div className="flex items-center gap-3 px-2 py-2.5 border-b border-stone-100 dark:border-stone-800/80 mb-1">
            <div className="relative size-10 rounded-full bg-gradient-to-br from-[#5F7C65] to-[#2D583F] text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 shadow-xs border border-stone-200 dark:border-stone-700">
              <span className="tracking-wider select-none">{initials}</span>
              {effectiveImage && !dropdownImageError && (
                <img
                  src={effectiveImage}
                  alt=""
                  aria-hidden="true"
                  onLoad={() => setDropdownImageLoaded(true)}
                  onError={() => setDropdownImageError(true)}
                  className={cn(
                    "absolute inset-0 size-full object-cover transition-opacity duration-200",
                    dropdownImageLoaded ? "opacity-100" : "opacity-0"
                  )}
                />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                  {effectiveName}
                </span>
                {effectiveVerified && (
                  <span title="Verified Business" className="inline-flex shrink-0">
                    <BadgeCheck className="size-3.5 text-sky-600" />
                  </span>
                )}
              </div>
              {effectivePhone && (
                <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <Phone className="size-2.5 text-[#5F7C65]" />
                  <span>{effectivePhone}</span>
                </span>
              )}
              <span className="text-[11px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
                {user.email}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <DropdownMenu.Item asChild>
            <Link
              href="/protected/profile"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer outline-hidden"
            >
              <User className="size-4 text-stone-500" />
              <span>WhatsApp Profile &amp; Avatar</span>
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/protected/profile"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer outline-hidden"
            >
              <BarChart3 className="size-4 text-stone-500" />
              <span>Message Delivery Insights</span>
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/protected/setup"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer outline-hidden"
            >
              <Settings className="size-4 text-stone-500" />
              <span>WhatsApp Setup &amp; Cloud API</span>
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/protected/billing"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer outline-hidden"
            >
              <CreditCard className="size-4 text-stone-500" />
              <span>Billing &amp; Capacity</span>
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-stone-100 dark:bg-stone-800 my-1" />

          {/* Sign Out */}
          <DropdownMenu.Item
            disabled={loggingOut}
            onSelect={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50/80 dark:hover:bg-red-950/30 transition-colors cursor-pointer outline-hidden"
          >
            {loggingOut ? (
              <Loader2 className="size-4 animate-spin text-red-500" />
            ) : (
              <LogOut className="size-4 text-red-500" />
            )}
            <span>Sign Out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
