CREATE TABLE IF NOT EXISTS site_content (
  page TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS joins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  interests TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_notified_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_joins_created_at
  ON joins (created_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON messages (created_at DESC);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  provider_ids_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaigns_created_at
  ON campaigns (created_at DESC);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
  ON admin_sessions (expires_at);
