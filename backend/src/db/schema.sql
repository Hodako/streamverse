CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  thumbnail_url text NOT NULL,
  video_src text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_trending boolean NOT NULL DEFAULT false,
  is_short boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE videos ADD COLUMN IF NOT EXISTS channel_name text NOT NULL DEFAULT 'StreamTube';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS channel_avatar_url text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS views bigint NOT NULL DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_short boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS videos_category_idx ON videos(category_id);
CREATE INDEX IF NOT EXISTS videos_trending_idx ON videos(is_trending);
CREATE INDEX IF NOT EXISTS videos_short_idx ON videos(is_short);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_video_idx ON comments(video_id);

CREATE TABLE IF NOT EXISTS video_likes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS video_saves (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS watch_history (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  progress_seconds integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL DEFAULT 'StreamTube',
  logo_url text,
  site_description text,
  contact_email text NOT NULL DEFAULT 'admin@streamtube.local',
  allow_registration boolean NOT NULL DEFAULT true,
  require_email_verification boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id text PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_sessions_last_seen_idx ON analytics_sessions(last_seen_at);

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
  event_type text NOT NULL,
  path text,
  video_id uuid REFERENCES videos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS watch_seconds integer;

CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS analytics_events_video_id_idx ON analytics_events(video_id);

CREATE TABLE IF NOT EXISTS trending_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_views bigint NOT NULL DEFAULT 1000,
  max_age_hours integer NOT NULL DEFAULT 72,
  max_items integer NOT NULL DEFAULT 20,
  auto_refresh boolean NOT NULL DEFAULT true,
  pinned_video_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trending_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trending_category_videos (
  trending_category_id uuid NOT NULL REFERENCES trending_categories(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trending_category_id, video_id)
);

CREATE INDEX IF NOT EXISTS trending_category_videos_video_idx ON trending_category_videos(video_id);

CREATE TABLE IF NOT EXISTS video_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposed_title text NOT NULL,
  proposed_description text NOT NULL DEFAULT '',
  thumbnail_url text NOT NULL,
  video_src text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_video_id uuid REFERENCES videos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS video_submissions_status_idx ON video_submissions(status);
CREATE INDEX IF NOT EXISTS video_submissions_user_idx ON video_submissions(user_id);

CREATE TABLE IF NOT EXISTS blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blogs ADD COLUMN IF NOT EXISTS slug text;
CREATE INDEX IF NOT EXISTS blogs_slug_idx ON blogs(slug);
