import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import DashboardPage from './components/DashboardPage'
import PlaceholderPage from './components/PlaceholderPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/landing" element={<PlaceholderPage title="Landing" />} />
      <Route path="/admin" element={<PlaceholderPage title="Admin" />} />
      <Route path="/module" element={<PlaceholderPage title="Module" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
