import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import DashboardPage from './components/DashboardPage'
import LandingPage from './components/LandingPage'
import AdminPage from './components/AdminPage'
import ModulePage from './components/ModulePage'
import ParentInsightsPage from './components/ParentInsightsPage'
import BillingPage from './components/BillingPage'
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
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/module"
        element={
          <ProtectedRoute>
            <ModulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <BillingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent-insights"
        element={
          <ProtectedRoute>
            <ParentInsightsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
