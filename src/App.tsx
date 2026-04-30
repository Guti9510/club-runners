import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { isTokenValid } from './lib/strava'
import Nav from './components/Nav'
import Login from './pages/Login'
import Callback from './pages/Callback'
import Dashboard from './pages/Dashboard'
import Leaderboard from './pages/Leaderboard'
import Onboarding from './pages/Onboarding'
import ClubMap from './pages/ClubMap'
import Challenges from './pages/Challenges'
import WeeklyRecap from './pages/WeeklyRecap'
import Events from './pages/Events'
import Chat from './pages/Chat'

const marathonPhotos = [
  'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1587330979470-3595ac045ab0?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1600&q=80&auto=format&fit=crop',
]

function MarathonBackground() {
  const [current, setCurrent] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % marathonPhotos.length)
        setFading(false)
      }, 600)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${marathonPhotos[current]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.6s ease-in-out',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(10,15,30,0.88)',
      }} />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isTokenValid()) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <MarathonBackground />
      <Nav />
      <div style={{ flex: 1, marginLeft: '220px', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <Outlet />
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/onboarding" element={<Onboarding />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/map" element={<ClubMap />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/recap" element={<WeeklyRecap />} />
          <Route path="/events" element={<Events />} />
          <Route path="/chat" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
