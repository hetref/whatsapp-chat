"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  Minus,
  Save,
  Eye,
  FileText,
  Loader2,
  AlertCircle,
  Info,
  Image as ImageIcon,
  Video,
  Sparkles,
  ChevronDown,
  Check,
  Search,
  X,
  ExternalLink,
  Workflow,
  Database,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MediaUpload } from "@/components/chat/media-upload";
import FlowPreview from "@/components/flows/flow-preview";
import LogoIcon from "@/components/logo-icon";
import { cn } from "@/lib/utils";
import type { StoredFlow } from "@/lib/flows/flow-types";

// Type definitions
interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: ButtonComponent[];
}

interface ButtonComponent {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'FLOW' | 'CATALOG' | 'OTP';
  text: string;
  url?: string;
  phone_number?: string;
  flow_id?: string;
  flow_action?: 'navigate' | 'data_exchange';
  navigate_screen?: string;
}

interface CreateTemplateRequest {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: TemplateComponent[];
  message_send_ttl_seconds?: number;
}

// Language options based on WhatsApp supported languages
const SUPPORTED_LANGUAGES = [
  { code: 'en_US', name: 'English (US)' },
  { code: 'en_GB', name: 'English (UK)' },
  { code: 'es_ES', name: 'Spanish (Spain)' },
  { code: 'es_MX', name: 'Spanish (Mexico)' },
  { code: 'pt_BR', name: 'Portuguese (Brazil)' },
  { code: 'fr_FR', name: 'French' },
  { code: 'de_DE', name: 'German' },
  { code: 'it_IT', name: 'Italian' },
  { code: 'ru_RU', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'zh_CN', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

export default function NewTemplatePage() {
  const [templateData, setTemplateData] = useState<CreateTemplateRequest>({
    name: '',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: ''
      }
    ]
  });

  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(true);
  const [publishedFlows, setPublishedFlows] = useState<StoredFlow[]>([]);
  const [flowsLoading, setFlowsLoading] = useState(true);
  const [flowsError, setFlowsError] = useState('');
  const [flowModalTarget, setFlowModalTarget] = useState<{ componentIndex: number; buttonIndex: number } | null>(null);
  const [selectedModalFlowId, setSelectedModalFlowId] = useState<string | null>(null);
  const [flowSearchQuery, setFlowSearchQuery] = useState('');
  const [manualFlowModeMap, setManualFlowModeMap] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const selectedModalFlow = publishedFlows.find((f) => f.id === selectedModalFlowId) || publishedFlows[0] || null;

  useEffect(() => {
    let active = true;
    fetch('/api/flows', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Could not load published Flows.');
        }
        if (active) {
          setPublishedFlows(
            (result.data as StoredFlow[]).filter(
              (flow) => flow.status === 'PUBLISHED' && Boolean(flow.metaFlowId),
            ),
          );
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setFlowsError(error instanceof Error ? error.message : 'Could not load published Flows.');
        }
      })
      .finally(() => {
        if (active) setFlowsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [selectedHeaderMedia, setSelectedHeaderMedia] = useState<{
    s3Key: string;
    fileName: string;
    mimeType: string;
    previewUrl?: string;
  } | null>(null);

  const handleSelectHeaderMedia = async (mediaFiles: any[]) => {
    if (mediaFiles.length === 0) return;
    const mf = mediaFiles[0];

    if (mf.s3Key) {
      try {
        const urlRes = await fetch('/api/media/presigned-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [mf.id] }),
        });
        const urlData = await urlRes.json();
        const previewUrl = urlData.urls?.[mf.id];
        setSelectedHeaderMedia({
          s3Key: mf.s3Key,
          fileName: mf.file?.name || mf.fileName,
          mimeType: mf.s3MimeType || mf.file?.type || mf.mimeType,
          previewUrl: previewUrl || undefined,
        });
      } catch (error) {
        console.error('Error fetching preview URL:', error);
        setSelectedHeaderMedia({
          s3Key: mf.s3Key,
          fileName: mf.file?.name || mf.fileName,
          mimeType: mf.s3MimeType || mf.file?.type || mf.mimeType,
        });
      }
    } else {
      try {
        const mediaRes = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: [{
              fileName: mf.file.name,
              fileSize: mf.file.size,
              mimeType: mf.file.type,
            }],
          }),
        });

        const mediaData = await mediaRes.json();
        if (!mediaRes.ok) {
          throw new Error(mediaData.error || 'Failed to prepare upload');
        }

        const upload = mediaData.uploads[0];

        const uploadRes = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': mf.file.type },
          body: mf.file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${mf.file.name} to storage`);
        }

        await fetch('/api/media/confirm-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [upload.id] }),
        });

        const urlRes = await fetch('/api/media/presigned-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [upload.id] }),
        });
        const urlData = await urlRes.json();
        const previewUrl = urlData.urls?.[upload.id];

        setSelectedHeaderMedia({
          s3Key: upload.s3Key,
          fileName: mf.file.name,
          mimeType: mf.file.type,
          previewUrl: previewUrl || undefined,
        });
      } catch (error) {
        console.error('Error uploading new media:', error);
        setValidationErrors([`Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      }
    }
  };

  // Extract variables from text (e.g., {{1}}, {{2}})
  const extractVariables = (text: string): number[] => {
    if (!text) return [];
    const variableRegex = /\{\{(\d+)\}\}/g;
    const variables: number[] = [];
    let match;

    while ((match = variableRegex.exec(text)) !== null) {
      const varNum = parseInt(match[1], 10);
      if (!variables.includes(varNum)) {
        variables.push(varNum);
      }
    }

    return variables.sort((a, b) => a - b);
  };

  // Replace variables with example values for preview
  const replaceVariablesWithExamples = (text: string, examples?: string[]): string => {
    if (!text || !examples || examples.length === 0) return text;

    let result = text;
    examples.forEach((example, index) => {
      const varNum = index + 1;
      const regex = new RegExp(`\\{\\{${varNum}\\}\\}`, 'g');
      result = result.replace(regex, example || `{{${varNum}}}`);
    });

    return result;
  };

  // Validate template data
  const validateTemplate = (): string[] => {
    const errors: string[] = [];

    if (!templateData.name.trim()) {
      errors.push('Template name is required');
    } else if (templateData.name.length > 512) {
      errors.push('Template name must be 512 characters or less');
    } else if (!/^[a-z0-9_]+$/.test(templateData.name)) {
      errors.push('Template name can only contain lowercase letters, numbers, and underscores');
    }

    if (!templateData.category) {
      errors.push('Template category is required');
    }

    if (!templateData.language) {
      errors.push('Template language is required');
    }

    // Validate components
    const hasBody = templateData.components.some(comp => comp.type === 'BODY');
    if (!hasBody) {
      errors.push('Template must have a BODY component');
    }

    // Validate each component
    templateData.components.forEach((component) => {
      if (component.type === 'BODY' && !component.text?.trim()) {
        errors.push(`Body component is required and cannot be empty`);
      }

      if (component.type === 'HEADER' && component.format === 'TEXT' && !component.text?.trim()) {
        errors.push(`Header text is required when format is TEXT`);
      }

      if (component.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(component.format || '') && !selectedHeaderMedia) {
        errors.push(`Header media example is required when format is ${component.format}`);
      }

      if (component.type === 'FOOTER' && !component.text?.trim()) {
        errors.push(`Footer text cannot be empty`);
      }

      if (component.type === 'BUTTONS' && component.buttons) {
        component.buttons.forEach((button, buttonIndex) => {
          if (!button.text?.trim()) {
            errors.push(`Button ${buttonIndex + 1} text is required`);
          }
          if (button.type === 'URL' && !button.url?.trim()) {
            errors.push(`Button ${buttonIndex + 1} URL is required`);
          }
          if (button.type === 'PHONE_NUMBER' && !button.phone_number?.trim()) {
            errors.push(`Button ${buttonIndex + 1} phone number is required`);
          }
          if (button.type === 'FLOW') {
            if (!button.flow_id?.trim()) {
              errors.push(`Button ${buttonIndex + 1} must be connected to a Flow (choose a published flow or enter a Flow ID)`);
            }
            if ((button.flow_action || 'navigate') === 'navigate' && !button.navigate_screen?.trim()) {
              errors.push(`Button ${buttonIndex + 1} requires an initial screen name for navigation`);
            }
          }
        });
      }
    });

    return errors;
  };

  // Update component
  const updateComponent = (index: number, updates: Partial<TemplateComponent>) => {
    const newComponents = [...templateData.components];
    newComponents[index] = { ...newComponents[index], ...updates };
    setTemplateData({ ...templateData, components: newComponents });
  };

  // Add component
  const addComponent = (type: TemplateComponent['type']) => {
    const newComponent: TemplateComponent = { type };

    if (type === 'HEADER') {
      newComponent.format = 'TEXT';
      newComponent.text = '';
    } else if (type === 'BODY' || type === 'FOOTER') {
      newComponent.text = '';
    } else if (type === 'BUTTONS') {
      newComponent.buttons = [{ type: 'QUICK_REPLY', text: '' }];
    }

    setTemplateData({
      ...templateData,
      components: [...templateData.components, newComponent]
    });
  };

  // Remove component
  const removeComponent = (index: number) => {
    const newComponents = templateData.components.filter((_, i) => i !== index);
    setTemplateData({ ...templateData, components: newComponents });
  };

  // Add button to buttons component
  const addButton = (componentIndex: number) => {
    const newComponents = [...templateData.components];
    const component = newComponents[componentIndex];

    if (component.type === 'BUTTONS') {
      component.buttons = [...(component.buttons || []), { type: 'QUICK_REPLY', text: '' }];
      setTemplateData({ ...templateData, components: newComponents });
    }
  };

  // Remove button from buttons component
  const removeButton = (componentIndex: number, buttonIndex: number) => {
    const newComponents = [...templateData.components];
    const component = newComponents[componentIndex];

    if (component.type === 'BUTTONS' && component.buttons) {
      component.buttons = component.buttons.filter((_, i) => i !== buttonIndex);
      setTemplateData({ ...templateData, components: newComponents });
    }
  };

  // Update button
  const updateButton = (componentIndex: number, buttonIndex: number, updates: Partial<ButtonComponent>) => {
    const newComponents = [...templateData.components];
    const component = newComponents[componentIndex];

    if (component.type === 'BUTTONS' && component.buttons) {
      component.buttons[buttonIndex] = { ...component.buttons[buttonIndex], ...updates };
      setTemplateData({ ...templateData, components: newComponents });
    }
  };

  // Create template
  const handleCreateTemplate = async () => {
    const errors = validateTemplate();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    setIsCreating(true);

    try {
      const requestComponents = templateData.components.map(comp => {
        if (comp.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(comp.format || '')) {
          return {
            ...comp,
            headerMedia: selectedHeaderMedia ? {
              s3Key: selectedHeaderMedia.s3Key,
              fileName: selectedHeaderMedia.fileName,
              mimeType: selectedHeaderMedia.mimeType,
            } : undefined
          };
        }
        if (comp.type === 'BUTTONS' && comp.buttons) {
          return {
            ...comp,
            buttons: comp.buttons.map((button) => {
              if (button.type === 'FLOW') {
                const cleaned: ButtonComponent = {
                  type: 'FLOW',
                  text: button.text?.trim() || 'View flow',
                  flow_id: button.flow_id?.trim(),
                  flow_action: button.flow_action === 'data_exchange' ? 'data_exchange' : 'navigate',
                };
                if (button.navigate_screen?.trim()) {
                  cleaned.navigate_screen = button.navigate_screen.trim();
                }
                return cleaned;
              }
              return button;
            }),
          };
        }
        return comp;
      });

      const payload = {
        ...templateData,
        components: requestComponents
      };

      const response = await fetch('/api/templates/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        let errorMessage = 'Failed to create template';
        if (result.error && result.message) {
          errorMessage = `${result.error}: ${result.message}`;
        } else if (result.message) {
          errorMessage = result.message;
        } else if (result.error) {
          errorMessage = result.error;
        }

        if (result.details?.code && result.details?.subcode) {
          errorMessage += `\n\nError Code: ${result.details.code}.${result.details.subcode}`;
        }

        throw new Error(errorMessage);
      }

      router.push('/protected/templates');
    } catch (error) {
      console.error('Error creating template:', error);
      setValidationErrors([error instanceof Error ? error.message : 'Unknown error occurred']);
    } finally {
      setIsCreating(false);
    }
  };

  // Get component type display name
  const getComponentTypeName = (type: string) => {
    switch (type) {
      case 'HEADER': return 'Header Component';
      case 'BODY': return 'Body Message';
      case 'FOOTER': return 'Footer Note';
      case 'BUTTONS': return 'Interactive Buttons';
      default: return type;
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FAF8F5]/50 dark:bg-[#0C0F0D] text-stone-900 dark:text-stone-100 flex flex-col">
      {/* Top Header Bar */}
      <div className="border-b border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md sticky top-0 z-20 shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/protected/templates">
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-xl border border-stone-200/80 dark:border-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300"
                title="Back to Templates"
              >
                <ArrowLeft className="size-4" />
              </Button>
            </Link>

            <div className="h-5 w-px bg-stone-300/70 dark:bg-stone-700/70 hidden sm:block" />

            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 font-mono mb-0.5">
                <LogoIcon className="size-3 text-[#5F7C65]" />
                <span>Template Studio</span>
              </div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
                Create{" "}
                <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">
                  Template
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-3 rounded-xl border text-xs font-medium gap-1.5 transition-all cursor-pointer",
                showPreview
                  ? "bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border-[#5F7C65]/30 shadow-2xs"
                  : "border-stone-300/80 dark:border-stone-700/80 bg-white/80 dark:bg-stone-900/80 text-stone-600 dark:text-stone-300"
              )}
            >
              <Eye className="size-3.5" />
              <span className="hidden sm:inline">{showPreview ? "Hide Preview" : "Show Preview"}</span>
            </Button>

            <Button
              type="button"
              onClick={handleCreateTemplate}
              disabled={isCreating}
              className="h-9 px-4 rounded-xl bg-[#2D583F] hover:bg-[#234531] text-white text-xs font-medium shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.25),0_1px_3px_0_rgba(0,0,0,0.12)] border border-[#2D583F]/30 hover:shadow-md flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all"
            >
              {isCreating ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Submitting to Meta...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Submit Template</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Studio Body: Editor + Live Preview */}
      <div className="flex-1 w-full flex flex-col lg:flex-row overflow-hidden">
        {/* Editor Form Column */}
        <div className={cn("overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1", showPreview && "lg:w-7/12 xl:w-2/3")}>
          {/* Validation Errors Box */}
          {validationErrors.length > 0 && (
            <div className="rounded-2xl border border-red-200/80 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 p-4 animate-in fade-in duration-200 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400 font-semibold text-xs uppercase tracking-wider font-mono">
                <AlertCircle className="size-4 shrink-0 text-red-600" />
                <span>Please fix the following validation errors:</span>
              </div>
              <ul className="text-xs text-red-800 dark:text-red-300 space-y-1 ml-6 list-disc">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 1: Basic Template Info */}
          <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
            <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/60 dark:bg-stone-950/40 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-200/60 dark:border-stone-800/60">
                <div className="size-7 rounded-lg bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 flex items-center justify-center text-[#5F7C65]">
                  <Info className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                    Basic Configuration
                  </h2>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Define the template name, category, and target language for Meta approval.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template_name" className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    Template Name *
                  </Label>
                  <Input
                    id="template_name"
                    value={templateData.name}
                    onChange={(e) =>
                      setTemplateData({
                        ...templateData,
                        name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                      })
                    }
                    placeholder="e.g. order_shipped_v1"
                    className="mt-1 h-9 text-xs rounded-xl border-stone-300/80 dark:border-stone-700/80 bg-white/90 dark:bg-stone-900/90 shadow-2xs font-mono"
                    maxLength={512}
                  />
                  <p className="text-[10px] text-stone-400 mt-1 font-mono">
                    Only lowercase letters, numbers, and underscores
                  </p>
                </div>

                <div>
                  <Label htmlFor="template_category" className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    Category *
                  </Label>
                  <div className="relative mt-1">
                    <select
                      id="template_category"
                      value={templateData.category}
                      onChange={(e) =>
                        setTemplateData({
                          ...templateData,
                          category: e.target.value as CreateTemplateRequest['category'],
                        })
                      }
                      className="appearance-none w-full h-9 pl-3 pr-8 rounded-xl border border-stone-300/80 dark:border-stone-700/80 bg-white/90 dark:bg-stone-900/90 text-xs font-medium text-stone-700 dark:text-stone-300 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#5F7C65]/30 focus:border-[#5F7C65] transition-all cursor-pointer"
                    >
                      <option value="UTILITY">Utility (Account alerts, order confirmations)</option>
                      <option value="MARKETING">Marketing (Promotions, welcome offers)</option>
                      <option value="AUTHENTICATION">Authentication (One-time passwords / OTP)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-stone-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="template_language" className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    Language *
                  </Label>
                  <div className="relative mt-1">
                    <select
                      id="template_language"
                      value={templateData.language}
                      onChange={(e) => setTemplateData({ ...templateData, language: e.target.value })}
                      className="appearance-none w-full h-9 pl-3 pr-8 rounded-xl border border-stone-300/80 dark:border-stone-700/80 bg-white/90 dark:bg-stone-900/90 text-xs font-medium text-stone-700 dark:text-stone-300 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#5F7C65]/30 focus:border-[#5F7C65] transition-all cursor-pointer"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name} ({lang.code})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-stone-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="template_ttl" className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    TTL / Expiry Duration (seconds)
                  </Label>
                  <Input
                    id="template_ttl"
                    type="number"
                    value={templateData.message_send_ttl_seconds || ''}
                    onChange={(e) =>
                      setTemplateData({
                        ...templateData,
                        message_send_ttl_seconds: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                    placeholder="e.g. 600 (Optional)"
                    className="mt-1 h-9 text-xs rounded-xl border-stone-300/80 dark:border-stone-700/80 bg-white/90 dark:bg-stone-900/90 shadow-2xs font-mono"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Leave empty for standard Meta default</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Template Components Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                  Template Content Components
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Compose the message layout with headers, text variables, and interactive buttons.
                </p>
              </div>

              {/* Add optional component triggers */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {!templateData.components.some((c) => c.type === 'HEADER') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addComponent('HEADER')}
                    className="h-8 rounded-xl border-dashed border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:border-[#5F7C65] gap-1 cursor-pointer"
                  >
                    <Plus className="size-3.5 text-[#5F7C65]" />
                    <span>+ Header</span>
                  </Button>
                )}
                {!templateData.components.some((c) => c.type === 'FOOTER') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addComponent('FOOTER')}
                    className="h-8 rounded-xl border-dashed border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:border-[#5F7C65] gap-1 cursor-pointer"
                  >
                    <Plus className="size-3.5 text-[#5F7C65]" />
                    <span>+ Footer</span>
                  </Button>
                )}
                {!templateData.components.some((c) => c.type === 'BUTTONS') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addComponent('BUTTONS')}
                    className="h-8 rounded-xl border-dashed border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:border-[#5F7C65] gap-1 cursor-pointer"
                  >
                    <Plus className="size-3.5 text-[#5F7C65]" />
                    <span>+ Buttons</span>
                  </Button>
                )}
              </div>
            </div>

            {/* List of active components */}
            <div className="space-y-4">
              {templateData.components.map((component, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]"
                >
                  <div className="rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/60 dark:bg-stone-950/40 p-5 space-y-4">
                    {/* Component Card Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            component.type === 'HEADER' && "bg-blue-500",
                            component.type === 'BODY' && "bg-[#2D583F]",
                            component.type === 'FOOTER' && "bg-purple-500",
                            component.type === 'BUTTONS' && "bg-amber-500"
                          )}
                        />
                        <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider font-mono">
                          {getComponentTypeName(component.type)}
                          {component.type === 'BODY' && <span className="text-red-500 ml-1">*</span>}
                        </h4>
                      </div>

                      {component.type !== 'BODY' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeComponent(index)}
                          className="size-7 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Remove component"
                        >
                          <Minus className="size-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* HEADER COMPONENT */}
                    {component.type === 'HEADER' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                              Header Format
                            </Label>
                            <div className="relative mt-1">
                              <select
                                value={component.format || 'TEXT'}
                                onChange={(e) =>
                                  updateComponent(index, {
                                    format: e.target.value as TemplateComponent['format'],
                                    text: e.target.value === 'TEXT' ? component.text : undefined,
                                  })
                                }
                                className="appearance-none w-full h-9 pl-3 pr-8 rounded-xl border border-stone-300/80 dark:border-stone-700/80 bg-white/90 dark:bg-stone-900/90 text-xs font-medium text-stone-700 dark:text-stone-300 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#5F7C65]/30 focus:border-[#5F7C65] transition-all cursor-pointer"
                              >
                                <option value="TEXT">Text Headline</option>
                                <option value="IMAGE">Image File</option>
                                <option value="VIDEO">Video File</option>
                                <option value="DOCUMENT">Document (PDF/Doc)</option>
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-stone-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        {component.format === 'TEXT' && (
                          <div className="space-y-3 pt-1">
                            <div>
                              <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                                Header Text (Max 60 chars)
                              </Label>
                              <Input
                                value={component.text || ''}
                                onChange={(e) => updateComponent(index, { text: e.target.value })}
                                placeholder="e.g. Order Update: {{1}}"
                                className="mt-1 h-9 text-xs rounded-xl border-stone-300/80 dark:border-stone-700/80 bg-white/90 dark:bg-stone-900/90 shadow-2xs"
                                maxLength={60}
                              />
                            </div>

                            {/* Variable example inputs for Header */}
                            {(() => {
                              const vars = extractVariables(component.text || '');
                              if (vars.length > 0) {
                                return (
                                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                                    <p className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 font-mono">
                                      Sample Values for Header Variables (Required by Meta):
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {vars.map((varNum, varIndex) => (
                                        <div key={varNum}>
                                          <Label className="text-[10px] text-blue-700 dark:text-blue-300 font-mono">
                                            Value for {`{{${varNum}}}`}
                                          </Label>
                                          <Input
                                            value={component.example?.header_text?.[varIndex] || ''}
                                            onChange={(e) => {
                                              const newExamples = [...(component.example?.header_text || [])];
                                              newExamples[varIndex] = e.target.value;
                                              updateComponent(index, {
                                                example: {
                                                  ...component.example,
                                                  header_text: newExamples,
                                                },
                                              });
                                            }}
                                            placeholder="e.g. #ORD-9902"
                                            className="mt-0.5 h-8 text-xs bg-white dark:bg-stone-900 border-blue-300 dark:border-blue-800"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        {/* Media Header Example File Selector */}
                        {component.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(component.format.toUpperCase()) && (
                          <div className="pt-1">
                            <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 shadow-2xs">
                              {selectedHeaderMedia ? (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {component.format === 'IMAGE' && selectedHeaderMedia.previewUrl ? (
                                      <div className="size-12 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 shrink-0">
                                        <img
                                          src={selectedHeaderMedia.previewUrl}
                                          alt={selectedHeaderMedia.fileName}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="size-12 rounded-lg bg-[#5F7C65]/10 flex items-center justify-center text-[#5F7C65] shrink-0 border border-[#5F7C65]/20">
                                        {component.format === 'IMAGE' ? (
                                          <ImageIcon className="size-5" />
                                        ) : component.format === 'VIDEO' ? (
                                          <Video className="size-5" />
                                        ) : (
                                          <FileText className="size-5" />
                                        )}
                                      </div>
                                    )}

                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                                        {selectedHeaderMedia.fileName}
                                      </p>
                                      <p className="text-[10px] text-stone-500 font-mono uppercase mt-0.5">
                                        {selectedHeaderMedia.mimeType}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowMediaUpload(true)}
                                      className="h-8 rounded-lg text-xs"
                                    >
                                      Change Asset
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedHeaderMedia(null)}
                                      className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-2.5">
                                    Meta requires an uploaded example {component.format.toLowerCase()} asset to approve this template.
                                  </p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowMediaUpload(true)}
                                    className="h-8 rounded-xl border-[#5F7C65]/40 text-[#2D583F] dark:text-[#8EAE95] hover:bg-[#5F7C65]/10 text-xs font-medium gap-1.5 cursor-pointer"
                                  >
                                    <Plus className="size-3.5" />
                                    <span>Choose Example Asset from Vault</span>
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* BODY COMPONENT */}
                    {component.type === 'BODY' && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                              Body Message Content *
                            </Label>
                            <span className="text-[10px] font-mono text-stone-400">
                              {(component.text || '').length} / 1024
                            </span>
                          </div>
                          <Textarea
                            value={component.text || ''}
                            onChange={(e) => updateComponent(index, { text: e.target.value })}
                            placeholder="Hello {{1}}, your order {{2}} has been confirmed and is scheduled for delivery on {{3}}."
                            className="min-h-[110px] text-xs rounded-xl border-stone-300/80 dark:border-stone-700/80 bg-white/90 dark:bg-stone-900/90 shadow-2xs leading-relaxed"
                            maxLength={1024}
                          />
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5">
                            Use variables like <code className="px-1 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800 text-[10px] font-mono font-bold text-[#2D583F] dark:text-[#8EAE95]">{`{{1}}`}</code>, <code className="px-1 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800 text-[10px] font-mono font-bold text-[#2D583F] dark:text-[#8EAE95]">{`{{2}}`}</code> to inject real customer data dynamically.
                          </p>
                        </div>

                        {/* Sample Values for Body Variables */}
                        {(() => {
                          const vars = extractVariables(component.text || '');
                          if (vars.length > 0) {
                            return (
                              <div className="p-3.5 rounded-xl bg-[#5F7C65]/10 border border-[#5F7C65]/20 space-y-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2D583F] dark:text-[#8EAE95] font-mono">
                                  <Sparkles className="size-3.5" />
                                  <span>Sample Variable Values (Required for Meta Review)</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                  {vars.map((varNum, varIndex) => (
                                    <div key={varNum}>
                                      <Label className="text-[11px] text-stone-700 dark:text-stone-300 font-mono">
                                        Sample for {`{{${varNum}}}`}
                                      </Label>
                                      <Input
                                        value={component.example?.body_text?.[0]?.[varIndex] || ''}
                                        onChange={(e) => {
                                          const newExamples = [...(component.example?.body_text?.[0] || [])];
                                          newExamples[varIndex] = e.target.value;
                                          updateComponent(index, {
                                            example: {
                                              ...component.example,
                                              body_text: [newExamples],
                                            },
                                          });
                                        }}
                                        placeholder={`e.g. ${varNum === 1 ? 'Aryan' : varNum === 2 ? '#4821' : 'Tuesday'}`}
                                        className="mt-1 h-8 text-xs bg-white dark:bg-stone-900 border-stone-300/80 dark:border-stone-700/80"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {/* FOOTER COMPONENT */}
                    {component.type === 'FOOTER' && (
                      <div>
                        <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                          Footer Text (Max 60 chars)
                        </Label>
                        <Input
                          value={component.text || ''}
                          onChange={(e) => updateComponent(index, { text: e.target.value })}
                          placeholder="e.g. Reply STOP to unsubscribe."
                          className="mt-1 h-9 text-xs rounded-xl border-stone-300/80 dark:border-stone-700/80 bg-white/90 dark:bg-stone-900/90 shadow-2xs"
                          maxLength={60}
                        />
                      </div>
                    )}

                    {/* BUTTONS COMPONENT */}
                    {component.type === 'BUTTONS' && (
                      <div className="space-y-3">
                        {component.buttons?.map((button, buttonIndex) => (
                          <div
                            key={buttonIndex}
                            className="p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 shadow-2xs space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 font-mono">
                                Button #{buttonIndex + 1}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeButton(index, buttonIndex)}
                                className="size-6 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-0"
                              >
                                <Minus className="size-3" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                                  Action Type
                                </Label>
                                <div className="relative mt-1">
                                  <select
                                    value={button.type}
                                    onChange={(e) => {
                                      const nextType = e.target.value as ButtonComponent['type'];
                                      const defaultFlow = publishedFlows[0];
                                      updateButton(index, buttonIndex, {
                                        type: nextType,
                                        url: nextType === 'URL' ? button.url : undefined,
                                        phone_number: nextType === 'PHONE_NUMBER' ? button.phone_number : undefined,
                                        flow_id: nextType === 'FLOW' ? (button.flow_id || defaultFlow?.metaFlowId || defaultFlow?.id) : undefined,
                                        flow_action: nextType === 'FLOW' ? (button.flow_action || 'navigate') : undefined,
                                        navigate_screen: nextType === 'FLOW' ? (button.navigate_screen || defaultFlow?.screenConfig?.screens?.[0]?.id || 'WELCOME') : undefined,
                                        text: nextType === 'FLOW' && (!button.text?.trim() || button.text === 'Track Order') ? 'View flow' : button.text,
                                      });
                                    }}
                                    className="appearance-none w-full h-8 pl-3 pr-8 rounded-lg border border-stone-300/80 dark:border-stone-700/80 bg-white dark:bg-stone-900 text-xs font-medium text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-[#5F7C65]"
                                  >
                                    <option value="QUICK_REPLY">Quick Reply (Preset user text)</option>
                                    <option value="URL">Website URL</option>
                                    <option value="PHONE_NUMBER">Phone Call</option>
                                    <option value="FLOW">WhatsApp Flow (Complete flow)</option>
                                  </select>
                                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-stone-400 pointer-events-none" />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between">
                                  <Label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                                    Button Label * (Max 25 chars)
                                  </Label>
                                  <span className="text-[10px] font-mono text-stone-400">
                                    {(button.text || '').length} / 25
                                  </span>
                                </div>
                                <Input
                                  value={button.text}
                                  onChange={(e) => updateButton(index, buttonIndex, { text: e.target.value })}
                                  placeholder={button.type === 'FLOW' ? 'View flow' : 'e.g. Track Order'}
                                  className="mt-1 h-8 text-xs rounded-lg border-stone-300/80 dark:border-stone-700/80 bg-white dark:bg-stone-900"
                                  maxLength={25}
                                />
                              </div>
                            </div>

                            {button.type === 'URL' && (
                              <div>
                                <Label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                                  Target Website URL *
                                </Label>
                                <Input
                                  value={button.url || ''}
                                  onChange={(e) => updateButton(index, buttonIndex, { url: e.target.value })}
                                  placeholder="https://yourstore.com/orders/track"
                                  className="mt-1 h-8 text-xs font-mono rounded-lg border-stone-300/80 dark:border-stone-700/80 bg-white dark:bg-stone-900"
                                />
                              </div>
                            )}

                            {button.type === 'PHONE_NUMBER' && (
                              <div>
                                <Label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                                  Phone Number (with Country Code) *
                                </Label>
                                <Input
                                  value={button.phone_number || ''}
                                  onChange={(e) => updateButton(index, buttonIndex, { phone_number: e.target.value })}
                                  placeholder="+919876543210"
                                  className="mt-1 h-8 text-xs font-mono rounded-lg border-stone-300/80 dark:border-stone-700/80 bg-white dark:bg-stone-900"
                                />
                              </div>
                            )}

                            {button.type === 'FLOW' && (() => {
                              const buttonKey = `${index}-${buttonIndex}`;
                              const isManual = Boolean(manualFlowModeMap[buttonKey]);
                              const matchedFlow = publishedFlows.find(
                                (f) => f.metaFlowId === button.flow_id || f.id === button.flow_id
                              );

                              return (
                                <div className="space-y-3 pt-2 border-t border-stone-200/60 dark:border-stone-800/60">
                                  {/* Flow Connection Header */}
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                                      <Workflow className="size-3.5 text-[#2D583F] dark:text-[#8EAE95]" />
                                      <span>WhatsApp Flow *</span>
                                    </Label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setManualFlowModeMap((prev) => ({
                                          ...prev,
                                          [buttonKey]: !isManual,
                                        }));
                                      }}
                                      className="text-[10px] text-[#2D583F] dark:text-[#8EAE95] hover:underline cursor-pointer font-mono"
                                    >
                                      {isManual ? "← Select from WaChat Flows" : "Enter Meta Flow ID manually"}
                                    </button>
                                  </div>

                                  {isManual ? (
                                    <div className="p-3 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/40 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                                          Manual Flow ID
                                        </span>
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                          Flow created in Meta WhatsApp Manager
                                        </span>
                                      </div>
                                      <Input
                                        value={button.flow_id || ''}
                                        onChange={(e) => updateButton(index, buttonIndex, { flow_id: e.target.value.trim() })}
                                        placeholder="e.g. 2322935545166844"
                                        className="h-8 text-xs font-mono rounded-lg border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                                      />
                                      <p className="text-[10px] text-stone-400">
                                        Paste the Flow ID shown in your Meta WhatsApp Manager.
                                      </p>
                                    </div>
                                  ) : (
                                    <div>
                                      {matchedFlow ? (
                                        <div className="p-3 rounded-xl border border-[#2D583F]/30 bg-[#2D583F]/5 dark:bg-[#2D583F]/15 space-y-2">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <div className="size-7 rounded-lg bg-[#2D583F]/10 flex items-center justify-center text-[#2D583F] dark:text-[#8EAE95] shrink-0 border border-[#2D583F]/20">
                                                <Workflow className="size-4" />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                                                    {matchedFlow.name}
                                                  </span>
                                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                                                    Published
                                                  </span>
                                                </div>
                                                <p className="text-[10px] text-stone-500 font-mono truncate mt-0.5">
                                                  Flow ID: {matchedFlow.metaFlowId || 'Pending'}
                                                </p>
                                              </div>
                                            </div>

                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setSelectedModalFlowId(matchedFlow.id);
                                                setFlowModalTarget({ componentIndex: index, buttonIndex });
                                              }}
                                              className="h-7 px-2.5 rounded-lg text-[11px] cursor-pointer shrink-0"
                                            >
                                              Change Flow
                                            </Button>
                                          </div>

                                          <div className="flex items-center gap-2 text-[10px] text-stone-500 dark:text-stone-400 font-mono pt-1 border-t border-stone-200/50 dark:border-stone-800/50">
                                            <span>Category: {matchedFlow.category}</span>
                                            <span>•</span>
                                            <span>{matchedFlow.screenConfig.screens.length} Screen(s)</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/40 text-center space-y-2">
                                          <p className="text-xs text-stone-600 dark:text-stone-400">
                                            {publishedFlows.length > 0
                                              ? "Choose an existing published flow to attach to this button."
                                              : "No published flows found. Publish a flow in WaChat or enter a Meta Flow ID manually."}
                                          </p>
                                          <div className="flex items-center justify-center gap-2 pt-1">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                if (publishedFlows.length > 0) {
                                                  setSelectedModalFlowId(publishedFlows[0].id);
                                                }
                                                setFlowModalTarget({ componentIndex: index, buttonIndex });
                                              }}
                                              className="h-8 rounded-xl border-[#5F7C65]/40 text-[#2D583F] dark:text-[#8EAE95] hover:bg-[#5F7C65]/10 text-xs font-medium gap-1.5 cursor-pointer shadow-2xs"
                                            >
                                              <Workflow className="size-3.5" />
                                              <span>Select an existing flow</span>
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Action Mode & Initial Screen */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                      <Label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                                        Flow Action Mode
                                      </Label>
                                      <div className="relative mt-1">
                                        <select
                                          value={button.flow_action || 'navigate'}
                                          onChange={(e) =>
                                            updateButton(index, buttonIndex, {
                                              flow_action: e.target.value as 'navigate' | 'data_exchange',
                                            })
                                          }
                                          className="appearance-none w-full h-8 pl-3 pr-8 rounded-lg border border-stone-300/80 dark:border-stone-700/80 bg-white dark:bg-stone-900 text-xs font-medium text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-[#5F7C65]"
                                        >
                                          <option value="navigate">Navigate to Screen (Complete Flow)</option>
                                          <option value="data_exchange">Endpoint Flow (WaChat Data Exchange)</option>
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-stone-400 pointer-events-none" />
                                      </div>
                                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                                        {button.flow_action === 'data_exchange'
                                          ? 'Interactions query WaChat Endpoint (/api/flow-endpoint) dynamically.'
                                          : 'Customer completes flow screens natively on WhatsApp.'}
                                      </p>
                                    </div>

                                    <div>
                                      <Label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                                        Initial Screen {button.flow_action === 'data_exchange' ? '(Optional)' : '*'}
                                      </Label>
                                      {matchedFlow && matchedFlow.screenConfig.screens.length > 0 ? (
                                        <div className="relative mt-1">
                                          <select
                                            value={button.navigate_screen || matchedFlow.screenConfig.screens[0]?.id || 'WELCOME'}
                                            onChange={(e) =>
                                              updateButton(index, buttonIndex, { navigate_screen: e.target.value })
                                            }
                                            className="appearance-none w-full h-8 pl-3 pr-8 rounded-lg border border-stone-300/80 dark:border-stone-700/80 bg-white dark:bg-stone-900 text-xs font-medium text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-[#5F7C65]"
                                          >
                                            {matchedFlow.screenConfig.screens.map((screen) => (
                                              <option key={screen.id} value={screen.id}>
                                                {screen.title ? `${screen.title} (${screen.id})` : screen.id}
                                              </option>
                                            ))}
                                          </select>
                                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-stone-400 pointer-events-none" />
                                        </div>
                                      ) : (
                                        <Input
                                          value={button.navigate_screen || 'WELCOME'}
                                          onChange={(e) => updateButton(index, buttonIndex, { navigate_screen: e.target.value.trim() })}
                                          placeholder="e.g. WELCOME"
                                          className="mt-1 h-8 text-xs font-mono rounded-lg border-stone-300/80 dark:border-stone-700/80 bg-white dark:bg-stone-900"
                                        />
                                      )}
                                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                                        Starting screen displayed when user taps the button.
                                      </p>
                                    </div>
                                  </div>

                                  {/* Submissions routing note */}
                                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-xs space-y-1">
                                    <div className="flex items-center gap-1.5 font-semibold font-mono text-[11px]">
                                      <Database className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                      <span>Submissions Route Directly to WaChat</span>
                                    </div>
                                    <p className="text-[10px] text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                                      Customer responses to this Flow are received via WaChat webhook &amp; endpoint, saved under Flows &gt; Submissions, and displayed inside the customer chat window. Responses are not stored in Meta.
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ))}

                        {(component.buttons?.length || 0) < 10 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addButton(index)}
                            className="w-full h-8 rounded-xl border-dashed border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:border-[#5F7C65] gap-1 cursor-pointer"
                          >
                            <Plus className="size-3.5 text-[#5F7C65]" />
                            <span>Add Another Action Button</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live WhatsApp Mockup Preview Column */}
        {showPreview && (
          <div className="w-full lg:w-5/12 xl:w-1/3 bg-stone-100/70 dark:bg-stone-950/60 border-t lg:border-t-0 lg:border-l border-stone-200/80 dark:border-stone-800/80 p-6 overflow-y-auto flex flex-col items-center justify-start">
            <div className="w-full max-w-sm sticky top-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider font-mono">
                  Live WhatsApp Preview
                </span>
                <span className="text-[10px] text-stone-400 font-mono">Dynamic Sample Render</span>
              </div>

              {/* Phone Mockup Frame */}
              <div className="rounded-[2.2rem] p-3 bg-stone-900 shadow-2xl border-4 border-stone-800 text-stone-100 relative overflow-hidden">
                {/* Phone Speaker Notch */}
                <div className="w-24 h-4 bg-stone-800 rounded-full mx-auto mb-3" />

                {/* WhatsApp Chat Header */}
                <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-stone-800/80 px-1">
                  <div className="size-8 rounded-full bg-[#2D583F] flex items-center justify-center text-white font-bold text-xs">
                    W
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-100 truncate">Your Business Name</p>
                    <p className="text-[10px] text-emerald-400 font-mono">Official WhatsApp Account</p>
                  </div>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="rounded-2xl rounded-tl-sm bg-[#005C4B] text-white p-3 space-y-2 shadow-md">
                  {/* Header Preview */}
                  {(() => {
                    const headerComp = templateData.components.find((c) => c.type === 'HEADER');
                    if (headerComp) {
                      if (headerComp.format === 'TEXT' && headerComp.text) {
                        const displayText = replaceVariablesWithExamples(
                          headerComp.text,
                          headerComp.example?.header_text
                        );
                        return (
                          <div className="font-bold text-xs pb-1 border-b border-white/10">
                            {displayText}
                          </div>
                        );
                      }
                      if (headerComp.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format)) {
                        if (headerComp.format === 'IMAGE' && selectedHeaderMedia?.previewUrl) {
                          return (
                            <div className="h-32 w-full rounded-xl overflow-hidden bg-black/20">
                              <img
                                src={selectedHeaderMedia.previewUrl}
                                alt="Header preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          );
                        }
                        return (
                          <div className="h-28 rounded-xl bg-black/20 flex flex-col items-center justify-center text-xs text-emerald-200/80 border border-white/10 p-2 text-center">
                            <span className="text-xl mb-1">
                              {headerComp.format === 'IMAGE' ? '🖼️' : headerComp.format === 'VIDEO' ? '🎥' : '📄'}
                            </span>
                            <span className="font-semibold">{headerComp.format} Header</span>
                            <span className="text-[10px] opacity-75 truncate max-w-[200px]">
                              {selectedHeaderMedia?.fileName || 'Example attachment'}
                            </span>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}

                  {/* Body Preview */}
                  {(() => {
                    const bodyComp = templateData.components.find((c) => c.type === 'BODY');
                    const text = bodyComp?.text
                      ? replaceVariablesWithExamples(bodyComp.text, bodyComp.example?.body_text?.[0])
                      : 'Type your message body in the editor to see it live...';
                    return <p className="text-xs leading-relaxed whitespace-pre-wrap">{text}</p>;
                  })()}

                  {/* Footer Preview */}
                  {(() => {
                    const footerComp = templateData.components.find((c) => c.type === 'FOOTER');
                    if (footerComp?.text) {
                      return <p className="text-[10px] text-white/60 pt-1 border-t border-white/10">{footerComp.text}</p>;
                    }
                    return null;
                  })()}

                  {/* Bubble Timestamp */}
                  <div className="flex justify-end items-center gap-1 text-[9px] text-white/50 font-mono">
                    <span>12:00 PM</span>
                    <Check className="size-3 text-emerald-300" />
                  </div>
                </div>

                {/* Buttons Preview */}
                {(() => {
                  const buttonsComp = templateData.components.find((c) => c.type === 'BUTTONS');
                  if (buttonsComp?.buttons && buttonsComp.buttons.length > 0) {
                    return (
                      <div className="mt-2 space-y-1.5">
                        {buttonsComp.buttons.map((b, i) => (
                          <div
                            key={i}
                            className="w-full py-2 px-3 rounded-xl bg-stone-800/90 text-center text-xs font-medium text-emerald-300 border border-stone-700/60 shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <span>
                              {b.type === 'URL' ? '🔗' : b.type === 'PHONE_NUMBER' ? '📞' : b.type === 'FLOW' ? '📋' : '↩️'}
                            </span>
                            <span className="truncate">{b.text || (b.type === 'FLOW' ? 'View flow' : `Button ${i + 1}`)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Template Summary Card */}
              <div className="p-3 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 text-xs text-stone-600 dark:text-stone-400 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Category:</span>
                  <strong className="text-stone-800 dark:text-stone-200 uppercase">{templateData.category}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Language:</span>
                  <strong className="text-stone-800 dark:text-stone-200">{templateData.language}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Components:</span>
                  <strong className="text-stone-800 dark:text-stone-200">{templateData.components.length}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Media Selector Modal */}
      <MediaUpload
        isOpen={showMediaUpload}
        onClose={() => setShowMediaUpload(false)}
        onSend={handleSelectHeaderMedia}
        selectedUser={null}
      />

      {/* Select an Existing Flow Modal */}
      {flowModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Workflow className="size-4 text-[#2D583F] dark:text-[#8EAE95]" />
                  <span>Select an existing flow</span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Choose a published Flow to attach to your WhatsApp template button.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFlowModalTarget(null)}
                className="size-8 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Search Input */}
            <div className="px-5 py-3 border-b border-stone-200/80 dark:border-stone-800/80 bg-stone-50/60 dark:bg-stone-950/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-stone-400" />
                <Input
                  value={flowSearchQuery}
                  onChange={(e) => setFlowSearchQuery(e.target.value)}
                  placeholder="Search flows by name or ID..."
                  className="pl-9 h-8 text-xs bg-white dark:bg-stone-900 rounded-xl border-stone-300/80 dark:border-stone-700/80"
                />
              </div>
            </div>

            {/* Modal Main: Flow List (Left) + Live Preview (Right) */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
              {/* Flows List */}
              <div className="w-full md:w-1/2 p-4 overflow-y-auto space-y-2 border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-800 max-h-[350px] md:max-h-[500px]">
                {flowsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-xs text-stone-500">
                    <Loader2 className="size-5 animate-spin text-[#2D583F] mb-2" />
                    <span>Loading published flows...</span>
                  </div>
                ) : publishedFlows.length === 0 ? (
                  <div className="py-10 text-center space-y-3">
                    <Workflow className="size-8 mx-auto text-stone-300 dark:text-stone-600" />
                    <p className="text-xs text-stone-500">No published Flows available in your account.</p>
                    <Link
                      href="/protected/flows/new"
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2D583F] dark:text-[#8EAE95] underline"
                    >
                      <Plus className="size-3.5" />
                      <span>Create and publish a new Flow</span>
                    </Link>
                  </div>
                ) : (
                  (() => {
                    const filtered = publishedFlows.filter(
                      (flow) =>
                        flow.name.toLowerCase().includes(flowSearchQuery.toLowerCase()) ||
                        flow.category.toLowerCase().includes(flowSearchQuery.toLowerCase()) ||
                        (flow.metaFlowId && flow.metaFlowId.includes(flowSearchQuery))
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="py-8 text-center text-xs text-stone-500">
                          No flows matched &quot;{flowSearchQuery}&quot;
                        </div>
                      );
                    }

                    return filtered.map((flow) => {
                      const isSelected = selectedModalFlowId === flow.id || (!selectedModalFlowId && publishedFlows[0]?.id === flow.id);
                      return (
                        <div
                          key={flow.id}
                          onClick={() => setSelectedModalFlowId(flow.id)}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                            isSelected
                              ? "border-[#2D583F] bg-[#2D583F]/5 dark:bg-[#2D583F]/15 shadow-2xs"
                              : "border-stone-200/80 dark:border-stone-800/80 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900"
                          )}
                        >
                          <div className="mt-0.5">
                            <div
                              className={cn(
                                "size-4 rounded-full border flex items-center justify-center transition-all",
                                isSelected
                                  ? "border-[#2D583F] bg-[#2D583F]"
                                  : "border-stone-300 dark:border-stone-600"
                              )}
                            >
                              {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                                {flow.name}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                                Published
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 font-mono mt-0.5 truncate">
                              ID: {flow.metaFlowId || 'Pending'}
                            </p>
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              {flow.category} • {flow.screenConfig?.screens?.length || 1} Screen(s)
                            </p>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* Right Live Flow Preview */}
              <div className="w-full md:w-1/2 p-4 bg-stone-50/60 dark:bg-stone-950/50 flex flex-col items-center justify-center overflow-y-auto max-h-[350px] md:max-h-[500px]">
                {selectedModalFlow && selectedModalFlow.screenConfig?.screens?.length > 0 ? (
                  <div className="w-full max-w-[310px] scale-90 sm:scale-95 origin-top">
                    <FlowPreview screens={selectedModalFlow.screenConfig.screens} />
                  </div>
                ) : (
                  <div className="text-center p-6 text-stone-400 text-xs space-y-2">
                    <Workflow className="size-8 mx-auto opacity-30 text-[#2D583F]" />
                    <p>Select a flow on the left to preview its screens and interactive layout.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 bg-white dark:bg-stone-900">
              <Link
                href="/protected/flows/new"
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2D583F] dark:text-[#8EAE95] hover:underline"
              >
                <Plus className="size-3.5" />
                <span>Create new</span>
                <ExternalLink className="size-3 opacity-60 ml-0.5" />
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFlowModalTarget(null)}
                  className="h-8 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedModalFlow}
                  onClick={() => {
                    if (selectedModalFlow && flowModalTarget) {
                      const currentBtn = templateData.components[flowModalTarget.componentIndex]?.buttons?.[flowModalTarget.buttonIndex];
                      updateButton(flowModalTarget.componentIndex, flowModalTarget.buttonIndex, {
                        flow_id: selectedModalFlow.metaFlowId || selectedModalFlow.id,
                        flow_action: 'navigate',
                        navigate_screen: selectedModalFlow.screenConfig?.screens?.[0]?.id || 'WELCOME',
                        text: currentBtn?.text?.trim() && currentBtn.text !== 'Track Order'
                          ? currentBtn.text
                          : 'View flow',
                      });
                      setFlowModalTarget(null);
                    }
                  }}
                  className="h-8 px-4 rounded-xl bg-[#2D583F] hover:bg-[#234531] text-white text-xs font-medium cursor-pointer"
                >
                  Select Flow
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}