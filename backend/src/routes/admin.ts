import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { sql } from '../db/sql.js';
import { verifyPassword } from '../utils/password.js';
import { signAccessToken, verifyAccessToken } from '../utils/jwt.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

export const adminRouter = Router();

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

const asyncHandler = (fn: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const adminListVideosQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

adminRouter.get('/stats', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const [videos, users, categories, comments, trending] = await Promise.all([
    sql<{ count: string }>('SELECT COUNT(*)::text AS count FROM videos'),
    sql<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
    sql<{ count: string }>('SELECT COUNT(*)::text AS count FROM categories'),
    sql<{ count: string }>('SELECT COUNT(*)::text AS count FROM comments'),
    sql<{ count: string }>('SELECT COUNT(*)::text AS count FROM videos WHERE is_trending=true'),
  ]);

  return res.json({
    videos: Number(videos.rows[0].count),
    users: Number(users.rows[0].count),
    categories: Number(categories.rows[0].count),
    comments: Number(comments.rows[0].count),
    trending: Number(trending.rows[0].count),
  });
}));

adminRouter.get('/live', asyncHandler(async (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    const payload = verifyAccessToken(token);
    if (!payload?.sub || payload.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }

  res.status(200);
  res.setHeader('content-type', 'text/event-stream');
  res.setHeader('cache-control', 'no-cache, no-transform');
  res.setHeader('connection', 'keep-alive');

  const write = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const send = async () => {
    const now = new Date();
    const [totalViews, activeNow, visitors24h, viewsToday, watchSecondsToday, videos, comments, trending] = await Promise.all([
      sql<{ total: string }>('SELECT COALESCE(SUM(views),0)::text AS total FROM videos'),
      sql<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM analytics_sessions
         WHERE last_seen_at >= now() - interval '5 minutes'`,
        []
      ),
      sql<{ count: string }>(
        `SELECT COUNT(DISTINCT ip_hash)::text AS count
         FROM analytics_sessions
         WHERE last_seen_at >= now() - interval '1 day'`,
        []
      ),
      sql<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM analytics_events
         WHERE event_type='view' AND created_at >= now() - interval '1 day'`,
        []
      ),
      sql<{ total: string }>(
        `SELECT COALESCE(SUM(watch_seconds),0)::text AS total
         FROM analytics_events
         WHERE event_type='watch' AND created_at >= now() - interval '1 day'`,
        []
      ),
      sql<{ count: string }>('SELECT COUNT(*)::text AS count FROM videos'),
      sql<{ count: string }>('SELECT COUNT(*)::text AS count FROM comments'),
      sql<{ count: string }>('SELECT COUNT(*)::text AS count FROM videos WHERE is_trending=true'),
    ]);

    write('metrics', {
      serverTime: now.toISOString(),
      totals: {
        totalViews: Number(totalViews.rows[0]?.total || 0),
        activeNow: Number(activeNow.rows[0]?.count || 0),
        visitors24h: Number(visitors24h.rows[0]?.count || 0),
        viewsToday: Number(viewsToday.rows[0]?.count || 0),
        watchSecondsToday: Number(watchSecondsToday.rows[0]?.total || 0),
        videos: Number(videos.rows[0]?.count || 0),
        comments: Number(comments.rows[0]?.count || 0),
        trending: Number(trending.rows[0]?.count || 0),
      },
    });
  };

  await send();
  const t = setInterval(() => {
    void send().catch(() => void 0);
  }, 5000);

  req.on('close', () => {
    clearInterval(t);
  });
}));

const analyticsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  bucket: z.enum(['hour', 'day']).default('day'),
});

