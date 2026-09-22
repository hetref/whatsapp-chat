"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import { useClerk } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Book,
  LogOut,
  CreditCard,
  Lock,
  Users,
  HardDrive,
  AlertTriangle,
  ImageIcon,
  Send,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LogoIcon from "@/components/logo-icon";
import {
  SubscriptionGuard,
  useSubscriptionStatus,
} from "@/components/subscription-guard";
import { ThemeSwitcher } from "@/components/theme-switcher";

const navItems = [
  {
    name: "Chat",
    path: "/protected",
    icon: MessageCircle,
    description: "Messages & conversations",
    requiresFeature: null as string | null,
  },
  {
    name: "Bulk Sender",
    path: "/protected/bulk-sender",
    icon: Send,
    description: "Send bulk messages",
    requiresFeature: "bulkSend" as string | null,
  },
  {
    name: "Templates",
    path: "/protected/templates",
    icon: FileText,
    description: "Manage templates",
    requiresFeature: null as string | null,
  },
  {
    name: "Media",
    path: "/protected/media",
    icon: ImageIcon,
    description: "Media files & uploads",
    requiresFeature: null as string | null,
  },
  {
    name: "API Keys",
    path: "/protected/api-keys",
    icon: Settings,
    description: "API Keys & Configs",
    requiresFeature: "apiAccess" as string | null,
  },
  {
    name: "Billing",
    path: "/protected/billing",
    icon: CreditCard,
    description: "Subscription & payments",
    requiresFeature: null as string | null,
  },
  {
    name: "Setup",
    path: "/protected/setup",
    icon: Book,
    description: "Initial configuration",
    requiresFeature: null as string | null,
  },
];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, userId } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { planTier, usage, loading: subscriptionLoading, subscriptionStatus, messagingBlocked, messagingBlockedReason } =
    useSubscriptionStatus();

  // Auto-collapse sidebar on mobile screens by default
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  }, []);

  // Close sidebar drawer on mobile upon navigation
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FAF8F5] dark:bg-[#0C0F0D]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5F7C65]"></div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-[#FAF8F5]/60 dark:bg-[#0C0F0D] text-stone-900 dark:text-stone-100 overflow-hidden">
      {/* Mobile Top Header (visible only on screens < md) */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-stone-200/80 dark:border-stone-800/80 bg-[#FAF8F5]/95 dark:bg-[#0C0F0D]/95 backdrop-blur-md shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(false)}
            className="size-9 -ml-1.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/60"
            aria-label="Open Navigation"
          >
            <Menu className="size-5 text-stone-700 dark:text-stone-300" />
          </Button>
          <Link href="/" className="flex items-center gap-2 font-semibold text-base tracking-tight text-stone-900 dark:text-stone-100">
            <LogoIcon className="size-6 text-[#5F7C65]" />
            <span>WaChat</span>
          </Link>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeSwitcher />
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop relative, Mobile slide-over drawer) */}
      <aside
        className={cn(
          "flex flex-col border-r border-stone-200/80 dark:border-stone-800/80 bg-[#FAF8F5] dark:bg-[#0C0F0D] transition-all duration-300 ease-in-out shadow-lg md:shadow-none",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-72",
          "md:relative md:h-full",
          sidebarCollapsed ? "max-md:-translate-x-full md:w-16" : "max-md:translate-x-0 md:w-64",
        )}
      >
        {/* Logo/Header */}
        <div className="flex h-16 items-center justify-between border-b border-stone-200/80 dark:border-stone-800/80 px-4">
          {!sidebarCollapsed ? (
            <Link
              href="/"
              className="group flex items-center gap-2.5 font-semibold text-lg tracking-[-0.035em] text-stone-900 dark:text-stone-100 transition-transform active:scale-[0.98]"
            >
              <LogoIcon className="size-7 text-[#5F7C65] transition-transform group-hover:scale-105" />
              <span>WaChat</span>
            </Link>
          ) : (
            <Link href="/" className="mx-auto block" title="WaChat">
              <LogoIcon className="size-7 text-[#5F7C65] hover:scale-105 transition-transform" />
            </Link>
          )}

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(true)}
            className="md:hidden size-8 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
            aria-label="Close Navigation"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item, index) => {
            const isLocked =
              item.requiresFeature &&
              usage &&
              ((item.requiresFeature === "bulkSend" && !usage.bulkSendEnabled) ||
                (item.requiresFeature === "apiAccess" && !usage.apiAccessEnabled));
            const active = isActive(item.path);

            return (
              <Link key={index} href={item.path} className="block group">
                <div
                  className={cn(
                    "flex items-center gap-3 transition-all duration-150 rounded-xl px-3 py-2.5 select-none",
                    sidebarCollapsed ? "justify-center px-2 py-3" : "",
                    active
                      ? "bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#2D583F] dark:text-[#8EAE95] font-semibold border border-[#5F7C65]/25 shadow-2xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/40 border border-transparent",
                    isLocked && "opacity-60",
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      "size-5 transition-transform duration-150",
                      active
                        ? "text-[#2D583F] dark:text-[#8EAE95]"
                        : "text-stone-500 dark:text-stone-400 group-hover:text-stone-800 dark:group-hover:text-stone-200",
                      sidebarCollapsed ? "" : "flex-shrink-0",
                      "group-hover:scale-105"
                    )}
                  />
                  {!sidebarCollapsed && (
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className="text-sm leading-tight flex items-center gap-1.5 truncate">
                        {item.name}
                        {isLocked && (
                          <Lock className="size-3 text-stone-400" />
                        )}
                      </span>
                      <span className="text-[11px] leading-tight text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                        {item.description}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User / Usage Section */}
        <div className="p-3 border-t border-stone-200/80 dark:border-stone-800/80 bg-stone-100/30 dark:bg-stone-900/20">
          {/* Usage stats (only when sidebar expanded) */}
          {!sidebarCollapsed && usage && (
            <div className="mb-3 space-y-2.5 p-2.5 rounded-xl bg-white/70 dark:bg-stone-900/70 border border-stone-200/70 dark:border-stone-800/70 shadow-2xs">
              {/* Contacts */}
              <div>
                <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 mb-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Users className="size-3.5 text-stone-500" />
                    Contacts
                  </span>
                  <span className="font-mono text-[11px]">
                    {usage.contactsUsed}/{usage.contactsLimit}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-stone-200/70 dark:bg-stone-800 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      usage.contactsUsed / usage.contactsLimit > 0.9
                        ? "bg-amber-600 dark:bg-amber-500"
                        : "bg-[#5F7C65]",
                    )}
                    style={{
                      width: `${Math.min(100, (usage.contactsUsed / usage.contactsLimit) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Storage */}
              <div>
                <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 mb-1">
                  <span className="flex items-center gap-1 font-medium">
                    <HardDrive className="size-3.5 text-stone-500" />
                    Storage
                  </span>
                  <span className="font-mono text-[11px]">
                    {usage.storageUsedFormatted}/{usage.storageLimitFormatted}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-stone-200/70 dark:bg-stone-800 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      usage.storageUsed / usage.storageLimit > 0.9
                        ? "bg-amber-600 dark:bg-amber-500"
                        : "bg-[#5F7C65]",
                    )}
                    style={{
                      width: `${Math.min(100, (usage.storageUsed / usage.storageLimit) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Account Profile Card */}
          <div
            className={cn(
              "flex items-center gap-2.5 p-2 rounded-xl bg-white/60 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800/60",
              sidebarCollapsed && "justify-center p-1.5 bg-transparent border-transparent",
            )}
          >
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-8 ring-1 ring-stone-200 dark:ring-stone-700",
                },
              }}
            />
            {!sidebarCollapsed && (
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">Account</span>
                {!subscriptionLoading && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit text-[10px] px-2 py-0 h-4 font-medium mt-0.5 rounded-full border",
                      planTier === "GOLD" &&
                        "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
                      planTier === "SILVER" &&
                        "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
                      planTier === "FREE" &&
                        "bg-[#5F7C65]/10 text-[#2D583F] border-[#5F7C65]/20 dark:bg-[#5F7C65]/20 dark:text-[#8EAE95]",
                    )}
                  >
                    {planTier === "FREE"
                      ? "Free"
                      : planTier === "SILVER"
                        ? "Silver"
                        : "Gold"}
                  </Badge>
                )}
              </div>
            )}
            {!sidebarCollapsed && (
              <ThemeSwitcher className="shrink-0" />
            )}
          </div>

          {/* Collapsed Theme Switcher */}
          {sidebarCollapsed && (
            <div className="flex justify-center pt-2">
              <ThemeSwitcher />
            </div>
          )}

          {/* Logout Button */}
          {!sidebarCollapsed && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 h-8 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-950/20 border-stone-200/80 dark:border-stone-800 rounded-lg transition-colors"
                onClick={() => signOut(() => router.push("/"))}
              >
                <LogOut className="size-3.5" />
                Sign Out
              </Button>
            </div>
          )}
        </div>

        {/* Collapse Toggle (Desktop only) */}
        <button
          type="button"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex absolute -right-3 top-20 size-6 rounded-full border border-stone-200/80 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 items-center justify-center transition-all z-20"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronLeft className="size-3.5" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
        {/* Subscription warning banner */}
        {messagingBlocked && (
          <div className="bg-amber-50/80 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800/60 px-4 py-2.5 flex items-center gap-3">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-900 dark:text-amber-200 flex-1">
              {messagingBlockedReason || 'Messaging is currently blocked.'}
            </p>
            <Link href="/protected/billing">
              <Button variant="outline" size="sm" className="h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-900/50 rounded-lg">
                <CreditCard className="size-3 mr-1" />
                Manage Plan
              </Button>
            </Link>
          </div>
        )}
        <div className="flex-1 min-w-0 min-h-0 h-full overflow-hidden flex flex-col">
          <SubscriptionGuard>{children}</SubscriptionGuard>
        </div>
      </main>
    </div>
  );
}
