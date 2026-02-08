import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from './AppHeader'
import { getCurrentUser } from '../lib/auth'
import { createChild, getChildren, getModules } from '../lib/data'

const welcomeMessages = [
  'Every great journey starts with one small step.',
  'You are creating something powerful for your family.',
  'Small moments of emotional learning make a big difference.'
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [children, setChildren] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [childName, setChildName] = useState('')
  const [childDob, setChildDob] = useState('')
  const [savingChild, setSavingChild] = useState(false)

  const welcomeMessage = useMemo(
    () => welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)],
    []
  )

  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          navigate('/', { replace: true })
          return
        }

        const [childrenData, modulesData] = await Promise.all([
          getChildren(currentUser.id),
          getModules()
        ])

        if (!mounted) return
        setUser(currentUser)
        setChildren(childrenData)
        setModules(modulesData)
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message || 'Failed to load landing data')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [navigate])

  async function handleAddChild(event) {
    event.preventDefault()
    if (!user) return

    setSavingChild(true)
    setError('')

    try {
      const newChild = await createChild(user.id, childName.trim(), childDob)
      setChildren((prev) => [...prev, newChild])
      setChildName('')
      setChildDob('')
    } catch (saveError) {
      setError(saveError.message || 'Could not add child')
    } finally {
      setSavingChild(false)
    }
  }

  if (loading) {
    return (
      <>
        <AppHeader />
        <main className="page-shell">Loading your family dashboard...</main>
      </>
    )
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="panel hero-panel">
          <h2>{user?.email ? `Welcome back, ${user.email.split('@')[0]}` : 'Welcome back'}</h2>
          <p>{welcomeMessage}</p>
          <button type="button" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
        </section>

        {error ? <p className="error-banner">{error}</p> : null}

        <section className="panel">
          <h3>Your children ({children.length})</h3>
          {children.length === 0 ? (
            <p className="muted">No child profiles yet — add your first one below to get started.</p>
          ) : (
            <div className="card-grid">
              {children.map((child) => (
                <article key={child.id} className="card">
                  <h4>{child.name}</h4>
                  <p>DOB: {child.date_of_birth || 'Not set'}</p>
                  <p>⭐ {child.stars || 0} stars</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <h3>Add child profile</h3>
          <form className="inline-form" onSubmit={handleAddChild}>
            <input
              required
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              placeholder="Child name"
            />
            <input required type="date" value={childDob} onChange={(event) => setChildDob(event.target.value)} />
            <button type="submit" disabled={savingChild}>
              {savingChild ? 'Saving...' : 'Add child'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h3>Workbook library ({modules.length})</h3>
          {modules.length === 0 ? (
            <p className="muted">No modules loaded yet.</p>
          ) : (
            <div className="card-grid">
              {modules.slice(0, 6).map((module) => (
                <article key={module.id} className="card">
                  <h4>{module.title || module.name || `Module ${module.id}`}</h4>
                  <p>{module.description || 'Module description will appear here.'}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
