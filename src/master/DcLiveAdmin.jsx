import React, { useEffect, useMemo, useState } from 'react'

const DC_LIVE_API_URL =
  import.meta.env.VITE_DC_LIVE_API_URL ||
  'https://dc-live-api.ryanedavis.workers.dev'

function getMasterToken() {
  return localStorage.getItem('ica_master_token') || ''
}

async function dcApi(path, options = {}) {
  const token = getMasterToken()
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  if (!(options.body instanceof Blob) && !(options.body instanceof File) && options.body != null) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  const response = await fetch(`${DC_LIVE_API_URL}${path}`, {
    ...options,
    headers,
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : { error: await response.text().catch(() => '') }

  if (!response.ok) {
    throw new Error(data.error || `DC Live request failed (${response.status}).`)
  }

  return data
}

function bytes(value) {
  const size = Number(value || 0)
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function eventToPayload(event, statusOverride) {
  return {
    slug: event.slug || '',
    title: event.title || '',
    description: event.description || '',
    status: statusOverride || event.status || 'draft',
    accessType: event.accessType || 'free',
    priceCents: Number(event.priceCents || 0),
    currency: event.currency || 'usd',
    rentalHours: event.rentalHours == null ? 48 : Number(event.rentalHours),
    startsAt: event.startsAt == null ? null : Number(event.startsAt),
    streamRoom: event.streamRoom || event.slug || 'dc-live',
    posterKey: event.posterKey || '',
    trailerKey: event.trailerKey || '',
  }
}

const EMPTY_FORM = {
  id: '',
  slug: '',
  title: '',
  description: '',
  status: 'draft',
  accessType: 'free',
  priceCents: 0,
  currency: 'usd',
  rentalHours: 48,
  startsAt: '',
  streamRoom: '',
  posterKey: '',
  trailerKey: '',
}

export default function DcLiveAdmin() {
  const [events, setEvents] = useState([])
  const [assets, setAssets] = useState([])
  const [storageBytes, setStorageBytes] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selected = useMemo(
    () => events.find((event) => event.id === form.id) || null,
    [events, form.id]
  )

  async function load() {
    setBusy(true)
    setError('')
    try {
      const [eventData, assetData] = await Promise.all([
        dcApi('/api/admin/events'),
        dcApi('/api/admin/assets'),
      ])
      setEvents(eventData.events || [])
      setAssets(assetData.assets || [])
      setStorageBytes(Number(assetData.totalBytes || 0))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function editEvent(event) {
    setMessage('')
    setError('')
    setForm({
      id: event.id || '',
      slug: event.slug || '',
      title: event.title || '',
      description: event.description || '',
      status: event.status || 'draft',
      accessType: event.accessType || 'free',
      priceCents: Number(event.priceCents || 0),
      currency: event.currency || 'usd',
      rentalHours: event.rentalHours == null ? 48 : Number(event.rentalHours),
      startsAt: event.startsAt ? new Date(Number(event.startsAt)).toISOString().slice(0, 16) : '',
      streamRoom: event.streamRoom || event.slug || '',
      posterKey: event.posterKey || '',
      trailerKey: event.trailerKey || '',
    })
  }

  function newEvent() {
    setForm(EMPTY_FORM)
    setMessage('')
    setError('')
  }

  async function saveEvent(event) {
    event?.preventDefault?.()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const payload = {
        ...eventToPayload(form),
        startsAt: form.startsAt ? new Date(form.startsAt).getTime() : null,
      }
      const data = await dcApi(
        form.id ? `/api/admin/events/${encodeURIComponent(form.id)}` : '/api/admin/events',
        {
          method: form.id ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        }
      )
      setMessage(form.id ? 'Event updated.' : 'Event created.')
      await load()
      if (data.event) {
        const fresh = (await dcApi('/api/admin/events')).events?.find((item) => item.id === data.event.id)
        if (fresh) editEvent(fresh)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function changePublish(event, publish) {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await dcApi(`/api/admin/events/${encodeURIComponent(event.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(eventToPayload(event, publish ? 'scheduled' : 'draft')),
      })
      setMessage(publish ? `${event.title} is published on DC Live.` : `${event.title} is unpublished.`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function changeReview(event, reviewStatus) {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await dcApi(`/api/admin/submissions/${encodeURIComponent(event.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewStatus }),
      })
      setMessage(
        reviewStatus === 'approved'
          ? `${event.title} approved and published.`
          : reviewStatus === 'rejected'
            ? `${event.title} rejected and kept off the public site.`
            : `${event.title} returned to pending review.`
      )
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function previewEvent(event) {
    setError('')
    try {
      const data = await dcApi(`/api/admin/events/${encodeURIComponent(event.id)}/preview`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      if (data.playbackUrl) {
        window.open(`${DC_LIVE_API_URL}${data.playbackUrl}`, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteEvent(event) {
    if (!window.confirm(`Delete "${event.title}" and its stored DC Live media? This cannot be undone.`)) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await dcApi(`/api/admin/events/${encodeURIComponent(event.id)}`, { method: 'DELETE' })
      if (form.id === event.id) setForm(EMPTY_FORM)
      setMessage(`${event.title} deleted.`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function uploadFile(file, kind) {
    if (!file) return
    if (!form.id || !form.slug) {
      setError('Save the event first, then upload its media.')
      return
    }

    const lower = file.name.toLowerCase()
    let key = ''
    if (kind === 'program') {
      if (!lower.endsWith('.mp4')) {
        setError('Finished Program upload must be an MP4 file.')
        return
      }
      key = `programs/${form.slug}/master.mp4`
    } else if (kind === 'poster') {
      const ext = lower.endsWith('.webp') ? 'webp' : lower.endsWith('.png') ? 'png' : 'jpg'
      key = `posters/${form.slug}.${ext}`
    } else {
      key = `trailers/${form.slug}.mp4`
    }

    setUploading(kind)
    setMessage('')
    setError('')

    try {
      await dcApi(`/api/admin/assets/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })

      if (kind === 'poster' || kind === 'trailer') {
        const payload = eventToPayload({
          ...form,
          posterKey: kind === 'poster' ? key : form.posterKey,
          trailerKey: kind === 'trailer' ? key : form.trailerKey,
          startsAt: form.startsAt ? new Date(form.startsAt).getTime() : null,
        })
        await dcApi(`/api/admin/events/${encodeURIComponent(form.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      }

      setMessage(
        kind === 'program'
          ? 'Finished Program uploaded to DC Live storage.'
          : kind === 'poster'
            ? 'Poster uploaded and attached.'
            : 'Trailer uploaded and attached.'
      )
      await load()
      const fresh = (await dcApi('/api/admin/events')).events?.find((item) => item.id === form.id)
      if (fresh) editEvent(fresh)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading('')
    }
  }

  async function deleteAsset(asset) {
    if (!window.confirm(`Delete ${asset.key} from DC Live storage?`)) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await dcApi(`/api/admin/assets/${encodeURIComponent(asset.key)}`, { method: 'DELETE' })
      setMessage(`${asset.key} deleted from storage.`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="dc-live-admin">
      <div className="dc-live-admin-hero">
        <div>
          <p className="master-eyebrow">DC LIVE / OWNER CONTENT CONTROL</p>
          <h2>Events, publishing & Cloudflare storage</h2>
          <p>
            Review ScenePilot creator submissions, preview finished Programs, approve or reject publishing,
            manage pricing, posters and trailers, and browse the R2 media bucket without leaving ICA Master.
          </p>
        </div>
        <div className="dc-live-storage-card">
          <span>R2 STORAGE</span>
          <strong>{bytes(storageBytes)}</strong>
          <small>{assets.length} OBJECTS</small>
          <button type="button" onClick={load} disabled={busy}>{busy ? 'REFRESHING…' : 'REFRESH'}</button>
        </div>
      </div>

      {error && <div className="master-error wide">{error}</div>}
      {message && <div className="dc-live-success">{message}</div>}

      <div className="dc-live-admin-grid">
        <section className="dc-live-panel">
          <div className="dc-live-panel-head">
            <div>
              <span>EVENTS</span>
              <strong>DC Live Home Screen</strong>
            </div>
            <button type="button" onClick={newEvent}>+ NEW EVENT</button>
          </div>

          <div className="dc-live-event-list">
            {events.length ? events.map((event) => (
              <article key={event.id} className={form.id === event.id ? 'selected' : ''}>
                <div className="dc-live-event-row">
                  <div>
                    <span className={event.reviewStatus === 'pending_review' || event.reviewStatus === 'rejected' || event.status === 'draft' ? 'unpublished' : 'published'}>
                      {event.reviewStatus === 'pending_review'
                        ? 'PENDING REVIEW'
                        : event.reviewStatus === 'rejected'
                          ? 'REJECTED'
                          : event.status === 'draft'
                            ? 'UNPUBLISHED'
                            : 'PUBLISHED'}
                    </span>
                    <strong>{event.title}</strong>
                    <small>{event.slug}</small>
                    {event.creatorEmail && (
                      <small>
                        SUBMITTED BY {event.creatorDisplayName || event.creatorEmail}
                        {event.sourceNetworkName ? ` • ${event.sourceNetworkName}` : ''}
                      </small>
                    )}
                  </div>
                  <div className="dc-live-event-badges">
                    <span>{event.accessType === 'paid' ? `$${(Number(event.priceCents || 0) / 100).toFixed(2)}` : 'FREE'}</span>
                    <span>{event.hasReplay ? 'REPLAY READY' : event.reviewStatus ? 'UPLOAD INCOMPLETE' : 'LIVE / NO REPLAY'}</span>
                  </div>
                </div>
                <div className="dc-live-event-actions">
                  <button type="button" onClick={() => editEvent(event)}>EDIT</button>
                  {event.hasReplay && (
                    <button type="button" onClick={() => previewEvent(event)}>PREVIEW</button>
                  )}
                  {event.reviewStatus === 'pending_review' || event.reviewStatus === 'rejected'
                    ? <>
                        <button
                          type="button"
                          className="publish"
                          disabled={!event.uploadComplete}
                          onClick={() => changeReview(event, 'approved')}
                        >
                          APPROVE & PUBLISH
                        </button>
                        {event.reviewStatus === 'pending_review' && (
                          <button type="button" className="unpublish" onClick={() => changeReview(event, 'rejected')}>REJECT</button>
                        )}
                      </>
                    : event.status === 'draft'
                      ? <button type="button" className="publish" onClick={() => changePublish(event, true)}>PUBLISH</button>
                      : <button type="button" className="unpublish" onClick={() => changePublish(event, false)}>UNPUBLISH</button>}
                  <button type="button" className="danger" onClick={() => deleteEvent(event)}>DELETE</button>
                </div>
              </article>
            )) : <div className="master-empty-box">No DC Live events yet.</div>}
          </div>
        </section>

        <section className="dc-live-panel">
          <div className="dc-live-panel-head">
            <div>
              <span>{form.id ? 'EDIT EVENT' : 'NEW EVENT'}</span>
              <strong>{form.title || 'Event setup'}</strong>
            </div>
          </div>

          {selected?.reviewStatus && (
            <div className="dc-live-submission-summary">
              <span>SCENEPILOT SUBMISSION</span>
              <strong>{selected.reviewStatus === 'pending_review' ? 'PENDING REVIEW' : selected.reviewStatus.toUpperCase()}</strong>
              <small>
                {selected.creatorDisplayName || selected.creatorEmail || 'ScenePilot creator'}
                {selected.sourceNetworkName ? ` • ${selected.sourceNetworkName}` : ''}
              </small>
              <small>{selected.uploadComplete ? 'PROGRAM UPLOAD COMPLETE' : 'PROGRAM UPLOAD INCOMPLETE'}</small>
            </div>
          )}

          <form className="dc-live-form" onSubmit={saveEvent}>
            <label>
              TITLE
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </label>
            <label>
              SLUG
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                placeholder="graduation-2026"
                required
                disabled={Boolean(form.id)}
              />
            </label>
            <label className="full">
              DESCRIPTION
              <textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label>
              ACCESS
              <select value={form.accessType} onChange={(e) => setForm({ ...form, accessType: e.target.value })}>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <label>
              PRICE
              <input
                type="number"
                step="0.01"
                min="0"
                value={(Number(form.priceCents || 0) / 100).toFixed(2)}
                onChange={(e) => setForm({ ...form, priceCents: Math.round(Number(e.target.value || 0) * 100) })}
              />
            </label>
            <label>
              RENTAL HOURS
              <input type="number" min="1" value={form.rentalHours} onChange={(e) => setForm({ ...form, rentalHours: e.target.value })} />
            </label>
            <label>
              START DATE / TIME
              <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </label>
            <label className="full">
              LIVE STREAM ROOM
              <input
                value={form.streamRoom}
                onChange={(e) => setForm({ ...form, streamRoom: e.target.value })}
                placeholder={form.slug || 'scene-room'}
                required
              />
            </label>

            <div className="dc-live-form-actions full">
              <button type="submit" disabled={busy}>{busy ? 'SAVING…' : form.id ? 'SAVE CHANGES' : 'CREATE EVENT'}</button>
              {form.id && <button type="button" className="secondary" onClick={newEvent}>CLEAR</button>}
            </div>
          </form>

          <div className="dc-live-media-upload">
            <h3>Media for this event</h3>
            <p>Save the event first. Program masters are stored at <code>programs/{form.slug || 'event-slug'}/master.mp4</code>.</p>
            <div className="dc-live-upload-grid">
              <label className={!form.id ? 'disabled' : ''}>
                <strong>FINISHED PROGRAM</strong>
                <small>MP4 replay / monetized master</small>
                <input
                  type="file"
                  accept="video/mp4"
                  disabled={!form.id || Boolean(uploading)}
                  onChange={(e) => uploadFile(e.target.files?.[0], 'program')}
                />
                <span>{uploading === 'program' ? 'UPLOADING…' : selected?.hasReplay ? 'REPLAY READY' : 'CHOOSE MP4'}</span>
              </label>
              <label className={!form.id ? 'disabled' : ''}>
                <strong>POSTER</strong>
                <small>JPG / PNG / WEBP</small>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!form.id || Boolean(uploading)}
                  onChange={(e) => uploadFile(e.target.files?.[0], 'poster')}
                />
                <span>{uploading === 'poster' ? 'UPLOADING…' : form.posterKey ? 'POSTER READY' : 'CHOOSE IMAGE'}</span>
              </label>
              <label className={!form.id ? 'disabled' : ''}>
                <strong>TRAILER</strong>
                <small>Optional MP4 preview</small>
                <input
                  type="file"
                  accept="video/mp4"
                  disabled={!form.id || Boolean(uploading)}
                  onChange={(e) => uploadFile(e.target.files?.[0], 'trailer')}
                />
                <span>{uploading === 'trailer' ? 'UPLOADING…' : form.trailerKey ? 'TRAILER READY' : 'CHOOSE MP4'}</span>
              </label>
            </div>
          </div>
        </section>
      </div>

      <section className="dc-live-panel dc-live-storage-browser">
        <div className="dc-live-panel-head">
          <div>
            <span>CLOUDFLARE R2</span>
            <strong>dc-live-media</strong>
          </div>
        </div>

        <div className="dc-live-storage-table">
          <div className="dc-live-storage-row heading">
            <span>OBJECT</span><span>SIZE</span><span>UPLOADED</span><span>ACTION</span>
          </div>
          {assets.length ? assets.map((asset) => (
            <div className="dc-live-storage-row" key={asset.key}>
              <code>{asset.key}</code>
              <span>{bytes(asset.size)}</span>
              <span>{asset.uploaded ? new Date(Number(asset.uploaded)).toLocaleString() : '—'}</span>
              <button type="button" onClick={() => deleteAsset(asset)}>DELETE</button>
            </div>
          )) : <div className="master-empty-box">The DC Live R2 bucket is empty.</div>}
        </div>
      </section>
    </section>
  )
}
