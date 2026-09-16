/**
 * backfill-user-info.ts
 *
 * One-time script to populate email + name for existing DB users
 * who were created before these fields were added.
 *
 * Prerequisites:
 *   - CLERK_SECRET_KEY set in apps/web/.env
 *   - DATABASE_URL set in apps/web/.env
 *
 * Run from the apps/web directory:
 *   npx tsx --env-file=.env scripts/backfill-user-info.ts
 *
 * If your tsx version doesn't support --env-file, use:
 *   npx dotenv-cli -e .env -- npx tsx scripts/backfill-user-info.ts
 */

import { prisma } from '@repo/db';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  console.error(
    '❌ CLERK_SECRET_KEY is not set.\n' +
    '   Run with: npx tsx --env-file=.env scripts/backfill-user-info.ts'
  );
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    '❌ DATABASE_URL is not set.\n' +
    '   Run with: npx tsx --env-file=.env scripts/backfill-user-info.ts'
  );
  process.exit(1);
}

// ─── Clerk REST API types ─────────────────────────────────────────────────────

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchClerkUser(userId: string): Promise<ClerkUser> {
  const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clerk API ${res.status}: ${text}`);
  }

  return res.json() as Promise<ClerkUser>;
}

function resolveEmail(user: ClerkUser): string | null {
  if (!user.email_addresses?.length) return null;
  if (user.primary_email_address_id) {
    const primary = user.email_addresses.find(
      (e) => e.id === user.primary_email_address_id
    );
    if (primary) return primary.email_address;
  }
  return user.email_addresses[0]?.email_address ?? null;
}

function resolveName(user: ClerkUser): string | null {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return user.username ?? null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Finding users missing email or name in NeonDB...\n');

  const usersToBackfill = await prisma.user.findMany({
    where: {
      OR: [{ email: null }, { name: null }],
    },
    select: { id: true, email: true, name: true },
  });

  if (!usersToBackfill.length) {
    console.log('✅ All users already have email and name. Nothing to do.');
    return;
  }

  console.log(`📋 Found ${usersToBackfill.length} user(s) to backfill.\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const dbUser of usersToBackfill) {
    try {
      const clerkUser = await fetchClerkUser(dbUser.id);

      const email = dbUser.email ?? resolveEmail(clerkUser);
      const name = dbUser.name ?? resolveName(clerkUser);

      if (email === dbUser.email && name === dbUser.name) {
        console.log(`  ⏭  ${dbUser.id} — Clerk has no new data (already set or empty in Clerk too)`);
        skipped++;
        continue;
      }

      await prisma.user.update({
        where: { id: dbUser.id },
        data: { email, name },
      });

      console.log(`  ✅ ${dbUser.id}`);
      console.log(`       name  : "${name}"`);
      console.log(`       email : "${email}"`);
      updated++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('404') || message.toLowerCase().includes('not found')) {
        console.log(`  ⚠️  ${dbUser.id} — not found in Clerk (possibly deleted)`);
        skipped++;
      } else {
        console.error(`  ❌ ${dbUser.id} — ${message}`);
        failed++;
      }
    }
  }

  console.log('\n─────────────────────────────────────');
  console.log(`✅ Updated : ${updated}`);
  console.log(`⏭  Skipped : ${skipped}`);
  console.log(`❌ Failed  : ${failed}`);
  console.log('─────────────────────────────────────');
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
