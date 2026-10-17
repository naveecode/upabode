import { PrismaClient } from '@prisma/client';

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace('sslmode=verify-full', 'sslmode=require');
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export default prisma;
