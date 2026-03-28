import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export const CLUB_KEY = 'runner_club_name'
export const ONBOARDING_KEY = 'onboarding_complete'

export default function Onboarding() {
  const navigate = useNavigate()
  const [inClub, setInClub] = useState<boolean | null>(null)
  const [clubName, setClubName] = useState('')
  const [error, setError] = useState('')

  const handleFinish = () => {
    if (inClub === null) { setError('Please select an option'); return }
    if (inClub && !clubName.trim()) { setError('Please enter your club name'); return }

    if (inClub) localStorage.setItem(CLUB_KEY, clubName.trim())
    localStorage.setItem(ONBOARDING_KEY, 'true')
    navigate('/dashboard')
  }

  const cardStyle: React.CSSProperties = {
    border: '2px solid',
    borderRadius: '16px',
    padding: '20px 24px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      color: 'white',
      padding: '24px',
    }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '64px', height: '64px', background: '#FC4C02', borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', margin: '0 auto 20px',
          }}>🏃</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 8px' }}>
            One last step!
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '1rem' }}>
            Are you part of a running club?
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => { setInClub(true); setError('') }}
            style={{
              ...cardStyle,
              borderColor: inClub === true ? '#FC4C02' : 'rgba(255,255,255,0.1)',
              background: inClub === true ? 'rgba(252,76,2,0.12)' : 'rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '2rem' }}>👥</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem' }}>Yes, I'm in a club!</div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
                  I'll add my club and see aggregated stats
                </div>
              </div>
              {inClub === true && (
                <span style={{ marginLeft: 'auto', color: '#FC4C02', fontSize: '1.2rem' }}>✓</span>
              )}
            </div>
          </button>

          <button
            onClick={() => { setInClub(false); setClubName(''); setError('') }}
            style={{
              ...cardStyle,
              borderColor: inClub === false ? '#FC4C02' : 'rgba(255,255,255,0.1)',
              background: inClub === false ? 'rgba(252,76,2,0.12)' : 'rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '2rem' }}>🏃</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem' }}>No, I run solo</div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
                  I'll just track my own progress
                </div>
              </div>
              {inClub === false && (
                <span style={{ marginLeft: 'auto', color: '#FC4C02', fontSize: '1.2rem' }}>✓</span>
              )}
            </div>
          </button>
        </div>

        {/* Club Name Input */}
        {inClub === true && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>
              Club Name
            </label>
            <input
              type="text"
              placeholder="e.g. Denver Trail Runners"
              value={clubName}
              onChange={e => { setClubName(e.target.value); setError('') }}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onKeyDown={e => e.key === 'Enter' && handleFinish()}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0 0 16px', textAlign: 'center' }}>{error}</p>
        )}

        {/* CTA */}
        <button
          onClick={handleFinish}
          style={{
            width: '100%',
            padding: '14px',
            background: '#FC4C02',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          Let's go! 🚀
        </button>

        <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.78rem', marginTop: '16px' }}>
          You can update this later in your profile settings
        </p>
      </div>
    </div>
  )
}
