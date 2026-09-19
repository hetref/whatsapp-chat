import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * POST /api/settings/disconnect
 * Disconnects WhatsApp Cloud API from the user's account.
 * Resets access token, phone number, and WABA credentials so user can reconnect cleanly.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Settings Disconnect] Disconnecting WhatsApp for user:', userId);

    const existingSettings = await prisma.userSettings.findUnique({
      where: { id: userId },
    });

    if (!existingSettings) {
      return NextResponse.json(
        { error: 'No WhatsApp configuration found to disconnect' },
        { status: 404 }
      );
    }

    const updatedSettings = await prisma.userSettings.update({
      where: { id: userId },
      data: {
        accessToken: null,
        accessTokenAdded: false,
        phoneNumberId: null,
        businessAccountId: null,
        phoneNumber: null,
        fullName: null,
        webhookVerified: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp account disconnected successfully',
      settings: {
        access_token_added: updatedSettings.accessTokenAdded,
        webhook_verified: updatedSettings.webhookVerified,
        api_version: updatedSettings.apiVersion,
        phone_number: updatedSettings.phoneNumber,
        full_name: updatedSettings.fullName,
        has_access_token: false,
        has_phone_number_id: false,
        has_business_account_id: false,
        has_verify_token: !!updatedSettings.verifyToken,
        webhook_token: updatedSettings.webhookToken,
        access_token: null,
        phone_number_id: null,
        business_account_id: null,
        verify_token: updatedSettings.verifyToken,
      },
    });
  } catch (error: unknown) {
    console.error('[Settings Disconnect] Error disconnecting WhatsApp:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
