import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp/business-profile
 * Fetches the live WhatsApp Business Profile from Meta Graph API for the connected user.
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [settings, user] = await Promise.all([
      prisma.userSettings.findUnique({
        where: { id: userId },
        select: {
          accessToken: true,
          phoneNumberId: true,
          businessAccountId: true,
          apiVersion: true,
          phoneNumber: true,
          fullName: true,
          webhookVerified: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      }),
    ]);

    if (!settings?.accessToken || !settings.phoneNumberId) {
      return NextResponse.json({
        connected: false,
        message: 'No WhatsApp account connected. Please connect your credentials in Setup.',
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
            }
          : null,
      });
    }

    const apiVersion = settings.apiVersion || 'v23.0';

    // 1. Fetch phone number details (display name, phone number, verification status, quality rating, and review status)
    let phoneData: any = {};
    try {
      const phoneUrl = `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,status,name_status,new_display_name,new_name_status,decision_reasons,is_official_business_account,account_mode`;
      const phoneRes = await fetch(phoneUrl, {
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
        },
      });
      if (phoneRes.ok) {
        phoneData = await phoneRes.json();
      } else {
        // Fallback without decision_reasons in case older Meta Graph API versions return field errors
        const fallbackUrl = `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,status,name_status,new_display_name,new_name_status,is_official_business_account,account_mode`;
        const fallbackRes = await fetch(fallbackUrl, {
          headers: {
            Authorization: `Bearer ${settings.accessToken}`,
          },
        });
        if (fallbackRes.ok) {
          phoneData = await fallbackRes.json();
        } else {
          const errJson = await phoneRes.json().catch(() => ({}));
          console.warn('[WhatsApp Business Profile GET] Error querying phone details:', errJson);
        }
      }
    } catch (e) {
      console.warn('[WhatsApp Business Profile GET] Exception querying phone details:', e);
    }

    // 2. Fetch business profile details (about, address, description, email, profile_picture_url, websites, vertical)
    let profileData: any = {};
    try {
      const profileUrl = `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`;
      const profileRes = await fetch(profileUrl, {
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
        },
      });
      if (profileRes.ok) {
        const json = await profileRes.json();
        if (json?.data && json.data.length > 0) {
          profileData = json.data[0];
        }
      } else {
        const errJson = await profileRes.json().catch(() => ({}));
        console.warn('[WhatsApp Business Profile GET] Error querying profile fields:', errJson);
      }
    } catch (e) {
      console.warn('[WhatsApp Business Profile GET] Exception querying profile fields:', e);
    }

    // 3. Resolve WABA (WhatsApp Business Account) ID and fetch details
    let resolvedWabaId = settings.businessAccountId;

    if (!resolvedWabaId) {
      // Method A: Query phone number for parent whatsapp_business_account
      try {
        const phoneLookupRes = await fetch(
          `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}?fields=whatsapp_business_account`,
          { headers: { Authorization: `Bearer ${settings.accessToken}` } }
        );
        if (phoneLookupRes.ok) {
          const phoneLookup = await phoneLookupRes.json();
          if (phoneLookup?.whatsapp_business_account?.id) {
            resolvedWabaId = String(phoneLookup.whatsapp_business_account.id);
          }
        }
      } catch (e) {
        console.warn('[WhatsApp Business Profile GET] Method A WABA discovery:', e);
      }

      // Method B: debug_token granular_scopes
      if (!resolvedWabaId) {
        try {
          const debugRes = await fetch(
            `https://graph.facebook.com/${apiVersion}/debug_token?input_token=${settings.accessToken}&access_token=${settings.accessToken}`
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
          console.warn('[WhatsApp Business Profile GET] Method B WABA discovery:', e);
        }
      }

      // If discovered, persist to userSettings
      if (resolvedWabaId) {
        try {
          await prisma.userSettings.update({
            where: { id: userId },
            data: { businessAccountId: resolvedWabaId },
          });
        } catch (dbErr) {
          console.warn('[WhatsApp Business Profile GET] Could not cache discovered WABA ID:', dbErr);
        }
      }
    }

    let wabaData: any = {};
    if (resolvedWabaId) {
      try {
        const wabaUrl = `https://graph.facebook.com/${apiVersion}/${resolvedWabaId}?fields=id,name,timezone_id,currency`;
        const wabaRes = await fetch(wabaUrl, {
          headers: {
            Authorization: `Bearer ${settings.accessToken}`,
          },
        });
        if (wabaRes.ok) {
          wabaData = await wabaRes.json();
        }
      } catch (e) {
        console.warn('[WhatsApp Business Profile GET] Exception querying WABA details:', e);
      }
    }

    // Determine display name review status from Meta
    const hasPendingNameChange = Boolean(
      phoneData.new_display_name ||
      phoneData.new_name_status === 'PENDING_REVIEW' ||
      phoneData.name_status === 'PENDING_REVIEW'
    );

    const pendingDisplayName =
      phoneData.new_display_name ||
      (phoneData.name_status === 'PENDING_REVIEW' ? phoneData.verified_name : null);

    return NextResponse.json({
      success: true,
      connected: true,
      data: {
        phone_number_id: settings.phoneNumberId,
        business_account_id: resolvedWabaId || null,
        display_phone_number: phoneData.display_phone_number || settings.phoneNumber || '',
        verified_name: phoneData.verified_name || settings.fullName || user?.name || '',
        quality_rating: phoneData.quality_rating || 'UNKNOWN',
        code_verification_status: phoneData.code_verification_status || 'UNKNOWN',
        status: phoneData.status || 'CONNECTED',
        name_status: phoneData.name_status || 'APPROVED',
        new_display_name: phoneData.new_display_name || null,
        new_name_status: phoneData.new_name_status || null,
        decision_reasons: phoneData.decision_reasons || null,
        has_pending_name_change: hasPendingNameChange,
        pending_display_name: pendingDisplayName,
        account_mode: phoneData.account_mode || 'LIVE',
        is_official_business_account: Boolean(phoneData.is_official_business_account),
        about: profileData.about || '',
        address: profileData.address || '',
        description: profileData.description || '',
        email: profileData.email || '',
        profile_picture_url: profileData.profile_picture_url || user?.image || null,
        websites: Array.isArray(profileData.websites) ? profileData.websites : [],
        vertical: profileData.vertical || 'UNDEFINED',
        waba_name: wabaData.name || null,
        timezone: wabaData.timezone_id || null,
        currency: wabaData.currency || null,
        webhook_verified: settings.webhookVerified,
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
            }
          : null,
      },
    });
  } catch (error: unknown) {
    console.error('[WhatsApp Business Profile GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/business-profile
 * Updates the WhatsApp Business Profile details on Meta Graph API and syncs local account information.
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
        accessToken: true,
        phoneNumberId: true,
        apiVersion: true,
      },
    });

    if (!settings?.accessToken || !settings.phoneNumberId) {
      return NextResponse.json(
        { error: 'WhatsApp Access Token and Phone Number ID must be configured in Setup.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      name,
      displayName,
      about,
      address,
      description,
      email,
      websites,
      vertical,
    } = body;

    const chosenName = (name !== undefined ? name : displayName) as string | undefined;

    // Validate lengths per Meta specifications
    if (about && String(about).length > 139) {
      return NextResponse.json(
        { error: 'About text cannot exceed 139 characters.' },
        { status: 400 }
      );
    }
    if (address && String(address).length > 256) {
      return NextResponse.json(
        { error: 'Address cannot exceed 256 characters.' },
        { status: 400 }
      );
    }
    if (description && String(description).length > 512) {
      return NextResponse.json(
        { error: 'Description cannot exceed 512 characters.' },
        { status: 400 }
      );
    }
    if (email && String(email).length > 128) {
      return NextResponse.json(
        { error: 'Email cannot exceed 128 characters.' },
        { status: 400 }
      );
    }

    // Clean websites array (max 2 websites, each max 256 chars)
    let cleanedWebsites: string[] = [];
    if (Array.isArray(websites)) {
      cleanedWebsites = websites
        .map((w: unknown) => String(w || '').trim())
        .filter(Boolean)
        .slice(0, 2);

      for (const w of cleanedWebsites) {
        if (w.length > 256) {
          return NextResponse.json(
            { error: 'Each website URL cannot exceed 256 characters.' },
            { status: 400 }
          );
        }
      }
    }

    const apiVersion = settings.apiVersion || 'v23.0';
    const metaUrl = `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}/whatsapp_business_profile`;

    const metaPayload: Record<string, any> = {
      messaging_product: 'whatsapp',
    };

    if (about !== undefined) {
      const trimmedAbout = String(about).trim();
      if (trimmedAbout.length > 0) {
        metaPayload.about = trimmedAbout;
      }
    }
    if (address !== undefined) metaPayload.address = String(address).trim();
    if (description !== undefined) metaPayload.description = String(description).trim();
    if (email !== undefined) metaPayload.email = String(email).trim();
    if (websites !== undefined) metaPayload.websites = cleanedWebsites;
    if (vertical !== undefined && vertical !== 'UNDEFINED' && vertical !== '') {
      metaPayload.vertical = vertical;
    }

    // 1. Update WhatsApp Business Profile on Meta
    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaPayload),
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok || metaData.error) {
      console.error('[WhatsApp Business Profile POST] Meta error:', metaData);
      return NextResponse.json(
        {
          error: metaData.error?.message || 'Meta API rejected profile update.',
          details: metaData.error,
        },
        { status: metaRes.status || 400 }
      );
    }

    // 2. If name/displayName was changed, sync to Prisma and submit new_display_name to Meta
    let metaDisplayNameNotice: string | null = null;
    let displayNameStatus: string | null = null;
    let hasPendingReview = false;

    if (chosenName && chosenName.trim()) {
      const cleanName = chosenName.trim();
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { name: cleanName, updatedAt: new Date() },
        });
        await prisma.userSettings.update({
          where: { id: userId },
          data: { fullName: cleanName, updatedAt: new Date() },
        });

        // Submit new_display_name to Meta phone number endpoint.
        // Meta review is automatically triggered when updating display name.
        const nameUrl = `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}?new_display_name=${encodeURIComponent(cleanName)}`;
        const nameRes = await fetch(nameUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            new_display_name: cleanName,
            display_name: cleanName,
          }),
        });

        const nameData = await nameRes.json();
        if (nameRes.ok && (nameData?.success || !nameData?.error)) {
          hasPendingReview = true;
          displayNameStatus = 'PENDING_REVIEW';
          metaDisplayNameNotice = `Display name "${cleanName}" submitted to Meta. Approval review is now pending (typically 24–48 hours).`;
        } else if (nameData?.error) {
          console.warn('[WhatsApp Business Profile POST] Meta display name error:', nameData.error);
          metaDisplayNameNotice = nameData.error.message || 'Meta could not process the display name update.';
          displayNameStatus = 'ERROR';
        }
      } catch (nameErr) {
        console.warn('[WhatsApp Business Profile POST] Error syncing name:', nameErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: hasPendingReview
        ? `WhatsApp Business profile updated. Display name "${chosenName?.trim()}" has been submitted to Meta and is in approval (pending stage).`
        : 'WhatsApp Business Profile successfully updated on Meta!',
      metaData,
      displayNameNotice: metaDisplayNameNotice,
      displayNameStatus,
      hasPendingReview,
    });
  } catch (error: unknown) {
    console.error('[WhatsApp Business Profile POST] Server error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

