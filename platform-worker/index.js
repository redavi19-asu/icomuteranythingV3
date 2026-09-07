const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 100000;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function allowedOrigins(env) {
  return String(
    env.ALLOWED_ORIGINS ||
      "https://icomputeranything.com,https://www.icomputeranything.com,https://redavi19-asu.github.io"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = allowedOrigins(env);

  if (!origin || allowed.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin || allowed[0] || "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      Vary: "Origin",
    };
  }

  return {
    Vary: "Origin",
  };
}

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function bytesToHex(bytes) {
  return [...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  const clean = String(hex || "");
  const bytes = new Uint8Array(clean.length / 2);

  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

async function hashPassword(password, saltHex) {
  const salt = hexToBytes(saltHex);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PASSWORD_ITERATIONS,
    },
    keyMaterial,
    256
  );

  return bytesToHex(new Uint8Array(bits));
}

function bearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

async function verifyTurnstile(request, env, token) {
  const secret = String(env.TURNSTILE_SECRET_KEY || "").trim();

  if (!secret) {
    return { ok: false, response: json({ error: "ICA master Turnstile is not configured." }, 503) };
  }

  if (!token) {
    return { ok: false, response: json({ error: "Complete the Cloudflare security check." }, 400) };
  }

  try {
    const form = new FormData();
    form.set("secret", secret);
    form.set("response", token);

    const ip = request.headers.get("CF-Connecting-IP");
    if (ip) form.set("remoteip", ip);

    const result = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: form,
    });

    if (!result.ok) {
      return { ok: false, response: json({ error: "Security verification is temporarily unavailable." }, 503) };
    }

    const data = await result.json();

    if (!data.success) {
      return { ok: false, response: json({ error: "Security verification failed. Please try again." }, 403) };
    }

    return { ok: true, response: null };
  } catch (error) {
    console.error("ICA_MASTER_TURNSTILE_ERROR", error);
    return { ok: false, response: json({ error: "Security verification is temporarily unavailable." }, 503) };
  }
}

