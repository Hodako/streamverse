import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { sql } from '../db/sql.js';
import { verifyVideoStreamToken, signVideoStreamToken } from '../utils/jwt.js';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';

export const videosRouter = Router();

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

const asyncHandler = (fn: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const idParamSchema = z.string().uuid();

const listQuerySchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  trending: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

const shortsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

videosRouter.get('/trending-categories', asyncHandler(async (_req, res) => {
  const rows = await sql<{ id: string; name: string }>('SELECT id, name FROM trending_categories ORDER BY name ASC', []);
  return res.json({ categories: rows.rows });
}));

videosRouter.get('/trending-categories/:id/videos', asyncHandler(async (req, res) => {
  const idParsed = idParamSchema.safeParse(req.params.id);
  if (!idParsed.success) return res.status(400).json({ error: 'invalid_id' });
  const categoryId = idParsed.data;

  const rows = await sql<any>(
    `SELECT v.id, v.title, v.description, v.thumbnail_url, v.video_src, v.category_id, c.name AS category_name,
            v.is_trending, v.is_short, v.channel_name, v.channel_avatar_url, v.views, v.created_at, v.duration_seconds
     FROM trending_category_videos tcv
     JOIN videos v ON v.id = tcv.video_id
     LEFT JOIN categories c ON c.id = v.category_id
     WHERE tcv.trending_category_id = $1
     ORDER BY tcv.created_at DESC
     LIMIT 100`,
    [categoryId]
  );

  return res.json({ videos: rows.rows.map((r: any) => mapVideo(r)) });
}));

videosRouter.get('/', asyncHandler(async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_query' });

  const { q, categoryId, trending, limit, offset } = parsed.data;

  const where: string[] = [];
  const params: any[] = [];

  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    where.push(`LOWER(v.title) LIKE $${params.length}`);
  }

  if (categoryId) {
    params.push(categoryId);
    where.push(`v.category_id = $${params.length}`);
  }

  if (trending) {
    params.push(trending === 'true');
    where.push(`v.is_trending = $${params.length}`);
  }

  params.push(limit);
  params.push(offset);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await sql<{
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    video_src: string;
    category_id: string | null;
    category_name: string | null;
    is_trending: boolean;
    is_short: boolean;
    channel_name: string;
    channel_avatar_url: string | null;
    views: string;
    created_at: string;
    duration_seconds: number;
  }>(
    `SELECT
      v.id,
      v.title,
      v.description,
      v.thumbnail_url,
      v.video_src,
      v.category_id,
      c.name AS category_name,
      v.is_trending,
      v.is_short,
      v.channel_name,
      v.channel_avatar_url,
      v.views,
      v.created_at,
      v.duration_seconds
     FROM videos v
     LEFT JOIN categories c ON c.id = v.category_id
     ${whereSql}
     ORDER BY v.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return res.json({ videos: rows.rows.map((r) => mapVideo(r)) });
}));

videosRouter.get('/shorts', asyncHandler(async (req, res) => {
  const parsed = shortsQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_query' });

  const { limit, offset } = parsed.data;
  const rows = await sql<{
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    video_src: string;
    category_id: string | null;
    category_name: string | null;
    is_trending: boolean;
    is_short: boolean;
    channel_name: string;
    channel_avatar_url: string | null;
    views: string;
    created_at: string;
    duration_seconds: number;
  }>(
    `SELECT
      v.id,
      v.title,
      v.description,
      v.thumbnail_url,
      v.video_src,
      v.category_id,
      c.name AS category_name,
      v.is_trending,
      v.is_short,
      v.channel_name,
      v.channel_avatar_url,
      v.views,
      v.created_at,
      v.duration_seconds
     FROM videos v
     LEFT JOIN categories c ON c.id = v.category_id
     WHERE v.is_short = true
     ORDER BY v.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const origin = `${req.protocol}://${req.get('host')}`;
  return res.json({
    videos: rows.rows.map((r) => {
      const token = signVideoStreamToken({ vid: r.id });
      const streamUrl = `${origin}/api/videos/${r.id}/stream?token=${encodeURIComponent(token)}`;
      return mapVideo(r, { streamUrl });
    }),
  });
}));

videosRouter.get('/:id', asyncHandler(async (req, res) => {
  const idParsed = idParamSchema.safeParse(req.params.id);
  if (!idParsed.success) return res.status(400).json({ error: 'invalid_id' });
  const id = idParsed.data;
  const rows = await sql<{
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    video_src: string;
    category_id: string | null;
    category_name: string | null;
    is_trending: boolean;
    is_short: boolean;
    channel_name: string;
    channel_avatar_url: string | null;
    views: string;
    created_at: string;
    duration_seconds: number;
  }>(
    `SELECT v.id, v.title, v.description, v.thumbnail_url, v.video_src, v.category_id, c.name AS category_name,
            v.is_trending, v.is_short, v.channel_name, v.channel_avatar_url, v.views, v.created_at, v.duration_seconds
     FROM videos v
     LEFT JOIN categories c ON c.id = v.category_id
     WHERE v.id=$1`,
    [id]
  );

  if (rows.rowCount === 0) return res.status(404).json({ error: 'not_found' });

  const token = signVideoStreamToken({ vid: id });
  const origin = `${req.protocol}://${req.get('host')}`;
  const streamUrl = `${origin}/api/videos/${id}/stream?token=${encodeURIComponent(token)}`;

  return res.json({ video: mapVideo(rows.rows[0], { streamUrl }) });
}));

