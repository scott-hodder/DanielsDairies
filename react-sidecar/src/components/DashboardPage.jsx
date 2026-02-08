import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '../lib/auth'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogout() {
    setLoading(true)
    setError('')

    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (logoutError) {
      setError(logoutError.message || 'Failed to log out.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <img src="/images/logos/logo.svg" alt="Daniel's Diaries" />
        <div>
          <h1>Dashboard (React)</h1>
          <p>Starter conversion complete. Continue migrating dashboard widgets next.</p>
        </div>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      <section className="dashboard-card-grid">
        <article className="dashboard-card">
          <h2>Migration status</h2>
          <ul>
            <li>✅ React app scaffolded in a separate folder</li>
            <li>✅ Auth flow moved to React state/hooks</li>
            <li>🔜 Migrate existing dashboard modules incrementally</li>
          </ul>
        </article>
      </section>

      <button type="button" onClick={handleLogout} disabled={loading}>
        {loading ? 'Logging out...' : 'Log out'}
      </button>
    </main>
  )
}
