// ================================================
// Child Focus Plan - Onboarding & Management
// ================================================

import { supabase } from './supabaseClient.js'
import { 
  getChildFocusPlan, 
  createChildFocusPlan, 
  updateChildFocusPlan,
  getCategories, 
  getPathways,
  determineDefaultPathway 
} from './database.js'

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

// Goal options
const GOAL_OPTIONS = [
  { key: 'calm_faster', label: 'Calm down faster', icon: '🧘' },
  { key: 'less_meltdowns', label: 'Fewer meltdowns', icon: '🌊' },
  { key: 'better_communication', label: 'Better communication', icon: '💬' },
  { key: 'more_confidence', label: 'More confidence', icon: '💪' },
  { key: 'handle_worry', label: 'Handle worry better', icon: '🌈' },
  { key: 'make_friends', label: 'Make friends easier', icon: '👫' },
  { key: 'custom', label: 'Custom goal...', icon: '✏️' }
]

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'few_per_week', label: 'A few times a week', description: '3-4 times' },
  { value: 'weekly', label: 'Weekly', description: 'Once a week' },
  { value: 'rare', label: 'As needed', description: 'When it comes up' }
]

const INTENSITY_OPTIONS = [
  { value: 'mild', label: 'Mild', description: 'Small challenges', icon: '🌱' },
  { value: 'medium', label: 'Medium', description: 'Regular challenges', icon: '🌿' },
  { value: 'big', label: 'Big', description: 'Significant challenges', icon: '🌳' }
]

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

  // Load categories and pathways
  try {
    const rawCategories = await getCategories()
    // Normalize category data - category_colors table uses 'category' field
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
    { id: 'anger', name: 'Anger', icon: '🔥', short_description: 'Managing angry feelings' },
    { id: 'anxiety', name: 'Anxiety', icon: '🌧️', short_description: 'Handling worry and fear' },
    { id: 'depression', name: 'Sadness', icon: '🌙', short_description: 'Working through sad feelings' },
    { id: 'emotions', name: 'Emotions', icon: '💭', short_description: 'Understanding all feelings' },
    { id: 'body', name: 'Body Awareness', icon: '💪', short_description: 'Connecting with your body' },
    { id: 'social', name: 'Social Skills', icon: '👫', short_description: 'Making friends and connections' },
    { id: 'cognitive', name: 'Thinking Skills', icon: '🧠', short_description: 'Training your brain' }
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
          <h2 class="focus-plan-title" id="focusPlanTitle">Let's Create Your Plan! 🎯</h2>
          <p class="focus-plan-subtitle" id="focusPlanSubtitle">Choose what you'd like to work on</p>
        </div>
        
        <div class="focus-plan-body" id="focusPlanBody">
          <!-- Step content will be rendered here -->
        </div>
        
        <div class="focus-plan-footer">
          <button type="button" class="focus-plan-btn secondary" id="focusPlanBack" style="display: none;">
            ← Back
          </button>
          <button type="button" class="focus-plan-btn primary" id="focusPlanNext">
            Next →
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
  nextBtn.textContent = step === 3 ? '✨ Start Journey!' : 'Next →'
  
  // Render step content
  const body = document.getElementById('focusPlanBody')
  const title = document.getElementById('focusPlanTitle')
  const subtitle = document.getElementById('focusPlanSubtitle')
  
  switch (step) {
    case 1:
      title.textContent = "Let's Create Your Plan! 🎯"
      subtitle.textContent = 'Choose up to 3 areas to focus on'
      body.innerHTML = renderStep1()
      setupStep1Listeners()
      break
    case 2:
      title.textContent = 'Set Your Goal 🌟'
      subtitle.textContent = 'What would you like to achieve? (Optional)'
      body.innerHTML = renderStep2()
      setupStep2Listeners()
      break
    case 3:
      title.textContent = 'How Often? 📅'
      subtitle.textContent = 'Tell us about the challenges (Optional)'
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
    <div class="focus-plan-info-blurb">
      <p class="blurb-title">Every child is different</p>
      <p class="blurb-text">What they struggle with, how they react, and what support helps most. This quick step lets you choose up to three focus areas you'd like your child to work on right now.</p>
      
      <p class="blurb-subtitle">Your choices shape the path your child sees:</p>
      <ul class="blurb-list">
        <li>Which modules appear first</li>
        <li>How the adventure map is laid out</li>
        <li>And where their learning journey begins</li>
      </ul>
      
      <p class="blurb-note">Nothing here is permanent — you can change this later as your child grows. This just helps us start in the right place, instead of guessing.</p>
    </div>
    
    <div class="focus-categories-grid">
      ${categories.map(cat => `
        <button type="button" 
                class="focus-category-card ${focusPlanState.selectedCategories.includes(cat.id) ? 'selected' : ''}"
                data-category-id="${cat.id}"
                data-category-name="${cat.name}">
          <span class="category-icon">${cat.icon || '📚'}</span>
          <span class="category-name">${cat.name}</span>
          <span class="category-desc">${cat.short_description || ''}</span>
          <span class="category-check">✓</span>
        </button>
      `).join('')}
    </div>
    <p class="selection-hint">
      <span class="selection-count">${focusPlanState.selectedCategories.length}</span>/3 selected
      ${focusPlanState.selectedCategories.length === 0 ? ' — Select at least 1' : ''}
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
      
      // Update count display
      const countEl = document.querySelector('.selection-count')
      const hintEl = document.querySelector('.selection-hint')
      if (countEl) countEl.textContent = focusPlanState.selectedCategories.length
      if (hintEl) {
        hintEl.innerHTML = `
          <span class="selection-count">${focusPlanState.selectedCategories.length}</span>/3 selected
          ${focusPlanState.selectedCategories.length === 0 ? ' — Select at least 1' : ''}
        `
      }
      
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
          <span class="goal-label">${goal.label}</span>
        </button>
      `).join('')}
    </div>
    
    <div class="custom-goal-container visible">
      <label for="customGoalInput">Additional goal or notes:</label>
      <input type="text" 
             id="customGoalInput" 
             class="custom-goal-input"
             placeholder="Any other goals you'd like to work on?"
             maxlength="200"
             value="${focusPlanState.customGoalText}">
      <span class="char-count">${focusPlanState.customGoalText.length}/200</span>
    </div>
    
    <p class="step-hint">💡 Select as many goals as you'd like</p>
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
      <h3 class="options-label">How often do these challenges happen?</h3>
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
      <h3 class="options-label">How big are the challenges usually?</h3>
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
      <h3 class="options-label">Additional Comments (Optional)</h3>
      <textarea 
        id="focusPlanComments" 
        class="focus-comments-input"
        placeholder="Any additional information about your child's challenges, triggers, or things we should know..."
        maxlength="500"
        rows="3">${focusPlanState.comments}</textarea>
      <span class="char-count comments-count">${focusPlanState.comments.length}/500</span>
    </div>
    
    <p class="step-hint">💡 This helps us recommend the right pace</p>
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
    // Get category names for pathway determination
    const selectedCategoryNames = focusPlanState.selectedCategories.map(id => {
      const cat = focusPlanState.categories.find(c => c.id === id)
      return cat ? cat.name : id
    })
    
    // Determine default pathway
    const defaultPathway = determineDefaultPathway(selectedCategoryNames, focusPlanState.pathways)
    
    // Create the focus plan with multiple goals and comments
    const plan = await createChildFocusPlan({
      childId: focusPlanState.childId,
      targetCategoryIds: focusPlanState.selectedCategories,
      defaultPathwayId: defaultPathway?.id || null,
      goalKeys: focusPlanState.selectedGoalKeys.length > 0 ? focusPlanState.selectedGoalKeys : null,
      goalText: focusPlanState.customGoalText || null,
      frequency: focusPlanState.frequency,
      intensity: focusPlanState.intensity,
      comments: focusPlanState.comments || null
    })
    
    // Close modal
    closeFocusPlanModal()
    
    // Show success toast
    showFocusPlanToast('Plan set! Let\'s start your journey! 🎉')
    
    // Call completion callback with the plan and pathway
    if (focusPlanState.onComplete) {
      focusPlanState.onComplete(plan, defaultPathway)
    }
    
  } catch (error) {
    console.error('Error creating focus plan:', error)
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
                  <span class="category-name">${cat.name}</span>
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
                  ${p.name}
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
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
      backdrop-filter: blur(4px);
    }
    
    .focus-plan-modal-content {
      background: white;
      border-radius: 24px;
      max-width: 950px;
      width: 100%;
      max-height: 95vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: focusPlanSlideIn 0.3s ease-out;
    }
    
    .focus-plan-modal-content.settings-mode {
      max-width: 500px;
    }
    
    @keyframes focusPlanSlideIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .focus-plan-header {
      padding: 24px 24px 16px;
      text-align: center;
      border-bottom: 1px solid #eee;
      position: relative;
    }
    
    .close-settings-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      background: #f0f0f0;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    
    .close-settings-btn:hover {
      background: #e0e0e0;
    }
    
    .focus-plan-progress {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .progress-step {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e0e0e0;
      color: #888;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.3s;
    }
    
    .progress-step.active {
      background: #405878;
      color: white;
    }
    
    .progress-step.completed {
      background: #4CAF50;
      color: white;
    }
    
    .progress-line {
      width: 40px;
      height: 3px;
      background: #e0e0e0;
      border-radius: 2px;
    }
    
    .focus-plan-title {
      font-size: 24px;
      font-weight: 700;
      color: #405878;
      margin: 0 0 8px;
      font-family: 'Fredoka', sans-serif;
    }
    
    .focus-plan-subtitle {
      font-size: 14px;
      color: #666;
      margin: 0;
    }
    
    .focus-plan-body {
      padding: 24px;
    }
    
    .focus-categories-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    
    .focus-categories-grid.compact {
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    
    .focus-category-card {
      background: #f8f9fa;
      border: 2px solid #e0e0e0;
      border-radius: 16px;
      padding: 16px 12px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      position: relative;
      text-align: center;
    }
    
    .focus-category-card:hover {
      border-color: #405878;
      transform: translateY(-2px);
    }
    
    .focus-category-card.selected {
      background: #e8f4fd;
      border-color: #405878;
    }
    
    .focus-category-card .category-icon {
      font-size: 32px;
    }
    
    .focus-category-card .category-name {
      font-weight: 600;
      color: #405878;
      font-size: 13px;
    }
    
    .focus-category-card .category-desc {
      font-size: 11px;
      color: #888;
      line-height: 1.3;
    }
    
    .focus-category-card .category-check {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 20px;
      height: 20px;
      background: #4CAF50;
      color: white;
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }
    
    .focus-category-card.selected .category-check {
      display: flex;
    }
    
    .focus-category-card.shake {
      animation: shake 0.5s ease-in-out;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    
    .selection-hint {
      text-align: center;
      color: #666;
      font-size: 13px;
      margin-top: 16px;
    }
    
    .selection-count {
      font-weight: 700;
      color: #405878;
    }
    
    .focus-goals-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
    }
    
    .focus-goal-chip {
      background: #f8f9fa;
      border: 2px solid #e0e0e0;
      border-radius: 24px;
      padding: 10px 16px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .focus-goal-chip:hover {
      border-color: #405878;
    }
    
    .focus-goal-chip.selected {
      background: #405878;
      border-color: #405878;
      color: white;
    }
    
    .focus-goal-chip .goal-icon {
      font-size: 18px;
    }
    
    .focus-goal-chip .goal-label {
      font-size: 14px;
      font-weight: 500;
    }
    
    .custom-goal-container {
      margin-top: 20px;
      display: none;
    }
    
    .custom-goal-container.visible {
      display: block;
    }
    
    .custom-goal-container label {
      display: block;
      font-size: 13px;
      color: #666;
      margin-bottom: 8px;
    }
    
    .custom-goal-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      font-size: 14px;
      transition: border-color 0.2s;
    }
    
    .custom-goal-input:focus {
      outline: none;
      border-color: #405878;
    }
    
    .focus-comments-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      min-height: 80px;
      transition: border-color 0.2s;
    }
    
    .focus-comments-input:focus {
      outline: none;
      border-color: #405878;
    }
    
    .char-count {
      display: block;
      text-align: right;
      font-size: 11px;
      color: #888;
      margin-top: 4px;
    }
    
    .step-hint {
      text-align: center;
      color: #888;
      font-size: 13px;
      margin-top: 20px;
    }
    
    .focus-plan-info-blurb {
      background: linear-gradient(135deg, #f0f4f8 0%, #e8f1f7 100%);
      border-left: 4px solid #405878;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
      font-size: 14px;
      line-height: 1.6;
      color: #2b3a55;
    }
    
    .blurb-title {
      font-size: 16px;
      font-weight: 700;
      color: #405878;
      margin: 0 0 12px 0;
    }
    
    .blurb-text {
      margin: 0 0 16px 0;
      color: #495057;
    }
    
    .blurb-subtitle {
      font-size: 13px;
      font-weight: 600;
      color: #405878;
      margin: 12px 0 8px 0;
    }
    
    .blurb-list {
      list-style: none;
      padding: 0;
      margin: 0 0 12px 0;
    }
    
    .blurb-list li {
      padding-left: 20px;
      position: relative;
      margin-bottom: 6px;
      color: #495057;
    }
    
    .blurb-list li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #14b8a6;
      font-weight: bold;
    }
    
    .blurb-note {
      margin: 12px 0 0 0;
      font-size: 13px;
      color: #666;
      font-style: italic;
    }
    
    .focus-options-section {
      margin-bottom: 24px;
    }
    
    .options-label {
      font-size: 14px;
      font-weight: 600;
      color: #405878;
      margin-bottom: 12px;
    }
    
    .focus-frequency-grid,
    .focus-intensity-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    
    .focus-option-btn {
      background: #f8f9fa;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    
    .focus-option-btn:hover {
      border-color: #405878;
    }
    
    .focus-option-btn.selected {
      background: #e8f4fd;
      border-color: #405878;
    }
    
    .focus-option-btn .option-icon {
      font-size: 24px;
      display: block;
      margin-bottom: 4px;
    }
    
    .focus-option-btn .option-label {
      font-weight: 600;
      color: #405878;
      font-size: 13px;
      display: block;
    }
    
    .focus-option-btn .option-desc {
      font-size: 11px;
      color: #888;
      display: block;
    }
    
    .focus-plan-footer {
      padding: 16px 24px 24px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      border-top: 1px solid #eee;
    }
    
    .focus-plan-btn {
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    
    .focus-plan-btn.primary {
      background: #405878;
      color: white;
    }
    
    .focus-plan-btn.primary:hover:not(:disabled) {
      background: #2d3e54;
    }
    
    .focus-plan-btn.primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .focus-plan-btn.secondary {
      background: #f0f0f0;
      color: #666;
    }
    
    .focus-plan-btn.secondary:hover {
      background: #e0e0e0;
    }
    
    .settings-section {
      margin-bottom: 24px;
    }
    
    .settings-section h3 {
      font-size: 14px;
      font-weight: 600;
      color: #405878;
      margin-bottom: 12px;
    }
    
    .pathway-select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }
    
    .pathway-select:focus {
      outline: none;
      border-color: #405878;
    }
    
    .new-cycle-btn {
      width: 100%;
      padding: 14px;
      background: #fff3e0;
      border: 2px solid #ffb74d;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      color: #e65100;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .new-cycle-btn:hover {
      background: #ffe0b2;
    }
    
    .new-cycle-hint {
      font-size: 12px;
      color: #888;
      text-align: center;
      margin-top: 8px;
    }
    
    .focus-plan-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #405878;
      color: white;
      padding: 14px 24px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      z-index: 10001;
      transition: transform 0.3s ease-out;
    }
    
    .focus-plan-toast.visible {
      transform: translateX(-50%) translateY(0);
    }
    
    .focus-plan-toast.error {
      background: #d32f2f;
    }
    
    .focus-plan-toast .toast-icon {
      font-size: 20px;
    }
    
    .focus-plan-toast .toast-message {
      font-size: 14px;
      font-weight: 500;
    }
    
    @media (max-width: 480px) {
      .focus-plan-modal-content {
        border-radius: 16px;
        max-height: 95vh;
      }
      
      .focus-categories-grid {
        grid-template-columns: repeat(3, 1fr);
      }
      
      .focus-goal-chip {
        padding: 8px 12px;
        font-size: 13px;
      }
      
      .focus-frequency-grid,
      .focus-intensity-grid {
        grid-template-columns: 1fr;
      }
    }
  `
  
  document.head.appendChild(styles)
}

// Export for use in other modules
export { focusPlanState, GOAL_OPTIONS, FREQUENCY_OPTIONS, INTENSITY_OPTIONS }
