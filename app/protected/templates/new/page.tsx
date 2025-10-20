"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  Save, 
  Eye, 
  FileText, 
  Loader2,
  AlertCircle,
  Info
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'CATALOG' | 'OTP';
  text: string;
  url?: string;
  phone_number?: string;
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
  const [showPreview, setShowPreview] = useState(false);
  const router = useRouter();

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
      console.log('Creating template:', templateData);

      const response = await fetch('/api/templates/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to create template');
      }

      console.log('Template created successfully:', result);
      
      // Redirect to templates page
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
      case 'HEADER': return 'Header';
      case 'BODY': return 'Body';
      case 'FOOTER': return 'Footer';
      case 'BUTTONS': return 'Buttons';
      default: return type;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-muted/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Link href="/protected/templates">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold">Create Message Template</h1>
                <p className="text-sm text-muted-foreground">
                  Design a new WhatsApp Business message template
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            
            <Button
              onClick={handleCreateTemplate}
              disabled={isCreating}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isCreating ? 'Creating...' : 'Create Template'}
            </Button>
            
            <ThemeSwitcher />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Editor Panel */}
          <div className={`${showPreview ? 'w-1/2' : 'w-full'} overflow-y-auto p-6 border-r border-border`}>
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-medium text-red-800">Validation Errors</h3>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Template Basic Info */}
            <div className="space-y-6 mb-8">
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Template Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={templateData.name}
                      onChange={(e) => setTemplateData({ ...templateData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                      placeholder="e.g., order_confirmation"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Only lowercase letters, numbers, and underscores allowed
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="language">Language *</Label>
                    <select
                      id="language"
                      value={templateData.language}
                      onChange={(e) => setTemplateData({ ...templateData, language: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      value={templateData.category}
                      onChange={(e) => setTemplateData({ ...templateData, category: e.target.value as CreateTemplateRequest['category'] })}
                      className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="UTILITY">Utility</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="ttl">TTL (seconds)</Label>
                    <Input
                      id="ttl"
                      type="number"
                      value={templateData.message_send_ttl_seconds || ''}
                      onChange={(e) => setTemplateData({ 
                        ...templateData, 
                        message_send_ttl_seconds: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      placeholder="Optional"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Message validity period (optional)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Components */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Template Components</h2>
                <div className="flex gap-2">
                  {!templateData.components.some(c => c.type === 'HEADER') && (
                    <Button
                      onClick={() => addComponent('HEADER')}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Header
                    </Button>
                  )}
                  {!templateData.components.some(c => c.type === 'FOOTER') && (
                    <Button
                      onClick={() => addComponent('FOOTER')}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Footer
                    </Button>
                  )}
                  {!templateData.components.some(c => c.type === 'BUTTONS') && (
                    <Button
                      onClick={() => addComponent('BUTTONS')}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Buttons
                    </Button>
                  )}
                </div>
              </div>

              {/* Render Components */}
              <div className="space-y-4">
                {templateData.components.map((component, index) => (
                  <div key={index} className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          component.type === 'HEADER' ? 'bg-blue-500' :
                          component.type === 'BODY' ? 'bg-green-500' :
                          component.type === 'FOOTER' ? 'bg-purple-500' :
                          'bg-orange-500'
                        }`} />
                        {getComponentTypeName(component.type)}
                        {component.type === 'BODY' && <span className="text-red-500">*</span>}
                      </h3>
                      
                      {component.type !== 'BODY' && (
                        <Button
                          onClick={() => removeComponent(index)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Header Component */}
                    {component.type === 'HEADER' && (
                      <div className="space-y-4">
                        <div>
                          <Label>Format</Label>
                          <select
                            value={component.format || 'TEXT'}
                            onChange={(e) => updateComponent(index, { 
                              format: e.target.value as TemplateComponent['format'],
                              text: e.target.value === 'TEXT' ? component.text : undefined
                            })}
                            className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="TEXT">Text</option>
                            <option value="IMAGE">Image</option>
                            <option value="VIDEO">Video</option>
                            <option value="DOCUMENT">Document</option>
                          </select>
                        </div>
                        
                        {component.format === 'TEXT' && (
                          <div className="space-y-3">
                            <div>
                              <Label>Header Text</Label>
                              <Input
                                value={component.text || ''}
                                onChange={(e) => updateComponent(index, { text: e.target.value })}
                                placeholder="Enter header text... Use {{1}} for variables"
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Use {`{{1}}, {{2}}`} for variables
                              </p>
                            </div>
                            
                            {/* Show example inputs if variables detected */}
                            {(() => {
                              const vars = extractVariables(component.text || '');
                              if (vars.length > 0) {
                                return (
                                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                                    <div className="flex items-start gap-2">
                                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                                          Example Values Required
                                        </p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                                          WhatsApp requires example values for variables. Provide examples for: {vars.map(v => `{{${v}}}`).join(', ')}
                                        </p>
                                        <div className="space-y-2">
                                          {vars.map((varNum, varIndex) => (
                                            <div key={varNum}>
                                              <Label className="text-xs">Example for {`{{${varNum}}}`}</Label>
                                              <Input
                                                value={component.example?.header_text?.[varIndex] || ''}
                                                onChange={(e) => {
                                                  const newExamples = [...(component.example?.header_text || [])];
                                                  newExamples[varIndex] = e.target.value;
                                                  updateComponent(index, {
                                                    example: {
                                                      ...component.example,
                                                      header_text: newExamples
                                                    }
                                                  });
                                                }}
                                                placeholder={`e.g., John`}
                                                className="mt-1"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Body Component */}
                    {component.type === 'BODY' && (
                      <div className="space-y-3">
                        <div>
                          <Label>Body Text *</Label>
                          <Textarea
                            value={component.text || ''}
                            onChange={(e) => updateComponent(index, { text: e.target.value })}
                            placeholder="Enter your message body text here. Use {{1}}, {{2}}, etc. for variables..."
                            className="mt-1 min-h-[100px]"
                            maxLength={1024}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Maximum 1024 characters. Use {`{{1}}, {{2}}`} for variables.
                          </p>
                        </div>
                        
                        {/* Show example inputs if variables detected */}
                        {(() => {
                          const vars = extractVariables(component.text || '');
                          if (vars.length > 0) {
                            return (
                              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                                <div className="flex items-start gap-2">
                                  <Info className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                                      Example Values Required
                                    </p>
                                    <p className="text-xs text-green-700 dark:text-green-300 mb-3">
                                      WhatsApp requires example values for variables. Provide examples for: {vars.map(v => `{{${v}}}`).join(', ')}
                                    </p>
                                    <div className="space-y-2">
                                      {vars.map((varNum, varIndex) => (
                                        <div key={varNum}>
                                          <Label className="text-xs">Example for {`{{${varNum}}}`}</Label>
                                          <Input
                                            value={component.example?.body_text?.[0]?.[varIndex] || ''}
                                            onChange={(e) => {
                                              const newExamples = [...(component.example?.body_text?.[0] || [])];
                                              newExamples[varIndex] = e.target.value;
                                              updateComponent(index, {
                                                example: {
                                                  ...component.example,
                                                  body_text: [newExamples]
                                                }
                                              });
                                            }}
                                            placeholder={`e.g., ${varNum === 1 ? 'John' : varNum === 2 ? 'December 25' : 'example value'}`}
                                            className="mt-1"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {/* Footer Component */}
                    {component.type === 'FOOTER' && (
                      <div>
                        <Label>Footer Text</Label>
                        <Input
                          value={component.text || ''}
                          onChange={(e) => updateComponent(index, { text: e.target.value })}
                          placeholder="Enter footer text..."
                          className="mt-1"
                          maxLength={60}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Maximum 60 characters
                        </p>
                      </div>
                    )}

                    {/* Buttons Component */}
                    {component.type === 'BUTTONS' && (
                      <div className="space-y-4">
                        {component.buttons?.map((button, buttonIndex) => (
                          <div key={buttonIndex} className="bg-muted/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-sm">Button {buttonIndex + 1}</h4>
                              <Button
                                onClick={() => removeButton(index, buttonIndex)}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label>Button Type</Label>
                                <select
                                  value={button.type}
                                  onChange={(e) => updateButton(index, buttonIndex, { 
                                    type: e.target.value as ButtonComponent['type'],
                                    url: e.target.value === 'URL' ? button.url : undefined,
                                    phone_number: e.target.value === 'PHONE_NUMBER' ? button.phone_number : undefined
                                  })}
                                  className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                  <option value="QUICK_REPLY">Quick Reply</option>
                                  <option value="URL">URL</option>
                                  <option value="PHONE_NUMBER">Phone Number</option>
                                  <option value="CATALOG">Catalog</option>
                                </select>
                              </div>
                              
                              <div>
                                <Label>Button Text</Label>
                                <Input
                                  value={button.text}
                                  onChange={(e) => updateButton(index, buttonIndex, { text: e.target.value })}
                                  placeholder="Button text..."
                                  className="mt-1"
                                  maxLength={25}
                                />
                              </div>
                            </div>

                            {button.type === 'URL' && (
                              <div className="mt-3">
                                <Label>URL</Label>
                                <Input
                                  value={button.url || ''}
                                  onChange={(e) => updateButton(index, buttonIndex, { url: e.target.value })}
                                  placeholder="https://example.com"
                                  className="mt-1"
                                />
                              </div>
                            )}

                            {button.type === 'PHONE_NUMBER' && (
                              <div className="mt-3">
                                <Label>Phone Number</Label>
                                <Input
                                  value={button.phone_number || ''}
                                  onChange={(e) => updateButton(index, buttonIndex, { phone_number: e.target.value })}
                                  placeholder="+1234567890"
                                  className="mt-1"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {(component.buttons?.length || 0) < 10 && (
                          <Button
                            onClick={() => addButton(index)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Button
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="w-1/2 overflow-y-auto p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
              <div className="sticky top-0 mb-6">
                <h2 className="text-lg font-semibold mb-4">Template Preview</h2>
                
                <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                  {/* WhatsApp-like message bubble */}
                  <div className="bg-green-500 text-white p-4 rounded-2xl m-4">
                    {/* Header */}
                    {(() => {
                      const headerComp = templateData.components.find(c => c.type === 'HEADER');
                      if (headerComp && headerComp.text) {
                        const displayText = replaceVariablesWithExamples(
                          headerComp.text, 
                          headerComp.example?.header_text
                        );
                        return (
                          <div className="mb-2">
                            <p className="font-semibold text-sm">{displayText}</p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Body */}
                    {(() => {
                      const bodyComp = templateData.components.find(c => c.type === 'BODY');
                      if (bodyComp) {
                        const displayText = bodyComp.text 
                          ? replaceVariablesWithExamples(
                              bodyComp.text, 
                              bodyComp.example?.body_text?.[0]
                            )
                          : 'Enter your message body...';
                        return (
                          <div className="mb-2">
                            <p className="text-sm leading-relaxed">{displayText}</p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Footer */}
                    {templateData.components.find(c => c.type === 'FOOTER') && (
                      <div className="mb-2">
                        <p className="text-xs opacity-75">
                          {templateData.components.find(c => c.type === 'FOOTER')?.text}
                        </p>
                      </div>
                    )}

                    {/* Buttons */}
                    {templateData.components.find(c => c.type === 'BUTTONS')?.buttons && (
                      <div className="mt-3 space-y-1">
                        {templateData.components.find(c => c.type === 'BUTTONS')?.buttons?.map((button, index) => (
                          <div
                            key={index}
                            className="bg-white bg-opacity-20 rounded-lg p-2 text-center"
                          >
                            <span className="text-sm font-medium">
                              {button.text || `Button ${index + 1}`}
                            </span>
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

                {/* Template Info */}
                <div className="mt-6 bg-card border border-border rounded-lg p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Template Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-mono">{templateData.name || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span>{templateData.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Language:</span>
                      <span>{SUPPORTED_LANGUAGES.find(l => l.code === templateData.language)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Components:</span>
                      <span>{templateData.components.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 