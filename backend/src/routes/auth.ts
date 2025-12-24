import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { sql } from '../db/sql.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';

export const authRouter = Router();

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

const asyncHandler = (fn: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(80),
});

authRouter.post('/signup', asyncHandler(async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const { email, password, name } = parsed.data;
  const passwordHash = await hashPassword(password);

  try {
    const created = await sql<{ id: string; role: 'user' | 'admin' }>(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id, role',
      [email.toLowerCase(), passwordHash, name, 'user']
    );

    const userId = created.rows[0].id;
    const role = created.rows[0].role;

    const token = signAccessToken({ sub: userId, role });
    return res.json({ token, user: { id: userId, email: email.toLowerCase(), name, role } });
  } catch (e: any) {
    if (String(e?.message || '').includes('users_email_key')) {
      return res.status(409).json({ error: 'email_taken' });
    }
    throw e;
  }
}));

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const { email, password } = parsed.data;

  const found = await sql<{ id: string; email: string; name: string; role: 'user' | 'admin'; password_hash: string }>(
    'SELECT id, email, name, role, password_hash FROM users WHERE email=$1',
    [email.toLowerCase()]
  );

  if (found.rowCount === 0) return res.status(401).json({ error: 'invalid_credentials' });

  const user = found.rows[0];
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signAccessToken({ sub: user.id, role: user.role });
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}));
