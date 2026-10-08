export const FREE_ACCESS_PRODUCTS = ['ica-control', 'ica-unified', 'scenepilot'];

export function parseGrantInput(body, now = Date.now()) {
  const email = String(body.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  const products = body.products === 'all' ? FREE_ACCESS_PRODUCTS : [...new Set(Array.isArray(body.products) ? body.products : [])];
  if (!products.length || products.some(p => !FREE_ACCESS_PRODUCTS.includes(p))) throw new Error('Choose Control, Unified, Director, or all three.');
  const expiresAt = body.expiresAt == null ? null : body.expiresAt;
  if (expiresAt !== null && (typeof expiresAt !== 'number' || !Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > 4102444800000)) throw new Error('Choose a future expiration date.');
  return { email, products, expiresAt };
}

export async function readFreeAccess(db, email, product, now = Date.now()) {
  if (!db || !email) return null;
  const row = await db.prepare(`SELECT email, product_slug, status, expires_at FROM email_access_grants
    WHERE email = ? AND product_slug = ? AND status = 'active'
      AND (expires_at IS NULL OR expires_at > ?) LIMIT 1`)
    .bind(String(email).trim().toLowerCase(), product, now).first();
  return row || null;
}

export async function saveFreeAccess(db, ownerId, input, now = Date.now()) {
  const { email, products, expiresAt } = parseGrantInput(input, now);
  const statements = products.flatMap(product => [
    db.prepare(`INSERT INTO email_access_grants
      (email, product_slug, status, expires_at, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, 'active', ?, ?, ?, ?, ?)
      ON CONFLICT(email, product_slug) DO UPDATE SET status='active', expires_at=excluded.expires_at,
        updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
      .bind(email, product, expiresAt, ownerId, ownerId, now, now),
    db.prepare(`INSERT INTO platform_events (id,event_type,user_id,message,severity,created_at)
      VALUES (?, 'free_access_granted', ?, ?, 'info', ?)`)
      .bind(crypto.randomUUID(), ownerId, `${email}: ${product} comped, no payment required; ${expiresAt ? `expires ${new Date(expiresAt).toISOString()}` : 'ongoing'}`, now),
  ]);
  await db.batch(statements);
  return { email, products, expiresAt };
}

export async function revokeFreeAccess(db, ownerId, input, now = Date.now()) {
  const { email, products } = parseGrantInput({ ...input, expiresAt: null }, now);
  await db.batch(products.flatMap(product => [
    db.prepare(`UPDATE email_access_grants SET status='revoked', updated_by=?, updated_at=?
      WHERE email=? AND product_slug=?`).bind(ownerId, now, email, product),
    db.prepare(`INSERT INTO platform_events (id,event_type,user_id,message,severity,created_at)
      VALUES (?, 'free_access_revoked', ?, ?, 'info', ?)`)
      .bind(crypto.randomUUID(), ownerId, `${email}: ${product} free access revoked; existing paid subscriptions unchanged`, now),
  ]));
}

export async function ensureAccessGrantSchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS email_access_grants (
  email TEXT NOT NULL COLLATE NOCASE,
  product_slug TEXT NOT NULL CHECK(product_slug IN ('ica-control','ica-unified','scenepilot')),
  status TEXT NOT NULL CHECK(status IN ('active','revoked')),
  expires_at INTEGER,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(email, product_slug)
)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_access_grants_status ON email_access_grants(status, updated_at DESC)`)
  ]);
}
