import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resolvedDbPath = path.resolve(__dirname, '../../prisma/dev.db');

/**
 * Shared Prisma Client instance with robust absolute database path resolution.
 */
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || `file:${resolvedDbPath}`,
    },
  },
});
