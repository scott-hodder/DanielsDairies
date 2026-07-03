// ================================================
// BRAIN TOWN INTEGRATION
// Wires all Brain Town features into the existing dashboard.
// Called after a child is selected and data is loaded.
// ================================================

import { openExplainer, renderExplainerCard } from './danielExplainer.js'
import { initSvgMap } from './brainTownSvgMap.js'
import { initRoadBuilderTab } from './roadBuilderTab.js'
import { initArcadeTab } from './arcadeTab.js'
import { listGames } from '../../minigames/index.js'
import { getA11yConfig } from '../../minigames/shared/A11yConfig.js'
import { difficultyForAge } from '../../minigames/content/difficulty.js'
import './brainTownStyles.css'

let _initialized = false
let _brainTownContainer = null
let _mapContainer = null
let _mapOpts = null

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
    <div id="brainTownMapContainer"></div>
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

  // Initialize the Brain Town map
  const mapContainer = container.querySelector('#brainTownMapContainer')
  _mapContainer = mapContainer
  _mapOpts = { onNavigateToAdventure }
  await initSvgMap(mapContainer, {
    modules,
    childModules,
    onSelectSkill: (skill) => {
      if (onNavigateToAdventure) {
        onNavigateToAdventure(skill)
      }
    }
  })

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
 * Re-renders the map so roads, progress pills, and the next-step
 * flag reflect the child's latest progress.
 */
export function updateBrainTown({ modules, childModules }) {
  if (!_mapContainer) return
  // initSvgMap clears the container itself (with a race guard), so no
  // manual clearing here — avoids a blank flash and duplicate renders.
  initSvgMap(_mapContainer, {
    modules: modules || [],
    childModules: childModules || [],
    onSelectSkill: (skill) => {
      if (_mapOpts?.onNavigateToAdventure) _mapOpts.onNavigateToAdventure(skill)
    }
  })
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

  // Run the game through its full lifecycle so completion resolves properly
  try {
    const games = listGames()
    const gameDef = games.find(g => g.id === gameId)
    if (!gameDef) {
      gameContainer.innerHTML = '<p style="padding:40px;text-align:center;color:#6b7e95">Game not found.</p>'
      return
    }

    const child = window.selectedChild || window.state?.selectedChild || { id: 'arcade', name: 'Player' }
    const ctx = {
      gameId,
      container: gameContainer,
      config: gameDef.defaultConfig || {},
      difficulty: difficultyForAge(child.age),
      child: { id: child.id, name: child.name, age: child.age },
      a11y: getA11yConfig(),
      emit: () => {},
      i18n: { t: (k) => k },
      audio: { play: () => {}, stop: () => {} },
      signal: abortController.signal
    }

    const game = gameDef.factory(ctx)

    // Clean up when modal closes
    abortController.signal.addEventListener('abort', () => {
      if (game && typeof game.dispose === 'function') {
        try { game.dispose() } catch (_) {}
      }
    })

    game.run().then((result) => {
      if (abortController.signal.aborted) return
      try { game.dispose() } catch (_) {}
      showArcadeEndScreen(gameContainer, gameDef, result, {
        onPlayAgain: () => {
          abortController.abort()
          modal.remove()
          launchArcadeGame(gameId, container)
        },
        onClose: () => {
          abortController.abort()
          modal.remove()
        }
      })
    }).catch((e) => {
      console.error('[Arcade] Game error:', e)
      if (!abortController.signal.aborted) {
        gameContainer.innerHTML = '<p style="padding:40px;text-align:center;color:#6b7e95">Something went wrong. Please try again.</p>'
      }
    })
  } catch (e) {
    console.error('[Arcade] Error launching game:', e)
    gameContainer.innerHTML = '<p style="padding:40px;text-align:center;color:#6b7e95">Something went wrong. Please try again.</p>'
  }
}

// End-of-game screen for arcade free play: celebrates the result and
// offers a replay, so a finished game never dead-ends.
function showArcadeEndScreen(host, gameDef, result, { onPlayAgain, onClose }) {
  const success = !!result?.success
  const stars = success ? Math.min(3, Math.max(0, result?.starsEarned ?? 0)) : 0
  const starRow = [1, 2, 3].map(i =>
    `<span style="font-size:44px;filter:${i <= stars ? 'none' : 'grayscale(1) opacity(.35)'}">⭐</span>`
  ).join('')

  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(22,50,79,0.55);padding:20px'
  overlay.innerHTML = `
    <div style="background:#fffff5;border-radius:22px;max-width:380px;width:100%;padding:26px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,0.3)">
      <img src="${success ? '/images/characters/Daniel_Celebrating.webp' : '/images/characters/Daniel_Thinking.webp'}" alt="Daniel" style="width:84px;height:84px;object-fit:contain" />
      <h3 style="margin:10px 0 4px;font-size:21px;color:#16324f">${success ? 'You did it!' : 'Good effort!'}</h3>
      <div style="margin:6px 0">${starRow}</div>
      <p style="margin:6px 0 16px;font-size:14px;color:#6b7e95">${success
        ? 'That practice makes your brain roads stronger.'
        : 'Every try builds the road a little more. Have another go?'}</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="ae-again" style="flex:1;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#f2c94c,#e6a800);color:#16324f;font-weight:700;font-size:15px;cursor:pointer">Play again</button>
        <button class="ae-close" style="flex:1;padding:12px;border:2px solid #d7deea;border-radius:12px;background:#fff;color:#405878;font-weight:700;font-size:15px;cursor:pointer">All done</button>
      </div>
    </div>
  `
  overlay.querySelector('.ae-again').addEventListener('click', onPlayAgain)
  overlay.querySelector('.ae-close').addEventListener('click', onClose)
  host.appendChild(overlay)
}
