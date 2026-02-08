import { useEffect, useMemo, useState } from 'react'
import AppHeader from './AppHeader'
import { getCurrentUser } from '../lib/auth'
import { getChildModules, getChildren, getWeeklyCheckins } from '../lib/data'

export default function ParentInsightsPage() {
  const [children, setChildren] = useState([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [moduleRows, setModuleRows] = useState([])
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadBase() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          setError('Please sign in again to view insights.')
          return
        }

        const [childrenData, checkinData] = await Promise.all([
          getChildren(user.id),
          getWeeklyCheckins(user.id)
        ])

        if (!mounted) return
        setChildren(childrenData)
        setCheckins(checkinData)

        if (childrenData[0]) setSelectedChildId(String(childrenData[0].id))
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message || 'Failed to load insights')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadBase()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadForChild() {
      if (!selectedChildId) {
        setModuleRows([])
        return
      }

      try {
        const modules = await getChildModules(selectedChildId)
        if (!mounted) return
        setModuleRows(modules)
      } catch (childError) {
        if (!mounted) return
        setError(childError.message || 'Failed to load child module insights')
      }
    }

    loadForChild()
    return () => {
      mounted = false
    }
  }, [selectedChildId])

  const childCheckins = useMemo(
    () => checkins.filter((entry) => String(entry.child_id) === String(selectedChildId)),
    [checkins, selectedChildId]
  )

  const completedModules = moduleRows.filter((row) => row.status === 'completed').length
  const inProgressModules = moduleRows.filter((row) => row.status === 'in_progress').length

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="panel hero-panel">
          <h2>Parent Insights</h2>
          <p>Track module completion trends and weekly emotional check-ins.</p>
        </section>

        {error ? <p className="error-banner">{error}</p> : null}

        <section className="panel">
          <h3>Choose child</h3>
          {loading ? (
            <p className="muted">Loading insight context...</p>
          ) : children.length === 0 ? (
            <p className="muted">No children available yet.</p>
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
          <h3>Progress metrics</h3>
          <div className="stats-row">
            <div className="stat-box">
              <span className="stat-label">Completed modules</span>
              <strong>{completedModules}</strong>
            </div>
            <div className="stat-box">
              <span className="stat-label">In-progress modules</span>
              <strong>{inProgressModules}</strong>
            </div>
            <div className="stat-box">
              <span className="stat-label">Weekly check-ins</span>
              <strong>{childCheckins.length}</strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <h3>Latest weekly check-ins</h3>
          {childCheckins.length === 0 ? (
            <p className="muted">No weekly check-ins recorded for this child.</p>
          ) : (
            <div className="card-grid">
              {childCheckins.slice(0, 6).map((entry) => (
                <article className="card" key={entry.id}>
                  <h4>{new Date(entry.created_at).toLocaleDateString()}</h4>
                  <p>Intensity: {entry.intensity || '—'}</p>
                  <p>Challenge: {entry.challenge || '—'}</p>
                  <p>Goal: {entry.goal || '—'}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
