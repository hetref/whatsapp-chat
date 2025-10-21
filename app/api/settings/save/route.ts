import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

/**
 * Generate a unique webhook token
 */
function generateWebhookToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * POST handler for saving user settings (access token, webhook config, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      access_token,
      phone_number_id,
      business_account_id,
      api_version,
      verify_token,
    } = body;

    // Validate that at least one field is being updated
    if (!access_token && !phone_number_id && !business_account_id && !api_version && !verify_token) {
      return NextResponse.json(
        { error: 'At least one setting must be provided' },
        { status: 400 }
      );
    }

    // Build the update object
    const updateData: {
      updated_at: string;
      access_token?: string;
      access_token_added?: boolean;
      phone_number_id?: string;
      business_account_id?: string;
      verify_token?: string;
      api_version?: string;
      webhook_verified?: boolean;
      webhook_token?: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (access_token !== undefined) {
      updateData.access_token = access_token;
      updateData.access_token_added = !!access_token;
    }

    if (phone_number_id !== undefined) {
      updateData.phone_number_id = phone_number_id;
    }

    if (business_account_id !== undefined) {
      updateData.business_account_id = business_account_id;
    }

    if (api_version !== undefined) {
      updateData.api_version = api_version || 'v23.0';
    }

    if (verify_token !== undefined) {
      updateData.verify_token = verify_token;
    }

    console.log('Updating user settings for user:', user.id);

    // Check if user settings exist
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('id, webhook_token')
      .eq('id', user.id)
      .single();

    let result;
    if (existingSettings) {
      // Generate webhook token if it doesn't exist
      if (!existingSettings.webhook_token) {
        updateData.webhook_token = generateWebhookToken();
        console.log('Generated new webhook token for user:', user.id);
      }
      
      // Update existing settings
      result = await supabase
        .from('user_settings')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();
    } else {
      // Insert new settings with a webhook token
      const webhookToken = generateWebhookToken();
      console.log('Generated webhook token for new user settings:', user.id);
      
      result = await supabase
        .from('user_settings')
        .insert([{
          id: user.id,
          webhook_token: webhookToken,
          ...updateData,
        }])
        .select()
        .single();
    }

    const { data: settings, error: dbError } = result;

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save settings', details: dbError.message },
        { status: 500 }
      );
    }

    console.log('Settings saved successfully for user:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: {
        access_token_added: settings.access_token_added,
        webhook_verified: settings.webhook_verified,
        api_version: settings.api_version,
        has_phone_number_id: !!settings.phone_number_id,
        has_business_account_id: !!settings.business_account_id,
        has_verify_token: !!settings.verify_token,
        webhook_token: settings.webhook_token,
        // Include actual values for display in setup page
        access_token: settings.access_token,
        phone_number_id: settings.phone_number_id,
        business_account_id: settings.business_account_id,
        verify_token: settings.verify_token,
      },
    });

  } catch (error) {
    console.error('Error in save settings API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

/**
 * GET handler for retrieving user settings
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

    // Fetch user settings
    const { data: settings, error: dbError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', user.id)
      .single();

    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    let updatedSettings = settings;
    
    // If no settings exist at all, create them with a webhook token
    if (!settings || dbError?.code === 'PGRST116') {
      const webhookToken = generateWebhookToken();
      console.log('Creating initial settings with webhook token for new user:', user.id);
      
      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert([{
          id: user.id,
          webhook_token: webhookToken,
          api_version: 'v23.0'
        }])
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating settings:', insertError);
      } else {
        updatedSettings = newSettings;
      }
    }
    // If settings exist but no webhook token, generate one
    else if (settings && !settings.webhook_token) {
      const webhookToken = generateWebhookToken();
      const { data: updated } = await supabase
        .from('user_settings')
        .update({ webhook_token: webhookToken })
        .eq('id', user.id)
        .select()
        .single();
      
      if (updated) {
        updatedSettings = updated;
        console.log('Generated webhook token for existing user:', user.id);
      }
    }

    // Return settings (or null if not found)
    return NextResponse.json({
      settings: updatedSettings ? {
        access_token_added: updatedSettings.access_token_added,
        webhook_verified: updatedSettings.webhook_verified,
        api_version: updatedSettings.api_version,
        phone_number: updatedSettings.phone_number,
        full_name: updatedSettings.full_name,
        has_access_token: !!updatedSettings.access_token,
        has_phone_number_id: !!updatedSettings.phone_number_id,
        has_business_account_id: !!updatedSettings.business_account_id,
        has_verify_token: !!updatedSettings.verify_token,
        webhook_token: updatedSettings.webhook_token,
        // Include actual values for display in setup page
        access_token: updatedSettings.access_token,
        phone_number_id: updatedSettings.phone_number_id,
        business_account_id: updatedSettings.business_account_id,
        verify_token: updatedSettings.verify_token,
        created_at: updatedSettings.created_at,
        updated_at: updatedSettings.updated_at,
      } : null,
    });

  } catch (error) {
    console.error('Error in get settings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

