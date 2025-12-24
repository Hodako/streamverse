import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: 'user' | 'admin';
      };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) return res.status(401).json({ error: 'unauthorized' });
  if (req.auth.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  return next();
}
