/**
 * export-clerk-users-csv.ts
 *
 * Comprehensive script to fetch ALL users from Clerk and export them into a CSV file.
 *
 * Features:
 * - Generates a brand new, unique user ID (UUID v4) for every user (so Clerk ID is not continued).
 * - Preserves the old Clerk User ID alongside the new ID for 1-to-1 database remapping.
 * - Extracts primary email, full name, first name, last name, phone, verification status, and OAuth providers.
 * - (Optional) Cross-references each user against your PostgreSQL database to check if records already exist
 *   (e.g., existing contacts, WhatsApp settings, subscription tier).
 * - Full RFC-4180 CSV escaping (handles quotes, commas, newlines).
 * - Auto-paginates through Clerk REST API until all users are fetched.
 *
 * Usage:
 *   cd apps/web
 *   npx tsx scripts/export-clerk-users-csv.ts
 *
 * Or with custom env file:
 *   npx tsx --env-file=.env scripts/export-clerk-users-csv.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config();

import { prisma } from '@repo/db';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  console.error('\n❌ ERROR: CLERK_SECRET_KEY is not set in environment or apps/web/.env.');
  console.error('   Please provide your Clerk Secret Key to authenticate with Clerk API.\n');
  process.exit(1);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClerkEmailAddress {
  id: string;
  email_address: string;
  verification?: {
    status: string;
  };
}

interface ClerkPhoneNumber {
  id: string;
  phone_number: string;
}

interface ClerkExternalAccount {
  id: string;
  provider: string;
  email_address?: string;
}

interface ClerkUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  primary_email_address_id: string | null;
  primary_phone_number_id: string | null;
  email_addresses: ClerkEmailAddress[];
  phone_numbers: ClerkPhoneNumber[];
  external_accounts: ClerkExternalAccount[];
  created_at: number; // Unix timestamp in ms
  last_sign_in_at: number | null; // Unix timestamp in ms
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Escapes values according to RFC 4180 CSV standard.
 */
function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // If string contains comma, quote, or newline, escape quotes with double quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function resolveEmail(user: ClerkUser): { email: string; isVerified: boolean } {
  if (!user.email_addresses || user.email_addresses.length === 0) {
    return { email: '', isVerified: false };
  }

  const primary = user.email_addresses.find((e) => e.id === user.primary_email_address_id);
  const selected = primary || user.email_addresses[0];

  return {
    email: selected?.email_address || '',
    isVerified: selected?.verification?.status === 'verified',
  };
}

function resolveName(user: ClerkUser): { firstName: string; lastName: string; fullName: string } {
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const parts = [firstName, lastName].filter(Boolean);
  const fullName = parts.length > 0 ? parts.join(' ') : (user.username || '');

  return { firstName, lastName, fullName };
}

function resolvePhoneNumber(user: ClerkUser): string {
  if (!user.phone_numbers || user.phone_numbers.length === 0) return '';
  const primary = user.phone_numbers.find((p) => p.id === user.primary_phone_number_id);
  return (primary || user.phone_numbers[0])?.phone_number || '';
}

function resolveOAuthProviders(user: ClerkUser): string {
  if (!user.external_accounts || user.external_accounts.length === 0) return 'none';
  return user.external_accounts.map((acc) => acc.provider).join(';');
}

// ─── Clerk API Fetcher with Auto-Pagination ──────────────────────────────────

