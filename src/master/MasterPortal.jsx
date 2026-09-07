import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const API_URL =
  import.meta.env.VITE_ICA_MASTER_API_URL ||
  'https://ica-master-platform.ryanedavis.workers.dev'

const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_ICA_MASTER_TURNSTILE_SITE_KEY ||
  '0x4AAAAAAErtQB79-x1-UTHQ'

const PRODUCT_LINKS = {
  scenepilot: 'https://scenepilot.ryanedavis.workers.dev/',
  dispatchos: 'https://redavi19-asu.github.io/icomputer-dispatch-platform/',
  'ica-unified': 'https://ica-unified.ryanedavis.workers.dev/',
}

const PRODUCT_ADMIN_LINKS = {
  scenepilot: 'https://scenepilot.ryanedavis.workers.dev/admin',
  dispatchos: 'https://redavi19-asu.github.io/icomputer-dispatch-platform/admin',
  'ica-unified': 'https://ica-unified.ryanedavis.workers.dev/platform',
}

function getToken() {
  return localStorage.getItem('ica_master_token') || ''
}

function saveToken(token) {
  if (token) localStorage.setItem('ica_master_token', token)
  else localStorage.removeItem('ica_master_token')
}

async function api(path, options = {}) {
  const token = getToken()
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.error || 'ICA platform request failed.')
    error.status = response.status
    throw error
  }

  return data
}

function Turnstile({ onToken, resetKey }) {
  const ref = useRef(null)
  const widgetRef = useRef(null)

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      onToken('')
      return
    }

    let cancelled = false

    const render = () => {
      if (cancelled || !ref.current || !window.turnstile) return

      if (widgetRef.current !== null) {
        try { window.turnstile.remove(widgetRef.current) } catch (_) {}
      }

      widgetRef.current = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'light',
        action: 'ica_master_login',
        callback: (token) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    }

    if (window.turnstile) {
      render()
    } else {
      const id = 'ica-master-turnstile-script'
      let script = document.getElementById(id)

      if (!script) {
        script = document.createElement('script')
        script.id = id
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }

      script.addEventListener('load', render, { once: true })
    }

    return () => {
      cancelled = true
      if (widgetRef.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetRef.current) } catch (_) {}
      }
      widgetRef.current = null
    }
  }, [onToken, resetKey])

  if (!TURNSTILE_SITE_KEY) {
    return (
      <div className="master-turnstile-missing">
        ICA Master Turnstile site key still needs to be configured.
      </div>
    )
  }

  return <div className="master-turnstile" ref={ref} />
}

function MasterLogin({ onAuthenticated }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleToken = useCallback((value) => {
    setToken(value || '')
    if (value) setError('')
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!TURNSTILE_SITE_KEY) {
      setError('The ICA Master Turnstile widget has not been configured yet.')
      return
    }

    if (!token) {
      setError('Complete the Cloudflare security check.')
      return
    }

    setBusy(true)

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          turnstileToken: token,
        }),
      })

      saveToken(data.token)
      onAuthenticated(data.user)
    } catch (err) {
      setError(err.message)
      setToken('')
      setResetKey((value) => value + 1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="master-login-page">
      <a href="/" className="master-home-link">← I Computer Anything</a>

      <section className="master-login-shell">
        <div className="master-login-copy">
          <p className="master-eyebrow">I COMPUTER ANYTHING / OWNER CONTROL</p>
          <h1>SUPER<br/>PLATFORM</h1>
          <p className="master-login-sub">
            One private owner entrance for the entire ICA software portfolio.
          </p>

          <div className="master-login-products">
            <span>SCENEPILOT</span>
            <span>DISPATCH OS</span>
            <span>ICA UNIFIED</span>
          </div>
        </div>

        <form className="master-login-form" onSubmit={submit}>
          <div>
            <p className="master-eyebrow">MASTER ACCOUNT</p>
            <h2>Owner sign in</h2>
            <p>
              This entrance accepts only the centralized ICA owner account.
            </p>
          </div>

          <label>
            EMAIL
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            PASSWORD
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>

          <Turnstile onToken={handleToken} resetKey={resetKey} />

          {error && <div className="master-error">{error}</div>}

          <button disabled={busy || !token || !TURNSTILE_SITE_KEY}>
            {busy ? 'VERIFYING…' : 'ENTER MASTER PLATFORM →'}
          </button>
        </form>
      </section>
    </main>
  )
}

