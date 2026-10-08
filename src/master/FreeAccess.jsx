import React, { useEffect, useState } from 'react'

const names = { 'ica-control': 'ICA Control', 'ica-unified': 'ICA Unified', scenepilot: 'Urban Director Studio' }

export default function FreeAccess({ api, initialProduct = 'all' }) {
  const [email, setEmail] = useState('')
  const [product, setProduct] = useState(initialProduct)
  const [duration, setDuration] = useState('ongoing')
  const [date, setDate] = useState('')
  const [grants, setGrants] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function load() {
    const data = await api('/platform/free-access')
    setGrants(data.grants || [])
  }
  useEffect(() => { load().catch(err => setError(err.message)) }, [])
  async function save(event) {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      const expiresAt = duration === 'ongoing' ? null : new Date(`${date}T23:59:59`).getTime()
      await api('/platform/free-access', { method: 'POST', body: JSON.stringify({ email, products: product === 'all' ? 'all' : [product], expiresAt }) })
      setMessage(`Saved: ${email.trim().toLowerCase()} — Comped, no payment required. ${product === 'all' ? 'All three products.' : names[product] + '.'}`)
      await load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function revoke(grant) {
    setBusy(true); setError(''); setMessage('')
    try {
      await api('/platform/free-access', { method: 'PATCH', body: JSON.stringify({ email: grant.email, products: [grant.product_slug] }) })
      setMessage(`Free access revoked for ${grant.email} on ${names[grant.product_slug]}.`)
      await load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  function edit(grant) {
    setEmail(grant.email); setProduct(grant.product_slug)
    setDuration(grant.expires_at ? 'until' : 'ongoing')
    if (grant.expires_at) {
      const d = new Date(Number(grant.expires_at))
      setDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
    } else setDate('')
    setMessage('Update the access above and save.'); setError('')
  }
  return <section className="master-table-card master-free-access">
    <p className="master-eyebrow">FREE ACCESS</p>
    <h2>Give free access</h2>
    <p>Enter their sign-in email, choose a product, and save. They can already have an account or register later with that same email. No card or Stripe checkout is required for comped access.</p>
    <form onSubmit={save} className="master-free-form">
      <label>Email address<input type="email" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)} placeholder="person@example.com" /></label>
      <label>Product<select value={product} onChange={e=>setProduct(e.target.value)}><option value="all">All three products</option>{Object.entries(names).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
      <label>Access length<select value={duration} onChange={e=>setDuration(e.target.value)}><option value="ongoing">Ongoing</option><option value="until">Until a date</option></select></label>
      {duration==='until' && <label>Expiration date<input type="date" required value={date} onChange={e=>setDate(e.target.value)} /></label>}
      <button disabled={busy}>{busy ? 'Saving…' : 'GIVE FREE ACCESS'}</button>
    </form>
    <p>Access follows the verified sign-in email and the product’s normal account setup. For Unified, an organization owner’s grant covers their organization; a member’s grant stays personal. This grants customer access, never administrator permissions. Existing paid subscriptions are not cancelled by a free-access grant.</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <div className="master-table-wrap"><table><thead><tr><th>EMAIL</th><th>PRODUCT</th><th>STATUS</th><th>EXPIRES</th><th>ACTION</th></tr></thead><tbody>
      {grants.map(g=>{const active=g.status==='active'&&(!g.expires_at||Number(g.expires_at)>Date.now());return <tr key={`${g.email}:${g.product_slug}`}><td>{g.email}</td><td>{names[g.product_slug]}</td><td>{active ? 'Comped — no payment required' : g.status==='revoked' ? 'Revoked' : 'Expired'}</td><td>{g.expires_at ? new Date(Number(g.expires_at)).toLocaleString() : 'Ongoing'}</td><td><button type="button" disabled={busy} onClick={()=>edit(g)}>{active ? 'EDIT' : 'RESTORE'}</button>{active&&<button type="button" disabled={busy} onClick={()=>revoke(g)}>REVOKE FREE ACCESS</button>}</td></tr>})}
      {!grants.length&&<tr><td colSpan={5}>No free-access grants saved yet.</td></tr>}
    </tbody></table></div>
  </section>
}
