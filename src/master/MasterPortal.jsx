import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DcLiveAdmin from './DcLiveAdmin'

const API_URL =
  import.meta.env.VITE_ICA_MASTER_API_URL ||
  'https://ica-master-platform.ryanedavis.workers.dev'

const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_ICA_MASTER_TURNSTILE_SITE_KEY ||
  '0x4AAAAAAErtQB79-xi-UTHQ'

const PRODUCT_LINKS = {
  scenepilot: 'https://scenepilot.ryanedavis.workers.dev/app',
  dispatchos: 'https://redavi19-asu.github.io/icomputer-dispatch-platform/',
  'ica-unified': 'https://ica-unified.ryanedavis.workers.dev/platform',
  'dc-live': 'https://redavi19-asu.github.io/dc-live/',
}

const PRODUCT_ADMIN_LINKS = {
  scenepilot: 'https://scenepilot.ryanedavis.workers.dev/admin',
  dispatchos: 'https://redavi19-asu.github.io/icomputer-dispatch-platform/admin',
  'ica-unified': 'https://ica-unified.ryanedavis.workers.dev/platform',
  'dc-live': 'https://redavi19-asu.github.io/dc-live/',
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

function Turnstile({ onToken, onError, resetKey }) {
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
        'error-callback': (code) => { onToken(''); if (onError) onError(String(code || 'unknown')); },
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
  const [turnstileError, setTurnstileError] = useState('')
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
            <span>URBAN CARRIER OS</span>
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

          <Turnstile onToken={handleToken} onError={setTurnstileError} resetKey={resetKey} />

          {turnstileError && <div className="master-error">Cloudflare Turnstile error {turnstileError}</div>}

          {error && <div className="master-error">{error}</div>}

          <button disabled={busy || !token || !TURNSTILE_SITE_KEY}>
            {busy ? 'VERIFYING…' : 'ENTER MASTER PLATFORM →'}
          </button>
        </form>
      </section>
    </main>
  )
}

function ProductCard({ product, health, onManageUsers, onOpenDcLiveAdmin }) {
  const slug = product.slug
  const publicUrl = PRODUCT_LINKS[slug]
  const adminUrl = PRODUCT_ADMIN_LINKS[slug]

  return (
    <article className="master-product-card">
      <div className="master-product-topline">
        <span className="master-product-status">
          <i className={health?.online ? 'good' : health ? 'bad' : ''} />
          {health?.online ? 'HEALTHY' : health ? 'CHECK REQUIRED' : 'CHECKING'}
        </span>
        <span>{Number(product.user_count || 0)} USERS</span>
      </div>

      <div className="master-product-health-strip">
        {[
          ['WEB', health?.frontend],
          ['API', health?.api],
          ['DB', health?.database],
        ].map(([label, check]) => (
          <span key={label} title={check?.error || ''}>
            <i className={check?.ok ? 'good' : check ? 'bad' : ''} />
            <b>{label}</b>
            <small>{check?.ok ? 'UP' : check ? 'DOWN' : 'WAIT'}</small>
          </span>
        ))}
      </div>

      <h3>{product.name}</h3>
      <p>
        {slug === 'scenepilot' && 'Live production, camera operators, replay, multiview and broadcast control.'}
        {slug === 'dispatchos' && 'Business, driver and customer logistics operations.'}
        {slug === 'ica-unified' && 'Learning, people, credentials, compliance and organization management.'}
        {slug === 'dc-live' && 'Viewer accounts, event access, payments, library and protected live playback.'}
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
        <button type="button" onClick={() => onManageUsers(product)}>
          MANAGE USERS
        </button>
        {publicUrl && (
          <a href={publicUrl} target="_blank" rel="noreferrer">
            OPEN PRODUCT
          </a>
        )}
        {slug === 'dc-live' ? (
          <button type="button" className="secondary" onClick={onOpenDcLiveAdmin}>
            DC LIVE CONTROL
          </button>
        ) : adminUrl ? (
          <a href={adminUrl} target="_blank" rel="noreferrer" className="secondary">
            PRODUCT ADMIN
          </a>
        ) : null}
      </div>
    </article>
  )
}

