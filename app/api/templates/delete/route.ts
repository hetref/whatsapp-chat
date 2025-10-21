import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface DeleteTemplateRequest {
  templateId: string;
  templateName: string;
}

/**
 * DELETE handler for deleting message templates
 * Now uses user-specific credentials from database
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify user authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
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
    const { templateId, templateName }: DeleteTemplateRequest = await request.json();

    if (!templateId || !templateName) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Missing required fields', 
          message: 'templateId and templateName are required' 
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Attempting to delete template: ${templateName} (ID: ${templateId})`);

    // Delete template from Meta Business API
    const apiUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;
    const deleteParams = new URLSearchParams({
      name: templateName
    });

    const response = await fetch(`${apiUrl}?${deleteParams.toString()}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Failed to delete template from Meta API:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
        templateId,
        templateName
      });

      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to delete template', 
          details: responseData,
          status: response.status,
          templateId,
          templateName
        }), 
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Template deleted successfully: ${templateName} (ID: ${templateId})`);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
      templateId,
      templateName,
      data: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in delete template API:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 