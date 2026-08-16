// ================================================
// SUPER SKILL GATE
// Children work through Super Skills in order (super_skills.sort_order):
// Brain Builder first, then Thought Driver, and so on. Only one skill is
// "active" at a time; later skills are locked until the earlier ones are
// finished.
//
// States per skill (strictly sequential — no exceptions for skills a child
// dabbled in before sequencing existed; completed work still counts toward
// finishing those skills when their turn comes):
//   'completed' - every module in the skill is done
//   'active'    - the first unfinished skill in order (the one to work on)
//   'locked'    - not reachable until everything before it is complete
//
// The gate FAILS OPEN: if reference data hasn't loaded, nothing is locked.
// Locking is a guidance feature, not a security boundary — it must never
// brick the dashboard because a fetch was slow.
// ================================================

const slugOf = (sk) => sk.slug || (sk.name || '').toLowerCase().replace(/\s+/g, '-')

// Practitioners see the whole map: every skill is open so they can tour the
// program without completing modules. The flag is stamped into sessionStorage
// at login (loginPage) and when the dashboard resolves practitioner status
// (dashboardPage), so this stays a synchronous read.
const PRACTITIONER_SESSION_KEY = 'dd_is_practitioner'

export function isPractitionerSession() {
  try {
    return sessionStorage.getItem(PRACTITIONER_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Pure transform: open every skill for practitioner accounts.
 * Completed skills keep their state; everything else becomes reachable.
 */
export function applyPractitionerOverride(gate) {
  if (!gate) return gate
  const bySlug = {}
  Object.entries(gate.bySlug).forEach(([slug, p]) => {
    bySlug[slug] = { ...p, state: p.state === 'completed' ? 'completed' : 'active' }
  })
  return { ...gate, bySlug }
}

/**
 * Pure state computation.
 * @param {Array} skills - super_skills rows ({ id, slug, name, sort_order, is_active })
 * @param {Array} modules - raw modules ({ id, super_skill_id, category })
 * @param {Array} childModules - child_modules rows ({ module_id, is_completed })
 * @returns {{ bySlug: Object, activeSlug: string|null, orderedSlugs: string[] }|null}
 */
export function computeSkillStates(skills, modules, childModules) {
  if (!Array.isArray(skills) || skills.length === 0) return null
  const mods = Array.isArray(modules) ? modules : []
  const childMods = Array.isArray(childModules) ? childModules : []

  const ordered = skills
    .filter(sk => sk.is_active !== false)
    .slice()
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))

  const completedIds = new Set(childMods.filter(cm => cm.is_completed === true).map(cm => cm.module_id))

  const bySlug = {}
  ordered.forEach(sk => {
    const slug = slugOf(sk)
    const skillModules = mods.filter(m =>
      m.super_skill_id === sk.id ||
      (m.category && m.category.toLowerCase().replace(/\s+/g, '-') === slug)
    )
    const done = skillModules.filter(m => completedIds.has(m.id)).length
    bySlug[slug] = {
      slug,
      name: sk.name || slug,
      order: sk.sort_order ?? 999,
      total: skillModules.length,
      done,
      state: 'locked' // resolved below
    }
  })

  const orderedSlugs = ordered.map(slugOf)

  // The active skill is the first one, in order, that still has unfinished
  // modules. Skills with no modules yet can't be worked on, so they're
  // skipped when choosing the active skill (they render as locked /
  // under construction).
  let activeSlug = orderedSlugs.find(s => {
    const p = bySlug[s]
    return p.total > 0 && p.done < p.total
  }) || null

  orderedSlugs.forEach(s => {
    const p = bySlug[s]
    if (p.total > 0 && p.done >= p.total) p.state = 'completed'
    else if (s === activeSlug) p.state = 'active'
    else p.state = 'locked'
  })

  // Everything finished: keep the last skill open so the map never has
  // zero reachable districts.
  if (!activeSlug && orderedSlugs.length > 0) {
    activeSlug = orderedSlugs[orderedSlugs.length - 1]
  }

  return { bySlug, activeSlug, orderedSlugs }
}

/**
 * Convenience wrapper reading the dashboard's global state.
 * Returns null when data isn't available yet (callers must fail open).
 */
export function getSkillGate() {
  const skills = window.superSkills
  const modules = window.modules || window.state?.modules
  const childModules = window.childModules || window.state?.childModules
  if (!Array.isArray(skills) || skills.length === 0) return null
  const gate = computeSkillStates(skills, modules, childModules)
  return isPractitionerSession() ? applyPractitionerOverride(gate) : gate
}

export function isSlugLocked(slug, gate = undefined) {
  const g = gate === undefined ? getSkillGate() : gate
  if (!g || !g.bySlug[slug]) return false // fail open
  return g.bySlug[slug].state === 'locked'
}

/** The skill the child should be working on right now (or null). */
export function getActiveSkill(gate = undefined) {
  const g = gate === undefined ? getSkillGate() : gate
  if (!g || !g.activeSlug) return null
  return g.bySlug[g.activeSlug] || null
}

/**
 * What must be finished before `slug` opens: the nearest earlier skill
 * (with modules) that isn't complete. Used for "Finish X to unlock" copy.
 */
export function getUnlockRequirement(slug, gate = undefined) {
  const g = gate === undefined ? getSkillGate() : gate
  if (!g) return null
  const idx = g.orderedSlugs.indexOf(slug)
  if (idx <= 0) return null
  for (let i = idx - 1; i >= 0; i--) {
    const p = g.bySlug[g.orderedSlugs[i]]
    if (p.total > 0 && p.state !== 'completed') return p
  }
  return null
}
