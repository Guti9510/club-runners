import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getStoredAuth, clearAuth, isTokenValid, getActivities,
  getBadges, getWeeklyStats, getWeeklyStreak,
} from '../lib/strava'

const MONTHLY_GOAL_KM = 100
const CUSTOM_CHALLENGES_KEY = 'custom_challenges'

type ChallengeType = 'distance' | 'runs' | 'elevation'
type ChallengePeriod = 'week' | 'month' | 'year'

interface CustomChallenge {
  id: string
  name: string
  type: ChallengeType
  target: number
  period: ChallengePeriod
  emoji: string
  createdAt: string
}

const getCustomChallenges = (): CustomChallenge[] => {
  try { return JSON.parse(localStorage.getItem(CUSTOM_CHALLENGES_KEY) || '[]') } catch { return [] }
}
const saveCustomChallenges = (c: CustomChallenge[]) =>
  localStorage.setItem(CUSTOM_CHALLENGES_KEY, JSON.stringify(c))

const filterByPeriod = (activities: any[], period: ChallengePeriod) => {
  const now = new Date()
  return activities.filter(a => {
    const d = new Date(a.start_date_local)
    if (period === 'week') {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      return d >= startOfWeek
    }
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    return d.getFullYear() === now.getFullYear()
  })
}

const getProgress = (activities: any[], challenge: CustomChallenge): number => {
  const filtered = filterByPeriod(activities.filter(a => a.type === 'Run'), challenge.period)
  if (challenge.type === 'distance') return filtered.reduce((s, a) => s + a.distance / 1000, 0)
  if (challenge.type === 'runs') return filtered.length
  if (challenge.type === 'elevation') return filtered.reduce((s, a) => s + (a.total_elevation_gain || 0), 0)
  return 0
}

const formatProgress = (val: number, type: ChallengeType) => {
  if (type === 'distance') return `${val.toFixed(1)} km`
  if (type === 'runs') return `${Math.floor(val)} runs`
  if (type === 'elevation') return `${Math.round(val)} m`
  return `${val}`
}

const EMOJIS = ['🎯', '🔥', '💪', '⚡', '🏆', '🌟', '🚀', '🎖️', '🏅', '💥']

const cardStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px',
  padding: '20px',
}