function ProductCard({ product, health }) {
  const slug = product.slug
  const publicUrl = PRODUCT_LINKS[slug]
  const adminUrl = PRODUCT_ADMIN_LINKS[slug]

  return (
    <article className="master-product-card">
      <div className="master-product-topline">
        <span className="master-product-status">
          <i className={health?.online ? 'good' : ''} />
          {health?.online ? 'ONLINE' : 'OFFLINE / CHECK'}
        </span>
        <span>{Number(product.user_count || 0)} USERS</span>
      </div>

      <h3>{product.name}</h3>
      <p>
        {slug === 'scenepilot' && 'Live production, camera operators, replay, multiview and broadcast control.'}
        {slug === 'dispatchos' && 'Business, driver and customer logistics operations.'}
        {slug === 'ica-unified' && 'Learning, people, credentials, compliance and organization management.'}
      </p>

      <div className="master-product-metrics">
        <div>
          <strong>{Number(product.user_count || 0)}</strong>
          <span>USERS</span>
        </div>
        <div>
          <strong>{Number(product.organization_count || 0)}</strong>
          <span>COMPANIES</span>
        </div>
      </div>

      <div className="master-product-actions">
        {publicUrl && (
          <a href={publicUrl} target="_blank" rel="noreferrer">
            OPEN PRODUCT
          </a>
        )}
        {adminUrl && (
          <a href={adminUrl} target="_blank" rel="noreferrer" className="secondary">
            PRODUCT ADMIN
          </a>
        )}
      </div>
    </article>
  )
}

