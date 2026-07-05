// ================================================
// BRAIN TOWN INTEGRATION
// Wires all Brain Town features into the existing dashboard.
// Called after a child is selected and data is loaded.
// ================================================

import { openExplainer, renderExplainerChip } from './danielExplainer.js'
import { maybeShowFirstTimeGuide } from './firstTimeGuide.js'
import { initSvgMap } from './brainTownSvgMap.js'
import { initRoadBuilderTab } from './roadBuilderTab.js'
import { initArcadeTab, refreshArcadeBests } from './arcadeTab.js'
import { recordArcadePlay, saveArcadeReflection, getReflectionFor } from './arcadeLoop.js'
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
  // The explainer chip lives in the wrapper (not the map container) so it
  // survives map re-renders from updateBrainTown.
  container.innerHTML = `
    <div id="danielFirstGuideMount"></div>
    <div class="bt-map-wrap">
      <div id="brainTownMapContainer"></div>
      ${renderExplainerChip()}
    </div>
  `

  // Explainer chip click handler
  const explainerChip = container.querySelector('#danielExplainerChip')
  if (explainerChip) {
    explainerChip.addEventListener('click', () => openExplainer())
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

  // First-visit welcome callout from Daniel, pointing at the map.
  // Inline (never blocks the page) and self-dismisses once the child
  // taps a Super Skill district.
  maybeShowFirstTimeGuide(container.querySelector('#danielFirstGuideMount'), {
    childId: selectedChild?.id,
    mapContainer
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
      childId: selectedChild?.id,
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

    game.run().then(async (result) => {
      if (abortController.signal.aborted) return
      try { game.dispose() } catch (_) {}

      // Record the play server-side (star cap + personal best decided there).
      const reward = await recordArcadePlay(child.id, gameId, {
        score: result?.score ?? result?.starsEarned ?? 0,
        success: !!result?.success
      })
      if (reward?.awarded_stars > 0) {
        // Keep the in-memory child in sync so the header stars don't lag.
        const liveChild = window.selectedChild || window.state?.selectedChild
        if (liveChild && liveChild.id === child.id) {
          liveChild.stars = (liveChild.stars || 0) + reward.awarded_stars
        }
        refreshArcadeBests()
      }

      showArcadeEndScreen(gameContainer, gameDef, result, {
        reward,
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

// End-of-game screen for arcade free play: celebrates the result, shows the
// server-decided star reward (daily cap included), asks one Super Skill
// reflection question, and offers a replay so a finished game never dead-ends.
function showArcadeEndScreen(host, gameDef, result, { reward, onPlayAgain, onClose }) {
  const success = !!result?.success
  const stars = success ? Math.min(3, Math.max(0, result?.starsEarned ?? 0)) : 0
  const starRow = [1, 2, 3].map(i =>
    `<span style="font-size:44px;filter:${i <= stars ? 'none' : 'grayscale(1) opacity(.35)'}">⭐</span>`
  ).join('')

  // Reward line reflects what the server actually granted.
  let rewardLine = ''
  if (reward) {
    if (reward.awarded_stars > 0) {
      rewardLine = `+${reward.awarded_stars} star${reward.awarded_stars > 1 ? 's' : ''} for your Star Shop${reward.is_daily_challenge && reward.awarded_stars > 1 ? ' (challenge bonus!)' : ''} · ${reward.daily_stars_used}/${reward.daily_cap} arcade stars today`
    } else if (success && reward.daily_stars_used >= reward.daily_cap) {
      rewardLine = `You've earned all ${reward.daily_cap} arcade stars for today — play for fun, or build a road in a module!`
    }
  }
  const bestLine = reward?.is_new_best ? `🏆 New personal best: ${reward.personal_best}!` : ''

  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(22,50,79,0.55);padding:20px;overflow:auto'
  overlay.innerHTML = `
    <div style="background:#fffff5;border-radius:22px;max-width:380px;width:100%;padding:26px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,0.3)">
      <img src="${success ? '/images/characters/Daniel_Celebrating.webp' : '/images/characters/Daniel_Thinking.webp'}" alt="Daniel" style="width:84px;height:84px;object-fit:contain" />
      <h3 style="margin:10px 0 4px;font-size:21px;color:#16324f">${success ? 'You did it!' : 'Good effort!'}</h3>
      <div style="margin:6px 0">${starRow}</div>
      ${bestLine ? `<p style="margin:4px 0;font-size:14px;font-weight:700;color:#8a6d1a">${bestLine}</p>` : ''}
      ${rewardLine ? `<p style="margin:4px 0;font-size:13px;font-weight:600;color:#40916c">${rewardLine}</p>` : ''}
      <p style="margin:6px 0 12px;font-size:14px;color:#6b7e95">${success
        ? 'That practice makes your brain roads stronger.'
        : 'Every try builds the road a little more. Have another go?'}</p>
      <div class="ae-reflection" style="display:none;background:#eef6ff;border:1px solid #cfe3f7;border-radius:14px;padding:12px 14px;margin:0 0 14px;text-align:left">
        <p class="ae-ref-q" style="margin:0 0 8px;font-size:13.5px;font-weight:600;color:#2b4a6f"></p>
        <div class="ae-ref-opts" style="display:flex;flex-direction:column;gap:7px"></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="ae-again" style="flex:1;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#f2c94c,#e6a800);color:#16324f;font-weight:700;font-size:15px;cursor:pointer">Play again</button>
        <button class="ae-close" style="flex:1;padding:12px;border:2px solid #d7deea;border-radius:12px;background:#fff;color:#405878;font-weight:700;font-size:15px;cursor:pointer">All done</button>
      </div>
    </div>
  `

  // One-tap reflection tied to the game's Super Skill focus. Optional —
  // playing again or closing skips it without friction.
  if (reward?.play_id) {
    const refWrap = overlay.querySelector('.ae-reflection')
    const reflection = getReflectionFor(gameDef.id)
    refWrap.style.display = 'block'
    refWrap.querySelector('.ae-ref-q').textContent = reflection.question
    const optsEl = refWrap.querySelector('.ae-ref-opts')
    reflection.options.forEach(option => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = option
      btn.style.cssText = 'padding:9px 12px;border:2px solid #cfe3f7;border-radius:10px;background:#fff;color:#2b4a6f;font-weight:600;font-size:13px;cursor:pointer;text-align:left;font-family:inherit'
      btn.addEventListener('click', () => {
        saveArcadeReflection(reward.play_id, option)
        refWrap.innerHTML = '<p style="margin:0;font-size:13.5px;font-weight:600;color:#40916c">⭐ Great choice — Daniel wrote that in his diary!</p>'
      })
      optsEl.appendChild(btn)
    })
  }

  overlay.querySelector('.ae-again').addEventListener('click', onPlayAgain)
  overlay.querySelector('.ae-close').addEventListener('click', onClose)
  host.appendChild(overlay)
}
