import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkAuth, resetPassword, signIn, signUp, updatePassword } from '../lib/auth'
import { isSupabaseConfigured, supabaseConfigErrorMessage } from '../lib/supabaseClient'



function toFriendlyError(error) {
  if (!error) return 'Authentication failed.'

  if (error.code === 'SUPABASE_CONFIG_MISSING') {
    return supabaseConfigErrorMessage
  }

  if (error instanceof TypeError && String(error.message).toLowerCase().includes('failed to fetch')) {
    return 'Unable to reach Supabase. Check VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY and your network connection.'
  }

  return error.message || 'Authentication failed.'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const title = useMemo(() => {
    if (mode === 'signup') return 'Create account'
    if (mode === 'forgot') return 'Reset password'
    if (mode === 'recover') return 'Set a new password'
    return 'Sign in'
  }, [mode])

  useEffect(() => {
    async function setup() {
      const url = new URL(window.location.href)
      const isResetFlow = url.searchParams.has('access_token') && url.searchParams.has('refresh_token')

      try {
        const session = await checkAuth()
        if (session && isResetFlow) {
          setMode('recover')
          return
        }

        if (session) {
          navigate('/landing', { replace: true })
        }
      } catch (setupError) {
        setError(toFriendlyError(setupError))
      }
    }

    setup()
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate('/landing', { replace: true })
        return
      }

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        await signUp(email, password)
        setMessage('Account created. Please check your inbox for email confirmation.')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
        return
      }

      if (mode === 'forgot') {
        await resetPassword(email)
        setMessage('Password reset link sent. Check your inbox.')
        return
      }

      if (mode === 'recover') {
        if (newPassword !== confirmNewPassword) {
          throw new Error('Passwords do not match')
        }
        await updatePassword(newPassword)
        setMessage('Password updated successfully. You can now sign in.')
        setMode('login')
        setNewPassword('')
        setConfirmNewPassword('')
      }
    } catch (submitError) {
      setError(toFriendlyError(submitError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <img className="auth-logo" src="/images/logos/logo.svg" alt="Daniel's Diaries" />
        <h1>{title}</h1>
        <p className="muted">This is the React sidecar version of the auth flow.</p>
        {!isSupabaseConfigured ? (
          <p className="error-banner">
            {supabaseConfigErrorMessage}
          </p>
        ) : null}

        {error ? <p className="error-banner">{error}</p> : null}
        {message ? <p className="success-banner">{message}</p> : null}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode !== 'recover' ? (
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
          ) : null}

          {mode === 'recover' ? (
            <>
              <label>
                New password
                <input
                  required
                  minLength={6}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="••••••"
                />
              </label>
              <label>
                Confirm new password
                <input
                  required
                  minLength={6}
                  type="password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  placeholder="••••••"
                />
              </label>
            </>
          ) : (
            <>
              {mode !== 'forgot' ? (
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
              ) : null}

              {mode === 'signup' ? (
                <label>
                  Confirm password
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••"
                  />
                </label>
              ) : null}
            </>
          )}

          <button type="submit" disabled={loading || !isSupabaseConfigured}>
            {loading ? 'Please wait...' : title}
          </button>
        </form>

        <div className="auth-links">
          {mode === 'login' ? (
            <>
              <button type="button" className="text-button" onClick={() => setMode('signup')}>
                Need an account? Sign up
              </button>
              <button type="button" className="text-button" onClick={() => setMode('forgot')}>
                Forgot password?
              </button>
            </>
          ) : null}

          {mode === 'signup' || mode === 'forgot' || mode === 'recover' ? (
            <button type="button" className="text-button" onClick={() => setMode('login')}>
              Back to sign in
            </button>
          ) : null}
        </div>
      </section>
    </main>
  )
}
