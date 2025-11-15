import { PrismaClient } from '@prisma/client';

// Ensure a single PrismaClient instance across hot reloads in development
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// export const prisma =
//   globalForPrisma.prisma ||
//   new PrismaClient({
//     log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
//   });
export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
