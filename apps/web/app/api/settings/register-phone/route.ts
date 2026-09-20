import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET /api/settings/register-phone
 * Checks the live verification and registration status of the connected phone number with Meta Graph API.
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        phoneNumberId: true,
        businessAccountId: true,
        apiVersion: true,
      },
    });

    if (!settings?.accessToken || !settings.phoneNumberId) {
      return NextResponse.json(
        { error: 'WhatsApp Access Token and Phone Number ID must be configured.' },
        { status: 400 }
      );
    }

    const apiVersion = settings.apiVersion || 'v23.0';
    const metaUrl = `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,status,name_status,is_pin_enabled,is_official_business_account`;

    const metaRes = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${settings.accessToken}`,
      },
    });

    const data = await metaRes.json();
    if (!metaRes.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || 'Failed to query phone number status from Meta',
          details: data.error,
        },
        { status: metaRes.status || 400 }
      );
    }

    const isConnected = data.status === 'CONNECTED';
    const isVerified = data.code_verification_status === 'VERIFIED';

    return NextResponse.json({
      success: true,
      phone_data: data,
      status: data.status || 'UNKNOWN',
      code_verification_status: data.code_verification_status || 'UNKNOWN',
      is_connected: isConnected,
      is_verified: isVerified,
      display_phone_number: data.display_phone_number,
      verified_name: data.verified_name,
      quality_rating: data.quality_rating,
    });
  } catch (error: unknown) {
    console.error('[Register Phone GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/register-phone
 * Registers the phone number with WhatsApp Cloud API using a 6-digit two-step verification PIN.
 * Resolves Meta Error (#133010) "Account not registered".
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawPin = body.pin ? String(body.pin).trim() : '123456';

    if (!/^\d{6}$/.test(rawPin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 6 digits (e.g. 123456)' },
        { status: 400 }
      );
    }

    const settings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        phoneNumberId: true,
        apiVersion: true,
      },
    });

    if (!settings?.accessToken || !settings.phoneNumberId) {
      return NextResponse.json(
        { error: 'WhatsApp Access Token and Phone Number ID must be configured before registering.' },
        { status: 400 }
      );
    }

    const apiVersion = settings.apiVersion || 'v23.0';
    console.log(`[Register Phone] Registering phone number ${settings.phoneNumberId} with Meta Cloud API using PIN...`);

    const registerRes = await fetch(
      `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}/register`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin: rawPin,
        }),
      }
    );

    const result = await registerRes.json();
    console.log('[Register Phone] Meta registration response:', result);

    if (!registerRes.ok || result.error) {
      const err = result.error || {};
      const subcode = err.error_subcode;
      const userMsg = err.error_user_msg;
      const userTitle = err.error_user_title;

      let errorDetails = userMsg || err.error_data?.details || err.message || 'Registration failed';

      if (subcode === 2388001 || (userTitle && userTitle.includes('Cannot create certificate'))) {
        errorDetails = userMsg || 'This number is registered to an existing WhatsApp account. To use this number with WhatsApp Cloud API, open the WhatsApp or WhatsApp Business app on your phone, go to Settings > Account > Delete my account. Wait 3 minutes, then click Register here again.';
      }

      return NextResponse.json(
        {
          error: errorDetails,
          error_title: userTitle || (subcode === 2388001 ? 'Cannot create certificate' : 'Registration failed'),
          error_subcode: subcode,
          details: err,
          code: err.code,
        },
        { status: registerRes.status || 400 }
      );
    }

    // Fetch updated phone number status
    let updatedPhoneData = null;
    try {
      const queryRes = await fetch(
        `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,status`,
        {
          headers: {
            Authorization: `Bearer ${settings.accessToken}`,
          },
        }
      );
      if (queryRes.ok) {
        updatedPhoneData = await queryRes.json();
      }
    } catch (queryErr) {
      console.warn('[Register Phone] Error querying updated status:', queryErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number registered successfully with WhatsApp Cloud API! You can now send messages.',
      meta_response: result,
      phone_data: updatedPhoneData,
    });
  } catch (error: unknown) {
    console.error('[Register Phone POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/register-phone
 * Attempts to deregister the phone number from WhatsApp Cloud API.
 * Endpoint: POST https://graph.facebook.com/<VERSION>/<PHONE_NUMBER_ID>/deregister
 */
export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        phoneNumberId: true,
        apiVersion: true,
      },
    });

    if (!settings?.accessToken || !settings.phoneNumberId) {
      return NextResponse.json(
        { error: 'WhatsApp Access Token and Phone Number ID must be configured.' },
        { status: 400 }
      );
    }

    const apiVersion = settings.apiVersion || 'v23.0';
    console.log(`[Deregister Phone] Attempting to deregister phone number ${settings.phoneNumberId} with Meta Cloud API...`);

    const deregisterRes = await fetch(
      `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}/deregister`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await deregisterRes.json();
    console.log('[Deregister Phone] Meta deregistration response:', result);

    if (!deregisterRes.ok || result.error) {
      const err = result.error || {};
      return NextResponse.json(
        {
          error: err.error_user_msg || err.error_data?.details || err.message || 'Deregistration failed',
          details: err,
        },
        { status: deregisterRes.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number deregistered successfully from WhatsApp Cloud API.',
      meta_response: result,
    });
  } catch (error: unknown) {
    console.error('[Deregister Phone DELETE] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
