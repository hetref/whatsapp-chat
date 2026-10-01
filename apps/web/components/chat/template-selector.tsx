"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  X,
  Search,
  Send,
  Loader2,
  AlertCircle,
  FileText,
  Eye,
  EyeOff,
  ImageIcon,
  Check,
  ArrowLeft,
  Sparkles,
  Smartphone,
  ExternalLink,
  Phone,
  Link as LinkIcon,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { MediaPickerDialog } from "@/components/media-picker-dialog";

// Template types
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

interface ChatUser {
  id: string;
  phone_number?: string;
  phoneNumber?: string;
  name: string;
  custom_name?: string;
  whatsapp_name?: string;
  last_active: string;
}

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSendTemplate: (
    templateName: string,
    templateData: WhatsAppTemplate,
    variables: {
      header: Record<string, string>;
      body: Record<string, string>;
      footer: Record<string, string>;
    },
    mediaUrl?: string
  ) => Promise<void>;
  selectedUser: ChatUser;
  whatsappAccessToken?: string | null;
}

export function TemplateSelector({
  isOpen,
  onClose,
  onSendTemplate,
  selectedUser,
  whatsappAccessToken,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [variables, setVariables] = useState<{
    header: Record<string, string>;
    body: Record<string, string>;
    footer: Record<string, string>;
  }>({
    header: {},
    body: {},
    footer: {},
  });
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [quickRegisterPin, setQuickRegisterPin] = useState("123456");
  const [isQuickRegistering, setIsQuickRegistering] = useState(false);
  const [quickRegisterSuccess, setQuickRegisterSuccess] = useState<string | null>(null);

  const handleQuickRegister = async () => {
    setIsQuickRegistering(true);
    setQuickRegisterSuccess(null);
    try {
      const res = await fetch("/api/settings/register-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: quickRegisterPin }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed");
      }
      setQuickRegisterSuccess("Phone number registered successfully! You can now click 'Send Template'.");
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register phone number");
    } finally {
      setIsQuickRegistering(false);
    }
  };

  // Fetch templates when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  // Filter templates based on search
  useEffect(() => {
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      const filtered = templates.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.category.toLowerCase().includes(query) ||
          (template.formatted_components.body?.text &&
            template.formatted_components.body.text.toLowerCase().includes(query))
      );
      setFilteredTemplates(filtered);
    } else {
      setFilteredTemplates(templates);
    }
  }, [templates, searchTerm]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/templates", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "Failed to fetch templates");
      }

      // Backend returns { success: true, data: [...] }
      const rawList: WhatsAppTemplate[] =
        result?.data && Array.isArray(result.data)
          ? result.data
          : result?.templates && Array.isArray(result.templates)
            ? result.templates
            : Array.isArray(result)
              ? result
              : [];

      // Filter for approved templates (or those with empty status if not set)
      const approvedOnly = rawList.filter((template) => {
        const s = String(template.status || "").trim().toUpperCase();
        return s === "APPROVED" || s === "";
      });

      const finalList = approvedOnly.length > 0 ? approvedOnly : rawList;

      setTemplates(finalList);
      setFilteredTemplates(finalList);
    } catch (err) {
      console.error("Error fetching templates:", err);
      setError(err instanceof Error ? err.message : "Failed to load templates");
      setTemplates([]);
      setFilteredTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const extractVariables = (template: WhatsAppTemplate) => {
    const headerVariables: string[] = [];
    const bodyVariables: string[] = [];
    const footerVariables: string[] = [];

    const variableRegex = /\{\{(\d+)\}\}/g;

    // Header variables
    if (
      template.formatted_components.header &&
      template.formatted_components.header.text &&
      template.formatted_components.header.format?.toUpperCase() === "TEXT"
    ) {
      let match;
      while ((match = variableRegex.exec(template.formatted_components.header.text)) !== null) {
        if (!headerVariables.includes(match[1])) {
          headerVariables.push(match[1]);
        }
      }
    }

    // Body variables
    if (template.formatted_components.body && template.formatted_components.body.text) {
      let match;
      while ((match = variableRegex.exec(template.formatted_components.body.text)) !== null) {
        if (!bodyVariables.includes(match[1])) {
          bodyVariables.push(match[1]);
        }
      }
    }

    // Footer variables
    if (template.formatted_components.footer && template.formatted_components.footer.text) {
      let match;
      while ((match = variableRegex.exec(template.formatted_components.footer.text)) !== null) {
        if (!footerVariables.includes(match[1])) {
          footerVariables.push(match[1]);
        }
      }
    }

    const allVariables = [...new Set([...headerVariables, ...bodyVariables, ...footerVariables])].sort(
      (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10)
    );

    return {
      header: headerVariables,
      body: bodyVariables,
      footer: footerVariables,
      all: allVariables,
    };
  };

  const renderTemplatePreview = (
    template: WhatsAppTemplate,
    vars: {
      header: Record<string, string>;
      body: Record<string, string>;
      footer: Record<string, string>;
    },
    previewMediaUrl?: string
  ) => {
    const replaceVariables = (text: string, componentVars: Record<string, string>) => {
      let result = text;
      Object.entries(componentVars).forEach(([key, value]) => {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || `{{${key}}}`);
      });
      return result;
    };

    return (
      <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-[#131915]/95 p-4 shadow-sm">
        {/* Mock Phone Frame Header */}
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-stone-200/80 dark:border-stone-800/80 text-xs">
          <Smartphone className="size-4 text-[#5F7C65]" />
          <span className="font-semibold text-stone-900 dark:text-stone-100">WhatsApp Preview</span>
          <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] font-medium">
            Verified Business
          </span>
        </div>

        {/* Chat Bubble in Botanical Evergreen */}
        <div className="bg-[#2D583F] dark:bg-[#1E3E2B] text-white p-4 rounded-2xl rounded-tr-xs shadow-md border border-[#2D583F]/30 max-w-sm ml-auto">
          {/* Header */}
          {template.formatted_components.header && (
            <div className="mb-2.5">
              {template.formatted_components.header.format === "IMAGE" ? (
                previewMediaUrl ? (
                  <div className="rounded-xl overflow-hidden mb-2 border border-white/15">
                    <img
                      src={previewMediaUrl}
                      alt="Header preview"
                      className="w-full h-auto max-h-48 object-cover rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).parentElement!.innerHTML =
                          '<div class="p-3 text-center bg-black/20 rounded-xl text-xs">📷 Media preview unavailable</div>';
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-black/20 rounded-xl p-3.5 text-center mb-2 border border-white/10 text-xs text-white/80">
                    📷 Header Image (Select from library)
                  </div>
                )
              ) : template.formatted_components.header.format === "VIDEO" ? (
                previewMediaUrl ? (
                  <div className="rounded-xl overflow-hidden mb-2 border border-white/15">
                    <video src={previewMediaUrl} className="w-full h-auto max-h-48 rounded-xl" controls />
                  </div>
                ) : (
                  <div className="bg-black/20 rounded-xl p-3.5 text-center mb-2 border border-white/10 text-xs text-white/80">
                    🎥 Header Video (Select from library)
                  </div>
                )
              ) : template.formatted_components.header.format === "DOCUMENT" ? (
                <div className="bg-black/20 rounded-xl p-3 text-center mb-2 border border-white/10 text-xs text-white/80">
                  📄 Header Document {previewMediaUrl ? "(Document Attached)" : "(Select from library)"}
                </div>
              ) : template.formatted_components.header.text ? (
                <p className="font-bold text-sm leading-snug">
                  {replaceVariables(template.formatted_components.header.text, vars.header)}
                </p>
              ) : null}
            </div>
          )}

          {/* Body */}
          {template.formatted_components.body && (
            <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-normal">
              {replaceVariables(template.formatted_components.body.text || "", vars.body)}
            </div>
          )}

          {/* Footer */}
          {template.formatted_components.footer?.text && (
            <div className="mt-2 pt-1 border-t border-white/10">
              <p className="text-[11px] text-white/70 leading-tight">
                {replaceVariables(template.formatted_components.footer.text || "", vars.footer)}
              </p>
            </div>
          )}

          {/* Buttons */}
          {template.formatted_components.buttons && template.formatted_components.buttons.length > 0 && (
            <div className="mt-3 pt-2 border-t border-white/15 space-y-1.5">
              {template.formatted_components.buttons.map((button, index) => (
                <div
                  key={index}
                  className="bg-black/20 hover:bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-center text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  {button.type === "URL" && <LinkIcon className="size-3" />}
                  {button.type === "PHONE_NUMBER" && <Phone className="size-3" />}
                  {button.type === "QUICK_REPLY" && <MessageSquare className="size-3" />}
                  <span>{button.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mock timestamp */}
          <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-white/70 select-none">
            <span>Just now</span>
            <Check className="size-3 text-white/70" />
          </div>
        </div>
      </div>
    );
  };

  const handleTemplateSelect = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(false);
    setMediaUrl("");
    setQuickRegisterSuccess(null);
    setError(null);

    // Initialize variables
    const templateVars = extractVariables(template);
    const initialHeader: Record<string, string> = {};
    const initialBody: Record<string, string> = {};
    const initialFooter: Record<string, string> = {};

    templateVars.header.forEach((v) => {
      initialHeader[v] = "";
    });
    templateVars.body.forEach((v) => {
      initialBody[v] = "";
    });
    templateVars.footer.forEach((v) => {
      initialFooter[v] = "";
    });

    setVariables({
      header: initialHeader,
      body: initialBody,
      footer: initialFooter,
    });
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate) return;

    // Check if template has media header
    const headerComponent = selectedTemplate.components.find((c) => c.type === "HEADER");
    const hasMediaHeader =
      headerComponent &&
      ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format?.toUpperCase() || "");

    // Validate media URL if header is media type
    if (hasMediaHeader && !mediaUrl.trim()) {
      setError(`Please select a ${headerComponent?.format?.toLowerCase()} file for the header.`);
      return;
    }

    // Validate required variables per component
    const templateVars = extractVariables(selectedTemplate);
    const missingVars: string[] = [];

    // Check header variables if text
    if (headerComponent?.format?.toUpperCase() === "TEXT") {
      templateVars.header.forEach((variable) => {
        if (!variables.header[variable]?.trim()) {
          missingVars.push(`Header {{${variable}}}`);
        }
      });
    }

    // Check body variables
    templateVars.body.forEach((variable) => {
      if (!variables.body[variable]?.trim()) {
        missingVars.push(`Body {{${variable}}}`);
      }
    });

    // Check footer variables
    templateVars.footer.forEach((variable) => {
      if (!variables.footer[variable]?.trim()) {
        missingVars.push(`Footer {{${variable}}}`);
      }
    });

    if (missingVars.length > 0) {
      setError(`Please complete all required variables: ${missingVars.join(", ")}`);
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await onSendTemplate(selectedTemplate.name, selectedTemplate, variables, mediaUrl || undefined);

      // Reset state and close
      setSelectedTemplate(null);
      setVariables({
        header: {},
        body: {},
        footer: {},
      });
      setMediaUrl("");
      setShowPreview(false);
      onClose();
    } catch (err) {
      console.error("Error sending template:", err);
      setError(err instanceof Error ? err.message : "Failed to send template");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setVariables({
      header: {},
      body: {},
      footer: {},
    });
    setMediaUrl("");
    setShowPreview(false);
    setSearchTerm("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const recipientName =
    selectedUser.custom_name ||
    selectedUser.whatsapp_name ||
    selectedUser.name ||
    selectedUser.phone_number ||
    "Recipient";

  const totalVarsCount = selectedTemplate ? extractVariables(selectedTemplate).all.length : 0;

  return (
    <div
      className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 select-none"
      onClick={handleClose}
    >
      {/* Doppelrand Double-Bezel Modal */}
      <div
        className="relative max-w-4xl w-full rounded-3xl border border-stone-200/90 dark:border-stone-800/90 bg-white/95 dark:bg-[#131915]/95 backdrop-blur-xl p-2 sm:p-2.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-[calc(1.5rem-0.375rem)] bg-[#FAF8F5]/80 dark:bg-[#18201B]/90 border border-stone-200/70 dark:border-stone-800/70 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between bg-white/80 dark:bg-[#18201B]/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 flex items-center justify-center shadow-2xs shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold tracking-[-0.025em] text-stone-900 dark:text-stone-100">
                  Send <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">Template Message</span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Recipient: <span className="font-medium text-stone-700 dark:text-stone-300">{recipientName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800/60 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              title="Close (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main Content Area - ZERO unwanted outer scrollbars */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {!selectedTemplate ? (
              /* Template Selection State */
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Search & Refresh Bar */}
                <div className="p-4 sm:p-5 border-b border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-[#18201B]/60 shrink-0 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4" />
                    <Input
                      placeholder="Search templates by name, category, or message text..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-stone-200 dark:border-stone-800 bg-white dark:bg-[#131915] focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65] rounded-xl text-xs sm:text-sm h-10 shadow-2xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fetchTemplates()}
                    disabled={isLoading}
                    className="h-10 px-3 rounded-xl border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 shrink-0 text-stone-600 dark:text-stone-300"
                    title="Refresh templates"
                  >
                    <RefreshCw className={`size-4 ${isLoading ? "animate-spin text-[#5F7C65]" : ""}`} />
                  </Button>
                </div>

                {/* Templates Scrollable Grid - The ONLY scroll container here */}
                <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300 dark:[&::-webkit-scrollbar-thumb]:bg-stone-700">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-[#5F7C65] mb-3" />
                      <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                        Retrieving Meta WhatsApp templates...
                      </p>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
                      <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
                        Failed to Load Templates
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">{error}</p>
                      <Button
                        onClick={fetchTemplates}
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800"
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto">
                      <FileText className="h-10 w-10 text-stone-400 mb-3" />
                      <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1">
                        {searchTerm ? "No matching templates found" : "No approved templates available"}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
                        {searchTerm
                          ? "Try a different search keyword or category name."
                          : "Create and submit WhatsApp templates in the Templates Studio to get them approved."}
                      </p>
                      <Link
                        href="/protected/templates"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D583F] dark:text-[#8EAE95] hover:underline"
                      >
                        Manage Templates Studio →
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredTemplates.map((template) => {
                        const templateVars = extractVariables(template);
                        return (
                          <div
                            key={template.id}
                            onClick={() => handleTemplateSelect(template)}
                            className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-[#18201B]/90 hover:border-[#5F7C65]/50 hover:shadow-[0_8px_20px_-4px_rgba(45,88,63,0.12)] p-4 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[#2D583F] dark:group-hover:text-[#8EAE95] transition-colors truncate">
                                  {template.name}
                                </h3>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 shrink-0 uppercase tracking-wider">
                                  {template.category}
                                </span>
                              </div>

                              <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed mb-3">
                                {template.formatted_components.body?.text || "No preview text"}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 border-t border-stone-200/70 dark:border-stone-800/70 text-[11px]">
                              <span className="inline-flex items-center gap-1 text-[#2D583F] dark:text-[#8EAE95] font-semibold text-[10px] uppercase tracking-wider">
                                <span className="size-1.5 rounded-full bg-[#5F7C65]" />
                                {template.status}
                              </span>
                              <span className="font-mono text-stone-500 dark:text-stone-400 text-[11px]">
                                {templateVars.all.length} {templateVars.all.length === 1 ? "variable" : "variables"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Template Configuration State */
              <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
                {/* Configuration Panel - The ONLY scroll container for config */}
                <div
                  className={`${
                    showPreview ? "w-full lg:w-1/2" : "w-full"
                  } flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 border-stone-200/80 dark:border-stone-800/80 ${
                    showPreview ? "lg:border-r" : ""
                  } [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300 dark:[&::-webkit-scrollbar-thumb]:bg-stone-700`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100">
                        {selectedTemplate.name}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Category: {selectedTemplate.category} • Language: {selectedTemplate.language}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTemplate(null)}
                      className="rounded-xl border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs gap-1.5"
                    >
                      <ArrowLeft className="size-3.5" />
                      Back to Templates
                    </Button>
                  </div>

                  {/* Header Media Picker if required */}
                  {(() => {
                    const headerComp = selectedTemplate.formatted_components.header;
                    const hasMediaHeader =
                      headerComp &&
                      ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComp.format?.toUpperCase() || "");

                    if (hasMediaHeader) {
                      const filterMap: Record<string, string> = {
                        IMAGE: "image",
                        VIDEO: "video",
                        DOCUMENT: "document",
                      };
                      const typeFilter = filterMap[headerComp.format?.toUpperCase() || ""] || undefined;

                      return (
                        <div className="mb-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-[#131915]/90 p-4 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2D583F] dark:text-[#8EAE95] flex items-center gap-1.5">
                              <ImageIcon className="size-3 text-[#5F7C65]" />
                              Header Attachment ({headerComp.format}) *
                            </span>
                          </div>

                          {mediaUrl ? (
                            <div className="flex items-center gap-3 bg-stone-50 dark:bg-[#18201B] rounded-xl p-3 border border-stone-200/80 dark:border-stone-800">
                              <ImageIcon className="size-5 text-[#5F7C65] shrink-0" />
                              <span className="text-xs font-mono truncate flex-1 text-stone-800 dark:text-stone-200">
                                {mediaUrl.split("/").pop()?.split("?")[0] || "Selected Media"}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setMediaUrl("")}
                                className="p-1 h-auto text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setMediaPickerOpen(true)}
                              className="w-full gap-2 rounded-xl border-dashed border-stone-300 dark:border-stone-700 hover:border-[#5F7C65] hover:bg-stone-50 dark:hover:bg-stone-800/50 py-4 text-xs font-medium"
                            >
                              <ImageIcon className="size-4 text-[#5F7C65]" />
                              Select {headerComp.format?.toLowerCase()} from Media Library
                            </Button>
                          )}

                          <MediaPickerDialog
                            isOpen={mediaPickerOpen}
                            onClose={() => setMediaPickerOpen(false)}
                            onSelect={(media) => {
                              setMediaUrl(media.url);
                              setMediaPickerOpen(false);
                            }}
                            mediaTypeFilter={typeFilter}
                            isTemplateImageHeader={headerComp.format?.toUpperCase() === "IMAGE"}
                            title={`Select ${headerComp.format?.toLowerCase()} for template header`}
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Variables Form */}
                  {totalVarsCount > 0 ? (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between pb-2 border-b border-stone-200/70 dark:border-stone-800/70">
                        <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                          Template Variables ({totalVarsCount})
                        </span>
                        <span className="text-[11px] text-stone-400">All fields required</span>
                      </div>

                      {/* Header Variables */}
                      {(() => {
                        const headerComp = selectedTemplate.formatted_components.header;
                        const isTextHeader = headerComp && headerComp.format?.toUpperCase() === "TEXT";
                        const headerVars = extractVariables(selectedTemplate).header;

                        if (isTextHeader && headerVars.length > 0) {
                          return (
                            <div className="space-y-3">
                              <h5 className="text-xs font-semibold text-[#2D583F] dark:text-[#8EAE95] uppercase tracking-wider">
                                Header Variables
                              </h5>
                              {headerVars.map((v) => (
                                <div key={`header-${v}`}>
                                  <Label
                                    htmlFor={`header-var-${v}`}
                                    className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5"
                                  >
                                    <span className="font-mono text-[#2D583F] dark:text-[#8EAE95] font-semibold">{`{{${v}}}`}</span>
                                    <span>Header Variable {v} *</span>
                                  </Label>
                                  <Input
                                    id={`header-var-${v}`}
                                    value={variables.header[v] || ""}
                                    onChange={(e) =>
                                      setVariables((prev) => ({
                                        ...prev,
                                        header: { ...prev.header, [v]: e.target.value },
                                      }))
                                    }
                                    placeholder={`Enter value for header {{${v}}}`}
                                    className="mt-1.5 border-stone-200 dark:border-stone-800 bg-white dark:bg-[#131915] focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65] rounded-xl text-xs sm:text-sm h-10 shadow-2xs"
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Body Variables */}
                      {extractVariables(selectedTemplate).body.length > 0 && (
                        <div className="space-y-3">
                          <h5 className="text-xs font-semibold text-[#2D583F] dark:text-[#8EAE95] uppercase tracking-wider">
                            Body Variables
                          </h5>
                          {extractVariables(selectedTemplate).body.map((v) => (
                            <div key={`body-${v}`}>
                              <Label
                                htmlFor={`body-var-${v}`}
                                className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5"
                              >
                                <span className="font-mono text-[#2D583F] dark:text-[#8EAE95] font-semibold">{`{{${v}}}`}</span>
                                <span>Body Variable {v} *</span>
                              </Label>
                              <Input
                                id={`body-var-${v}`}
                                value={variables.body[v] || ""}
                                onChange={(e) =>
                                  setVariables((prev) => ({
                                    ...prev,
                                    body: { ...prev.body, [v]: e.target.value },
                                  }))
                                }
                                placeholder={`Enter value for body {{${v}}}`}
                                className="mt-1.5 border-stone-200 dark:border-stone-800 bg-white dark:bg-[#131915] focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65] rounded-xl text-xs sm:text-sm h-10 shadow-2xs"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer Variables */}
                      {extractVariables(selectedTemplate).footer.length > 0 && (
                        <div className="space-y-3">
                          <h5 className="text-xs font-semibold text-[#2D583F] dark:text-[#8EAE95] uppercase tracking-wider">
                            Footer Variables
                          </h5>
                          {extractVariables(selectedTemplate).footer.map((v) => (
                            <div key={`footer-${v}`}>
                              <Label
                                htmlFor={`footer-var-${v}`}
                                className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5"
                              >
                                <span className="font-mono text-[#2D583F] dark:text-[#8EAE95] font-semibold">{`{{${v}}}`}</span>
                                <span>Footer Variable {v} *</span>
                              </Label>
                              <Input
                                id={`footer-var-${v}`}
                                value={variables.footer[v] || ""}
                                onChange={(e) =>
                                  setVariables((prev) => ({
                                    ...prev,
                                    footer: { ...prev.footer, [v]: e.target.value },
                                  }))
                                }
                                placeholder={`Enter value for footer {{${v}}}`}
                                className="mt-1.5 border-stone-200 dark:border-stone-800 bg-white dark:bg-[#131915] focus-visible:ring-[#5F7C65]/30 focus-visible:border-[#5F7C65] rounded-xl text-xs sm:text-sm h-10 shadow-2xs"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-[#131915]/90 p-5 text-center shadow-2xs">
                      <Sparkles className="size-6 text-[#5F7C65] mx-auto mb-2" />
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        Static WhatsApp Template
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                        This template contains zero dynamic variables and is ready to dispatch directly to{" "}
                        <span className="font-semibold text-stone-700 dark:text-stone-300">{recipientName}</span>.
                      </p>
                    </div>
                  )}

                  {/* Diagnostic / Error Notice */}
                  {error && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl space-y-2.5">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                        <span className="text-xs font-semibold text-red-800 dark:text-red-200">
                          {error.includes("existing WhatsApp account") || error.includes("Cannot create certificate")
                            ? "Action Required: Phone Number Registered on Mobile App"
                            : error.includes("133010") || error.toLowerCase().includes("not registered")
                              ? "One-Time Cloud API Registration Required"
                              : "Delivery Error"}
                        </span>
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{error}</p>

                      {(error.includes("133010") ||
                        error.toLowerCase().includes("not registered") ||
                        error.includes("existing WhatsApp account")) && (
                        <div className="pt-2 border-t border-red-200/80 dark:border-red-900/40 flex flex-wrap items-center gap-2">
                          <Input
                            value={quickRegisterPin}
                            onChange={(e) => setQuickRegisterPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            maxLength={6}
                            className="w-24 h-8 text-xs font-mono text-center bg-white dark:bg-stone-900 rounded-lg"
                            placeholder="123456"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleQuickRegister}
                            disabled={isQuickRegistering || quickRegisterPin.length !== 6}
                            className="h-8 text-xs bg-[#5F7C65] hover:bg-[#526D57] text-white rounded-lg"
                          >
                            {isQuickRegistering ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Register PIN Now
                          </Button>
                          <Link
                            href="/protected/setup"
                            className="h-8 px-2.5 inline-flex items-center text-xs font-medium rounded-lg border border-red-300 dark:border-red-800 hover:bg-red-100/60 text-red-700 dark:text-red-300"
                          >
                            Setup Page
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {quickRegisterSuccess && (
                    <div className="mt-4 p-3 bg-[#5F7C65]/10 border border-[#5F7C65]/20 rounded-xl flex items-center gap-2 text-[#2D583F] dark:text-[#8EAE95] text-xs font-medium">
                      <Check className="h-4 w-4 shrink-0 text-[#5F7C65]" />
                      <span>{quickRegisterSuccess}</span>
                    </div>
                  )}
                </div>

                {/* Preview Panel - ONLY rendered if showPreview is active */}
                {showPreview && (
                  <div className="w-full lg:w-1/2 flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 bg-[#FAF8F5]/60 dark:bg-[#0C0F0D]/60 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300 dark:[&::-webkit-scrollbar-thumb]:bg-stone-700">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3 flex items-center gap-1.5">
                      <Eye className="size-3.5 text-[#5F7C65]" /> Live Interactivity Preview
                    </h4>
                    {renderTemplatePreview(selectedTemplate, variables, mediaUrl)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer Bar */}
          {selectedTemplate && (
            <div className="px-5 py-4 border-t border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-[#18201B]/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedTemplate.name}</span>
                <span className="mx-1.5">•</span>
                <span>{totalVarsCount} {totalVarsCount === 1 ? "variable" : "variables"}</span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                  className="rounded-xl border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs sm:text-sm font-medium gap-1.5 h-10 px-3.5"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="size-4" />
                      <span>Hide Preview</span>
                    </>
                  ) : (
                    <>
                      <Eye className="size-4" />
                      <span>Show Preview</span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSendTemplate}
                  disabled={isSending}
                  className="bg-[#5F7C65] hover:bg-[#526D57] text-white rounded-xl px-5 h-10 font-medium shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2)] active:scale-[0.98] transition-all text-xs sm:text-sm gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      <span>Send Template</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplateSelector;