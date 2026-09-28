import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  checkInternalWhatsAppConflict,
  checkExternalMetaConflict,
} from '@/lib/whatsapp-conflict';

export const runtime = 'nodejs';

/**
 * POST /api/settings/check-conflict
 * Checks if a phone number ID, WABA ID, or Meta Access Token is already attached to another WaChat user
 * or subscribed to an external third-party Meta App.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      phone_number_id,
      business_account_id,
      phone_number,
      access_token,
      api_version = 'v23.0',
    } = body;

    // 1. Check internal WaChat conflict (another user in our database)
    const internalConflict = await checkInternalWhatsAppConflict({
      currentUserId: userId,
      phoneNumberId: phone_number_id,
      businessAccountId: business_account_id,
      phoneNumber: phone_number,
    });

    if (internalConflict.hasConflict) {
      return NextResponse.json({
        conflict: true,
        code: 'ACCOUNT_ALREADY_CONNECTED',
        type: 'INTERNAL_WACHAT_USER',
        message: internalConflict.message,
        details: internalConflict,
      });
    }

    // 2. Check external Meta conflict (another app subscribed to this WABA)
    if (access_token && business_account_id) {
      const externalConflict = await checkExternalMetaConflict({
        accessToken: access_token,
        wabaId: business_account_id,
        apiVersion: api_version,
      });

      if (externalConflict.hasConflict) {
        return NextResponse.json({
          conflict: true,
          code: 'EXTERNAL_PROVIDER_SUBSCRIBED',
          type: 'EXTERNAL_PROVIDER',
          message: externalConflict.message,
          details: externalConflict,
        });
      }
    }

    return NextResponse.json({
      conflict: false,
      message: 'No conflicts detected. This WhatsApp account is available to connect.',
    });
  } catch (error: unknown) {
    console.error('[Check Conflict API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to verify account conflict status' },
      { status: 500 }
    );
  }
}
