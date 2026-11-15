import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.string().default('1025').transform((val) => parseInt(val, 10)),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  FROM_EMAIL: z.string().default('alerts@carecircle.local'),
});

export const env = envSchema.parse(process.env);
