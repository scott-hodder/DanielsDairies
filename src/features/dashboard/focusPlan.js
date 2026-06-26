// ================================================
// Child Focus Plan - Onboarding & Management
// ================================================

import { supabase } from '../../supabaseClient.js'
import { escapeHtml } from '../../lib/sanitize.js'
import { 
  getChildFocusPlan, 
  createChildFocusPlan, 
  updateChildFocusPlan,
  getCategories, 
  getPathways,
  determineDefaultPathwayWithModules 
} from '../../services/databaseService.js'

// State for focus plan onboarding
let focusPlanState = {
  currentStep: 1,
  selectedCategories: [],
  selectedGoalKeys: [],
  customGoalText: '',
  frequency: null,
  intensity: null,
  comments: '',
  categories: [],
  pathways: [],
  childId: null,
  onComplete: null
}

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
  focusPlanState.selectedCategories = []
  focusPlanState.selectedGoalKeys = []
  focusPlanState.customGoalText = ''
  focusPlanState.frequency = null
  focusPlanState.intensity = null
  focusPlanState.comments = ''

  // Load configurable options from DB (falls back to hardcoded if DB fails)
  await loadFocusPlanOptions()

  // Load focus area categories from focus_plan_categories table (with super_skill link)
  try {
    const { data: fpCats, error: fpCatsError } = await supabase
      .from('focus_plan_categories')
      .select('id, name, icon, short_description, super_skill_id')
      .eq('is_active', true)
      .order('sort_order')

    if (!fpCatsError && fpCats && fpCats.length > 0) {
      focusPlanState.categories = fpCats.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || '📚',
        short_description: cat.short_description || '',
        super_skill_id: cat.super_skill_id || null
      }))
    } else {
      // Fall back to category_colors if focus_plan_categories is empty or errors
      const rawCategories = await getCategories()
      focusPlanState.categories = rawCategories.map(cat => {
        const categoryName = cat.name || cat.category || 'Unknown'
        const icon = getCategoryIcon(categoryName)
        return {
          id: cat.id,
          name: capitalizeFirstLetter(categoryName),
          icon: icon,
          short_description: cat.short_description || ''
        }
      })
    }
    focusPlanState.pathways = await getPathways()
  } catch (error) {
    console.error('Error loading focus plan data:', error)
    // Use fallback categories if DB fails
    focusPlanState.categories = getFallbackCategories()
  }
  
  // If no categories loaded, use fallback
  if (!focusPlanState.categories || focusPlanState.categories.length === 0) {
    focusPlanState.categories = getFallbackCategories()
  }

  // Create and show modal
  createFocusPlanModal()
  renderStep(1)
  
  const modal = document.getElementById('focusPlanModal')
  if (modal) {
    modal.style.display = 'flex'
    document.body.style.overflow = 'hidden'
  }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Helper function to get icon for category
function getCategoryIcon(categoryName) {
  const iconMap = {
    'regulation': '🎯',
    'thinking & planning': '🧠',
    'body & sensory': '�',
    'social connection': '👫',
    'big feelings': '�🔥',
    'wellbeing & energy': '🌟',
    'safety & supports': '🛡️',
    // Legacy mappings
    'anger': '🔥',
    'anxiety': '🌧️',
    'sadness': '🌙',
    'depression': '🌙',
    'emotions': '💭',
    'body': '💪',
    'social': '👫',
    'cognitive': '🧠',
    'general': '📚',
    'foundations': '🏗️'
  }
  
  const lowerName = (categoryName || '').toLowerCase()
  return iconMap[lowerName] || '📚'
}

