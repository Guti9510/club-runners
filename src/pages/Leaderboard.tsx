import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredAuth, isTokenValid, clearAuth, getAllActivities, formatDistance, formatDuration } from '../lib/strava'
import { CLUB_KEY, ONBOARDING_KEY } from './Onboarding'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts'

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
  const { athlete, accessToken } = getStoredAuth()
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [editingClub, setEditingClub] = useState(false)
  const [clubInput, setClubInput] = useState('')

  const clubName = localStorage.getItem(CLUB_KEY)
  const isInClub = !!clubName

  useEffect(() => {
    if (!isTokenValid() || !accessToken) { clearAuth(); navigate('/'); return }
    getAllActivities(accessToken)
      .then(setActivities)
      .catch(console.error)
      .finally(() => setLoading(false))
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

  const cities = [...new Set(runs.map(a => a.location_city).filter(Boolean))]

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

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Inter', sans-serif", color: 'white' }}>
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px' }}>
              {isInClub ? `🏃 ${clubName}` : '🏃 Club Hub'}
            </h1>
            <p style={{ color: '#94a3b8', margin: 0 }}>
              {isInClub ? "Your club's aggregated running stats" : 'Join or create a club to see group stats'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '4px', gap: '2px',
            }}>
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
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          }}>
            <div style={{ background: '#1e293b', borderRadius: '20px', padding: '32px', width: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>🏃 Set Your Club</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 16px' }}>
                Members who enter the same club name will be grouped together once the backend is live.
              </p>
              <input
                type="text"
                value={clubInput}
                onChange={e => setClubInput(e.target.value)}
                placeholder="e.g. Denver Trail Runners"
                autoFocus
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white', fontSize: '1rem', outline: 'none', marginBottom: '16px',
                }}
                onKeyDown={e => e.key === 'Enter' && handleSaveClub()}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSaveClub} style={{
                  flex: 1, padding: '10px', background: '#FC4C02', color: 'white',
                  border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer',
                }}>Save</button>
                <button onClick={() => setEditingClub(false)} style={{
                  flex: 1, padding: '10px', background: 'rgba(255,255,255,0.07)', color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer',
                }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* No Club Banner */}
        {!isInClub && (
          <div style={{
            ...cardStyle,
            background: 'rgba(252,76,2,0.08)', border: '1px solid rgba(252,76,2,0.2)',
            marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px',
          }}>
            <span style={{ fontSize: '2rem' }}>👥</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', marginBottom: '2px' }}>You're not in a club yet</div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Add your club name to see group stats. Club members who use the same name will be grouped together.
              </div>
            </div>
            <button onClick={() => { setEditingClub(true); setClubInput('') }} style={{
              padding: '10px 18px', background: '#FC4C02', color: 'white',
              border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>+ Add Club</button>
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          {[
            { label: 'Total Runs', value: loading ? '...' : totalRuns, icon: '🏃', color: '#FC4C02' },
            { label: 'Total Distance', value: loading ? '...' : formatDistance(totalDistance), icon: '📍', color: '#3b82f6' },
            { label: 'Total Time', value: loading ? '...' : formatDuration(totalTime), icon: '⏱️', color: '#10b981' },
            { label: 'Elevation', value: loading ? '...' : `${Math.round(totalElevation).toLocaleString()}m`, icon: '⛰️', color: '#a78bfa' },
            { label: 'Most Active Day', value: loading ? '...' : mostActiveDay, icon: '📅', color: '#f59e0b' },
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

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
          {/* Runs by Day */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: '700' }}>Runs by Day of Week</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dayData} margin={{ top: 24, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                  formatter={(val: any) => [`${val} runs`, '']}
                />
                <Bar dataKey="runs" fill="#FC4C02" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="runs"
                      position="top"
                      formatter={(val: number) => val > 0 ? `${val}` : ''}
                      style={{ fill: '#94a3b8', fontSize: '11px', fontWeight: '600' }}
                    />
                  </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Club Info */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: '700' }}>Club Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {athlete?.profile
                  ? <img src={athlete.profile} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
                  : <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#FC4C02', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                }
                <div>
                  <div style={{ fontWeight: '700' }}>{athlete?.firstname} {athlete?.lastname}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{isInClub ? clubName! : 'Solo Runner'}</div>
                </div>
              </div>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              {[
                { label: 'Member since', value: athlete?.created_at ? new Date(athlete.created_at).getFullYear() : '—', color: 'white' },
                { label: 'Cities run in', value: cities.length > 0 ? cities.length : '—', color: '#3b82f6' },
                { label: 'Avg per run', value: totalRuns > 0 ? formatDistance(totalDistance / totalRuns) : '—', color: '#10b981' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#94a3b8' }}>{label}</span>
                  <span style={{ fontWeight: '600', color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div style={{
          ...cardStyle,
          background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <span style={{ fontSize: '1.8rem' }}>🚀</span>
          <div>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>Multi-member clubs coming soon</div>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              When the backend is ready, all members of <strong style={{ color: 'white' }}>"{clubName || 'your club'}"</strong> will
              be automatically grouped and their stats aggregated here into one shared dashboard.
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
