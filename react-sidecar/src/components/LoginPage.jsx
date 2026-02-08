import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { checkAuth, signIn, signUp } from '../lib/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await checkAuth()
        if (session) {
          navigate('/dashboard', { replace: true })
        }
      } catch (sessionError) {
        setError(sessionError.message)
      }
    }

    loadSession()
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isLoginMode) {
        await signIn(email, password)
        navigate('/dashboard', { replace: true })
        return
      }

      await signUp(email, password)
      setMessage('Account created. Check your inbox for email confirmation if enabled.')
      setIsLoginMode(true)
    } catch (submitError) {
      setError(submitError.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <img className="auth-logo" src="/images/logos/logo.svg" alt="Daniel's Diaries" />
        <h1>{isLoginMode ? 'Sign in' : 'Create account'}</h1>
        <p className="muted">React side project for safe migration from the existing app.</p>

        {error ? <p className="error-banner">{error}</p> : null}
        {message ? <p className="success-banner">{message}</p> : null}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••"
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isLoginMode ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button type="button" className="text-button" onClick={() => setIsLoginMode((value) => !value)}>
          {isLoginMode ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>

        <p className="route-links">
          Planned routes: <Link to="/landing">Landing</Link> · <Link to="/admin">Admin</Link> ·{' '}
          <Link to="/module">Module</Link>
        </p>
      </section>
    </main>
  )
}
