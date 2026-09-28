"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { authClient, signOut } from "@/lib/auth-client";
import { User, Settings, CreditCard, LogOut, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAvatarDropdownProps {
  className?: string;
  align?: "start" | "center" | "end";
}

export function UserAvatarDropdown({ className, align = "end" }: UserAvatarDropdownProps) {
  const { data: session, isPending } = authClient.useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  if (isPending) {
    return (
      <div className={cn("size-8 rounded-full bg-stone-200/70 dark:bg-stone-800 animate-pulse", className)} />
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const name = user.name || "User";
  const email = user.email || "";
  const image = user.image;

  // Extract initials
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

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
            "relative size-8 rounded-full flex items-center justify-center font-medium text-xs text-white bg-[#5F7C65] hover:ring-2 hover:ring-[#5F7C65]/40 transition-all select-none focus:outline-hidden",
            className
          )}
        >
          {image ? (
            <img
              src={image}
              alt={name}
              className="size-full rounded-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={8}
          className="z-50 min-w-56 overflow-hidden rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
        >
          {/* User Header */}
          <div className="flex flex-col px-3 py-2 border-b border-stone-100 dark:border-stone-800/80 mb-1">
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
              {name}
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 truncate">
              {email}
            </span>
          </div>

          {/* Links */}
          <DropdownMenu.Item asChild>
            <Link
              href="/protected/profile"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer outline-hidden"
            >
              <User className="size-4 text-stone-500" />
              <span>Profile Settings</span>
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/protected/billing"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer outline-hidden"
            >
              <CreditCard className="size-4 text-stone-500" />
              <span>Billing & Subscription</span>
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/protected/setup"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer outline-hidden"
            >
              <Settings className="size-4 text-stone-500" />
              <span>WhatsApp Setup</span>
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
