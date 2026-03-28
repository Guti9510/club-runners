import { getStravaAuthUrl } from '../lib/strava'

export default function Login() {
  const handleConnect = () => {
    window.location.href = getStravaAuthUrl()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      color: 'white',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: '#FC4C02',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: '36px',
        }}>
          🏃
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, letterSpacing: '-1px' }}>
          Club Runners
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '1.1rem' }}>
          Your running club, supercharged.
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem' }}>Get Started</h2>
        <p style={{ color: '#94a3b8', margin: '0 0 32px', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Connect your Strava account to see leaderboards, stats, and insights for your running club.
        </p>

        {/* Features */}
        <div style={{ marginBottom: '32px', textAlign: 'left' }}>
          {[
            { icon: '🏆', text: 'Club leaderboards' },
            { icon: '📊', text: 'Advanced stats & charts' },
            { icon: '📅', text: 'Weekly club recap' },
            { icon: '🎯', text: 'Challenges & badges' },
          ].map(({ icon, text }) => (
            <div key={text} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 0',
              color: '#cbd5e1',
              fontSize: '0.95rem',
            }}>
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Connect Button */}
        <button
          onClick={handleConnect}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: '#FC4C02',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => (e.currentTarget.style.background = '#e04400')}
          onMouseOut={e => (e.currentTarget.style.background = '#FC4C02')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
          </svg>
          Connect with Strava
        </button>

        <p style={{ color: '#64748b', marginTop: '16px', fontSize: '0.8rem' }}>
          We only read your activity data. We never post on your behalf.
        </p>
      </div>
    </div>
  )
}
