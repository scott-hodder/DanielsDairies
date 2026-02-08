import { useEffect, useMemo, useState } from 'react'
import AppHeader from './AppHeader'
import { getCurrentUser } from '../lib/auth'
import { getChildModules, getChildren, getModules } from '../lib/data'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [children, setChildren] = useState([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [moduleProgress, setModuleProgress] = useState([])
  const [modules, setModules] = useState([])

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          setError('Session expired. Please sign in again.')
          return
        }

        const [childrenData, modulesData] = await Promise.all([getChildren(user.id), getModules()])

        if (!mounted) return

        setChildren(childrenData)
        setModules(modulesData)

        if (childrenData.length > 0) {
          setSelectedChildId(String(childrenData[0].id))
        }
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message || 'Failed to load dashboard data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadChildProgress() {
      if (!selectedChildId) {
        setModuleProgress([])
        return
      }

      try {
        const progressData = await getChildModules(selectedChildId)
        if (!mounted) return
        setModuleProgress(progressData)
      } catch (progressError) {
        if (!mounted) return
        setError(progressError.message || 'Failed to load child progress')
      }
    }

    loadChildProgress()

    return () => {
      mounted = false
    }
  }, [selectedChildId])

  const selectedChild = useMemo(
    () => children.find((child) => String(child.id) === String(selectedChildId)),
    [children, selectedChildId]
  )

  const completedCount = moduleProgress.filter((item) => item.status === 'completed').length

  if (loading) {
    return (
      <>
        <AppHeader />
        <main className="page-shell">Loading dashboard...</main>
      </>
    )
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="panel hero-panel">
          <h2>Family Dashboard</h2>
          <p>Track your child&apos;s workbook journey and progress over time.</p>
        </section>

        {error ? <p className="error-banner">{error}</p> : null}

        <section className="panel">
          <h3>Select child</h3>
          {children.length === 0 ? (
            <p className="muted">No children found yet. Add one from Landing first.</p>
          ) : (
            <select value={selectedChildId} onChange={(event) => setSelectedChildId(event.target.value)}>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          )}
        </section>

        <section className="panel">
          <h3>Progress summary</h3>
          {selectedChild ? (
            <div className="stats-row">
              <div className="stat-box">
                <span className="stat-label">Child</span>
                <strong>{selectedChild.name}</strong>
              </div>
              <div className="stat-box">
                <span className="stat-label">Modules completed</span>
                <strong>{completedCount}</strong>
              </div>
              <div className="stat-box">
                <span className="stat-label">Total modules</span>
                <strong>{modules.length}</strong>
              </div>
              <div className="stat-box">
                <span className="stat-label">Stars</span>
                <strong>{selectedChild.stars || 0}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">Select a child to view progress.</p>
          )}
        </section>

        <section className="panel">
          <h3>Module progress</h3>
          {moduleProgress.length === 0 ? (
            <p className="muted">No module progress records yet for this child.</p>
          ) : (
            <div className="card-grid">
              {moduleProgress.map((entry) => (
                <article className="card" key={`${entry.child_id}-${entry.module_id}`}>
                  <h4>{entry.modules?.title || `Module ${entry.module_id}`}</h4>
                  <p>Status: {entry.status || 'not_started'}</p>
                  <p>Progress: {entry.progress ?? 0}%</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
