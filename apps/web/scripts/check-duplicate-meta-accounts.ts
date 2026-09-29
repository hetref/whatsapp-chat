import { prisma } from '../lib/prisma';

async function main() {
  console.log('🔍 Scanning database for duplicate Meta WhatsApp configurations...\n');

  // 1. Check duplicate Phone Number IDs
  const duplicatePhoneIds: Array<{
    phone_number_id: string;
    count: bigint;
    user_ids: string[];
  }> = await prisma.$queryRaw`
    SELECT 
      phone_number_id,
      COUNT(*) AS count,
      ARRAY_AGG(id) AS user_ids
    FROM user_settings
    WHERE phone_number_id IS NOT NULL 
      AND TRIM(phone_number_id) != ''
    GROUP BY phone_number_id
    HAVING COUNT(*) > 1
    ORDER BY count DESC;
  `;

  // 2. Check duplicate Business Account IDs (WABA IDs)
  const duplicateWabaIds: Array<{
    business_account_id: string;
    count: bigint;
    user_ids: string[];
  }> = await prisma.$queryRaw`
    SELECT 
      business_account_id,
      COUNT(*) AS count,
      ARRAY_AGG(id) AS user_ids
    FROM user_settings
    WHERE business_account_id IS NOT NULL 
      AND TRIM(business_account_id) != ''
    GROUP BY business_account_id
    HAVING COUNT(*) > 1
    ORDER BY count DESC;
  `;

  // 3. Check duplicate phone numbers
  const duplicatePhones: Array<{
    phone_number: string;
    count: bigint;
    user_ids: string[];
  }> = await prisma.$queryRaw`
    SELECT 
      phone_number,
      COUNT(*) AS count,
      ARRAY_AGG(id) AS user_ids
    FROM user_settings
    WHERE phone_number IS NOT NULL 
      AND TRIM(phone_number) != ''
    GROUP BY phone_number
    HAVING COUNT(*) > 1
    ORDER BY count DESC;
  `;

  console.log('================================================================');
  console.log(`📱 DUPLICATE PHONE NUMBER IDs: ${duplicatePhoneIds.length} found`);
  console.log('================================================================');
  if (duplicatePhoneIds.length === 0) {
    console.log('✅ No duplicate Phone Number IDs found.');
  } else {
    for (const item of duplicatePhoneIds) {
      console.log(`\nPhone Number ID: ${item.phone_number_id} (Connected to ${item.count} profiles)`);
      const users = await prisma.user.findMany({
        where: { id: { in: item.user_ids } },
        select: {
          id: true,
          email: true,
          name: true,
          planTier: true,
          settings: {
            select: {
              updatedAt: true,
              accessTokenAdded: true,
              webhookVerified: true,
              phoneNumber: true,
            },
          },
        },
      });

      console.table(
        users.map((u) => ({
          userId: u.id,
          name: u.name,
          email: u.email,
          planTier: u.planTier,
          phoneNumber: u.settings?.phoneNumber,
          hasAccessToken: u.settings?.accessTokenAdded,
          webhookVerified: u.settings?.webhookVerified,
          lastUpdated: u.settings?.updatedAt?.toISOString(),
        }))
      );
    }
  }

  console.log('\n================================================================');
  console.log(`🏢 DUPLICATE WABA IDs: ${duplicateWabaIds.length} found`);
  console.log('================================================================');
  if (duplicateWabaIds.length === 0) {
    console.log('✅ No duplicate WABA IDs found.');
  } else {
    for (const item of duplicateWabaIds) {
      console.log(`\nWABA ID: ${item.business_account_id} (Connected to ${item.count} profiles)`);
      const users = await prisma.user.findMany({
        where: { id: { in: item.user_ids } },
        select: {
          id: true,
          email: true,
          name: true,
          planTier: true,
          settings: {
            select: {
              updatedAt: true,
              accessTokenAdded: true,
              phoneNumberId: true,
              phoneNumber: true,
            },
          },
        },
      });

      console.table(
        users.map((u) => ({
          userId: u.id,
          name: u.name,
          email: u.email,
          planTier: u.planTier,
          phoneNumberId: u.settings?.phoneNumberId,
          phoneNumber: u.settings?.phoneNumber,
          hasAccessToken: u.settings?.accessTokenAdded,
          lastUpdated: u.settings?.updatedAt?.toISOString(),
        }))
      );
    }
  }

  console.log('\n================================================================');
  console.log(`📞 DUPLICATE DISPLAY PHONE NUMBERS: ${duplicatePhones.length} found`);
  console.log('================================================================');
  if (duplicatePhones.length === 0) {
    console.log('✅ No duplicate display phone numbers found.');
  } else {
    for (const item of duplicatePhones) {
      console.log(`\nPhone Number: ${item.phone_number} (Connected to ${item.count} profiles)`);
      const users = await prisma.user.findMany({
        where: { id: { in: item.user_ids } },
        select: {
          id: true,
          email: true,
          name: true,
          planTier: true,
          settings: {
            select: {
              updatedAt: true,
              phoneNumberId: true,
              businessAccountId: true,
            },
          },
        },
      });

      console.table(
        users.map((u) => ({
          userId: u.id,
          name: u.name,
          email: u.email,
          planTier: u.planTier,
          phoneNumberId: u.settings?.phoneNumberId,
          businessAccountId: u.settings?.businessAccountId,
          lastUpdated: u.settings?.updatedAt?.toISOString(),
        }))
      );
    }
  }

  console.log('\n✨ Scan complete.');
}

main()
  .catch((err) => {
    console.error('Error running scan:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
