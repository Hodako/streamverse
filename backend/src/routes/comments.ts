import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { sql } from '../db/sql.js';
import { requireAuth } from '../middleware/auth.js';

export const commentsRouter = Router();

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

const asyncHandler = (fn: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const videoIdParamSchema = z.string().uuid();

commentsRouter.get('/videos/:videoId/comments', asyncHandler(async (req, res) => {
  const parsedVideoId = videoIdParamSchema.safeParse(req.params.videoId);
  if (!parsedVideoId.success) return res.status(400).json({ error: 'invalid_video_id' });
  const videoId = parsedVideoId.data;
  const rows = await sql<{
    id: string;
    text: string;
    created_at: string;
    user_id: string;
    name: string;
  }>(
    `SELECT c.id, c.text, c.created_at, c.user_id, u.name
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.video_id=$1
     ORDER BY c.created_at DESC
     LIMIT 200`,
    [videoId]
  );

  return res.json({
    comments: rows.rows.map((r: { id: string; text: string; created_at: string; user_id: string; name: string }) => ({
      id: r.id,
      user: r.name,
      avatar: `https://picsum.photos/seed/${r.user_id}/50`,
      text: r.text,
      likes: 0,
      timestamp: timeAgo(r.created_at),
      createdAt: r.created_at,
    })),
  });
}));

const createSchema = z.object({ text: z.string().min(1).max(2000) });

commentsRouter.post('/videos/:videoId/comments', requireAuth, asyncHandler(async (req, res) => {
  const parsedVideoId = videoIdParamSchema.safeParse(req.params.videoId);
  if (!parsedVideoId.success) return res.status(400).json({ error: 'invalid_video_id' });

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const videoId = parsedVideoId.data;
  const inserted = await sql<{ id: string; created_at: string }>(
    'INSERT INTO comments (video_id, user_id, text) VALUES ($1,$2,$3) RETURNING id, created_at',
    [videoId, req.auth!.userId, parsed.data.text]
  );

  return res.status(201).json({ id: inserted.rows[0].id, createdAt: inserted.rows[0].created_at });
}));

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${Math.max(1, minutes)} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}
