import { z } from 'zod';
import dotenv from 'dotenv';
import { sql } from '../db/sql.js';
import { pool } from '../db/pool.js';
import { hashPassword } from '../utils/password.js';

dotenv.config();

const envSchema = z.object({
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(6),
  ADMIN_NAME: z.string().min(1).default('Admin'),
});

async function main() {
  const env = envSchema.parse({
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_NAME: process.env.ADMIN_NAME,
  });

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);

  await sql(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1,$2,$3,'admin')
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       name = EXCLUDED.name,
       role = 'admin'`,
    [env.ADMIN_EMAIL.toLowerCase(), passwordHash, env.ADMIN_NAME]
  );

  await pool.end();
  process.stdout.write('Admin user seeded/updated\n');
}

main().catch(async (err) => {
  process.stderr.write(String(err) + '\n');
  try {
    await pool.end();
  } catch {
    void 0;
  }
  process.exit(1);
});
