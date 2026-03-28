import polyline from 'polyline'

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID
const CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET
const REDIRECT_URI = import.meta.env.VITE_STRAVA_REDIRECT_URI

export const getStravaAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all,profile:read_all',
  })
  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}

export const exchangeToken = async (code: string) => {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!response.ok) throw new Error('Failed to exchange token')
  return response.json()
}

export const getAthlete = async (accessToken: string) => {
  const response = await fetch('https://www.strava.com/api/v3/athlete', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error('Failed to fetch athlete')
  return response.json()
}

export const getActivities = async (accessToken: string, perPage = 200) => {
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!response.ok) throw new Error('Failed to fetch activities')
  return response.json()
}

const CACHE_KEY = 'strava_activities_cache'
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

export const getAllActivities = async (accessToken: string): Promise<any[]> => {
  // Return cache if still fresh
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { timestamp, activities } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL_MS) return activities
    }
  } catch {}

  const all: any[] = []
  let page = 1
  const perPage = 200

  while (true) {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!response.ok) throw new Error('Failed to fetch activities')
    const batch = await response.json()
    if (batch.length === 0) break
    all.push(...batch)
    if (batch.length < perPage) break
    page++
    await new Promise(r => setTimeout(r, 300)) // small delay to avoid rate limiting
  }

  // Save to cache
  localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), activities: all }))
  return all
}

export const clearActivitiesCache = () => localStorage.removeItem(CACHE_KEY)

export const saveAuth = (data: any) => {
  localStorage.setItem('strava_access_token', data.access_token)
  localStorage.setItem('strava_refresh_token', data.refresh_token)
  localStorage.setItem('strava_athlete', JSON.stringify(data.athlete))
  localStorage.setItem('strava_expires_at', data.expires_at.toString())
}

export const getStoredAuth = () => {
  return {
    accessToken: localStorage.getItem('strava_access_token'),
    refreshToken: localStorage.getItem('strava_refresh_token'),
    athlete: JSON.parse(localStorage.getItem('strava_athlete') || 'null'),
    expiresAt: localStorage.getItem('strava_expires_at'),
  }
}

export const clearAuth = () => {
  localStorage.removeItem('strava_access_token')
  localStorage.removeItem('strava_refresh_token')
  localStorage.removeItem('strava_athlete')
  localStorage.removeItem('strava_expires_at')
}

export const isTokenValid = () => {
  const expiresAt = localStorage.getItem('strava_expires_at')
  if (!expiresAt) return false
  return Date.now() / 1000 < parseInt(expiresAt)
}

