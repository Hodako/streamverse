import { Router, type Request, type Response, type NextFunction } from 'express';
import { sql } from '../db/sql.js';

export const categoriesRouter = Router();

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

const asyncHandler = (fn: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

categoriesRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await sql<{ id: string; name: string }>('SELECT id, name FROM categories ORDER BY name ASC');
  return res.json({ categories: rows.rows });
}));
