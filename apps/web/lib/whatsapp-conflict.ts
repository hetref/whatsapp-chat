import { prisma } from '@/lib/prisma';

export interface ExistingWhatsAppOwner {
  id: string;
  name: string | null;
  email: string | null;
  maskedEmail: string;
  phone: string | null;
  maskedPhone: string;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  connectedAt?: Date | null;
}

export interface ExternalMetaApp {
  id: string;
  name: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  type: 'INTERNAL_WACHAT_USER' | 'EXTERNAL_PROVIDER' | null;
  existingUser?: ExistingWhatsAppOwner;
  externalApp?: ExternalMetaApp;
  message?: string;
}

/**
 * Mask an email address for privacy (e.g., "aryan.shinde@gmail.com" -> "ar***e@gmail.com")
 */
export function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) {
    return 'another workspace account';
  }
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  const start = local.slice(0, 2);
  const end = local.slice(-1);
  return `${start}***${end}@${domain}`;
}

/**
 * Mask a phone number for privacy (e.g., "+918097296453" -> "+91 8097****453")
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.trim();
  if (cleaned.length <= 6) return cleaned;
  const start = cleaned.slice(0, cleaned.startsWith('+') ? 6 : 4);
  const end = cleaned.slice(-3);
  return `${start}****${end}`;
}

/**
 * Check if the provided WhatsApp phone number or WABA ID is already connected to another WaChat user.
 */
export async function checkInternalWhatsAppConflict({
  currentUserId,
  phoneNumberId,
  businessAccountId,
  phoneNumber,
}: {
  currentUserId: string;
  phoneNumberId?: string | null;
  businessAccountId?: string | null;
  phoneNumber?: string | null;
}): Promise<ConflictCheckResult> {
  const conditions: Array<Record<string, unknown>> = [];

  const cleanPhoneId = phoneNumberId ? String(phoneNumberId).trim() : null;
  const cleanWabaId = businessAccountId ? String(businessAccountId).trim() : null;
  const cleanPhone = phoneNumber ? String(phoneNumber).replace(/[^\d]/g, '') : null;

  if (cleanPhoneId) {
    conditions.push({ phoneNumberId: cleanPhoneId });
  }

  if (cleanWabaId) {
    conditions.push({ businessAccountId: cleanWabaId });
  }

  if (cleanPhone && cleanPhone.length >= 8) {
    conditions.push({ phoneNumber: { contains: cleanPhone } });
  }

  if (conditions.length === 0) {
    return { hasConflict: false, type: null };
  }

  const existingSettings = await prisma.userSettings.findFirst({
    where: {
      OR: conditions,
      NOT: { id: currentUserId },
      // Ensure the conflicting account has an active configuration
      AND: [
        {
          OR: [
            { accessTokenAdded: true },
            { accessToken: { not: null } },
            { phoneNumberId: { not: null } },
          ],
        },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  if (!existingSettings) {
    return { hasConflict: false, type: null };
  }

  const email = existingSettings.user?.email || null;
  const phone = existingSettings.phoneNumber || null;

  return {
    hasConflict: true,
    type: 'INTERNAL_WACHAT_USER',
    existingUser: {
      id: existingSettings.id,
      name: existingSettings.user?.name || existingSettings.fullName || null,
      email,
      maskedEmail: maskEmail(email),
      phone,
      maskedPhone: maskPhone(phone),
      phoneNumberId: existingSettings.phoneNumberId,
      businessAccountId: existingSettings.businessAccountId,
      connectedAt: existingSettings.updatedAt,
    },
    message: `This WhatsApp account is already connected to another WaChat workspace (${maskEmail(email)}).`,
  };
}

/**
 * Check if the WABA is currently subscribed to an external third-party Meta App (e.g. WATI, Intercom)
 */
export async function checkExternalMetaConflict({
  accessToken,
  wabaId,
  apiVersion = 'v23.0',
}: {
  accessToken: string;
  wabaId: string;
  apiVersion?: string;
}): Promise<ConflictCheckResult> {
  try {
    const ourAppId = process.env.NEXT_PUBLIC_META_APP_ID || '1825841578150241';
    const subUrl = `https://graph.facebook.com/${apiVersion}/${wabaId}/subscribed_apps`;

    const response = await fetch(subUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return { hasConflict: false, type: null };
    }

    const data = await response.json();
    if (!Array.isArray(data.data) || data.data.length === 0) {
      return { hasConflict: false, type: null };
    }

    // Check if any app other than our own is subscribed
    const externalAppEntry = data.data.find(
      (app: { id?: string; whatsapp_business_api_data?: { id?: string } }) => {
        const appId = app.whatsapp_business_api_data?.id || app.id;
        return appId && String(appId) !== String(ourAppId);
      }
    );

    if (externalAppEntry) {
      const extId = externalAppEntry.whatsapp_business_api_data?.id || externalAppEntry.id || 'External';
      const extName =
        externalAppEntry.whatsapp_business_api_data?.name ||
        externalAppEntry.name ||
        'Third-Party Provider';

      return {
        hasConflict: true,
        type: 'EXTERNAL_PROVIDER',
        externalApp: {
          id: String(extId),
          name: String(extName),
        },
        message: `This WhatsApp account is currently receiving webhooks through another provider (${extName}).`,
      };
    }

    return { hasConflict: false, type: null };
  } catch (error) {
    console.warn('[ConflictCheck] Error checking external Meta subscribed apps:', error);
    return { hasConflict: false, type: null };
  }
}

/**
 * Atomically disconnects WhatsApp from a previous user's account to allow transfer to the new user.
 */
export async function transferWhatsAppAccount({
  previousUserId,
  newUserId,
  reason = 'User initiated WhatsApp account transfer',
}: {
  previousUserId: string;
  newUserId: string;
  reason?: string;
}): Promise<void> {
  await prisma.userSettings.update({
    where: { id: previousUserId },
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
}