// Fallback categories if database fetch fails
function getFallbackCategories() {
  return [
    { id: 'regulation', name: 'Regulation', icon: '🎯', short_description: 'Managing emotions and impulses' },
    { id: 'thinking-planning', name: 'Thinking & Planning', icon: '🧠', short_description: 'Building focus and problem-solving' },
    { id: 'body-sensory', name: 'Body & Sensory', icon: '💪', short_description: 'Connecting with your body' },
    { id: 'social-connection', name: 'Social Connection', icon: '�', short_description: 'Making friends and connections' },
    { id: 'big-feelings', name: 'Big Feelings', icon: '�', short_description: 'Working through intense emotions' },
    { id: 'wellbeing-energy', name: 'Wellbeing & Energy', icon: '🌟', short_description: 'Building resilience and energy' },
    { id: 'safety-supports', name: 'Safety & Supports', icon: '🛡️', short_description: 'Creating safety and support networks' }
  ]
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
            <div class="progress-line"></div>
            <div class="progress-step" data-step="3">3</div>
          </div>
          <h2 class="focus-plan-title" id="focusPlanTitle">Where should we start?</h2>
          <p class="focus-plan-subtitle" id="focusPlanSubtitle">Pick up to 3 areas to focus on first</p>
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
  nextBtn.textContent = step === 3 ? "Let's begin" : 'Continue'
  
  // Render step content
  const body = document.getElementById('focusPlanBody')
  const title = document.getElementById('focusPlanTitle')
  const subtitle = document.getElementById('focusPlanSubtitle')
  
  switch (step) {
    case 1:
      title.innerHTML = "Where should we begin?"
      subtitle.textContent = 'Pick up to 3 areas to focus on first'
      body.innerHTML = renderStep1()
      setupStep1Listeners()
      break
    case 2:
      title.innerHTML = "What matters most?"
      subtitle.textContent = 'Choose the goals that matter most to your family'
      body.innerHTML = renderStep2()
      setupStep2Listeners()
      break
    case 3:
      title.innerHTML = "Help us personalise the journey"
      subtitle.textContent = 'These details help us match the right level of support'
      body.innerHTML = renderStep3()
      setupStep3Listeners()
      break
  }
  
  updateNextButtonState()
}

// Step 1: Category Selection
function renderStep1() {
  const categories = focusPlanState.categories
  
  return `
    <p class="focus-plan-intro">Every child is different, and that's a good thing. Your choices here shape how the adventure starts - we'll tailor the first modules to what matters most. You can always adjust this later.</p>

    <div class="focus-categories-grid">
      ${categories.map(cat => `
        <button type="button"
                class="focus-category-card ${focusPlanState.selectedCategories.includes(cat.id) ? 'selected' : ''}"
                data-category-id="${cat.id}"
                data-category-name="${escapeHtml(cat.name)}">
          <span class="category-check-circle"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="category-icon">${cat.icon || '📚'}</span>
          <span class="category-name">${escapeHtml(cat.name)}</span>
          <span class="category-desc">${escapeHtml(cat.short_description || '')}</span>
        </button>
      `).join('')}
    </div>
    <div class="selection-pills">
      <span class="selection-pill ${focusPlanState.selectedCategories.length >= 1 ? 'filled' : ''}"></span>
      <span class="selection-pill ${focusPlanState.selectedCategories.length >= 2 ? 'filled' : ''}"></span>
      <span class="selection-pill ${focusPlanState.selectedCategories.length >= 3 ? 'filled' : ''}"></span>
    </div>
    <p class="selection-hint">
      <span class="selection-count">${focusPlanState.selectedCategories.length}</span>/3 selected
      ${focusPlanState.selectedCategories.length === 0 ? ' - pick at least 1' : ''}
    </p>
  `
}

function setupStep1Listeners() {
  document.querySelectorAll('.focus-category-card').forEach(card => {
    card.addEventListener('click', () => {
      const categoryId = card.dataset.categoryId
      const index = focusPlanState.selectedCategories.indexOf(categoryId)
      
      if (index > -1) {
        // Remove selection
        focusPlanState.selectedCategories.splice(index, 1)
        card.classList.remove('selected')
      } else if (focusPlanState.selectedCategories.length < 3) {
        // Add selection (max 3)
        focusPlanState.selectedCategories.push(categoryId)
        card.classList.add('selected')
      } else {
        // Show max selection feedback
        card.classList.add('shake')
        setTimeout(() => card.classList.remove('shake'), 500)
      }
      
      // Update count display and pills
      const countEl = document.querySelector('.selection-count')
      const hintEl = document.querySelector('.selection-hint')
      if (countEl) countEl.textContent = focusPlanState.selectedCategories.length
      if (hintEl) {
        hintEl.innerHTML = `
          <span class="selection-count">${focusPlanState.selectedCategories.length}</span>/3 selected
          ${focusPlanState.selectedCategories.length === 0 ? ' - pick at least 1' : ''}
        `
      }
      document.querySelectorAll('.selection-pill').forEach((pill, i) => {
        pill.classList.toggle('filled', i < focusPlanState.selectedCategories.length)
      })
      
      updateNextButtonState()
    })
  })
}

