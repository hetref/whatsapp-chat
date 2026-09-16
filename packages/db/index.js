import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__repoPrisma ?? new PrismaClient({
    log: ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__repoPrisma = prisma;
}

export * from '@prisma/client';
export default prisma;
