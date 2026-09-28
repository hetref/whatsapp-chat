/**
 * user-sync.ts
 *
 * Local database user retrieval utility (no external Clerk calls).
 */

import { prisma } from '@/lib/prisma';

/**
 * Fetch or return the DB user record.
 */
export async function getOrCreateUser(userId: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  // In Better Auth, users are created at registration/login,
  // but if referenced prior, create a placeholder record safely.
  return await prisma.user.create({
    data: {
      id: userId,
      email: `${userId}@placeholder.local`,
      name: 'User',
      emailVerified: true,
    },
  });
}

/**
 * Legacy stub for backward compatibility.
 */
export async function syncUserFromClerk(userId: string): Promise<void> {
  // No-op in Better Auth as user data is managed directly in database
}