// Step 2: Goal Selection (multiple selection allowed)
function renderStep2() {
  const nonCustomGoals = GOAL_OPTIONS.filter(g => g.key !== 'custom')
  const hasCustomSelected = focusPlanState.selectedGoalKeys.includes('custom')
  
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

function setupStep2Listeners() {
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
function renderStep3() {
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

function setupStep3Listeners() {
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
  if (focusPlanState.currentStep < 3) {
    renderStep(focusPlanState.currentStep + 1)
  } else {
    // Submit the plan
    await submitFocusPlan()
  }
}

function updateNextButtonState() {
  const nextBtn = document.getElementById('focusPlanNext')
  if (!nextBtn) return
  
  // Step 1 requires at least 1 category
  if (focusPlanState.currentStep === 1) {
    nextBtn.disabled = focusPlanState.selectedCategories.length === 0
  } else {
    nextBtn.disabled = false
  }
}

// Submit the focus plan
async function submitFocusPlan() {
  const nextBtn = document.getElementById('focusPlanNext')
  nextBtn.disabled = true
  nextBtn.textContent = 'Creating plan...'
  
  try {
    console.log('Focus Plan: Starting submission...')
    
    // Get category names for pathway determination
    const selectedCategoryNames = focusPlanState.selectedCategories.map(id => {
      const cat = focusPlanState.categories.find(c => c.id === id)
      return cat ? cat.name : id
    })
    
    console.log('Focus Plan: Selected categories:', selectedCategoryNames)
    console.log('Focus Plan: Available pathways:', focusPlanState.pathways.map(p => p.name))
    
    // Determine default pathway with module availability check
    let defaultPathway = await determineDefaultPathwayWithModules(selectedCategoryNames, focusPlanState.pathways, focusPlanState.childId)
    
    // If no pathway with modules was found, use the original logic but warn about it
    if (!defaultPathway) {
      console.warn('Focus Plan: No pathway with modules found, using default pathway selection')
      // Fall back to original pathway determination
      const { determineDefaultPathway } = await import('../../services/databaseService.js')
      defaultPathway = determineDefaultPathway(selectedCategoryNames, focusPlanState.pathways)
      if (defaultPathway) {
        console.warn(`Focus Plan: Using pathway "${defaultPathway.name}" which may not have modules`)
      }
    }
    
    console.log('Focus Plan: Selected pathway:', defaultPathway?.name)
    
    // Resolve super_skill_id from the first selected category (if linked)
    const primaryCat = focusPlanState.categories.find(c => c.id === focusPlanState.selectedCategories[0])
    const superSkillId = primaryCat?.super_skill_id || null

    // Create the focus plan with multiple goals and comments
    const plan = await createChildFocusPlan({
      childId: focusPlanState.childId,
      targetCategoryIds: focusPlanState.selectedCategories,
      defaultPathwayId: defaultPathway?.id || null,
      goalKeys: focusPlanState.selectedGoalKeys.length > 0 ? focusPlanState.selectedGoalKeys : null,
      goalText: focusPlanState.customGoalText || null,
      frequency: focusPlanState.frequency,
      intensity: focusPlanState.intensity,
      comments: focusPlanState.comments || null,
      superSkillId: superSkillId
    })
    
    console.log('Focus Plan: Plan created successfully')
    
    // Close modal
    closeFocusPlanModal()
    
    // Show success toast
    showFocusPlanToast('Plan set! Let\'s start your journey! 🎉')
    
    // Call completion callback with the plan and pathway
    if (focusPlanState.onComplete) {
      console.log('Focus Plan: Calling completion callback...')
      focusPlanState.onComplete(plan, defaultPathway)
    }
    
  } catch (error) {
    console.error('Error creating focus plan:', error)
    console.error('Error details:', error.message, error.stack)
    nextBtn.disabled = false
    nextBtn.textContent = '✨ Start Journey!'
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

export async function showFocusPlanSettings(childId, currentPlan, onUpdate) {
  focusPlanState.childId = childId
  focusPlanState.onComplete = onUpdate
  
  // Load current plan data
  if (currentPlan) {
    focusPlanState.selectedCategories = currentPlan.target_category_ids || []
    focusPlanState.selectedGoalKey = currentPlan.goal_key
    focusPlanState.customGoalText = currentPlan.goal_text || ''
    focusPlanState.frequency = currentPlan.frequency
    focusPlanState.intensity = currentPlan.intensity
  }
  
  // Load categories and pathways
  try {
    focusPlanState.categories = await getCategories()
    focusPlanState.pathways = await getPathways()
  } catch (error) {
    console.error('Error loading focus plan data:', error)
    focusPlanState.categories = getFallbackCategories()
  }
  
  // Create settings modal
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
  
  const categories = focusPlanState.categories
  
  const modalHTML = `
    <div id="focusPlanSettingsModal" class="focus-plan-modal" style="display: none;">
      <div class="focus-plan-modal-content settings-mode">
        <div class="focus-plan-header">
          <button type="button" class="close-settings-btn" id="closeFocusPlanSettings">✕</button>
          <h2 class="focus-plan-title">⚙️ Focus Plan Settings</h2>
          <p class="focus-plan-subtitle">Update your child's focus areas and goals</p>
        </div>
        
        <div class="focus-plan-body">
          <div class="settings-section">
            <h3>Focus Areas (up to 3)</h3>
            <div class="focus-categories-grid compact">
              ${categories.map(cat => `
                <button type="button" 
                        class="focus-category-card ${focusPlanState.selectedCategories.includes(cat.id) ? 'selected' : ''}"
                        data-category-id="${cat.id}">
                  <span class="category-icon">${cat.icon || '📚'}</span>
                  <span class="category-name">${escapeHtml(cat.name)}</span>
                  <span class="category-check">✓</span>
                </button>
              `).join('')}
            </div>
            <p class="selection-hint">
              <span class="selection-count">${focusPlanState.selectedCategories.length}</span>/3 selected
            </p>
          </div>
          
          <div class="settings-section">
            <h3>Default Pathway</h3>
            <select id="pathwaySelect" class="pathway-select">
              ${focusPlanState.pathways.map(p => `
                <option value="${p.id}" ${currentPlan?.default_pathway_id === p.id ? 'selected' : ''}>
                  ${escapeHtml(p.name)}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="settings-section">
            <button type="button" class="new-cycle-btn" id="startNewCycleBtn">
              🔄 Start New Cycle
            </button>
            <p class="new-cycle-hint">This will archive the current plan and create a fresh start</p>
          </div>
        </div>
        
        <div class="focus-plan-footer">
          <button type="button" class="focus-plan-btn secondary" id="cancelFocusPlanSettings">
            Cancel
          </button>
          <button type="button" class="focus-plan-btn primary" id="saveFocusPlanSettings">
            💾 Save Changes
          </button>
        </div>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('beforeend', modalHTML)
  
  // Setup event listeners
  setupSettingsListeners(currentPlan)
}

function setupSettingsListeners(currentPlan) {
  // Close button
  document.getElementById('closeFocusPlanSettings').addEventListener('click', closeFocusPlanSettingsModal)
  document.getElementById('cancelFocusPlanSettings').addEventListener('click', closeFocusPlanSettingsModal)
  
  // Category selection
  document.querySelectorAll('#focusPlanSettingsModal .focus-category-card').forEach(card => {
    card.addEventListener('click', () => {
      const categoryId = card.dataset.categoryId
      const index = focusPlanState.selectedCategories.indexOf(categoryId)
      
      if (index > -1) {
        focusPlanState.selectedCategories.splice(index, 1)
        card.classList.remove('selected')
      } else if (focusPlanState.selectedCategories.length < 3) {
        focusPlanState.selectedCategories.push(categoryId)
        card.classList.add('selected')
      }
      
      // Update count
      const countEl = document.querySelector('#focusPlanSettingsModal .selection-count')
      if (countEl) countEl.textContent = focusPlanState.selectedCategories.length
    })
  })
  
  // Save button
  document.getElementById('saveFocusPlanSettings').addEventListener('click', async () => {
    if (focusPlanState.selectedCategories.length === 0) {
      showFocusPlanToast('Please select at least 1 focus area', 'error')
      return
    }
    
    const pathwaySelect = document.getElementById('pathwaySelect')
    const newPathwayId = pathwaySelect.value
    
    try {
      await updateChildFocusPlan(currentPlan.id, {
        target_category_ids: focusPlanState.selectedCategories,
        default_pathway_id: newPathwayId
      })
      
      closeFocusPlanSettingsModal()
      showFocusPlanToast('Focus plan updated! 🎉')
      
      if (focusPlanState.onComplete) {
        const updatedPathway = focusPlanState.pathways.find(p => p.id === newPathwayId)
        focusPlanState.onComplete(currentPlan, updatedPathway)
      }
    } catch (error) {
      console.error('Error updating focus plan:', error)
      showFocusPlanToast('Failed to update plan', 'error')
    }
  })
  
  // New cycle button
  document.getElementById('startNewCycleBtn').addEventListener('click', async () => {
    if (confirm('Start a new cycle? This will archive your current plan.')) {
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
