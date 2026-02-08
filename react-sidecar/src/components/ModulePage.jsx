import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppHeader from './AppHeader'
import { getCurrentUser } from '../lib/auth'
import {
  getChildModules,
  getChildren,
  getModuleById,
  getModules,
  getParentModules,
  updateChildModuleStatus
} from '../lib/data'

export default function ModulePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [children, setChildren] = useState([])
  const [modules, setModules] = useState([])
  const [entitlements, setEntitlements] = useState([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState(searchParams.get('moduleId') || '')
  const [progressRecords, setProgressRecords] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          setError('Please sign in to continue.')
          return
        }

        const [childrenData, modulesData, parentModulesData] = await Promise.all([
          getChildren(user.id),
          getModules(),
          getParentModules(user.id)
        ])

        if (!mounted) return
        setChildren(childrenData)
        setModules(modulesData)
        setEntitlements(parentModulesData.map((entry) => String(entry.module_id)))

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
  }, [searchParams])

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
          <p>Browse modules, view details, and set progress per child.</p>
        </section>

        {error ? <p className="error-banner">{error}</p> : null}

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
                    <p>{entitlement ? '✅ Purchased' : '🛒 Not purchased yet'}</p>
                    <p>Status: {progress?.status || 'not_started'}</p>
                    <div className="row-buttons">
                      <button type="button" onClick={() => handleOpenModule(module.id)}>
                        View
                      </button>
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
