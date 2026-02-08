import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { checkAuth } from '../lib/auth'

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let mounted = true

    async function validate() {
      try {
        const session = await checkAuth()
        if (!mounted) return
        setStatus(session ? 'authenticated' : 'anonymous')
      } catch {
        if (!mounted) return
        setStatus('anonymous')
      }
    }

    validate()

    return () => {
      mounted = false
    }
  }, [])

  if (status === 'loading') {
    return <main className="auth-shell">Checking session...</main>
  }

  if (status === 'anonymous') {
    return <Navigate to="/" replace />
  }

  return children
}
