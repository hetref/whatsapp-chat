"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Edit3,
  Check,
  Phone,
  MessageSquare,
  Clock,
  User,
  Copy,
  CheckCheck,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface ChatUser {
  id: string;
  phone_number: string;
  name: string;
  custom_name?: string;
  whatsapp_name?: string;
  last_active: string;
  unread_count?: number;
  last_message_time?: string;
}

interface UserInfoDialogProps {
  user: ChatUser;
  isOpen: boolean;
  onClose: () => void;
  onUpdateName: (userId: string, customName: string) => Promise<void>;
  onOpenTemplateSelector?: () => void;
}

export function UserInfoDialog({
  user,
  isOpen,
  onClose,
  onUpdateName,
  onOpenTemplateSelector,
}: UserInfoDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(user.custom_name || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!isOpen) return null;

  const getDisplayName = () => {
    return user.custom_name || user.whatsapp_name || user.phone_number;
  };

  const formatLastActive = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.abs(now.getTime() - date.getTime()) / (1000 * 60);

    if (diffInMinutes < 1) {
      return "Active just now";
    } else if (diffInMinutes < 60) {
      const mins = Math.floor(diffInMinutes);
      return `${mins} min${mins !== 1 ? "s" : ""} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      if (days < 7) {
        return `${days} day${days !== 1 ? "s" : ""} ago`;
      } else {
        return date.toLocaleDateString([], {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    }
  };

  const handleSaveName = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      await onUpdateName(user.id, editingName.trim());
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating name:", error);
      setEditingName(user.custom_name || "");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingName(user.custom_name || "");
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditingName(user.custom_name || user.name || "");
    setIsEditing(true);
  };

  const handleCopyPhone = () => {
    if (user.phone_number) {
      navigator.clipboard.writeText(user.phone_number);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const initials = (getDisplayName() || user.phone_number || "W")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Doppelrand Double-Bezel Modal */}
      <div
        className="relative max-w-lg w-full rounded-3xl border border-stone-200/90 dark:border-stone-800/90 bg-white/95 dark:bg-[#131915]/95 backdrop-blur-xl p-2 sm:p-2.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-[calc(1.5rem-0.375rem)] bg-[#FAF8F5]/80 dark:bg-[#18201B]/90 border border-stone-200/70 dark:border-stone-800/70 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between bg-white/80 dark:bg-[#18201B]/80 backdrop-blur-md shrink-0">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2D583F] dark:text-[#8EAE95]">
                  Recipient Dossier
                </span>
              </div>
              <h2 className="text-lg font-semibold tracking-[-0.025em] text-stone-900 dark:text-stone-100">
                Contact <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">Details</span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800/60 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              title="Close (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Identity Showcase Card */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-[#131915]/90 p-6 flex flex-col items-center text-center shadow-2xs relative overflow-hidden">
              {/* Subtle ambient botanical glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24 bg-[#5F7C65]/10 rounded-full blur-2xl pointer-events-none" />

              <Avatar className="size-22 rounded-2xl ring-4 ring-[#5F7C65]/15 border border-[#5F7C65]/25 shadow-sm mb-4">
                <AvatarFallback className="rounded-2xl bg-[#5F7C65]/12 text-[#2D583F] dark:text-[#8EAE95] font-semibold text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Editable Name Bar */}
              <div className="w-full max-w-sm">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="Enter custom contact alias"
                      className="text-center font-medium border-stone-200 dark:border-stone-800 bg-white dark:bg-[#18201B] focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65] rounded-xl h-9 text-sm"
                      disabled={isUpdating}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveName}
                      disabled={isUpdating}
                      className="bg-[#5F7C65] hover:bg-[#526D57] text-white h-9 px-3 rounded-xl shadow-2xs shrink-0"
                    >
                      {isUpdating ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                      className="h-9 px-3 rounded-xl border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 group/name">
                    <h3 className="text-xl sm:text-2xl font-semibold tracking-[-0.03em] text-stone-900 dark:text-stone-100 truncate">
                      {getDisplayName()}
                    </h3>
                    <button
                      onClick={handleStartEdit}
                      className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      title="Edit custom name"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Status Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 mt-3 shadow-2xs">
                <span className="size-1.5 rounded-full bg-[#5F7C65] animate-pulse" />
                <span>{formatLastActive(user.last_active)}</span>
              </div>
            </div>

            {/* Bento Grid Metadata Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Phone Number */}
              <div className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-[#18201B]/90 p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Phone className="size-3 text-[#5F7C65]" /> Phone Number
                  </span>
                  <button
                    onClick={handleCopyPhone}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-500 hover:text-[#2D583F] dark:hover:text-[#8EAE95] transition-colors p-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800"
                    title="Copy phone number"
                  >
                    {copiedPhone ? (
                      <>
                        <CheckCheck className="size-3 text-[#5F7C65]" />
                        <span className="text-[#5F7C65]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div>
                  <p className="font-mono text-base font-semibold text-stone-900 dark:text-stone-100">
                    {user.phone_number}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                    WhatsApp E.164 Cloud API format
                  </p>
                </div>
              </div>

              {/* WhatsApp Profile Name */}
              <div className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-[#18201B]/90 p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <ShieldCheck className="size-3 text-[#5F7C65]" /> WhatsApp Identity
                  </span>
                </div>
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100 truncate">
                    {user.whatsapp_name || "Not publicly broadcast"}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                    Provided directly by recipient profile
                  </p>
                </div>
              </div>

              {/* Custom Alias */}
              <div className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-[#18201B]/90 p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <User className="size-3 text-[#5F7C65]" /> Internal Alias
                  </span>
                  {!isEditing && (
                    <button
                      onClick={handleStartEdit}
                      className="text-[10px] font-medium text-[#2D583F] dark:text-[#8EAE95] hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100 truncate">
                    {user.custom_name || "None set (using default)"}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                    Private to your workspace team
                  </p>
                </div>
              </div>

              {/* Last Observed Activity */}
              <div className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-[#18201B]/90 p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Clock className="size-3 text-[#5F7C65]" /> Last Observed
                  </span>
                </div>
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100">
                    {formatLastActive(user.last_active)}
                  </p>
                  <p className="font-mono text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                    {new Date(user.last_active).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 sm:p-5 border-t border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-[#18201B]/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            {onOpenTemplateSelector ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenTemplateSelector();
                }}
                className="rounded-xl border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs sm:text-sm font-medium gap-2"
              >
                <MessageSquare className="size-4 text-[#5F7C65]" />
                <span>Send Template</span>
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                <Sparkles className="size-3.5 text-[#5F7C65]" />
                <span>WaChat Verified Contact</span>
              </div>
            )}

            <Button
              onClick={onClose}
              className="bg-[#5F7C65] hover:bg-[#526D57] text-white rounded-xl px-6 py-2.5 font-medium shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2)] active:scale-[0.98] transition-all text-xs sm:text-sm"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserInfoDialog;