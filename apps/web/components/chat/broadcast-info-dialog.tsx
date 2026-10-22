"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Check,
  CheckCheck,
  AlertCircle,
  Phone,
  Clock,
  Eye,
  Radio,
  Search,
  Users,
  EyeOff,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface BroadcastRecipient {
  message_id: string;
  contact_id: string;
  contact_name: string;
  phone_number: string;
  status: "sent" | "delivered" | "read" | "failed" | string;
  is_read?: boolean;
  is_delivered?: boolean;
  delivered_at?: string | null;
  read_at?: string | null;
  error_message?: string | null;
  timestamp: string;
}

export interface BroadcastStats {
  total: number;
  read_count: number;
  delivered_count: number;
  unread_count?: number;
  undelivered_count?: number;
  sent_count: number;
  failed_count: number;
}

interface BroadcastInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageContent?: string;
  timestamp?: string;
  groupName?: string | null;
  stats?: BroadcastStats | null;
  recipients?: BroadcastRecipient[] | null;
}

function formatDetailTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();

    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    }

    return `${d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })} at ${timeStr}`;
  } catch {
    return "";
  }
}

type TabFilter = "ALL" | "READ" | "DELIVERED" | "UNREAD" | "UNDELIVERED" | "FAILED";

export const BroadcastInfoDialog: React.FC<BroadcastInfoDialogProps> = ({
  open,
  onOpenChange,
  messageContent,
  timestamp,
  groupName,
  stats,
  recipients = [],
}) => {
  const [activeFilter, setActiveFilter] = useState<TabFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const recipientList = useMemo(() => recipients || [], [recipients]);

  // Categorize recipients accurately
  const { readList, deliveredList, unreadList, undeliveredList, failedList } = useMemo(() => {
    const read: BroadcastRecipient[] = [];
    const delivered: BroadcastRecipient[] = [];
    const unread: BroadcastRecipient[] = [];
    const undelivered: BroadcastRecipient[] = [];
    const failed: BroadcastRecipient[] = [];

    for (const r of recipientList) {
      const s = (r.status || "").toLowerCase();
      const isRead = Boolean(r.is_read || s === "read" || r.read_at);
      const isDelivered = Boolean(r.is_delivered || isRead || s === "delivered" || r.delivered_at);
      const isFailed = s === "failed" || Boolean(r.error_message);

      if (isFailed) {
        failed.push(r);
      }
      if (isRead) {
        read.push(r);
      } else {
        unread.push(r);
      }
      if (isDelivered) {
        delivered.push(r);
      } else {
        undelivered.push(r);
      }
    }

    return {
      readList: read,
      deliveredList: delivered,
      unreadList: unread,
      undeliveredList: undelivered,
      failedList: failed,
    };
  }, [recipientList]);

  // Derived counts
  const totalCount = stats?.total ?? recipientList.length;
  const readCount = stats?.read_count ?? readList.length;
  const deliveredCount = stats?.delivered_count ?? deliveredList.length;
  const unreadCount = stats?.unread_count ?? unreadList.length;
  const undeliveredCount = stats?.undelivered_count ?? undeliveredList.length;
  const failedCount = stats?.failed_count ?? failedList.length;

  // Filter recipients based on active tab
  const categoryRecipients = useMemo(() => {
    switch (activeFilter) {
      case "READ":
        return readList;
      case "DELIVERED":
        return deliveredList;
      case "UNREAD":
        return unreadList;
      case "UNDELIVERED":
        return undeliveredList;
      case "FAILED":
        return failedList;
      case "ALL":
      default:
        return recipientList;
    }
  }, [activeFilter, recipientList, readList, deliveredList, unreadList, undeliveredList, failedList]);

  // Filter by search query
  const filteredRecipients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoryRecipients;

    return categoryRecipients.filter((r) => {
      const name = (r.contact_name || "").toLowerCase();
      const phone = (r.phone_number || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [categoryRecipients, searchQuery]);

  const readPercent = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;
  const deliveredPercent = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden sm:rounded-2xl border border-stone-200/90 dark:border-stone-800/90 bg-background shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-stone-200/80 dark:border-stone-800/80 bg-stone-50/70 dark:bg-stone-900/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#5F7C65]/15 dark:bg-[#5F7C65]/25 flex items-center justify-center text-[#2D583F] dark:text-[#8EAE95] shadow-xs">
                <Radio className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  Broadcast Read Receipts
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95]">
                    {totalCount} recipients
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {groupName ? `Group: ${groupName}` : "Broadcast message"} · {formatDetailTime(timestamp)}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Message content preview snippet */}
          {messageContent && (
            <div className="mt-3 p-2.5 bg-background border border-stone-200/80 dark:border-stone-800/80 rounded-xl text-xs text-foreground/80 line-clamp-2 italic">
              "{messageContent}"
            </div>
          )}

          {/* Delivery Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
              <span className="font-medium text-foreground/80">Seen: {readPercent}% · Received: {deliveredPercent}%</span>
              <span className="font-mono text-[10px]">{readCount} of {totalCount} read</span>
            </div>
            <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden flex">
              <div
                className="bg-[#53bdeb] h-full transition-all duration-300"
                style={{ width: `${readPercent}%` }}
                title={`${readCount} Read / Seen`}
              />
              <div
                className="bg-[#5F7C65] h-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, (deliveredCount - readCount) / (totalCount || 1)) * 100}%`,
                }}
                title={`${deliveredCount - readCount} Delivered (Unread)`}
              />
              <div
                className="bg-amber-400/80 h-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, (undeliveredCount) / (totalCount || 1)) * 100}%`,
                }}
                title={`${undeliveredCount} Undelivered`}
              />
            </div>
          </div>

          {/* Categorized Filter Tabs (Read, Delivered, Unread, Undelivered, Failed) */}
          <div className="grid grid-cols-5 gap-1.5 mt-3 pt-2 border-t border-stone-200/60 dark:border-stone-800/60 text-center">
            {/* 1. Seen / Read */}
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === "READ" ? "ALL" : "READ")}
              className={cn(
                "p-1.5 rounded-xl border transition-all text-left flex flex-col items-center justify-center cursor-pointer",
                activeFilter === "READ"
                  ? "bg-sky-500/10 border-sky-400/80 dark:bg-sky-950/50 dark:border-sky-700 shadow-2xs"
                  : "bg-background hover:bg-muted/70 border-border"
              )}
            >
              <div className="flex items-center gap-1 text-[#0284c7] dark:text-[#53bdeb]">
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="text-xs font-bold font-mono">{readCount}</span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Read</span>
            </button>

            {/* 2. Received / Delivered */}
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === "DELIVERED" ? "ALL" : "DELIVERED")}
              className={cn(
                "p-1.5 rounded-xl border transition-all text-left flex flex-col items-center justify-center cursor-pointer",
                activeFilter === "DELIVERED"
                  ? "bg-[#5F7C65]/15 border-[#5F7C65]/60 dark:bg-[#5F7C65]/25 dark:border-[#5F7C65]/70 shadow-2xs"
                  : "bg-background hover:bg-muted/70 border-border"
              )}
            >
              <div className="flex items-center gap-1 text-[#2D583F] dark:text-[#8EAE95]">
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="text-xs font-bold font-mono">{deliveredCount}</span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Delivered</span>
            </button>

            {/* 3. Unread */}
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === "UNREAD" ? "ALL" : "UNREAD")}
              className={cn(
                "p-1.5 rounded-xl border transition-all text-left flex flex-col items-center justify-center cursor-pointer",
                activeFilter === "UNREAD"
                  ? "bg-amber-500/15 border-amber-400/80 dark:bg-amber-950/50 dark:border-amber-700 shadow-2xs"
                  : "bg-background hover:bg-muted/70 border-border"
              )}
            >
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <EyeOff className="h-3.5 w-3.5" />
                <span className="text-xs font-bold font-mono">{unreadCount}</span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Unread</span>
            </button>

            {/* 4. Undelivered */}
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === "UNDELIVERED" ? "ALL" : "UNDELIVERED")}
              className={cn(
                "p-1.5 rounded-xl border transition-all text-left flex flex-col items-center justify-center cursor-pointer",
                activeFilter === "UNDELIVERED"
                  ? "bg-slate-100 border-slate-400/80 dark:bg-slate-800/80 dark:border-slate-600 shadow-2xs"
                  : "bg-background hover:bg-muted/70 border-border"
              )}
            >
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <Send className="h-3.5 w-3.5" />
                <span className="text-xs font-bold font-mono">{undeliveredCount}</span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Undelivered</span>
            </button>

            {/* 5. All / Failed */}
            {failedCount > 0 ? (
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === "FAILED" ? "ALL" : "FAILED")}
                className={cn(
                  "p-1.5 rounded-xl border transition-all text-left flex flex-col items-center justify-center cursor-pointer",
                  activeFilter === "FAILED"
                    ? "bg-red-500/15 border-red-400/80 dark:bg-red-950/50 dark:border-red-700 shadow-2xs"
                    : "bg-background hover:bg-muted/70 border-border"
                )}
              >
                <div className="flex items-center gap-1 text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold font-mono">{failedCount}</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Failed</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveFilter("ALL")}
                className={cn(
                  "p-1.5 rounded-xl border transition-all text-left flex flex-col items-center justify-center cursor-pointer",
                  activeFilter === "ALL"
                    ? "bg-[#5F7C65]/10 border-[#5F7C65]/40 text-[#2D583F] dark:text-[#8EAE95] shadow-2xs"
                    : "bg-background hover:bg-muted/70 border-border text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold font-mono">{totalCount}</span>
                </div>
                <span className="text-[10px] font-medium mt-0.5">All</span>
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Search input filter */}
        <div className="px-4 py-2.5 border-b border-border bg-background flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by contact name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-8 text-xs rounded-lg border-stone-200 dark:border-stone-800 bg-muted/40 focus:bg-background transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {activeFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setActiveFilter("ALL")}
              className="text-[11px] text-[#2D583F] dark:text-[#8EAE95] hover:underline font-medium px-1.5 shrink-0"
            >
              Reset filter
            </button>
          )}
        </div>

        {/* Recipients List */}
        <div className="p-4 max-h-[360px] overflow-y-auto divide-y divide-stone-200/80 dark:divide-stone-800/80">
          {filteredRecipients.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Eye className="h-9 w-9 mx-auto opacity-30 mb-2" />
              <p className="text-sm font-semibold text-foreground/80">No recipients match this category</p>
              <p className="text-xs opacity-75 max-w-xs mx-auto">
                {searchQuery
                  ? `No contacts found matching "${searchQuery}"`
                  : activeFilter === "READ"
                  ? "No recipients have seen this message yet. Updates will appear as users open WhatsApp."
                  : activeFilter === "UNDELIVERED"
                  ? "All messages have reached recipients' devices."
                  : activeFilter === "UNREAD"
                  ? "All recipients have seen this broadcast message!"
                  : "No recipients to display."}
              </p>
            </div>
          ) : (
            filteredRecipients.map((recipient) => {
              const s = (recipient.status || "").toLowerCase();
              const isRead = Boolean(recipient.is_read || s === "read" || recipient.read_at);
              const isDelivered = Boolean(recipient.is_delivered || isRead || s === "delivered" || recipient.delivered_at);
              const isFailed = s === "failed" || Boolean(recipient.error_message);

              const displayName = recipient.contact_name || recipient.phone_number || "Contact";
              const initials = displayName.slice(0, 2).toUpperCase();

              return (
                <div
                  key={recipient.message_id || recipient.contact_id}
                  className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded-xl transition-colors"
                >
                  {/* Left: Avatar & Contact Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0 border border-stone-200/80 dark:border-stone-800/80 shadow-2xs">
                      <AvatarFallback
                        className={cn(
                          "text-xs font-semibold",
                          isRead
                            ? "bg-[#53bdeb]/15 text-[#0369a1] dark:text-[#53bdeb]"
                            : isDelivered
                            ? "bg-[#5F7C65]/15 text-[#2D583F] dark:text-[#8EAE95]"
                            : isFailed
                            ? "bg-red-500/15 text-red-600 dark:text-red-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate text-foreground">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                        <Phone className="h-3 w-3 opacity-60 shrink-0" />
                        <span>{recipient.phone_number || "No number recorded"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Status Badge & Timestamps */}
                  <div className="text-right shrink-0">
                    {isRead ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#53bdeb]/15 text-[#0369a1] dark:text-[#53bdeb] border border-[#53bdeb]/30">
                        <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                        <span>Read</span>
                      </div>
                    ) : isDelivered ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#5F7C65]/15 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/30">
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Delivered</span>
                      </div>
                    ) : isFailed ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Failed</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                        <Check className="h-3.5 w-3.5 text-stone-500" />
                        <span>Sent</span>
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground/80 mt-1 font-mono">
                      {isRead && recipient.read_at
                        ? formatDetailTime(recipient.read_at)
                        : isDelivered && recipient.delivered_at
                        ? formatDetailTime(recipient.delivered_at)
                        : isFailed && recipient.error_message
                        ? recipient.error_message
                        : formatDetailTime(recipient.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dialog footer with Meta Cloud API note */}
        <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground px-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Meta Webhook Live Sync
          </span>
          <span className="font-mono text-[10px]">
            Showing {filteredRecipients.length} of {recipientList.length} contacts
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BroadcastInfoDialog;
