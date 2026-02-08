import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from '../lib/auth'

const navItems = [
  { to: '/landing', label: 'Landing' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/module', label: 'Modules' },
  { to: '/parent-insights', label: 'Parent Insights' },
  { to: '/admin', label: 'Admin' }
]

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
        {navItems.map((item) => (
          <Link key={item.to} className={location.pathname === item.to ? 'active' : ''} to={item.to}>
            {item.label}
          </Link>
        ))}
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </nav>
    </header>
  )
}
