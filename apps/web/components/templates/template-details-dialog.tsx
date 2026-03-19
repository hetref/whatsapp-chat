"use client";

import { Button } from "@/components/ui/button";
import { X, Copy, CheckCircle, AlertCircle, Clock, Zap, Trash2, Loader2, Hash, Image, Video, FileText } from "lucide-react";
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

export function TemplateDetailsDialog({ template, isOpen, onClose, onRefresh }: TemplateDetailsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !template) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You might want to show a toast notification here
  };

  const extractVariables = (template: WhatsAppTemplate): string[] => {
    const variables = new Set<string>();
    template.components.forEach(component => {
      if (component.text) {
        const matches = component.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          matches.forEach(match => variables.add(match));
        }
      }
    });
    return Array.from(variables).sort();
  };

  const getMediaHeaderInfo = (template: WhatsAppTemplate): { hasMedia: boolean; type?: string; format?: string } => {
    const header = template.components.find(c => c.type === 'HEADER');
    if (!header?.format) return { hasMedia: false };

    const format = header.format.toUpperCase();
    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) {
      return { hasMedia: true, type: format, format: header.format };
    }

    return { hasMedia: false };
  };

  const variables = extractVariables(template);
  const mediaInfo = getMediaHeaderInfo(template);

  const handleDeleteTemplate = async () => {
    if (!template) return;

    // Show native confirm dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete the template "${template.name}"?\n\n` +
      `This will permanently remove it from your WhatsApp Business account and cannot be recovered.\n\n` +
      `⚠️ Warning: Deleting this template will affect any campaigns or automations that use it.`
    );

    if (!confirmed) {
      return; // User cancelled
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/templates/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: template.id,
          templateName: template.name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Extract detailed error information from the API response
        let errorMessage = 'Failed to delete template';

        if (result.error && result.message) {
          // Use the title and message from our improved API response
          errorMessage = `${result.error}: ${result.message}`;
        } else if (result.message) {
          errorMessage = result.message;
        } else if (result.error) {
          errorMessage = result.error;
        }

        // Add additional context if available
        if (result.details?.code && result.details?.subcode) {
          errorMessage += `\n\nError Code: ${result.details.code}.${result.details.subcode}`;
        }

        throw new Error(errorMessage);
      }

      console.log('Template deleted successfully:', result);

      // Close the main dialog
      onClose();

      // Refresh the templates list
      onRefresh();

      // Show success message
      alert(`Template "${template.name}" has been deleted successfully.`);

    } catch (error) {
      console.error('Error deleting template:', error);
      // Show error message
      alert(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'REJECTED':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'PAUSED':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'DISABLED':
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  const renderComponent = (component: TemplateComponent, index: number) => {
    const isMediaHeader = component.type === 'HEADER' && component.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(component.format.toUpperCase());

    return (
      <div key={index} className="bg-muted/50 rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
            {component.type}
          </h4>
          {component.format && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-background px-2.5 py-1 rounded-md border border-border font-medium">
              {isMediaHeader && (
                <>
                  {component.format.toUpperCase() === 'IMAGE' && <Image className="h-3 w-3" />}
                  {component.format.toUpperCase() === 'VIDEO' && <Video className="h-3 w-3" />}
                  {component.format.toUpperCase() === 'DOCUMENT' && <FileText className="h-3 w-3" />}
                </>
              )}
              {component.format}
            </span>
          )}
        </div>

        {isMediaHeader && (
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
              ⚠️ This template requires a {component.format?.toLowerCase()} to be provided when sending
            </p>
          </div>
        )}

        {component.text && (
          <div className="space-y-2">
            <p className="text-sm font-mono bg-background p-3 rounded border border-border break-words whitespace-pre-wrap">
              {component.text}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(component.text!)}
              className="h-7 text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Text
            </Button>
          </div>
        )}

        {component.buttons && component.buttons.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Buttons:</p>
            <div className="space-y-2">
              {component.buttons.map((button, buttonIndex) => (
                <div key={buttonIndex} className="bg-background p-3 rounded border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{button.text}</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded font-medium">
                      {button.type}
                    </span>
                  </div>
                  {button.url && (
                    <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
                      🔗 {button.url}
                    </p>
                  )}
                  {button.phone_number && (
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                      📞 {button.phone_number}
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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Dialog */}
        <div
          className="bg-background rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="text-2xl">{template.category_icon}</div>
              <div>
                <h2 className="text-xl font-semibold">{template.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {template.category} • {template.language}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Media Header & Variables Info */}
            {(mediaInfo.hasMedia || variables.length > 0) && (
              <div className="flex flex-wrap gap-3 mb-6 p-4 bg-muted/50 rounded-lg border border-border">
                {mediaInfo.hasMedia && (
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    {mediaInfo.type === 'IMAGE' && <Image className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                    {mediaInfo.type === 'VIDEO' && <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                    {mediaInfo.type === 'DOCUMENT' && <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {mediaInfo.type} Header Required
                    </span>
                  </div>
                )}

                {variables.length > 0 && (
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      {variables.length} Variable{variables.length !== 1 ? 's' : ''}: {variables.join(', ')}
                    </span>
                  </div>
                )}

                {template.formatted_components.buttons.length > 0 && (
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      {template.formatted_components.buttons.length} Button{template.formatted_components.buttons.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Status and Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Status Card */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Status & Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(template.status)}
                      <span className={`text-sm font-medium px-2 py-1 rounded ${template.status_color}`}>
                        {template.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Template ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{template.id}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(template.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <span className="text-sm font-medium">{template.category}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Language:</span>
                    <span className="text-sm font-medium">{template.language}</span>
                  </div>
                </div>
              </div>

              {/* Timestamps Card */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Created:</span>
                    <p className="text-sm font-medium">{formatDate(template.created_at)}</p>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Last Updated:</span>
                    <p className="text-sm font-medium">{formatDate(template.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rejection Reason */}
            {template.rejected_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Rejection Reason
                </h3>
                <p className="text-sm text-red-700">{template.rejected_reason}</p>
              </div>
            )}

            {/* Template Components */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Template Components</h3>

              <div className="grid grid-cols-1 gap-4">
                {template.components.map((component, index) =>
                  renderComponent(component, index)
                )}
              </div>
            </div>

            {/* Template Preview */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">WhatsApp Preview</h3>
              <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-blue-950/20 rounded-xl p-6">
                <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                  {/* WhatsApp-like message bubble */}
                  <div className="bg-green-500 text-white rounded-2xl m-4 overflow-hidden">
                    {/* Media Header Placeholder */}
                    {mediaInfo.hasMedia && (
                      <div className="bg-green-600 p-8 flex flex-col items-center justify-center gap-2 border-b border-green-400/30">
                        {mediaInfo.type === 'IMAGE' && <Image className="h-12 w-12 opacity-80" />}
                        {mediaInfo.type === 'VIDEO' && <Video className="h-12 w-12 opacity-80" />}
                        {mediaInfo.type === 'DOCUMENT' && <FileText className="h-12 w-12 opacity-80" />}
                        <p className="text-xs opacity-80 font-medium">[{mediaInfo.type} Header]</p>
                      </div>
                    )}

                    {/* Text Header */}
                    {!mediaInfo.hasMedia && template.formatted_components.header && (
                      <div className="p-4 pb-2">
                        <p className="font-semibold text-sm">
                          {template.formatted_components.header.text || '[Header Content]'}
                        </p>
                      </div>
                    )}

                    {/* Body */}
                    {template.formatted_components.body && (
                      <div className={`px-4 ${mediaInfo.hasMedia || !template.formatted_components.header ? 'pt-4' : 'pt-2'} pb-2`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {template.formatted_components.body.text}
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    {template.formatted_components.footer && (
                      <div className="px-4 pb-3">
                        <p className="text-xs opacity-75">
                          {template.formatted_components.footer.text}
                        </p>
                      </div>
                    )}

                    {/* Buttons */}
                    {template.formatted_components.buttons.length > 0 && (
                      <div className="px-4 pb-4 space-y-2">
                        {template.formatted_components.buttons.map((button, index) => (
                          <div
                            key={index}
                            className="bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors rounded-lg p-2.5 text-center cursor-pointer"
                          >
                            <span className="text-sm font-medium">{button.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className={`text-xs opacity-75 text-right ${template.formatted_components.buttons.length > 0 ? 'px-4 pb-3' : 'px-4 pb-4'}`}>
                      12:34 PM ✓✓
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-border bg-muted/50">
            <div className="text-sm text-muted-foreground">
              Template details • Last updated {formatDate(template.updated_at)}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onRefresh}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteTemplate}
                className="gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Template
                  </>
                )}
              </Button>
              <Button
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 