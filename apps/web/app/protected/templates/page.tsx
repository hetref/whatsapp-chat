"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from "@/components/ui/toast";
import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  Calendar,
  MessageSquare,
  Loader2,
  Image as ImageIcon,
  Video,
  FileText,
  Hash,
  X,
  Sparkles,
  Layers,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoIcon from "@/components/logo-icon";
import { cn } from "@/lib/utils";

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

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WhatsAppTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  // Fetch templates from API
  const fetchTemplates = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/templates", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Failed to fetch templates (${response.status})`);
      }

      if (data.success) {
        setTemplates(data.data || []);
        setFilteredTemplates(data.data || []);
      } else {
        throw new Error("Failed to fetch templates");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast(
        error instanceof Error ? error.message : "Failed to load WhatsApp templates",
        "error",
        5000
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Filter templates based on search and dropdown filters
  useEffect(() => {
    let filtered = templates;

    // Apply search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((template) => {
        const bodyText = template.formatted_components?.body?.text?.toLowerCase() || "";
        return (
          template.name.toLowerCase().includes(q) ||
          template.category.toLowerCase().includes(q) ||
          template.status.toLowerCase().includes(q) ||
          bodyText.includes(q)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((template) => template.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== "ALL") {
      filtered = filtered.filter((template) => template.category === categoryFilter);
    }

    setFilteredTemplates(filtered);
  }, [templates, searchTerm, statusFilter, categoryFilter]);

  const handleTemplateClick = (template: WhatsAppTemplate) => {
    router.push(`/protected/templates/${template.id}`);
  };

  const handleRefresh = () => {
    fetchTemplates(false);
    toast("Syncing templates with Meta WhatsApp Cloud API...", "info", 2500);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#2D583F]/10 text-[#2D583F] dark:bg-[#5F7C65]/20 dark:text-[#8EAE95] border border-[#2D583F]/20 font-mono shadow-2xs">
          <span className="size-1.5 rounded-full bg-[#2D583F] dark:bg-[#8EAE95]" />
          Approved
        </span>
      );
    }
    if (s === "PENDING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/20 font-mono shadow-2xs">
          <span className="size-1.5 rounded-full bg-amber-600 animate-pulse" />
          Pending
        </span>
      );
    }
    if (s === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 font-mono shadow-2xs">
          <span className="size-1.5 rounded-full bg-red-600" />
          Rejected
        </span>
      );
    }
    if (s === "PAUSED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20 font-mono shadow-2xs">
          <span className="size-1.5 rounded-full bg-orange-600" />
          Paused
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-stone-200/70 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border border-stone-300/60 font-mono shadow-2xs">
        {status}
      </span>
    );
  };

  const getPreviewText = (components: FormattedComponents) => {
    const bodyText = components.body?.text || "";
    const maxLength = 120;
    if (bodyText.length <= maxLength) return bodyText;
    return bodyText.substring(0, maxLength) + "...";
  };

  const getVariableCount = (template: WhatsAppTemplate): number => {
    let count = 0;
    template.components?.forEach((component) => {
      if (component.text) {
        const matches = component.text.match(/\{\{\d+\}\}/g);
        if (matches) count += matches.length;
      }
    });
    return count;
  };

  const getMediaHeaderInfo = (template: WhatsAppTemplate): { hasMedia: boolean; type?: string; icon?: React.ReactNode } => {
    const header = template.components?.find((c) => c.type === "HEADER");
    if (!header?.format) return { hasMedia: false };

    const format = header.format.toUpperCase();
    if (format === "IMAGE") {
      return { hasMedia: true, type: "Image", icon: <ImageIcon className="size-3.5" /> };
    }
    if (format === "VIDEO") {
      return { hasMedia: true, type: "Video", icon: <Video className="size-3.5" /> };
    }
    if (format === "DOCUMENT") {
      return { hasMedia: true, type: "Document", icon: <FileText className="size-3.5" /> };
    }

    return { hasMedia: false };
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FAF8F5]/50 dark:bg-[#0C0F0D] text-stone-900 dark:text-stone-100">
      <Toaster />

      {/* Main Full-Width Responsive Canvas */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-20">
        {/* ======================================================================= */}
        {/* HEADER SECTION - Editorial Botanical Typography & Action                */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-1">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 mb-2.5">
              <LogoIcon className="size-3.5 text-[#5F7C65]" />
              <span>WhatsApp Message Templates</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-100">
              Message{" "}
              <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">
                Templates
              </span>
            </h1>
            <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Create, sync, and inspect Meta-approved message templates for outbound broadcasts and interactive WhatsApp automations.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 sm:pt-1">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="h-9 sm:h-10 px-3.5 rounded-xl border border-stone-300/80 dark:border-stone-700/80 bg-white/80 dark:bg-stone-900/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium gap-2 shadow-2xs transition-all cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5 text-[#5F7C65]", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Sync with Meta"}</span>
            </Button>

            <Link href="/protected/templates/new">
              <Button className="h-9 sm:h-10 px-4 rounded-xl bg-[#2D583F] hover:bg-[#234531] text-white text-xs sm:text-sm font-medium shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.25),0_1px_3px_0_rgba(0,0,0,0.12)] border border-[#2D583F]/30 hover:shadow-md flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-all">
                <Plus className="size-4 text-emerald-100" />
                <span>Create Template</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* CONTROLS BAR: SEARCH, FILTERS & TEMPLATE COUNT COUNTER                   */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search templates by name, category, or body..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-9 h-10 text-xs rounded-xl border-stone-300/80 dark:border-stone-700/80 bg-white/90 dark:bg-stone-900/90 shadow-2xs focus-visible:ring-[#5F7C65] focus-visible:border-[#5F7C65] w-full text-stone-900 dark:text-stone-100 placeholder:text-stone-400 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & Stats */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Status Select */}
            <div className="relative min-w-[130px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none w-full h-10 pl-3 pr-8 rounded-xl border border-stone-300/80 dark:border-stone-700/80 bg-white/90 dark:bg-stone-900/90 text-xs font-medium text-stone-700 dark:text-stone-300 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#5F7C65]/30 focus:border-[#5F7C65] transition-all cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
                <option value="PAUSED">Paused</option>
                <option value="DISABLED">Disabled</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-stone-400 pointer-events-none" />
            </div>

            {/* Category Select */}
            <div className="relative min-w-[145px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none w-full h-10 pl-3 pr-8 rounded-xl border border-stone-300/80 dark:border-stone-700/80 bg-white/90 dark:bg-stone-900/90 text-xs font-medium text-stone-700 dark:text-stone-300 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#5F7C65]/30 focus:border-[#5F7C65] transition-all cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utility</option>
                <option value="AUTHENTICATION">Authentication</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-stone-400 pointer-events-none" />
            </div>

            {/* Total Templates Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/70 text-xs text-stone-500 shrink-0 shadow-2xs font-mono h-10">
              <Layers className="size-3.5 text-[#5F7C65]" />
              <span>{filteredTemplates.length} of {templates.length} templates</span>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* TEMPLATES GRID LISTING                                                  */}
        {/* ======================================================================= */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-1.5 shadow-2xs animate-pulse"
              >
                <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/60 dark:bg-stone-950/40 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-28 bg-stone-200 dark:bg-stone-800 rounded-md" />
                    <div className="h-5 w-16 bg-stone-200 dark:bg-stone-800 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-stone-200 dark:bg-stone-800 rounded" />
                    <div className="h-4 w-3/4 bg-stone-200 dark:bg-stone-800 rounded" />
                  </div>
                  <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
            <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 py-16 px-6 text-center">
              <div className="mx-auto size-14 rounded-2xl bg-[#5F7C65]/10 dark:bg-[#5F7C65]/20 border border-[#5F7C65]/25 flex items-center justify-center text-[#5F7C65] mb-3">
                <MessageSquare className="size-6 text-[#5F7C65]" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                {templates.length === 0 ? "No templates created yet" : "No matching message templates"}
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {templates.length === 0
                  ? "Build personalized WhatsApp message templates to send campaign notifications and transactional alerts to your customers."
                  : "Try clearing your search terms or changing status/category filters to find the templates you need."}
              </p>
              <div className="mt-5">
                {templates.length === 0 ? (
                  <Link href="/protected/templates/new">
                    <Button className="rounded-xl bg-[#2D583F] hover:bg-[#234531] text-white text-xs font-medium h-9 px-4 gap-2 shadow-xs cursor-pointer">
                      <Plus className="size-4" />
                      <span>Create Your First Template</span>
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("ALL");
                      setCategoryFilter("ALL");
                    }}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-stone-300 dark:border-stone-700 text-xs font-medium gap-2 cursor-pointer"
                  >
                    <X className="size-3.5 text-stone-500" />
                    <span>Reset All Filters</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((template) => {
              const variableCount = getVariableCount(template);
              const mediaInfo = getMediaHeaderInfo(template);

              return (
                <div
                  key={template.id}
                  className="group rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] hover:shadow-lg hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-200 flex flex-col cursor-pointer active:scale-[0.995]"
                  onClick={() => handleTemplateClick(template)}
                >
                  <div className="rounded-[calc(1rem-0.125rem)] overflow-hidden flex flex-col flex-1 bg-[#FAF8F5]/60 dark:bg-stone-950/40 p-4 sm:p-5 justify-between">
                    <div>
                      {/* Top Header Row: Category Badge + Status Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="size-9 rounded-xl bg-[#5F7C65]/10 dark:bg-[#5F7C65]/20 border border-[#5F7C65]/20 flex items-center justify-center text-sm font-semibold shrink-0">
                            {template.category_icon || "📝"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3
                              className="font-semibold text-sm sm:text-base text-stone-900 dark:text-stone-100 truncate group-hover:text-[#2D583F] dark:group-hover:text-[#8EAE95] transition-colors"
                              title={template.name}
                            >
                              {template.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                              <span className="uppercase">{template.category}</span>
                              <span>•</span>
                              <span className="uppercase">{template.language}</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 pt-0.5">
                          {getStatusBadge(template.status)}
                        </div>
                      </div>

                      {/* Optional Media Header Indicator */}
                      {mediaInfo.hasMedia && (
                        <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-700 dark:text-blue-300 text-[11px] font-medium font-mono">
                          {mediaInfo.icon}
                          <span>{mediaInfo.type} Header</span>
                        </div>
                      )}

                      {/* Content Preview */}
                      <p className="text-xs text-stone-700 dark:text-stone-300 line-clamp-3 leading-relaxed mb-4 bg-white/70 dark:bg-stone-900/60 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-800/60 font-sans">
                        {getPreviewText(template.formatted_components) || "No message body provided."}
                      </p>

                      {/* Feature Tags: Variables & Buttons */}
                      <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                        {variableCount > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-800 dark:text-purple-300 text-[11px] font-medium font-mono">
                            <Hash className="size-3 text-purple-600 dark:text-purple-400" />
                            <span>{variableCount} Variable{variableCount !== 1 ? "s" : ""}</span>
                          </div>
                        )}

                        {template.formatted_components?.buttons?.length > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-800 dark:text-amber-300 text-[11px] font-medium font-mono">
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            <span>
                              {template.formatted_components.buttons.length} Button{template.formatted_components.buttons.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Row: Timestamp + Eye Inspection Button */}
                    <div className="pt-3 border-t border-stone-200/70 dark:border-stone-800/70 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Calendar className="size-3 text-stone-400" />
                        <span>{formatDate(template.updated_at || template.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-medium text-stone-600 dark:text-stone-300 group-hover:text-[#2D583F] dark:group-hover:text-[#8EAE95] transition-colors">
                        <span>Inspect</span>
                        <Eye className="size-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}