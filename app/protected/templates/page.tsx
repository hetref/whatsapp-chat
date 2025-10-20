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
  Loader2
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
      <div className="border-b border-border bg-muted/50">
        <div className="flex items-center justify-between p-4">
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
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold">Message Templates</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your WhatsApp Business message templates
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Link href="/protected/templates/new">
              <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </Link>
            
            <ThemeSwitcher />
          </div>
        </div>

        {/* Filters and Search */}
        <div className="px-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search templates by name, category, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
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
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
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
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {templates.length === 0 ? 'No templates found' : 'No templates match your filters'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {templates.length === 0 
                ? 'Create your first WhatsApp message template to start sending notifications to your customers.'
                : 'Try adjusting your search terms or filters to find the templates you\'re looking for.'
              }
            </p>
            {templates.length === 0 && (
              <Link href="/protected/templates/new">
                <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Template
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleTemplateClick(template)}
              >
                {/* Template Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
                        {template.category_icon}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg truncate max-w-[200px]" title={template.name}>
                        {template.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {template.category} • {template.language}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(template.status, template.status_color)}
                </div>

                {/* Template Preview */}
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {getPreviewText(template.formatted_components)}
                  </p>
                </div>

                {/* Template Components Info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  {template.formatted_components.header && (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Header
                    </span>
                  )}
                  {template.formatted_components.body && (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Body
                    </span>
                  )}
                  {template.formatted_components.footer && (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      Footer
                    </span>
                  )}
                  {template.formatted_components.buttons.length > 0 && (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      {template.formatted_components.buttons.length} Button{template.formatted_components.buttons.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Template Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(template.updated_at)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateClick(template);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
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