function MasterDashboard({ user, onLogout }) {
  const [summary, setSummary] = useState(null)
  const [users, setUsers] = useState([])
  const [liveSessions, setLiveSessions] = useState([])
  const [selectedLiveUser, setSelectedLiveUser] = useState(null)
  const [selectedLiveDetail, setSelectedLiveDetail] = useState(null)
  const [liveBusy, setLiveBusy] = useState(false)
  const [view, setView] = useState('overview')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productUsers, setProductUsers] = useState([])
  const [productEmail, setProductEmail] = useState('')
  const [productBusy, setProductBusy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [summaryData, usersData, liveData] = await Promise.all([
        api('/platform/summary'),
        api('/platform/users'),
        api('/platform/live-sessions').catch((liveError) => {
          if (liveError.status === 401 || liveError.status === 403) throw liveError
          console.warn('ICA live-session telemetry unavailable:', liveError)
          return { sessions: [] }
        }),
      ])

      setSummary(summaryData)
      setUsers(usersData.users || [])
      setLiveSessions(liveData.sessions || [])
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
    () => (summary?.products || []).map(product =>
      product.slug === 'dispatchos'
        ? { ...product, name: 'Urban Carrier OS' }
        : product
    ),
    [summary]
  )

  const scenePilotHealth = summary?.health?.scenepilot || null
  const streamTelemetry =
    scenePilotHealth?.serviceData?.streaming ||
    scenePilotHealth?.serviceData?.stream ||
    null

  const viewerTiers = [
    { viewers: 25, mbps: 150 },
    { viewers: 50, mbps: 300 },
    { viewers: 100, mbps: 600 },
    { viewers: 250, mbps: 1500 },
  ]


  const liveByUser = useMemo(() => {
    const map = new Map()
    for (const session of liveSessions) {
      if (!session.user_id || map.has(session.user_id)) continue
      map.set(session.user_id, session)
    }
    return map
  }, [liveSessions])

  async function openUserLive(target) {
    setSelectedLiveUser(target)
    setSelectedLiveDetail(null)
    setView('user-live')
    setLiveBusy(true)
    setError('')
    try {
      const data = await api(`/platform/users/${encodeURIComponent(target.id)}/live`)
      setSelectedLiveDetail(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLiveBusy(false)
    }
  }

  async function openProductUsers(product) {
    setSelectedProduct(product)
    setView('product-users')
    setError('')
    setProductBusy(true)
    try {
      const data = await api(`/platform/products/${encodeURIComponent(product.slug)}/users`)
      setProductUsers(data.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setProductBusy(false)
    }
  }

  async function addProductUser(event) {
    event.preventDefault()
    if (!selectedProduct || !productEmail.trim()) return
    setProductBusy(true)
    setError('')
    try {
      await api(`/platform/products/${encodeURIComponent(selectedProduct.slug)}/users`, {
        method: 'POST',
        body: JSON.stringify({ email: productEmail.trim(), plan: 'comp' }),
      })
      setProductEmail('')
      await openProductUsers(selectedProduct)
      await load()
    } catch (err) {
      setError(err.message)
      setProductBusy(false)
    }
  }

  async function changeProductAccess(target, accessStatus) {
    if (!selectedProduct) return
    setProductBusy(true)
    setError('')
    try {
      await api(
        `/platform/products/${encodeURIComponent(selectedProduct.slug)}/users/${encodeURIComponent(target.id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ accessStatus }),
        }
      )
      await openProductUsers(selectedProduct)
      await load()
    } catch (err) {
      setError(err.message)
      setProductBusy(false)
    }
  }

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
          <button className={view === 'dc-live-admin' ? 'active' : ''} onClick={() => setView('dc-live-admin')}>
            DC LIVE ADMIN
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
              {view === 'product-users' && `${selectedProduct?.name || 'Product'} Users`}
              {view === 'user-live' && 'Live Broadcast Monitor'}
              {view === 'dc-live-admin' && 'DC Live Control'}
            </h1>
          </div>
          <button onClick={load} disabled={loading} title="Re-run all platform health checks and refresh users, companies and access data">
            {loading ? 'CHECKING…' : 'REFRESH DATA'}
          </button>
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
                  onManageUsers={openProductUsers}
                  onOpenDcLiveAdmin={() => setView('dc-live-admin')}
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
                Company records will populate here as Urban Carrier OS and ICA Unified are rewired into the central ICA database.
              </div>
            )}
          </section>
        )}

        {view === 'users' && (
          <section className="master-table-card">
            <div className="master-section-heading">
              <div>
                <p className="master-eyebrow">CENTRAL IDENTITY / LIVE OPS</p>
                <h2>Users</h2>
              </div>
            </div>

            <div className="master-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>USER</th>
                    <th>ROLE</th>
                    <th>ACCOUNT</th>
                    <th>LIVE</th>
                    <th>VIEWERS</th>
                    <th>PRODUCT ACCESS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((target) => {
                    const live = liveByUser.get(target.id)
                    const isLive = live?.status === 'live'
                    return (
                      <tr key={target.id} className={isLive ? 'master-user-live-row' : ''}>
                        <td>
                          <button className="master-user-open" onClick={() => openUserLive(target)}>
                            <strong>{target.display_name || '—'}</strong>
                            <small>{target.email}</small>
                          </button>
                        </td>
                        <td>{String(target.role || 'user').toUpperCase()}</td>
                        <td>{String(target.status || 'active').toUpperCase()}</td>
                        <td>
                          <button className={`master-live-pill ${isLive ? 'live' : ''}`} onClick={() => openUserLive(target)}>
                            <i/>{isLive ? 'LIVE' : 'OFFLINE'}
                          </button>
                        </td>
                        <td>{isLive ? Number(live.viewers || 0) : '—'}</td>
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}


        {view === 'user-live' && selectedLiveUser && (
          <section className="master-live-detail">
            <div className="master-live-detail-head">
              <div>
                <button className="master-back-button" onClick={() => setView('users')}>← BACK TO USERS</button>
                <p className="master-eyebrow">SCENEPILOT / LIVE BROADCAST OPERATIONS</p>
                <h2>{selectedLiveUser.display_name || selectedLiveUser.email}</h2>
                <p>{selectedLiveUser.email}</p>
              </div>
              <div className={`master-live-state ${selectedLiveDetail?.stream?.status === 'live' ? 'live' : ''}`}>
                <i/>
                {selectedLiveDetail?.stream?.status === 'live' ? 'LIVE NOW' : 'NOT LIVE'}
              </div>
            </div>

            {liveBusy ? (
              <div className="master-live-empty">CHECKING LIVE SESSION…</div>
            ) : selectedLiveDetail?.stream ? (
              <>
                <div className="master-live-metrics">
                  <article><span>ROOM</span><strong>{selectedLiveDetail.stream.room_code || '—'}</strong></article>
                  <article><span>VIEWERS</span><strong>{Number(selectedLiveDetail.stream.viewers || 0)}</strong></article>
                  <article><span>BITRATE</span><strong>{Number(selectedLiveDetail.stream.bitrate_kbps || 0)} kbps</strong></article>
                  <article><span>OUTBOUND</span><strong>{Number(selectedLiveDetail.stream.outbound_mbps || 0)} Mbps</strong></article>
                  <article><span>HEALTH</span><strong>{String(selectedLiveDetail.stream.stream_health || 'unknown').toUpperCase()}</strong></article>
                  <article><span>SERVER</span><strong>{selectedLiveDetail.stream.server_name || 'PENDING'}</strong></article>
                </div>

                <div className="master-live-preview-card">
                  <div className="master-live-preview-head">
                    <div>
                      <span className="master-eyebrow">PROTECTED PROGRAM PREVIEW</span>
                      <strong>What this user is broadcasting</strong>
                    </div>
                    {selectedLiveDetail.stream.watch_url && (
                      <a href={selectedLiveDetail.stream.watch_url} target="_blank" rel="noreferrer">OPEN PUBLIC STREAM</a>
                    )}
                  </div>

                  <div className="master-live-preview">
                    {selectedLiveDetail.stream.preview_url ? (
                      <video
                        key={selectedLiveDetail.stream.preview_url}
                        src={selectedLiveDetail.stream.preview_url}
                        controls
                        autoPlay
                        muted
                        playsInline
                      />
                    ) : (
                      <div>
                        <strong>PROGRAM PREVIEW WAITING</strong>
                        <span>The RTMP/HLS server will place the protected preview here as soon as live streaming is connected.</span>
                      </div>
                    )}
                  </div>

                  <div className="master-live-preview-footer">
                    <span>
                      STARTED {selectedLiveDetail.stream.started_at
                        ? new Date(Number(selectedLiveDetail.stream.started_at)).toLocaleString()
                        : '—'}
                    </span>
                    <span>
                      LAST SIGNAL {selectedLiveDetail.stream.last_seen_at
                        ? new Date(Number(selectedLiveDetail.stream.last_seen_at)).toLocaleTimeString()
                        : '—'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="master-live-empty">
                <strong>NO STREAM SESSION YET</strong>
                <span>This user has no ScenePilot live session reported to ICA Master.</span>
              </div>
            )}
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


        {view === 'product-users' && selectedProduct && (
          <section className="master-table-card">
            <div className="master-product-admin-head">
              <div>
                <button className="master-back-button" onClick={() => setView('overview')}>
                  ← BACK TO PRODUCTS
                </button>
                <p className="master-eyebrow">PRODUCT ACCESS CONTROL</p>
                <h2>{selectedProduct.name} Users</h2>
                <p className="master-product-admin-copy">
                  Add an existing ICA account to this product, or kick/reactivate product access without disabling the person's entire ICA account.
                </p>
              </div>
              <form className="master-add-user" onSubmit={addProductUser}>
                <input
                  type="email"
                  placeholder="user@email.com"
                  value={productEmail}
                  onChange={(event) => setProductEmail(event.target.value)}
                  required
                />
                <button disabled={productBusy}>ADD USER BY EMAIL</button>
              </form>
            </div>

            {productBusy && !productUsers.length ? (
              <p className="master-empty">Loading product users…</p>
            ) : (
              <div className="master-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>USER</th>
                      <th>ACCOUNT</th>
                      <th>PLAN</th>
                      <th>PRODUCT ACCESS</th>
                      <th>LAST LOGIN</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productUsers.map((target) => (
                      <tr key={target.id}>
                        <td>
                          <strong>{target.display_name || '—'}</strong>
                          <small>{target.email}</small>
                        </td>
                        <td>{String(target.account_status || 'active').toUpperCase()}</td>
                        <td>{String(target.plan || '—').toUpperCase()}</td>
                        <td>{String(target.access_status || 'active').toUpperCase()}</td>
                        <td>{target.last_login_at ? new Date(Number(target.last_login_at)).toLocaleString() : '—'}</td>
                        <td>
                          {target.role === 'owner' ? (
                            <span className="master-owner-tag">MASTER</span>
                          ) : (
                            <button
                              className="master-table-action"
                              disabled={productBusy}
                              onClick={() => changeProductAccess(
                                target,
                                target.access_status === 'active' ? 'suspended' : 'active'
                              )}
                            >
                              {target.access_status === 'active' ? 'KICK' : 'REACTIVATE'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!productUsers.length && (
                      <tr>
                        <td colSpan="6">No users have access to this product yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {view === 'dc-live-admin' && <DcLiveAdmin />}

        {view === 'health' && (
          <section className="master-placeholder">
            <p className="master-eyebrow">SYSTEM STATUS</p>
            <h2>One health view for all ICA SaaS</h2>
            <p>
              The central dashboard is ready to receive product health, company health,
              database status and service events. ScenePilot is already on the shared
              D1 layer; Urban Carrier OS and ICA Unified will feed this view as their super-admin
              layers are centralized.
            </p>

            <section className="master-stream-capacity">
              <div className="master-section-heading">
                <div>
                  <p className="master-eyebrow">STREAM ANGLEZ / SCENEPILOT</p>
                  <h2>Streaming capacity & load readiness</h2>
                </div>
              </div>

              <div className="master-stream-metrics">
                <article>
                  <span>STREAM ORIGIN</span>
                  <strong>{streamTelemetry?.originOnline ? 'ONLINE' : 'SERVER AGENT PENDING'}</strong>
                  <small>Debian RTMP / RTMPS origin</small>
                </article>
                <article>
                  <span>ACTIVE BROADCASTS</span>
                  <strong>{Number(streamTelemetry?.activeBroadcasts || 0)}</strong>
                  <small>Will update from the streaming server</small>
                </article>
                <article>
                  <span>LIVE VIEWERS</span>
                  <strong>{Number(streamTelemetry?.viewers || 0)}</strong>
                  <small>Viewer/CDN telemetry hook ready</small>
                </article>
                <article>
                  <span>OUTBOUND LOAD</span>
                  <strong>{Number(streamTelemetry?.outboundMbps || 0)} Mbps</strong>
                  <small>Origin network usage</small>
                </article>
              </div>

              <div className="master-capacity-table">
                <div className="master-capacity-head">
                  <span>LOAD TEST TARGETS</span>
                  <small>Planning estimate at ~6 Mbps per 1080p viewer if viewers hit the origin directly.</small>
                </div>
                {viewerTiers.map((tier) => (
                  <div className="master-capacity-row" key={tier.viewers}>
                    <strong>{tier.viewers} VIEWERS</strong>
                    <span>≈ {tier.mbps} Mbps outbound direct-origin load</span>
                    <b>{tier.viewers <= 50 ? 'EARLY TEST' : tier.viewers === 100 ? 'TARGET TEST' : 'CDN RECOMMENDED'}</b>
                  </div>
                ))}
              </div>

              <div className="master-capacity-note">
                ICA Master is now ready to display real stream-server telemetry. When the Debian RTMP/RTMPS server is installed,
                its health/metrics feed can populate these cards so you can watch viewers, bandwidth, active broadcasts and capacity
                before customers feel a problem.
              </div>
            </section>

            <div className="master-health-grid">
              {products.map((product) => {
                const serviceHealth = summary?.health?.[product.slug]
                const checks = [
                  ['FRONTEND', serviceHealth?.frontend],
                  ['API', serviceHealth?.api],
                  ['DATABASE', serviceHealth?.database],
                ]

                return (
                  <article key={product.id} className="master-health-card">
                    <div className="master-health-card-head">
                      <div>
                        <i className={serviceHealth?.online ? 'good' : serviceHealth ? 'bad' : ''} />
                        <strong>{product.name}</strong>
                      </div>
                      <span>{serviceHealth?.online ? 'HEALTHY' : serviceHealth ? 'CHECK REQUIRED' : 'CHECKING'}</span>
                    </div>

                    <div className="master-health-checks">
                      {checks.map(([label, check]) => (
                        <div key={label}>
                          <span className="master-health-check-name">{label}</span>
                          <span className={`master-health-light ${check?.ok ? 'good' : check ? 'bad' : ''}`} />
                          <strong>{check?.ok ? 'ONLINE' : check ? 'DOWN' : 'WAITING'}</strong>
                          <small>
                            {check?.status ? `HTTP ${check.status}` : 'NO RESPONSE'}
                            {Number.isFinite(check?.latencyMs) ? ` • ${check.latencyMs}ms` : ''}
                          </small>
                        </div>
                      ))}
                    </div>

                    <div className="master-health-footer">
                      <span>
                        LAST CHECK {serviceHealth?.checkedAt
                          ? new Date(Number(serviceHealth.checkedAt)).toLocaleTimeString()
                          : '—'}
                      </span>
                    </div>
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
