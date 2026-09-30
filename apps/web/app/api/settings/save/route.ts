import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { getOrCreateUser } from '@/lib/user-sync';
import {
  checkInternalWhatsAppConflict,
  transferWhatsAppAccount,
} from '@/lib/whatsapp-conflict';

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
      force_transfer,
      forceTransfer,
    } = body;

    const isForceTransfer = !!(force_transfer || forceTransfer);

    // Validate that at least one field is being updated
    if (!access_token && !phone_number_id && !business_account_id && !api_version && !verify_token) {
      return NextResponse.json(
        { error: 'At least one setting must be provided' },
        { status: 400 }
      );
    }

    // 0. Account Conflict Verification: ensure 1:1 account connection
    if (phone_number_id || business_account_id) {
      const conflict = await checkInternalWhatsAppConflict({
        currentUserId: userId,
        phoneNumberId: phone_number_id,
        businessAccountId: business_account_id,
      });

      if (conflict.hasConflict && conflict.existingUser) {
        if (!isForceTransfer) {
          console.warn(`[Settings Save] 409 Conflict: ${phone_number_id || business_account_id} already linked to user ${conflict.existingUser.id}`);
          return NextResponse.json(
            {
              conflict: true,
              code: 'ACCOUNT_ALREADY_CONNECTED',
              error: conflict.message || 'This WhatsApp account is already connected to another WaChat workspace.',
              message: conflict.message,
              conflictDetails: conflict,
            },
            { status: 409 }
          );
        }

        // If force transfer was explicitly confirmed by the user, gracefully unlink previous user
        await transferWhatsAppAccount({
          previousUserId: conflict.existingUser.id,
          newUserId: userId,
          reason: 'User confirmed transfer in Manual Setup',
        });
      }
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

    // Check if user settings exist
    const existingSettings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        id: true,
        webhookToken: true,
        accessToken: true,
        phoneNumberId: true,
        businessAccountId: true,
        apiVersion: true,
      },
    });

    // Auto-resolve businessAccountId if not provided and not yet stored
    const effectiveToken = updateData.accessToken || existingSettings?.accessToken;
    const effectivePhoneId = updateData.phoneNumberId || existingSettings?.phoneNumberId;
    const effectiveApiVersion = updateData.apiVersion || existingSettings?.apiVersion || 'v23.0';

    if (!updateData.businessAccountId && !existingSettings?.businessAccountId && effectiveToken && effectivePhoneId) {
      let resolvedWabaId: string | null = null;
      try {
        const phoneLookupRes = await fetch(
          `https://graph.facebook.com/${effectiveApiVersion}/${effectivePhoneId}?fields=whatsapp_business_account`,
          { headers: { Authorization: `Bearer ${effectiveToken}` } }
        );
        if (phoneLookupRes.ok) {
          const phoneLookup = await phoneLookupRes.json();
          if (phoneLookup?.whatsapp_business_account?.id) {
            resolvedWabaId = String(phoneLookup.whatsapp_business_account.id);
          }
        }
      } catch (e) {
        console.warn('[Settings POST] Method A WABA discovery error:', e);
      }

      if (!resolvedWabaId) {
        try {
          const debugRes = await fetch(
            `https://graph.facebook.com/${effectiveApiVersion}/debug_token?input_token=${effectiveToken}&access_token=${effectiveToken}`
          );
          if (debugRes.ok) {
            const debugData = await debugRes.json();
            const scopes = debugData?.data?.granular_scopes || [];
            const wabaScope = scopes.find(
              (s: any) => s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging'
            );
            if (wabaScope?.target_ids?.[0]) {
              resolvedWabaId = String(wabaScope.target_ids[0]);
            }
          }
        } catch (e) {
          console.warn('[Settings POST] Method B WABA discovery error:', e);
        }
      }

      if (resolvedWabaId) {
        updateData.businessAccountId = resolvedWabaId;
      }
    }

    let result;
    if (existingSettings) {
      // Generate webhook token if it doesn't exist
      if (!existingSettings.webhookToken) {
        updateData.webhookToken = generateWebhookToken();
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

      // Ensure user exists in DB with email + name from Clerk
      await getOrCreateUser(userId);

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

    // If businessAccountId and accessToken are present, ensure WABA is subscribed to webhooks for messages
    if (settings.businessAccountId && settings.accessToken) {
      try {
        const apiVersion = settings.apiVersion || 'v23.0';
        const subUrl = new URL(`https://graph.facebook.com/${apiVersion}/${settings.businessAccountId}/subscribed_apps`);
        subUrl.searchParams.set('subscribed_fields', 'messages,message_template_status_update');
        fetch(subUrl.toString(), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            subscribed_fields: 'messages,message_template_status_update',
          }),
        }).catch((err) => console.warn('[Settings POST] Error subscribing WABA to messages:', err));

        // Also ensure Meta App webhook subscription points to current domain and user's webhook token
        const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1825841578150241';
        const appSecret = process.env.META_APP_SECRET || '';
        if (appId && appSecret && settings.webhookToken) {
          const origin = request.nextUrl.origin || 'https://www.wachat.tech';
          const targetWebhookUrl = `${origin}/api/webhook/${settings.webhookToken}`;
          const effectiveVerifyToken: string =
            settings.verifyToken || process.env.VERIFY_TOKEN || settings.webhookToken || 'default_verify_token';

          const appSubParams = new URLSearchParams();
          appSubParams.set('object', 'whatsapp_business_account');
          appSubParams.set('callback_url', targetWebhookUrl);
          appSubParams.set('fields', 'messages,message_template_status_update');
          appSubParams.set('verify_token', effectiveVerifyToken);
          appSubParams.set('access_token', `${appId}|${appSecret}`);

          fetch(`https://graph.facebook.com/${apiVersion}/${appId}/subscriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: appSubParams,
          }).catch((appErr) => console.warn('[Settings POST] Error updating Meta App webhook:', appErr));
        }
      } catch (subErr) {
        console.warn('[Settings POST] Error in subscribed_apps fetch:', subErr);
      }
    }

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

  } catch (error: unknown) {
    console.error('Error in save settings API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
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

    // If no settings exist at all, create them with a webhook token
    if (!settings) {
      const webhookToken = generateWebhookToken();

      try {
        // Ensure user exists in DB with email + name from Clerk
        await getOrCreateUser(userId);

        settings = await prisma.userSettings.create({
          data: {
            id: userId,
            webhookToken: webhookToken,
            apiVersion: 'v23.0'
          }
        });
      } catch (insertError: unknown) {
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
      } catch (updateError: unknown) {
        console.error('Error updating webhook token:', updateError);
      }
    }

    // If settings has businessAccountId and accessToken, but no phoneNumberId (or set to businessAccountId), auto-discover from Meta
    const isPhoneIdInvalidOrMissing = !settings?.phoneNumberId || !String(settings.phoneNumberId).trim() || settings.phoneNumberId === settings.businessAccountId;
    if (settings && settings.businessAccountId && settings.accessToken && isPhoneIdInvalidOrMissing) {
      try {
        const phoneRes = await fetch(
          `https://graph.facebook.com/${settings.apiVersion || 'v23.0'}/${settings.businessAccountId}/phone_numbers?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating`,
          {
            headers: {
              Authorization: `Bearer ${settings.accessToken}`,
            },
          }
        );
        const phoneData = await phoneRes.json();
        if (phoneData.data && phoneData.data.length > 0) {
          const firstPhone = phoneData.data[0];
          settings = await prisma.userSettings.update({
            where: { id: userId },
            data: {
              phoneNumberId: firstPhone.id,
              phoneNumber: firstPhone.display_phone_number || null,
              fullName: firstPhone.verified_name || null,
              updatedAt: new Date(),
            },
          });
        }
      } catch (phoneErr) {
        console.warn('[Settings GET] Error discovering phone numbers:', phoneErr);
      }
    }

    // If settings has phoneNumberId and accessToken, but no businessAccountId, auto-discover WABA from Meta
    const isWabaMissing = !settings?.businessAccountId || !String(settings.businessAccountId).trim();
    if (settings && settings.phoneNumberId && settings.accessToken && isWabaMissing) {
      try {
        let resolvedWabaId: string | null = null;
        const apiVer = settings.apiVersion || 'v23.0';

        // Method A: Phone lookup
        try {
          const phoneLookupRes = await fetch(
            `https://graph.facebook.com/${apiVer}/${settings.phoneNumberId}?fields=whatsapp_business_account`,
            { headers: { Authorization: `Bearer ${settings.accessToken}` } }
          );
          if (phoneLookupRes.ok) {
            const phoneLookup = await phoneLookupRes.json();
            if (phoneLookup?.whatsapp_business_account?.id) {
              resolvedWabaId = String(phoneLookup.whatsapp_business_account.id);
            }
          }
        } catch (e) {
          console.warn('[Settings GET] Method A WABA discovery:', e);
        }

        // Method B: Debug token
        if (!resolvedWabaId) {
          try {
            const debugRes = await fetch(
              `https://graph.facebook.com/${apiVer}/debug_token?input_token=${settings.accessToken}&access_token=${settings.accessToken}`
            );
            if (debugRes.ok) {
              const debugData = await debugRes.json();
              const scopes = debugData?.data?.granular_scopes || [];
              const wabaScope = scopes.find(
                (s: any) => s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging'
              );
              if (wabaScope?.target_ids?.[0]) {
                resolvedWabaId = String(wabaScope.target_ids[0]);
              }
            }
          } catch (e) {
            console.warn('[Settings GET] Method B WABA discovery:', e);
          }
        }

        if (resolvedWabaId) {
          settings = await prisma.userSettings.update({
            where: { id: userId },
            data: {
              businessAccountId: resolvedWabaId,
              updatedAt: new Date(),
            },
          });
        }
      } catch (wabaErr) {
        console.warn('[Settings GET] Error discovering WABA ID:', wabaErr);
      }
    }

    // If settings has businessAccountId and accessToken, ensure WABA is subscribed to messages
    if (settings && settings.businessAccountId && settings.accessToken) {
      try {
        const subUrl = new URL(`https://graph.facebook.com/${settings.apiVersion || 'v23.0'}/${settings.businessAccountId}/subscribed_apps`);
        subUrl.searchParams.set('subscribed_fields', 'messages,message_template_status_update');
        fetch(subUrl.toString(), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            subscribed_fields: 'messages,message_template_status_update',
          }),
        }).catch((err) => console.warn('[Settings GET] Error subscribing WABA to messages:', err));
      } catch (subErr) {
        console.warn('[Settings GET] Error in subscribed_apps fetch:', subErr);
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

  } catch (error: unknown) {
    console.error('Unexpected error in save settings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

