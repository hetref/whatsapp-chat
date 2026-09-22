"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  X,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Trash2,
  Loader2,
  Hash,
  Image,
  Video,
  FileText,
  AlertTriangle,
  RotateCw,
  Check,
  Calendar,
  Languages,
  FolderOpen,
} from "lucide-react";
import { useState } from "react";

// Type definitions
interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  example?: Record<string, unknown>;
  buttons?: ButtonComponent[];
}

interface ButtonComponent {
  type: string;
  text: string;
  url?: string;
  phone_number?: string;
}

interface FormattedComponents {
  header: TemplateComponent | null;
  body: TemplateComponent | null;
  footer: TemplateComponent | null;
  buttons: ButtonComponent[];
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: TemplateComponent[];
  previous_category?: string;
  rejected_reason?: string;
  quality_score?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  status_color: string;
  category_icon: string;
  formatted_components: FormattedComponents;
}

interface TemplateDetailsDialogProps {
  template: WhatsAppTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function TemplateDetailsDialog({
  template,
  isOpen,
  onClose,
  onRefresh,
}: TemplateDetailsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen || !template) return null;

  const copyToClipboard = (text: string, label = "Text") => {
    navigator.clipboard.writeText(text);
    toast(`${label} copied to clipboard`, "success", 2000);
  };

