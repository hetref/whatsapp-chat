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
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Home,
  Book,
  LogOut,
  CreditCard,
  Lock,
  Users,
  HardDrive,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  SubscriptionGuard,
  useSubscriptionStatus,
} from "@/components/subscription-guard";

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
    icon: MessageCircle,
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
    name: "Settings",
    path: "/protected/settings",
    icon: Settings,
    description: "API keys & config",
    requiresFeature: "apiAccess" as string | null,
  },
  {
    name: "Billing",
    path: "/protected/settings/billing",
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

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
    <div className="h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r bg-background transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo/Header */}
        <div className="flex h-16 items-center border-b px-4">
          {!sidebarCollapsed ? (
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg"
            >
              <MessageCircle className="h-6 w-6 text-primary" />
              <span className="text-primary">WaChat</span>
            </Link>
          ) : (
            <MessageCircle className="h-6 w-6 text-primary mx-auto" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
          {navItems.map((item, index) => {
            const isLocked =
              item.requiresFeature &&
              usage &&
              ((item.requiresFeature === "bulkSend" && !usage.bulkSendEnabled) ||
                (item.requiresFeature === "apiAccess" && !usage.apiAccessEnabled));

            return (
              <Link key={index} href={item.path} className="">
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 transition-all py-[30px]",
                    sidebarCollapsed && "justify-center py-0",
                    isActive(item.path) && "shadow-sm",
                    isLocked && "opacity-60",
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      sidebarCollapsed ? "" : "flex-shrink-0",
                    )}
                  />
                  {!sidebarCollapsed && (
                    <div className="flex flex-col items-start flex-1">
                      <span className="font-medium flex items-center gap-1.5">
                        {item.name}
                        {isLocked && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </span>
                      <span className="text-xs opacity-70">
                        {item.description}
                      </span>
                    </div>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* User Section */}
        <div className="p-4 border-t">
          {/* Usage stats (only when sidebar expanded) */}
          {!sidebarCollapsed && usage && (
            <div className="mb-3 space-y-2">
              {/* Contacts */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Contacts
                </span>
                <span>
                  {usage.contactsUsed}/{usage.contactsLimit}
                </span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    usage.contactsUsed / usage.contactsLimit > 0.9
                      ? "bg-red-500"
                      : "bg-primary",
                  )}
                  style={{
                    width: `${Math.min(100, (usage.contactsUsed / usage.contactsLimit) * 100)}%`,
                  }}
                />
              </div>
              {/* Storage */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  Storage
                </span>
                <span>
                  {usage.storageUsedFormatted}/{usage.storageLimitFormatted}
                </span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    usage.storageUsed / usage.storageLimit > 0.9
                      ? "bg-red-500"
                      : "bg-primary",
                  )}
                  style={{
                    width: `${Math.min(100, (usage.storageUsed / usage.storageLimit) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div
            className={cn(
              "flex items-center gap-3",
              sidebarCollapsed && "justify-center",
            )}
          >
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
            />
            {!sidebarCollapsed && (
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">Account</span>
                {!subscriptionLoading && (
                  <Badge
                    variant={planTier === "FREE" ? "secondary" : "default"}
                    className={cn(
                      "w-fit text-xs mt-1",
                      planTier === "GOLD" &&
                      "bg-amber-500 hover:bg-amber-600 text-white",
                      planTier === "SILVER" &&
                      "bg-slate-400 hover:bg-slate-500 text-white",
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
          </div>
        </div>

        {/* Logout Button */}
        {!sidebarCollapsed && (
          <div className="px-4 pb-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800"
              onClick={() => signOut(() => router.push("/"))}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        )}

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-md hover:shadow-lg transition-all"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Subscription warning banner */}
        {messagingBlocked && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
              {messagingBlockedReason || 'Messaging is currently blocked.'}
            </p>
            <Link href="/protected/settings/billing">
              <Button variant="outline" size="sm" className="h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50">
                <CreditCard className="h-3 w-3 mr-1" />
                Manage Plan
              </Button>
            </Link>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <SubscriptionGuard>{children}</SubscriptionGuard>
        </div>
      </main>
    </div>
  );
}
