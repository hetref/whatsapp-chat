import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
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
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      console.error('Authentication error: No user ID');
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
      updatedAt: Date;
      accessToken?: string;
      accessTokenAdded?: boolean;
      phoneNumberId?: string;
      businessAccountId?: string;
      verifyToken?: string;
      apiVersion?: string;
      webhookVerified?: boolean;
      webhookToken?: string;
    } = {
      updatedAt: new Date(),
    };

    if (access_token !== undefined) {
      updateData.accessToken = access_token;
      updateData.accessTokenAdded = !!access_token;
    }

    if (phone_number_id !== undefined) {
      updateData.phoneNumberId = phone_number_id;
    }

    if (business_account_id !== undefined) {
      updateData.businessAccountId = business_account_id;
    }

    if (api_version !== undefined) {
      updateData.apiVersion = api_version || 'v23.0';
    }

    if (verify_token !== undefined) {
      updateData.verifyToken = verify_token;
    }

    console.log('Updating user settings for user:', userId);

    // Check if user settings exist
    const existingSettings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: { id: true, webhookToken: true }
    });

    let result;
    if (existingSettings) {
      // Generate webhook token if it doesn't exist
      if (!existingSettings.webhookToken) {
        updateData.webhookToken = generateWebhookToken();
        console.log('Generated new webhook token for user:', userId);
      }
      
      // Update existing settings
      const settings = await prisma.userSettings.update({
        where: { id: userId },
        data: updateData
      });
      result = { data: settings, error: null };
    } else {
      // Insert new settings with a webhook token
      const webhookToken = generateWebhookToken();
      console.log('Generated webhook token for new user settings:', userId);

      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          name: userId,
        },
      });

      const settings = await prisma.userSettings.create({
        data: {
          id: userId,
          webhookToken: webhookToken,
          ...updateData,
        }
      });
      result = { data: settings, error: null };
    }

    const { data: settings, error: dbError } = result;

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save settings', details: String(dbError) },
        { status: 500 }
      );
    }

    console.log('Settings saved successfully for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: {
        access_token_added: settings.accessTokenAdded,
        webhook_verified: settings.webhookVerified,
        api_version: settings.apiVersion,
        has_phone_number_id: !!settings.phoneNumberId,
        has_business_account_id: !!settings.businessAccountId,
        has_verify_token: !!settings.verifyToken,
        webhook_token: settings.webhookToken,
        // Include actual values for display in setup page
        access_token: settings.accessToken,
        phone_number_id: settings.phoneNumberId,
        business_account_id: settings.businessAccountId,
        verify_token: settings.verifyToken,
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
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user settings
    let settings = await prisma.userSettings.findUnique({
      where: { id: userId }
    });
    let dbError = null;

    // If no settings exist at all, create them with a webhook token
    if (!settings) {
      const webhookToken = generateWebhookToken();
      console.log('Creating initial settings with webhook token for new user:', userId);

      try {
        await prisma.user.upsert({
          where: { id: userId },
          update: {},
          create: {
            id: userId,
            name: userId,
          },
        });

        settings = await prisma.userSettings.create({
          data: {
            id: userId,
            webhookToken: webhookToken,
            apiVersion: 'v23.0'
          }
        });
      } catch (insertError) {
        console.error('Error creating settings:', insertError);
        return NextResponse.json(
          { error: 'Failed to create settings' },
          { status: 500 }
        );
      }
    }
    // If settings exist but no webhook token, generate one
    else if (settings && !settings.webhookToken) {
      const webhookToken = generateWebhookToken();
      try {
        settings = await prisma.userSettings.update({
          where: { id: userId },
          data: { webhookToken: webhookToken }
        });
        console.log('Generated webhook token for existing user:', userId);
      } catch (updateError) {
        console.error('Error updating webhook token:', updateError);
      }
    }

    // Return settings (or null if not found)
    return NextResponse.json({
      settings: settings ? {
        access_token_added: settings.accessTokenAdded,
        webhook_verified: settings.webhookVerified,
        api_version: settings.apiVersion,
        phone_number: settings.phoneNumber,
        full_name: settings.fullName,
        has_access_token: !!settings.accessToken,
        has_phone_number_id: !!settings.phoneNumberId,
        has_business_account_id: !!settings.businessAccountId,
        has_verify_token: !!settings.verifyToken,
        webhook_token: settings.webhookToken,
        // Include actual values for display in setup page
        access_token: settings.accessToken,
        phone_number_id: settings.phoneNumberId,
        business_account_id: settings.businessAccountId,
        verify_token: settings.verifyToken,
        created_at: settings.createdAt,
        updated_at: settings.updatedAt,
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

