import { supabase } from './supabase'
import { getWeeklyStats } from './strava'

export const syncMemberStats = async (athlete: any, activities: any[]) => {
  if (!athlete?.id) return
  const weekly = getWeeklyStats(activities)

  const rows = weekly.map(w => ({
    id: `${athlete.id}-${w.week}`,
    athlete_id: String(athlete.id),
    athlete_name: `${athlete.firstname} ${athlete.lastname}`,
    athlete_profile: athlete.profile || null,
    week_key: w.week,
    week_label: w.label,
    distance_km: Math.round(w.distance * 10) / 10,
    runs: w.runs,
    time_seconds: w.time,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('member_stats').upsert(rows, { onConflict: 'id' })
  if (error) console.error('[syncMemberStats] Supabase error:', error.message, error.details)
  else console.log(`[syncMemberStats] Synced ${rows.length} weeks for athlete ${athlete.id}`)
}

export const getClubWeeklyStats = async () => {
  const { data, error } = await supabase
    .from('member_stats')
    .select('*')
    .order('week_key', { ascending: true })
  if (error) console.error('[getClubWeeklyStats] Supabase error:', error.message, error.details)
  if (error || !data) return { weeklyData: [], members: [] }
  console.log(`[getClubWeeklyStats] ${data.length} rows from ${new Set(data.map(r => r.athlete_id)).size} members`)

  // Aggregate km per week across all members
  const weekMap: Record<string, { label: string; km: number; runs: number }> = {}
  data.forEach(row => {
    if (!weekMap[row.week_key]) weekMap[row.week_key] = { label: row.week_label, km: 0, runs: 0 }
    weekMap[row.week_key].km += row.distance_km
    weekMap[row.week_key].runs += row.runs
  })
  const weeklyData = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([, v]) => ({ label: v.label, km: Math.round(v.km * 10) / 10, runs: v.runs }))

  // Member totals (last 8 weeks)
  const memberMap: Record<string, { name: string; profile: string | null; km: number; runs: number }> = {}
  data.forEach(row => {
    if (!memberMap[row.athlete_id]) memberMap[row.athlete_id] = { name: row.athlete_name, profile: row.athlete_profile, km: 0, runs: 0 }
    memberMap[row.athlete_id].km += row.distance_km
    memberMap[row.athlete_id].runs += row.runs
  })
  const members = Object.values(memberMap).sort((a, b) => b.km - a.km)

  return { weeklyData, members }
}
