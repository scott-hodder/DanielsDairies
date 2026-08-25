// ================================================
// FIRST-TIME DASHBOARD GUIDE
// A Daniel speech-bubble callout shown above the Brain Town
// map on a child's first visit. It explains that the Super
// Skill buildings on the map are tappable starting points,
// and offers a "show me" shortcut that walks Daniel to the
// suggested next district. Inline (never blocks the page),
// and dismisses itself the first time a Super Skill is tapped.
// ================================================

const GUIDE_KEY_PREFIX = 'dd_first_guide_seen_'

function hasSeenGuide(childId) {
  try { return localStorage.getItem(GUIDE_KEY_PREFIX + childId) === '1' } catch (_) { return false }
}

function markGuideSeen(childId) {
  try { localStorage.setItem(GUIDE_KEY_PREFIX + childId, '1') } catch (_) {}
}

/**
 * Show Daniel's welcome callout on a child's first dashboard visit.
 *
 * @param {HTMLElement} mount - Element to render the guide into
 * @param {Object} opts
 * @param {string|number} opts.childId - Used to remember dismissal per child
 * @param {HTMLElement} opts.mapContainer - The Brain Town map container
 *   (receives the `bt:show-next` event, and is scrolled into view)
 */
export function maybeShowFirstTimeGuide(mount, { childId, mapContainer, hasProgress } = {}) {
  if (!mount || !childId) return
  if (hasSeenGuide(childId)) return
  if (hasProgress) return

  mount.innerHTML = `
    <div class="ftg-wrap" id="danielFirstGuide" role="region" aria-label="Daniel's welcome tip">
      <div class="ftg-card">
        <div class="ftg-bubble">
          <span class="ftg-spark ftg-spark1">✦</span>
          <span class="ftg-spark ftg-spark2">✦</span>
          <h3 class="ftg-title">Woof! Welcome to Brain Town!</h3>
          <p class="ftg-text">Your adventure starts at <b>Brain Builder</b>! Finish its modules to unlock the next <b>Super Skill</b> — keep going and you'll build every road in town.</p>
          <div class="ftg-actions">
            <button type="button" class="ftg-btn ftg-btn-gold" id="ftgShowMeBtn">✨ Take me to Brain Builder</button>
            <button type="button" class="ftg-btn ftg-btn-ghost" id="ftgDismissBtn">I'll have a look around first</button>
          </div>
        </div>
      </div>
      <div class="ftg-arrow" aria-hidden="true">⬇</div>
    </div>
  `

  const guideEl = mount.querySelector('#danielFirstGuide')
  let removed = false

  function onDistrictSelected() {
    // The child tapped a Super Skill — the guide has done its job.
    dismiss(false)
  }
  document.addEventListener('bt:district-selected', onDistrictSelected)

  function dismiss(immediate) {
    if (removed) return
    removed = true
    markGuideSeen(childId)
    document.removeEventListener('bt:district-selected', onDistrictSelected)
    if (immediate) {
      guideEl.remove()
      return
    }
    guideEl.classList.add('ftg-hide')
    setTimeout(() => guideEl.remove(), 500)
  }

  guideEl.querySelector('#ftgDismissBtn').addEventListener('click', () => dismiss(false))

  guideEl.querySelector('#ftgShowMeBtn').addEventListener('click', () => {
    if (mapContainer) {
      const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      mapContainer.scrollIntoView({ behavior: noMotion ? 'auto' : 'smooth', block: 'center' })
      // The map listens for this and opens the suggested next district,
      // sending Daniel walking down its road.
      mapContainer.dispatchEvent(new CustomEvent('bt:show-next'))
    }
    dismiss(false)
  })
}
