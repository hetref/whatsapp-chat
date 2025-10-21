import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Type definitions for template creation
interface CreateTemplateRequest {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: TemplateComponent[];
  message_send_ttl_seconds?: number;
}

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

/**
 * POST handler for creating new message templates
 * Now uses user-specific credentials from database
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const templateData: CreateTemplateRequest = await request.json();

    // Validate required fields
    if (!templateData.name || !templateData.category || !templateData.language || !templateData.components) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Missing required fields', 
          message: 'name, category, language, and components are required' 
        }), 
        { status: 400 }
      );
    }

    // Validate template name (max 512 characters, lowercase, underscores only)
    if (templateData.name.length > 512) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Invalid template name', 
          message: 'Template name must be 512 characters or less' 
        }), 
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
    if (!validCategories.includes(templateData.category)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Invalid category', 
          message: 'Category must be MARKETING, UTILITY, or AUTHENTICATION' 
        }), 
        { status: 400 }
      );
    }

    // Validate components
    const validationError = validateComponents(templateData.components);
    if (validationError) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Invalid components', 
          message: validationError 
        }), 
        { status: 400 }
      );
    }

    console.log('Creating template:', {
      name: templateData.name,
      category: templateData.category,
      language: templateData.language,
      componentsCount: templateData.components.length
    });

    // Prepare WhatsApp Business API request
    const apiUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;
    
    const requestBody = {
      name: templateData.name,
      category: templateData.category,
      language: templateData.language,
      components: templateData.components,
      ...(templateData.message_send_ttl_seconds && {
        message_send_ttl_seconds: templateData.message_send_ttl_seconds
      })
    };

    // Create template via WhatsApp Business API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('WhatsApp Business API error:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
      });
      
      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to create template', 
          details: responseData,
          status: response.status 
        }), 
        { status: response.status }
      );
    }

    console.log('Template created successfully:', {
      id: responseData.id,
      status: responseData.status,
      category: responseData.category
    });

    return NextResponse.json({
      success: true,
      data: {
        id: responseData.id,
        status: responseData.status,
        category: responseData.category,
        name: templateData.name,
        language: templateData.language,
        components: templateData.components,
      },
      message: 'Template created successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in create template API:', error);
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
 * Extract variables from text (e.g., {{1}}, {{2}})
 */
function extractVariables(text: string): number[] {
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
}

/**
 * Validate template components
 */
function validateComponents(components: TemplateComponent[]): string | null {
  if (!Array.isArray(components) || components.length === 0) {
    return 'Components array is required and cannot be empty';
  }

  let hasBody = false;
  let headerCount = 0;
  let footerCount = 0;
  let buttonsCount = 0;

  for (const component of components) {
    if (!component.type) {
      return 'Component type is required';
    }

    switch (component.type) {
      case 'HEADER':
        headerCount++;
        if (headerCount > 1) {
          return 'Only one HEADER component is allowed';
        }
        if (!component.format) {
          return 'HEADER component requires format field';
        }
        if (component.format === 'TEXT') {
          if (!component.text) {
            return 'TEXT HEADER component requires text field';
          }
          
          // Check for variables and require examples
          const headerVariables = extractVariables(component.text);
          if (headerVariables.length > 0) {
            if (!component.example || !component.example.header_text) {
              return `HEADER contains variables (${headerVariables.map(v => `{{${v}}}`).join(', ')}) but no examples provided. Please provide example values.`;
            }
            if (component.example.header_text.length !== headerVariables.length) {
              return `HEADER has ${headerVariables.length} variable(s) but ${component.example.header_text.length} example(s) provided. They must match.`;
            }
          }
        }
        break;

      case 'BODY':
        hasBody = true;
        if (!component.text) {
          return 'BODY component requires text field';
        }
        if (component.text.length > 1024) {
          return 'BODY text must be 1024 characters or less';
        }
        
        // Check for variables and require examples
        const bodyVariables = extractVariables(component.text);
        if (bodyVariables.length > 0) {
          if (!component.example || !component.example.body_text || !component.example.body_text[0]) {
            return `BODY contains variables (${bodyVariables.map(v => `{{${v}}}`).join(', ')}) but no examples provided. Please provide example values.`;
          }
          if (component.example.body_text[0].length !== bodyVariables.length) {
            return `BODY has ${bodyVariables.length} variable(s) but ${component.example.body_text[0].length} example(s) provided. They must match.`;
          }
        }
        break;

      case 'FOOTER':
        footerCount++;
        if (footerCount > 1) {
          return 'Only one FOOTER component is allowed';
        }
        if (!component.text) {
          return 'FOOTER component requires text field';
        }
        if (component.text.length > 60) {
          return 'FOOTER text must be 60 characters or less';
        }
        
        // Footer typically doesn't support variables, but check anyway
        const footerVariables = extractVariables(component.text);
        if (footerVariables.length > 0) {
          return 'FOOTER component does not support variables. Please remove variables from footer text.';
        }
        break;

      case 'BUTTONS':
        buttonsCount++;
        if (buttonsCount > 1) {
          return 'Only one BUTTONS component is allowed';
        }
        if (!component.buttons || !Array.isArray(component.buttons) || component.buttons.length === 0) {
          return 'BUTTONS component requires buttons array';
        }
        if (component.buttons.length > 10) {
          return 'Maximum 10 buttons are allowed';
        }
        
        // Validate each button
        for (const button of component.buttons) {
          if (!button.type || !button.text) {
            return 'Button type and text are required';
          }
          if (button.text.length > 25) {
            return 'Button text must be 25 characters or less';
          }
          if (button.type === 'URL' && !button.url) {
            return 'URL button requires url field';
          }
          if (button.type === 'PHONE_NUMBER' && !button.phone_number) {
            return 'PHONE_NUMBER button requires phone_number field';
          }
        }
        break;

      default:
        return `Invalid component type: ${component.type}`;
    }
  }

  if (!hasBody) {
    return 'BODY component is required';
  }

  return null;
}

/**
 * GET handler for checking API status (now user-specific)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's WhatsApp API credentials
    const { data: settings } = await supabase
      .from('user_settings')
      .select('access_token_added, api_version')
      .eq('id', user.id)
      .single();

    const isConfigured = settings?.access_token_added || false;
    const apiVersion = settings?.api_version || 'v23.0';
    
    return NextResponse.json({
      status: 'WhatsApp Template Creation API',
      configured: isConfigured,
      version: apiVersion,
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({
      status: 'WhatsApp Template Creation API',
      configured: false,
      error: 'Failed to check configuration',
      timestamp: new Date().toISOString()
    });
  }
} 