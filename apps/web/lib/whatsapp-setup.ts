import { prisma } from "@/lib/prisma";

export async function isWhatsAppSetupComplete(userId: string): Promise<boolean> {
  const settings = await prisma.userSettings.findUnique({
    where: { id: userId },
    select: {
      accessTokenAdded: true,
      webhookVerified: true,
    },
  });

  return Boolean(settings?.accessTokenAdded || settings?.webhookVerified);
}
