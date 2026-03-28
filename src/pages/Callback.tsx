import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeToken, saveAuth } from '../lib/strava'
import { ONBOARDING_KEY } from './Onboarding'

export default function Callback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError('You declined the Strava authorization. Please try again.')
      return
    }

    if (!code) {
      setError('No authorization code received.')
      return
    }

    exchangeToken(code)
      .then((data) => {
        saveAuth(data)
        const onboarded = localStorage.getItem(ONBOARDING_KEY)
        navigate(onboarded ? '/dashboard' : '/onboarding')
      })
      .catch(() => {
        setError('Failed to connect to Strava. Please try again.')
      })
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      color: 'white',
      textAlign: 'center',
    }}>
      {error ? (
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
          <h2>{error}</h2>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: '#FC4C02',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      ) : (
        <div>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255,255,255,0.2)',
            borderTopColor: '#FC4C02',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h2 style={{ margin: 0 }}>Connecting to Strava...</h2>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>Hang tight, almost there!</p>
        </div>
      )}
    </div>
  )
}
