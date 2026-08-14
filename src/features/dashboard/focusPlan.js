// ================================================
// Child Focus Plan - Onboarding & Management
// ================================================

// Focus plan onboarding is a 2-step parent conversation: goals, then
// context (frequency/intensity/notes). It no longer asks "where should we
// begin?" — the Super Skill journey is sequential (see superSkillGate.js),
// so the starting point is not a parent choice anymore.
import { supabase } from '../../supabaseClient.js'
import { escapeHtml } from '../../lib/sanitize.js'
import {
  getChildFocusPlan,
  createChildFocusPlan
} from '../../services/databaseService.js'

// State for focus plan onboarding
let focusPlanState = {
  currentStep: 1,
  selectedGoalKeys: [],
  customGoalText: '',
  frequency: null,
  intensity: null,
  comments: '',
  childId: null,
  onComplete: null
}

const TOTAL_STEPS = 2

// Goal options - loaded from DB, with hardcoded fallbacks
const FALLBACK_GOAL_OPTIONS = [
  { key: 'calm_faster', label: 'Calm down faster', icon: '🧘' },
  { key: 'less_meltdowns', label: 'Fewer meltdowns', icon: '🌊' },
  { key: 'better_communication', label: 'Better communication', icon: '💬' },
  { key: 'more_confidence', label: 'More confidence', icon: '💪' },
  { key: 'handle_worry', label: 'Handle worry better', icon: '🌈' },
  { key: 'make_friends', label: 'Make friends easier', icon: '👫' },
  { key: 'custom', label: 'Custom goal...', icon: '✏️' }
]

const FALLBACK_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Every day', description: 'It happens daily' },
  { value: 'few_per_week', label: 'Most days', description: 'A few times a week' },
  { value: 'weekly', label: 'Sometimes', description: 'Once a week or so' },
  { value: 'rare', label: 'Now & then', description: 'Only when triggered' }
]

const FALLBACK_INTENSITY_OPTIONS = [
  { value: 'mild', label: 'Little bumps', description: 'Small, everyday moments', icon: '🌱' },
  { value: 'moderate', label: 'Some struggles', description: 'Needs regular support', icon: '🌿' },
  { value: 'severe', label: 'Big challenges', description: 'Often finds things tough', icon: '🌳' },
  { value: 'complex', label: 'Really tough', description: 'Needs lots of help daily', icon: '🏔️' }
]

let GOAL_OPTIONS = [...FALLBACK_GOAL_OPTIONS]
let FREQUENCY_OPTIONS = [...FALLBACK_FREQUENCY_OPTIONS]
let INTENSITY_OPTIONS = [...FALLBACK_INTENSITY_OPTIONS]

async function loadFocusPlanOptions() {
  try {
    const [goalsRes, freqRes, intRes] = await Promise.all([
      supabase.from('focus_plan_goals').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('focus_plan_frequencies').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('focus_plan_intensities').select('*').eq('is_active', true).order('sort_order'),
    ])
    if (goalsRes.data && goalsRes.data.length > 0) {
      GOAL_OPTIONS = goalsRes.data.map(g => ({ key: g.key, label: g.label, icon: g.icon }))
    }
    if (freqRes.data && freqRes.data.length > 0) {
      FREQUENCY_OPTIONS = freqRes.data.map(f => ({ value: f.value, label: f.label, description: f.description }))
    }
    if (intRes.data && intRes.data.length > 0) {
      INTENSITY_OPTIONS = intRes.data.map(i => ({ value: i.value, label: i.label, description: i.description, icon: i.icon }))
    }
  } catch (error) {
    console.error('Error loading focus plan options from DB, using fallbacks:', error)
  }
}

// Check if child has an active focus plan
export async function checkFocusPlan(childId) {
  try {
    const plan = await getChildFocusPlan(childId)
    return plan
  } catch (error) {
    console.error('Error checking focus plan:', error)
    return null
  }
}

// Initialize and show the onboarding modal
export async function showFocusPlanOnboarding(childId, onComplete) {
  focusPlanState.childId = childId
  focusPlanState.onComplete = onComplete
  focusPlanState.currentStep = 1
  focusPlanState.selectedGoalKeys = []
  focusPlanState.customGoalText = ''
  focusPlanState.frequency = null
  focusPlanState.intensity = null
  focusPlanState.comments = ''

  // Load configurable options from DB (falls back to hardcoded if DB fails)
  await loadFocusPlanOptions()

  // Create and show modal
  createFocusPlanModal()
  renderStep(1)

  const modal = document.getElementById('focusPlanModal')
  if (modal) {
    modal.style.display = 'flex'
    document.body.style.overflow = 'hidden'
  }
}