export const formatPace = (metersPerSecond: number) => {
  if (!metersPerSecond || metersPerSecond <= 0) return '--:-- /km'
  const minutesPerKm = 1000 / (metersPerSecond * 60)
  const minutes = Math.floor(minutesPerKm)
  const seconds = Math.round((minutesPerKm - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`
}

export const formatDistance = (meters: number) => {
  return (meters / 1000).toFixed(2) + ' km'
}

export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

// ─── Helper: get ISO week string (YYYY-Www) ───────────────────────────────────
function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

function getWeekLabel(date: Date): string {
  // Get Monday of the week
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export interface WeeklyStats {
  week: string
  label: string
  distance: number
  runs: number
  time: number
}

export const getWeeklyStats = (activities: any[]): WeeklyStats[] => {
  const runs = activities.filter(a => a.type === 'Run')
  const weekMap: Record<string, WeeklyStats> = {}

  // Generate last 8 weeks
  const now = new Date()
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const key = getWeekKey(d)
    const label = getWeekLabel(d)
    if (!weekMap[key]) {
      weekMap[key] = { week: key, label, distance: 0, runs: 0, time: 0 }
    }
  }

  runs.forEach(activity => {
    const date = new Date(activity.start_date_local)
    const key = getWeekKey(date)
    if (weekMap[key]) {
      weekMap[key].distance += activity.distance / 1000
      weekMap[key].runs += 1
      weekMap[key].time += activity.moving_time
    }
  })

  return Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week)).slice(-8)
}

export interface PaceZone {
  name: string
  count: number
  color: string
}

// thresholdPace is in min/km (e.g. 5.0 = 5:00/km)
// If not provided, falls back to fixed defaults
export const getPaceZones = (activities: any[], thresholdPace?: number): PaceZone[] => {
  const runs = activities.filter(a => a.type === 'Run' && a.average_speed > 0)

  // Default zone boundaries (min/km)
  const hard = thresholdPace ? thresholdPace : 5.5
  const easy = thresholdPace ? thresholdPace + 1.0 : 6.5

  const zones = { easy: 0, moderate: 0, hard: 0 }

  runs.forEach(activity => {
    const paceMinPerKm = 1000 / (activity.average_speed * 60)
    if (paceMinPerKm < hard) {
      zones.hard += 1
    } else if (paceMinPerKm <= easy) {
      zones.moderate += 1
    } else {
      zones.easy += 1
    }
  })

  const fmt = (p: number) => {
    const min = Math.floor(p)
    const sec = Math.round((p - min) * 60).toString().padStart(2, '0')
    return `${min}:${sec}`
  }

  return [
    { name: `Easy (>${fmt(easy)}/km)`, count: zones.easy, color: '#10b981' },
    { name: `Moderate (${fmt(hard)}-${fmt(easy)}/km)`, count: zones.moderate, color: '#f59e0b' },
    { name: `Hard (<${fmt(hard)}/km)`, count: zones.hard, color: '#ef4444' },
  ].filter(z => z.count > 0)
}

// Calculate threshold pace from 3K test time (in seconds)
export const thresholdFromTest3K = (timeSeconds: number): number => {
  const pace3kMinPerKm = timeSeconds / 60 / 3  // min/km for 3K
  return pace3kMinPerKm + 0.5  // threshold ≈ 3K pace + 30s/km
}

export interface CityLocation {
  city: string
  lat: number
  lng: number
  count: number
}

export const getUniqueCities = (activities: any[]): CityLocation[] => {
  const cityMap: Record<string, CityLocation> = {}

  activities.forEach(activity => {
    const city = activity.location_city
    const latlng = activity.start_latlng

    if (latlng && latlng.length === 2) {
      const key = city || `${latlng[0].toFixed(2)},${latlng[1].toFixed(2)}`
      if (!cityMap[key]) {
        cityMap[key] = {
          city: city || 'Unknown Location',
          lat: latlng[0],
          lng: latlng[1],
          count: 0,
        }
      }
      cityMap[key].count += 1
    }
  })

  return Object.values(cityMap)
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  earned: boolean
  value?: string
}

export const getBadges = (activities: any[]): Badge[] => {
  const runs = activities.filter(a => a.type === 'Run')

  const longestRun = runs.reduce((max, a) => Math.max(max, a.distance), 0)
  const fastestPace = runs.reduce((best, a) => {
    if (a.distance >= 5000 && a.average_speed > 0) {
      const pace = 1000 / (a.average_speed * 60)
      return Math.min(best, pace)
    }
    return best
  }, Infinity)

  const nightOwlRuns = runs.filter(a => {
    const hour = new Date(a.start_date_local).getHours()
    return hour >= 20
  })

  const earlyBirdRuns = runs.filter(a => {
    const hour = new Date(a.start_date_local).getHours()
    return hour < 7
  })

  // Check 50km week
  const weeklyStats = getWeeklyStats(activities)
  const has50kmWeek = weeklyStats.some(w => w.distance >= 50)

  // Weekly streak
  const streak = getWeeklyStreak(activities)

  const formatPaceVal = (paceMinPerKm: number) => {
    const min = Math.floor(paceMinPerKm)
    const sec = Math.round((paceMinPerKm - min) * 60)
    return `${min}:${sec.toString().padStart(2, '0')}/km`
  }

  return [
    {
      id: 'longest_run',
      name: 'Long Haul',
      description: 'Complete a run over 21km',
      icon: '🏅',
      earned: longestRun >= 21000,
      value: longestRun > 0 ? `${(longestRun / 1000).toFixed(1)}km best` : undefined,
    },
    {
      id: 'fastest_5k',
      name: 'Speed Demon',
      description: 'Run 5K under 25 minutes',
      icon: '⚡',
      earned: fastestPace !== Infinity && fastestPace < 5,
      value: fastestPace !== Infinity ? `Best: ${formatPaceVal(fastestPace)}` : undefined,
    },
    {
      id: 'night_owl',
      name: 'Night Owl',
      description: 'Complete 3+ runs after 8pm',
      icon: '🦉',
      earned: nightOwlRuns.length >= 3,
      value: `${nightOwlRuns.length} night runs`,
    },
    {
      id: 'early_bird',
      name: 'Early Bird',
      description: 'Complete 3+ runs before 7am',
      icon: '🌅',
      earned: earlyBirdRuns.length >= 3,
      value: `${earlyBirdRuns.length} early runs`,
    },
    {
      id: '50km_week',
      name: '50K Week',
      description: 'Run 50km in a single week',
      icon: '💪',
      earned: has50kmWeek,
    },
    {
      id: 'streak',
      name: 'Consistent',
      description: 'Maintain a 4-week running streak',
      icon: '🔥',
      earned: streak >= 4,
      value: `${streak} week streak`,
    },
    {
      id: 'century',
      name: 'Century Club',
      description: 'Run 100+ total runs',
      icon: '💯',
      earned: runs.length >= 100,
      value: `${runs.length} runs total`,
    },
    {
      id: 'globe_trotter',
      name: 'Globe Trotter',
      description: 'Run in 3+ different cities',
      icon: '🌍',
      earned: getUniqueCities(activities).length >= 3,
      value: `${getUniqueCities(activities).length} cities`,
    },
  ]
}

export const getWeeklyStreak = (activities: any[]): number => {
  const runs = activities.filter(a => a.type === 'Run')
  if (runs.length === 0) return 0

  const weeksWithRuns = new Set(
    runs.map(a => getWeekKey(new Date(a.start_date_local)))
  )

  let streak = 0
  const now = new Date()
  for (let i = 0; i < 52; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const key = getWeekKey(d)
    if (weeksWithRuns.has(key)) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  return streak
}

export interface WeeklyRecapData {
  thisWeek: {
    distance: number
    time: number
    runs: number
    longestRun: number
    bestPace: number
  }
  lastWeek: {
    distance: number
    time: number
    runs: number
  }
  distanceChange: number
  timeChange: number
  runsChange: number
}

export const getWeeklyRecap = (activities: any[]): WeeklyRecapData => {
  const runs = activities.filter(a => a.type === 'Run')
  const now = new Date()

  const startOfThisWeek = new Date(now)
  startOfThisWeek.setHours(0, 0, 0, 0)
  startOfThisWeek.setDate(now.getDate() - now.getDay())

  const startOfLastWeek = new Date(startOfThisWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  const thisWeekRuns = runs.filter(a => {
    const d = new Date(a.start_date_local)
    return d >= startOfThisWeek
  })

  const lastWeekRuns = runs.filter(a => {
    const d = new Date(a.start_date_local)
    return d >= startOfLastWeek && d < startOfThisWeek
  })

  const bestPace = thisWeekRuns.reduce((best, a) => {
    if (a.average_speed > 0) return Math.min(best, 1000 / (a.average_speed * 60))
    return best
  }, Infinity)

  const tw = {
    distance: thisWeekRuns.reduce((s, a) => s + a.distance, 0),
    time: thisWeekRuns.reduce((s, a) => s + a.moving_time, 0),
    runs: thisWeekRuns.length,
    longestRun: thisWeekRuns.reduce((m, a) => Math.max(m, a.distance), 0),
    bestPace: bestPace === Infinity ? 0 : bestPace,
  }

  const lw = {
    distance: lastWeekRuns.reduce((s, a) => s + a.distance, 0),
    time: lastWeekRuns.reduce((s, a) => s + a.moving_time, 0),
    runs: lastWeekRuns.length,
  }

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  return {
    thisWeek: tw,
    lastWeek: lw,
    distanceChange: pctChange(tw.distance, lw.distance),
    timeChange: pctChange(tw.time, lw.time),
    runsChange: pctChange(tw.runs, lw.runs),
  }
}

export const decodePolyline = (encoded: string): [number, number][] => {
  if (!encoded) return []
  try {
    return polyline.decode(encoded) as [number, number][]
  } catch {
    return []
  }
}

// ─── Training Insights ────────────────────────────────────────────────────────

export interface TrainingInsights {
  easyHardRatio: {
    easyPct: number
    hardPct: number
    moderatePct: number
    status: 'good' | 'too_hard' | 'too_easy' | 'no_data'
    message: string
    totalRuns: number
  }
  injuryRisk: {
    level: 'low' | 'moderate' | 'high'
    message: string
    currentWeekKm: number
    prevWeekKm: number
    spikePercent: number
  }
  trainingLoad: {
    thisBlockKm: number
    prevBlockKm: number
    changePercent: number
    trend: 'building' | 'maintaining' | 'tapering'
  }
}

export const getTrainingInsights = (activities: any[], thresholdPace?: number): TrainingInsights => {
  const runs = activities.filter(a => a.type === 'Run')
  const now = new Date()

  // ─── Easy/Hard Ratio (last 4 weeks) ───────────────────────────────────────
  const hard = thresholdPace ?? 5.5
  const easy = thresholdPace ? thresholdPace + 1.0 : 6.5

  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(now.getDate() - 28)
  const recentRuns = runs.filter(a => new Date(a.start_date_local) >= fourWeeksAgo)

  let easyCount = 0, moderateCount = 0, hardCount = 0
  recentRuns.forEach(a => {
    if (a.average_speed > 0) {
      const pace = 1000 / (a.average_speed * 60)
      if (pace < hard) hardCount++
      else if (pace <= easy) moderateCount++
      else easyCount++
    }
  })

  const total = easyCount + moderateCount + hardCount
  const easyPct = total > 0 ? Math.round((easyCount / total) * 100) : 0
  const hardPct = total > 0 ? Math.round((hardCount / total) * 100) : 0
  const moderatePct = total > 0 ? Math.round((moderateCount / total) * 100) : 0

  let ratioStatus: 'good' | 'too_hard' | 'too_easy' | 'no_data' = 'no_data'
  let ratioMessage = 'Not enough data yet (need 3+ runs in last 4 weeks)'

  if (total >= 3) {
    if (easyPct >= 75) {
      ratioStatus = 'good'
      ratioMessage = 'Great balance! Your 80/20 ratio protects you from burnout.'
    } else if (easyPct < 55) {
      ratioStatus = 'too_hard'
      ratioMessage = 'Running too hard too often. Add more easy/recovery runs.'
    } else {
      ratioStatus = 'too_easy'
      ratioMessage = 'Decent balance — aim for 80% easy runs for optimal adaptation.'
    }
  }

  // ─── Injury Risk (weekly mileage spike) ───────────────────────────────────
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - now.getDay())
  startOfThisWeek.setHours(0, 0, 0, 0)
  const startOfLastWeek = new Date(startOfThisWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  const thisWeekKm = runs.filter(a => new Date(a.start_date_local) >= startOfThisWeek)
    .reduce((s, a) => s + a.distance / 1000, 0)
  const lastWeekKm = runs.filter(a => {
    const d = new Date(a.start_date_local)
    return d >= startOfLastWeek && d < startOfThisWeek
  }).reduce((s, a) => s + a.distance / 1000, 0)

  const spikePercent = lastWeekKm > 0 ? Math.round(((thisWeekKm - lastWeekKm) / lastWeekKm) * 100) : 0
  let injuryLevel: 'low' | 'moderate' | 'high' = 'low'
  let injuryMessage = 'Mileage looks sustainable. Keep it up!'

  if (lastWeekKm > 0) {
    if (spikePercent > 30) {
      injuryLevel = 'high'
      injuryMessage = `Mileage jumped ${spikePercent}% vs last week — well above the 10% rule!`
    } else if (spikePercent > 15) {
      injuryLevel = 'moderate'
      injuryMessage = `Mileage up ${spikePercent}% this week. Monitor how your body feels.`
    } else if (spikePercent >= 0) {
      injuryLevel = 'low'
      injuryMessage = `Safe ${spikePercent > 0 ? `+${spikePercent}%` : 'stable'} mileage — sustainable build.`
    } else {
      injuryLevel = 'low'
      injuryMessage = `Mileage down ${Math.abs(spikePercent)}% — solid recovery week.`
    }
  } else if (thisWeekKm > 0) {
    injuryMessage = 'Building fresh — track your weekly increases carefully.'
  }

  // ─── Training Load Trend (4-week blocks) ──────────────────────────────────
  const eightWeeksAgo = new Date(now)
  eightWeeksAgo.setDate(now.getDate() - 56)

  const thisBlockKm = runs.filter(a => new Date(a.start_date_local) >= fourWeeksAgo)
    .reduce((s, a) => s + a.distance / 1000, 0)
  const prevBlockKm = runs.filter(a => {
    const d = new Date(a.start_date_local)
    return d >= eightWeeksAgo && d < fourWeeksAgo
  }).reduce((s, a) => s + a.distance / 1000, 0)

  const loadChangePercent = prevBlockKm > 0
    ? Math.round(((thisBlockKm - prevBlockKm) / prevBlockKm) * 100)
    : 0
  let loadTrend: 'building' | 'maintaining' | 'tapering' = 'maintaining'
  if (loadChangePercent > 10) loadTrend = 'building'
  else if (loadChangePercent < -10) loadTrend = 'tapering'

  return {
    easyHardRatio: { easyPct, hardPct, moderatePct, status: ratioStatus, message: ratioMessage, totalRuns: total },
    injuryRisk: { level: injuryLevel, message: injuryMessage, currentWeekKm: thisWeekKm, prevWeekKm: lastWeekKm, spikePercent },
    trainingLoad: { thisBlockKm, prevBlockKm, changePercent: loadChangePercent, trend: loadTrend },
  }
}