function MasterDashboard({ user, onLogout }) {
  const [summary, setSummary] = useState(null)
  const [users, setUsers] = useState([])
  const [view, setView] = useState('overview')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [summaryData, usersData] = await Promise.all([
        api('/platform/summary'),
        api('/platform/users'),
      ])

      setSummary(summaryData)
      setUsers(usersData.users || [])
    } catch (err) {
      setError(err.message)
      if (err.status === 401 || err.status === 403) {
        saveToken('')
        onLogout()
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const products = useMemo(
    () => summary?.products || [],
    [summary]
  )

  async function changeUserStatus(target, status) {
    try {
      await api(`/platform/users/${encodeURIComponent(target.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading && !summary) {
    return <div className="master-loading">LOADING ICA MASTER PLATFORM…</div>
  }

  return (
    <main className="master-dashboard">
      <aside className="master-sidebar">
        <div className="master-sidebar-brand">
          <strong>ICA</strong>
          <span>SUPER PLATFORM</span>
        </div>

        <nav>
          <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>
            OVERVIEW
          </button>
          <button className={view === 'companies' ? 'active' : ''} onClick={() => setView('companies')}>
            COMPANIES
          </button>
          <button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>
            USERS
          </button>
          <button className={view === 'sales' ? 'active' : ''} onClick={() => setView('sales')}>
            SALES / BILLING
          </button>
          <button className={view === 'health' ? 'active' : ''} onClick={() => setView('health')}>
            PLATFORM HEALTH
          </button>
        </nav>

        <div className="master-owner-block">
          <small>MASTER OWNER</small>
          <strong>{user.displayName || user.email}</strong>
          <button onClick={onLogout}>SIGN OUT</button>
        </div>
      </aside>

      <section className="master-main">
        <header className="master-main-header">
          <div>
            <p className="master-eyebrow">I COMPUTER ANYTHING / CENTRAL CONTROL</p>
            <h1>
              {view === 'overview' && 'Platform Overview'}
              {view === 'companies' && 'Company Health'}
              {view === 'users' && 'Users & Access'}
              {view === 'sales' && 'Sales & Billing'}
              {view === 'health' && 'Platform Health'}
            </h1>
          </div>
          <button onClick={load}>REFRESH DATA</button>
        </header>

        {error && <div className="master-error wide">{error}</div>}

        {view === 'overview' && (
          <>
            <div className="master-metrics">
              <article><span>TOTAL USERS</span><strong>{summary?.metrics?.users || 0}</strong></article>
              <article><span>ACTIVE USERS</span><strong>{summary?.metrics?.activeUsers || 0}</strong></article>
              <article><span>COMPANIES</span><strong>{summary?.metrics?.organizations || 0}</strong></article>
              <article><span>ACTIVE ACCESS</span><strong>{summary?.metrics?.activeProductAccess || 0}</strong></article>
            </div>

            <div className="master-section-heading">
              <div>
                <p className="master-eyebrow">ICA SOFTWARE PORTFOLIO</p>
                <h2>Products</h2>
              </div>
            </div>

            <div className="master-product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  health={summary?.health?.[product.slug]}
                />
              ))}
            </div>

            <section className="master-activity-panel">
              <div className="master-section-heading">
                <div>
                  <p className="master-eyebrow">PLATFORM ACTIVITY</p>
                  <h2>Recent events</h2>
                </div>
              </div>

              {(summary?.recentEvents || []).length ? (
                <div className="master-event-list">
                  {summary.recentEvents.map((event) => (
                    <article key={event.id}>
                      <span>{String(event.severity || 'info').toUpperCase()}</span>
                      <strong>{event.message}</strong>
                      <time>{new Date(Number(event.created_at)).toLocaleString()}</time>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="master-empty">No platform events yet.</p>
              )}
            </section>
          </>
        )}

        {view === 'companies' && (
          <section className="master-table-card">
            <div className="master-section-heading">
              <div>
                <p className="master-eyebrow">ALL ICA SAAS CUSTOMERS</p>
                <h2>Companies</h2>
              </div>
            </div>

            {(summary?.organizations || []).length ? (
              <div className="master-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>COMPANY</th>
                      <th>STATUS</th>
                      <th>HEALTH</th>
                      <th>PRODUCTS</th>
                      <th>UPDATED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.organizations.map((org) => (
                      <tr key={org.id}>
                        <td><strong>{org.name}</strong><small>{org.primary_email || org.slug}</small></td>
                        <td>{String(org.status || 'unknown').toUpperCase()}</td>
                        <td>{String(org.health_status || 'unknown').toUpperCase()}</td>
                        <td>{Number(org.product_count || 0)}</td>
                        <td>{org.updated_at ? new Date(Number(org.updated_at)).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="master-empty-box">
                Company records will populate here as Dispatch OS and ICA Unified are rewired into the central ICA database.
              </div>
            )}
          </section>
        )}

        {view === 'users' && (
          <section className="master-table-card">
            <div className="master-section-heading">
              <div>
                <p className="master-eyebrow">CENTRAL IDENTITY</p>
                <h2>Users</h2>
              </div>
            </div>

            <div className="master-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>USER</th>
                    <th>ROLE</th>
                    <th>STATUS</th>
                    <th>PRODUCT ACCESS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((target) => (
                    <tr key={target.id}>
                      <td>
                        <strong>{target.display_name || '—'}</strong>
                        <small>{target.email}</small>
                      </td>
                      <td>{String(target.role || 'user').toUpperCase()}</td>
                      <td>{String(target.status || 'active').toUpperCase()}</td>
                      <td>{target.products || '—'}</td>
                      <td>
                        {target.role === 'owner' ? (
                          <span className="master-owner-tag">MASTER</span>
                        ) : (
                          <button
                            className="master-table-action"
                            onClick={() => changeUserStatus(
                              target,
                              target.status === 'active' ? 'suspended' : 'active'
                            )}
                          >
                            {target.status === 'active' ? 'SUSPEND' : 'ACTIVATE'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === 'sales' && (
          <section className="master-placeholder">
            <p className="master-eyebrow">STRIPE PHASE</p>
            <h2>Sales & billing command center</h2>
            <p>
              This section is intentionally staged for next weekend. Stripe customers,
              subscriptions, monthly recurring revenue, failed payments, comped accounts
              and product-by-product sales will land here.
            </p>
          </section>
        )}

        {view === 'health' && (
          <section className="master-placeholder">
            <p className="master-eyebrow">SYSTEM STATUS</p>
            <h2>One health view for all ICA SaaS</h2>
            <p>
              The central dashboard is ready to receive product health, company health,
              database status and service events. ScenePilot is already on the shared
              D1 layer; Dispatch OS and ICA Unified will feed this view as their super-admin
              layers are centralized.
            </p>

            <div className="master-health-grid">
              {products.map((product) => {
                const serviceHealth = summary?.health?.[product.slug]
                return (
                  <article key={product.id}>
                    <i className={serviceHealth?.online ? 'good' : ''} />
                    <strong>{product.name}</strong>
                    <span>{serviceHealth?.online ? 'ONLINE' : 'OFFLINE / CHECK'}</span>
                  </article>
                )
              })}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

export default function MasterPortal() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(Boolean(getToken()))

  useEffect(() => {
    if (!getToken()) {
      setChecking(false)
      return
    }

    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => saveToken(''))
      .finally(() => setChecking(false))
  }, [])

  function logout() {
    api('/auth/logout', { method: 'POST', body: '{}' }).catch(() => {})
    saveToken('')
    setUser(null)
  }

  if (checking) {
    return <div className="master-loading">VERIFYING ICA MASTER SESSION…</div>
  }

  if (!user) {
    return <MasterLogin onAuthenticated={setUser} />
  }

  return <MasterDashboard user={user} onLogout={logout} />
}
