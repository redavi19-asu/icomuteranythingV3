-- Owner-only ICA Trading AI request metering. No conversation content is stored.
CREATE TABLE IF NOT EXISTS trading_ai_usage (
  owner_id TEXT NOT NULL,
  hour_key TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0 CHECK(requests >= 0),
  PRIMARY KEY(owner_id, hour_key)
);
