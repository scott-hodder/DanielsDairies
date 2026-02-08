import { useEffect, useMemo, useState } from 'react'
import AppHeader from './AppHeader'
import { createModule, deleteModule, getModules, getSuperSkills, updateModule } from '../lib/data'

const defaultForm = {
  title: '',
  description: '',
  category: '',
  price: 0,
  is_active: true
}

export default function AdminPage() {
  const [modules, setModules] = useState([])
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const [modulesData, skillsData] = await Promise.all([getModules(), getSuperSkills()])
        if (!mounted) return
        setModules(modulesData)
        setSkills(skillsData)
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message || 'Failed to load admin data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const skillOptions = useMemo(() => skills.map((skill) => skill.name).filter(Boolean), [skills])

  async function handleCreate(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const created = await createModule({
        title: form.title,
        description: form.description,
        category: form.category || null,
        price: Number(form.price || 0),
        is_active: Boolean(form.is_active)
      })

      setModules((prev) => [created, ...prev])
      setForm(defaultForm)
    } catch (saveError) {
      setError(saveError.message || 'Failed to create module')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(module) {
    setError('')
    try {
      const updated = await updateModule(module.id, { is_active: !module.is_active })
      setModules((prev) => prev.map((item) => (item.id === module.id ? updated : item)))
    } catch (updateError) {
      setError(updateError.message || 'Failed to update module')
    }
  }

  async function handleDelete(moduleId) {
    setError('')
    try {
      await deleteModule(moduleId)
      setModules((prev) => prev.filter((module) => module.id !== moduleId))
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete module')
    }
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="panel hero-panel">
          <h2>Admin Centre</h2>
          <p>Manage modules and see reference super-skills in the React sidecar.</p>
        </section>

        {error ? <p className="error-banner">{error}</p> : null}

        <section className="panel">
          <h3>Create module</h3>
          <form className="admin-form" onSubmit={handleCreate}>
            <input
              required
              placeholder="Module title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <input
              placeholder="Category"
              list="skill-categories"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            />
            <datalist id="skill-categories">
              {skillOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <input
              type="number"
              min="0"
              placeholder="Price"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            />
            <textarea
              rows={3}
              placeholder="Description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
              />
              Active module
            </label>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Create module'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h3>Existing modules ({modules.length})</h3>
          {loading ? (
            <p className="muted">Loading modules...</p>
          ) : modules.length === 0 ? (
            <p className="muted">No modules found.</p>
          ) : (
            <div className="card-grid">
              {modules.map((module) => (
                <article className="card" key={module.id}>
                  <h4>{module.title || `Module ${module.id}`}</h4>
                  <p>{module.description || 'No description'}</p>
                  <p>Category: {module.category || 'Uncategorized'}</p>
                  <p>Status: {module.is_active ? 'Active' : 'Inactive'}</p>
                  <div className="row-buttons">
                    <button type="button" onClick={() => handleToggleActive(module)}>
                      {module.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" className="danger-btn" onClick={() => handleDelete(module.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
