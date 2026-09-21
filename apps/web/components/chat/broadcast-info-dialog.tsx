"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, CheckCheck, AlertCircle, Phone, Clock, Eye, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BroadcastRecipient {
  message_id: string;
  contact_id: string;
  contact_name: string;
  phone_number: string;
  status: "sent" | "delivered" | "read" | "failed" | string;
  delivered_at?: string | null;
  read_at?: string | null;
  error_message?: string | null;
  timestamp: string;
}

export interface BroadcastStats {
  total: number;
  read_count: number;
  delivered_count: number;
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
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export const BroadcastInfoDialog: React.FC<BroadcastInfoDialogProps> = ({
  open,
  onOpenChange,
  messageContent,
  timestamp,
  groupName,
  stats,
  recipients = [],
}) => {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "READ" | "DELIVERED" | "SENT" | "FAILED">("ALL");

  const recipientList = recipients || [];
  const readList = recipientList.filter((r) => r.status === "read");
  const deliveredList = recipientList.filter((r) => r.status === "delivered");
  const sentList = recipientList.filter((r) => r.status === "sent" || r.status === "pending");
  const failedList = recipientList.filter((r) => r.status === "failed");

  const filteredRecipients = React.useMemo(() => {
    switch (activeFilter) {
      case "READ":
        return readList;
      case "DELIVERED":
        return deliveredList;
      case "SENT":
        return sentList;
      case "FAILED":
        return failedList;
      default:
        return recipientList;
    }
  }, [activeFilter, recipientList, readList, deliveredList, sentList, failedList]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden sm:rounded-2xl border bg-background shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Broadcast Delivery Info
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {groupName ? `Broadcast to ${groupName}` : "Broadcast Message Details"} · {formatDetailTime(timestamp)}
              </DialogDescription>
            </div>
          </div>

          {/* Snippet preview */}
          {messageContent && (
            <div className="mt-3 p-2.5 bg-background border rounded-lg text-xs text-muted-foreground line-clamp-2 italic">
              "{messageContent}"
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === "READ" ? "ALL" : "READ")}
              className={cn(
                "p-2 rounded-xl border transition-all text-left flex flex-col items-center justify-center",
                activeFilter === "READ"
                  ? "bg-sky-50 border-sky-300 dark:bg-sky-950/40 dark:border-sky-800"
                  : "bg-background hover:bg-muted/60 border-border"
              )}
            >
              <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{stats?.read_count ?? readList.length}</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5">Seen</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === "DELIVERED" ? "ALL" : "DELIVERED")}
              className={cn(
                "p-2 rounded-xl border transition-all text-left flex flex-col items-center justify-center",
                activeFilter === "DELIVERED"
                  ? "bg-slate-100 border-slate-300 dark:bg-slate-900/60 dark:border-slate-700"
                  : "bg-background hover:bg-muted/60 border-border"
              )}
            >
              <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{stats?.delivered_count ?? deliveredList.length}</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5">Delivered</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === "SENT" ? "ALL" : "SENT")}
              className={cn(
                "p-2 rounded-xl border transition-all text-left flex flex-col items-center justify-center",
                activeFilter === "SENT"
                  ? "bg-slate-100 border-slate-300 dark:bg-slate-900/60 dark:border-slate-700"
                  : "bg-background hover:bg-muted/60 border-border"
              )}
            >
              <div className="flex items-center gap-1 text-muted-foreground">
                <Check className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{stats?.sent_count ?? sentList.length}</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5">Sent</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === "FAILED" ? "ALL" : "FAILED")}
              className={cn(
                "p-2 rounded-xl border transition-all text-left flex flex-col items-center justify-center",
                activeFilter === "FAILED"
                  ? "bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-800"
                  : "bg-background hover:bg-muted/60 border-border"
              )}
            >
              <div className="flex items-center gap-1 text-red-500">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{stats?.failed_count ?? failedList.length}</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5">Failed</span>
            </button>
          </div>
        </DialogHeader>

        {/* Recipients list */}
        <div className="p-4 max-h-[340px] overflow-y-auto divide-y divide-border">
          {filteredRecipients.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground space-y-1">
              <Eye className="h-8 w-8 mx-auto opacity-40 mb-2" />
              <p className="text-xs font-medium">No recipients in this filter</p>
              <p className="text-[11px] opacity-75">
                {activeFilter === "READ"
                  ? "No recipients have viewed this message yet"
                  : "Waiting for status updates from WhatsApp"}
              </p>
            </div>
          ) : (
            filteredRecipients.map((recipient) => {
              const isRead = recipient.status === "read";
              const isDelivered = recipient.status === "delivered";
              const isFailed = recipient.status === "failed";
              const initials = (recipient.contact_name || recipient.phone_number || "U")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={recipient.message_id || recipient.contact_id}
                  className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0 border">
                      <AvatarFallback className={cn(
                        "text-xs font-semibold",
                        isRead
                          ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none truncate text-foreground">
                        {recipient.contact_name || recipient.phone_number}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="h-2.5 w-2.5 opacity-60" />
                        {recipient.phone_number}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isRead ? (
                      <div className="flex items-center justify-end gap-1 text-sky-600 dark:text-sky-400">
                        <CheckCheck className="h-4 w-4" />
                        <span className="text-xs font-medium">Seen</span>
                      </div>
                    ) : isDelivered ? (
                      <div className="flex items-center justify-end gap-1 text-muted-foreground">
                        <CheckCheck className="h-4 w-4" />
                        <span className="text-xs">Delivered</span>
                      </div>
                    ) : isFailed ? (
                      <div className="flex items-center justify-end gap-1 text-red-500">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">Failed</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1 text-muted-foreground/70">
                        <Check className="h-3.5 w-3.5" />
                        <span className="text-xs">Sent</span>
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">
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
      </DialogContent>
    </Dialog>
  );
};

export default BroadcastInfoDialog;
