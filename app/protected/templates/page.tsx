"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  Calendar,
  MessageSquare,
  ArrowLeft,
  Loader2,
  Image,
  Video,
  FileText,
  Hash
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TemplateDetailsDialog } from "@/components/templates/template-details-dialog";

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

interface TemplatesResponse {
  success: boolean;
  data: WhatsAppTemplate[];
  pagination?: Record<string, unknown>;
  total_count: number;
  timestamp: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WhatsAppTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const router = useRouter();

  // Fetch templates from API
  const fetchTemplates = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setIsRefreshing(true);

    try {
      console.log('Fetching templates...');

      const response = await fetch('/api/templates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }

      const data: TemplatesResponse = await response.json();

      if (data.success) {
        console.log(`Fetched ${data.data.length} templates`);
        setTemplates(data.data);
        setFilteredTemplates(data.data);
      } else {
        throw new Error('Failed to fetch templates');
      }

    } catch (error) {
      console.error('Error fetching templates:', error);
      // You might want to show a toast notification here
      alert(`Failed to fetch templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Filter templates based on search and filters
  useEffect(() => {
    let filtered = templates;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(template => template.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== "ALL") {
      filtered = filtered.filter(template => template.category === categoryFilter);
    }

    setFilteredTemplates(filtered);
  }, [templates, searchTerm, statusFilter, categoryFilter]);

  const handleTemplateClick = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setShowDetailsDialog(true);
  };

  const handleRefresh = () => {
    fetchTemplates(false);
  };

  const getStatusBadge = (status: string, statusColor: string) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
        {status}
      </span>
    );
  };

  const getPreviewText = (components: FormattedComponents) => {
    const bodyText = components.body?.text || '';
    const maxLength = 100;

    if (bodyText.length <= maxLength) {
      return bodyText;
    }

    return bodyText.substring(0, maxLength) + '...';
  };

  const getVariableCount = (template: WhatsAppTemplate): number => {
    let count = 0;
    template.components.forEach(component => {
      if (component.text) {
        const matches = component.text.match(/\{\{\d+\}\}/g);
        if (matches) {
          count += matches.length;
        }
      }
    });
    return count;
  };

  const getMediaHeaderInfo = (template: WhatsAppTemplate): { hasMedia: boolean; type?: string; icon?: React.ReactNode } => {
    const header = template.components.find(c => c.type === 'HEADER');
    if (!header?.format) return { hasMedia: false };

    const format = header.format.toUpperCase();
    if (format === 'IMAGE') {
      return { hasMedia: true, type: 'Image', icon: <Image className="h-3.5 w-3.5" /> };
    } else if (format === 'VIDEO') {
      return { hasMedia: true, type: 'Video', icon: <Video className="h-3.5 w-3.5" /> };
    } else if (format === 'DOCUMENT') {
      return { hasMedia: true, type: 'Document', icon: <FileText className="h-3.5 w-3.5" /> };
    }

    return { hasMedia: false };
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-muted/50 to-muted/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/protected')}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  Message Templates
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage your WhatsApp Business templates
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-muted"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Link href="/protected/templates/new" className="flex-1 sm:flex-initial">
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white gap-2 shadow-md hover:shadow-lg transition-all w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </Link>

            <ThemeSwitcher />
          </div>
        </div>

        {/* Filters and Search */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search templates by name, category, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500 transition-all w-full sm:w-auto"
            >
              <option value="ALL">All Status</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
              <option value="PAUSED">Paused</option>
              <option value="DISABLED">Disabled</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500 transition-all w-full sm:w-auto"
            >
              <option value="ALL">All Categories</option>
              <option value="MARKETING">Marketing</option>
              <option value="UTILITY">Utility</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 rounded-2xl flex items-center justify-center mb-6">
              <MessageSquare className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">
              {templates.length === 0 ? 'No templates yet' : 'No matching templates'}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md leading-relaxed">
              {templates.length === 0
                ? 'Create your first WhatsApp message template to start sending personalized notifications to your customers.'
                : 'Try adjusting your search terms or filters to find the templates you\'re looking for.'
              }
            </p>
            {templates.length === 0 && (
              <Link href="/protected/templates/new">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-5 w-5" />
                  Create Your First Template
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredTemplates.length}</span> of <span className="font-semibold text-foreground">{templates.length}</span> templates
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => {
                const variableCount = getVariableCount(template);
                const mediaInfo = getMediaHeaderInfo(template);

                return (
                  <div
                    key={template.id}
                    className="group bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-green-500/50 transition-all duration-200 cursor-pointer"
                    onClick={() => handleTemplateClick(template)}
                  >
                    {/* Template Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <Avatar className="h-11 w-11 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-300 font-semibold text-lg">
                            {template.category_icon}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h3
                            className="font-semibold text-base truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors"
                            title={template.name}
                          >
                            {template.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground truncate">
                              {template.category}
                            </p>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground uppercase">
                              {template.language}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {getStatusBadge(template.status, template.status_color)}
                      </div>
                    </div>

                    {/* Media Header Indicator */}
                    {mediaInfo.hasMedia && (
                      <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-blue-700 dark:text-blue-300">
                        {mediaInfo.icon}
                        <span className="text-xs font-medium">{mediaInfo.type} Header</span>
                      </div>
                    )}

                    {/* Template Preview */}
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {getPreviewText(template.formatted_components)}
                      </p>
                    </div>

                    {/* Template Metadata */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      {/* Variable Count */}
                      {variableCount > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-md">
                          <Hash className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                            {variableCount} Variable{variableCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {/* Button Count */}
                      {template.formatted_components.buttons.length > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md">
                          <div className="w-2 h-2 bg-orange-500 rounded-full" />
                          <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                            {template.formatted_components.buttons.length} Button{template.formatted_components.buttons.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Template Components Indicators */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
                      {template.formatted_components.header && (
                        <span className="inline-flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                          Header
                        </span>
                      )}
                      {template.formatted_components.body && (
                        <span className="inline-flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Body
                        </span>
                      )}
                      {template.formatted_components.footer && (
                        <span className="inline-flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                          Footer
                        </span>
                      )}
                    </div>

                    {/* Template Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="truncate">{formatDate(template.updated_at)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateClick(template);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Template Details Dialog */}
      <TemplateDetailsDialog
        template={selectedTemplate}
        isOpen={showDetailsDialog}
        onClose={() => {
          setShowDetailsDialog(false);
          setSelectedTemplate(null);
        }}
        onRefresh={handleRefresh}
      />
    </div>
  );
} 