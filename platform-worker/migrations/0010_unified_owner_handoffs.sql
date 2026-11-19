CREATE TABLE IF NOT EXISTS unified_owner_handoffs (
  code_hash TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_unified_owner_handoff_expiry
  ON unified_owner_handoffs(expires_at);