adminRouter.get('/analytics', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = analyticsQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_query' });

  const now = new Date();
  const to = parsed.data.to ? new Date(parsed.data.to) : now;
  const from = parsed.data.from ? new Date(parsed.data.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const bucket = parsed.data.bucket;

  const [
    totalViews,
    visitorsInRange,
    activeNow,
    viewsInRange,
    viewsToday,
    views7d,
    views30d,
    watchSecondsInRange,
    watchSecondsToday,
    watchSeconds7d,
    watchSeconds30d,
    series,
    categoryDist,
    userGrowth,
  ] = await Promise.all([
    sql<{ total: string }>('SELECT COALESCE(SUM(views),0)::text AS total FROM videos'),
    sql<{ count: string }>(
      `SELECT COUNT(DISTINCT ip_hash)::text AS count
       FROM analytics_sessions
       WHERE last_seen_at >= $1 AND last_seen_at <= $2`,
      [from.toISOString(), to.toISOString()]
    ),
    sql<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM analytics_sessions
       WHERE last_seen_at >= now() - interval '5 minutes'`,
      []
    ),
    sql<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM analytics_events
       WHERE event_type='view' AND created_at >= $1 AND created_at <= $2`,
      [from.toISOString(), to.toISOString()]
    ),
    sql<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM analytics_events
       WHERE event_type='view' AND created_at >= now() - interval '1 day'`,
      []
    ),
    sql<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM analytics_events
       WHERE event_type='view' AND created_at >= now() - interval '7 days'`,
      []
    ),
    sql<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM analytics_events
       WHERE event_type='view' AND created_at >= now() - interval '30 days'`,
      []
    ),
    sql<{ total: string }>(
      `SELECT COALESCE(SUM(watch_seconds),0)::text AS total
       FROM analytics_events
       WHERE event_type='watch' AND created_at >= $1 AND created_at <= $2`,
      [from.toISOString(), to.toISOString()]
    ),
    sql<{ total: string }>(
      `SELECT COALESCE(SUM(watch_seconds),0)::text AS total
       FROM analytics_events
       WHERE event_type='watch' AND created_at >= now() - interval '1 day'`,
      []
    ),
    sql<{ total: string }>(
      `SELECT COALESCE(SUM(watch_seconds),0)::text AS total
       FROM analytics_events
       WHERE event_type='watch' AND created_at >= now() - interval '7 days'`,
      []
    ),
    sql<{ total: string }>(
      `SELECT COALESCE(SUM(watch_seconds),0)::text AS total
       FROM analytics_events
       WHERE event_type='watch' AND created_at >= now() - interval '30 days'`,
      []
    ),
    sql<{ bucket: string; views: string; visitors: string }>(
      `WITH buckets AS (
         SELECT date_trunc($3, created_at) AS bucket,
                COUNT(*) FILTER (WHERE event_type='view') AS views,
                COUNT(DISTINCT s.ip_hash) AS visitors
         FROM analytics_events e
         JOIN analytics_sessions s ON s.session_id = e.session_id
         WHERE e.created_at >= $1 AND e.created_at <= $2
         GROUP BY 1
       )
       SELECT bucket::timestamptz::text AS bucket,
              views::text AS views,
              visitors::text AS visitors
       FROM buckets
       ORDER BY bucket ASC`,
      [from.toISOString(), to.toISOString(), bucket]
    ),
    sql<{ name: string; value: string }>(
      `SELECT COALESCE(c.name, 'Uncategorized') AS name, COUNT(*)::text AS value
       FROM videos v
       LEFT JOIN categories c ON c.id = v.category_id
       GROUP BY 1
       ORDER BY COUNT(*) DESC
       LIMIT 10`,
      []
    ),
    sql<{ month: string; users: string }>(
      `WITH months AS (
         SELECT date_trunc('month', now()) - (n || ' months')::interval AS m
         FROM generate_series(0, 5) AS n
       )
       SELECT to_char(m.m, 'Mon') AS month,
              COUNT(u.id)::text AS users
       FROM months m
       LEFT JOIN users u
         ON date_trunc('month', u.created_at) = m.m
       GROUP BY m.m
       ORDER BY m.m ASC`,
      []
    ),
  ]);

  return res.json({
    range: { from: from.toISOString(), to: to.toISOString(), bucket },
    totals: {
      totalViews: Number(totalViews.rows[0]?.total || 0),
      visitors: Number(visitorsInRange.rows[0]?.count || 0),
      activeNow: Number(activeNow.rows[0]?.count || 0),
      viewsInRange: Number(viewsInRange.rows[0]?.count || 0),
      watchSecondsInRange: Number(watchSecondsInRange.rows[0]?.total || 0),
      todayViews: Number(viewsToday.rows[0]?.count || 0),
      weeklyViews: Number(views7d.rows[0]?.count || 0),
      monthlyViews: Number(views30d.rows[0]?.count || 0),
      todayWatchSeconds: Number(watchSecondsToday.rows[0]?.total || 0),
      weeklyWatchSeconds: Number(watchSeconds7d.rows[0]?.total || 0),
      monthlyWatchSeconds: Number(watchSeconds30d.rows[0]?.total || 0),
    },
    series: series.rows.map((r) => ({
      bucket: r.bucket,
      views: Number(r.views || 0),
      visitors: Number(r.visitors || 0),
    })),
    categories: categoryDist.rows.map((r) => ({ name: r.name, value: Number(r.value || 0) })),
    userGrowth: userGrowth.rows.map((r) => ({ month: r.month, users: Number(r.users || 0) })),
    serverTime: now.toISOString(),
  });
}));

const trendingSettingsSchema = z.object({
  minViews: z.coerce.number().int().nonnegative().optional(),
  maxAgeHours: z.coerce.number().int().min(1).max(24 * 365).optional(),
  maxItems: z.coerce.number().int().min(1).max(200).optional(),
  autoRefresh: z.boolean().optional(),
  pinnedVideoIds: z.array(z.string().uuid()).optional(),
});

async function getOrCreateTrendingSettings() {
  const existing = await sql<{
    id: string;
    min_views: string;
    max_age_hours: number;
    max_items: number;
    auto_refresh: boolean;
    pinned_video_ids: string[];
  }>(`SELECT id, min_views::text AS min_views, max_age_hours, max_items, auto_refresh, pinned_video_ids FROM trending_settings ORDER BY updated_at DESC LIMIT 1`);

  if (existing.rowCount && existing.rowCount > 0) return existing.rows[0];

  const created = await sql<{ id: string }>(
    `INSERT INTO trending_settings (min_views, max_age_hours, max_items, auto_refresh, pinned_video_ids)
     VALUES (1000, 72, 20, true, '{}'::uuid[])
     RETURNING id`,
    []
  );

  const fresh = await sql<any>(
    `SELECT id, min_views::text AS min_views, max_age_hours, max_items, auto_refresh, pinned_video_ids
     FROM trending_settings WHERE id=$1`,
    [created.rows[0].id]
  );
  return fresh.rows[0];
}

async function recomputeTrending(settings: { minViews: number; maxAgeHours: number; maxItems: number; pinnedVideoIds: string[] }) {
  // Reset all trending flags first
  await sql('UPDATE videos SET is_trending=false', []);

  // Pin specific videos
  if (settings.pinnedVideoIds.length > 0) {
    await sql('UPDATE videos SET is_trending=true WHERE id = ANY($1::uuid[])', [settings.pinnedVideoIds]);
  }

  // Auto-pick more trending videos, excluding pinned
  const picked = await sql<{ id: string }>(
    `SELECT id
     FROM videos
     WHERE views >= $1
       AND created_at >= now() - ($2::text || ' hours')::interval
       AND (COALESCE(array_length($3::uuid[], 1), 0) = 0 OR id <> ALL($3::uuid[]))
     ORDER BY views DESC, created_at DESC
     LIMIT $4`,
    [settings.minViews, settings.maxAgeHours, settings.pinnedVideoIds, settings.maxItems]
  );

  if (picked.rowCount && picked.rowCount > 0) {
    const ids = picked.rows.map((r) => r.id);
    await sql('UPDATE videos SET is_trending=true WHERE id = ANY($1::uuid[])', [ids]);
  }
}

adminRouter.get('/trending-settings', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const s = await getOrCreateTrendingSettings();
  return res.json({
    minViews: Number(s.min_views || 0),
    maxAgeHours: Number(s.max_age_hours || 0),
    maxItems: Number(s.max_items || 0),
    autoRefresh: Boolean(s.auto_refresh),
    pinnedVideoIds: Array.isArray(s.pinned_video_ids) ? s.pinned_video_ids : [],
  });
}));

adminRouter.patch('/trending-settings', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = trendingSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const current = await getOrCreateTrendingSettings();
  const next = {
    minViews: parsed.data.minViews ?? Number(current.min_views || 0),
    maxAgeHours: parsed.data.maxAgeHours ?? Number(current.max_age_hours || 0),
    maxItems: parsed.data.maxItems ?? Number(current.max_items || 0),
    autoRefresh: parsed.data.autoRefresh ?? Boolean(current.auto_refresh),
    pinnedVideoIds: parsed.data.pinnedVideoIds ?? (Array.isArray(current.pinned_video_ids) ? current.pinned_video_ids : []),
  };

  await sql(
    `UPDATE trending_settings
     SET min_views=$1, max_age_hours=$2, max_items=$3, auto_refresh=$4, pinned_video_ids=$5::uuid[], updated_at=now()
     WHERE id=$6`,
    [next.minViews, next.maxAgeHours, next.maxItems, next.autoRefresh, next.pinnedVideoIds, current.id]
  );

  if (next.autoRefresh) {
    await recomputeTrending({ minViews: next.minViews, maxAgeHours: next.maxAgeHours, maxItems: next.maxItems, pinnedVideoIds: next.pinnedVideoIds });
  }

  return res.json({ success: true });
}));

adminRouter.post('/trending-settings/recompute', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const current = await getOrCreateTrendingSettings();
  await recomputeTrending({
    minViews: Number(current.min_views || 0),
    maxAgeHours: Number(current.max_age_hours || 0),
    maxItems: Number(current.max_items || 0),
    pinnedVideoIds: Array.isArray(current.pinned_video_ids) ? current.pinned_video_ids : [],
  });
  return res.json({ success: true });
}));

adminRouter.get('/trending-insights', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  // Get detailed insights about trending algorithm performance
  const insights = await sql<any>(
    `WITH video_stats AS (
       SELECT 
         v.id,
         v.title,
         v.views::numeric AS views,
         v.is_trending,
         EXTRACT(EPOCH FROM (now() - v.created_at)) / 3600 AS age_hours,
         COALESCE((SELECT COUNT(*)::numeric FROM comments c WHERE c.video_id = v.id), 0) AS comment_count,
         COALESCE((SELECT COUNT(*)::numeric FROM video_likes vl WHERE vl.video_id = v.id), 0) AS like_count,
         COALESCE((SELECT COUNT(*)::numeric FROM video_saves vs WHERE vs.video_id = v.id), 0) AS save_count
       FROM videos v
       WHERE v.created_at >= now() - interval '7 days'
     )
     SELECT
       id,
       title,
       views::text,
       is_trending,
       age_hours::text,
       comment_count::text,
       like_count::text,
       save_count::text,
       (
         (LN(GREATEST(views, 1)) * 0.4) +
         (EXP(-age_hours / 24.0) * 30.0 * 0.3) +
         (LEAST((comment_count * 3 + like_count * 2 + save_count * 2) / GREATEST(views, 1) * 100, 20) * 0.2) +
         (LEAST(views / GREATEST(age_hours, 0.1), 1000) / 100 * 0.1)
       )::text AS trending_score
     FROM video_stats
     ORDER BY trending_score DESC
     LIMIT 50`
  );

  return res.json({
    insights: insights.rows.map(r => ({
      id: r.id,
      title: r.title,
      views: Number(r.views || 0),
      isTrending: r.is_trending,
      ageHours: Number(r.age_hours || 0).toFixed(1),
      comments: Number(r.comment_count || 0),
      likes: Number(r.like_count || 0),
      saves: Number(r.save_count || 0),
      trendingScore: Number(r.trending_score || 0).toFixed(2),
    })),
  });
}));

// Trending categories (admin-curated)
const trendingCategoryCreateSchema = z.object({ name: z.string().min(1).max(60) });

adminRouter.get('/trending-categories', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const rows = await sql<{ id: string; name: string }>('SELECT id, name FROM trending_categories ORDER BY name ASC', []);
  return res.json({ categories: rows.rows });
}));

adminRouter.post('/trending-categories', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = trendingCategoryCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });
  try {
    const created = await sql<{ id: string }>('INSERT INTO trending_categories (name) VALUES ($1) RETURNING id', [parsed.data.name]);
    return res.status(201).json({ id: created.rows[0].id });
  } catch (e: any) {
    if (String(e?.message || '').includes('trending_categories_name_key')) {
      return res.status(409).json({ error: 'category_exists' });
    }
    throw e;
  }
}));

adminRouter.delete('/trending-categories/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const deleted = await sql('DELETE FROM trending_categories WHERE id=$1', [id]);
  if (deleted.rowCount === 0) return res.status(404).json({ error: 'not_found' });
  return res.status(204).send();
}));

const trendingCategoryAssignSchema = z.object({ videoId: z.string().uuid() });

adminRouter.post('/trending-categories/:id/videos', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = trendingCategoryAssignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });
  await sql(
    `INSERT INTO trending_category_videos (trending_category_id, video_id)
     VALUES ($1,$2)
     ON CONFLICT (trending_category_id, video_id) DO NOTHING`,
    [req.params.id, parsed.data.videoId]
  );
  return res.status(204).send();
}));

adminRouter.delete('/trending-categories/:id/videos/:videoId', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await sql('DELETE FROM trending_category_videos WHERE trending_category_id=$1 AND video_id=$2', [req.params.id, req.params.videoId]);
  return res.status(204).send();
}));

adminRouter.get('/trending-categories/:id/videos', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const rows = await sql<{ video_id: string }>(
    'SELECT video_id FROM trending_category_videos WHERE trending_category_id=$1 ORDER BY created_at DESC',
    [req.params.id]
  );
  return res.json({ videoIds: rows.rows.map((r) => r.video_id) });
}));

// Moderation queue
adminRouter.get('/moderation/submissions', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const status = String(req.query.status || 'pending');
  const rows = await sql<any>(
    `SELECT s.id, s.user_id, u.email AS user_email, u.name AS user_name,
            s.proposed_title, s.proposed_description, s.thumbnail_url, s.video_src,
            s.status, s.admin_note, s.created_at, s.reviewed_at, s.reviewed_by, s.approved_video_id
     FROM video_submissions s
     JOIN users u ON u.id = s.user_id
     WHERE s.status = $1
     ORDER BY s.created_at DESC
     LIMIT 200`,
    [status]
  );
  return res.json({ submissions: rows.rows });
}));

const moderationApproveSchema = z.object({
  channelName: z.string().min(1).max(120).default('StreamTube'),
  title: z.string().min(1),
  description: z.string().default(''),
  categoryId: z.string().uuid().nullable().optional(),
  isShort: z.boolean().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
});

adminRouter.post('/moderation/submissions/:id/approve', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = moderationApproveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const sub = await sql<any>('SELECT * FROM video_submissions WHERE id=$1', [req.params.id]);
  if (sub.rowCount === 0) return res.status(404).json({ error: 'not_found' });
  if (sub.rows[0].status !== 'pending') return res.status(409).json({ error: 'not_pending' });

  const s = sub.rows[0];
  const v = parsed.data;

  const created = await sql<{ id: string }>(
    `INSERT INTO videos (title, description, thumbnail_url, video_src, category_id, is_trending, is_short, created_by, channel_name, channel_avatar_url, duration_seconds)
     VALUES ($1,$2,$3,$4,$5,false,$6,$7,$8,NULL,$9)
     RETURNING id`,
    [
      v.title,
      v.description ?? '',
      s.thumbnail_url,
      s.video_src,
      v.categoryId ?? null,
      v.isShort ?? false,
      s.user_id,
      v.channelName,
      v.durationSeconds ?? 0,
    ]
  );

  await sql(
    `UPDATE video_submissions
     SET status='approved', reviewed_at=now(), reviewed_by=$1, approved_video_id=$2
     WHERE id=$3`,
    [req.auth!.userId, created.rows[0].id, req.params.id]
  );

  return res.json({ success: true, videoId: created.rows[0].id });
}));

const moderationRejectSchema = z.object({ adminNote: z.string().max(500).optional() });

adminRouter.post('/moderation/submissions/:id/reject', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = moderationRejectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const updated = await sql(
    `UPDATE video_submissions
     SET status='rejected', admin_note=$1, reviewed_at=now(), reviewed_by=$2
     WHERE id=$3 AND status='pending'`,
    [parsed.data.adminNote ?? null, req.auth!.userId, req.params.id]
  );

  if (updated.rowCount === 0) return res.status(404).json({ error: 'not_found_or_not_pending' });
  return res.json({ success: true });
}));

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

adminRouter.post('/login', asyncHandler(async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const { email, password } = parsed.data;

  const found = await sql<{ id: string; email: string; name: string; role: 'user' | 'admin'; password_hash: string }>(
    'SELECT id, email, name, role, password_hash FROM users WHERE email=$1',
    [email.toLowerCase()]
  );

  if (found.rowCount === 0) return res.status(401).json({ error: 'invalid_credentials' });

  const user = found.rows[0];
  if (user.role !== 'admin') return res.status(403).json({ error: 'not_admin' });

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signAccessToken({ sub: user.id, role: 'admin' });
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: 'admin' } });
}));

adminRouter.get('/videos', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = adminListVideosQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_query' });

  const { q, limit, offset } = parsed.data;

  const where: string[] = [];
  const params: any[] = [];

  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    where.push(`LOWER(v.title) LIKE $${params.length}`);
  }

  params.push(limit);
  params.push(offset);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await sql<any>(
    `SELECT v.id, v.title, v.description, v.thumbnail_url, v.video_src, v.category_id, c.name AS category_name,
            v.is_trending, v.is_short, v.channel_name, v.channel_avatar_url, v.views, v.created_at, v.duration_seconds
     FROM videos v
     LEFT JOIN categories c ON c.id = v.category_id
     ${whereSql}
     ORDER BY v.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return res.json({
    videos: rows.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      thumbnail: row.thumbnail_url,
      channelName: row.channel_name,
      channelAvatar: row.channel_avatar_url ?? 'https://picsum.photos/seed/channel/100/100',
      views: `${Number(row.views || 0).toLocaleString()} views`,
      postedAt: row.created_at,
      duration: row.duration_seconds ? `${Math.floor(Number(row.duration_seconds) / 60)}:${String(Number(row.duration_seconds) % 60).padStart(2, '0')}` : '0:00',
      description: row.description,
      category: row.category_name ?? 'All',
      categoryId: row.category_id,
      videoUrl: row.video_src,
      isTrending: row.is_trending,
      isShort: row.is_short,
      durationSeconds: Number(row.duration_seconds || 0),
      createdAt: row.created_at,
    })),
  });
}));

const videoCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  thumbnailUrl: z.string().url(),
  videoSrc: z.string().url(),
  categoryId: z.string().uuid().nullable().optional(),
  isTrending: z.boolean().optional(),
  isShort: z.boolean().optional(),
  channelName: z.string().min(1).max(120).optional(),
  channelAvatarUrl: z.string().url().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
});

adminRouter.post('/videos', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = videoCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const v = parsed.data;
  const created = await sql<{ id: string }>(
    `INSERT INTO videos (title, description, thumbnail_url, video_src, category_id, is_trending, is_short, created_by, channel_name, channel_avatar_url, duration_seconds)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      v.title,
      v.description ?? '',
      v.thumbnailUrl,
      v.videoSrc,
      v.categoryId ?? null,
      v.isTrending ?? false,
      v.isShort ?? false,
      req.auth!.userId,
      v.channelName ?? 'StreamTube',
      v.channelAvatarUrl ?? null,
      v.durationSeconds ?? 0,
    ]
  );

  return res.status(201).json({ id: created.rows[0].id });
}));

const videoPatchSchema = videoCreateSchema.partial();

adminRouter.patch('/videos/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const parsed = videoPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const v = parsed.data;

  const sets: string[] = ['updated_at = now()'];
  const params: any[] = [id];

  const pushSet = (sqlFrag: string, value: any) => {
    params.push(value);
    sets.push(`${sqlFrag} = $${params.length}`);
  };

  if (v.title !== undefined) pushSet('title', v.title);
  if (v.description !== undefined) pushSet('description', v.description);
  if (v.thumbnailUrl !== undefined) pushSet('thumbnail_url', v.thumbnailUrl);
  if (v.videoSrc !== undefined) pushSet('video_src', v.videoSrc);
  if (v.categoryId !== undefined) pushSet('category_id', v.categoryId);
  if (v.isTrending !== undefined) pushSet('is_trending', v.isTrending);
  if (v.isShort !== undefined) pushSet('is_short', v.isShort);
  if (v.channelName !== undefined) pushSet('channel_name', v.channelName);
  if (v.channelAvatarUrl !== undefined) pushSet('channel_avatar_url', v.channelAvatarUrl);
  if (v.durationSeconds !== undefined) pushSet('duration_seconds', v.durationSeconds);

  const updated = await sql<{ id: string }>(
    `UPDATE videos SET ${sets.join(', ')} WHERE id=$1 RETURNING id`,
    params
  );

  if (updated.rowCount === 0) return res.status(404).json({ error: 'not_found' });
  return res.json({ id: updated.rows[0].id });
}));

adminRouter.delete('/videos/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await sql('DELETE FROM videos WHERE id=$1', [req.params.id]);
  if (deleted.rowCount === 0) return res.status(404).json({ error: 'not_found' });
  return res.status(204).send();
}));

const categorySchema = z.object({ name: z.string().min(1).max(60) });

adminRouter.post('/categories', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  try {
    const created = await sql<{ id: string }>(
      'INSERT INTO categories (name) VALUES ($1) RETURNING id',
      [parsed.data.name]
    );
    return res.status(201).json({ id: created.rows[0].id });
  } catch (e: any) {
    if (String(e?.message || '').includes('categories_name_key')) {
      return res.status(409).json({ error: 'category_exists' });
    }
    throw e;
  }
}));

adminRouter.delete('/categories/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await sql('DELETE FROM categories WHERE id=$1', [req.params.id]);
  if (deleted.rowCount === 0) return res.status(404).json({ error: 'not_found' });
  return res.status(204).send();
}));

// Settings endpoints
const settingsSchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional(),
  siteDescription: z.string().max(500).optional(),
  contactEmail: z.string().email().optional(),
  allowRegistration: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
});

adminRouter.get('/settings', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const result = await sql<{
    site_name: string;
    logo_url: string | null;
    site_description: string | null;
    contact_email: string;
    allow_registration: boolean;
    require_email_verification: boolean;
  }>(`
    SELECT site_name, logo_url, site_description, contact_email, allow_registration, require_email_verification
    FROM site_settings
    LIMIT 1
  `);

  if (result.rowCount === 0) {
    // Return default settings if none exist
    return res.json({
      siteName: 'StreamTube',
      logoUrl: '',
      siteDescription: '',
      contactEmail: 'admin@streamtube.local',
      allowRegistration: true,
      requireEmailVerification: false,
    });
  }

  const settings = result.rows[0];
  return res.json({
    siteName: settings.site_name,
    logoUrl: settings.logo_url || '',
    siteDescription: settings.site_description || '',
    contactEmail: settings.contact_email,
    allowRegistration: settings.allow_registration,
    requireEmailVerification: settings.require_email_verification,
  });
}));

adminRouter.patch('/settings', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const updates = parsed.data;
  const sets: string[] = [];
  const params: any[] = [];

  const pushSet = (field: string, value: any) => {
    params.push(value);
    sets.push(`${field} = $${params.length}`);
  };

  if (updates.siteName !== undefined) pushSet('site_name', updates.siteName);
  if (updates.logoUrl !== undefined) pushSet('logo_url', updates.logoUrl);
  if (updates.siteDescription !== undefined) pushSet('site_description', updates.siteDescription);
  if (updates.contactEmail !== undefined) pushSet('contact_email', updates.contactEmail);
  if (updates.allowRegistration !== undefined) pushSet('allow_registration', updates.allowRegistration);
  if (updates.requireEmailVerification !== undefined) pushSet('require_email_verification', updates.requireEmailVerification);

  if (sets.length === 0) {
    return res.status(400).json({ error: 'no_updates' });
  }

  // Upsert settings - first try to update existing record
  const existing = await sql('SELECT id FROM site_settings LIMIT 1');
  
  if (existing && existing.rowCount && existing.rowCount > 0) {
    // Update existing record - rebuild parameters for UPDATE
    const updateSets: string[] = [];
    const updateParams: any[] = [];
    
    if (updates.siteName !== undefined) {
      updateParams.push(updates.siteName);
      updateSets.push(`site_name = $${updateParams.length}`);
    }
    if (updates.logoUrl !== undefined) {
      updateParams.push(updates.logoUrl);
      updateSets.push(`logo_url = $${updateParams.length}`);
    }
    if (updates.siteDescription !== undefined) {
      updateParams.push(updates.siteDescription);
      updateSets.push(`site_description = $${updateParams.length}`);
    }
    if (updates.contactEmail !== undefined) {
      updateParams.push(updates.contactEmail);
      updateSets.push(`contact_email = $${updateParams.length}`);
    }
    if (updates.allowRegistration !== undefined) {
      updateParams.push(updates.allowRegistration);
      updateSets.push(`allow_registration = $${updateParams.length}`);
    }
    if (updates.requireEmailVerification !== undefined) {
      updateParams.push(updates.requireEmailVerification);
      updateSets.push(`require_email_verification = $${updateParams.length}`);
    }
    
    updateParams.push(existing.rows[0].id);
    await sql(`UPDATE site_settings SET ${updateSets.join(', ')} WHERE id = $${updateParams.length}`, updateParams);
  } else {
    // Insert new record
    await sql(`
      INSERT INTO site_settings (site_name, logo_url, site_description, contact_email, allow_registration, require_email_verification)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      updates.siteName || 'StreamTube',
      updates.logoUrl || '',
      updates.siteDescription || '',
      updates.contactEmail || 'admin@streamtube.local',
      updates.allowRegistration !== undefined ? updates.allowRegistration : true,
      updates.requireEmailVerification !== undefined ? updates.requireEmailVerification : false,
    ]);
  }

  return res.json({ success: true });
}));