async function createSession(env, userId, request) {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  await env.DB.prepare(
    `INSERT INTO sessions (
      id, user_id, expires_at, created_at, user_agent
    ) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      tokenHash,
      userId,
      expiresAt,
      now,
      request.headers.get("User-Agent") || ""
    )
    .run();

  return {
    token,
    expiresAt,
  };
}

async function currentOwner(request, env) {
  const token = bearerToken(request);
  if (!token) return null;

  const tokenHash = await sha256(token);

  const row = await env.DB.prepare(
    `SELECT
      u.id,
      u.email,
      u.display_name,
      u.role,
      u.status,
      u.created_at,
      u.last_login_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
      AND s.expires_at > ?
      AND u.status = 'active'
    LIMIT 1`
  )
    .bind(tokenHash, Date.now())
    .first();

  if (!row || row.role !== "owner") return null;

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name || "",
    role: row.role,
    createdAt: row.created_at || null,
    lastLoginAt: row.last_login_at || null,
  };
}

async function requireOwner(request, env) {
  const owner = await currentOwner(request, env);

  if (!owner) {
    return {
      owner: null,
      response: json({ error: "ICA master owner access required." }, 403),
    };
  }

  return {
    owner,
    response: null,
  };
}

async function handleLogin(request, env) {
  const body = await request.json().catch(() => ({}));
  const check = await verifyTurnstile(request, env, String(body.turnstileToken || "").trim());

  if (!check.ok) return check.response;

  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  const row = await env.DB.prepare(
    `SELECT
      id,
      email,
      display_name,
      password_hash,
      password_salt,
      role,
      status
    FROM users
    WHERE email = ?
    LIMIT 1`
  )
    .bind(email)
    .first();

  if (!row || row.role !== "owner" || row.status !== "active") {
    return json({ error: "This account does not have ICA master access." }, 403);
  }

  const passwordHash = await hashPassword(password, row.password_salt);

  if (passwordHash !== row.password_hash) {
    return json({ error: "Email or password is incorrect." }, 401);
  }

  const now = Date.now();

  await env.DB.prepare(
    "UPDATE users SET last_login_at = ? WHERE id = ?"
  )
    .bind(now, row.id)
    .run();

  await env.DB.prepare(
    "DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?"
  )
    .bind(row.id, now)
    .run();

  const session = await createSession(env, row.id, request);

  return json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: {
      id: row.id,
      email: row.email,
      displayName: row.display_name || "",
      role: "owner",
    },
  });
}

async function handleLogout(request, env) {
  const token = bearerToken(request);

  if (token) {
    const tokenHash = await sha256(token);
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?")
      .bind(tokenHash)
      .run();
  }

  return json({ ok: true });
}

async function productHealth() {
  const services = {
    scenepilot: "https://scenepilot.ryanedavis.workers.dev/api/health",
    dispatchos: "https://dispatchos-auth-api.ryanedavis.workers.dev/health",
    "ica-unified": "https://ica-unified.ryanedavis.workers.dev/api/health",
  };

  const entries = await Promise.all(
    Object.entries(services).map(async ([slug, url]) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        let data = {};
        try {
          data = await response.json();
        } catch (_) {}

        return [
          slug,
          {
            online: response.ok,
            status: response.status,
            data,
          },
        ];
      } catch (error) {
        return [
          slug,
          {
            online: false,
            status: 0,
            error: String(error?.message || error),
          },
        ];
      }
    })
  );

  return Object.fromEntries(entries);
}

async function dashboardSummary(request, env) {
  const auth = await requireOwner(request, env);
  if (auth.response) return auth.response;

  const [
    userCount,
    activeUserCount,
    orgCount,
    productAccessCount,
    productsResult,
    organizationsResult,
    recentEventsResult,
    health,
  ] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM users").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE status = 'active'").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM organizations").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_products WHERE access_status = 'active'").first(),
    env.DB.prepare(
      `SELECT
        p.id,
        p.slug,
        p.name,
        p.status,
        COUNT(DISTINCT up.user_id) AS user_count,
        COUNT(DISTINCT op.organization_id) AS organization_count
      FROM products p
      LEFT JOIN user_products up ON up.product_id = p.id
      LEFT JOIN organization_products op ON op.product_id = p.id
      GROUP BY p.id, p.slug, p.name, p.status
      ORDER BY p.name ASC`
    ).all(),
    env.DB.prepare(
      `SELECT
        o.id,
        o.name,
        o.slug,
        o.status,
        o.health_status,
        o.primary_email,
        o.updated_at,
        COUNT(DISTINCT op.product_id) AS product_count
      FROM organizations o
      LEFT JOIN organization_products op ON op.organization_id = o.id
      GROUP BY o.id, o.name, o.slug, o.status, o.health_status, o.primary_email, o.updated_at
      ORDER BY o.updated_at DESC
      LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT
        id,
        event_type,
        message,
        severity,
        created_at
      FROM platform_events
      ORDER BY created_at DESC
      LIMIT 30`
    ).all(),
    productHealth(),
  ]);

  return json({
    owner: auth.owner,
    metrics: {
      users: Number(userCount?.count || 0),
      activeUsers: Number(activeUserCount?.count || 0),
      organizations: Number(orgCount?.count || 0),
      activeProductAccess: Number(productAccessCount?.count || 0),
    },
    products: productsResult.results || [],
    organizations: organizationsResult.results || [],
    recentEvents: recentEventsResult.results || [],
    health,
  });
}

async function listUsers(request, env) {
  const auth = await requireOwner(request, env);
  if (auth.response) return auth.response;

  const result = await env.DB.prepare(
    `SELECT
      u.id,
      u.email,
      u.display_name,
      u.role,
      u.status,
      u.marketing_opt_in,
      u.created_at,
      u.last_login_at,
      GROUP_CONCAT(p.name || ':' || up.plan || ':' || up.access_status, '|') AS products
    FROM users u
    LEFT JOIN user_products up ON up.user_id = u.id
    LEFT JOIN products p ON p.id = up.product_id
    GROUP BY
      u.id,
      u.email,
      u.display_name,
      u.role,
      u.status,
      u.marketing_opt_in,
      u.created_at,
      u.last_login_at
    ORDER BY u.created_at DESC
    LIMIT 250`
  ).all();

  return json({
    users: result.results || [],
  });
}

async function updateUser(request, env, userId) {
  const auth = await requireOwner(request, env);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));

  const status = ["active", "suspended"].includes(body.status)
    ? body.status
    : "active";

  if (userId === auth.owner.id && status !== "active") {
    return json({ error: "The ICA master owner account cannot suspend itself." }, 400);
  }

  await env.DB.prepare(
    "UPDATE users SET status = ? WHERE id = ?"
  )
    .bind(status, userId)
    .run();

  await env.DB.prepare(
    `INSERT INTO platform_events (
      id,
      event_type,
      user_id,
      message,
      severity,
      created_at
    ) VALUES (?, 'user_access_updated', ?, ?, 'info', ?)`
  )
    .bind(
      crypto.randomUUID(),
      userId,
      `User access changed to ${status}`,
      Date.now()
    )
    .run();

  return json({ ok: true });
}


async function getProductBySlug(env, slug) {
  return env.DB.prepare(
    "SELECT id, slug, name, status FROM products WHERE slug = ? LIMIT 1"
  ).bind(slug).first();
}

async function listProductUsers(request, env, slug) {
  const auth = await requireOwner(request, env);
  if (auth.response) return auth.response;

  const product = await getProductBySlug(env, slug);
  if (!product) return json({ error: "Product not found." }, 404);

  const result = await env.DB.prepare(
    `SELECT
      u.id,
      u.email,
      u.display_name,
      u.role,
      u.status AS account_status,
      u.last_login_at,
      up.plan,
      up.access_status,
      up.source,
      up.created_at
    FROM user_products up
    JOIN users u ON u.id = up.user_id
    WHERE up.product_id = ?
    ORDER BY up.created_at DESC`
  ).bind(product.id).all();

  return json({ product, users: result.results || [] });
}

async function addProductUser(request, env, slug) {
  const auth = await requireOwner(request, env);
  if (auth.response) return auth.response;

  const product = await getProductBySlug(env, slug);
  if (!product) return json({ error: "Product not found." }, 404);

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const plan = String(body.plan || "comp").trim().slice(0, 40) || "comp";

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  const user = await env.DB.prepare(
    "SELECT id, email, display_name, status FROM users WHERE email = ? LIMIT 1"
  ).bind(email).first();

  if (!user) {
    return json({
      error: "No ICA account exists for that email yet. The user must first have an ICA account."
    }, 404);
  }

  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO user_products (
      user_id, product_id, plan, access_status, source, created_at
    ) VALUES (?, ?, ?, 'active', 'master-manual', ?)
    ON CONFLICT(user_id, product_id) DO UPDATE SET
      plan = excluded.plan,
      access_status = 'active',
      source = 'master-manual'`
  ).bind(user.id, product.id, plan, now).run();

  await env.DB.prepare(
    `INSERT INTO platform_events (
      id, event_type, product_id, user_id, message, severity, created_at
    ) VALUES (?, 'product_access_added', ?, ?, ?, 'info', ?)`
  ).bind(
    crypto.randomUUID(),
    product.id,
    user.id,
    `${email} granted access to ${product.name}`,
    now
  ).run();

  return json({ ok: true, user, product });
}

