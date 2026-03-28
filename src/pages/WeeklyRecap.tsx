import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getStoredAuth, clearAuth, isTokenValid, getActivities,
  getWeeklyRecap, formatDistance, formatDuration,
} from '../lib/strava'

const QUOTES = [
  "Every mile is a gift.",
  "Run when you can, walk if you have to, crawl if you must. Just never give up.",
  "The miracle isn't that I finished. The miracle is that I had the courage to start.",
  "Your body will argue that there is no justifiable reason to continue. Your only recourse is to call on your spirit.",
  "Running is the greatest metaphor for life, because you get out of it what you put into it.",
  "Pain is temporary. Quitting lasts forever.",
  "Ask yourself: 'Can I give more?' The answer is usually 'Yes'.",
  "The only bad run is the one that didn't happen.",
  "What seems hard now will one day be your warm-up.",
  "Don't limit your challenges. Challenge your limits.",
]

function ChangeIndicator({ pct }: { pct: number }) {
  if (pct === 0) return <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Same as last week</span>
  const up = pct > 0
  return (
    <span style={{
      color: up ? '#10b981' : '#ef4444',
      fontSize: '0.78rem',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
    }}>
      {up ? '▲' : '▼'} {Math.abs(pct)}% vs last week
    </span>
  )
}

export default function WeeklyRecap() {
  const navigate = useNavigate()
  const { accessToken, athlete } = getStoredAuth()
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isTokenValid() || !accessToken) {
      clearAuth()
      navigate('/')
      return
    }
    getActivities(accessToken)
      .then(setActivities)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const recap = getWeeklyRecap(activities)
  const quote = QUOTES[new Date().getDay() % QUOTES.length]

  const now = new Date()
  const dayOfWeek = now.getDay()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - dayOfWeek)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  const formatWeekRange = () => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${startOfWeek.toLocaleDateString('en-US', opts)} – ${endOfWeek.toLocaleDateString('en-US', opts)}`
  }

  const formatBestPace = (paceMinPerKm: number) => {
    if (!paceMinPerKm || paceMinPerKm <= 0) return '--:--'
    const min = Math.floor(paceMinPerKm)
    const sec = Math.round((paceMinPerKm - min) * 60)
    return `${min}:${sec.toString().padStart(2, '0')} /km`
  }

  const tw = recap.thisWeek

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Inter', sans-serif", color: 'white' }}>
      <div style={{ padding: '32px', maxWidth: '700px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px' }}>Weekly Recap 📅</h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>Your running summary for the week</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading your week...</div>
        ) : (
          <>
            {/* Recap Card */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #1a0a00 100%)',
              border: '1px solid rgba(252,76,2,0.25)',
              borderRadius: '20px',
              padding: '32px',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '24px',
            }}>
              {/* Background accent */}
              <div style={{
                position: 'absolute',
                top: '-60px',
                right: '-60px',
                width: '200px',
                height: '200px',
                background: 'radial-gradient(circle, rgba(252,76,2,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: '#FC4C02',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                    }}>
                      🏃
                    </div>
                    <span style={{ fontWeight: '800', fontSize: '1rem' }}>Club Runners</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{formatWeekRange()}</div>
                </div>
                {athlete?.profile && (
                  <img
                    src={athlete.profile}
                    alt="avatar"
                    style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid rgba(252,76,2,0.5)' }}
                  />
                )}
              </div>

              {/* Main stat */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  This Week's Distance
                </div>
                <div style={{ fontSize: '3.5rem', fontWeight: '900', color: '#FC4C02', lineHeight: 1, marginBottom: '6px' }}>
                  {(tw.distance / 1000).toFixed(1)}
                  <span style={{ fontSize: '1.5rem', color: '#94a3b8', fontWeight: '400', marginLeft: '6px' }}>km</span>
                </div>
                <ChangeIndicator pct={recap.distanceChange} />
              </div>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '24px',
              }}>
                {[
                  {
                    label: 'Runs',
                    value: tw.runs.toString(),
                    icon: '🏃',
                    change: recap.runsChange,
                    color: '#3b82f6',
                  },
                  {
                    label: 'Time',
                    value: formatDuration(tw.time),
                    icon: '⏱️',
                    change: recap.timeChange,
                    color: '#10b981',
                  },
                  {
                    label: 'Longest Run',
                    value: formatDistance(tw.longestRun),
                    icon: '📍',
                    change: null,
                    color: '#a78bfa',
                  },
                  {
                    label: 'Best Pace',
                    value: formatBestPace(tw.bestPace),
                    icon: '⚡',
                    change: null,
                    color: '#f59e0b',
                  },
                ].map(stat => (
                  <div
                    key={stat.label}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '12px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.95rem' }}>{stat.icon}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{stat.label}</span>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '1.2rem', color: stat.color }}>
                      {stat.value}
                    </div>
                    {stat.change !== null && (
                      <div style={{ marginTop: '4px' }}>
                        <ChangeIndicator pct={stat.change} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Quote */}
              <div style={{
                background: 'rgba(252,76,2,0.08)',
                border: '1px solid rgba(252,76,2,0.2)',
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', letterSpacing: '0.1em' }}>
                  MOTIVATION OF THE WEEK
                </div>
                <div style={{ color: '#fca97a', fontStyle: 'italic', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  "{quote}"
                </div>
              </div>
            </div>

            {/* Comparison vs Last Week */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px',
              padding: '20px',
            }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: '700', color: '#94a3b8' }}>
                vs. Last Week
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  {
                    label: 'Distance',
                    thisWeek: `${(tw.distance / 1000).toFixed(1)} km`,
                    lastWeek: `${(recap.lastWeek.distance / 1000).toFixed(1)} km`,
                    pct: recap.distanceChange,
                  },
                  {
                    label: 'Runs',
                    thisWeek: `${tw.runs} runs`,
                    lastWeek: `${recap.lastWeek.runs} runs`,
                    pct: recap.runsChange,
                  },
                  {
                    label: 'Time',
                    thisWeek: formatDuration(tw.time),
                    lastWeek: formatDuration(recap.lastWeek.time),
                    pct: recap.timeChange,
                  },
                ].map(row => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', width: '80px' }}>{row.label}</span>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{row.thisWeek}</span>
                    <span style={{ color: '#475569', fontSize: '0.85rem' }}>{row.lastWeek}</span>
                    <ChangeIndicator pct={row.pct} />
                  </div>
                ))}
              </div>
            </div>

            {tw.runs === 0 && (
              <div style={{
                marginTop: '20px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.9rem',
                padding: '20px',
              }}>
                No runs this week yet. Get out there and make it happen!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
