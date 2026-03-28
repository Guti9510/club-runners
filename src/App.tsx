import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isTokenValid()) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <div style={{ flex: 1, marginLeft: '220px', minHeight: '100vh', background: '#0f172a' }}>
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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
