import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { videosRouter } from './routes/videos.js';
import { categoriesRouter } from './routes/categories.js';
import { commentsRouter } from './routes/comments.js';
import { meRouter } from './routes/me.js';
import { analyticsRouter } from './routes/analytics.js';
import { blogsRouter } from './routes/blogs.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/videos', videosRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api', commentsRouter);
app.use('/api/me', meRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/blogs', blogsRouter);
app.use('/api/admin/blogs', blogsRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'internal_error';
    res.status(500).json({ error: 'internal_error', message });
  });

  return app;
}
