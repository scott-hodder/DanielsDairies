import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from '../lib/auth'

export default function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <header className="app-header">
      <Link className="brand" to="/landing">
        <img src="/images/logos/logo.svg" alt="Daniel's Diaries" />
        <div>
          <h1>Daniel&apos;s Diaries</h1>
          <p>React sidecar migration</p>
        </div>
      </Link>

      <nav>
        <Link className={location.pathname === '/landing' ? 'active' : ''} to="/landing">
          Landing
        </Link>
        <Link className={location.pathname === '/dashboard' ? 'active' : ''} to="/dashboard">
          Dashboard
        </Link>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </nav>
    </header>
  )
}
