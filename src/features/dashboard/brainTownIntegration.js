// ================================================
// BRAIN TOWN INTEGRATION
// Wires all Brain Town features into the existing dashboard.
// Called after a child is selected and data is loaded.
// ================================================

import { openExplainer, renderExplainerCard } from './danielExplainer.js'
import { initBrainTownMap, updateBrainTownData } from './brainTownMap.js'
import { initSvgMap } from './brainTownSvgMap.js'
import { initRoadBuilderTab } from './roadBuilderTab.js'
import { initArcadeTab } from './arcadeTab.js'
import { listGames } from '../../minigames/index.js'
import './brainTownStyles.css'

let _initialized = false
let _brainTownContainer = null

/**
 * Initialize all Brain Town features.
 * Call this after the child is selected and modules/childModules are loaded.
 *
 * @param {Object} opts
 * @param {HTMLElement} opts.container - The main container to inject Brain Town into
 * @param {Array} opts.modules - All available modules
 * @param {Array} opts.childModules - Child's module progress
 * @param {Object} opts.selectedChild - Currently selected child
 * @param {Function} opts.onNavigateToAdventure - Called when user selects a Super Skill (receives skill object)
 */
export async function initBrainTown({
  container,
  modules,
  childModules,
  selectedChild,
  onNavigateToAdventure
}) {
  if (!container) return
  _brainTownContainer = container

  // Check if first time - show explainer
  const explainerKey = `bt_explainer_seen_${selectedChild?.id || 'anon'}`
  const hasSeenExplainer = localStorage.getItem(explainerKey)

  // Build the Brain Town section directly (no internal nav - tabs are in main dashboard nav)
  container.innerHTML = `
    ${renderExplainerCard()}
    <div class="bt-map-toggle">
      <button class="bt-toggle-btn active" id="btnMapPng">Image Map</button>
      <button class="bt-toggle-btn" id="btnMapSvg">SVG Prototype</button>
    </div>
    <div id="brainTownMapContainer"></div>
    <div id="brainTownSvgContainer" style="display:none"></div>
  `

  // Explainer card click handler
  const explainerCard = container.querySelector('#danielExplainerCard')
  const explainerPlayBtn = container.querySelector('#danielExplainerPlayBtn')
  if (explainerCard) {
    explainerCard.addEventListener('click', () => openExplainer())
  }
  if (explainerPlayBtn) {
    explainerPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      openExplainer()
    })
  }

  // Initialize Brain Town Map (PNG version)
  const mapContainer = container.querySelector('#brainTownMapContainer')
  await initBrainTownMap(mapContainer, {
    modules,
    childModules,
    onSelectSkill: (skill) => {
      if (onNavigateToAdventure) {
        onNavigateToAdventure(skill)
      }
    }
  })

  // Initialize SVG Map prototype (lazy — only on first toggle)
  const svgContainer = container.querySelector('#brainTownSvgContainer')
  let svgInitialized = false

  const btnPng = container.querySelector('#btnMapPng')
  const btnSvg = container.querySelector('#btnMapSvg')
  if (btnPng && btnSvg) {
    btnPng.addEventListener('click', () => {
      mapContainer.style.display = ''
      svgContainer.style.display = 'none'
      btnPng.classList.add('active')
      btnSvg.classList.remove('active')
    })
    btnSvg.addEventListener('click', async () => {
      if (!svgInitialized) {
        svgInitialized = true
        await initSvgMap(svgContainer, {
          modules,
          childModules,
          onSelectSkill: (skill) => {
            if (onNavigateToAdventure) onNavigateToAdventure(skill)
          }
        })
      }
      mapContainer.style.display = 'none'
      svgContainer.style.display = ''
      btnSvg.classList.add('active')
      btnPng.classList.remove('active')
    })
  }

  // ── Road Builder (mounted in main dashboard tab) ──
  const roadBuilderMount = document.getElementById('roadBuilderMount')
  if (roadBuilderMount && !roadBuilderMount.dataset.initialized) {
    roadBuilderMount.innerHTML = `
      <div class="bt-section-card" style="max-width:1180px;margin:0 auto;padding:0 22px 40px">
        <h2 class="bt-section-title">Road Builder</h2>
        <p class="bt-section-sub">Your brain is a town, and every think, feel, and act builds a road. Choose which roads to build and watch them grow.</p>
        <div id="roadBuilderContent"></div>
      </div>
    `
    initRoadBuilderTab(roadBuilderMount.querySelector('#roadBuilderContent'))
    roadBuilderMount.dataset.initialized = '1'
  }

  // ── Arcade (mounted in main dashboard tab) ──
  const arcadeMount = document.getElementById('arcadeMount')
  if (arcadeMount && !arcadeMount.dataset.initialized) {
    initArcadeTab(arcadeMount, {
      onPlayGame: (gameId) => {
        launchArcadeGame(gameId, container)
      }
    })
    arcadeMount.dataset.initialized = '1'
  }

  // Show explainer on first visit
  if (!hasSeenExplainer) {
    setTimeout(() => {
      openExplainer(() => {
        localStorage.setItem(explainerKey, '1')
      })
    }, 600)
  }

  _initialized = true
}

