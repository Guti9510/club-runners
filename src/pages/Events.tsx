import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredAuth, isTokenValid, clearAuth } from '../lib/strava'
import { CLUB_KEY } from './Onboarding'
import { supabase } from '../lib/supabase'

interface RunEvent {
  id: string
  title: string
  date: string
  type: 'race' | 'group_run' | 'track' | 'social' | 'other'
  distances: string[]   // e.g. ['5K', '10K', 'Half Marathon']
  customDistance?: number
  location?: string
  description?: string
  isClub: boolean
  creatorId: string
  creatorName: string
  attendees: { id: string; name: string; distance?: string }[]
  results: { id: string; name: string; distance?: string; timeSeconds?: number; notes?: string }[]
}

const PRESET_DISTANCES = ['5K', '10K', 'Half Marathon', 'Marathon']

const fromRow = (row: any): RunEvent => ({
  id: row.id,
  title: row.title,
  date: row.date,
  type: row.type,
  distances: row.distances ?? [],
  customDistance: row.custom_distance,
  location: row.location,
  description: row.description,
  isClub: row.is_club,
  creatorId: row.creator_id,
  creatorName: row.creator_name,
  attendees: row.attendees ?? [],
  results: row.results ?? [],
})

const toRow = (e: RunEvent, clubName?: string | null) => ({
  id: e.id,
  title: e.title,
  date: e.date,
  type: e.type,
  distances: e.distances,
  custom_distance: e.customDistance ?? null,
  location: e.location ?? null,
  description: e.description ?? null,
  is_club: e.isClub,
  club_name: clubName ?? null,
  creator_id: e.creatorId,
  creator_name: e.creatorName,
  attendees: e.attendees,
  results: e.results,
})

const EVENT_TYPES = [
  { key: 'race', label: '🏁 Race', color: '#ef4444' },
  { key: 'group_run', label: '🏃 Group Run', color: '#FC4C02' },
  { key: 'track', label: '🔄 Track Session', color: '#3b82f6' },
  { key: 'social', label: '🍺 Social Run', color: '#10b981' },
  { key: 'other', label: '📌 Other', color: '#a78bfa' },
]

const typeColor = (type: string) => EVENT_TYPES.find(t => t.key === type)?.color ?? '#94a3b8'
const typeLabel = (type: string) => EVENT_TYPES.find(t => t.key === type)?.label ?? type

const fmtTime = (secs: number) => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
  return `${m}:${s.toString().padStart(2,'0')}`
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '20px',
}