// Create the modal HTML structure
function createFocusPlanModal() {
  // Remove existing modal if present
  const existingModal = document.getElementById('focusPlanModal')
  if (existingModal) {
    existingModal.remove()
  }

  const modalHTML = `
    <div id="focusPlanModal" class="focus-plan-modal" style="display: none;">
      <div class="focus-plan-modal-content">
        <div class="focus-plan-header">
          <div class="focus-plan-progress">
            <div class="progress-step active" data-step="1">1</div>
            <div class="progress-line"></div>
            <div class="progress-step" data-step="2">2</div>
          </div>
          <h2 class="focus-plan-title" id="focusPlanTitle">What matters most?</h2>
          <p class="focus-plan-subtitle" id="focusPlanSubtitle">Choose the goals that matter most to your family</p>
        </div>

        <div class="focus-plan-body" id="focusPlanBody">
          <!-- Step content will be rendered here -->
        </div>

        <div class="focus-plan-footer">
          <button type="button" class="focus-plan-btn secondary" id="focusPlanBack" style="display: none;">
            Back
          </button>
          <button type="button" class="focus-plan-btn primary" id="focusPlanNext">
            Continue
          </button>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML('beforeend', modalHTML)
  
  // Add event listeners
  document.getElementById('focusPlanBack').addEventListener('click', goToPreviousStep)
  document.getElementById('focusPlanNext').addEventListener('click', goToNextStep)
  
  // Inject styles
  injectFocusPlanStyles()
}

// Render the current step
function renderStep(step) {
  focusPlanState.currentStep = step
  
  // Update progress indicators
  document.querySelectorAll('.progress-step').forEach((el, index) => {
    el.classList.toggle('active', index + 1 <= step)
    el.classList.toggle('completed', index + 1 < step)
  })
  
  // Update back button visibility
  const backBtn = document.getElementById('focusPlanBack')
  backBtn.style.display = step > 1 ? 'block' : 'none'
  
  // Update next button text
  const nextBtn = document.getElementById('focusPlanNext')
  nextBtn.textContent = step === TOTAL_STEPS ? "Let's begin" : 'Continue'

  // Render step content. The old "Where should we begin?" category step is
  // gone — children work through the Super Skills in order now, so the
  // starting point isn't a choice the parent makes.
  const body = document.getElementById('focusPlanBody')
  const title = document.getElementById('focusPlanTitle')
  const subtitle = document.getElementById('focusPlanSubtitle')

  switch (step) {
    case 1:
      title.innerHTML = "What matters most?"
      subtitle.textContent = 'Choose the goals that matter most to your family'
      body.innerHTML = renderGoalsStep()
      setupGoalsStepListeners()
      break
    case 2:
      title.innerHTML = "Help us personalise the journey"
      subtitle.textContent = 'These details help us match the right level of support'
      body.innerHTML = renderDetailsStep()
      setupDetailsStepListeners()
      break
  }

  updateNextButtonState()
}

// Step 1: Goal Selection (multiple selection allowed)
function renderGoalsStep() {
  const nonCustomGoals = GOAL_OPTIONS.filter(g => g.key !== 'custom')
  
  
  return `
    <div class="focus-goals-grid">
      ${nonCustomGoals.map(goal => `
        <button type="button"
                class="focus-goal-chip ${focusPlanState.selectedGoalKeys.includes(goal.key) ? 'selected' : ''}"
                data-goal-key="${goal.key}">
          <span class="goal-icon">${goal.icon}</span>
          <span class="goal-label">${escapeHtml(goal.label)}</span>
        </button>
      `).join('')}
    </div>

    <div class="custom-goal-container visible">
      <label for="customGoalInput">Anything else you'd like to work towards?</label>
      <input type="text"
             id="customGoalInput"
             class="custom-goal-input"
             placeholder="Type your own goal here..."
             maxlength="200"
             value="${escapeHtml(focusPlanState.customGoalText)}">
      <span class="char-count">${focusPlanState.customGoalText.length}/200</span>
    </div>

    <p class="step-hint">Pick as many as you like - these help us shape the journey to your child's real needs</p>
  `
}

function setupGoalsStepListeners() {
  document.querySelectorAll('.focus-goal-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const goalKey = chip.dataset.goalKey
      const index = focusPlanState.selectedGoalKeys.indexOf(goalKey)
      
      // Toggle selection (allow multiple)
      if (index > -1) {
        focusPlanState.selectedGoalKeys.splice(index, 1)
        chip.classList.remove('selected')
      } else {
        focusPlanState.selectedGoalKeys.push(goalKey)
        chip.classList.add('selected')
      }
    })
  })
  
  // Custom goal input
  const customInput = document.getElementById('customGoalInput')
  if (customInput) {
    customInput.addEventListener('input', (e) => {
      focusPlanState.customGoalText = e.target.value
      const charCount = document.querySelector('.char-count')
      if (charCount) charCount.textContent = `${e.target.value.length}/200`
    })
  }
}

// Step 3: Frequency & Intensity + Comments
function renderDetailsStep() {
  return `
    <div class="focus-options-section">
      <h3 class="options-label">How often do these challenges show up?</h3>
      <div class="focus-frequency-grid">
        ${FREQUENCY_OPTIONS.map(opt => `
          <button type="button"
                  class="focus-option-btn ${focusPlanState.frequency === opt.value ? 'selected' : ''}"
                  data-frequency="${opt.value}">
            <span class="option-label">${opt.label}</span>
            <span class="option-desc">${opt.description}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="focus-options-section">
      <h3 class="options-label">How big do these moments feel?</h3>
      <div class="focus-intensity-grid">
        ${INTENSITY_OPTIONS.map(opt => `
          <button type="button"
                  class="focus-option-btn intensity ${focusPlanState.intensity === opt.value ? 'selected' : ''}"
                  data-intensity="${opt.value}">
            <span class="option-icon">${opt.icon}</span>
            <span class="option-label">${opt.label}</span>
            <span class="option-desc">${opt.description}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="focus-options-section">
      <h3 class="options-label">Anything else that would help us understand?</h3>
      <textarea
        id="focusPlanComments"
        class="focus-comments-input"
        placeholder="Things that help, tricky moments, what works at home - anything you'd like us to know..."
        maxlength="500"
        rows="3">${focusPlanState.comments}</textarea>
      <span class="char-count comments-count">${focusPlanState.comments.length}/500</span>
    </div>

    <p class="step-hint">Everything here is optional. Share as much or as little as feels right - there are no wrong answers.</p>
  `
}

function setupDetailsStepListeners() {
  // Frequency buttons
  document.querySelectorAll('[data-frequency]').forEach(btn => {
    btn.addEventListener('click', () => {
      focusPlanState.frequency = btn.dataset.frequency
      document.querySelectorAll('[data-frequency]').forEach(b => {
        b.classList.toggle('selected', b.dataset.frequency === focusPlanState.frequency)
      })
    })
  })
  
  // Intensity buttons
  document.querySelectorAll('[data-intensity]').forEach(btn => {
    btn.addEventListener('click', () => {
      focusPlanState.intensity = btn.dataset.intensity
      document.querySelectorAll('[data-intensity]').forEach(b => {
        b.classList.toggle('selected', b.dataset.intensity === focusPlanState.intensity)
      })
    })
  })
  
  // Comments textarea
  const commentsInput = document.getElementById('focusPlanComments')
  if (commentsInput) {
    commentsInput.addEventListener('input', (e) => {
      focusPlanState.comments = e.target.value
      const charCount = document.querySelector('.comments-count')
      if (charCount) charCount.textContent = `${e.target.value.length}/500`
    })
  }
}

// Navigation
function goToPreviousStep() {
  if (focusPlanState.currentStep > 1) {
    renderStep(focusPlanState.currentStep - 1)
  }
}

async function goToNextStep() {
  if (focusPlanState.currentStep < TOTAL_STEPS) {
    renderStep(focusPlanState.currentStep + 1)
  } else {
    // Submit the plan
    await submitFocusPlan()
  }
}

function updateNextButtonState() {
  const nextBtn = document.getElementById('focusPlanNext')
  if (!nextBtn) return
  // Every field is optional — the plan is a conversation, not a gate.
  nextBtn.disabled = false
}

// Submit the focus plan. The starting Super Skill is no longer chosen
// here — the sequential skill gate decides where every child begins.
async function submitFocusPlan() {
  const nextBtn = document.getElementById('focusPlanNext')
  nextBtn.disabled = true
  nextBtn.textContent = 'Creating plan...'

  try {
    const plan = await createChildFocusPlan({
      childId: focusPlanState.childId,
      targetCategoryIds: [],
      defaultPathwayId: null,
      goalKeys: focusPlanState.selectedGoalKeys.length > 0 ? focusPlanState.selectedGoalKeys : null,
      goalText: focusPlanState.customGoalText || null,
      frequency: focusPlanState.frequency,
      intensity: focusPlanState.intensity,
      comments: focusPlanState.comments || null,
      superSkillId: null
    })

    // Close modal
    closeFocusPlanModal()

    // Show success toast
    showFocusPlanToast('Plan set! Let\'s start your journey! 🎉')

    // Call completion callback with the plan (no pathway — the sequential
    // Super Skill gate decides where the child starts)
    if (focusPlanState.onComplete) {
      focusPlanState.onComplete(plan, null)
    }

  } catch (error) {
    console.error('Error creating focus plan:', error)
    console.error('Error details:', error.message, error.stack)
    nextBtn.disabled = false
    nextBtn.textContent = "Let's begin"
    showFocusPlanToast('Something went wrong. Please try again.', 'error')
  }
}

// Close the modal
function closeFocusPlanModal() {
  const modal = document.getElementById('focusPlanModal')
  if (modal) {
    modal.style.display = 'none'
    document.body.style.overflow = ''
  }
}

// Show toast notification
function showFocusPlanToast(message, type = 'success') {
  // Remove existing toast
  const existingToast = document.querySelector('.focus-plan-toast')
  if (existingToast) existingToast.remove()
  
  const toast = document.createElement('div')
  toast.className = `focus-plan-toast ${type}`
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✨' : '⚠️'}</span>
    <span class="toast-message">${message}</span>
  `
  
  document.body.appendChild(toast)
  
  // Animate in
  setTimeout(() => toast.classList.add('visible'), 10)
  
  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('visible')
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

// ================================================
// Focus Plan Settings (Edit Mode)
// ================================================

// The settings modal shows what the family shared (goals, how often, how
// big, notes) and offers a fresh start. There is nothing else to "edit":
// focus areas and pathways no longer exist — the Super Skill journey is
// sequential.
export async function showFocusPlanSettings(childId, currentPlan, onUpdate) {
  focusPlanState.childId = childId
  focusPlanState.onComplete = onUpdate

  await loadFocusPlanOptions()
  createFocusPlanSettingsModal(currentPlan)

  const modal = document.getElementById('focusPlanSettingsModal')
  if (modal) {
    modal.style.display = 'flex'
    document.body.style.overflow = 'hidden'
  }
}

function createFocusPlanSettingsModal(currentPlan) {
  // Remove existing modal if present
  const existingModal = document.getElementById('focusPlanSettingsModal')
  if (existingModal) existingModal.remove()

  const goalKeys = currentPlan?.goal_keys || (currentPlan?.goal_key ? [currentPlan.goal_key] : [])
  const goalChips = goalKeys
    .map(key => GOAL_OPTIONS.find(g => g.key === key))
    .filter(Boolean)
    .map(g => `<span class="focus-goal-chip selected" style="cursor:default"><span class="goal-icon">${g.icon}</span><span class="goal-label">${escapeHtml(g.label)}</span></span>`)
    .join('')
  const frequency = FREQUENCY_OPTIONS.find(f => f.value === currentPlan?.frequency)
  const intensity = INTENSITY_OPTIONS.find(i => i.value === currentPlan?.intensity)

  const modalHTML = `
    <div id="focusPlanSettingsModal" class="focus-plan-modal" style="display: none;">
      <div class="focus-plan-modal-content settings-mode">
        <div class="focus-plan-header">
          <button type="button" class="close-settings-btn" id="closeFocusPlanSettings">✕</button>
          <h2 class="focus-plan-title">Your family's plan</h2>
          <p class="focus-plan-subtitle">What you told us — it shapes recommendations and check-ins</p>
        </div>

        <div class="focus-plan-body">
          <div class="settings-section">
            <h3>Goals you chose</h3>
            ${goalChips
              ? `<div class="focus-goals-grid" style="pointer-events:none">${goalChips}</div>`
              : '<p style="font-size:14px;color:#6b7e95;margin:4px 0 0">No goals picked yet.</p>'}
            ${currentPlan?.goal_text ? `<p style="font-size:14px;color:#405878;margin-top:10px;"><strong>In your words:</strong> ${escapeHtml(currentPlan.goal_text)}</p>` : ''}
          </div>

          ${(frequency || intensity) ? `
          <div class="settings-section">
            <h3>What you shared</h3>
            <p style="font-size:14px;color:#405878;line-height:1.7;margin:4px 0 0">
              ${frequency ? `How often: <strong>${escapeHtml(frequency.label)}</strong> (${escapeHtml(frequency.description)})<br>` : ''}
              ${intensity ? `How big it feels: <strong>${escapeHtml(intensity.label)}</strong> (${escapeHtml(intensity.description)})` : ''}
            </p>
          </div>` : ''}

          ${currentPlan?.comments ? `
          <div class="settings-section">
            <h3>Your notes</h3>
            <p style="font-size:14px;color:#405878;line-height:1.6;margin:4px 0 0">${escapeHtml(currentPlan.comments)}</p>
          </div>` : ''}

          <div class="settings-section">
            <button type="button" class="new-cycle-btn" id="startNewCycleBtn">
              🔄 Refresh the plan
            </button>
            <p class="new-cycle-hint">Answer the two quick questions again — useful when your family's goals have changed</p>
          </div>
        </div>

        <div class="focus-plan-footer">
          <button type="button" class="focus-plan-btn primary" id="cancelFocusPlanSettings">
            Done
          </button>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML('beforeend', modalHTML)

  document.getElementById('closeFocusPlanSettings').addEventListener('click', closeFocusPlanSettingsModal)
  document.getElementById('cancelFocusPlanSettings').addEventListener('click', closeFocusPlanSettingsModal)
  document.getElementById('startNewCycleBtn').addEventListener('click', () => {
    if (confirm('Refresh the plan? This will archive the current plan and ask the two quick questions again.')) {
      closeFocusPlanSettingsModal()
      showFocusPlanOnboarding(focusPlanState.childId, focusPlanState.onComplete)
    }
  })
}

function closeFocusPlanSettingsModal() {
  const modal = document.getElementById('focusPlanSettingsModal')
  if (modal) {
    modal.style.display = 'none'
    document.body.style.overflow = ''
  }
}

// ================================================
// Inject Styles
// ================================================

function injectFocusPlanStyles() {
  if (document.getElementById('focus-plan-styles')) return
  
  const styles = document.createElement('style')
  styles.id = 'focus-plan-styles'
  styles.textContent = `
    .focus-plan-modal {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 16px;
      backdrop-filter: blur(8px);
    }

    .focus-plan-modal-content {
      background: linear-gradient(165deg, #ffffff 0%, #f8fafc 100%);
      border-radius: 28px;
      max-width: 720px;
      width: 100%;
      max-height: 92vh;
      overflow-y: auto;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(255,255,255,0.6) inset;
      animation: focusPlanSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .focus-plan-modal-content.settings-mode {
      max-width: 500px;
    }

    @keyframes focusPlanSlideIn {
      from { opacity: 0; transform: translateY(24px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ---- Header ---- */
    .focus-plan-header {
      padding: 28px 32px 20px;
      text-align: center;
      position: relative;
      background: linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 100%);
    }

    .close-settings-btn {
      position: absolute;
      top: 16px; right: 16px;
      background: rgba(0,0,0,0.05);
      border: none;
      width: 32px; height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .close-settings-btn:hover { background: rgba(0,0,0,0.1); }

    .focus-plan-progress {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin-bottom: 20px;
    }

    .progress-step {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #94a3b8;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700;
      font-size: 14px;
      font-family: 'Fredoka', sans-serif;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      z-index: 1;
    }

    .progress-step.active {
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: white;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
      transform: scale(1.1);
    }

    .progress-step.completed {
      background: linear-gradient(135deg, #10b981, #34d399);
      color: white;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    .progress-line {
      width: 48px; height: 3px;
      background: #e2e8f0;
      border-radius: 2px;
      transition: background 0.3s;
    }

    .focus-plan-title {
      font-size: 26px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 6px;
      font-family: 'Fredoka', sans-serif;
      letter-spacing: -0.3px;
    }

    .focus-plan-subtitle {
      font-size: 15px;
      color: #64748b;
      margin: 0;
      font-weight: 400;
    }

    /* ---- Body ---- */
    .focus-plan-body {
      padding: 24px 32px 16px;
    }

    /* ---- Step 1 intro ---- */
    .focus-plan-intro {
      text-align: center;
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 24px;
      max-width: 520px;
      margin-left: auto;
      margin-right: auto;
    }

    /* ---- Category cards ---- */
    .focus-categories-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .focus-categories-grid.compact {
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .focus-category-card {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      padding: 18px 10px 14px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      position: relative;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .focus-category-card:hover {
      border-color: #a5b4fc;
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.12);
    }

    .focus-category-card.selected {
      background: linear-gradient(165deg, #eef2ff 0%, #e0e7ff 100%);
      border-color: #6366f1;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.18);
    }

    .focus-category-card .category-check-circle {
      position: absolute;
      top: 8px; right: 8px;
      width: 22px; height: 22px;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      display: flex; align-items: center; justify-content: center;
      color: transparent;
      transition: all 0.2s;
      background: transparent;
    }

    .focus-category-card.selected .category-check-circle {
      background: linear-gradient(135deg, #10b981, #34d399);
      border-color: #10b981;
      color: white;
    }

    .focus-category-card .category-icon {
      font-size: 30px;
      line-height: 1;
    }

    .focus-category-card .category-name {
      font-weight: 600;
      color: #334155;
      font-size: 12.5px;
      font-family: 'Fredoka', sans-serif;
      line-height: 1.2;
    }

    .focus-category-card .category-desc {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.3;
    }

    .focus-category-card.shake {
      animation: fpShake 0.4s ease-in-out;
    }

    @keyframes fpShake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    /* Selection pills */
    .selection-pills {
      display: flex;
      justify-content: center;
      gap: 6px;
      margin-top: 18px;
    }

    .selection-pill {
      width: 32px; height: 5px;
      border-radius: 3px;
      background: #e2e8f0;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .selection-pill.filled {
      background: linear-gradient(90deg, #6366f1, #818cf8);
      width: 40px;
    }

    .selection-hint {
      text-align: center;
      color: #94a3b8;
      font-size: 13px;
      margin-top: 8px;
    }

    .selection-count {
      font-weight: 700;
      color: #6366f1;
    }

    /* ---- Step 2: Goals ---- */
    .focus-goals-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
    }

    .focus-goal-chip {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 40px;
      padding: 10px 20px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .focus-goal-chip:hover {
      border-color: #a5b4fc;
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(99, 102, 241, 0.1);
    }

    .focus-goal-chip.selected {
      background: linear-gradient(135deg, #6366f1, #818cf8);
      border-color: transparent;
      color: white;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
    }

    .focus-goal-chip .goal-icon {
      font-size: 18px;
    }

    .focus-goal-chip .goal-label {
      font-size: 14px;
      font-weight: 500;
    }

    .custom-goal-container {
      margin-top: 24px;
      display: none;
    }

    .custom-goal-container.visible {
      display: block;
    }

    .custom-goal-container label {
      display: block;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .custom-goal-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      font-size: 14px;
      background: #ffffff;
      transition: all 0.2s;
      box-sizing: border-box;
    }

    .custom-goal-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .focus-comments-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      min-height: 80px;
      background: #ffffff;
      transition: all 0.2s;
      box-sizing: border-box;
    }

    .focus-comments-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .char-count {
      display: block;
      text-align: right;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
    }

    .step-hint {
      text-align: center;
      color: #94a3b8;
      font-size: 13px;
      margin-top: 24px;
    }

    /* ---- Step 3: Options ---- */
    .focus-options-section {
      margin-bottom: 28px;
    }

    .options-label {
      font-size: 15px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 12px;
      font-family: 'Fredoka', sans-serif;
    }

    .focus-frequency-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .focus-intensity-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .focus-option-btn {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 8px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .focus-option-btn:hover {
      border-color: #a5b4fc;
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(99, 102, 241, 0.1);
    }

    .focus-option-btn.selected {
      background: linear-gradient(165deg, #eef2ff 0%, #e0e7ff 100%);
      border-color: #6366f1;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.18);
    }

    .focus-option-btn .option-icon {
      font-size: 26px;
      display: block;
      margin-bottom: 6px;
    }

    .focus-option-btn .option-label {
      font-weight: 600;
      color: #334155;
      font-size: 13px;
      display: block;
      font-family: 'Fredoka', sans-serif;
    }

    .focus-option-btn .option-desc {
      font-size: 11px;
      color: #94a3b8;
      display: block;
      margin-top: 2px;
    }

    /* ---- Footer ---- */
    .focus-plan-footer {
      padding: 16px 32px 24px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .focus-plan-btn {
      padding: 12px 28px;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      font-family: 'Fredoka', sans-serif;
      letter-spacing: 0.2px;
    }

    .focus-plan-btn.primary {
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: white;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
    }

    .focus-plan-btn.primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }

    .focus-plan-btn.primary:disabled {
      background: #cbd5e1;
      box-shadow: none;
      cursor: not-allowed;
    }

    .focus-plan-btn.secondary {
      background: #f1f5f9;
      color: #64748b;
    }

    .focus-plan-btn.secondary:hover {
      background: #e2e8f0;
    }

    /* ---- Settings ---- */
    .settings-section {
      margin-bottom: 24px;
    }

    .settings-section h3 {
      font-size: 14px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 12px;
      font-family: 'Fredoka', sans-serif;
    }

    .pathway-select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .pathway-select:focus {
      outline: none;
      border-color: #6366f1;
    }

    .new-cycle-btn {
      width: 100%;
      padding: 14px;
      background: #fffbeb;
      border: 2px solid #fcd34d;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 600;
      color: #b45309;
      cursor: pointer;
      transition: all 0.2s;
    }

    .new-cycle-btn:hover {
      background: #fef3c7;
      transform: translateY(-1px);
    }

    .new-cycle-hint {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      margin-top: 8px;
    }

    /* ---- Toast ---- */
    .focus-plan-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: white;
      padding: 14px 24px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 8px 32px rgba(99, 102, 241, 0.3);
      z-index: 10001;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .focus-plan-toast.visible {
      transform: translateX(-50%) translateY(0);
    }

    .focus-plan-toast.error {
      background: linear-gradient(135deg, #ef4444, #f87171);
    }

    .focus-plan-toast .toast-icon {
      font-size: 20px;
    }

    .focus-plan-toast .toast-message {
      font-size: 14px;
      font-weight: 500;
    }

    /* ---- Legacy blurb (kept for settings mode) ---- */
    .focus-plan-info-blurb {
      background: linear-gradient(135deg, #f0f4f8 0%, #e8f1f7 100%);
      border-left: 4px solid #6366f1;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
    }
    .blurb-title { font-size: 16px; font-weight: 700; color: #334155; margin: 0 0 12px 0; }
    .blurb-text { margin: 0 0 16px 0; color: #64748b; }
    .blurb-subtitle { font-size: 13px; font-weight: 600; color: #334155; margin: 12px 0 8px 0; }
    .blurb-list { list-style: none; padding: 0; margin: 0 0 12px 0; }
    .blurb-list li { padding-left: 20px; position: relative; margin-bottom: 6px; color: #64748b; }
    .blurb-list li:before { content: "\\2713"; position: absolute; left: 0; color: #10b981; font-weight: bold; }
    .blurb-note { margin: 12px 0 0 0; font-size: 13px; color: #94a3b8; font-style: italic; }

    /* ---- Mobile ---- */
    @media (max-width: 640px) {
      .focus-plan-modal { padding: 8px; }

      .focus-plan-modal-content {
        border-radius: 20px;
        max-height: 96vh;
      }

      .focus-plan-header { padding: 20px 20px 16px; }
      .focus-plan-body { padding: 20px; }
      .focus-plan-footer { padding: 12px 20px 20px; }
      .focus-plan-title { font-size: 22px; }

      .focus-categories-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .focus-category-card { padding: 14px 8px 12px; }
      .focus-category-card .category-icon { font-size: 26px; }
      .focus-category-card .category-name { font-size: 12px; }
      .focus-category-card .category-desc { font-size: 10px; }

      .focus-goal-chip {
        padding: 8px 14px;
        font-size: 13px;
      }

      .focus-frequency-grid,
      .focus-intensity-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `
  
  document.head.appendChild(styles)
}

// Export for use in other modules
export { focusPlanState, GOAL_OPTIONS, FREQUENCY_OPTIONS, INTENSITY_OPTIONS }
