import { PrismaClient } from '@prisma/client';

// CockroachDB Cloud with Prisma requires sslmode=require instead of sslmode=verify-full
// because standard container OS trust stores do not include CockroachDB root certificates.
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  return url.replace('sslmode=verify-full', 'sslmode=require');
};

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export default prisma;