export default function Events() {
  const navigate = useNavigate()
  const { athlete } = getStoredAuth()
  const clubName = localStorage.getItem(CLUB_KEY)

  const [events, setEvents] = useState<RunEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<RunEvent | null>(null)
  const [showResultForm, setShowResultForm] = useState(false)

  // Create form state
  const [form, setForm] = useState({
    title: '', date: '', type: 'group_run' as RunEvent['type'],
    distances: [] as string[], customDistance: '',
    location: '', description: '', isClub: true,
  })

  const toggleDistance = (d: string) =>
    setForm(f => ({
      ...f,
      distances: f.distances.includes(d) ? f.distances.filter(x => x !== d) : [...f.distances, d],
    }))

  // Result form
  const [resultTime, setResultTime] = useState({ h: '', m: '', s: '' })
  const [resultNotes, setResultNotes] = useState('')
  const [resultDistance, setResultDistance] = useState('')

  useEffect(() => {
    if (!isTokenValid()) { clearAuth(); navigate('/'); return }
    supabase.from('events').select('*').order('date', { ascending: true })
      .then(({ data }) => { if (data) setEvents(data.map(fromRow)) })
      .finally(() => setLoadingEvents(false))
  }, [])

  const now = new Date()
  const upcoming = events.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const past = events.filter(e => new Date(e.date) < now).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const athleteId = athlete?.id?.toString() ?? 'unknown'
  const athleteName = `${athlete?.firstname ?? ''} ${athlete?.lastname ?? ''}`.trim()

  const handleCreate = async () => {
    if (!form.title || !form.date) return
    const allDistances = [
      ...form.distances,
      ...(form.customDistance ? [`${form.customDistance}km`] : []),
    ]
    const newEvent: RunEvent = {
      id: Date.now().toString(),
      title: form.title,
      date: form.date,
      type: form.type,
      distances: allDistances,
      customDistance: form.customDistance ? parseFloat(form.customDistance) : undefined,
      location: form.location || undefined,
      description: form.description || undefined,
      isClub: form.isClub,
      creatorId: athleteId,
      creatorName: athleteName,
      attendees: [{ id: athleteId, name: athleteName }],
      results: [],
    }
    const { error } = await supabase.from('events').insert(toRow(newEvent, clubName))
    if (!error) setEvents(prev => [...prev, newEvent])
    setShowCreate(false)
    setForm({ title: '', date: '', type: 'group_run', distances: [], customDistance: '', location: '', description: '', isClub: true })
  }

  const toggleRSVP = async (eventId: string) => {
    const event = events.find(e => e.id === eventId)
    if (!event) return
    const already = event.attendees.find(a => a.id === athleteId)
    const newAttendees = already
      ? event.attendees.filter(a => a.id !== athleteId)
      : [...event.attendees, { id: athleteId, name: athleteName }]
    const { error } = await supabase.from('events').update({ attendees: newAttendees }).eq('id', eventId)
    if (!error) {
      const updated = events.map(e => e.id === eventId ? { ...e, attendees: newAttendees } : e)
      setEvents(updated)
      if (selectedEvent?.id === eventId) setSelectedEvent(updated.find(e => e.id === eventId) ?? null)
    }
  }

  const submitResult = async (eventId: string) => {
    const h = parseInt(resultTime.h || '0')
    const m = parseInt(resultTime.m || '0')
    const s = parseInt(resultTime.s || '0')
    const totalSecs = h * 3600 + m * 60 + s
    const event = events.find(e => e.id === eventId)
    if (!event) return
    const result = { id: athleteId, name: athleteName, distance: resultDistance || undefined, timeSeconds: totalSecs > 0 ? totalSecs : undefined, notes: resultNotes || undefined }
    const existing = event.results.findIndex(r => r.id === athleteId)
    const newResults = existing >= 0
      ? event.results.map((r, i) => i === existing ? result : r)
      : [...event.results, result]
    const { error } = await supabase.from('events').update({ results: newResults }).eq('id', eventId)
    if (!error) {
      const updated = events.map(e => e.id === eventId ? { ...e, results: newResults } : e)
      setEvents(updated)
      setSelectedEvent(updated.find(e => e.id === eventId) ?? null)
    }
    setShowResultForm(false)
    setResultTime({ h: '', m: '', s: '' })
    setResultNotes('')
    setResultDistance('')
  }

  const deleteEvent = async (eventId: string) => {
    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (!error) setEvents(prev => prev.filter(e => e.id !== eventId))
    setSelectedEvent(null)
  }

  const displayList = tab === 'upcoming' ? upcoming : past

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Inter', sans-serif", color: 'white' }}>
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px' }}>Events 🗓️</h1>
            <p style={{ color: '#94a3b8', margin: 0 }}>
              {clubName ? `Individual & ${clubName} club events` : 'Track races, group runs & more'}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', background: '#FC4C02', color: 'white',
            border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
          }}>
            + Create Event
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
          {(['upcoming', 'past'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: tab === t ? '700' : '400', fontSize: '0.85rem',
              background: tab === t ? '#FC4C02' : 'transparent',
              color: tab === t ? 'white' : '#94a3b8',
            }}>
              {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </button>
          ))}
        </div>

        {/* Events List */}
        {loadingEvents ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>Loading events...</div>
        ) : displayList.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
              {tab === 'upcoming' ? '🗓️' : '🏁'}
            </div>
            <div style={{ fontWeight: '700', marginBottom: '8px' }}>
              {tab === 'upcoming' ? 'No upcoming events' : 'No past events'}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
              {tab === 'upcoming' ? 'Create an event to get started!' : 'Past events will appear here.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayList.map(event => {
              const isAttending = event.attendees.some(a => a.id === athleteId)
              const myResult = event.results.find(r => r.id === athleteId)
              const avgTime = event.results.filter(r => r.timeSeconds).length > 0
                ? event.results.filter(r => r.timeSeconds).reduce((s, r) => s + (r.timeSeconds ?? 0), 0) / event.results.filter(r => r.timeSeconds).length
                : null
              const daysUntil = Math.ceil((new Date(event.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              const isPast = new Date(event.date) < now

              return (
                <div key={event.id} onClick={() => setSelectedEvent(event)} style={{
                  ...cardStyle,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  borderLeft: `4px solid ${typeColor(event.type)}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '800', fontSize: '1rem' }}>{event.title}</span>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: '600', padding: '2px 8px', borderRadius: '12px',
                          background: `${typeColor(event.type)}20`, color: typeColor(event.type),
                        }}>{typeLabel(event.type)}</span>
                        {event.isClub && <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>👥 Club</span>}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.82rem', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span>📅 {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {event.location && <span>📍 {event.location}</span>}
                        {event.distances?.length > 0 && <span>🏃 {event.distances.join(' · ')}</span>}
                        <span>👥 {event.attendees.length} going</span>
                        {event.results.length > 0 && <span>🏁 {event.results.length} results</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      {!isPast && (
                        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: daysUntil <= 7 ? '#f59e0b' : '#94a3b8' }}>
                          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days away`}
                        </div>
                      )}
                      {avgTime && (
                        <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '600' }}>
                          Avg: {fmtTime(Math.round(avgTime))}
                        </div>
                      )}
                      <div style={{
                        fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', fontWeight: '600',
                        background: isAttending ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                        color: isAttending ? '#10b981' : '#94a3b8',
                      }}>
                        {isAttending ? '✓ Going' : 'Not going'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Create Event Modal */}
        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
            <div style={{ background: '#1e293b', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: '1.2rem' }}>Create Event</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Event Name *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Saturday Long Run" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Date *</label>
                  <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Type</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {EVENT_TYPES.map(t => (
                      <button key={t.key} onClick={() => setForm(f => ({ ...f, type: t.key as RunEvent['type'] }))} style={{
                        padding: '6px 12px', borderRadius: '8px', border: `1px solid ${form.type === t.key ? t.color : 'rgba(255,255,255,0.1)'}`,
                        background: form.type === t.key ? `${t.color}20` : 'transparent',
                        color: form.type === t.key ? t.color : '#94a3b8', cursor: 'pointer', fontSize: '0.8rem',
                      }}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Distances</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {PRESET_DISTANCES.map(d => (
                      <button key={d} onClick={() => toggleDistance(d)} type="button" style={{
                        padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600',
                        border: `1px solid ${form.distances.includes(d) ? '#FC4C02' : 'rgba(255,255,255,0.1)'}`,
                        background: form.distances.includes(d) ? 'rgba(252,76,2,0.2)' : 'transparent',
                        color: form.distances.includes(d) ? '#FC4C02' : '#94a3b8',
                      }}>{d}</button>
                    ))}
                  </div>
                  <input type="number" value={form.customDistance} onChange={e => setForm(f => ({ ...f, customDistance: e.target.value }))} placeholder="Custom distance (km)" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Location</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City or venue" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details, meeting point, etc." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                {clubName && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={form.isClub} onChange={e => setForm(f => ({ ...f, isClub: e.target.checked }))} />
                    <span style={{ color: '#94a3b8' }}>Club event ({clubName})</span>
                  </label>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={handleCreate} disabled={!form.title || !form.date} style={{
                  flex: 1, padding: '12px', background: form.title && form.date ? '#FC4C02' : 'rgba(255,255,255,0.1)',
                  color: form.title && form.date ? 'white' : '#64748b',
                  border: 'none', borderRadius: '10px', fontWeight: '700', cursor: form.title && form.date ? 'pointer' : 'default',
                }}>Create Event</button>
                <button onClick={() => setShowCreate(false)} style={{
                  flex: 1, padding: '12px', background: 'rgba(255,255,255,0.07)',
                  color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer',
                }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
            <div style={{ background: '#1e293b', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '520px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
              {/* Event header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1.2rem', marginBottom: '4px' }}>{selectedEvent.title}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: `${typeColor(selectedEvent.type)}20`, color: typeColor(selectedEvent.type) }}>{typeLabel(selectedEvent.type)}</span>
                    {selectedEvent.isClub && <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>👥 Club</span>}
                  </div>
                </div>
                <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', fontSize: '0.85rem', color: '#94a3b8' }}>
                <div>📅 {new Date(selectedEvent.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                {selectedEvent.location && <div>📍 {selectedEvent.location}</div>}
                {selectedEvent.distances?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedEvent.distances.map(d => (
                      <span key={d} style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(252,76,2,0.12)', color: '#FC4C02', fontWeight: '600' }}>🏃 {d}</span>
                    ))}
                  </div>
                )}
                {selectedEvent.description && <div style={{ color: '#cbd5e1', marginTop: '4px' }}>{selectedEvent.description}</div>}
              </div>

              {/* RSVP */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: '700', marginBottom: '10px', fontSize: '0.9rem' }}>
                  👥 Who's Going ({selectedEvent.attendees.length})
                </div>
                {selectedEvent.attendees.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {selectedEvent.distances?.length > 0
                      ? selectedEvent.distances.map(dist => {
                          const going = selectedEvent.attendees.filter(a => a.distance === dist)
                          if (going.length === 0) return null
                          return (
                            <div key={dist}>
                              <div style={{ fontSize: '0.75rem', color: '#FC4C02', fontWeight: '700', marginBottom: '4px' }}>{dist}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {going.map(a => (
                                  <span key={a.id} style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.07)', color: a.id === athleteId ? '#FC4C02' : '#cbd5e1' }}>
                                    {a.name}{a.id === athleteId ? ' (you)' : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })
                      : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {selectedEvent.attendees.map(a => (
                            <span key={a.id} style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.07)', color: a.id === athleteId ? '#FC4C02' : '#cbd5e1' }}>
                              {a.name}{a.id === athleteId ? ' (you)' : ''}
                            </span>
                          ))}
                        </div>
                      )
                    }
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '10px' }}>No one yet — be the first!</div>
                )}

                {selectedEvent.distances?.length > 0 && !selectedEvent.attendees.some(a => a.id === athleteId) ? (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>Which distance are you running?</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedEvent.distances.map(d => (
                        <button key={d} onClick={async () => {
                          const newAttendees = [...selectedEvent.attendees, { id: athleteId, name: athleteName, distance: d }]
                          const { error } = await supabase.from('events').update({ attendees: newAttendees }).eq('id', selectedEvent.id)
                          if (!error) {
                            const updated = events.map(e => e.id !== selectedEvent.id ? e : { ...e, attendees: newAttendees })
                            setEvents(updated)
                            setSelectedEvent(updated.find(e => e.id === selectedEvent.id) ?? null)
                          }
                        }} style={{
                          padding: '7px 16px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.3)',
                          background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
                        }}>✓ {d}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => toggleRSVP(selectedEvent.id)} style={{
                    padding: '8px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
                    background: selectedEvent.attendees.some(a => a.id === athleteId) ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                    color: selectedEvent.attendees.some(a => a.id === athleteId) ? '#ef4444' : '#10b981',
                  }}>
                    {selectedEvent.attendees.some(a => a.id === athleteId) ? "✗ Can't make it" : "✓ I'm going!"}
                  </button>
                )}
              </div>

              {/* Results (past events) */}
              {new Date(selectedEvent.date) < now && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: '700', marginBottom: '10px', fontSize: '0.9rem' }}>
                    🏁 Results ({selectedEvent.results.length})
                  </div>
                  {selectedEvent.results.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
                      {(selectedEvent.distances?.length > 0
                        ? selectedEvent.distances
                        : [undefined]
                      ).map(dist => {
                        const distResults = selectedEvent.results.filter(r => dist ? r.distance === dist : true)
                        if (distResults.length === 0) return null
                        const withTime = distResults.filter(r => r.timeSeconds)
                        const avg = withTime.length > 1
                          ? Math.round(withTime.reduce((s, r) => s + (r.timeSeconds ?? 0), 0) / withTime.length)
                          : null
                        return (
                          <div key={dist ?? 'all'}>
                            {dist && <div style={{ fontSize: '0.75rem', color: '#FC4C02', fontWeight: '700', marginBottom: '6px' }}>{dist}</div>}
                            {distResults.map(r => (
                              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.85rem', color: r.id === athleteId ? '#FC4C02' : 'white' }}>{r.name}{r.id === athleteId ? ' (you)' : ''}</span>
                                <div style={{ textAlign: 'right' }}>
                                  {r.timeSeconds ? <div style={{ fontWeight: '700', color: '#10b981' }}>{fmtTime(r.timeSeconds)}</div> : null}
                                  {r.notes && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.notes}</div>}
                                </div>
                              </div>
                            ))}
                            {avg && <div style={{ fontSize: '0.78rem', color: '#94a3b8', padding: '2px 12px' }}>Club avg: {fmtTime(avg)}</div>}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {!showResultForm ? (
                    <button onClick={() => setShowResultForm(true)} style={{
                      padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(252,76,2,0.3)',
                      background: 'rgba(252,76,2,0.1)', color: '#FC4C02', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
                    }}>
                      + Log my result
                    </button>
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px' }}>
                      {selectedEvent.distances?.length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Your distance</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {selectedEvent.distances.map(d => (
                              <button key={d} onClick={() => setResultDistance(d)} type="button" style={{
                                padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                                border: `1px solid ${resultDistance === d ? '#FC4C02' : 'rgba(255,255,255,0.1)'}`,
                                background: resultDistance === d ? 'rgba(252,76,2,0.2)' : 'transparent',
                                color: resultDistance === d ? '#FC4C02' : '#94a3b8',
                              }}>{d}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>Your finish time (optional)</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px' }}>
                        <input type="number" value={resultTime.h} onChange={e => setResultTime(t => ({ ...t, h: e.target.value }))} placeholder="h" min="0" style={{ ...inputStyle, width: '50px', textAlign: 'center', padding: '6px' }} />
                        <span style={{ color: '#64748b' }}>:</span>
                        <input type="number" value={resultTime.m} onChange={e => setResultTime(t => ({ ...t, m: e.target.value }))} placeholder="mm" min="0" max="59" style={{ ...inputStyle, width: '50px', textAlign: 'center', padding: '6px' }} />
                        <span style={{ color: '#64748b' }}>:</span>
                        <input type="number" value={resultTime.s} onChange={e => setResultTime(t => ({ ...t, s: e.target.value }))} placeholder="ss" min="0" max="59" style={{ ...inputStyle, width: '50px', textAlign: 'center', padding: '6px' }} />
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>h:mm:ss</span>
                      </div>
                      <input value={resultNotes} onChange={e => setResultNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inputStyle, marginBottom: '10px' }} />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => submitResult(selectedEvent.id)} style={{ flex: 1, padding: '8px', background: '#FC4C02', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>Save</button>
                        <button onClick={() => setShowResultForm(false)} style={{ flex: 1, padding: '8px', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delete */}
              {selectedEvent.creatorId === athleteId && (
                <button onClick={() => deleteEvent(selectedEvent.id)} style={{
                  padding: '8px 14px', background: 'transparent', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem',
                }}>
                  Delete event
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'white',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box',
}