/**
 * Update Brain Town with new data (e.g. after module completion).
 */
export function updateBrainTown({ modules, childModules }) {
  updateBrainTownData({ modules, childModules })
}

/**
 * Get the adventures panel slot (no longer used - adventure map stays in place).
 */
export function getAdventureSlot() {
  return null
}

/**
 * Switch to a specific tab. Maps old Brain Town tab IDs to main dashboard tabs.
 */
export function switchBrainTownTab(tabId) {
  const tabMap = {
    'braintown': 'dashboard',
    'adventures': 'adventures',
    'roadbuilder': 'roadBuilder',
    'arcade': 'arcade'
  }
  const dashboardTab = tabMap[tabId] || tabId
  if (window.showDashboardTab) {
    window.showDashboardTab(dashboardTab)
  }
}

function launchArcadeGame(gameId, container) {
  // Create a modal for the game
  const modal = document.createElement('div')
  modal.className = 'arcade-game-modal'
  modal.innerHTML = `
    <div class="arcade-game-overlay">
      <div class="arcade-game-content">
        <button class="arcade-game-close" id="arcadeGameClose" aria-label="Close game">&times;</button>
        <div class="arcade-game-container" id="arcadeGameContainer"></div>
      </div>
    </div>
  `

  // Style the modal
  const overlay = modal.querySelector('.arcade-game-overlay')
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'rgba(16, 36, 60, 0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: '70', padding: '12px'
  })
  const content = modal.querySelector('.arcade-game-content')
  Object.assign(content.style, {
    background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '800px',
    height: '85vh', overflow: 'hidden', position: 'relative',
    boxShadow: '0 30px 70px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column'
  })
  const closeBtn = modal.querySelector('#arcadeGameClose')
  Object.assign(closeBtn.style, {
    position: 'absolute', top: '12px', right: '12px', zIndex: '100',
    width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #e5e7eb',
    background: '#fff', color: '#16324f', fontSize: '24px', fontWeight: '700',
    cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1'
  })

  const gameContainer = modal.querySelector('#arcadeGameContainer')
  Object.assign(gameContainer.style, { flex: '1', position: 'relative', overflow: 'hidden' })

  const abortController = new AbortController()

  closeBtn.addEventListener('click', () => {
    abortController.abort()
    modal.remove()
  })
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      abortController.abort()
      modal.remove()
    }
  })

  document.body.appendChild(modal)

  // Try to run the game using the existing mini-game system
  try {
    const games = listGames()
    const gameDef = games.find(g => g.id === gameId)
    if (!gameDef) {
      gameContainer.innerHTML = '<p style="padding:40px;text-align:center;color:#6b7e95">Game not found.</p>'
      return
    }

    const ctx = {
      gameId,
      container: gameContainer,
      config: gameDef.defaultConfig || {},
      difficulty: 'medium',
      child: window.selectedChild || window.state?.selectedChild || { id: 'arcade', name: 'Player' },
      a11y: { reducedMotion: false, highContrast: false },
      emit: () => {},
      i18n: { t: (k) => k },
      audio: { play: () => {}, stop: () => {} },
      signal: abortController.signal
    }

    const game = gameDef.factory(ctx)
    if (game && typeof game.mount === 'function') {
      game.mount(gameContainer)
      if (typeof game.start === 'function') game.start()
    }

    // Clean up when modal closes
    abortController.signal.addEventListener('abort', () => {
      if (game && typeof game.dispose === 'function') {
        try { game.dispose() } catch (_) {}
      }
    })
  } catch (e) {
    console.error('[Arcade] Error launching game:', e)
    gameContainer.innerHTML = '<p style="padding:40px;text-align:center;color:#6b7e95">Something went wrong. Please try again.</p>'
  }
}