async function fetchClerkUsersBatch(limit: number, offset: number): Promise<ClerkUser[]> {
  const url = `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}&order_by=-created_at`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Clerk API returned status ${res.status}: ${errorText}`);
  }

  return (await res.json()) as ClerkUser[];
}

async function fetchAllClerkUsers(): Promise<ClerkUser[]> {
  const allUsers: ClerkUser[] = [];
  const limit = 100;
  let offset = 0;
  let hasMore = true;

  console.log('📡 Fetching users from Clerk REST API...');

  while (hasMore) {
    process.stdout.write(`   Fetching batch (offset ${offset})... `);
    const batch = await fetchClerkUsersBatch(limit, offset);
    allUsers.push(...batch);
    console.log(`received ${batch.length} users (Total: ${allUsers.length})`);

    if (batch.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return allUsers;
}

// ─── Main Execution ──────────────────────────────────────────────────────────

async function main() {
  console.log('====================================================');
  console.log('  CLERK USER EXPORT & NEW USER ID GENERATOR');
  console.log('====================================================\n');

  try {
    const clerkUsers = await fetchAllClerkUsers();
    console.log(`\n✅ Successfully fetched ${clerkUsers.length} total users from Clerk.`);

    if (clerkUsers.length === 0) {
      console.log('ℹ️  No users found in Clerk project. CSV will not be generated.');
      return;
    }

    // CSV Headers
    const headers = [
      'new_user_id',
      'old_clerk_id',
      'email',
      'first_name',
      'last_name',
      'full_name',
      'phone_number',
      'email_verified',
      'oauth_providers',
      'clerk_created_at',
      'clerk_last_sign_in_at',
      'db_user_found',
      'db_contacts_count',
      'db_has_settings',
      'db_plan_tier',
    ];

    const rows: string[] = [headers.join(',')];

    console.log('\n🔄 Generating unique IDs and processing user data...');

    let matchedInDbCount = 0;

    for (const clerkUser of clerkUsers) {
      // 1. Generate a brand new, unique User ID (UUID v4)
      const newUserId = crypto.randomUUID();
      const oldClerkId = clerkUser.id;

      // 2. Resolve attributes
      const { email, isVerified } = resolveEmail(clerkUser);
      const { firstName, lastName, fullName } = resolveName(clerkUser);
      const phoneNumber = resolvePhoneNumber(clerkUser);
      const oauthProviders = resolveOAuthProviders(clerkUser);
      const createdAtIso = new Date(clerkUser.created_at).toISOString();
      const lastSignInIso = clerkUser.last_sign_in_at
        ? new Date(clerkUser.last_sign_in_at).toISOString()
        : '';

      // 3. Optional DB cross-referencing
      let dbUserFound = false;
      let dbContactsCount = 0;
      let dbHasSettings = false;
      let dbPlanTier = 'N/A';

      if (prisma) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: oldClerkId },
            include: {
              _count: { select: { contacts: true } },
              settings: { select: { id: true } },
            },
          });

          if (dbUser) {
            dbUserFound = true;
            matchedInDbCount++;
            dbContactsCount = dbUser._count?.contacts || 0;
            dbHasSettings = Boolean(dbUser.settings);
            dbPlanTier = dbUser.planTier || 'FREE';
          }
        } catch (err) {
          // Ignore DB check error for single user
        }
      }

      // 4. Construct CSV row with proper escaping
      const row = [
        escapeCsv(newUserId),
        escapeCsv(oldClerkId),
        escapeCsv(email),
        escapeCsv(firstName),
        escapeCsv(lastName),
        escapeCsv(fullName),
        escapeCsv(phoneNumber),
        escapeCsv(isVerified),
        escapeCsv(oauthProviders),
        escapeCsv(createdAtIso),
        escapeCsv(lastSignInIso),
        escapeCsv(dbUserFound),
        escapeCsv(dbContactsCount),
        escapeCsv(dbHasSettings),
        escapeCsv(dbPlanTier),
      ].join(',');

      rows.push(row);
    }

    // 5. Write CSV file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFilename = `clerk_users_export_${timestamp}.csv`;
    const canonicalFilename = `clerk_users_export.csv`;

    const outputPath = path.resolve(process.cwd(), outputFilename);
    const canonicalPath = path.resolve(process.cwd(), canonicalFilename);

    const csvContent = rows.join('\n');
    fs.writeFileSync(outputPath, csvContent, 'utf-8');
    fs.writeFileSync(canonicalPath, csvContent, 'utf-8');

    console.log('\n====================================================');
    console.log('  EXPORT COMPLETE');
    console.log('====================================================');
    console.log(`📁 File saved to:`);
    console.log(`   ${outputPath}`);
    console.log(`   ${canonicalPath} (latest copy)\n`);
    console.log(`📊 Summary:`);
    console.log(`   • Total Clerk Users Exported: ${clerkUsers.length}`);
    if (prisma) {
      console.log(`   • Users matched in local DB:   ${matchedInDbCount}`);
    }
    console.log('   • All users assigned a new RFC-4180 unique UUID.');
    console.log('   • old_clerk_id preserved for safe database foreign key remapping.\n');
  } catch (err) {
    console.error('\n❌ Fatal error running export script:', err);
    process.exit(1);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

main();
