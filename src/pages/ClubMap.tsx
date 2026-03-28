import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getStoredAuth, clearAuth, isTokenValid, getAllActivities, formatDistance } from '../lib/strava'

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const makeIcon = (count: number) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background: #FC4C02;
      color: white;
      border-radius: 50%;
      width: ${count > 50 ? 48 : count > 20 ? 40 : count > 5 ? 34 : 28}px;
      height: ${count > 50 ? 48 : count > 20 ? 40 : count > 5 ? 34 : 28}px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: ${count > 50 ? 13 : 11}px;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      font-family: Inter, sans-serif;
    ">${count}</div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  })

interface CountryCluster {
  country: string
  lat: number
  lng: number
  count: number
  totalDistance: number
}

const GEOCODE_CACHE = 'strava_country_cache'

const getCache = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(GEOCODE_CACHE) || '{}') } catch { return {} }
}
const setCache = (c: Record<string, string>) =>
  localStorage.setItem(GEOCODE_CACHE, JSON.stringify(c))

const reverseGeocodeCountry = async (lat: number, lng: number): Promise<string> => {
  const key = `${lat.toFixed(1)},${lng.toFixed(1)}`
  const cache = getCache()
  if (cache[key]) return cache[key]
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=3`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'ClubRunners/1.0' } }
    )
    const data = await res.json()
    const country = data.address?.country ?? 'Unknown'
    cache[key] = country
    setCache(cache)
    return country
  } catch {
    return 'Unknown'
  }
}

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

export default function ClubMap() {
  const navigate = useNavigate()
  const { accessToken } = getStoredAuth()
  const [activities, setActivities] = useState<any[]>([])
  const [clusters, setClusters] = useState<CountryCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [geocoding, setGeocoding] = useState(false)
  const [period, setPeriod] = useState<Period>('all')

  useEffect(() => {
    if (!isTokenValid() || !accessToken) { clearAuth(); navigate('/'); return }
    getAllActivities(accessToken)
      .then(setActivities)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Group by country using 1-decimal lat/lng grid, then geocode unique centroids
  useEffect(() => {
    if (activities.length === 0) return

    const filtered = filterByPeriod(activities, period)
    const runs = filtered.filter(a => a.type === 'Run' && a.start_latlng?.length === 2)

    // Group by rounded 1-degree grid (≈111km — country-level resolution)
    const gridMap: Record<string, { lats: number[]; lngs: number[]; count: number; dist: number }> = {}
    runs.forEach(a => {
      const [lat, lng] = a.start_latlng
      const key = `${Math.round(lat)},${Math.round(lng)}`
      if (!gridMap[key]) gridMap[key] = { lats: [], lngs: [], count: 0, dist: 0 }
      gridMap[key].lats.push(lat)
      gridMap[key].lngs.push(lng)
      gridMap[key].count++
      gridMap[key].dist += a.distance
    })

    const centroids = Object.values(gridMap).map(g => ({
      lat: g.lats.reduce((s, v) => s + v, 0) / g.lats.length,
      lng: g.lngs.reduce((s, v) => s + v, 0) / g.lngs.length,
      count: g.count,
      dist: g.dist,
    }))

    // Geocode each centroid for country name (one call per cluster)
    const geocodeAll = async () => {
      setGeocoding(true)
      const results: CountryCluster[] = []
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

      for (const c of centroids) {
        const cache = getCache()
        const key = `${c.lat.toFixed(1)},${c.lng.toFixed(1)}`
        const cached = cache[key]
        const country = cached ?? await reverseGeocodeCountry(c.lat, c.lng)
        if (!cached) await sleep(1100) // Nominatim rate limit
        // Merge into existing country if already found
        const existing = results.find(r => r.country === country)
        if (existing) {
          // Weighted average position
          const totalCount = existing.count + c.count
          existing.lat = (existing.lat * existing.count + c.lat * c.count) / totalCount
          existing.lng = (existing.lng * existing.count + c.lng * c.count) / totalCount
          existing.count += c.count
          existing.totalDistance += c.dist
        } else {
          results.push({ country, lat: c.lat, lng: c.lng, count: c.count, totalDistance: c.dist })
        }
      }

      setClusters(results.sort((a, b) => b.count - a.count))
      setGeocoding(false)
    }

    geocodeAll()
  }, [activities, period])

  const filtered = filterByPeriod(activities, period)
  const totalRuns = filtered.filter(a => a.type === 'Run').length
  const totalKm = filtered.filter(a => a.type === 'Run').reduce((s, a) => s + a.distance, 0) / 1000
  const mapCenter: [number, number] = clusters.length > 0 ? [clusters[0].lat, clusters[0].lng] : [20, 0]
  const mapZoom = clusters.length > 0 ? 4 : 2

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Inter', sans-serif", color: 'white' }}>
      <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px' }}>World Map 🗺️</h1>
            <p style={{ color: '#94a3b8', margin: 0 }}>Countries where you've run</p>
          </div>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '4px', gap: '2px' }}>
            {([
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'year', label: 'This Year' },
              { key: 'all', label: 'All Time' },
            ] as { key: Period; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => setPeriod(key)} style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: period === key ? '700' : '400',
                background: period === key ? '#FC4C02' : 'transparent',
                color: period === key ? 'white' : '#94a3b8', transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { icon: '🌍', value: loading ? '...' : clusters.length, label: 'Countries' },
            { icon: '🏃', value: loading ? '...' : totalRuns, label: 'Total Runs' },
            { icon: '📍', value: loading ? '...' : `${totalKm.toFixed(0)} km`, label: 'Total Distance' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(252,76,2,0.1)', border: '1px solid rgba(252,76,2,0.2)', borderRadius: '12px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
              <div>
                <div style={{ fontWeight: '800', fontSize: '1.2rem', color: '#FC4C02' }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.label}</div>
              </div>
            </div>
          ))}
          {geocoding && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#fca47a', padding: '10px 16px', background: 'rgba(252,76,2,0.08)', borderRadius: '12px', border: '1px solid rgba(252,76,2,0.2)' }}>
              ⏳ Resolving countries...
            </div>
          )}
        </div>

        {/* Map */}
        {loading ? (
          <div style={{ height: '500px', background: 'rgba(255,255,255,0.04)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Loading map data...
          </div>
        ) : (
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', height: '500px', marginBottom: '24px' }}>
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                subdomains="abcd"
                maxZoom={19}
              />
              {clusters.map((c, i) => (
                <Marker key={i} position={[c.lat, c.lng]} icon={makeIcon(c.count)}>
                  <Popup>
                    <div style={{ minWidth: '150px', fontFamily: 'Inter, sans-serif' }}>
                      <strong style={{ fontSize: '1rem' }}>🌍 {c.country}</strong><br />
                      <span style={{ color: '#FC4C02', fontWeight: '700' }}>{c.count} runs</span><br />
                      <span style={{ color: '#666', fontSize: '0.85rem' }}>{(c.totalDistance / 1000).toFixed(1)} km total</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* Country list */}
        {clusters.length > 0 && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 14px' }}>Countries Visited</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {clusters.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{c.country}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: '#94a3b8' }}>
                    <span><span style={{ color: '#FC4C02', fontWeight: '700' }}>{c.count}</span> runs</span>
                    <span><span style={{ color: '#3b82f6', fontWeight: '700' }}>{(c.totalDistance / 1000).toFixed(1)}</span> km</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && clusters.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem', padding: '40px' }}>
            No GPS data found. Make sure your Strava activities have location enabled.
          </div>
        )}
      </div>
    </div>
  )
}
