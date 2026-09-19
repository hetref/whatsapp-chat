import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

/**
 * POST /api/settings/subscribe-webhooks
 * Subscribes the user's WhatsApp Business Account (WABA) to webhook events
 * and configures the Meta App's webhook subscriptions.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accessToken: true,
        businessAccountId: true,
        phoneNumberId: true,
        apiVersion: true,
        verifyToken: true,
        webhookToken: true,
      },
    });

    if (!settings || !settings.accessToken) {
      return NextResponse.json(
        { error: 'WhatsApp Access Token is not configured. Please complete setup first.' },
        { status: 400 }
      );
    }

    if (!settings.businessAccountId) {
      return NextResponse.json(
        { error: 'WhatsApp Business Account ID (WABA ID) is not configured.' },
        { status: 400 }
      );
    }

    // Ensure webhookToken exists as a non-null string
    let webhookToken = settings.webhookToken;
    if (!webhookToken) {
      webhookToken = randomBytes(32).toString('hex');
      await prisma.userSettings.update({
        where: { id: userId },
        data: { webhookToken },
      });
    }

    const apiVersion = settings.apiVersion || 'v23.0';
    const wabaId = settings.businessAccountId;
    const origin = request.nextUrl.origin || 'https://lr1.aryanshinde.in';
    const targetWebhookUrl = `${origin}/api/webhook/${webhookToken}`;
    const effectiveVerifyToken: string =
      settings.verifyToken || process.env.VERIFY_TOKEN || webhookToken;

    console.log(`[Subscribe Webhooks] Subscribing WABA ${wabaId} to messages...`);

    // 1. Subscribe WABA to webhook fields: messages, message_template_status_update
    const subUrl = new URL(`https://graph.facebook.com/${apiVersion}/${wabaId}/subscribed_apps`);
    subUrl.searchParams.set('subscribed_fields', 'messages,message_template_status_update');

    const wabaParams = new URLSearchParams();
    wabaParams.set('subscribed_fields', 'messages,message_template_status_update');

    const subResponse = await fetch(subUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: wabaParams,
    });

    let subData: Record<string, unknown> = {};
    try {
      subData = await subResponse.json();
    } catch {
      subData = { status: subResponse.status, statusText: subResponse.statusText };
    }
    console.log('[Subscribe Webhooks] WABA subscription response:', subData);

    // 2. Query subscribed apps on WABA to verify active subscription
    let currentSubscriptions: Record<string, unknown> | null = null;
    try {
      const getResponse = await fetch(
        `https://graph.facebook.com/${apiVersion}/${wabaId}/subscribed_apps`,
        {
          headers: {
            Authorization: `Bearer ${settings.accessToken}`,
          },
        }
      );
      currentSubscriptions = await getResponse.json();
    } catch (queryErr) {
      console.warn('[Subscribe Webhooks] Error querying WABA subscriptions:', queryErr);
    }

    // 3. Attempt to configure Meta App Webhook Subscription to point to current domain
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1825841578150241';
    const appSecret = process.env.META_APP_SECRET || '';
    let appSubscriptionResult: Record<string, unknown> | null = null;
    let currentAppWebhooks: { data?: Array<{ object?: string; callback_url?: string }> } | null = null;

    if (appId && appSecret) {
      try {
        console.log(`[Subscribe Webhooks] Setting App ${appId} webhook to ${targetWebhookUrl}...`);
        const appSubParams = new URLSearchParams();
        appSubParams.set('object', 'whatsapp_business_account');
        appSubParams.set('callback_url', targetWebhookUrl);
        appSubParams.set('fields', 'messages,message_template_status_update');
        appSubParams.set('verify_token', effectiveVerifyToken);
        appSubParams.set('access_token', `${appId}|${appSecret}`);

        const appSubRes = await fetch(
          `https://graph.facebook.com/${apiVersion}/${appId}/subscriptions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: appSubParams,
          }
        );

        try {
          appSubscriptionResult = await appSubRes.json();
        } catch {
          appSubscriptionResult = { status: appSubRes.status, statusText: appSubRes.statusText };
        }
        console.log('[Subscribe Webhooks] Meta App Subscriptions update result:', appSubscriptionResult);
      } catch (appErr) {
        console.warn('[Subscribe Webhooks] Error updating app subscriptions via API:', appErr);
      }

      // Query current App-level subscriptions
      try {
        const queryAppSub = await fetch(
          `https://graph.facebook.com/${apiVersion}/${appId}/subscriptions?access_token=${appId}|${appSecret}`
        );
        currentAppWebhooks = await queryAppSub.json();
        console.log('[Subscribe Webhooks] Current Meta App Webhooks config:', JSON.stringify(currentAppWebhooks));
      } catch (queryAppErr) {
        console.warn('[Subscribe Webhooks] Error querying app subscriptions:', queryAppErr);
      }
    }

    // Mark webhook verified if WABA or App subscription returned success
    const wabaSuccess = subResponse.ok && (subData.success === true || !!subData.data);
    const appSuccess = appSubscriptionResult?.success === true;

    if (wabaSuccess || appSuccess) {
      await prisma.userSettings.update({
        where: { id: userId },
        data: {
          webhookVerified: true,
          updatedAt: new Date(),
        },
      });
    }

    // Find configured callback URL from Meta's App config
    const whatsappAppConfig = Array.isArray(currentAppWebhooks?.data)
      ? currentAppWebhooks.data.find(
          (item) => item?.object === 'whatsapp_business_account'
        )
      : null;
    const metaConfiguredUrl = whatsappAppConfig?.callback_url || null;

    let isUrlMatchingCurrentDomain = false;
    try {
      if (metaConfiguredUrl) {
        const hostName = new URL(origin).host;
        isUrlMatchingCurrentDomain = metaConfiguredUrl.includes(hostName);
      }
    } catch {
      isUrlMatchingCurrentDomain = false;
    }

    return NextResponse.json({
      success: wabaSuccess || appSuccess,
      message: 'WhatsApp Webhook synchronization completed',
      waba_subscription: subData,
      app_subscription: appSubscriptionResult,
      meta_configured_url: metaConfiguredUrl,
      current_domain_url: targetWebhookUrl,
      url_matches_active_domain: isUrlMatchingCurrentDomain,
      verify_token_to_use: effectiveVerifyToken,
      current_waba_subscriptions: currentSubscriptions,
      current_app_subscriptions: currentAppWebhooks,
    });
  } catch (error: unknown) {
    console.error('[Subscribe Webhooks] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
