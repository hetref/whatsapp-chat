"use client";

import { Button } from "@/components/ui/button";
import { X, Copy, CheckCircle, AlertCircle, Clock, Zap, Trash2, Loader2 } from "lucide-react";
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
    return (
      <div key={index} className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
            {component.type}
          </h4>
          {component.format && (
            <span className="text-xs bg-background px-2 py-1 rounded">
              {component.format}
            </span>
          )}
        </div>

        {component.text && (
          <div className="space-y-2">
            <p className="text-sm font-mono bg-background p-3 rounded border">
              {component.text}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(component.text!)}
              className="h-6 text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>
        )}

        {component.buttons && component.buttons.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">Buttons:</p>
            <div className="space-y-2">
              {component.buttons.map((button, buttonIndex) => (
                <div key={buttonIndex} className="bg-background p-2 rounded border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{button.text}</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {button.type}
                    </span>
                  </div>
                  {button.url && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      URL: {button.url}
                    </p>
                  )}
                  {button.phone_number && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
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
              <h3 className="text-lg font-semibold mb-4">Preview</h3>
              <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg p-6">
                <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                  {/* WhatsApp-like message bubble */}
                  <div className="bg-green-500 text-white p-4 rounded-2xl m-4">
                    {/* Header */}
                    {template.formatted_components.header && (
                      <div className="mb-2">
                        <p className="font-semibold text-sm">
                          {template.formatted_components.header.text || '[Header Content]'}
                        </p>
                      </div>
                    )}

                    {/* Body */}
                    {template.formatted_components.body && (
                      <div className="mb-2">
                        <p className="text-sm leading-relaxed">
                          {template.formatted_components.body.text}
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    {template.formatted_components.footer && (
                      <div className="mb-2">
                        <p className="text-xs opacity-75">
                          {template.formatted_components.footer.text}
                        </p>
                      </div>
                    )}

                    {/* Buttons */}
                    {template.formatted_components.buttons.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {template.formatted_components.buttons.map((button, index) => (
                          <div
                            key={index}
                            className="bg-white bg-opacity-20 rounded-lg p-2 text-center"
                          >
                            <span className="text-sm font-medium">{button.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-xs opacity-75 text-right mt-2">
                      12:34 PM
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