export default function Challenges() {
  const navigate = useNavigate()
  const { accessToken } = getStoredAuth()
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [customChallenges, setCustomChallenges] = useState<CustomChallenge[]>(getCustomChallenges)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: '',
    type: 'distance' as ChallengeType,
    target: '',
    period: 'month' as ChallengePeriod,
    emoji: '🎯',
  })

  useEffect(() => {
    if (!isTokenValid() || !accessToken) { clearAuth(); navigate('/'); return }
    getActivities(accessToken).then(setActivities).catch(console.error).finally(() => setLoading(false))
  }, [])

  const runs = activities.filter(a => a.type === 'Run')
  const now = new Date()
  const thisMonthRuns = runs.filter(a => {
    const d = new Date(a.start_date_local)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const monthlyKm = thisMonthRuns.reduce((s, a) => s + a.distance, 0) / 1000
  const monthlyPct = Math.min(100, (monthlyKm / MONTHLY_GOAL_KM) * 100)
  const streak = getWeeklyStreak(activities)
  const badges = getBadges(activities)
  const weeklyStats = getWeeklyStats(activities)
  const has50kmWeek = weeklyStats.some(w => w.distance >= 50)
  const maxWeekKm = Math.max(0, ...weeklyStats.map(w => w.distance))
  const earnedBadges = badges.filter(b => b.earned)
  const unearnedBadges = badges.filter(b => !b.earned)
  const monthName = now.toLocaleString('default', { month: 'long' })

  const handleCreateChallenge = () => {
    if (!form.name || !form.target) return
    const newChallenge: CustomChallenge = {
      id: Date.now().toString(),
      name: form.name,
      type: form.type,
      target: parseFloat(form.target),
      period: form.period,
      emoji: form.emoji,
      createdAt: new Date().toISOString(),
    }
    const updated = [...customChallenges, newChallenge]
    setCustomChallenges(updated)
    saveCustomChallenges(updated)
    setShowForm(false)
    setForm({ name: '', type: 'distance', target: '', period: 'month', emoji: '🎯' })
  }

  const handleDeleteChallenge = (id: string) => {
    const updated = customChallenges.filter(c => c.id !== id)
    setCustomChallenges(updated)
    saveCustomChallenges(updated)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'white',
    fontSize: '0.85rem',
    boxSizing: 'border-box',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Inter', sans-serif", color: 'white' }}>
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px' }}>Challenges 🎯</h1>
            <p style={{ color: '#94a3b8', margin: 0 }}>Track your goals and earn badges</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: showForm ? 'rgba(255,255,255,0.08)' : '#FC4C02',
              border: 'none', borderRadius: '10px', padding: '10px 18px',
              color: 'white', fontSize: '0.88rem', fontWeight: '700',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {showForm ? '✕ Cancel' : '+ Create Challenge'}
          </button>
        </div>

        {/* Create Challenge Form */}
        {showForm && (
          <div style={{
            ...cardStyle,
            border: '1px solid rgba(252,76,2,0.3)',
            background: 'rgba(252,76,2,0.06)',
            marginBottom: '28px',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 16px' }}>New Challenge</h2>

            {/* Emoji Picker */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Pick an icon</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    style={{
                      fontSize: '1.3rem', background: form.emoji === e ? 'rgba(252,76,2,0.3)' : 'rgba(255,255,255,0.06)',
                      border: form.emoji === e ? '2px solid #FC4C02' : '2px solid transparent',
                      borderRadius: '8px', padding: '4px 8px', cursor: 'pointer',
                    }}
                  >{e}</button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Challenge name</label>
              <input
                style={inputStyle}
                placeholder="e.g. Run a marathon this month"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {/* Type */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Goal type</label>
                <select style={selectStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ChallengeType }))}>
                  <option value="distance">Distance (km)</option>
                  <option value="runs">Number of runs</option>
                  <option value="elevation">Elevation (m)</option>
                </select>
              </div>

              {/* Target */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Target {form.type === 'distance' ? '(km)' : form.type === 'runs' ? '(runs)' : '(m)'}
                </label>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder={form.type === 'distance' ? '50' : form.type === 'runs' ? '12' : '500'}
                  value={form.target}
                  onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                />
              </div>

              {/* Period */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Period</label>
                <select style={selectStyle} value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value as ChallengePeriod }))}>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                  <option value="year">This year</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleCreateChallenge}
              disabled={!form.name || !form.target}
              style={{
                background: form.name && form.target ? '#FC4C02' : 'rgba(255,255,255,0.08)',
                border: 'none', borderRadius: '10px', padding: '10px 24px',
                color: form.name && form.target ? 'white' : '#64748b',
                fontSize: '0.88rem', fontWeight: '700', cursor: form.name && form.target ? 'pointer' : 'not-allowed',
              }}
            >
              Create Challenge
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading challenges...</div>
        ) : (
          <>
            {/* Custom Challenges */}
            {customChallenges.length > 0 && (
              <>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px' }}>My Challenges</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                  {customChallenges.map(challenge => {
                    const progress = getProgress(activities, challenge)
                    const pct = Math.min(100, (progress / challenge.target) * 100)
                    const done = pct >= 100
                    return (
                      <div key={challenge.id} style={{
                        ...cardStyle,
                        background: done ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.05)',
                        border: done ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.4rem' }}>{challenge.emoji}</span>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{challenge.name}</div>
                              <div style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'capitalize' }}>
                                {challenge.period === 'week' ? 'This week' : challenge.period === 'month' ? 'This month' : 'This year'}
                                {' · '}{challenge.type === 'distance' ? `${challenge.target} km` : challenge.type === 'runs' ? `${challenge.target} runs` : `${challenge.target}m elevation`}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: '800', fontSize: '1rem', color: done ? '#10b981' : '#FC4C02' }}>
                                {formatProgress(progress, challenge.type)}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                of {formatProgress(challenge.target, challenge.type)}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteChallenge(challenge.id)}
                              style={{
                                background: 'transparent', border: 'none', color: '#475569',
                                cursor: 'pointer', fontSize: '1rem', padding: '4px',
                              }}
                              title="Delete challenge"
                            >✕</button>
                          </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: done ? '#10b981' : 'linear-gradient(90deg, #FC4C02, #ff7038)',
                            borderRadius: '999px',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                          {done ? '✅ Challenge complete!' : `${pct.toFixed(0)}% complete`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Built-in Monthly Challenges */}
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px' }}>
              Monthly Challenges — {monthName}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
              {/* Distance Goal */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '1.2rem' }}>🎯</span>
                      <span style={{ fontWeight: '700' }}>Monthly Distance Goal</span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Run {MONTHLY_GOAL_KM}km in {monthName}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '800', fontSize: '1.1rem', color: monthlyPct >= 100 ? '#10b981' : '#FC4C02' }}>
                      {monthlyKm.toFixed(1)} km
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>of {MONTHLY_GOAL_KM} km</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${monthlyPct}%`,
                    background: monthlyPct >= 100 ? '#10b981' : 'linear-gradient(90deg, #FC4C02, #ff7038)',
                    borderRadius: '999px', transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                  {monthlyPct >= 100 ? '✅ Goal achieved!' : `${(MONTHLY_GOAL_KM - monthlyKm).toFixed(1)} km to go`}
                </div>
              </div>

              {/* Weekly Streak */}
              <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔥</span>
                    <span style={{ fontWeight: '700' }}>Weekly Streak</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Consecutive weeks with at least one run</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '800', fontSize: '2rem', color: streak > 0 ? '#f59e0b' : '#64748b' }}>{streak}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>weeks</div>
                </div>
              </div>

              {/* 50km Week */}
              <div style={{
                ...cardStyle,
                background: has50kmWeek ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                border: has50kmWeek ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.2rem' }}>💪</span>
                    <span style={{ fontWeight: '700' }}>Big Week</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Run 50km in a single week</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '800', fontSize: '1.1rem', color: has50kmWeek ? '#10b981' : '#64748b' }}>
                    {maxWeekKm.toFixed(1)} km
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>best week</div>
                </div>
              </div>
            </div>

            {/* Earned Badges */}
            {earnedBadges.length > 0 && (
              <>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px' }}>Badges Earned ({earnedBadges.length})</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '28px' }}>
                  {earnedBadges.map(badge => (
                    <div key={badge.id} style={{
                      background: 'rgba(252,76,2,0.1)', border: '1px solid rgba(252,76,2,0.35)',
                      borderRadius: '14px', padding: '18px', textAlign: 'center', position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>{badge.icon}</div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '4px' }}>{badge.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>{badge.description}</div>
                      {badge.value && <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#FC4C02', fontWeight: '600' }}>{badge.value}</div>}
                      <div style={{
                        position: 'absolute', top: '10px', right: '10px', background: '#10b981',
                        borderRadius: '50%', width: '16px', height: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px',
                      }}>✓</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Locked Badges */}
            {unearnedBadges.length > 0 && (
              <>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px', color: '#64748b' }}>Locked Badges</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {unearnedBadges.map(badge => (
                    <div key={badge.id} style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '14px', padding: '18px', textAlign: 'center', opacity: 0.6,
                    }}>
                      <div style={{ fontSize: '2.2rem', marginBottom: '8px', filter: 'grayscale(1)' }}>{badge.icon}</div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#94a3b8', marginBottom: '4px' }}>{badge.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>{badge.description}</div>
                      {badge.value && <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#475569' }}>{badge.value}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {runs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '0.9rem' }}>
                No run data found. Start running to unlock challenges and badges!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
