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
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    name: "Chat",
    path: "/protected",
    icon: MessageCircle,
    description: "Messages & conversations"
  },
  {
    name: "Bulk Sender",
    path: "/protected/bulk-sender",
    icon: MessageCircle,
    description: "Send bulk messages"
  },
  {
    name: "Templates",
    path: "/protected/templates",
    icon: FileText,
    description: "Manage templates"
  },
  {
    name: "Settings",
    path: "/protected/settings",
    icon: Settings,
    description: "API keys & config"
  },
  {
    name: "Setup",
    path: "/protected/setup",
    icon: Book,
    description: "Initial configuration"
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
    if (path === "/protected") {
      return pathname === "/protected";
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r bg-background transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo/Header */}
        <div className="flex h-16 items-center border-b px-4">
          {!sidebarCollapsed ? (
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <MessageCircle className="h-6 w-6 text-primary" />
              <span className="text-primary">
                WaChat
              </span>
            </Link>
          ) : (
            <MessageCircle className="h-6 w-6 text-primary mx-auto" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
          {navItems.map((item, index) => (
            <Link key={index} href={item.path} className="">
              <Button
                variant={isActive(item.path) ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 transition-all py-[30px]",
                  sidebarCollapsed && "justify-center py-0",
                  isActive(item.path) && "shadow-sm"
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-5 w-5", sidebarCollapsed ? "" : "flex-shrink-0")} />
                {!sidebarCollapsed && (
                  <div className="flex flex-col items-start flex-1">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs opacity-70">{item.description}</span>
                  </div>
                )}
              </Button>
            </Link>
          ))}
        </nav>

        <Separator />

        {/* User Section */}
        <div className="p-4 border-t">
          <div className={cn(
            "flex items-center gap-3",
            sidebarCollapsed && "justify-center"
          )}>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9"
                }
              }}
            />
            {!sidebarCollapsed && (
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">Account</span>
                <span className="text-xs text-muted-foreground">Manage profile</span>
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
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
