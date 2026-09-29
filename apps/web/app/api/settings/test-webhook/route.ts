import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * POST /api/settings/test-webhook
 * Performs a comprehensive two-stage diagnostic for WhatsApp webhook delivery:
 * 1. Checks live Meta Graph API configuration (WABA subscribed apps + App callback URL).
 * 2. Dispatches a realistic simulated Meta inbound WhatsApp message directly through the
 *    webhook pipeline and confirms database persistence and user profile attribution.
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
        phoneNumberId: true,
        businessAccountId: true,
        phoneNumber: true,
        webhookToken: true,
        verifyToken: true,
        apiVersion: true,
      },
    });

    if (!settings || !settings.accessToken) {
      return NextResponse.json(
        { error: 'WhatsApp is not connected yet. Please configure your credentials first.' },
        { status: 400 }
      );
    }

    const apiVersion = settings.apiVersion || 'v23.0';
    const origin = request.nextUrl.origin || 'https://www.wachat.tech';
    const targetWebhookUrl = settings.webhookToken
      ? `${origin}/api/webhook/${settings.webhookToken}`
      : `${origin}/api/webhook`;

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 1: Live Meta Graph API Subscription Diagnostics
    // ─────────────────────────────────────────────────────────────────────────────
    let wabaSubscribed = false;
    let wabaSubscribedFields: string[] = [];
    let metaAppCallbackUrl: string | null = null;
    let metaAppFields: string[] = [];
    let metaError: string | null = null;

    // 1.1 Check WABA subscribed apps
    if (settings.businessAccountId) {
      try {
        const wabaRes = await fetch(
          `https://graph.facebook.com/${apiVersion}/${settings.businessAccountId}/subscribed_apps`,
          {
            headers: {
              Authorization: `Bearer ${settings.accessToken}`,
            },
          }
        );
        const wabaData = await wabaRes.json();
        if (Array.isArray(wabaData?.data) && wabaData.data.length > 0) {
          const appEntry = wabaData.data[0];
          wabaSubscribed = true;
          const fields = appEntry?.whatsapp_business_api_data?.subscribed_fields || [];
          wabaSubscribedFields = Array.isArray(fields) ? fields : [];
        } else if (wabaData?.error) {
          metaError = wabaData.error.message || 'Error querying WABA subscriptions';
        }
      } catch (err) {
        console.warn('[Test Webhook] Error checking WABA subscriptions:', err);
      }
    }

    // 1.2 Check Meta App-level Webhook callback URL
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1825841578150241';
    const appSecret = process.env.META_APP_SECRET || '';

    if (appId && appSecret) {
      try {
        const appRes = await fetch(
          `https://graph.facebook.com/${apiVersion}/${appId}/subscriptions?access_token=${appId}|${appSecret}`
        );
        const appData = await appRes.json();
        if (Array.isArray(appData?.data)) {
          const waConfig = appData.data.find(
            (item: { object?: string }) => item?.object === 'whatsapp_business_account'
          );
          if (waConfig) {
            metaAppCallbackUrl = waConfig.callback_url || null;
            metaAppFields = Array.isArray(waConfig.fields)
              ? waConfig.fields.map((f: { name?: string }) => f.name || String(f))
              : [];
          }
        }
      } catch (err) {
        console.warn('[Test Webhook] Error checking App subscriptions:', err);
      }
    }

    let urlMatchesCurrentDomain = false;
    try {
      if (metaAppCallbackUrl) {
        const registeredHost = new URL(metaAppCallbackUrl).host;
        const currentHost = new URL(origin).host;
        urlMatchesCurrentDomain = registeredHost === currentHost;
      }
    } catch {
      urlMatchesCurrentDomain = false;
    }

    // 1.3 Auto-remedy: If Meta App has no registered Webhook, auto-subscribe it now!
    if (appId && appSecret && (!metaAppCallbackUrl || !urlMatchesCurrentDomain)) {
      try {
        const canonicalWebhookUrl = `${origin}/api/webhook`;
        console.log('[Test Webhook] Auto-configuring Meta App Webhook to:', canonicalWebhookUrl);
        const autoSubParams = new URLSearchParams();
        autoSubParams.set('object', 'whatsapp_business_account');
        autoSubParams.set('callback_url', canonicalWebhookUrl);
        autoSubParams.set('fields', 'messages,message_template_status_update');
        autoSubParams.set('verify_token', 'VAsDSKmdFNSDMvsdDOpk');
        autoSubParams.set('access_token', `${appId}|${appSecret}`);

        const autoSubRes = await fetch(
          `https://graph.facebook.com/${apiVersion}/${appId}/subscriptions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: autoSubParams,
          }
        );
        const autoSubData = await autoSubRes.json();
        console.log('[Test Webhook] Auto-configure App Webhook result:', autoSubData);
        if (autoSubData.success) {
          metaAppCallbackUrl = canonicalWebhookUrl;
          metaAppFields = ['messages', 'message_template_status_update'];
          urlMatchesCurrentDomain = true;
          metaError = null;
        } else if (autoSubData.error) {
          metaError = autoSubData.error.message;
        }
      } catch (autoErr) {
        console.warn('[Test Webhook] Error auto-configuring App Webhook:', autoErr);
      }
    }

    // 1.4 Auto-remedy: If WABA is not subscribed, auto-subscribe it now!
    if (settings.businessAccountId && !wabaSubscribed) {
      try {
        console.log('[Test Webhook] Auto-subscribing WABA to messages:', settings.businessAccountId);
        const subUrl = new URL(`https://graph.facebook.com/${apiVersion}/${settings.businessAccountId}/subscribed_apps`);
        subUrl.searchParams.set('subscribed_fields', 'messages,message_template_status_update');
        const subRes = await fetch(subUrl.toString(), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            subscribed_fields: 'messages,message_template_status_update',
          }),
        });
        const subData = await subRes.json();
        console.log('[Test Webhook] Auto-subscribe WABA result:', subData);
        if (subData.success) {
          wabaSubscribed = true;
          wabaSubscribedFields = ['messages', 'message_template_status_update'];
        }
      } catch (subErr) {
        console.warn('[Test Webhook] Error auto-subscribing WABA:', subErr);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 2: End-to-End Inbound Message Simulation
    // ─────────────────────────────────────────────────────────────────────────────
    const testMessageId = `test_msg_${Date.now()}`;
    const testSenderPhone = '15550009999';
    const testSenderName = 'WaChat Webhook Tester';
    const timestampFormatted = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const testPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: settings.businessAccountId || 'test_waba_account',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: settings.phoneNumber || '15550001234',
                  phone_number_id: settings.phoneNumberId || 'test_phone_id',
                },
                contacts: [
                  {
                    profile: {
                      name: testSenderName,
                    },
                    wa_id: testSenderPhone,
                  },
                ],
                messages: [
                  {
                    from: testSenderPhone,
                    id: testMessageId,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: {
                      body: `🧪 Webhook Test: Connection verified at ${timestampFormatted}! Your incoming messages pipeline is active and working properly.`,
                    },
                    type: 'text',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    // Dispatch directly to local webhook handler
    const startTime = Date.now();
    let simulationStatusCode = 0;
    let simulationSuccess = false;

    try {
      const webhookRes = await fetch(targetWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-proxy': '1',
        },
        body: JSON.stringify(testPayload),
      });

      simulationStatusCode = webhookRes.status;
      simulationSuccess = webhookRes.ok;
    } catch (simErr) {
      console.error('[Test Webhook] Simulation dispatch error:', simErr);
      simulationStatusCode = 500;
    }

    const latencyMs = Date.now() - startTime;

    // Verify database record creation under the current user's profile
    let messageSaved = false;
    let contactCreated = false;
    let contactRecord = null;

    try {
      const savedMsg = await prisma.message.findFirst({
        where: {
          id: testMessageId,
          userId: userId,
        },
      });
      messageSaved = !!savedMsg;

      contactRecord = await prisma.contact.findFirst({
        where: {
          userId: userId,
          phoneNumber: testSenderPhone,
        },
      });
      contactCreated = !!contactRecord;
    } catch (dbErr) {
      console.error('[Test Webhook] Database verification error:', dbErr);
    }

    // Mark webhook verified in settings if simulation succeeded
    if (simulationSuccess && messageSaved) {
      await prisma.userSettings.update({
        where: { id: userId },
        data: {
          webhookVerified: true,
          updatedAt: new Date(),
        },
      });
    }

    const overallSuccess = simulationSuccess && messageSaved;

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess
        ? 'Webhook test succeeded! Incoming message was parsed, attributed to your profile, and stored in the database.'
        : 'Webhook simulation completed with warnings. Check the diagnostic report below.',
      stage1_meta: {
        waba_subscribed: wabaSubscribed,
        waba_subscribed_fields: wabaSubscribedFields,
        meta_registered_url: metaAppCallbackUrl,
        meta_registered_fields: metaAppFields,
        current_webhook_url: targetWebhookUrl,
        url_matches_active_domain: urlMatchesCurrentDomain,
        meta_error: metaError,
      },
      stage2_simulation: {
        success: simulationSuccess,
        status_code: simulationStatusCode,
        latency_ms: latencyMs,
        message_saved: messageSaved,
        contact_created: contactCreated,
        contact_id: contactRecord?.id || null,
        test_message_id: testMessageId,
        test_sender: testSenderName,
        delivered_to_user_id: userId,
      },
    });
  } catch (error: unknown) {
    console.error('[Test Webhook] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
