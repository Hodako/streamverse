import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const rawJwtSecret = process.env.JWT_SECRET;
const jwtSecret = rawJwtSecret && rawJwtSecret !== 'change_me' ? rawJwtSecret : undefined;

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(10).default('dev_secret_change_me'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
});

export const env = envSchema.parse({
  PORT: process.env.PORT,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  JWT_SECRET: jwtSecret,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
});
