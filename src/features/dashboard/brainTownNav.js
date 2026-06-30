// ================================================
// BRAIN TOWN NAV - Tab navigation controller
// Manages switching between Brain Town, Adventures, Road Builder, Arcade
// ================================================

const TABS = [
  { id: 'braintown', label: 'Brain Town', emoji: '&#x1F5FA;&#xFE0F;' },
  { id: 'adventures', label: 'Adventures', emoji: '&#x1F9ED;' },
  { id: 'roadbuilder', label: 'Road Builder', emoji: '&#x1F6E3;&#xFE0F;' },
  { id: 'arcade', label: 'Arcade', emoji: '&#x1F3AE;' },
]

let _navEl = null
let _panels = {}
let _activeTab = 'braintown'
let _onTabChange = null

export function initBrainTownNav(navContainer, panels, { onTabChange, defaultTab } = {}) {
  _navEl = navContainer
  _panels = panels // { braintown: el, adventures: el, roadbuilder: el, arcade: el }
  _onTabChange = onTabChange || null
  _activeTab = defaultTab || 'braintown'

  renderNav()
  showTab(_activeTab)
}

function renderNav() {
  if (!_navEl) return
  _navEl.innerHTML = `<div class="btn-nav-content">
    ${TABS.map(t => `
      <button class="btn-nav-tab${t.id === _activeTab ? ' active' : ''}" data-tab="${t.id}">
        ${t.emoji} ${t.label}
      </button>
    `).join('')}
  </div>`

  _navEl.querySelectorAll('.btn-nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab
      showTab(tab)
    })
  })
}

export function showTab(tabId) {
  _activeTab = tabId

  // Update nav buttons
  if (_navEl) {
    _navEl.querySelectorAll('.btn-nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId)
    })
  }

  // Show/hide panels
  Object.entries(_panels).forEach(([id, el]) => {
    if (el) el.style.display = id === tabId ? 'block' : 'none'
  })

  if (_onTabChange) _onTabChange(tabId)
}

export function getActiveTab() {
  return _activeTab
}
