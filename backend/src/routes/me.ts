import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { sql } from '../db/sql.js';

export const meRouter = Router();

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

const asyncHandler = (fn: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

meRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const rows = await sql<{ id: string; email: string; name: string; role: 'user' | 'admin' }>(
    'SELECT id, email, name, role FROM users WHERE id=$1',
    [req.auth!.userId]
  );
  if (rows.rowCount === 0) return res.status(404).json({ error: 'not_found' });
  return res.json({ user: rows.rows[0] });
}));

const submissionCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  thumbnailUrl: z.string().url(),
  videoSrc: z.string().url(),
});

meRouter.post('/submissions', requireAuth, asyncHandler(async (req, res) => {
  const parsed = submissionCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const created = await sql<{ id: string }>(
    `INSERT INTO video_submissions (user_id, proposed_title, proposed_description, thumbnail_url, video_src, status)
     VALUES ($1,$2,$3,$4,$5,'pending')
     RETURNING id`,
    [req.auth!.userId, parsed.data.title, parsed.data.description ?? '', parsed.data.thumbnailUrl, parsed.data.videoSrc]
  );

  return res.status(201).json({ id: created.rows[0].id });
}));

meRouter.get('/submissions', requireAuth, asyncHandler(async (req, res) => {
  const rows = await sql<any>(
    `SELECT id, proposed_title, proposed_description, thumbnail_url, video_src, status, admin_note,
            created_at, reviewed_at, approved_video_id
     FROM video_submissions
     WHERE user_id=$1
     ORDER BY created_at DESC
     LIMIT 200`,
    [req.auth!.userId]
  );
  return res.json({ submissions: rows.rows });
}));

meRouter.get('/likes', requireAuth, asyncHandler(async (req, res) => {
  const rows = await sql<{ video_id: string }>('SELECT video_id FROM video_likes WHERE user_id=$1 ORDER BY created_at DESC', [
    req.auth!.userId,
  ]);
  return res.json({ videoIds: rows.rows.map((r: { video_id: string }) => r.video_id) });
}));

meRouter.post('/likes', requireAuth, asyncHandler(async (req, res) => {
  const parsed = z.object({ videoId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  await sql(
    'INSERT INTO video_likes (user_id, video_id) VALUES ($1,$2) ON CONFLICT (user_id, video_id) DO NOTHING',
    [req.auth!.userId, parsed.data.videoId]
  );
  return res.status(204).send();
}));

meRouter.delete('/likes/:videoId', requireAuth, asyncHandler(async (req, res) => {
  await sql('DELETE FROM video_likes WHERE user_id=$1 AND video_id=$2', [req.auth!.userId, req.params.videoId]);
  return res.status(204).send();
}));

meRouter.get('/saved', requireAuth, asyncHandler(async (req, res) => {
  const rows = await sql<{ video_id: string }>('SELECT video_id FROM video_saves WHERE user_id=$1 ORDER BY created_at DESC', [
    req.auth!.userId,
  ]);
  return res.json({ videoIds: rows.rows.map((r: { video_id: string }) => r.video_id) });
}));

meRouter.post('/saved', requireAuth, asyncHandler(async (req, res) => {
  const parsed = z.object({ videoId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  await sql(
    'INSERT INTO video_saves (user_id, video_id) VALUES ($1,$2) ON CONFLICT (user_id, video_id) DO NOTHING',
    [req.auth!.userId, parsed.data.videoId]
  );
  return res.status(204).send();
}));

meRouter.delete('/saved/:videoId', requireAuth, asyncHandler(async (req, res) => {
  await sql('DELETE FROM video_saves WHERE user_id=$1 AND video_id=$2', [req.auth!.userId, req.params.videoId]);
  return res.status(204).send();
}));

meRouter.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const rows = await sql<{ video_id: string; last_watched_at: string; progress_seconds: number }>(
    'SELECT video_id, last_watched_at, progress_seconds FROM watch_history WHERE user_id=$1 ORDER BY last_watched_at DESC LIMIT 500',
    [req.auth!.userId]
  );
  return res.json({ history: rows.rows });
}));

const historyUpsertSchema = z.object({ videoId: z.string().uuid(), progressSeconds: z.number().int().min(0).default(0) });

meRouter.put('/history', requireAuth, asyncHandler(async (req, res) => {
  const parsed = historyUpsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  await sql(
    `INSERT INTO watch_history (user_id, video_id, progress_seconds, last_watched_at)
     VALUES ($1,$2,$3, now())
     ON CONFLICT (user_id, video_id)
     DO UPDATE SET progress_seconds = EXCLUDED.progress_seconds, last_watched_at = now()`,
    [req.auth!.userId, parsed.data.videoId, parsed.data.progressSeconds]
  );

  return res.status(204).send();
}));

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function mapVideo(row: any) {
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
    videoUrl: row.video_src,
    isTrending: row.is_trending,
    isShort: row.is_short,
    createdAt: row.created_at,
  };
}

meRouter.get('/videos', requireAuth, asyncHandler(async (req, res) => {
  const rows = await sql(
    `SELECT v.id, v.title, v.description, v.thumbnail_url, v.video_src, v.views, v.is_trending, v.is_short,
            v.created_at, v.channel_name, v.channel_avatar_url, v.duration_seconds, c.name AS category_name
     FROM videos v
     LEFT JOIN categories c ON c.id = v.category_id
     WHERE v.created_by=$1
     ORDER BY v.created_at DESC
     LIMIT 100`,
    [req.auth!.userId]
  );
  return res.json({ videos: rows.rows.map((r: any) => mapVideo(r)) });
}));

const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
});

meRouter.patch('/profile', requireAuth, asyncHandler(async (req, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  // Check if email is already taken by another user
  const existingUser = await sql('SELECT id FROM users WHERE email=$1 AND id!=$2', [
    parsed.data.email,
    req.auth!.userId,
  ]);
  if (existingUser.rowCount && existingUser.rowCount > 0) {
    return res.status(400).json({ error: 'email_taken' });
  }

  await sql(
    'UPDATE users SET name=$1, email=$2 WHERE id=$3',
    [parsed.data.name, parsed.data.email, req.auth!.userId]
  );

  return res.json({ success: true });
}));

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

meRouter.post('/password', requireAuth, asyncHandler(async (req, res) => {
  const parsed = passwordChangeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  // Verify current password
  const user = await sql('SELECT password_hash FROM users WHERE id=$1', [req.auth!.userId]);
  if (user.rowCount === 0) return res.status(404).json({ error: 'not_found' });

  const bcrypt = await import('bcryptjs');
  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.rows[0].password_hash);
  if (!isValid) return res.status(400).json({ error: 'invalid_password' });

  // Hash new password
  const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  
  await sql('UPDATE users SET password_hash=$1 WHERE id=$2', [newPasswordHash, req.auth!.userId]);

  return res.json({ success: true });
}));
