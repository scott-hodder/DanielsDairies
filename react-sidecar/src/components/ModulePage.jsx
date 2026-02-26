import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppHeader from './AppHeader'
import { getCurrentUser } from '../lib/auth'
import {
  getChildModules,
  getChildren,
  getCreditSummary,
  getModuleById,
  getModuleUnlocks,
  getModules,
  getParentModules,
  unlockModuleWithCredit,
  updateChildModuleStatus
} from '../lib/data'

function getCurrentPeriodWindow() {
  const now = new Date()
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))

  return {
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10)
  }
}

export default function ModulePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [children, setChildren] = useState([])
  const [modules, setModules] = useState([])
  const [entitlements, setEntitlements] = useState([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState(searchParams.get('moduleId') || '')
  const [progressRecords, setProgressRecords] = useState([])
  const [creditSummary, setCreditSummary] = useState(null)
  const [unlockingModuleId, setUnlockingModuleId] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)

  const period = useMemo(() => getCurrentPeriodWindow(), [])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          setError('Please sign in to continue.')
          return
        }

        const [childrenData, modulesData, parentModulesData, unlockRows, summary] = await Promise.all([
          getChildren(user.id),
          getModules(),
          getParentModules(user.id),
          getModuleUnlocks(user.id, period.periodStart, period.periodEnd),
          getCreditSummary(user.id, period.periodStart, period.periodEnd)
        ])

        if (!mounted) return
        setCurrentUserId(user.id)
        setChildren(childrenData)
        setModules(modulesData)

        const legacyEntitlements = parentModulesData.map((entry) => String(entry.module_id))
        const subscriptionEntitlements = unlockRows.map((entry) => String(entry.module_id))
        setEntitlements([...new Set([...legacyEntitlements, ...subscriptionEntitlements])])

        setCreditSummary(summary)

        if (childrenData[0]) setSelectedChildId(String(childrenData[0].id))
        if (!searchParams.get('moduleId') && modulesData[0]) setSelectedModuleId(String(modulesData[0].id))
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message || 'Failed to load module page data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [period.periodEnd, period.periodStart, searchParams])

  useEffect(() => {
    let mounted = true

    async function loadProgress() {
      if (!selectedChildId) return
      try {
        const records = await getChildModules(selectedChildId)
        if (!mounted) return
        setProgressRecords(records)
      } catch (progressError) {
        if (!mounted) return
        setError(progressError.message || 'Failed to load child module progress')
      }
    }

    loadProgress()

    return () => {
      mounted = false
    }
  }, [selectedChildId])

  const selectedModule = useMemo(() => {
    if (!selectedModuleId) return null
    return modules.find((module) => String(module.id) === String(selectedModuleId)) || null
  }, [modules, selectedModuleId])

  const progressByModule = useMemo(() => {
    const map = new Map()
    progressRecords.forEach((record) => {
      map.set(String(record.module_id), record)
    })
    return map
  }, [progressRecords])

  async function refreshCreditState() {
    if (!currentUserId) return

    const [unlockRows, summary] = await Promise.all([
      getModuleUnlocks(currentUserId, period.periodStart, period.periodEnd),
      getCreditSummary(currentUserId, period.periodStart, period.periodEnd)
    ])

    setEntitlements((prev) => {
      const unlockEntitlements = unlockRows.map((entry) => String(entry.module_id))
      return [...new Set([...prev, ...unlockEntitlements])]
    })
    setCreditSummary(summary)
  }

  async function handleUnlockWithCredit(moduleId) {
    setError('')
    setSuccess('')
    setUnlockingModuleId(moduleId)

    try {
      await unlockModuleWithCredit(moduleId, period.periodStart)
      await refreshCreditState()
      setSuccess('Module unlocked successfully for this billing period.')
    } catch (unlockError) {
      setError(unlockError.message || 'Failed to unlock module with credits')
    } finally {
      setUnlockingModuleId(null)
    }
  }

  async function handleOpenModule(moduleId) {
    setSelectedModuleId(String(moduleId))
    const module = await getModuleById(moduleId)
    setSearchParams({ moduleId: String(module.id) })
  }

  async function handleStatusChange(moduleId, status) {
    if (!selectedChildId) return
    setError('')

    try {
      const updated = await updateChildModuleStatus(selectedChildId, moduleId, status)
      setProgressRecords((prev) => {
        const filtered = prev.filter((entry) => String(entry.module_id) !== String(moduleId))
        return [...filtered, { ...updated, modules: selectedModule }]
      })
    } catch (statusError) {
      setError(statusError.message || 'Failed to update module status')
    }
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="panel hero-panel">
          <h2>Workbook Module Library</h2>
          <p>Browse modules, unlock with credits, and set progress per child.</p>
        </section>

        {error ? <p className="error-banner">{error}</p> : null}
        {success ? <p className="success-banner">{success}</p> : null}

        <section className="panel">
          <h3>Current credit wallet</h3>
          <p className="muted">
            Billing period: {period.periodStart} to {period.periodEnd}
          </p>
          {creditSummary ? (
            <div className="stats-row">
              <div className="stat-box">
                <span className="stat-label">Credits granted</span>
                <strong>{creditSummary.credits_granted}</strong>
              </div>
              <div className="stat-box">
                <span className="stat-label">Credits used</span>
                <strong>{creditSummary.credits_used}</strong>
              </div>
              <div className="stat-box">
                <span className="stat-label">Credits available</span>
                <strong>{creditSummary.credits_available}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">Loading wallet...</p>
          )}
        </section>

        <section className="panel">
          <h3>Child context</h3>
          {children.length === 0 ? (
            <p className="muted">Add a child in Landing to start assigning modules.</p>
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
          <h3>Available modules</h3>
          {loading ? (
            <p className="muted">Loading modules...</p>
          ) : (
            <div className="card-grid">
              {modules.map((module) => {
                const entitlement = entitlements.includes(String(module.id))
                const progress = progressByModule.get(String(module.id))
                return (
                  <article className="card" key={module.id}>
                    <h4>{module.title || `Module ${module.id}`}</h4>
                    <p>{module.description || 'No description available.'}</p>
                    <p>Category: {module.category || 'General'}</p>
                    <p>{entitlement ? '✅ Unlocked' : '🔒 Locked'}</p>
                    <p>Status: {progress?.status || 'not_started'}</p>
                    <div className="row-buttons">
                      <button type="button" onClick={() => handleOpenModule(module.id)}>
                        View
                      </button>
                      {!entitlement ? (
                        <button
                          type="button"
                          disabled={unlockingModuleId === module.id}
                          onClick={() => handleUnlockWithCredit(module.id)}
                        >
                          {unlockingModuleId === module.id ? 'Unlocking...' : 'Unlock (1 credit)'}
                        </button>
                      ) : null}
                      <button type="button" onClick={() => handleStatusChange(module.id, 'in_progress')}>
                        Mark In Progress
                      </button>
                      <button type="button" onClick={() => handleStatusChange(module.id, 'completed')}>
                        Mark Complete
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {selectedModule ? (
          <section className="panel">
            <h3>Module detail: {selectedModule.title || `Module ${selectedModule.id}`}</h3>
            <p>{selectedModule.description || 'No long-form description available.'}</p>
            <p>Price: ${Number(selectedModule.price || 0) / 100}</p>
            <p>Active: {selectedModule.is_active ? 'Yes' : 'No'}</p>
          </section>
        ) : null}
      </main>
    </>
  )
}
