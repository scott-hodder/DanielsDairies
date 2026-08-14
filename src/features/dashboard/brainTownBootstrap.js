// ================================================
// BRAIN TOWN BOOTSTRAP
// Initializes Brain Town features once a child is selected.
// ================================================

import { initBrainTown, updateBrainTown, switchBrainTownTab } from './brainTownIntegration.js'
import { getSkillGate } from './superSkillGate.js'

let _initialized = false

function navigateToAdventure(skill) {
  let slug = skill.slug || (skill.name || skill.title || '').toLowerCase().replace(/\s+/g, '-')

  // Sequential unlock: locked skills can't be travelled to — go to the
  // active skill instead (the map popup explains why).
  const gate = getSkillGate()
  if (gate && gate.bySlug[slug]?.state === 'locked' && gate.activeSlug) {
    slug = gate.activeSlug
    skill = (window.superSkills || []).find(s => s.slug === slug) || skill
  }

  // Set the category in localStorage so the adventure map picks it up
  try {
    localStorage.setItem('adventureMapSelectedCategory', slug)
  } catch (_) {}

  // Set the global focus super skill
  window.currentFocusSuperSkill = slug

  // Switch to the Adventures tab
  if (window.showDashboardTab) window.showDashboardTab('adventures')

  // If the enhanced dashboard adventure map is available, update it directly
  const map = window.enhancedDashboard?.adventureMap
  if (map) {
    map.currentCategory = slug
    map._skillSelectedThisSession = true
    if (typeof map.setStoredCategory === 'function') map.setStoredCategory(slug)
    if (typeof map.render === 'function') map.render()
    // Re-center after layout settles
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
      if (typeof map.centerOnCurrentModule === 'function') map.centerOnCurrentModule()
    }, 300)
  }
}

function tryInit() {
  const container = document.getElementById('brainTownSection')
  if (!container) return

  const child = window.selectedChild || window.state?.selectedChild
  if (!child || !child.id) return

  const modules = window.modules || window.state?.modules || []
  const childModules = window.childModules || window.state?.childModules || []

  if (_initialized) {
    updateBrainTown({ modules, childModules })
    return
  }

  _initialized = true

  initBrainTown({
    container,
    modules,
    childModules,
    selectedChild: child,
    onNavigateToAdventure: navigateToAdventure
  })
}

window.addEventListener('childSelected', () => {
  setTimeout(tryInit, 100)
})

const origRefresh = window.refreshEnhancedDashboard
window.refreshEnhancedDashboard = function() {
  if (typeof origRefresh === 'function') origRefresh()
  setTimeout(tryInit, 200)
}

let _pollCount = 0
const _pollInterval = setInterval(() => {
  _pollCount++
  if (_pollCount > 60) { clearInterval(_pollInterval); return }
  const child = window.selectedChild || window.state?.selectedChild
  if (child && child.id) {
    clearInterval(_pollInterval)
    setTimeout(tryInit, 300)
  }
}, 500)

window.initBrainTown = tryInit
window.switchBrainTownTab = switchBrainTownTab
