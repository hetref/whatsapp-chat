import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { getOrCreateUser } from '@/lib/user-sync';

export const runtime = 'nodejs';

function generateWebhookToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * POST /api/settings/embedded-signup
 * Handles completion of Meta WhatsApp Embedded Signup:
 * 1. Exchanges auth code for permanent System User token via Meta Graph API
 * 2. Subscribes WABA to app's webhooks (/subscribed_apps)
 * 3. Retrieves phone number metadata (display phone number, verified name)
 * 4. Persists everything in UserSettings (compatible with manual method)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { code, waba_id, phone_number_id, access_token } = body;

    let resolvedAccessToken = access_token;

    // 1. If authorization code is provided, exchange it for access token
    if (code && !resolvedAccessToken) {
      const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1825841578150241';
      const appSecret = process.env.META_APP_SECRET;

      if (!appSecret) {
        return NextResponse.json(
          {
            error: 'META_APP_SECRET is not configured on the server. Please add it to your environment variables.',
          },
          { status: 400 }
        );
      }

      console.log(`[Embedded Signup] Exchanging code for access token with Meta App ${appId}...`);

      const tokenUrl = new URL('https://graph.facebook.com/v23.0/oauth/access_token');
      tokenUrl.searchParams.set('client_id', appId);
      tokenUrl.searchParams.set('client_secret', appSecret);
      tokenUrl.searchParams.set('code', code);
      if (body.redirect_uri) {
        tokenUrl.searchParams.set('redirect_uri', body.redirect_uri);
      }

      let tokenResponse = await fetch(tokenUrl.toString(), {
        method: 'GET',
      });

      let tokenData = await tokenResponse.json();

      // If token exchange failed and redirect_uri was provided, retry without redirect_uri
      if ((!tokenResponse.ok || !tokenData.access_token) && body.redirect_uri) {
        console.log('[Embedded Signup] Retrying token exchange without redirect_uri...');
        tokenUrl.searchParams.delete('redirect_uri');
        const retryRes = await fetch(tokenUrl.toString(), { method: 'GET' });
        const retryData = await retryRes.json();
        if (retryRes.ok && retryData.access_token) {
          tokenResponse = retryRes;
          tokenData = retryData;
        }
      }

      // If token exchange failed and no redirect_uri was provided, try with standard redirect_uri
      if (!tokenResponse.ok || !tokenData.access_token) {
        const originFallback = request.nextUrl.origin || 'http://localhost:3000';
        const fallbackRedirect = `${originFallback}/protected/setup`;
        console.log('[Embedded Signup] Retrying token exchange with fallback redirect_uri:', fallbackRedirect);
        tokenUrl.searchParams.set('redirect_uri', fallbackRedirect);
        const retryRes = await fetch(tokenUrl.toString(), { method: 'GET' });
        const retryData = await retryRes.json();
        if (retryRes.ok && retryData.access_token) {
          tokenResponse = retryRes;
          tokenData = retryData;
        }
      }

      if (!tokenResponse.ok || !tokenData.access_token) {
        console.error('[Embedded Signup] Token exchange error:', tokenData);
        return NextResponse.json(
          {
            error: tokenData.error?.message || 'Failed to exchange authorization code with Meta',
            meta_error: tokenData.error,
          },
          { status: 400 }
        );
      }

      resolvedAccessToken = tokenData.access_token;
      console.log('[Embedded Signup] Access token received successfully');
    }

    // 1.2 If no access token and no code in request, check if user settings in database already has an access token
    if (!resolvedAccessToken && !code) {
      const existing = await prisma.userSettings.findUnique({
        where: { id: userId },
        select: { accessToken: true, businessAccountId: true, phoneNumberId: true },
      });
      if (existing?.accessToken) {
        resolvedAccessToken = existing.accessToken;
        if (!waba_id && existing.businessAccountId) {
          waba_id = existing.businessAccountId;
        }
        if (!phone_number_id && existing.phoneNumberId) {
          phone_number_id = existing.phoneNumberId;
        }
        console.log('[Embedded Signup] Using existing access token from database for user:', userId);
      }
    }

    if (!resolvedAccessToken) {
      return NextResponse.json(
        { error: 'Neither valid access token nor exchangeable authorization code was provided' },
        { status: 400 }
      );
    }

    let displayPhoneNumber: string | null = null;
    let verifiedName: string | null = null;

    // 1.5 Auto-discover waba_id if not passed in request body
    if (!waba_id && resolvedAccessToken) {
      try {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1825841578150241';
        const appSecret = process.env.META_APP_SECRET;
        if (appSecret) {
          const debugUrl = `https://graph.facebook.com/v23.0/debug_token?input_token=${resolvedAccessToken}&access_token=${appId}|${appSecret}`;
          const debugRes = await fetch(debugUrl);
          const debugData = await debugRes.json();
          const granularScopes = debugData.data?.granular_scopes;
          if (Array.isArray(granularScopes)) {
            const wabaScope = granularScopes.find(
              (s: { scope: string; target_ids?: string[] }) =>
                s.scope === 'whatsapp_business_management' && s.target_ids && s.target_ids.length > 0
            );
            if (wabaScope?.target_ids?.[0]) {
              waba_id = wabaScope.target_ids[0];
              console.log('[Embedded Signup] Discovered WABA ID via debug_token:', waba_id);
            }
          }
        }
      } catch (debugErr) {
        console.warn('[Embedded Signup] Error discovering WABA via debug_token:', debugErr);
      }

      if (!waba_id) {
        try {
          const meWabaRes = await fetch(
            `https://graph.facebook.com/v23.0/me/whatsapp_business_accounts`,
            {
              headers: { Authorization: `Bearer ${resolvedAccessToken}` },
            }
          );
          const meWabaData = await meWabaRes.json();
          if (meWabaData.data && meWabaData.data.length > 0) {
            waba_id = meWabaData.data[0].id;
            console.log('[Embedded Signup] Discovered WABA ID via /me/whatsapp_business_accounts:', waba_id);
          }
        } catch (err) {
          console.warn('[Embedded Signup] Error querying /me/whatsapp_business_accounts:', err);
        }
      }
    }

    // 2. Subscribe WABA to webhooks if waba_id is available
    if (waba_id) {
      try {
        console.log(`[Embedded Signup] Subscribing WABA ${waba_id} to app webhooks with subscribed_fields=messages...`);
        const subUrl = new URL(`https://graph.facebook.com/v23.0/${waba_id}/subscribed_apps`);
        subUrl.searchParams.set('subscribed_fields', 'messages,message_template_status_update');
        const subResponse = await fetch(subUrl.toString(), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resolvedAccessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            subscribed_fields: 'messages,message_template_status_update',
          }),
        });
        const subData = await subResponse.json();
        console.log('[Embedded Signup] WABA webhook subscription response:', subData);
      } catch (subErr) {
        console.warn('[Embedded Signup] Error subscribing WABA to webhooks:', subErr);
      }
    }

    // 3. Query phone number details if phone_number_id is provided, or discover via WABA
    if (phone_number_id) {
      try {
        const phoneRes = await fetch(
          `https://graph.facebook.com/v23.0/${phone_number_id}?fields=display_phone_number,verified_name`,
          {
            headers: {
              Authorization: `Bearer ${resolvedAccessToken}`,
            },
          }
        );
        const phoneData = await phoneRes.json();
        if (phoneData.display_phone_number) {
          displayPhoneNumber = phoneData.display_phone_number;
        }
        if (phoneData.verified_name) {
          verifiedName = phoneData.verified_name;
        }
      } catch (phoneErr) {
        console.warn('[Embedded Signup] Error querying phone details:', phoneErr);
      }
    } else if (waba_id) {
      // Fallback: list phone numbers under WABA
      try {
        console.log(`[Embedded Signup] Querying phone numbers for WABA ${waba_id}...`);
        const phonesRes = await fetch(
          `https://graph.facebook.com/v23.0/${waba_id}/phone_numbers?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating`,
          {
            headers: {
              Authorization: `Bearer ${resolvedAccessToken}`,
            },
          }
        );
        const phonesData = await phonesRes.json();
        console.log('[Embedded Signup] Phone numbers query result:', JSON.stringify(phonesData));
        if (phonesData.data && phonesData.data.length > 0) {
          const firstPhone = phonesData.data[0];
          phone_number_id = firstPhone.id;
          displayPhoneNumber = firstPhone.display_phone_number || null;
          verifiedName = firstPhone.verified_name || null;
          console.log('[Embedded Signup] Discovered phone_number_id:', phone_number_id, 'display:', displayPhoneNumber);
        }
      } catch (phonesErr) {
        console.warn('[Embedded Signup] Error discovering phone numbers:', phonesErr);
      }
    }

    // 4. Ensure platform user exists
    await getOrCreateUser(userId);

    // 5. Update or create user settings
    const existingSettings = await prisma.userSettings.findUnique({
      where: { id: userId },
    });

    const webhookToken = existingSettings?.webhookToken || generateWebhookToken();

    const savedSettings = await prisma.userSettings.upsert({
      where: { id: userId },
      update: {
        accessToken: resolvedAccessToken,
        accessTokenAdded: true,
        phoneNumberId: phone_number_id || existingSettings?.phoneNumberId || null,
        businessAccountId: waba_id || existingSettings?.businessAccountId || null,
        phoneNumber: displayPhoneNumber || existingSettings?.phoneNumber || null,
        fullName: verifiedName || existingSettings?.fullName || null,
        webhookVerified: true,
        apiVersion: 'v23.0',
        webhookToken: webhookToken,
        updatedAt: new Date(),
      },
      create: {
        id: userId,
        accessToken: resolvedAccessToken,
        accessTokenAdded: true,
        phoneNumberId: phone_number_id || null,
        businessAccountId: waba_id || null,
        phoneNumber: displayPhoneNumber || null,
        fullName: verifiedName || null,
        webhookVerified: true,
        apiVersion: 'v23.0',
        webhookToken: webhookToken,
      },
    });

    console.log('[Embedded Signup] WhatsApp account successfully connected for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp connected successfully via Embedded Signup',
      settings: {
        access_token_added: savedSettings.accessTokenAdded,
        webhook_verified: savedSettings.webhookVerified,
        api_version: savedSettings.apiVersion,
        phone_number: savedSettings.phoneNumber,
        full_name: savedSettings.fullName,
        has_access_token: !!savedSettings.accessToken,
        has_phone_number_id: !!savedSettings.phoneNumberId,
        has_business_account_id: !!savedSettings.businessAccountId,
        has_verify_token: !!savedSettings.verifyToken,
        webhook_token: savedSettings.webhookToken,
        access_token: savedSettings.accessToken,
        phone_number_id: savedSettings.phoneNumberId,
        business_account_id: savedSettings.businessAccountId,
        verify_token: savedSettings.verifyToken,
      },
    });
  } catch (error: unknown) {
    console.error('[Embedded Signup] Error processing embedded signup:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
