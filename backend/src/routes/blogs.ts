import { Router } from 'express';
import { z } from 'zod';
import { sql } from '../db/sql.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

export const blogsRouter = Router();

const asyncHandler = (fn: (req: any, res: any, next: any) => any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string) {
  let slug = baseSlug;
  let i = 1;
  while (true) {
    const q = await sql<any>(
      `SELECT id FROM blogs WHERE slug = $1 ${excludeId ? 'AND id <> $2' : ''}`,
      excludeId ? [slug, excludeId] : [slug]
    );
    if (q.rowCount === 0) return slug;
    slug = `${baseSlug}-${i++}`;
  }
}

const blogCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

blogsRouter.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = blogCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const { title, content } = parsed.data;
  const author_id = req.auth!.userId;
  const slug = generateSlug(title);

  // ensure slug uniqueness
  const uniqueSlug = await ensureUniqueSlug(slug);

  const created = await sql<{ id: string }>(
    `INSERT INTO blogs (id, title, slug, content, author_id)
     VALUES (gen_random_uuid(), $1, $2, $3, $4)
     RETURNING id`,
    [title, uniqueSlug, content, author_id]
  );

  return res.status(201).json({ id: created.rows[0].id });
}));

blogsRouter.get('/', asyncHandler(async (_req, res) => {
  const blogs = await sql<any>(
    `SELECT b.id, b.title, b.slug, b.content, b.created_at, b.updated_at, u.name as author_name
     FROM blogs b
     LEFT JOIN users u ON u.id = b.author_id
     ORDER BY b.created_at DESC`
  );
  const formatted = blogs.rows.map((row: any) => ({
    ...row,
    createdAt: row.created_at?.toISOString?.() || new Date(row.created_at).toISOString(),
    updatedAt: row.updated_at?.toISOString?.() || new Date(row.updated_at).toISOString(),
  }));
  return res.json({ blogs: formatted });
}));

blogsRouter.get('/by-slug/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const blog = await sql<any>(
    `SELECT b.id, b.title, b.slug, b.content, b.created_at, b.updated_at, u.name as author_name
     FROM blogs b
     LEFT JOIN users u ON u.id = b.author_id
     WHERE b.slug = $1`,
    [slug]
  );
  if (blog.rowCount === 0) return res.status(404).json({ error: 'not_found' });
  const row = blog.rows[0];
  const formatted = {
    ...row,
    createdAt: row.created_at?.toISOString?.() || new Date(row.created_at).toISOString(),
    updatedAt: row.updated_at?.toISOString?.() || new Date(row.updated_at).toISOString(),
  };
  return res.json({ blog: formatted });
}));

blogsRouter.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const blog = await sql<any>(
    `SELECT b.id, b.title, b.slug, b.content, b.created_at, b.updated_at, u.name as author_name
     FROM blogs b
     LEFT JOIN users u ON u.id = b.author_id
     WHERE b.id = $1`,
    [id]
  );
  if (blog.rowCount === 0) return res.status(404).json({ error: 'not_found' });
  const row = blog.rows[0];
  const formatted = {
    ...row,
    createdAt: row.created_at?.toISOString?.() || new Date(row.created_at).toISOString(),
    updatedAt: row.updated_at?.toISOString?.() || new Date(row.updated_at).toISOString(),
  };
  return res.json({ blog: formatted });
}));

const blogUpdateSchema = blogCreateSchema.partial();

blogsRouter.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const parsed = blogUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });

  const { title, content } = parsed.data;

  const sets: string[] = ['updated_at = now()'];
  const params: any[] = [id];

  const pushSet = (sqlFrag: string, value: any) => {
    params.push(value);
    sets.push(`${sqlFrag} = $${params.length}`);
  };

  if (title !== undefined) {
    pushSet('title', title);
    const slug = generateSlug(title);
    // ensure unique slug when updating
    const uniqueSlug = await ensureUniqueSlug(slug, id);
    pushSet('slug', uniqueSlug);
  }
  if (content !== undefined) pushSet('content', content);

  if (sets.length === 1) {
    return res.status(400).json({ error: 'no_updates' });
  }

  const updated = await sql<{ id: string }>(
    `UPDATE blogs SET ${sets.join(', ')} WHERE id=$1 RETURNING id`,
    params
  );

  if (updated.rowCount === 0) return res.status(404).json({ error: 'not_found' });
  return res.json({ id: updated.rows[0].id });
}));

blogsRouter.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await sql('DELETE FROM blogs WHERE id=$1', [id]);
  if (deleted.rowCount === 0) return res.status(404).json({ error: 'not_found' });
  return res.status(204).send();
}));
