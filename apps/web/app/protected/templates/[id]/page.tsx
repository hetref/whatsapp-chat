"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "@/components/ui/toast";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Loader2,
  RotateCw,
  Copy,
  FileText,
  Image as ImageIcon,
  Video,
  Hash,
  Zap,
  AlertTriangle,
  Check,
  Code,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Send,
  Calendar,
  Languages,
  FolderOpen,
  Sparkles,
} from "lucide-react";

interface ButtonComponent {
  type: string;
  text: string;
  url?: string;
  phone_number?: string;
}

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  example?: Record<string, unknown>;
  buttons?: ButtonComponent[];
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
  formatted_components?: FormattedComponents;
}

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params?.id as string;

  const [template, setTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(true);

  // Interactive sample values for variables in the preview
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({});

  // Helper to extract variables
  const extractVariables = useCallback((components: TemplateComponent[]): string[] => {
    const vars = new Set<string>();
    components.forEach((c) => {
      if (c.text) {
        const matches = c.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          matches.forEach((m) => vars.add(m));
        }
      }
    });
    return Array.from(vars).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      return numA - numB;
    });
  }, []);

  // Fetch template data
  const fetchTemplate = useCallback(async (isManualRefresh = false) => {
    if (!templateId) return;
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // 1. Try fetching specific template
      let fetchedTemplate: WhatsAppTemplate | null = null;
      try {
        const res = await fetch(`/api/templates/${templateId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            fetchedTemplate = json.data;
          }
        }
      } catch (err) {
        console.warn("Direct template fetch failed, trying list fallback:", err);
      }

      // 2. Fallback to templates list if direct endpoint 404 or fails
      if (!fetchedTemplate) {
        const listRes = await fetch("/api/templates", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (listRes.ok) {
          const listJson = await listRes.json();
          const list: WhatsAppTemplate[] = listJson.data || [];
          fetchedTemplate =
            list.find((t) => t.id === templateId || t.name === templateId) || null;
        }
      }

      if (!fetchedTemplate) {
        throw new Error("Template not found in your WhatsApp Business Account");
      }

      // Ensure formatted_components exists
      if (!fetchedTemplate.formatted_components) {
        const comps = fetchedTemplate.components || [];
        const header = comps.find((c) => c.type === "HEADER") || null;
        const body = comps.find((c) => c.type === "BODY") || null;
        const footer = comps.find((c) => c.type === "FOOTER") || null;
        const buttonsComp = comps.find((c) => c.type === "BUTTONS");
        fetchedTemplate.formatted_components = {
          header,
          body,
          footer,
          buttons: buttonsComp?.buttons || [],
        };
      }

      setTemplate(fetchedTemplate);

      // Initialize sample values for variables if not already initialized
      const vars = extractVariables(fetchedTemplate.components || []);
      setSampleValues((prev) => {
        const next = { ...prev };
        vars.forEach((v, idx) => {
          if (!next[v]) {
            next[v] = `[Sample ${idx + 1}]`;
          }
        });
        return next;
      });

      if (isManualRefresh) {
        toast("Meta WhatsApp Cloud API status synchronized", "success", 3000);
      }
    } catch (error) {
      console.error("Error loading template:", error);
      toast(
        error instanceof Error ? error.message : "Failed to load template details",
        "error",
        6000
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [templateId, extractVariables]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const copyToClipboard = (text: string, label = "Item") => {
    navigator.clipboard.writeText(text);
    toast(`${label} copied to clipboard`, "success", 2000);
  };

  const handleDelete = async () => {
    if (!template) return;
    setIsDeleting(true);

    try {
      const response = await fetch("/api/templates/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          templateName: template.name,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        let msg = "Failed to delete template";
        if (result.error && result.message) msg = `${result.error}: ${result.message}`;
        else if (result.message) msg = result.message;
        else if (result.error) msg = result.error;
        throw new Error(msg);
      }

      toast(`Template "${template.name}" deleted permanently`, "success", 4000);
      router.push("/protected/templates");
    } catch (err) {
      console.error("Delete failed:", err);
      toast(
        err instanceof Error ? err.message : "Failed to delete template",
        "error",
        6000
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Interpolate body text for preview
  const getRenderedBodyText = (rawText: string) => {
    let text = rawText;
    Object.entries(sampleValues).forEach(([placeholder, val]) => {
      if (val && val.trim()) {
        text = text.replaceAll(placeholder, val);
      }
    });
    return text;
  };

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    try {
      return new Date(dateStr).toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-[#5F7C65]" />
        <p className="text-xs text-stone-500 font-mono">Loading template details from Meta Cloud API...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="size-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600">
          <AlertCircle className="size-7" />
        </div>
        <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Template Not Found
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          The requested template ID &quot;{templateId}&quot; could not be retrieved from Meta WhatsApp Cloud API.
          It may have been deleted or the ID is invalid.
        </p>
        <div className="pt-2">
          <Link href="/protected/templates">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-xl text-xs border-stone-300 dark:border-stone-700 gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Templates</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const variables = extractVariables(template.components || []);
  const headerComp = template.components?.find((c) => c.type === "HEADER");
  const bodyComp = template.components?.find((c) => c.type === "BODY");
  const footerComp = template.components?.find((c) => c.type === "FOOTER");
  const buttonsComp = template.components?.find((c) => c.type === "BUTTONS");
  const buttonsList = buttonsComp?.buttons || template.formatted_components?.buttons || [];

  const isMediaHeader =
    headerComp?.format &&
    ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComp.format.toUpperCase());

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FAF8F5]/50 dark:bg-[#0C0F0D] text-stone-800 dark:text-stone-200 flex flex-col">
      <Toaster />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Identification */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/protected/templates">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 rounded-xl text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Templates</span>
            </Button>
          </Link>

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 font-mono truncate">
                {template.name}
              </span>

              {/* Status Badge */}
              {(() => {
                const s = template.status.toUpperCase();
                if (s === "APPROVED") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#2D583F] border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 font-mono">
                      <CheckCircle className="size-3 text-[#2D583F] dark:text-emerald-400" />
                      APPROVED
                    </span>
                  );
                }
                if (s === "PENDING") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 font-mono">
                      <Clock className="size-3 text-amber-600 dark:text-amber-400" />
                      PENDING
                    </span>
                  );
                }
                if (s === "REJECTED") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60 font-mono">
                      <AlertCircle className="size-3 text-red-600 dark:text-red-400" />
                      REJECTED
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700 font-mono">
                    <Clock className="size-3" />
                    {s}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Right: Studio Actions */}
        <div className="flex items-center gap-2">
          {/* Toggle Mobile Preview */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="hidden md:flex h-8 px-2.5 rounded-xl text-xs border-stone-300 dark:border-stone-700 gap-1.5 text-stone-600 dark:text-stone-400 cursor-pointer"
            title="Toggle Live WhatsApp Preview"
          >
            <Smartphone className="size-3.5 text-[#5F7C65]" />
            <span>{showMobilePreview ? "Hide Mockup" : "Show Mockup"}</span>
          </Button>

          {/* Refresh Meta Status */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTemplate(true)}
            disabled={isRefreshing}
            className="h-8 px-2.5 rounded-xl text-xs border-stone-300 dark:border-stone-700 gap-1.5 text-stone-700 dark:text-stone-300 cursor-pointer"
          >
            <RotateCw className={`size-3.5 text-stone-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync Meta</span>
          </Button>

          {/* Send Broadcast with this Template */}
          <Link href={`/protected/bulk-sender?template=${template.id}`}>
            <Button
              size="sm"
              className="h-8 px-3 rounded-xl text-xs bg-[#2D583F] hover:bg-[#244732] text-white font-medium gap-1.5 shadow-2xs cursor-pointer"
            >
              <Send className="size-3.5" />
              <span className="hidden sm:inline">Use in Broadcast</span>
            </Button>
          </Link>

          {/* Delete Action Trigger */}
          {!showDeleteConfirm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-8 px-2.5 rounded-xl text-xs border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5 cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Studio Body: Asymmetric 60/40 Split */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Column: Component Architecture & Metadata */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
          {/* Deletion Confirmation Notice */}
          {showDeleteConfirm && (
            <div className="rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-5 space-y-3 animate-in fade-in duration-200 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
                    Permanently delete &quot;{template.name}&quot; from WhatsApp Business Account?
                  </h3>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1 leading-relaxed">
                    This directly deletes the template from Meta WhatsApp Cloud API.
                    Active automations, scheduled bulk broadcasts, and webhook responses relying on template ID &quot;{template.id}&quot; will immediately cease working.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-red-200 dark:border-red-900/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="h-8 rounded-xl text-xs border-stone-300 dark:border-stone-700"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-8 rounded-xl text-xs bg-red-600 hover:bg-red-700 text-white font-medium gap-1.5 shadow-2xs cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Deleting from Meta...
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

          {/* Meta Rejection Notice only if template is truly REJECTED and reason is not NONE */}
          {template.status?.toUpperCase() === "REJECTED" &&
            template.rejected_reason &&
            template.rejected_reason.trim().toUpperCase() !== "NONE" && (
            <div className="rounded-2xl border border-red-200/90 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/25 p-4.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-300 text-xs font-semibold uppercase tracking-wider font-mono">
                <AlertCircle className="size-4 shrink-0 text-red-600" />
                <span>Meta Template Rejection Reason</span>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed pl-6">
                {template.rejected_reason}
              </p>
            </div>
          )}

          {/* Bento Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Template ID */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-3.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Template ID</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(template.id, "Template ID")}
                  className="size-5 p-0 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <Copy className="size-3" />
                </Button>
              </div>
              <p className="text-xs font-mono font-semibold text-stone-900 dark:text-stone-100 truncate">
                {template.id}
              </p>
            </div>

            {/* Category */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-3.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
              <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                <FolderOpen className="size-3" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Category</span>
              </div>
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 uppercase">
                {template.category}
              </p>
            </div>

            {/* Language */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-3.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
              <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                <Languages className="size-3" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Language</span>
              </div>
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                {template.language}
              </p>
            </div>

            {/* Last Updated */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-3.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
              <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                <Calendar className="size-3" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Updated</span>
              </div>
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                {formatDate(template.updated_at)}
              </p>
            </div>
          </div>

          {/* Key Feature Summary Pills */}
          {(isMediaHeader || variables.length > 0 || buttonsList.length > 0) && (
            <div className="flex flex-wrap gap-2.5">
              {isMediaHeader && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#5F7C65]/10 text-[#2D583F] dark:text-emerald-300 border border-[#5F7C65]/20 font-mono">
                  {headerComp?.format?.toUpperCase() === "IMAGE" && <ImageIcon className="size-3.5" />}
                  {headerComp?.format?.toUpperCase() === "VIDEO" && <Video className="size-3.5" />}
                  {headerComp?.format?.toUpperCase() === "DOCUMENT" && <FileText className="size-3.5" />}
                  <span>{headerComp?.format} Header Required</span>
                </div>
              )}

              {variables.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-mono">
                  <Hash className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    {variables.length} Dynamic Parameter{variables.length !== 1 ? "s" : ""}: {variables.join(", ")}
                  </span>
                </div>
              )}

              {buttonsList.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-stone-200/60 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300/60 dark:border-stone-700 font-mono">
                  <Zap className="size-3.5 text-stone-500" />
                  <span>
                    {buttonsList.length} Action Button{buttonsList.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Doppelrand Component Breakdown Section */}
          <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
            <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/60 dark:bg-stone-950/40 p-5 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 flex items-center justify-center text-[#5F7C65]">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                      Template Components Architecture
                    </h2>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Structure and payloads registered with Meta WhatsApp Cloud API.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  {template.components?.length || 0} active components
                </span>
              </div>

              {/* Component 1: Header */}
              {headerComp && (
                <div className="rounded-xl border border-stone-200/70 dark:border-stone-800/70 bg-white/70 dark:bg-stone-900/60 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-[#5F7C65]/10 text-[#5F7C65]">
                      HEADER
                    </span>
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      Format: {headerComp.format || "TEXT"}
                    </span>
                  </div>

                  {headerComp.format === "TEXT" && headerComp.text && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-mono bg-stone-50 dark:bg-stone-950/70 p-3 rounded-lg border border-stone-200/70 dark:border-stone-800/70 text-stone-800 dark:text-stone-200">
                        {headerComp.text}
                      </p>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(headerComp.text!, "Header text")}
                          className="h-6 text-[11px] text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 gap-1"
                        >
                          <Copy className="size-3" />
                          Copy Header
                        </Button>
                      </div>
                    </div>
                  )}

                  {isMediaHeader && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>
                        Sending messages with this template requires supplying a valid {headerComp.format?.toLowerCase()} URL or Media ID.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Component 2: Body */}
              {bodyComp && (
                <div className="rounded-xl border border-stone-200/70 dark:border-stone-800/70 bg-white/70 dark:bg-stone-900/60 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-[#5F7C65]/10 text-[#5F7C65]">
                      BODY
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">
                      {bodyComp.text?.length || 0} characters
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="text-xs font-mono bg-stone-50 dark:bg-stone-950/70 p-3.5 rounded-xl border border-stone-200/70 dark:border-stone-800/70 text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
                      {bodyComp.text}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {variables.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-stone-500 font-mono">Parameters:</span>
                          {variables.map((v) => (
                            <span
                              key={v}
                              className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-500/20"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-400 font-mono">No dynamic variables in body</span>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(bodyComp.text || "", "Body text")}
                        className="h-6 text-[11px] text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 gap-1"
                      >
                        <Copy className="size-3" />
                        Copy Body
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Component 3: Footer */}
              {footerComp && footerComp.text && (
                <div className="rounded-xl border border-stone-200/70 dark:border-stone-800/70 bg-white/70 dark:bg-stone-900/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-[#5F7C65]/10 text-[#5F7C65]">
                      FOOTER
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">
                      {footerComp.text.length} characters
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 italic bg-stone-50 dark:bg-stone-950/70 p-3 rounded-lg border border-stone-200/70 dark:border-stone-800/70">
                    {footerComp.text}
                  </p>
                </div>
              )}

              {/* Component 4: Action Buttons */}
              {buttonsList.length > 0 && (
                <div className="rounded-xl border border-stone-200/70 dark:border-stone-800/70 bg-white/70 dark:bg-stone-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-[#5F7C65]/10 text-[#5F7C65]">
                      BUTTONS
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">
                      {buttonsList.length} action button{buttonsList.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {buttonsList.map((btn, idx) => (
                      <div
                        key={idx}
                        className="bg-stone-50 dark:bg-stone-950/60 p-3 rounded-xl border border-stone-200/70 dark:border-stone-800/70 text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                            <span>
                              {btn.type === "URL" ? "🔗" : btn.type === "PHONE_NUMBER" ? "📞" : "↩️"}
                            </span>
                            <span>{btn.text}</span>
                          </p>
                          {btn.url && (
                            <p className="text-[11px] font-mono text-stone-500 mt-1 break-all">
                              URL: {btn.url}
                            </p>
                          )}
                          {btn.phone_number && (
                            <p className="text-[11px] font-mono text-stone-500 mt-1">
                              Phone: {btn.phone_number}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300 uppercase">
                          {btn.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Variable Sample Values Tester */}
          {variables.length > 0 && (
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
              <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/60 dark:bg-stone-950/40 p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 dark:border-stone-800/60">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                        Interactive Parameter Preview
                      </h3>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        Type sample inputs below to simulate how the message renders for recipients.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {variables.map((v) => (
                    <div key={v} className="space-y-1">
                      <Label className="text-[11px] font-mono text-stone-600 dark:text-stone-400">
                        Parameter {v}
                      </Label>
                      <Input
                        value={sampleValues[v] || ""}
                        onChange={(e) =>
                          setSampleValues({ ...sampleValues, [v]: e.target.value })
                        }
                        placeholder={`e.g. John Doe`}
                        className="h-8 text-xs font-mono rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Developer Quick Reference: Collapsible Raw JSON */}
          <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-4 shadow-2xs">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="w-full flex items-center justify-between text-xs font-mono font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Code className="size-3.5 text-[#5F7C65]" />
                <span>Developer Payload Specification (Meta JSON)</span>
              </div>
              {showRawJson ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {showRawJson && (
              <div className="mt-3 pt-3 border-t border-stone-200/60 dark:border-stone-800/60 space-y-2">
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(JSON.stringify(template, null, 2), "Template JSON")
                    }
                    className="h-6 text-[11px] text-stone-500 gap-1"
                  >
                    <Copy className="size-3" />
                    Copy Payload
                  </Button>
                </div>
                <pre className="text-[11px] font-mono bg-stone-950 text-stone-200 p-4 rounded-xl overflow-x-auto max-h-72 leading-relaxed">
                  {JSON.stringify(template, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Authentic WhatsApp Smartphone Preview */}
        {showMobilePreview && (
          <div className="w-full lg:w-[380px] xl:w-[420px] bg-stone-100/70 dark:bg-stone-950/60 border-t lg:border-t-0 lg:border-l border-stone-200/80 dark:border-stone-800/80 p-6 flex flex-col items-center justify-start">
            <div className="w-full max-w-sm sticky top-20 space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider font-mono">
                  Live Handset Preview
                </span>
                <span className="text-[10px] text-stone-400 font-mono">WhatsApp Protocol</span>
              </div>

              {/* Smartphone Frame Shell */}
              <div className="rounded-[2.4rem] p-3.5 bg-stone-900 shadow-2xl border-4 border-stone-800 text-stone-100 relative overflow-hidden">
                {/* Speaker Notch */}
                <div className="w-20 h-3.5 bg-stone-800 rounded-full mx-auto mb-3.5" />

                {/* WhatsApp Chat Header */}
                <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-stone-800/80 px-1">
                  <div className="size-8 rounded-full bg-[#2D583F] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                    W
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-100 truncate">Your Business Name</p>
                    <p className="text-[9px] text-emerald-400 font-mono">Official WhatsApp Account</p>
                  </div>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="rounded-2xl rounded-tl-sm bg-[#005C4B] text-white p-3.5 space-y-2.5 shadow-md">
                  {/* Media Header Preview */}
                  {isMediaHeader && (
                    <div className="h-32 rounded-xl bg-black/25 flex flex-col items-center justify-center text-xs text-emerald-200/90 border border-white/10 p-2 text-center">
                      <span className="text-2xl mb-1">
                        {headerComp?.format?.toUpperCase() === "IMAGE"
                          ? "🖼️"
                          : headerComp?.format?.toUpperCase() === "VIDEO"
                          ? "🎥"
                          : "📄"}
                      </span>
                      <span className="font-semibold text-[11px]">{headerComp?.format} Attachment</span>
                      <span className="text-[9px] opacity-75 font-mono">Configured per broadcast</span>
                    </div>
                  )}

                  {/* Text Header Preview */}
                  {!isMediaHeader && headerComp?.text && (
                    <div className="font-bold text-xs pb-1 border-b border-white/10">
                      {headerComp.text}
                    </div>
                  )}

                  {/* Body Text with dynamic variable substitution */}
                  {bodyComp?.text && (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">
                      {getRenderedBodyText(bodyComp.text)}
                    </p>
                  )}

                  {/* Footer Text Preview */}
                  {footerComp?.text && (
                    <p className="text-[10px] text-white/60 pt-1 border-t border-white/10">
                      {footerComp.text}
                    </p>
                  )}

                  {/* Message Timestamp */}
                  <div className="flex justify-end items-center gap-1 text-[9px] text-white/50 font-mono">
                    <span>12:30 PM</span>
                    <Check className="size-3 text-emerald-300" />
                  </div>
                </div>

                {/* Action Buttons Mockup */}
                {buttonsList.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {buttonsList.map((b, idx) => (
                      <div
                        key={idx}
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

              {/* Quick Template Specs */}
              <div className="p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 text-xs text-stone-600 dark:text-stone-400 space-y-1.5 font-mono shadow-2xs">
                <div className="flex justify-between">
                  <span>Category:</span>
                  <strong className="text-stone-800 dark:text-stone-200 uppercase">{template.category}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Language:</span>
                  <strong className="text-stone-800 dark:text-stone-200">{template.language}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Variables:</span>
                  <strong className="text-stone-800 dark:text-stone-200">{variables.length}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
