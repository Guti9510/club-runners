import { NavLink, useNavigate } from 'react-router-dom'
import { clearAuth, getStoredAuth } from '../lib/strava'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/leaderboard', label: 'Club Hub', icon: '👥' },
  { path: '/events', label: 'Events', icon: '🗓️' },
  { path: '/map', label: 'World Map', icon: '🗺️' },
  { path: '/challenges', label: 'Challenges', icon: '🎯' },
  { path: '/recap', label: 'Weekly Recap', icon: '📅' },
]

export default function Nav() {
  const navigate = useNavigate()
  const { athlete } = getStoredAuth()

  const handleLogout = () => {
    clearAuth()
    navigate('/')
  }

  return (
    <nav style={{
      width: '220px',
      minHeight: '100vh',
      background: '#0a0f1e',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: '#FC4C02',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
          }}>
            🏃
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'white', lineHeight: 1.2 }}>
              Club Runners
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Powered by Strava</div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <div style={{ padding: '16px 12px', flex: 1 }}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '10px',
              marginBottom: '4px',
              textDecoration: 'none',
              color: isActive ? 'white' : '#94a3b8',
              background: isActive ? 'rgba(252, 76, 2, 0.15)' : 'transparent',
              borderLeft: isActive ? '3px solid #FC4C02' : '3px solid transparent',
              fontWeight: isActive ? '600' : '400',
              fontSize: '0.9rem',
              transition: 'all 0.15s ease',
            })}
          >
            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* User + Logout */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
        }}>
          {athlete?.profile ? (
            <img
              src={athlete.profile}
              alt="avatar"
              style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#FC4C02',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
            }}>
              👤
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {athlete?.firstname} {athlete?.lastname}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Runner</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '8px',
            background: 'rgba(255,255,255,0.06)',
            color: '#94a3b8',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            transition: 'all 0.15s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(252,76,2,0.15)'
            e.currentTarget.style.color = '#FC4C02'
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            e.currentTarget.style.color = '#94a3b8'
          }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
