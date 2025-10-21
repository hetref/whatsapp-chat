import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Type definitions for WhatsApp Business API
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
}

interface FormattedComponents {
  header: TemplateComponent | null;
  body: TemplateComponent | null;
  footer: TemplateComponent | null;
  buttons: ButtonComponent[];
}

interface TransformedTemplate extends WhatsAppTemplate {
  created_at: string;
  updated_at: string;
  status_color: string;
  category_icon: string;
  formatted_components: FormattedComponents;
}

/**
 * GET handler for fetching all message templates
 * Now uses user-specific credentials from database
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user's WhatsApp API credentials
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('access_token, business_account_id, api_version, access_token_added')
      .eq('id', user.id)
      .single();

    if (settingsError || !settings) {
      console.error('User settings not found:', settingsError);
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured. Please complete setup.' },
        { status: 400 }
      );
    }

    if (!settings.access_token_added || !settings.access_token || !settings.business_account_id) {
      console.error('WhatsApp API credentials not configured for user:', user.id);
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured. Please complete setup in the Settings page.' },
        { status: 400 }
      );
    }

    const WHATSAPP_ACCESS_TOKEN = settings.access_token;
    const WHATSAPP_BUSINESS_ACCOUNT_ID = settings.business_account_id;
    const WHATSAPP_API_VERSION = settings.api_version || 'v23.0';

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status (APPROVED, PENDING, REJECTED, etc.)
    const limit = searchParams.get('limit') || '50'; // Default limit
    const fields = searchParams.get('fields') || 'id,name,status,category,language,components,previous_category,rejected_reason,quality_score';

    // Build WhatsApp Business API URL
    let apiUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;
    
    // Add query parameters
    const params = new URLSearchParams({
      fields,
      limit,
    });
    
    if (status) {
      params.append('status', status);
    }

    apiUrl += `?${params.toString()}`;

    console.log('Fetching templates from WhatsApp Business API:', apiUrl);

    // Fetch templates from WhatsApp Business API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WhatsApp Business API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to fetch templates', 
          details: errorText,
          status: response.status 
        }), 
        { status: response.status }
      );
    }

    const templatesData = await response.json() as { data: WhatsAppTemplate[]; paging?: Record<string, unknown> };
    
    console.log(`Successfully fetched ${templatesData.data?.length || 0} templates`);

    // Transform the data to include additional metadata for UI
    const transformedTemplates: TransformedTemplate[] = templatesData.data?.map((template: WhatsAppTemplate) => ({
      ...template,
      created_at: new Date().toISOString(), // Meta API doesn't provide creation date
      updated_at: new Date().toISOString(),
      // Add status color for UI
      status_color: getStatusColor(template.status),
      // Add category icon for UI
      category_icon: getCategoryIcon(template.category),
      // Format components for easier display
      formatted_components: formatComponents(template.components),
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedTemplates,
      pagination: templatesData.paging || null,
      total_count: transformedTemplates.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in templates API:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { status: 500 }
    );
  }
}

/**
 * Helper function to get status color for UI
 */
function getStatusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
      return 'text-green-600 bg-green-50';
    case 'PENDING':
      return 'text-yellow-600 bg-yellow-50';
    case 'REJECTED':
      return 'text-red-600 bg-red-50';
    case 'PAUSED':
      return 'text-orange-600 bg-orange-50';
    case 'DISABLED':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

/**
 * Helper function to get category icon for UI
 */
function getCategoryIcon(category: string): string {
  switch (category?.toUpperCase()) {
    case 'MARKETING':
      return '📢';
    case 'UTILITY':
      return '🔧';
    case 'AUTHENTICATION':
      return '🔐';
    default:
      return '📄';
  }
}

/**
 * Helper function to format components for easier display
 */
function formatComponents(components: TemplateComponent[]): FormattedComponents {
  if (!components || !Array.isArray(components)) {
    return {
      header: null,
      body: null,
      footer: null,
      buttons: []
    };
  }

  const formatted: FormattedComponents = {
    header: null,
    body: null,
    footer: null,
    buttons: []
  };

  components.forEach(component => {
    switch (component.type?.toUpperCase()) {
      case 'HEADER':
        formatted.header = component;
        break;
      case 'BODY':
        formatted.body = component;
        break;
      case 'FOOTER':
        formatted.footer = component;
        break;
      case 'BUTTONS':
        formatted.buttons = component.buttons || [];
        break;
    }
  });

  return formatted;
} 