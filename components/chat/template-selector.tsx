"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Search, Send, Loader2, AlertCircle, FileText, Eye } from "lucide-react";

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
  name: string;
  custom_name?: string;
  whatsapp_name?: string;
  last_active: string;
}

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSendTemplate: (templateName: string, templateData: WhatsAppTemplate, variables: {
    header: Record<string, string>;
    body: Record<string, string>;
    footer: Record<string, string>;
  }) => Promise<void>;
  selectedUser: ChatUser;
}

export function TemplateSelector({ isOpen, onClose, onSendTemplate, selectedUser }: TemplateSelectorProps) {
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
    footer: {}
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch templates when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  // Filter templates based on search
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.category.toLowerCase().includes(searchTerm.toLowerCase())
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
      const response = await fetch('/api/templates?status=APPROVED');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch templates');
      }

      setTemplates(result.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  };

  const extractVariables = (template: WhatsAppTemplate): {
    header: string[];
    body: string[];
    footer: string[];
    all: string[];
  } => {
    const headerVariables: string[] = [];
    const bodyVariables: string[] = [];
    const footerVariables: string[] = [];
    
    template.components.forEach(component => {
      if (component.text) {
        // Extract variables like {{1}}, {{2}}, etc.
        const matches = component.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          const componentVariables = matches.map(match => match.replace(/[{}]/g, ''));
          
          switch (component.type) {
            case 'HEADER':
              componentVariables.forEach(variable => {
                if (!headerVariables.includes(variable)) {
                  headerVariables.push(variable);
                }
              });
              break;
            case 'BODY':
              componentVariables.forEach(variable => {
                if (!bodyVariables.includes(variable)) {
                  bodyVariables.push(variable);
                }
              });
              break;
            case 'FOOTER':
              componentVariables.forEach(variable => {
                if (!footerVariables.includes(variable)) {
                  footerVariables.push(variable);
                }
              });
              break;
          }
        }
      }
    });

    // Sort variables numerically
    headerVariables.sort((a, b) => parseInt(a) - parseInt(b));
    bodyVariables.sort((a, b) => parseInt(a) - parseInt(b));
    footerVariables.sort((a, b) => parseInt(a) - parseInt(b));
    
    // Get all unique variables
    const allVariables = [...new Set([...headerVariables, ...bodyVariables, ...footerVariables])]
      .sort((a, b) => parseInt(a) - parseInt(b));

    return {
      header: headerVariables,
      body: bodyVariables,
      footer: footerVariables,
      all: allVariables
    };
  };

  const renderTemplatePreview = (template: WhatsAppTemplate, vars: {
    header: Record<string, string>;
    body: Record<string, string>;
    footer: Record<string, string>;
  }) => {
    const replaceVariables = (text: string, componentVars: Record<string, string>) => {
      let result = text;
      Object.entries(componentVars).forEach(([key, value]) => {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
      });
      return result;
    };

    return (
      <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg p-4">
        <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-green-500 text-white p-4 rounded-2xl m-4">
            {/* Header */}
            {template.formatted_components.header && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-white opacity-60"></div>
                  <span className="text-xs opacity-75 font-medium uppercase tracking-wide">Header</span>
                </div>
                {template.formatted_components.header.format === 'IMAGE' ? (
                  <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center mb-2">
                    <span className="text-sm">📷 Header Image</span>
                  </div>
                ) : template.formatted_components.header.format === 'VIDEO' ? (
                  <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center mb-2">
                    <span className="text-sm">🎥 Header Video</span>
                  </div>
                ) : template.formatted_components.header.format === 'DOCUMENT' ? (
                  <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center mb-2">
                    <span className="text-sm">📄 Header Document</span>
                  </div>
                ) : template.formatted_components.header.text ? (
                  <p className="font-semibold text-sm mb-2">
                    {replaceVariables(template.formatted_components.header.text, vars.header)}
                  </p>
                ) : (
                  <p className="font-semibold text-sm mb-2">[Header Content]</p>
                )}
              </div>
            )}

            {/* Body */}
            {template.formatted_components.body && (
              <div className="mb-3">
                {template.formatted_components.header && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-white opacity-60"></div>
                    <span className="text-xs opacity-75 font-medium uppercase tracking-wide">Body</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed">
                  {replaceVariables(template.formatted_components.body.text || '', vars.body)}
                </p>
              </div>
            )}

            {/* Footer */}
            {template.formatted_components.footer && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-white opacity-60"></div>
                  <span className="text-xs opacity-75 font-medium uppercase tracking-wide">Footer</span>
                </div>
                <p className="text-xs opacity-75">
                  {replaceVariables(template.formatted_components.footer.text || '', vars.footer)}
                </p>
              </div>
            )}

            {/* Buttons */}
            {template.formatted_components.buttons.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-white opacity-60"></div>
                  <span className="text-xs opacity-75 font-medium uppercase tracking-wide">Buttons</span>
                </div>
                <div className="space-y-1">
                  {template.formatted_components.buttons.map((button, index) => (
                    <div
                      key={index}
                      className="bg-white bg-opacity-20 rounded-lg p-2 text-center"
                    >
                      <div className="flex items-center justify-center gap-2">
                        {button.type === 'URL' && <span>🔗</span>}
                        {button.type === 'PHONE_NUMBER' && <span>📞</span>}
                        {button.type === 'QUICK_REPLY' && <span>💬</span>}
                        <span className="text-sm font-medium">{button.text}</span>
                      </div>
                      {button.url && (
                        <div className="text-xs opacity-60 mt-1 truncate">
                          {button.url}
                        </div>
                      )}
                      {button.phone_number && (
                        <div className="text-xs opacity-60 mt-1">
                          {button.phone_number}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs opacity-75 text-right mt-3">
              12:34 PM
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleTemplateSelect = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(false);
    
    // Initialize variables
    const templateVars = extractVariables(template);
    const initialVars: Record<string, string> = {};
    templateVars.all.forEach(variable => {
      initialVars[variable] = '';
    });
    setVariables({
      header: {},
      body: {},
      footer: {}
    });
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate) return;

    // Validate required variables per component
    const templateVars = extractVariables(selectedTemplate);
    const missingVars: string[] = [];
    
    // Check header variables
    templateVars.header.forEach(variable => {
      if (!variables.header[variable]?.trim()) {
        missingVars.push(`Header {{${variable}}}`);
      }
    });
    
    // Check body variables
    templateVars.body.forEach(variable => {
      if (!variables.body[variable]?.trim()) {
        missingVars.push(`Body {{${variable}}}`);
      }
    });
    
    // Check footer variables
    templateVars.footer.forEach(variable => {
      if (!variables.footer[variable]?.trim()) {
        missingVars.push(`Footer {{${variable}}}`);
      }
    });
    
    if (missingVars.length > 0) {
      setError(`Please fill in all variables: ${missingVars.join(', ')}`);
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await onSendTemplate(selectedTemplate.name, selectedTemplate, variables);
      
      // Reset state and close
      setSelectedTemplate(null);
      setVariables({
        header: {},
        body: {},
        footer: {}
      });
      setShowPreview(false);
      onClose();
    } catch (error) {
      console.error('Error sending template:', error);
      setError(error instanceof Error ? error.message : 'Failed to send template');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setVariables({
      header: {},
      body: {},
      footer: {}
    });
    setShowPreview(false);
    setSearchTerm('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold">Send Template Message</h2>
              <p className="text-sm text-muted-foreground">
                To: {selectedUser.custom_name || selectedUser.whatsapp_name || selectedUser.name}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-scroll">
          {!selectedTemplate ? (
            /* Template Selection */
            <div className="h-full flex flex-col">
              {/* Search */}
              <div className="p-6 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search templates by name or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Templates List */}
              <div className="flex-1 overflow-y-scroll p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    <span className="ml-3 text-muted-foreground">Loading templates...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                      <p className="text-red-600 font-medium mb-2">Failed to load templates</p>
                      <p className="text-sm text-muted-foreground mb-4">{error}</p>
                      <Button onClick={fetchTemplates} variant="outline" size="sm">
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No templates found matching your search' : 'No approved templates available'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium text-sm">{template.name}</h3>
                            <p className="text-xs text-muted-foreground">{template.category}</p>
                          </div>
                          <span className="text-lg">{template.category_icon}</span>
                        </div>
                        
                        <div className="text-xs text-muted-foreground mb-2">
                          {template.formatted_components.body?.text?.substring(0, 100)}
                          {template.formatted_components.body?.text && template.formatted_components.body.text.length > 100 ? '...' : ''}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded ${template.status_color}`}>
                            {template.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {extractVariables(template).all.length} variables
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Template Configuration */
            <div className="h-full flex">
              {/* Configuration Panel */}
              <div className={`${showPreview ? 'w-1/2' : 'w-full'} overflow-y-scroll p-6 border-r border-border`}>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedTemplate.category}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTemplate(null)}
                    >
                      Back to Templates
                    </Button>
                  </div>

                  {/* Variables */}
                  {extractVariables(selectedTemplate).all.length > 0 && (
                    <div className="space-y-6">
                      <h4 className="font-medium">Template Variables</h4>
                      
                      {/* Header Variables */}
                      {extractVariables(selectedTemplate).header.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <h5 className="text-sm font-medium text-blue-700 dark:text-blue-300">Header Variables</h5>
                          </div>
                          {extractVariables(selectedTemplate).header.map((variable) => (
                            <div key={`header-${variable}`}>
                              <Label htmlFor={`header-var-${variable}`}>
                                Header Variable {`{{${variable}}}`} *
                              </Label>
                              <Input
                                id={`header-var-${variable}`}
                                value={variables.header[variable] || ''}
                                onChange={(e) => setVariables(prev => ({
                                  ...prev,
                                  header: { ...prev.header, [variable]: e.target.value }
                                }))}
                                placeholder={`Enter value for header {{${variable}}}`}
                                className="mt-1"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Body Variables */}
                      {extractVariables(selectedTemplate).body.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <h5 className="text-sm font-medium text-green-700 dark:text-green-300">Body Variables</h5>
                          </div>
                          {extractVariables(selectedTemplate).body.map((variable) => (
                            <div key={`body-${variable}`}>
                              <Label htmlFor={`body-var-${variable}`}>
                                Body Variable {`{{${variable}}}`} *
                              </Label>
                              <Input
                                id={`body-var-${variable}`}
                                value={variables.body[variable] || ''}
                                onChange={(e) => setVariables(prev => ({
                                  ...prev,
                                  body: { ...prev.body, [variable]: e.target.value }
                                }))}
                                placeholder={`Enter value for body {{${variable}}}`}
                                className="mt-1"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer Variables */}
                      {extractVariables(selectedTemplate).footer.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <h5 className="text-sm font-medium text-purple-700 dark:text-purple-300">Footer Variables</h5>
                          </div>
                          {extractVariables(selectedTemplate).footer.map((variable) => (
                            <div key={`footer-${variable}`}>
                              <Label htmlFor={`footer-var-${variable}`}>
                                Footer Variable {`{{${variable}}}`} *
                              </Label>
                              <Input
                                id={`footer-var-${variable}`}
                                value={variables.footer[variable] || ''}
                                onChange={(e) => setVariables(prev => ({
                                  ...prev,
                                  footer: { ...prev.footer, [variable]: e.target.value }
                                }))}
                                placeholder={`Enter value for footer {{${variable}}}`}
                                className="mt-1"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">Error</span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Panel */}
              {showPreview && (
                <div className="w-1/2 overflow-y-scroll p-6">
                  <h4 className="font-medium mb-4">Preview</h4>
                  {renderTemplatePreview(selectedTemplate, variables)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="flex items-center justify-between p-6 border-t border-border bg-muted/50">
            <div className="text-sm text-muted-foreground">
              Template: {selectedTemplate.name} • {extractVariables(selectedTemplate).all.length} variables
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <Button
                onClick={handleSendTemplate}
                disabled={isSending}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Template
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 