"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, CheckCheck, Clock, AlertCircle, Eye, Send, Smartphone, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BroadcastStats {
  total: number;
  read_count: number;
  delivered_count: number;
  sent_count: number;
  failed_count: number;
}

export interface MessageStatusIconProps {
  status?: string | null;
  isOptimistic?: boolean;
  isBroadcast?: boolean;
  broadcastStats?: BroadcastStats | null;
  timestamp?: string | null;
  readAt?: string | null;
  deliveredAt?: string | null;
  errorMessage?: string | null;
  onClick?: () => void;
  className?: string;
  isOwn?: boolean;
}

function formatLogTimestamp(isoString?: string | null): { date: string; time: string; full: string } | null {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const date = isToday
      ? "Today"
      : d.toLocaleDateString([], {
          month: "short",
          day: "numeric",
          year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
        });
    return { date, time, full: `${date} at ${time}` };
  } catch {
    return null;
  }
}

export const MessageStatusIcon: React.FC<MessageStatusIconProps> = ({
  status,
  isOptimistic = false,
  isBroadcast = false,
  broadcastStats,
  timestamp,
  readAt,
  deliveredAt,
  errorMessage,
  onClick,
  className,
  isOwn = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedStatus = (status || (isOptimistic ? "pending" : "sent")).toLowerCase();

  const handleMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const sentTime = formatLogTimestamp(timestamp);
  const deliveredTime = formatLogTimestamp(deliveredAt);
  const readTime = formatLogTimestamp(readAt);

  // Status icon rendering
  const renderIcon = () => {
    if (isOptimistic || normalizedStatus === "pending") {
      return (
        <Clock
          className={cn(
            "h-3.5 w-3.5 animate-pulse",
            isOwn ? "text-white/70" : "text-stone-400"
          )}
        />
      );
    }

    if (normalizedStatus === "failed") {
      return (
        <AlertCircle
          className="h-3.5 w-3.5 text-red-400 drop-shadow-xs animate-in fade-in"
        />
      );
    }

    if (normalizedStatus === "read") {
      // Signature WhatsApp Seen double-check in bright sky blue (#53bdeb)
      return (
        <CheckCheck
          className={cn(
            "h-3.5 w-3.5 text-[#53bdeb] drop-shadow-[0_0_6px_rgba(83,189,235,0.45)] transition-colors duration-200",
            className
          )}
        />
      );
    }

    if (normalizedStatus === "delivered") {
      // Delivered double-check in clear soft white / stone
      return (
        <CheckCheck
          className={cn(
            "h-3.5 w-3.5",
            isOwn ? "text-white/80" : "text-stone-500 dark:text-stone-400"
          )}
        />
      );
    }

    // Default / Sent single tick
    return (
      <Check
        className={cn(
          "h-3.5 w-3.5",
          isOwn ? "text-white/70" : "text-stone-400"
        )}
      />
    );
  };

  // Broadcast presentation
  if (isBroadcast && broadcastStats && broadcastStats.total > 0) {
    const isAllRead = broadcastStats.read_count === broadcastStats.total;
    const hasAnyRead = broadcastStats.read_count > 0;
    const readPercentage = Math.round((broadcastStats.read_count / broadcastStats.total) * 100);

    return (
      <div
        ref={containerRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-all select-none group active:scale-95",
            isOwn
              ? "bg-black/20 hover:bg-black/30 text-white border border-white/10"
              : "bg-stone-200/80 hover:bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
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
          <span className="text-[10px] font-medium leading-none font-mono">
            {broadcastStats.read_count}/{broadcastStats.total}
          </span>
        </button>

        {/* Animated Popover for Broadcast */}
        {isOpen && (
          <div
            className="absolute bottom-full right-0 mb-2.5 z-50 w-72 rounded-2xl border border-stone-200/90 dark:border-stone-800/90 bg-white/95 dark:bg-[#18201B]/95 backdrop-blur-xl p-3.5 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.2)] text-left select-none animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150 ease-out"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Popover Arrow */}
            <div className="absolute -bottom-1.5 right-3 size-3 rotate-45 bg-white dark:bg-[#18201B] border-r border-b border-stone-200/90 dark:border-stone-800/90" />

            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-stone-200/80 dark:border-stone-800/80">
              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 text-[#5F7C65]" />
                <span className="text-[11px] font-semibold tracking-wider uppercase text-stone-500 dark:text-stone-400">
                  Broadcast Delivery
                </span>
              </div>
              <span className="text-[11px] font-mono font-medium text-[#2D583F] dark:text-[#8EAE95]">
                {readPercentage}% Seen
              </span>
            </div>

            {/* Broadcast stats bar */}
            <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden flex mb-3">
              <div
                className="bg-[#53bdeb] h-full transition-all"
                style={{ width: `${(broadcastStats.read_count / broadcastStats.total) * 100}%` }}
                title={`${broadcastStats.read_count} Read`}
              />
              <div
                className="bg-[#5F7C65] h-full transition-all"
                style={{
                  width: `${(Math.max(0, broadcastStats.delivered_count - broadcastStats.read_count) / broadcastStats.total) * 100}%`,
                }}
                title={`${broadcastStats.delivered_count} Delivered`}
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-stone-700 dark:text-stone-300">
                <span className="flex items-center gap-1.5">
                  <CheckCheck className="size-3.5 text-[#53bdeb]" /> Read / Seen
                </span>
                <span className="font-mono font-medium">{broadcastStats.read_count}</span>
              </div>
              <div className="flex items-center justify-between text-stone-700 dark:text-stone-300">
                <span className="flex items-center gap-1.5">
                  <CheckCheck className="size-3.5 text-stone-400" /> Delivered (Unread)
                </span>
                <span className="font-mono font-medium">
                  {Math.max(0, broadcastStats.delivered_count - broadcastStats.read_count)}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-700 dark:text-stone-300">
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-stone-400" /> Sent (Pending delivery)
                </span>
                <span className="font-mono font-medium">
                  {Math.max(0, broadcastStats.sent_count - broadcastStats.delivered_count)}
                </span>
              </div>
              {broadcastStats.failed_count > 0 && (
                <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 text-red-500" /> Failed
                  </span>
                  <span className="font-mono font-medium">{broadcastStats.failed_count}</span>
                </div>
              )}
            </div>

            {onClick && (
              <p className="mt-2.5 pt-2 border-t border-stone-200/80 dark:border-stone-800/80 text-[10px] text-center text-stone-500 hover:text-[#2D583F] dark:hover:text-[#8EAE95] font-medium cursor-pointer">
                Click bubble to inspect recipient logs →
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // 1-on-1 Message Presentation with Animated Audit Log Popover
  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center select-none cursor-pointer transition-transform hover:scale-110 active:scale-95",
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
          onClick?.();
        }}
        aria-label={`Message status: ${normalizedStatus}`}
      >
        {renderIcon()}
      </span>

      {/* Fully Animated Delivery & Read Recipient Popover */}
      {isOpen && (
        <div
          className="absolute bottom-full right-0 mb-2.5 z-50 w-72 rounded-2xl border border-stone-200/90 dark:border-stone-800/90 bg-white/95 dark:bg-[#18201B]/95 backdrop-blur-xl p-3.5 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.22)] text-left select-none animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150 ease-out"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow */}
          <div className="absolute -bottom-1.5 right-3 size-3 rotate-45 bg-white dark:bg-[#18201B] border-r border-b border-stone-200/90 dark:border-stone-800/90" />

          {/* Header with Title and Current State Badge */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-200/80 dark:border-stone-800/80">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Message Status
            </span>

            {/* Dynamic Status Pill */}
            {normalizedStatus === "read" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#53bdeb]/15 text-[#0369a1] dark:text-[#53bdeb] border border-[#53bdeb]/30 shadow-2xs">
                <CheckCheck className="size-3 text-[#53bdeb]" />
                Read
              </span>
            ) : normalizedStatus === "delivered" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#5F7C65]/15 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/30 shadow-2xs">
                <CheckCheck className="size-3 text-[#5F7C65]" />
                Delivered
              </span>
            ) : normalizedStatus === "failed" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 shadow-2xs">
                <AlertCircle className="size-3 text-red-500" />
                Not Delivered
              </span>
            ) : isOptimistic || normalizedStatus === "pending" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
                <Clock className="size-3 text-amber-500 animate-pulse" />
                Sending...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 shadow-2xs">
                <Check className="size-3 text-stone-500" />
                Sent
              </span>
            )}
          </div>

          {/* Recipient Change Log / Timeline */}
          <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
            {/* Step 1: Sent / Dispatched */}
            <div className="relative group/step">
              <div
                className={cn(
                  "absolute -left-6 top-0.5 size-5 rounded-full flex items-center justify-center text-[10px] border shadow-2xs transition-colors",
                  sentTime || !isOptimistic
                    ? "bg-[#5F7C65]/15 border-[#5F7C65]/30 text-[#2D583F] dark:text-[#8EAE95]"
                    : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400"
                )}
              >
                {isOptimistic ? (
                  <Clock className="size-2.5 animate-spin" />
                ) : (
                  <Check className="size-2.5" />
                )}
              </div>
              <div className="text-left">
                <div className="flex items-baseline justify-between gap-1">
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                    {isOptimistic ? "Sending to WhatsApp" : "Sent"}
                  </p>
                  {sentTime && (
                    <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
                      {sentTime.time}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
                  {sentTime ? `${sentTime.date} via Cloud API` : "Submitting to WhatsApp..."}
                </p>
              </div>
            </div>

            {/* Step 2: Delivered to Phone */}
            <div className="relative group/step">
              <div
                className={cn(
                  "absolute -left-6 top-0.5 size-5 rounded-full flex items-center justify-center text-[10px] border shadow-2xs transition-colors",
                  normalizedStatus === "delivered" || normalizedStatus === "read" || deliveredTime
                    ? "bg-[#5F7C65]/15 border-[#5F7C65]/30 text-[#2D583F] dark:text-[#8EAE95]"
                    : normalizedStatus === "failed"
                      ? "bg-red-500/10 border-red-500/30 text-red-500"
                      : "bg-stone-100 dark:bg-stone-800/80 border-stone-200 dark:border-stone-800 text-stone-400"
                )}
              >
                <CheckCheck className="size-2.5" />
              </div>
              <div className="text-left">
                <div className="flex items-baseline justify-between gap-1">
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      normalizedStatus === "delivered" || normalizedStatus === "read" || deliveredTime
                        ? "text-stone-900 dark:text-stone-100"
                        : "text-stone-400 dark:text-stone-500"
                    )}
                  >
                    Delivered
                  </p>
                  {deliveredTime && (
                    <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
                      {deliveredTime.time}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
                  {deliveredTime
                    ? `${deliveredTime.date} to recipient device`
                    : normalizedStatus === "delivered" || normalizedStatus === "read"
                      ? "Delivered to device"
                      : normalizedStatus === "failed"
                        ? "Delivery unreachable"
                        : "Waiting for recipient to receive..."}
                </p>
              </div>
            </div>

            {/* Step 3: Read / Seen */}
            <div className="relative group/step">
              <div
                className={cn(
                  "absolute -left-6 top-0.5 size-5 rounded-full flex items-center justify-center text-[10px] border shadow-2xs transition-colors",
                  normalizedStatus === "read" || readTime
                    ? "bg-[#53bdeb]/15 border-[#53bdeb]/30 text-[#53bdeb]"
                    : "bg-stone-100 dark:bg-stone-800/80 border-stone-200 dark:border-stone-800 text-stone-400"
                )}
              >
                {normalizedStatus === "read" || readTime ? (
                  <CheckCheck className="size-2.5 text-[#53bdeb]" />
                ) : (
                  <Eye className="size-2.5" />
                )}
              </div>
              <div className="text-left">
                <div className="flex items-baseline justify-between gap-1">
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      normalizedStatus === "read" || readTime
                        ? "text-[#0284c7] dark:text-[#53bdeb]"
                        : "text-stone-400 dark:text-stone-500"
                    )}
                  >
                    Read
                  </p>
                  {readTime && (
                    <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
                      {readTime.time}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
                  {readTime
                    ? `Seen ${readTime.date}`
                    : normalizedStatus === "read"
                      ? "Seen by recipient"
                      : "Unread"}
                </p>
              </div>
            </div>
          </div>

          {/* Failure diagnostic banner if failed */}
          {normalizedStatus === "failed" && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/40 rounded-xl text-left">
              <p className="text-[11px] text-red-700 dark:text-red-300 font-medium">
                {errorMessage || "Delivery failed: Recipient phone number may be inactive or blocked."}
              </p>
            </div>
          )}

          {/* Subtext info footer */}
          <div className="mt-3 pt-2 border-t border-stone-200/70 dark:border-stone-800/70 flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500">
            <span className="flex items-center gap-1">
              <Smartphone className="size-3 text-[#5F7C65]" />
              WhatsApp Cloud
            </span>
            <span>Meta Webhook Synced</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageStatusIcon;
