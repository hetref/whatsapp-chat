import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * POST /api/whatsapp/business-profile/avatar
 * Uploads a profile picture to Meta via Resumable Upload API and assigns it to the WhatsApp Business Profile.
 * Completely eliminates S3 avatar management; saves the direct Meta CDN URL to the user record.
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image (JPEG, PNG, or WEBP).' },
        { status: 400 }
      );
    }

    // WhatsApp recommended size is under 5MB (square recommended)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Profile image size must be 5MB or smaller.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const apiVersion = settings.apiVersion || 'v23.0';
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1825841578150241';

    // Step 1: Initialize Resumable Upload Session
    const initUrl = new URL(`https://graph.facebook.com/${apiVersion}/${appId}/uploads`);
    initUrl.searchParams.set('file_length', String(buffer.length));
    initUrl.searchParams.set('file_type', file.type);
    initUrl.searchParams.set('access_token', settings.accessToken);

    const initRes = await fetch(initUrl.toString(), {
      method: 'POST',
    });

    const initData = await initRes.json();
    if (!initRes.ok || !initData.id) {
      console.error('[WhatsApp Avatar Upload] Step 1 failed:', initData);
      return NextResponse.json(
        {
          error: initData.error?.message || 'Failed to initialize image upload session with Meta.',
          details: initData.error,
        },
        { status: initRes.status || 400 }
      );
    }

    const sessionId = initData.id;

    // Step 2: Upload Binary Data to Meta
    const uploadRes = await fetch(`https://graph.facebook.com/${apiVersion}/${sessionId}`, {
      method: 'POST',
      headers: {
        Authorization: `OAuth ${settings.accessToken}`,
        file_offset: '0',
        'Content-Type': file.type,
      },
      body: buffer,
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.h) {
      console.error('[WhatsApp Avatar Upload] Step 2 failed:', uploadData);
      return NextResponse.json(
        {
          error: uploadData.error?.message || 'Failed to upload binary image data to Meta.',
          details: uploadData.error,
        },
        { status: uploadRes.status || 400 }
      );
    }

    const profilePictureHandle = uploadData.h;

    // Step 3: Update WhatsApp Business Profile with Handle
    const updateRes = await fetch(
      `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}/whatsapp_business_profile`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          profile_picture_handle: profilePictureHandle,
        }),
      }
    );

    const updateData = await updateRes.json();
    if (!updateRes.ok || updateData.error) {
      console.error('[WhatsApp Avatar Upload] Step 3 failed:', updateData);
      return NextResponse.json(
        {
          error: updateData.error?.message || 'Meta rejected profile picture update.',
          details: updateData.error,
        },
        { status: updateRes.status || 400 }
      );
    }

    // Step 4: Query Meta for the new live profile picture URL
    let newProfilePictureUrl: string | null = null;
    try {
      const getProfileUrl = `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}/whatsapp_business_profile?fields=profile_picture_url`;
      const getProfileRes = await fetch(getProfileUrl, {
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
        },
      });
      if (getProfileRes.ok) {
        const getProfileData = await getProfileRes.json();
        if (getProfileData?.data && getProfileData.data.length > 0) {
          newProfilePictureUrl = getProfileData.data[0].profile_picture_url || null;
        }
      }
    } catch (e) {
      console.warn('[WhatsApp Avatar Upload] Non-critical: Could not immediately query new profile_picture_url:', e);
    }

    // Step 5: Save the Meta CDN profile picture URL directly into user.image in database (No S3)
    if (newProfilePictureUrl) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            image: newProfilePictureUrl,
            updatedAt: new Date(),
          },
        });
      } catch (dbErr) {
        console.warn('[WhatsApp Avatar Upload] Non-critical user.image sync notice:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture successfully updated on Meta WhatsApp account!',
      profile_picture_url: newProfilePictureUrl,
    });
  } catch (error: unknown) {
    console.error('[WhatsApp Avatar Upload] Server error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
