-- OAuth secrets remain encrypted; no account identifiers, orders or holdings.
CREATE TABLE IF NOT EXISTS schwab_oauth_states (
 state_hash TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL,
 session_hash TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS schwab_oauth_owner ON schwab_oauth_states(owner_id);
CREATE TABLE IF NOT EXISTS schwab_connections (
 owner_id TEXT PRIMARY KEY,
 generation TEXT NOT NULL,
 payload TEXT,
 updated_at INTEGER NOT NULL,
 refresh_lock_until INTEGER NOT NULL DEFAULT 0,
 refresh_lock_id TEXT
);
