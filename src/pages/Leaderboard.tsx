import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredAuth, clearAuth, getAllActivities, getValidToken, formatDistance, formatDuration } from '../lib/strava'
import { CLUB_KEY, ONBOARDING_KEY } from './Onboarding'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { getClubWeeklyStats, syncMemberStats } from '../lib/syncStats'

type Period = 'week' | 'month' | 'year' | 'all'

const filterByPeriod = (activities: any[], period: Period) => {
  const now = new Date()
  return activities.filter(a => {
    const date = new Date(a.start_date_local)
    if (period === 'week') {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      return date >= startOfWeek
    }
    if (period === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    if (period === 'year') return date.getFullYear() === now.getFullYear()
    return true
  })
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ClubHub() {
  const navigate = useNavigate()
  const { athlete } = getStoredAuth()
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [editingClub, setEditingClub] = useState(false)
  const [clubInput, setClubInput] = useState('')
  const [clubWeekly, setClubWeekly] = useState<{ label: string; km: number; runs: number }[]>([])
  const [clubMembers, setClubMembers] = useState<{ name: string; profile: string | null; km: number; runs: number }[]>([])
  const [clubLoading, setClubLoading] = useState(true)

  const clubName = localStorage.getItem(CLUB_KEY)
  const isInClub = !!clubName

  const loadClubData = () => {
    setClubLoading(true)
    getClubWeeklyStats()
      .then(({ weeklyData, members }) => {
        setClubWeekly(weeklyData)
        setClubMembers(members)
      })
      .finally(() => setClubLoading(false))
  }

  useEffect(() => {
    getValidToken().then(token => {
      if (!token) { clearAuth(); navigate('/'); return }
      getAllActivities(token)
        .then(acts => {
          setActivities(acts)
          // Sync this member's data to Supabase so Club Hub is always up to date
          syncMemberStats(athlete, acts).then(loadClubData)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    })
    // Load club data immediately while activities fetch in background
    loadClubData()
  }, [])

  const filtered = filterByPeriod(activities, period)
  const runs = filtered.filter(a => a.type === 'Run')
  const totalDistance = runs.reduce((s, a) => s + a.distance, 0)
  const totalTime = runs.reduce((s, a) => s + a.moving_time, 0)
  const totalElevation = runs.reduce((s, a) => s + (a.total_elevation_gain || 0), 0)
  const totalRuns = runs.length

  const dayCounts = Array(7).fill(0)
  runs.forEach(a => dayCounts[new Date(a.start_date_local).getDay()]++)
  const dayData = DAY_NAMES.map((name, i) => ({ name, runs: dayCounts[i] }))
  const mostActiveDay = totalRuns > 0 ? DAY_NAMES[dayCounts.indexOf(Math.max(...dayCounts))] : '—'

  const handleSaveClub = () => {
    if (clubInput.trim()) {
      localStorage.setItem(CLUB_KEY, clubInput.trim())
      localStorage.setItem(ONBOARDING_KEY, 'true')
    }
    setEditingClub(false)
    setClubInput('')
    window.location.reload()
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
  }

  const clubTotalKm = clubMembers.reduce((s, m) => s + m.km, 0)
  const clubTotalRuns = clubMembers.reduce((s, m) => s + m.runs, 0)

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: 'white' }}>
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px' }}>
              {isInClub ? `🏃 ${clubName}` : '🏃 Club Hub'}
            </h1>
            <p style={{ color: '#94a3b8', margin: 0 }}>Club aggregate stats</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '4px', gap: '2px' }}>
              {(['week', 'month', 'year', 'all'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: period === p ? '700' : '400',
                  background: period === p ? '#FC4C02' : 'transparent',
                  color: period === p ? 'white' : '#94a3b8', transition: 'all 0.15s',
                }}>
                  {p === 'week' ? 'Week' : p === 'month' ? 'Month' : p === 'year' ? 'Year' : 'All'}
                </button>
              ))}
            </div>
            <button onClick={() => { setEditingClub(true); setClubInput(clubName || '') }} style={{
              padding: '8px 14px', background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
              color: '#94a3b8', fontSize: '0.82rem', cursor: 'pointer',
            }}>
              ✏️ {isInClub ? 'Edit Club' : 'Add Club'}
            </button>
          </div>
        </div>

        {/* Edit Club Modal */}
        {editingClub && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
            <div style={{ background: '#1e293b', borderRadius: '20px', padding: '32px', width: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>🏃 Set Your Club</h2>
              <input
                type="text" value={clubInput} onChange={e => setClubInput(e.target.value)}
                placeholder="e.g. Stamina" autoFocus
                style={{ width: '100%', padding: '12px', borderRadius: '10px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: '1rem', outline: 'none', marginBottom: '16px' }}
                onKeyDown={e => e.key === 'Enter' && handleSaveClub()}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSaveClub} style={{ flex: 1, padding: '10px', background: '#FC4C02', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingClub(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.07)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Club Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          {[
            { label: 'Club Members', value: clubMembers.length || '—', icon: '👥', color: '#FC4C02' },
            { label: 'Club Total km', value: clubTotalKm > 0 ? `${Math.round(clubTotalKm).toLocaleString()} km` : '—', icon: '📍', color: '#3b82f6' },
            { label: 'Club Total Runs', value: clubTotalRuns || '—', icon: '🏃', color: '#10b981' },
            { label: 'My Runs', value: loading ? '...' : totalRuns, icon: '🎯', color: '#f59e0b' },
            { label: 'Most Active Day', value: loading ? '...' : mostActiveDay, icon: '📅', color: '#a78bfa' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span>{icon}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{label}</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Club Weekly KM Chart */}
        <div style={{ ...cardStyle, marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Club Weekly Distance (km)</h3>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                {clubLoading ? 'Loading...' : clubMembers.length > 0 ? `${clubMembers.length} member${clubMembers.length !== 1 ? 's' : ''} synced` : 'No data yet — visit Dashboard to sync'}
              </div>
            </div>
            <button onClick={loadClubData} disabled={clubLoading} style={{
              padding: '6px 12px', fontSize: '0.78rem', borderRadius: '8px', cursor: clubLoading ? 'default' : 'pointer',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
            }}>
              {clubLoading ? '⏳' : '🔄 Refresh'}
            </button>
          </div>
          {clubWeekly.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={clubWeekly} margin={{ top: 24, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                  formatter={(val: any) => [`${val} km`, 'Club Distance']}
                />
                <Bar dataKey="km" fill="#FC4C02" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="km" position="top" style={{ fill: '#94a3b8', fontSize: '11px', fontWeight: '600' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              {clubLoading ? 'Loading club data...' : 'No data yet. Members need to visit their Dashboard to sync.'}
            </div>
          )}
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
          {/* Runs by Day */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: '700' }}>My Runs by Day</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dayData} margin={{ top: 24, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} formatter={(val: any) => [`${val} runs`, '']} />
                <Bar dataKey="runs" fill="#FC4C02" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="runs" position="top" formatter={(val: any) => val > 0 ? `${val}` : ''} style={{ fill: '#94a3b8', fontSize: '11px', fontWeight: '600' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Members List */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: '700' }}>Members (last 8 weeks)</h3>
            {clubMembers.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No members synced yet — visit Dashboard first.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {clubMembers.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', width: '16px' }}>{i + 1}</div>
                    {m.profile
                      ? <img src={m.profile} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
                      : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FC4C02', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>👤</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.runs} runs</div>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#3b82f6', flexShrink: 0 }}>{Math.round(m.km)} km</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Stats */}
        <div style={{ ...cardStyle }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: '700' }}>My Stats This {period === 'week' ? 'Week' : period === 'month' ? 'Month' : period === 'year' ? 'Year' : 'Time'}</h3>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {[
              { label: 'Distance', value: formatDistance(totalDistance), color: '#3b82f6' },
              { label: 'Time', value: formatDuration(totalTime), color: '#10b981' },
              { label: 'Elevation', value: `${Math.round(totalElevation).toLocaleString()}m`, color: '#a78bfa' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
