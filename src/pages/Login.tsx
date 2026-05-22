import { getStravaAuthUrl } from '../lib/strava'
import { useState } from 'react'

const marathons = [
  { city: 'Boston', country: 'USA', photo: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1600&q=80&auto=format&fit=crop' },
  { city: 'Tokyo', country: 'Japan', photo: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80&auto=format&fit=crop' },
  { city: 'Berlin', country: 'Germany', photo: 'https://images.unsplash.com/photo-1587330979470-3595ac045ab0?w=1600&q=80&auto=format&fit=crop' },
  { city: 'London', country: 'UK', photo: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80&auto=format&fit=crop' },
  { city: 'Chicago', country: 'USA', photo: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80&auto=format&fit=crop' },
  { city: 'New York', country: 'USA', photo: 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1600&q=80&auto=format&fit=crop' },
]

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

function getStoredIndex() {
  try {
    const saved = localStorage.getItem('marathon_bg')
    if (saved) {
      const { index, timestamp } = JSON.parse(saved)
      if (Date.now() - timestamp < FOUR_HOURS_MS) return index
      const next = (index + 1) % marathons.length
      localStorage.setItem('marathon_bg', JSON.stringify({ index: next, timestamp: Date.now() }))
      return next
    }
  } catch {}
  localStorage.setItem('marathon_bg', JSON.stringify({ index: 0, timestamp: Date.now() }))
  return 0
}

export default function Login() {
  const [current] = useState(() => getStoredIndex())
  const marathon = marathons[current]

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      color: 'white',
      overflow: 'hidden',
    }}>
      {/* Background image */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `url(${marathon.photo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 1,
      }} />

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(135deg, rgba(10,15,30,0.85) 0%, rgba(10,15,30,0.7) 100%)',
      }} />

      {/* Marathon label */}
      <div style={{ position: 'absolute', bottom: '24px', left: '24px', zIndex: 2 }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
          World Marathon Major
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>
          {marathon.city} <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '400', fontSize: '0.9rem' }}>{marathon.country}</span>
        </div>
      </div>

      {/* Dots indicator */}
      <div style={{ position: 'absolute', bottom: '28px', right: '24px', zIndex: 2, display: 'flex', gap: '6px' }}>
        {marathons.map((_, i) => (
          <div key={i} style={{
            width: i === current ? '20px' : '6px',
            height: '6px', borderRadius: '3px',
            background: i === current ? '#FC4C02' : 'rgba(255,255,255,0.3)',
          }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', background: '#FC4C02',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px', fontSize: '36px',
            boxShadow: '0 8px 32px rgba(252,76,2,0.4)',
          }}>
            🏃
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, letterSpacing: '-1px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            Club Runners
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '8px', fontSize: '1.1rem' }}>
            Your running club, supercharged.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(10,15,30,0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center',
        }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem' }}>Get Started</h2>
          <p style={{ color: '#94a3b8', margin: '0 0 32px', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Connect your Strava account to see stats, training insights, and more for your running club.
          </p>

          {/* Features */}
          <div style={{ marginBottom: '32px', textAlign: 'left' }}>
            {[
              { icon: '📊', text: 'Advanced stats & charts' },
              { icon: '🗺️', text: 'World map of your runs' },
              { icon: '🤖', text: 'AI running assistant' },
              { icon: '🎯', text: 'Challenges & badges' },
            ].map(({ icon, text }) => (
              <div key={text} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '8px 0', color: '#cbd5e1', fontSize: '0.95rem',
              }}>
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Connect Button */}
          <a
            href={getStravaAuthUrl()}
            style={{
              width: '100%', height: '48px', background: '#FC4C02',
              color: 'white', border: 'none', borderRadius: '4px',
              fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', textDecoration: 'none', boxSizing: 'border-box',
              boxShadow: '0 4px 16px rgba(252,76,2,0.4)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
            </svg>
            Connect with Strava
          </a>

          <p style={{ color: '#64748b', marginTop: '16px', fontSize: '0.8rem' }}>
            We only read your activity data. We never post on your behalf.
          </p>
          <p style={{ color: '#64748b', marginTop: '8px', fontSize: '0.75rem' }}>
            Compatible with Strava
          </p>
        </div>
      </div>
    </div>
  )
}
