"use client";

import React from "react";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BroadcastStats {
  total: number;
  read_count: number;
  delivered_count: number;
  sent_count: number;
  failed_count: number;
}

interface MessageStatusIconProps {
  status?: string | null;
  isOptimistic?: boolean;
  isBroadcast?: boolean;
  broadcastStats?: BroadcastStats | null;
  readAt?: string | null;
  deliveredAt?: string | null;
  errorMessage?: string | null;
  onClick?: () => void;
  className?: string;
  isOwn?: boolean;
}

function formatStatusTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export const MessageStatusIcon: React.FC<MessageStatusIconProps> = ({
  status,
  isOptimistic = false,
  isBroadcast = false,
  broadcastStats,
  readAt,
  deliveredAt,
  errorMessage,
  onClick,
  className,
  isOwn = true,
}) => {
  const normalizedStatus = (status || (isOptimistic ? "pending" : "sent")).toLowerCase();

  // Tooltip content helper
  const getTooltip = () => {
    if (isOptimistic || normalizedStatus === "pending") {
      return "Sending...";
    }
    if (normalizedStatus === "failed") {
      return errorMessage ? `Not Delivered: ${errorMessage}` : "Message Not Delivered";
    }
    if (isBroadcast && broadcastStats) {
      return `Broadcast Info: ${broadcastStats.read_count}/${broadcastStats.total} seen. Click to view list.`;
    }
    if (normalizedStatus === "read") {
      const timeStr = formatStatusTime(readAt);
      return timeStr ? `Seen at ${timeStr}` : "Seen · Read";
    }
    if (normalizedStatus === "delivered") {
      const timeStr = formatStatusTime(deliveredAt);
      return timeStr ? `Delivered at ${timeStr} · Unseen` : "Delivered · Unseen";
    }
    return "Sent to WhatsApp · Waiting for delivery";
  };

  const tooltipText = getTooltip();

  // Status icon visual rendering
  const renderIcon = () => {
    if (isOptimistic || normalizedStatus === "pending") {
      return (
        <Clock
          className={cn(
            "h-3 w-3 animate-pulse",
            isOwn ? "text-white/70" : "text-muted-foreground"
          )}
        />
      );
    }

    if (normalizedStatus === "failed") {
      return (
        <AlertCircle
          className="h-3.5 w-3.5 text-red-400 dark:text-red-400 drop-shadow-sm animate-fade-in"
        />
      );
    }

    if (normalizedStatus === "read") {
      // WhatsApp signature cyan/sky-blue double check
      return (
        <CheckCheck
          className={cn(
            "h-3.5 w-3.5 text-[#53bdeb] drop-shadow-sm transition-colors duration-300",
            className
          )}
        />
      );
    }

    if (normalizedStatus === "delivered") {
      // Delivered: Double tick in soft grey/white
      return (
        <CheckCheck
          className={cn(
            "h-3.5 w-3.5",
            isOwn ? "text-white/80" : "text-muted-foreground/90"
          )}
        />
      );
    }

    // Default / Sent: Single tick
    return (
      <Check
        className={cn(
          "h-3.5 w-3.5",
          isOwn ? "text-white/75" : "text-muted-foreground/80"
        )}
      />
    );
  };

  // Broadcast presentation with seen counter and clickable trigger
  if (isBroadcast && broadcastStats && broadcastStats.total > 0) {
    const isAllRead = broadcastStats.read_count === broadcastStats.total;
    const hasAnyRead = broadcastStats.read_count > 0;

    return (
      <button
        type="button"
        onClick={onClick}
        title={tooltipText}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-all select-none group",
          isOwn
            ? "bg-black/15 hover:bg-black/25 text-white"
            : "bg-muted/80 hover:bg-muted text-foreground",
          onClick ? "cursor-pointer active:scale-95" : "cursor-default",
          className
        )}
      >
        <span className="flex items-center">
          {hasAnyRead ? (
            <CheckCheck
              className={cn(
                "h-3.5 w-3.5",
                isAllRead ? "text-[#53bdeb]" : "text-[#53bdeb]/90"
              )}
            />
          ) : broadcastStats.delivered_count > 0 ? (
            <CheckCheck className="h-3.5 w-3.5 text-white/80" />
          ) : (
            <Check className="h-3.5 w-3.5 text-white/70" />
          )}
        </span>
        <span className="text-[10px] font-medium leading-none tracking-tight">
          {broadcastStats.read_count}/{broadcastStats.total}
        </span>
      </button>
    );
  }

  // 1-on-1 Chat presentation
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center select-none",
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      title={tooltipText}
      onClick={onClick}
    >
      {renderIcon()}
    </span>
  );
};

export default MessageStatusIcon;
