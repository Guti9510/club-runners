import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  getStoredAuth, clearAuth, isTokenValid, getAllActivities,
  formatDistance, formatPace, formatDuration,
  getWeeklyStats, getPaceZones, thresholdFromTest3K, getTrainingInsights,
} from '../lib/strava'

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
    if (period === 'month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }
    if (period === 'year') {
      return date.getFullYear() === now.getFullYear()
    }
    return true
  })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { athlete, accessToken } = getStoredAuth()
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('year')
  const [show3KInput, setShow3KInput] = useState(false)
  const [test3KMin, setTest3KMin] = useState(() => localStorage.getItem('3k_min') || '')
  const [test3KSec, setTest3KSec] = useState(() => localStorage.getItem('3k_sec') || '')

  const threshold = (() => {
    const min = parseInt(test3KMin)
    const sec = parseInt(test3KSec)
    if (!isNaN(min) && !isNaN(sec)) return thresholdFromTest3K(min * 60 + sec)
    return undefined
  })()

  useEffect(() => {
    if (!isTokenValid() || !accessToken) {
      clearAuth()
      navigate('/')
      return
    }

    getAllActivities(accessToken)
      .then(setActivities)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filterByPeriod(activities, period)
  const runs = filtered.filter(a => a.type === 'Run')
  const totalDistance = runs.reduce((sum, a) => sum + a.distance, 0)
  const totalTime = runs.reduce((sum, a) => sum + a.moving_time, 0)
  const avgPace = totalDistance > 0 ? totalTime / (totalDistance / 1000) / 60 : 0
  const avgPaceMin = Math.floor(avgPace)
  const avgPaceSec = Math.round((avgPace - avgPaceMin) * 60)
  const totalElevation = runs.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0)

  const weeklyStats = getWeeklyStats(filtered)
  const paceZones = getPaceZones(filtered, threshold)
  const insights = getTrainingInsights(activities, threshold)

  const cardStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      fontFamily: "'Inter', sans-serif",
      color: 'white',
    }}>
      <div style={{ padding: '32px 32px 32px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Welcome */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px' }}>
              Welcome back, {athlete?.firstname}! 👋
            </h1>
            <p style={{ color: '#94a3b8', margin: 0 }}>Here's your running overview</p>
          </div>

          {/* Period Selector */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '4px',
            gap: '2px',
          }}>
            {([
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'year', label: 'This Year' },
              { key: 'all', label: 'All Time' },
            ] as { key: Period; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: period === key ? '700' : '400',
                  background: period === key ? '#FC4C02' : 'transparent',
                  color: period === key ? 'white' : '#94a3b8',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '28px',
        }}>
          {[
            { label: 'Total Runs', value: runs.length, icon: '🏃', color: '#FC4C02' },
            { label: 'Total Distance', value: formatDistance(totalDistance), icon: '📍', color: '#3b82f6' },
            { label: 'Total Time', value: formatDuration(totalTime), icon: '⏱️', color: '#10b981' },
            { label: 'Avg Pace', value: `${avgPaceMin}:${avgPaceSec.toString().padStart(2, '0')} /km`, icon: '⚡', color: '#f59e0b' },
            { label: 'Elevation', value: `${Math.round(totalElevation).toLocaleString()}m`, icon: '⛰️', color: '#a78bfa' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{label}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
          {/* Weekly Mileage Bar Chart */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: '700' }}>Weekly Distance (km)</h3>
            {loading ? (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={weeklyStats} margin={{ top: 24, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                    formatter={(val: any) => [`${Number(val).toFixed(1)} km`, 'Distance']}
                  />
                  <Bar dataKey="distance" fill="#FC4C02" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="distance"
                      position="top"
                      formatter={(val: number) => val > 0 ? `${val.toFixed(1)}` : ''}
                      style={{ fill: '#94a3b8', fontSize: '10px', fontWeight: '600' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pace Zone Pie Chart */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Pace Zones</h3>
              <button
                onClick={() => setShow3KInput(!show3KInput)}
                style={{
                  background: threshold ? '#FC4C02' : 'rgba(255,255,255,0.08)',
                  border: 'none', borderRadius: '8px', padding: '4px 10px',
                  color: threshold ? 'white' : '#94a3b8', fontSize: '0.75rem',
                  cursor: 'pointer', fontWeight: '600',
                }}
              >
                {threshold ? '✓ 3K Test Set' : '+ Add 3K Test'}
              </button>
            </div>

            {show3KInput && (
              <div style={{
                background: 'rgba(252,76,2,0.08)', border: '1px solid rgba(252,76,2,0.2)',
                borderRadius: '10px', padding: '12px', marginBottom: '12px',
              }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Enter your 3K test result to personalize pace zones:
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number" placeholder="Min" value={test3KMin}
                    onChange={e => { setTest3KMin(e.target.value); localStorage.setItem('3k_min', e.target.value) }}
                    style={{
                      width: '60px', padding: '6px 8px', borderRadius: '6px',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                      color: 'white', fontSize: '0.85rem', textAlign: 'center',
                    }}
                  />
                  <span style={{ color: '#94a3b8' }}>:</span>
                  <input
                    type="number" placeholder="Sec" value={test3KSec} min={0} max={59}
                    onChange={e => { setTest3KSec(e.target.value); localStorage.setItem('3k_sec', e.target.value) }}
                    style={{
                      width: '60px', padding: '6px 8px', borderRadius: '6px',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                      color: 'white', fontSize: '0.85rem', textAlign: 'center',
                    }}
                  />
                  <span style={{ color: '#64748b', fontSize: '0.78rem' }}>mm:ss</span>
                  {threshold && (
                    <span style={{ color: '#10b981', fontSize: '0.78rem', marginLeft: 'auto' }}>
                      Threshold: {Math.floor(threshold)}:{Math.round((threshold % 1) * 60).toString().padStart(2,'0')}/km
                    </span>
                  )}
                </div>
              </div>
            )}
            {loading ? (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                Loading...
              </div>
            ) : paceZones.length === 0 ? (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                No run data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={paceZones}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={70}
                    innerRadius={35}
                    label={({ name, percent }) =>
                      percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {paceZones.map((zone, idx) => (
                      <Cell key={idx} fill={zone.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                    formatter={(val: any) => [`${val} runs`, '']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Training Insights */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 16px' }}>Training Insights</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>

            {/* Easy/Hard Ratio */}
            <div style={{ ...cardStyle, borderLeft: `3px solid ${insights.easyHardRatio.status === 'good' ? '#10b981' : insights.easyHardRatio.status === 'too_hard' ? '#ef4444' : '#f59e0b'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>80/20 Run Balance</div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>Last 4 weeks · {insights.easyHardRatio.totalRuns} runs</div>
                </div>
                <span style={{ fontSize: '1.4rem' }}>⚖️</span>
              </div>
              {insights.easyHardRatio.status !== 'no_data' && (
                <>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', borderRadius: '6px', overflow: 'hidden', height: '10px' }}>
                    <div style={{ width: `${insights.easyHardRatio.easyPct}%`, background: '#10b981' }} />
                    <div style={{ width: `${insights.easyHardRatio.moderatePct}%`, background: '#f59e0b' }} />
                    <div style={{ width: `${insights.easyHardRatio.hardPct}%`, background: '#ef4444' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '8px' }}>
                    <span><span style={{ color: '#10b981', fontWeight: '700' }}>{insights.easyHardRatio.easyPct}%</span> Easy</span>
                    <span><span style={{ color: '#f59e0b', fontWeight: '700' }}>{insights.easyHardRatio.moderatePct}%</span> Moderate</span>
                    <span><span style={{ color: '#ef4444', fontWeight: '700' }}>{insights.easyHardRatio.hardPct}%</span> Hard</span>
                  </div>
                </>
              )}
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{insights.easyHardRatio.message}</div>
            </div>

            {/* Injury Risk */}
            <div style={{ ...cardStyle, borderLeft: `3px solid ${insights.injuryRisk.level === 'low' ? '#10b981' : insights.injuryRisk.level === 'moderate' ? '#f59e0b' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Injury Risk</div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>Weekly mileage change</div>
                </div>
                <span style={{
                  fontSize: '0.78rem', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
                  background: insights.injuryRisk.level === 'low' ? 'rgba(16,185,129,0.15)' : insights.injuryRisk.level === 'moderate' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                  color: insights.injuryRisk.level === 'low' ? '#10b981' : insights.injuryRisk.level === 'moderate' ? '#f59e0b' : '#ef4444',
                }}>
                  {insights.injuryRisk.level.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white' }}>{insights.injuryRisk.currentWeekKm.toFixed(1)} km</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>This week</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#94a3b8' }}>{insights.injuryRisk.prevWeekKm.toFixed(1)} km</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Last week</div>
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{insights.injuryRisk.message}</div>
            </div>

            {/* Training Load Trend */}
            <div style={{ ...cardStyle, borderLeft: `3px solid ${insights.trainingLoad.trend === 'building' ? '#3b82f6' : insights.trainingLoad.trend === 'tapering' ? '#a78bfa' : '#10b981'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Training Load</div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>4-week block comparison</div>
                </div>
                <span style={{ fontSize: '1.4rem' }}>
                  {insights.trainingLoad.trend === 'building' ? '📈' : insights.trainingLoad.trend === 'tapering' ? '📉' : '➡️'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white' }}>{insights.trainingLoad.thisBlockKm.toFixed(0)} km</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Last 4 weeks</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#94a3b8' }}>{insights.trainingLoad.prevBlockKm.toFixed(0)} km</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Prior 4 weeks</div>
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                {insights.trainingLoad.trend === 'building' && `Building phase — up ${insights.trainingLoad.changePercent}% vs prior block`}
                {insights.trainingLoad.trend === 'tapering' && `Tapering or recovering — down ${Math.abs(insights.trainingLoad.changePercent)}% vs prior block`}
                {insights.trainingLoad.trend === 'maintaining' && `Maintaining consistent load — stable training base`}
              </div>
            </div>

          </div>
        </div>

        {/* Recent Activities */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', margin: '0 0 16px' }}>
            Recent Activities
          </h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading activities...</div>
          ) : runs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No runs found. Go run!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {runs.slice(0, 10).map((activity, idx) => (
                <div
                  key={activity.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 100px 130px',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px 0',
                    borderBottom: idx < Math.min(runs.length, 10) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '2px' }}>{activity.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      {new Date(activity.start_date_local).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#3b82f6', fontSize: '0.9rem' }}>{formatDistance(activity.distance)}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Distance</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#10b981', fontSize: '0.9rem' }}>{formatDuration(activity.moving_time)}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Time</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#f59e0b', fontSize: '0.9rem' }}>{formatPace(activity.average_speed)}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Pace</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
