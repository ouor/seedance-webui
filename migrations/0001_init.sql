-- Seedance task metadata. The API key is BYOK and never stored here.
-- Binary media (uploads + archived result videos) live in R2, referenced by key.
CREATE TABLE IF NOT EXISTS tasks (
  id               TEXT PRIMARY KEY,        -- ModelArk task id
  status           TEXT NOT NULL,           -- queued | running | succeeded | failed | cancelled | expired
  mode             TEXT NOT NULL,           -- text | image | frames | multi | video
  model            TEXT NOT NULL,           -- e.g. seedance-2-0-260128
  prompt           TEXT,                    -- first text prompt, for list/search
  params           TEXT,                    -- JSON: resolution, ratio, duration, generate_audio, watermark, seed
  input_media      TEXT,                    -- JSON array of {type, role, key} stored in R2
  remote_video_url TEXT,                    -- ModelArk url (expires ~24h after completion)
  video_key        TEXT,                    -- R2 key of our archived copy (durable)
  usage_tokens     INTEGER,                 -- completion_tokens reported by ModelArk
  error            TEXT,                    -- error message if failed
  created_at       INTEGER NOT NULL,        -- unix seconds
  updated_at       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
