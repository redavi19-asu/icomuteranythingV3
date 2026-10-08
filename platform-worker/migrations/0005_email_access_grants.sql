CREATE TABLE IF NOT EXISTS email_access_grants (
  email TEXT NOT NULL COLLATE NOCASE,
  product_slug TEXT NOT NULL CHECK(product_slug IN ('ica-control','ica-unified','scenepilot')),
  status TEXT NOT NULL CHECK(status IN ('active','revoked')),
  expires_at INTEGER,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(email, product_slug)
);
CREATE INDEX IF NOT EXISTS idx_email_access_grants_status ON email_access_grants(status, updated_at DESC);