async function updateProductUser(request, env, slug, userId) {
  const auth = await requireOwner(request, env);
  if (auth.response) return auth.response;

  const product = await getProductBySlug(env, slug);
  if (!product) return json({ error: "Product not found." }, 404);

  const body = await request.json().catch(() => ({}));
  const accessStatus = ["active", "suspended"].includes(body.accessStatus)
    ? body.accessStatus
    : null;

  if (!accessStatus) {
    return json({ error: "Invalid product access status." }, 400);
  }

  const target = await env.DB.prepare(
    `SELECT u.email, u.role
     FROM users u
     JOIN user_products up ON up.user_id = u.id
     WHERE u.id = ? AND up.product_id = ?
     LIMIT 1`
  ).bind(userId, product.id).first();

  if (!target) return json({ error: "Product user not found." }, 404);

  if (target.role === "owner" && accessStatus !== "active") {
    return json({ error: "The ICA master owner cannot be kicked from a product." }, 400);
  }

  await env.DB.prepare(
    "UPDATE user_products SET access_status = ? WHERE user_id = ? AND product_id = ?"
  ).bind(accessStatus, userId, product.id).run();

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO platform_events (
      id, event_type, product_id, user_id, message, severity, created_at
    ) VALUES (?, 'product_access_updated', ?, ?, ?, 'info', ?)`
  ).bind(
    crypto.randomUUID(),
    product.id,
    userId,
    `${target.email} ${accessStatus === "active" ? "restored on" : "kicked from"} ${product.name}`,
    now
  ).run();

  return json({ ok: true });
}

async function platformHealth(request, env) {
  try {
    const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first();

    return json({
      ok: true,
      service: "ica-master-platform",
      database: "connected",
      users: Number(count?.count || 0),
      turnstile: Boolean(String(env.TURNSTILE_SECRET_KEY || "").trim()),
    });
  } catch (error) {
    console.error("ICA_MASTER_HEALTH_ERROR", error);

    return json({
      ok: false,
      service: "ica-master-platform",
      database: "unavailable",
    }, 503);
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors,
      });
    }

    const url = new URL(request.url);
    let response;

    try {
      if (url.pathname === "/health" && request.method === "GET") {
        response = await platformHealth(request, env);
      } else if (url.pathname === "/auth/login" && request.method === "POST") {
        response = await handleLogin(request, env);
      } else if (url.pathname === "/auth/logout" && request.method === "POST") {
        response = await handleLogout(request, env);
      } else if (url.pathname === "/auth/me" && request.method === "GET") {
        const owner = await currentOwner(request, env);
        response = owner
          ? json({ user: owner })
          : json({ error: "Unauthorized." }, 401);
      } else if (url.pathname === "/platform/summary" && request.method === "GET") {
        response = await dashboardSummary(request, env);
      } else if (url.pathname === "/platform/users" && request.method === "GET") {
        response = await listUsers(request, env);
      } else {
        const userMatch = url.pathname.match(/^\/platform\/users\/([^/]+)$/);
        const productUsersMatch = url.pathname.match(/^\/platform\/products\/([^/]+)\/users$/);
        const productUserMatch = url.pathname.match(/^\/platform\/products\/([^/]+)\/users\/([^/]+)$/);

        if (userMatch && request.method === "PATCH") {
          response = await updateUser(
            request,
            env,
            decodeURIComponent(userMatch[1])
          );
        } else if (productUsersMatch && request.method === "GET") {
          response = await listProductUsers(
            request,
            env,
            decodeURIComponent(productUsersMatch[1])
          );
        } else if (productUsersMatch && request.method === "POST") {
          response = await addProductUser(
            request,
            env,
            decodeURIComponent(productUsersMatch[1])
          );
        } else if (productUserMatch && request.method === "PATCH") {
          response = await updateProductUser(
            request,
            env,
            decodeURIComponent(productUserMatch[1]),
            decodeURIComponent(productUserMatch[2])
          );
        } else {
          response = json({ error: "Not found." }, 404);
        }
      }
    } catch (error) {
      console.error("ICA_MASTER_API_ERROR", error);
      response = json({
        error: "ICA master platform service error.",
        detail: error instanceof Error ? error.message : String(error)
      }, 500);
    }

    const headers = new Headers(response.headers);

    for (const [key, value] of Object.entries(cors)) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },
};
