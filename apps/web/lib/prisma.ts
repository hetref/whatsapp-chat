export * from '@repo/db';
import sharedPrisma from '@repo/db';

export const prisma = sharedPrisma;
export default sharedPrisma;
