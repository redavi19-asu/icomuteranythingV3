-- Only bounded, classified failures. Never provider bodies, codes or tokens.
CREATE TABLE IF NOT EXISTS schwab_connection_diagnostics (
 owner_id TEXT PRIMARY KEY,
 stage TEXT NOT NULL,
 provider_status INTEGER,
 error_code TEXT NOT NULL,
 occurred_at INTEGER NOT NULL
);