videosRouter.post('/:id/view', asyncHandler(async (req, res) => {
  const idParsed = idParamSchema.safeParse(req.params.id);
  if (!idParsed.success) return res.status(400).json({ error: 'invalid_id' });
  const id = idParsed.data;

  const sessionId = String(req.header('x-session-id') || '').trim();
  if (sessionId && sessionId.length <= 120) {
    const xf = String(req.header('x-forwarded-for') || '');
    const ip = (xf.split(',')[0] || req.ip || '').trim();
    const ipHash = createHash('sha256').update(ip || 'unknown').digest('hex');
    const userAgent = String(req.header('user-agent') || '');

    await sql(
      `INSERT INTO analytics_sessions (session_id, user_id, user_agent, ip_hash)
       VALUES ($1, NULL, $2, $3)
       ON CONFLICT (session_id)
       DO UPDATE SET last_seen_at = now(), user_agent = EXCLUDED.user_agent, ip_hash = EXCLUDED.ip_hash`,
      [sessionId, userAgent, ipHash]
    );

    await sql(
      `INSERT INTO analytics_events (session_id, event_type, path, video_id)
       VALUES ($1, 'view', $2, $3)`,
      [sessionId, req.path, id]
    );
  }

  const updated = await sql<{ views: string }>(
    'UPDATE videos SET views = views + 1, updated_at = now() WHERE id=$1 RETURNING views',
    [id]
  );

  if (updated.rowCount === 0) return res.status(404).json({ error: 'not_found' });
  const views = Number(updated.rows[0].views || 0);
  return res.json({ views });
}));

videosRouter.get('/:id/stream', asyncHandler(async (req, res) => {
  const idParsed = idParamSchema.safeParse(req.params.id);
  if (!idParsed.success) return res.status(400).json({ error: 'invalid_id' });
  const id = idParsed.data;

  const token = String(req.query.token || '');
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    const payload = verifyVideoStreamToken(token);
    if (payload.vid !== id) return res.status(401).json({ error: 'unauthorized' });
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const found = await sql<{ video_src: string }>('SELECT video_src FROM videos WHERE id=$1', [id]);
  if (found.rowCount === 0) return res.status(404).json({ error: 'not_found' });

  const videoSrc = found.rows[0].video_src;
  const range = req.header('range');

  const upstream = await fetch(videoSrc, {
    headers: range ? { range } : undefined,
  });

  if (!upstream.ok && upstream.status !== 206) {
    return res.status(502).json({ error: 'upstream_failed' });
  }

  res.status(upstream.status);

  const passthroughHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];
  for (const h of passthroughHeaders) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  }

  res.setHeader('cache-control', 'no-store');

  if (!upstream.body) {
    return res.end();
  }

  const nodeStream = Readable.fromWeb(upstream.body as any);
  nodeStream.pipe(res);
}));

videosRouter.get('/:id/related', asyncHandler(async (req, res) => {
  const idParsed = idParamSchema.safeParse(req.params.id);
  if (!idParsed.success) return res.status(400).json({ error: 'invalid_id' });
  const id = idParsed.data;
  const current = await sql<{ category_id: string | null }>('SELECT category_id FROM videos WHERE id=$1', [id]);
  if (current.rowCount === 0) return res.status(404).json({ error: 'not_found' });

  const categoryId = current.rows[0].category_id;
  const rows = await sql<any>(
    `SELECT v.id, v.title, v.description, v.thumbnail_url, v.video_src, v.category_id, c.name AS category_name,
            v.is_trending, v.is_short, v.channel_name, v.channel_avatar_url, v.views, v.created_at, v.duration_seconds
     FROM videos v
     LEFT JOIN categories c ON c.id = v.category_id
     WHERE v.id <> $1 AND ($2::uuid IS NULL OR v.category_id = $2)
     ORDER BY v.created_at DESC
     LIMIT 20`,
    [id, categoryId]
  );

  return res.json({ videos: rows.rows.map((r) => mapVideo(r)) });
}));

function mapVideo(row: any, opts?: { streamUrl?: string }) {
  const createdAt = new Date(row.created_at);
  const monthsAgo = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)));

  const durationSeconds = Number(row.duration_seconds || 0);
  const duration = durationSeconds > 0 ? formatDuration(durationSeconds) : '0:00';

  return {
    id: row.id,
    title: row.title,
    thumbnail: row.thumbnail_url,
    channelName: row.channel_name,
    channelAvatar: row.channel_avatar_url ?? 'https://picsum.photos/seed/channel/100/100',
    views: `${Number(row.views || 0).toLocaleString()} views`,
    postedAt: `${monthsAgo} months ago`,
    duration,
    description: row.description,
    category: row.category_name ?? 'All',
    streamUrl: opts?.streamUrl,
    isTrending: row.is_trending,
    isShort: row.is_short,
    createdAt: row.created_at,
  };
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
