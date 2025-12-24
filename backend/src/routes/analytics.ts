import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { sql } from '../db/sql.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const analyticsRouter = Router();

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

const asyncHandler = (fn: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const pingSchema = z.object({
  path: z.string().max(500).optional(),
  videoId: z.string().uuid().optional(),
  eventType: z.enum(['ping', 'pageview']).optional(),
  watchSeconds: z.number().int().min(1).max(60 * 60).optional(),
});

function getIpHash(req: Request) {
  const xf = String(req.header('x-forwarded-for') || '');
  const ip = (xf.split(',')[0] || req.ip || '').trim();
  return createHash('sha256').update(ip || 'unknown').digest('hex');
}

function getOptionalUserId(req: Request) {
  const header = req.header('authorization') || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  try {
    const payload = verifyAccessToken(token);
    return payload?.sub || null;
  } catch {
    return null;
  }
}

async function upsertSession(opts: { sessionId: string; userId: string | null; userAgent: string; ipHash: string }) {
  await sql(
    `INSERT INTO analytics_sessions (session_id, user_id, user_agent, ip_hash)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (session_id)
     DO UPDATE SET
       last_seen_at = now(),
       user_id = COALESCE(EXCLUDED.user_id, analytics_sessions.user_id),
       user_agent = EXCLUDED.user_agent,
       ip_hash = EXCLUDED.ip_hash`,
    [opts.sessionId, opts.userId, opts.userAgent, opts.ipHash]
  );
}

analyticsRouter.post(
  '/ping',
  asyncHandler(async (req, res) => {
    const sessionId = String(req.header('x-session-id') || '').trim();
    if (!sessionId || sessionId.length > 120) return res.status(400).json({ error: 'missing_session_id' });

    const parsed = pingSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

    const ipHash = getIpHash(req);
    const userId = getOptionalUserId(req);
    const userAgent = String(req.header('user-agent') || '');

    await upsertSession({ sessionId, userId, userAgent, ipHash });

    const eventType = parsed.data.eventType || 'ping';
    const normalizedEventType = eventType === 'ping' || eventType === 'pageview' ? eventType : 'ping';

    await sql(
      `INSERT INTO analytics_events (session_id, event_type, path, video_id, watch_seconds)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        sessionId,
        parsed.data.watchSeconds ? 'watch' : normalizedEventType,
        parsed.data.path ?? null,
        parsed.data.videoId ?? null,
        parsed.data.watchSeconds ?? null,
      ]
    );

    return res.json({ ok: true, serverTime: new Date().toISOString() });
  })
);

// Admin analytics endpoints
analyticsRouter.get('/admin/overview', asyncHandler(async (req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalViews,
    todayViews,
    weekViews,
    monthViews,
    activeUsers,
    totalVideos,
    totalUsers,
    totalComments,
    trendingVideos
  ] = await Promise.all([
    sql<{ count: string }>('SELECT COALESCE(SUM(views), 0)::text AS count FROM videos'),
    sql<{ count: string }>(`
      SELECT COALESCE(COUNT(DISTINCT ae.session_id), 0)::text AS count 
      FROM analytics_events ae 
      WHERE ae.event_type = 'watch' 
      AND ae.created_at >= $1
    `, [today.toISOString()]),
    sql<{ count: string }>(`
      SELECT COALESCE(COUNT(DISTINCT ae.session_id), 0)::text AS count 
      FROM analytics_events ae 
      WHERE ae.event_type = 'watch' 
      AND ae.created_at >= $1
    `, [weekAgo.toISOString()]),
    sql<{ count: string }>(`
      SELECT COALESCE(COUNT(DISTINCT ae.session_id), 0)::text AS count 
      FROM analytics_events ae 
      WHERE ae.event_type = 'watch' 
      AND ae.created_at >= $1
    `, [monthAgo.toISOString()]),
    sql<{ count: string }>(`
      SELECT COALESCE(COUNT(DISTINCT s.user_id), 0)::text AS count 
      FROM analytics_sessions s 
      WHERE s.last_seen_at >= $1
    `, [weekAgo.toISOString()]),
    sql<{ count: string }>('SELECT COUNT(*)::text AS count FROM videos'),
    sql<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
    sql<{ count: string }>('SELECT COUNT(*)::text AS count FROM comments'),
    sql<{ count: string }>('SELECT COUNT(*)::text AS count FROM videos WHERE is_trending = true'),
  ]);

  return res.json({
    totalViews: Number(totalViews.rows[0].count),
    todayViews: Number(todayViews.rows[0].count),
    weeklyViews: Number(weekViews.rows[0].count),
    monthlyViews: Number(monthViews.rows[0].count),
    activeUsers: Number(activeUsers.rows[0].count),
    videos: Number(totalVideos.rows[0].count),
    users: Number(totalUsers.rows[0].count),
    comments: Number(totalComments.rows[0].count),
    trending: Number(trendingVideos.rows[0].count),
  });
}));

analyticsRouter.get('/admin/user-growth', asyncHandler(async (req, res) => {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(date);
  }

  const userGrowth = await Promise.all(
    months.map(async (month) => {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      const count = await sql<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM users WHERE created_at >= $1 AND created_at < $2',
        [startOfMonth.toISOString(), endOfMonth.toISOString()]
      );
      return {
        month: month.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        users: Number(count.rows[0].count),
      };
    })
  );

  return res.json(userGrowth);
}));