  const extractVariables = (tmpl: WhatsAppTemplate): string[] => {
    const variables = new Set<string>();
    tmpl.components.forEach((component) => {
      if (component.text) {
        const matches = component.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          matches.forEach((match) => variables.add(match));
        }
      }
    });
    return Array.from(variables).sort();
  };

  const getMediaHeaderInfo = (
    tmpl: WhatsAppTemplate
  ): { hasMedia: boolean; type?: string; format?: string } => {
    const header = tmpl.components.find((c) => c.type === "HEADER");
    if (!header?.format) return { hasMedia: false };

    const format = header.format.toUpperCase();
    if (["IMAGE", "VIDEO", "DOCUMENT"].includes(format)) {
      return { hasMedia: true, type: format, format: header.format };
    }

    return { hasMedia: false };
  };

  const variables = extractVariables(template);
  const mediaInfo = getMediaHeaderInfo(template);

  const handleDeleteTemplate = async () => {
    if (!template) return;

    setIsDeleting(true);

    try {
      const response = await fetch("/api/templates/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: template.id,
          templateName: template.name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        let errorMessage = "Failed to delete template";
        if (result.error && result.message) {
          errorMessage = `${result.error}: ${result.message}`;
        } else if (result.message) {
          errorMessage = result.message;
        } else if (result.error) {
          errorMessage = result.error;
        }
        if (result.details?.code && result.details?.subcode) {
          errorMessage += ` (Code: ${result.details.code}.${result.details.subcode})`;
        }
        throw new Error(errorMessage);
      }

      toast(`Template "${template.name}" deleted permanently`, "success", 4000);
      setConfirmDelete(false);
      onClose();
      onRefresh();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast(
        `Failed to delete template: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
        6000
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#2D583F] border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 font-mono">
          <CheckCircle className="size-3.5 text-[#2D583F] dark:text-emerald-400" />
          APPROVED
        </span>
      );
    }
    if (s === "PENDING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 font-mono">
          <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
          PENDING APPROVAL
        </span>
      );
    }
    if (s === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60 font-mono">
          <AlertCircle className="size-3.5 text-red-600 dark:text-red-400" />
          REJECTED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700 font-mono">
        <Clock className="size-3.5" />
        {s}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString([], {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown";
    }
  };

  const renderComponent = (component: TemplateComponent, index: number) => {
    const isMediaHeader =
      component.type === "HEADER" &&
      component.format &&
      ["IMAGE", "VIDEO", "DOCUMENT"].includes(component.format.toUpperCase());

    return (
      <div
        key={index}
        className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-4 shadow-2xs"
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-[#5F7C65]/10 text-[#5F7C65] dark:text-[#7A9880]">
              {component.type}
            </span>
          </div>

          {component.format && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-mono">
              {isMediaHeader && (
                <>
                  {component.format.toUpperCase() === "IMAGE" && <Image className="size-3" />}
                  {component.format.toUpperCase() === "VIDEO" && <Video className="size-3" />}
                  {component.format.toUpperCase() === "DOCUMENT" && <FileText className="size-3" />}
                </>
              )}
              {component.format}
            </span>
          )}
        </div>

        {isMediaHeader && (
          <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              Requires a {component.format?.toLowerCase()} URL or Media ID attachment when dispatching
              messages.
            </p>
          </div>
        )}

        {component.text && (
          <div className="space-y-2 mt-2">
            <div className="text-xs font-mono bg-stone-50 dark:bg-stone-950/70 p-3 rounded-xl border border-stone-200/80 dark:border-stone-800/80 text-stone-800 dark:text-stone-200 break-words whitespace-pre-wrap leading-relaxed">
              {component.text}
            </div>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(component.text!, `${component.type} text`)}
                className="h-7 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 gap-1 rounded-lg"
              >
                <Copy className="size-3" />
                Copy Text
              </Button>
            </div>
          </div>
        )}

        {component.buttons && component.buttons.length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-200/60 dark:border-stone-800/60">
            <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider font-mono mb-2">
              Action Buttons ({component.buttons.length})
            </p>
            <div className="space-y-2">
              {component.buttons.map((button, buttonIndex) => (
                <div
                  key={buttonIndex}
                  className="bg-stone-50 dark:bg-stone-950/60 p-3 rounded-xl border border-stone-200/70 dark:border-stone-800/70 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-800 dark:text-stone-200">{button.text}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      {button.type}
                    </span>
                  </div>
                  {button.url && (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 font-mono break-all">
                      URL: {button.url}
                    </p>
                  )}
                  {button.phone_number && (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 font-mono">
                      Phone: {button.phone_number}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-stone-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-stone-50 dark:bg-[#121714] border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60">
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-2xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 flex items-center justify-center text-xl shrink-0">
              {template.category_icon || "💬"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 font-mono">
                  {template.name}
                </h2>
                {getStatusBadge(template.status)}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Category: <span className="font-medium text-stone-700 dark:text-stone-300">{template.category}</span> • Language: <span className="font-medium text-stone-700 dark:text-stone-300">{template.language}</span>
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="size-8 p-0 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Delete Confirmation Alert Banner */}
          {confirmDelete && (
            <div className="rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">
                    Permanently delete template &quot;{template.name}&quot;?
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1 leading-relaxed">
                    This action deletes the template from your Meta WhatsApp Cloud API account immediately.
                    Any scheduled campaigns, bulk broadcasts, or automations actively using this template will fail.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-red-200 dark:border-red-900/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="h-8 rounded-xl text-xs border-stone-300 dark:border-stone-700"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDeleteTemplate}
                  disabled={isDeleting}
                  className="h-8 rounded-xl text-xs bg-red-600 hover:bg-red-700 text-white font-medium gap-1.5 shadow-2xs"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-3.5" />
                      Confirm Permanent Deletion
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 shadow-2xs">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider">Template ID</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(template.id, "Template ID")}
                  className="size-5 p-0 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <Copy className="size-3" />
                </Button>
              </div>
              <p className="text-xs font-mono font-semibold text-stone-800 dark:text-stone-200 truncate">
                {template.id}
              </p>
            </div>

            <div className="p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 shadow-2xs">
              <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                <FolderOpen className="size-3" />
                <span className="text-[11px] font-mono uppercase tracking-wider">Category</span>
              </div>
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 uppercase">
                {template.category}
              </p>
            </div>

            <div className="p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 shadow-2xs">
              <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                <Languages className="size-3" />
                <span className="text-[11px] font-mono uppercase tracking-wider">Language</span>
              </div>
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                {template.language}
              </p>
            </div>

            <div className="p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 shadow-2xs">
              <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                <Calendar className="size-3" />
                <span className="text-[11px] font-mono uppercase tracking-wider">Updated</span>
              </div>
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                {formatDate(template.updated_at)}
              </p>
            </div>
          </div>

          {/* Rejection Alert if Rejected */}
          {template.rejected_reason && (
            <div className="rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 p-4">
              <div className="flex items-center gap-2 mb-1 text-red-800 dark:text-red-300 font-semibold text-xs uppercase tracking-wider font-mono">
                <AlertCircle className="size-4 shrink-0 text-red-600" />
                <span>Meta Rejection Notice</span>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                {template.rejected_reason}
              </p>
            </div>
          )}

          {/* Key Feature Badges */}
          {(mediaInfo.hasMedia || variables.length > 0 || template.formatted_components.buttons.length > 0) && (
            <div className="flex flex-wrap gap-2.5">
              {mediaInfo.hasMedia && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#5F7C65]/10 text-[#2D583F] dark:text-emerald-300 border border-[#5F7C65]/20 font-mono">
                  {mediaInfo.type === "IMAGE" && <Image className="size-3.5" />}
                  {mediaInfo.type === "VIDEO" && <Video className="size-3.5" />}
                  {mediaInfo.type === "DOCUMENT" && <FileText className="size-3.5" />}
                  <span>{mediaInfo.type} Media Required</span>
                </div>
              )}

              {variables.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-mono">
                  <Hash className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    {variables.length} Dynamic Variable{variables.length !== 1 ? "s" : ""}: {variables.join(", ")}
                  </span>
                </div>
              )}

              {template.formatted_components.buttons.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-stone-200/60 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300/60 dark:border-stone-700 font-mono">
                  <Zap className="size-3.5 text-stone-500" />
                  <span>
                    {template.formatted_components.buttons.length} Interactive Button
                    {template.formatted_components.buttons.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Grid Layout: Components Breakdown + Realistic Mockup Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Components Breakdown */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-stone-200/60 dark:border-stone-800/60">
                <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider font-mono">
                  Component Definitions ({template.components.length})
                </h3>
              </div>

              <div className="space-y-3">
                {template.components.map((component, index) => renderComponent(component, index))}
              </div>
            </div>

            {/* Right: Authentic WhatsApp Mockup */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="pb-1 border-b border-stone-200/60 dark:border-stone-800/60 mb-4">
                <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider font-mono">
                  WhatsApp Preview
                </h3>
              </div>

              {/* Phone Mockup Frame */}
              <div className="rounded-[2.2rem] p-3.5 bg-stone-900 shadow-xl border-4 border-stone-800 text-stone-100 flex-1 flex flex-col justify-start">
                {/* Phone Speaker Notch */}
                <div className="w-20 h-3.5 bg-stone-800 rounded-full mx-auto mb-3" />

                {/* WhatsApp Chat Header */}
                <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-stone-800/80 px-1">
                  <div className="size-7 rounded-full bg-[#2D583F] flex items-center justify-center text-white font-bold text-xs shrink-0">
                    W
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-100 truncate">Your Business</p>
                    <p className="text-[9px] text-emerald-400 font-mono">Verified Business</p>
                  </div>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="rounded-2xl rounded-tl-sm bg-[#005C4B] text-white p-3 space-y-2 shadow-md">
                  {/* Media Header */}
                  {mediaInfo.hasMedia && (
                    <div className="h-28 rounded-xl bg-black/25 flex flex-col items-center justify-center text-xs text-emerald-200/80 border border-white/10 p-2 text-center">
                      <span className="text-xl mb-1">
                        {mediaInfo.type === "IMAGE" ? "🖼️" : mediaInfo.type === "VIDEO" ? "🎥" : "📄"}
                      </span>
                      <span className="font-semibold">{mediaInfo.type} Header Attachment</span>
                    </div>
                  )}

                  {/* Text Header */}
                  {!mediaInfo.hasMedia && template.formatted_components.header?.text && (
                    <div className="font-bold text-xs pb-1 border-b border-white/10">
                      {template.formatted_components.header.text}
                    </div>
                  )}

                  {/* Body Text */}
                  {template.formatted_components.body?.text && (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">
                      {template.formatted_components.body.text}
                    </p>
                  )}

                  {/* Footer Text */}
                  {template.formatted_components.footer?.text && (
                    <p className="text-[10px] text-white/60 pt-1 border-t border-white/10">
                      {template.formatted_components.footer.text}
                    </p>
                  )}

                  {/* Bubble Timestamp */}
                  <div className="flex justify-end items-center gap-1 text-[9px] text-white/50 font-mono">
                    <span>12:30 PM</span>
                    <Check className="size-3 text-emerald-300" />
                  </div>
                </div>

                {/* Action Buttons */}
                {template.formatted_components.buttons.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {template.formatted_components.buttons.map((b, i) => (
                      <div
                        key={i}
                        className="w-full py-2 px-3 rounded-xl bg-stone-800/90 text-center text-xs font-medium text-emerald-300 border border-stone-700/60 shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <span>
                          {b.type === "URL" ? "🔗" : b.type === "PHONE_NUMBER" ? "📞" : "↩️"}
                        </span>
                        <span className="truncate">{b.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-9 px-3 rounded-xl text-xs border-stone-300 dark:border-stone-700 gap-1.5 font-medium cursor-pointer"
          >
            <RotateCw className="size-3.5 text-stone-500" />
            <span>Refresh Meta Status</span>
          </Button>

          <div className="flex items-center gap-2">
            {!confirmDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={isDeleting}
                className="h-9 px-3 rounded-xl text-xs bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/60 gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="size-3.5 text-red-600 dark:text-red-400" />
                <span>Delete Template</span>
              </Button>
            )}

            <Button
              onClick={onClose}
              size="sm"
              className="h-9 px-4 rounded-xl text-xs bg-[#2D583F] hover:bg-[#244732] text-white font-medium transition-colors shadow-2xs cursor-pointer"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}