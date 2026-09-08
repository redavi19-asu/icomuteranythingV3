CREATE TABLE IF NOT EXISTS live_stream_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  product_slug TEXT NOT NULL DEFAULT 'scenepilot',
  room_code TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  started_at INTEGER,
  ended_at INTEGER,
  last_seen_at INTEGER NOT NULL,
  viewers INTEGER NOT NULL DEFAULT 0,
  bitrate_kbps INTEGER NOT NULL DEFAULT 0,
  outbound_mbps REAL NOT NULL DEFAULT 0,
  stream_health TEXT NOT NULL DEFAULT 'unknown',
  preview_url TEXT,
  watch_url TEXT,
  server_name TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_live_stream_user
  ON live_stream_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_live_stream_status
  ON live_stream_sessions(status, last_seen_at);
