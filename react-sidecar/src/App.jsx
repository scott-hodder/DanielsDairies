import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import DashboardPage from './components/DashboardPage'
import LandingPage from './components/LandingPage'
import PlaceholderPage from './components/PlaceholderPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/landing"
        element={
          <ProtectedRoute>
            <LandingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <PlaceholderPage title="Admin" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/module"
        element={
          <ProtectedRoute>
            <PlaceholderPage title="Module" />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
