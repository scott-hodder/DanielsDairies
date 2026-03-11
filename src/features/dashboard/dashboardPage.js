import { supabase } from '../../supabaseClient.js'
import { checkAuth, signOut, getCurrentUser } from '../../auth.js'
import { getChildren, createChild, getModules, getChildModules, updateChildModuleStatus, awardStars, getChild, getAllChildrenLeaderboard, setChildPassword, verifyChildPassword, updateChildProfile, deleteChild, saveWeeklyCheckin, getLatestWeeklyPlan, getSettings, updateLoginStreak, getLoginStreak, isUserAdmin, getChildFocusPlan, getSuperSkills, getModuleUnlocks, getCreditSummary, getCurrentBillingPeriod, unlockModuleWithCredit, getParentSubscription, getSubscriptionTiers, switchStripeSubscriptionPlan, getLevelInfo, getXpForNextLevel } from '../../database.js'
import { initializeRewardsTab, setupRewardsEventListeners } from './dashboardRewards.js'
import { showLoadingScreen, hideLoadingScreen } from './loadingScreen.js'
import { checkFocusPlan, showFocusPlanOnboarding, showFocusPlanSettings } from './focusPlan.js'
import { showElement, hideElement, setLoadingState } from '../../utils/dom.js'
import { dashboardState, setAllModulesFilters, setCategoryColors, setChildModules, setChildren, setCurrentFocusPlan, setCurrentInsightsSubtab, setCurrentPurchaseModule, setCurrentUser, setEditingChild, setIsCurrentUserAdmin, setModules, setMoreModulesCurrentIndex, setMoreModulesRotationTimer, setParentModules, setSelectedChild, setShowAllChildModules, setCurrentWeeklyPlan } from '../../state/dashboardState.js'
import { setAppState, getAppState } from '../../services/appState.js'
import { buildModuleUrl } from '../modules/moduleNavigation.js'
import { renderDevSetupMessage } from '../../ui/devSetupMessage.js'


let currentCreditSummary = null
let currentBillingPeriod = getCurrentBillingPeriod()
let currentSubscription = null
let subscriptionTiers = []

// Make supabase available to non-module scripts and inline dashboard.html code
window.supabase = supabase

const state = dashboardState

window.state = window.state || {}

// Helper function to check if streak popup was shown today (per child)
function hasStreakPopupBeenShownToday(childId) {
  const today = new Date().toISOString().split('T')[0]
  const key = `streakPopup_child_${childId}_${today}`
  return localStorage.getItem(key) === 'true'
}

// Helper function to mark streak popup as shown for today (per child)
function markStreakPopupAsShown(childId) {
  const today = new Date().toISOString().split('T')[0]
  const key = `streakPopup_child_${childId}_${today}`
  localStorage.setItem(key, 'true')
}

// DOM Elements
const loadingState = document.getElementById('loadingState')
const childrenView = document.getElementById('childrenView')
const childDetailView = document.getElementById('childDetailView')
const childrenGrid = document.getElementById('childrenGrid')
const parentUnlockedModulesGrid = document.getElementById('parentUnlockedModulesGrid')
const parentLockedModulesGrid = document.getElementById('parentLockedModulesGrid')
const allWorkbooksCategoryFilter = document.getElementById('allWorkbooksCategoryFilter')
const allWorkbooksSeriesFilter = document.getElementById('allWorkbooksSeriesFilter')
const dashboardCategoryFilter = document.getElementById('dashboardCategoryFilter')
const dashboardSeriesFilter = document.getElementById('dashboardSeriesFilter')
const modulesGrid = document.getElementById('modulesGrid')
const modulesSeriesTabs = document.getElementById('modulesCategoryTabs')
const logoutButton = document.getElementById('logoutButton')
const dashboardHomeButton = document.getElementById('dashboardHomeButton')
const profileButton = document.getElementById('profileButton')
const billingButton = document.getElementById('billingButton')
const creditWalletBadge = document.getElementById('creditWalletBadge')
const creditWalletValue = document.getElementById('creditWalletValue')
const moreModulesButton = document.getElementById('moreModulesButton')
const moreModulesModal = document.getElementById('moreModulesModal')
const closeMoreModulesButton = document.getElementById('closeMoreModulesButton')
const moreModulesCarousel = document.getElementById('moreModulesCarousel')
const moreModulesCarouselIndicators = document.getElementById('moreModulesCarouselIndicators')
const moreModulesPrevButton = document.getElementById('moreModulesPrevButton')
const moreModulesNextButton = document.getElementById('moreModulesNextButton')
const backButton = document.getElementById('backButton')
const addChildModal = document.getElementById('addChildModal')
const addChildForm = document.getElementById('addChildForm')
const cancelAddChild = document.getElementById('cancelAddChild')
const modalError = document.getElementById('modalError')
const headerSubtitle = document.getElementById('headerSubtitle')
const dashboardButton = document.getElementById('dashboardButton')
const purchaseModal = document.getElementById('purchaseModal')
const purchaseModalTitle = document.getElementById('purchaseModalTitle')
const purchaseModalBody = document.getElementById('purchaseModalBody')
const purchaseModalCost = document.getElementById('purchaseModalCost')
const cancelPurchaseButton = document.getElementById('cancelPurchaseButton')
const confirmPurchaseButton = document.getElementById('confirmPurchaseButton')
const unlockResultModal = document.getElementById('unlockResultModal')
const unlockResultTitle = document.getElementById('unlockResultTitle')
const unlockResultMessage = document.getElementById('unlockResultMessage')
const unlockResultIcon = document.getElementById('unlockResultIcon')
const unlockResultCloseButton = document.getElementById('unlockResultCloseButton')
const childPasswordModal = document.getElementById('childPasswordModal')
const childPasswordModalTitle = document.getElementById('childPasswordModalTitle')
const childPasswordForm = document.getElementById('childPasswordForm')
const childPasswordInput = document.getElementById('childPassword')
const passwordModalError = document.getElementById('passwordModalError')
const cancelPasswordButton = document.getElementById('cancelPasswordButton')
const editChildModal = document.getElementById('editChildModal')
const editChildForm = document.getElementById('editChildForm')
const editChildName = document.getElementById('editChildName')
const editChildAvatar = document.getElementById('editChildAvatar')
const editChildPassword = document.getElementById('editChildPassword')
const editModalError = document.getElementById('editModalError')
const cancelEditChildButton = document.getElementById('cancelEditChildButton')
const avatarPicker = document.getElementById('avatarPicker')
const addChildAvatarPicker = document.getElementById('addChildAvatarPicker')
const addChildAvatar = document.getElementById('addChildAvatar')
const addChildQuickBtn = document.getElementById('addChildQuickBtn')
const forgetPasswordBtn = document.getElementById('forgetPasswordBtn')
const parentPasswordModal = document.getElementById('parentPasswordModal')
const parentPasswordForm = document.getElementById('parentPasswordForm')
const parentPassword = document.getElementById('parentPassword')
const parentPasswordError = document.getElementById('parentPasswordError')
const cancelParentPasswordButton = document.getElementById('cancelParentPasswordButton')
const removeChildBtn = document.getElementById('removeChildBtn')
const removeChildModal = document.getElementById('removeChildModal')
const removeChildName = document.getElementById('removeChildName')
const removeChildError = document.getElementById('removeChildError')
const cancelRemoveChildButton = document.getElementById('cancelRemoveChildButton')
const confirmRemoveChildButton = document.getElementById('confirmRemoveChildButton')
const weeklyCheckinForm = document.getElementById('weeklyCheckinForm')
const checkinIntensityInput = document.getElementById('checkinIntensity')
const checkinChallengeSelect = document.getElementById('checkinChallenge')
const checkinGoalSelect = document.getElementById('checkinGoal')
const checkinNotesInput = document.getElementById('checkinNotes')
const checkinTriggersContainer = document.getElementById('checkinTriggers')
const checkinMessage = document.getElementById('checkinMessage')
const checkinSubmitButton = document.getElementById('checkinSubmitButton')
const checkinSubmitText = document.getElementById('checkinSubmitText')
const checkinSubmitSpinner = document.getElementById('checkinSubmitSpinner')
const weeklyPlanSummary = document.getElementById('weeklyPlanSummary')
const planSkillsEl = document.getElementById('planSkills')
const planEmotionsEl = document.getElementById('planEmotions')
const planToolsEl = document.getElementById('planTools')
const planScriptEl = document.getElementById('planScript')
const parentScriptsList = document.getElementById('parentScriptsList')
const insightsOverviewTab = document.getElementById('insightsOverviewTab')
const weeklyCheckinTab = document.getElementById('weeklyCheckinTab')
const insightsOverviewPanel = document.getElementById('insightsOverviewPanel')
const weeklyCheckinPanel = document.getElementById('weeklyCheckinPanel')

updateMoreModulesButtonState()

const avatarCategories = {
    animals: ['🦊', '🐼', '🦁', '🐨', '🦋', '🐸', '🐯', '🐺'],
    magical: ['🧚', '🧙', '🧜', '🐉', '🦄', '🌈', '🔮', '🦕'],
    heroes: ['🦸', '🦹', '🥷', '🤖', '👑', '🎭', '🎯', '💎'],
    space: ['🚀', '👨‍🚀', '👩‍🚀', '🛸', '🌙', '⭐', '🪐', '☄️']
}

const avatarOptions = [
    ...avatarCategories.animals,
    ...avatarCategories.magical,
    ...avatarCategories.heroes,
    ...avatarCategories.space
]
let triggerOptions = ['Anger', 'Overwhelm', 'Worry/Anxiety', 'Sadness', 'Frustration']
const selectedTriggers = new Set()

async function loadCheckinOptions() {
  try {
    const [challRes, goalRes, trigRes] = await Promise.all([
      supabase.from('checkin_challenges').select('label').eq('is_active', true).order('sort_order'),
      supabase.from('checkin_goals').select('label').eq('is_active', true).order('sort_order'),
      supabase.from('checkin_triggers').select('label').eq('is_active', true).order('sort_order'),
    ])

    if (challRes.data && challRes.data.length > 0) {
      const sel = document.getElementById('checkinChallenge')
      if (sel) {
        sel.innerHTML = '<option value="">Select one</option>' +
          challRes.data.map(c => `<option>${c.label}</option>`).join('')
      }
    }

    if (goalRes.data && goalRes.data.length > 0) {
      const sel = document.getElementById('checkinGoal')
      if (sel) {
        sel.innerHTML = '<option value="">Choose a goal</option>' +
          goalRes.data.map(g => `<option>${g.label}</option>`).join('')
      }
    }

    if (trigRes.data && trigRes.data.length > 0) {
      triggerOptions = trigRes.data.map(t => t.label)
    }
  } catch (error) {
    console.error('Error loading check-in options from DB, using defaults:', error)
  }
}

const parentScriptsSeed = [
  {
    title: 'Anger (in the moment)',
    context: 'Use when a child is actively angry',
    script: '“I can see you’re really angry. You’re not in trouble. I’m here. Let’s do 3 slow breaths together.”',
    feelings: ['Anger'],
    tool: 'Belly Breathing'
  },
  {
    title: 'Overwhelm (in the moment)',
    context: 'When everything feels “too much”',
    script: '“This feels like too much right now. Let’s make it smaller. What’s one tiny next step we can do first?”',
    feelings: ['Overwhelm'],
    tool: 'Fix-It / Accept-It'
  },
  {
    title: 'Worry (reassurance without feeding it)',
    context: 'Validate worry while keeping agency',
    script: '“Thanks for telling me. Worry is trying to protect you. Let’s take a breath and then we’ll make a plan.”',
    feelings: ['Worry/Anxiety'],
    tool: 'Thought Bubble'
  },
  {
    title: 'After a meltdown (repair)',
    context: 'Debrief once everyone is calm',
    script: '“That was really hard. I’m glad you’re safe now. What did your body feel like right before it got too big?”',
    feelings: ['Anger', 'Overwhelm'],
    tool: 'Emotional Identification'
  },
  {
    title: 'Volcano scale prompt',
    context: 'Scale the feeling and choose a step',
    script: '“If your volcano is a 1 to 5 right now, what number are you? What helps you go down by one?”',
    feelings: ['Anger', 'Frustration'],
    tool: 'Volcano Scale'
  },
  {
    title: '5-4-3-2-1 grounding prompt',
    context: 'Bring focus back to the present',
    script: '“Let’s help your brain come back. Tell me 5 things you can see… now 4 things you can feel…”',
    feelings: ['Overwhelm', 'Worry/Anxiety'],
    tool: '5-4-3-2-1 Grounding'
  },
  {
    title: 'Choice to reduce escalation',
    context: 'Offer co-regulation choices',
    script: '“You can choose: we can sit quietly together for one minute, or we can get a drink of water. Which one helps?”',
    feelings: ['Anger', 'Overwhelm'],
    tool: 'Calming Strategies'
  },
  {
    title: 'Brave step (anxiety)',
    context: 'Encourage brave behavior',
    script: '“Brave doesn’t mean not scared. Brave means ‘I can do it even when I feel scared.’ What’s a tiny brave step?”',
    feelings: ['Worry/Anxiety'],
    tool: 'Brave Ladder'
  },
  {
    title: 'Emotion naming',
    context: 'Help children identify feelings',
    script: '“Is this anger, worry, sadness, or overwhelm? If it’s hard to tell, that’s okay — we’ll figure it out together.”',
    feelings: ['Anger', 'Worry/Anxiety', 'Sadness', 'Overwhelm'],
    tool: 'Emotional Identification'
  },
  {
    title: 'Bedtime reset',
    context: 'Use when nights feel stuck',
    script: '“Your brain is still loud. Let’s do a calm-down routine: one slow breath, one stretch, one safe thought.”',
    feelings: ['Overwhelm', 'Worry/Anxiety'],
    tool: 'Calming Strategies'
  }
]

const intensityLabels = {
  1: 'Mostly calm',
  2: 'A little wobbly',
  3: 'A few hard moments',
  4: 'Bumpy',
  5: 'Really tough week'
}

function getCurrencyFormatter(currency = 'AUD') {
  const normalized = currency?.toUpperCase?.() || 'AUD'
  if (!getCurrencyFormatter.cache) {
    getCurrencyFormatter.cache = {}
  }
  if (!getCurrencyFormatter.cache[normalized]) {
    try {
      getCurrencyFormatter.cache[normalized] = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: normalized
      })
    } catch (_) {
      getCurrencyFormatter.cache[normalized] = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD'
      })
    }
  }

  return getCurrencyFormatter.cache[normalized]
}

function parseModulePrice(module) {
  if (!module) return null
  const raw = module.price ?? module.list_price ?? null
  if (raw === null || raw === undefined || raw === '') return null
  const numeric = typeof raw === 'number' ? raw : Number(raw)
  if (Number.isNaN(numeric)) return null
  return numeric
}

function getSafeAgeRange(module) {
  const rawAgeRange = module?.age_range ?? module?.age_label ?? module?.age_band ?? ''
  if (!rawAgeRange) return ''
  const ageText = String(rawAgeRange).trim()
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (uuidPattern.test(ageText)) return ''
  if (ageText.length > 32) return ''
  return ageText
}

function getModuleSequenceOrder(module) {
  if (!module) return Number.MAX_SAFE_INTEGER
  const candidates = [module.pathway_order, module.week_number, module.order, module.position, module.sort_order]
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') continue
    const numeric = Number(candidate)
    if (!Number.isNaN(numeric)) return numeric
  }
  return Number.MAX_SAFE_INTEGER
}

function getOrderedActiveModulesForSequence(referenceModule = null) {
  const baseModules = (state.modules || []).filter((module) => module?.is_active !== false)

  const cohortModules = referenceModule
    ? baseModules.filter((module) => {
        const sameCycle = String(module.cycle_id || '') === String(referenceModule.cycle_id || '')
        const sameSuperSkill = String(module.super_skill_id || '') === String(referenceModule.super_skill_id || '')
        const sameCategory = String(module.category || '') === String(referenceModule.category || '')
        const sameSeries = String(module.series || '') === String(referenceModule.series || '')

        return sameCycle && (sameSuperSkill || sameCategory || sameSeries)
      })
    : baseModules

  const modulesToSort = cohortModules.length > 0 ? cohortModules : baseModules

  return modulesToSort
    .slice()
    .sort((a, b) => {
      const orderDiff = getModuleSequenceOrder(a) - getModuleSequenceOrder(b)
      if (orderDiff !== 0) return orderDiff
      return Number(a.id || 0) - Number(b.id || 0)
    })
}

function getNextUnlockableModule(referenceModule = null) {
  const orderedModules = getOrderedActiveModulesForSequence(referenceModule)
  const childModuleLockMap = new Map()
  ;(state.childModules || []).forEach((cm) => {
    childModuleLockMap.set(cm.module_id, cm.locked !== false)
  })

  return orderedModules.find((module) => childModuleLockMap.get(module.id) !== false) || null
}

function isModuleNextUnlockable(module) {
  if (!module) return false
  const nextUnlockableModule = getNextUnlockableModule(module)
  return Boolean(nextUnlockableModule && String(nextUnlockableModule.id) === String(module.id))
}

function getModulePriceLabel(module) {
  const priceValue = parseModulePrice(module)
  const currency = module?.price_currency || module?.currency || 'AUD'
  const cadence = module?.price_frequency || module?.billing_frequency || 'per child'
  if (priceValue === null) {
    return 'Contact us'
  }

  const formatter = getCurrencyFormatter(currency)
  const formatted = formatter.format(priceValue)
  return cadence ? `${formatted} · ${cadence}` : formatted
}

function getModulePriceSubtext(module) {
  if (!module) return 'Lifetime access for your family.'
  return module?.price_note || module?.price_subtext || 'One-time unlock with ongoing access & parent support.'
}

function buildModuleHighlights(module) {
  const highlights = []
  
  // Don't include short_description here - it's shown in the main text
  if (module?.category) {
    highlights.push(`${module.category} focus`)
  }
  if (module?.series) {
    highlights.push(`Part of ${module.series} collection`)
  }
  const ageRange = getSafeAgeRange(module)
  if (ageRange) {
    highlights.push(`Ages ${ageRange}`)
  }
  highlights.push('Includes parent coaching scripts')
  highlights.push('Real-life practice missions')
  highlights.push('Ongoing access & support')

  return highlights.slice(0, 4)
}

function updateMoreModulesButtonState() {
  if (!moreModulesButton) return
  moreModulesButton.textContent = 'More Modules →'
}

function createSalesSlideMarkup(module) {
  const priceLabel = getModulePriceLabel(module)
  const priceSubtext = getModulePriceSubtext(module)
  const highlights = buildModuleHighlights(module)
  const highlightItems = highlights.map(item => `<li><span>⭐</span>${item}</li>`).join('')
  const heroLabel = module?.series || module?.category || 'Featured'
  const description = module.long_description || module.short_description || 'Build emotional strength with guided stories, games, and parent scripts.'
  const ageRange = getSafeAgeRange(module)

  return `
    <div class="sales-card">
      <div class="sales-card-header">
        <div class="sales-badge">✨ ${heroLabel}</div>
        <h3 class="sales-title">${module.title}</h3>
        ${ageRange ? `<p class="sales-age">Perfect for ages ${ageRange}</p>` : ''}
        <p class="sales-description">${description}</p>
      </div>
      <div class="sales-card-body">
        <h4 style="font-size: 16px; color: var(--fm-text-primary); margin: 0 0 12px 0; font-weight: 700;">What's included:</h4>
        <ul class="sales-benefits">${highlightItems}</ul>
      </div>
      <div class="sales-card-footer">
        <div class="sales-pricing">
          <p class="sales-price">${priceLabel}<span style="font-size: 14px; font-weight: 600;">${module?.price_frequency ? '/' + module.price_frequency : ''}</span></p>
          <p class="sales-price-note">💎 ${priceSubtext}</p>
        </div>
        <button type="button" class="sales-cta">🚀 Unlock with 1 Credit</button>
      </div>
    </div>
  `
}

function renderMoreModulesCarousel() {
  if (!moreModulesCarousel || !moreModulesCarouselIndicators) return

  moreModulesCarousel.innerHTML = ''
  moreModulesCarouselIndicators.innerHTML = ''

  if (!state.lockedModulesShowcase || state.lockedModulesShowcase.length === 0) {
    moreModulesCarousel.innerHTML = `
      <div class="sales-slide active">
        <div class="sales-card">
          <div>
            <div class="sales-badge">🎉 Stay Tuned</div>
            <h3>All caught up!</h3>
            <p>Every workbook is active on your account. We’ll notify you the moment a new module is ready.</p>
          </div>
        </div>
      </div>
    `
    return
  }

  state.lockedModulesShowcase.forEach((module, index) => {
    const slide = document.createElement('div')
    slide.className = 'sales-slide'
    slide.dataset.index = index
    slide.innerHTML = createSalesSlideMarkup(module)

    // Set category color on the sales card
    const salesCard = slide.querySelector('.sales-card')
    if (salesCard && module.category) {
      const categoryColor = state.categoryColors[module.category] || '#4c6c96'
      salesCard.style.borderLeftColor = categoryColor
    }

    const cta = slide.querySelector('.sales-cta')
    if (cta) {
      cta.addEventListener('click', () => openPurchaseModal(module))
    }

    moreModulesCarousel.appendChild(slide)

    const indicator = document.createElement('button')
    indicator.type = 'button'
    indicator.addEventListener('click', () => {
      setMoreModulesActiveSlide(index)
      restartMoreModulesRotation()
    })
    moreModulesCarouselIndicators.appendChild(indicator)
  })

  setMoreModulesActiveSlide(state.moreModulesCurrentIndex)
}

function setMoreModulesActiveSlide(index) {
  if (!state.lockedModulesShowcase || state.lockedModulesShowcase.length === 0) return
  const total = state.lockedModulesShowcase.length
  setMoreModulesCurrentIndex(((index % total) + total) % total)

  const slides = Array.from(moreModulesCarousel?.querySelectorAll('.sales-slide') || [])
  const indicators = Array.from(moreModulesCarouselIndicators?.children || [])

  slides.forEach((slide, idx) => {
    slide.classList.toggle('active', idx === state.moreModulesCurrentIndex)
  })

  indicators.forEach((button, idx) => {
    button.classList.toggle('active', idx === state.moreModulesCurrentIndex)
  })
}

function shiftMoreModulesSlide(direction = 1) {
  if (!state.lockedModulesShowcase || state.lockedModulesShowcase.length === 0) return
  setMoreModulesActiveSlide(state.moreModulesCurrentIndex + direction)
}

function startMoreModulesRotation() {
  stopMoreModulesRotation()
  if (!state.lockedModulesShowcase || state.lockedModulesShowcase.length <= 1) return
  setMoreModulesRotationTimer(setInterval(() => {
    shiftMoreModulesSlide(1)
  }, 6000))
}

function restartMoreModulesRotation() {
  startMoreModulesRotation()
}

function stopMoreModulesRotation() {
  if (state.moreModulesRotationTimer) {
    clearInterval(state.moreModulesRotationTimer)
    setMoreModulesRotationTimer(null)
  }
}

function populateAllModulesFilters() {
  if (!state.modules || state.modules.length === 0) return
  if (!allModulesCategoryFilter || !allModulesSeriesFilter) return

  const categories = new Set()
  const seriesValues = new Set()

  state.modules.forEach(module => {
    if (module?.category) {
      categories.add(module.category.trim())
    }
    if (module?.series) {
      seriesValues.add(module.series.trim())
    }
  })

  setFilterOptions(allModulesCategoryFilter, Array.from(categories).sort(), 'All categories', state.allModulesFilters.category)
  setFilterOptions(allModulesSeriesFilter, Array.from(seriesValues).sort(), 'All series', state.allModulesFilters.series)
}

function setFilterOptions(selectEl, values, defaultLabel, selectedValue) {
  if (!selectEl) return
  const fragment = document.createDocumentFragment()
  const defaultOption = document.createElement('option')
  defaultOption.value = 'all'
  defaultOption.textContent = defaultLabel
  fragment.appendChild(defaultOption)

  values.forEach(value => {
    const option = document.createElement('option')
    option.value = value
    option.textContent = value
    fragment.appendChild(option)
  })

  selectEl.innerHTML = ''
  selectEl.appendChild(fragment)

  const normalizedSelected = selectedValue && (selectedValue === 'all' || values.includes(selectedValue))
    ? selectedValue
    : 'all'
  selectEl.value = normalizedSelected

  if (selectEl === allModulesCategoryFilter) {
    setAllModulesFilters({ category: normalizedSelected })
  }
  if (selectEl === allModulesSeriesFilter) {
    setAllModulesFilters({ series: normalizedSelected })
  }
}

function renderAllModulesGrid() {
  if (!allModulesGrid) return

  if (!state.modules || state.modules.length === 0) {
    allModulesGrid.innerHTML = '<p class="all-modules-empty">No modules available yet. Please check back soon.</p>'
    return
  }

  const filtered = state.modules.filter(module => {
    const matchesCategory = state.allModulesFilters.category === 'all' || module.category === state.allModulesFilters.category
    const matchesSeries = state.allModulesFilters.series === 'all' || module.series === state.allModulesFilters.series
    return matchesCategory && matchesSeries
  })

  if (filtered.length === 0) {
    allModulesGrid.innerHTML = '<p class="all-modules-empty">No modules match your filters. Try a different category or series.</p>'
    return
  }

  allModulesGrid.innerHTML = ''
  filtered.forEach(module => {
    const card = document.createElement('div')
    card.innerHTML = createAllModulesCard(module)
    
    // Set category color on the all-module card
    const moduleCard = card.querySelector('.all-module-card')
    if (moduleCard && module.category) {
      const categoryColor = state.categoryColors[module.category] || '#4c6c96'
      moduleCard.style.borderLeftColor = categoryColor
    }
    
    const cta = card.querySelector('.sales-cta')
    if (cta) {
      cta.addEventListener('click', () => {
        openPurchaseModal(module)
      })
    }
    allModulesGrid.appendChild(card.firstElementChild)
  })
}

function createAllModulesCard(module) {
  const highlights = buildModuleHighlights(module).slice(0, 3) // Show fewer in grid view
  const highlightItems = highlights.map(item => `<li><span>⭐</span>${item}</li>`).join('')
  const priceLabel = getModulePriceLabel(module)
  const priceSubtext = getModulePriceSubtext(module)
  const heroLabel = module?.series || module?.category || 'Featured'
  const description = module.long_description || module.short_description || 'Build emotional strength with guided stories, games, and parent scripts.'
  // Truncate description for grid view
  const shortDesc = description.length > 100 ? description.substring(0, 100) + '...' : description
  const ageRange = getSafeAgeRange(module)

  return `
    <div class="all-module-card">
      <div class="all-module-card__header">
        <span class="module-tag">✨ ${heroLabel}</span>
        ${module?.category && module?.category !== heroLabel ? `<span class="module-tag module-tag--soft">${module.category}</span>` : ''}
      </div>
      <h3>${module.title}</h3>
      ${ageRange ? `<p class="module-age">Ages ${ageRange}</p>` : ''}
      <p class="module-description">${shortDesc}</p>
      <ul class="module-benefits">${highlightItems}</ul>
      <div class="all-module-card__footer">
        <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
          <p class="sales-price" style="margin: 0;">${priceLabel}</p>
          <p class="module-price-subtext" style="margin: 0;">${module?.price_frequency || ''}</p>
        </div>
        <button type="button" class="sales-cta">Unlock (1 credit) →</button>
      </div>
    </div>
  `
}

function openAllModulesModal() {
  if (!allModulesModal) return
  populateAllModulesFilters()
  renderAllModulesGrid()
  showElement(allModulesModal)
  document.body.style.overflow = 'hidden'
}

function closeAllModulesModal() {
  if (!allModulesModal) return
  hideElement(allModulesModal)
  document.body.style.overflow = ''
}

function openMoreModulesModal() {
  if (!moreModulesModal) return
  showElement(moreModulesModal)
  document.body.style.overflow = 'hidden'
  setMoreModulesActiveSlide(state.moreModulesCurrentIndex)
  startMoreModulesRotation()
}

function closeMoreModulesModal() {
  if (!moreModulesModal) return
  hideElement(moreModulesModal)
  document.body.style.overflow = ''
  stopMoreModulesRotation()
}

loadCheckinOptions().then(() => {
  setupWeeklyCheckinUI()
})
setupParentInsightsSubtabs()
checkWeeklyCheckinSettings()

function setupWeeklyCheckinUI() {
  if (!weeklyCheckinForm) return

  renderParentScriptsList()
  renderTriggerPicker()
  attachIntensityHandlers()

  weeklyCheckinForm.addEventListener('submit', handleWeeklyCheckinSubmit)
}

function setupParentInsightsSubtabs() {
  if (!insightsOverviewTab || !weeklyCheckinTab || !insightsOverviewPanel || !weeklyCheckinPanel) return

  insightsOverviewTab.addEventListener('click', () => setParentInsightsSubtab('overview'))
  weeklyCheckinTab.addEventListener('click', () => setParentInsightsSubtab('weekly'))

  setParentInsightsSubtab(state.currentInsightsSubtab)
}

function setParentInsightsSubtab(target) {
  if (!insightsOverviewTab || !weeklyCheckinTab || !insightsOverviewPanel || !weeklyCheckinPanel) return

  setCurrentInsightsSubtab(target === 'weekly' ? 'weekly' : 'overview')
  const showOverview = state.currentInsightsSubtab === 'overview'

  insightsOverviewTab.classList.toggle('active', showOverview)
  weeklyCheckinTab.classList.toggle('active', !showOverview)
  if (showOverview) {
    showElement(insightsOverviewPanel)
    hideElement(weeklyCheckinPanel)
  } else {
    hideElement(insightsOverviewPanel)
    showElement(weeklyCheckinPanel)
  }
}

async function checkWeeklyCheckinSettings() {
  try {
    const settings = await getSettings()
    
    // Hide the Weekly Check-In tab if disabled
    if (weeklyCheckinTab && settings.weekly_checkin_enabled === false) {
      weeklyCheckinTab.style.display = 'none'
      
      // If currently on weekly tab, switch to overview
      if (state.currentInsightsSubtab === 'weekly') {
        setParentInsightsSubtab('overview')
      }
    } else if (weeklyCheckinTab) {
      weeklyCheckinTab.style.display = ''
    }
  } catch (error) {
    console.error('Error checking weekly check-in settings:', error)
    // On error, show the tab by default
    if (weeklyCheckinTab) {
      weeklyCheckinTab.style.display = ''
    }
  }
}

function renderTriggerPicker() {
  if (!checkinTriggersContainer) return
  checkinTriggersContainer.innerHTML = ''

  triggerOptions.forEach(trigger => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'trigger-chip'
    btn.textContent = trigger
    btn.addEventListener('click', () => {
      if (selectedTriggers.has(trigger)) {
        selectedTriggers.delete(trigger)
        btn.classList.remove('selected')
      } else {
        selectedTriggers.add(trigger)
        btn.classList.add('selected')
      }
    })
    checkinTriggersContainer.appendChild(btn)
  })
}

function attachIntensityHandlers() {
  const scaleButtons = document.querySelectorAll('.checkin-scale')
  if (!scaleButtons || scaleButtons.length === 0) return

  scaleButtons.forEach(button => {
    button.addEventListener('click', () => {
      clearIntensityButtonClasses()
      button.classList.add('selected')
      const value = Number(button.getAttribute('data-value'))
      const scaleClass = getIntensityClass(value)
      if (scaleClass) {
        button.classList.add(scaleClass)
      }
      if (checkinIntensityInput) {
        checkinIntensityInput.value = value
      }
    })
  })
}

function clearIntensityButtonClasses() {
  document.querySelectorAll('.checkin-scale').forEach(btn => {
    btn.classList.remove('selected', 'scale-low', 'scale-medium', 'scale-high')
  })
}

function getIntensityClass(value) {
  if (!value) return ''
  if (value < 3) return 'scale-low'
  if (value === 3) return 'scale-medium'
  return 'scale-high'
}

async function handleWeeklyCheckinSubmit(e) {
  e.preventDefault()

  if (!state.selectedChild || !state.currentUser) {
    showCheckinMessage('Select a child before submitting a check-in.', 'error')
    return
  }

  const intensity = Number(checkinIntensityInput?.value)
  const challenge = checkinChallengeSelect?.value || ''
  const goal = checkinGoalSelect?.value || ''
  const notes = (checkinNotesInput?.value || '').trim()

  if (!intensity) {
    showCheckinMessage('Please tap a number for "How big were the big feelings?"', 'error')
    return
  }

  if (!challenge) {
    showCheckinMessage('Please choose the hardest moment to manage.', 'error')
    return
  }

  setCheckinLoading(true)

  const triggersArray = selectedTriggers.size > 0
    ? Array.from(selectedTriggers)
    : (challengeToDefaultTriggers[challenge] || ['Anger'])

  const planPayload = generateWeeklyPlan({
    intensity,
    challenge,
    triggers: triggersArray,
    goal,
    notes
  })

  try {
    const saved = await saveWeeklyCheckin({
      parentUserId: state.currentUser.id,
      childId: state.selectedChild.id,
      intensity,
      challenge,
      triggers: triggersArray,
      goal: goal || null,
      notes: notes || null,
      generatedPlan: planPayload
    })

    setCurrentWeeklyPlan(saved?.generated_plan || planPayload)
    weeklyCheckinForm.reset()
    selectedTriggers.clear()
    renderTriggerPicker()
    checkinIntensityInput.value = ''
    clearIntensityButtonClasses()

    renderWeeklyPlan(state.currentWeeklyPlan)
    updateParentInsights()
    showCheckinMessage('Plan saved! You can view it on the right.', 'success')
  } catch (error) {
    console.error('Weekly check-in save failed:', error)
    showCheckinMessage(error.message || 'Failed to save check-in. Please try again.', 'error')
  } finally {
    setCheckinLoading(false)
  }
}

function generateWeeklyPlan({ intensity, challenge, triggers, goal, notes }) {
  const uniqueTriggers = Array.from(new Set(triggers))
  const skillSet = new Set()
  uniqueTriggers.forEach(trigger => {
    (triggerToSkills[trigger] || []).forEach(skill => skillSet.add(skill))
  })
  if (skillSet.size === 0) {
    skillSet.add('Emotional Identification')
  }

  const tools = planToolsLibrary.filter(tool =>
    tool.triggers.some(trigger => uniqueTriggers.includes(trigger))
  )

  const planTools = tools.length > 0 ? tools.slice(0, 3) : planToolsLibrary.slice(0, 2)

  const script = parentScriptsSeed.find(item =>
    item.feelings.some(feeling => uniqueTriggers.includes(feeling))
  ) || parentScriptsSeed[0]

  const summary = `This week felt ${intensityLabels[intensity] || 'mixed'} during ${challenge.toLowerCase()}. Focus on ${goal || 'one calm habit'} while supporting ${uniqueTriggers.join(', ')}.`

  return {
    intensity,
    challenge,
    triggers: uniqueTriggers,
    goal: goal || null,
    notes: notes || null,
    skills: Array.from(skillSet),
    tools: planTools,
    script,
    summary
  }
}

async function loadLatestWeeklyPlan() {
  if (!state.currentUser || !state.selectedChild) return
  try {
    const latest = await getLatestWeeklyPlan(state.currentUser.id, state.selectedChild.id)
    setCurrentWeeklyPlan(latest?.generated_plan || null)
    renderWeeklyPlan(state.currentWeeklyPlan)
  } catch (error) {
    console.error('Failed to load weekly plan:', error)
  }
}

function renderWeeklyPlan(plan) {
  if (!weeklyPlanSummary || !planSkillsEl || !planEmotionsEl || !planToolsEl || !planScriptEl) return

  // Get the parent container for animation
  const planContainer = weeklyPlanSummary.closest('.insights-panel') || weeklyPlanSummary.parentElement

  if (!plan) {
    weeklyPlanSummary.innerHTML = '<p style="margin:4px 0; color:#9ca3af;">Complete a quick check-in to generate a tailored plan.</p>'
    planSkillsEl.innerHTML = ''
    planEmotionsEl.innerHTML = ''
    planToolsEl.innerHTML = ''
    planScriptEl.innerHTML = '<p style="margin:0; color:#9ca3af;">We\'ll surface a script once a plan is created.</p>'
    return
  }

  // Add loading state with animation
  if (planContainer) {
    planContainer.style.opacity = '0.5'
    planContainer.style.transform = 'scale(0.98)'
    planContainer.style.transition = 'all 0.3s ease'
  }

  // Simulate brief loading for better UX
  setTimeout(() => {
    const intensityText = intensityLabels[plan.intensity] || 'This week'
    weeklyPlanSummary.innerHTML = `
      <p style="margin:4px 0;">${intensityText} • toughest moment: <strong>${plan.challenge}</strong></p>
      ${plan.goal ? `<p style="margin:4px 0;">Goal: ${plan.goal}</p>` : ''}
      ${plan.summary ? `<p style="margin:4px 0; color:#4b5563;">${plan.summary}</p>` : ''}
    `

    planSkillsEl.innerHTML = renderPlanChips(plan.skills, 'No skills yet')
    planEmotionsEl.innerHTML = renderPlanChips(plan.triggers, 'No focus feelings yet')
    planToolsEl.innerHTML = (plan.tools && plan.tools.length > 0) ? plan.tools.map(tool => `
      <div class="plan-tool-card">
        <h5>${tool.label}</h5>
        <p>${tool.description}</p>
        <span>Helps with: ${tool.triggers?.join(', ') || ''}</span>
      </div>
    `).join('') : '<p style="color:#9ca3af;">No tools suggested yet.</p>'

    if (plan.script) {
      planScriptEl.innerHTML = `
        <p style="margin:0 0 6px; font-weight:600;">${plan.script.title}</p>
        <p style="margin:0 0 8px; color:#4b5563;">${plan.script.script}</p>
        <small>${plan.script.context}</small>
      `
    }

    // Animate back in with a subtle pulse
    if (planContainer) {
      planContainer.style.opacity = '1'
      planContainer.style.transform = 'scale(1)'
      
      // Add a subtle highlight effect
      planContainer.style.boxShadow = '0 0 0 3px rgba(76, 108, 150, 0.2)'
      setTimeout(() => {
        planContainer.style.boxShadow = ''
        planContainer.style.transition = ''
      }, 600)
    }
  }, 400)
}

function renderPlanChips(items = [], emptyText = '') {
  if (!items || items.length === 0) {
    return emptyText ? `<p style="color:#9ca3af;">${emptyText}</p>` : ''
  }
  return items.map(item => `<span class="plan-chip">${item}</span>`).join('')
}

function renderParentScriptsList() {
  if (!parentScriptsList) return
  parentScriptsList.innerHTML = parentScriptsSeed.map(script => `
    <div class="script-card">
      <h4>${script.title}</h4>
      <p>${script.script}</p>
      <small>${script.context}</small>
    </div>
  `).join('')
}

function showCheckinMessage(message, type = 'success') {
  if (!checkinMessage) return
  checkinMessage.textContent = message
  checkinMessage.style.display = 'block'
  checkinMessage.style.color = type === 'success' ? '#198754' : '#c02626'
}

function setCheckinLoading(isLoading) {
  if (!checkinSubmitButton) return
  setLoadingState(checkinSubmitButton, checkinSubmitText, checkinSubmitSpinner, isLoading)
}

const triggerToSkills = {
  Anger: ['Calming Strategies', 'Emotional Identification'],
  Overwhelm: ['Calming Strategies', 'Problem Solving'],
  'Worry/Anxiety': ['Calming Strategies', 'Confidence / Self-belief', 'Problem Solving'],
  Sadness: ['Emotional Identification', 'Problem Solving'],
  Frustration: ['Problem Solving', 'Calming Strategies']
}

const challengeToDefaultTriggers = {
  'Morning routine': ['Frustration', 'Overwhelm'],
  'School refusal / drop-off': ['Worry/Anxiety', 'Overwhelm'],
  'Homework / focus': ['Frustration', 'Worry/Anxiety'],
  Bedtime: ['Overwhelm', 'Worry/Anxiety'],
  'Sibling conflict': ['Anger', 'Frustration'],
  'Social worries': ['Worry/Anxiety', 'Sadness'],
  'Anger outbursts': ['Anger', 'Frustration'],
  'Sensory overwhelm': ['Overwhelm'],
  Other: ['Anger']
}

const planToolsLibrary = [
  {
    id: 'volcano_scale',
    label: 'Volcano Scale (1–5)',
    description: 'Rate the feeling, then choose one action to lower it by one point.',
    triggers: ['Anger', 'Frustration'],
    skills: ['Calming Strategies', 'Emotional Identification']
  },
  {
    id: 'belly_breathing',
    label: 'Belly Breathing (3 breaths)',
    description: 'Hands on belly, slow breaths to calm body signals.',
    triggers: ['Overwhelm', 'Worry/Anxiety'],
    skills: ['Calming Strategies']
  },
  {
    id: 'grounding_54321',
    label: '5-4-3-2-1 Grounding',
    description: 'Use senses to anchor back into the present moment.',
    triggers: ['Overwhelm', 'Worry/Anxiety'],
    skills: ['Calming Strategies']
  },
  {
    id: 'thought_bubble',
    label: 'Thought Bubble',
    description: 'Name what the brain is saying so you can respond to it.',
    triggers: ['Worry/Anxiety', 'Sadness'],
    skills: ['Problem Solving', 'Emotional Identification']
  },
  {
    id: 'brave_ladder',
    label: 'Brave Ladder',
    description: 'Break big scary things into tiny brave steps.',
    triggers: ['Worry/Anxiety'],
    skills: ['Confidence / Self-belief']
  },
  {
    id: 'fix_accept',
    label: 'Fix-It / Accept-It Choices',
    description: 'Decide if this problem can be fixed or if we ride it out.',
    triggers: ['Frustration', 'Overwhelm'],
    skills: ['Problem Solving']
  },
  {
    id: 'friend_phrase',
    label: 'Friendship “Try this phrase”',
    description: 'Offer wording your child can borrow in social moments.',
    triggers: ['Social worries', 'Sadness'],
    skills: ['Social Skills']
  }
]

// Tab elements
const tabDashboard = document.getElementById('tabDashboard')
const tabModules = document.getElementById('tabModules')
const tabLeaderboard = document.getElementById('tabLeaderboard')
const tabSpendStars = document.getElementById('tabSpendStars')
const tabParentInsights = document.getElementById('tabParentInsights')
const dashboardTabContent = document.getElementById('dashboardTabContent')
const modulesTabContent = document.getElementById('modulesTabContent')
const leaderboardTabContent = document.getElementById('leaderboardTabContent')
const spendStarsTabContent = document.getElementById('spendStarsTabContent')
const parentInsightsTabContent = document.getElementById('parentInsightsTabContent')
const leaderboardList = document.getElementById('leaderboardList')

// Initialize - OPTIMIZED for performance
async function init() {
  if (renderDevSetupMessage('dashboardRoot')) return
  // Show fun loading screen
  showLoadingScreen()
  
  // Reduced timeout - 6 seconds should be enough
  const loadingTimeout = setTimeout(() => {
    console.warn('Loading timeout reached - forcing UI to show')
    hideLoadingScreen()
    showElement(childrenView)
  }, 6000)
  
  try {
    // Check authentication first (required before anything else)
    const session = await checkAuth()
    
    if (!session) {
      clearTimeout(loadingTimeout)
      window.location.href = '/'
      return
    }
    
    // Get current user
    setCurrentUser(await getCurrentUser())
    window.state.currentUser = state.currentUser
    
    if (state.currentUser && state.currentUser.email) {
      headerSubtitle.textContent = `Welcome back, ${state.currentUser.email}!`
    }
    
    // PARALLEL LOADING - Load all independent data at once
    currentBillingPeriod = getCurrentBillingPeriod()

    const [
      modulesResult,
      parentModulesResult,
      creditUnlocksResult,
      creditSummaryResult,
      categoryColorsResult,
      childrenResult,
      adminResult,
      subscriptionResult,
      tiersResult
    ] = await Promise.allSettled([
      // Load modules
      getModules(),
      // Load legacy parent modules with full module data
      supabase
        .from('parent_modules')
        .select('module_id, is_active, modules(*)')
        .eq('parent_id', state.currentUser.id),
      // Load subscription-credit unlocks for current month
      getModuleUnlocks(state.currentUser.id, currentBillingPeriod.periodStart, currentBillingPeriod.periodEnd),
      // Load current wallet summary
      getCreditSummary(state.currentUser.id, currentBillingPeriod.periodStart, currentBillingPeriod.periodEnd),
      // Load category colors
      supabase
        .from('category_colors')
        .select('*'),
      // Load children
      getChildren(state.currentUser.id),
      // Check admin status (non-blocking)
      isUserAdmin(state.currentUser.id),
      // Load subscription details for credit messaging
      getParentSubscription(state.currentUser.id),
      getSubscriptionTiers()
    ])
    
    // Process modules
    if (modulesResult.status === 'fulfilled') {
      setModules(modulesResult.value || [])
    } else {
      console.error('Error loading modules:', modulesResult.reason)
      setModules([])
    }
    
    // Process parent modules and merge subscription-credit unlocks
    const legacyParentModules = parentModulesResult.status === 'fulfilled' && parentModulesResult.value.data
      ? parentModulesResult.value.data
      : []

    if (parentModulesResult.status !== 'fulfilled') {
      console.error('Error loading parent modules:', parentModulesResult.reason)
    }

    const creditUnlocks = creditUnlocksResult.status === 'fulfilled'
      ? (creditUnlocksResult.value || []).map(entry => ({
          module_id: entry.module_id,
          is_active: true,
          modules: entry.modules || null,
          unlock_source: entry.unlock_source || 'subscription_credit'
        }))
      : []

    if (creditUnlocksResult.status !== 'fulfilled') {
      console.error('Error loading credit unlocks:', creditUnlocksResult.reason)
    }

    const mergedParentModulesMap = new Map()
    ;[...legacyParentModules, ...creditUnlocks].forEach(entry => {
      const existing = mergedParentModulesMap.get(entry.module_id)
      if (!existing || (entry.is_active && !existing.is_active)) {
        mergedParentModulesMap.set(entry.module_id, entry)
      }
    })
    setParentModules(Array.from(mergedParentModulesMap.values()))

    currentCreditSummary = creditSummaryResult.status === 'fulfilled' ? creditSummaryResult.value : null
    currentSubscription = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null
    subscriptionTiers = tiersResult.status === 'fulfilled' ? (tiersResult.value || []) : []
    updateCreditWalletBadge()
    
    // Process category colors
    if (categoryColorsResult.status === 'fulfilled' && categoryColorsResult.value.data) {
      const colors = {}
      categoryColorsResult.value.data.forEach(cc => {
        if (cc?.category && cc?.color) {
          colors[cc.category] = cc.color
        }
      })
      setCategoryColors(colors)
    } else {
      setCategoryColors({})
    }
    
    // Process children
    if (childrenResult.status === 'fulfilled') {
      setChildren(childrenResult.value || [])
    } else {
      console.error('Error loading children:', childrenResult.reason)
      setChildren([])
    }
    
    // Process admin status (non-critical)
    if (adminResult.status === 'fulfilled') {
      setIsCurrentUserAdmin(adminResult.value || false)
      if (state.isCurrentUserAdmin) {
        const adminButton = document.getElementById('adminButton')
        const adminButtonDesktop = document.getElementById('adminButtonDesktop')
        if (adminButton) adminButton.style.display = 'block'
        if (adminButtonDesktop) showElement(adminButtonDesktop)
      }
    }
    
    // Update global variables for enhanced dashboard
    window.modules = state.modules
    setAppState('modules', state.modules)
    window.parentModules = state.parentModules
    
    // Setup category colors (use defaults if none loaded)
    setupCategoryColors()
    
    // Setup filters (batch DOM operations)
    requestAnimationFrame(() => {
      setupAllWorkbooksFilter()
      setupDashboardFilters()
      renderChildren()
    })

    // Check URL for a childId to auto-select (coming back from a module)
    const params = new URLSearchParams(window.location.search)
    const childIdFromUrl = params.get('childId')
    const tabFromUrl = params.get('tab')

    if (childIdFromUrl && state.children && state.children.length > 0) {
      const childFromUrl = state.children.find(c => String(c.id) === String(childIdFromUrl))
      if (childFromUrl) {
        // Skip password check when returning from module (already authenticated)
        // selectChild now waits for the map to render before hiding the loading screen
        await selectChild(childFromUrl)
        
        // Switch to specific tab if requested
        if (tabFromUrl) {
          showTab(tabFromUrl)
        }
        
        clearTimeout(loadingTimeout)
        return
      }
    }

    // Default: show children/profile view
    showChildrenView()
    hideLoadingScreen()
    clearTimeout(loadingTimeout)
    
  } catch (error) {
    console.error('Initialization error:', error)
    console.error('Error stack:', error.stack)
    clearTimeout(loadingTimeout)
    // Show children view anyway so user isn't stuck
    try {
      showChildrenView()
      hideLoadingScreen()
    } catch (e) {
      console.error('Error showing children view:', e)
      // Force hide loading state
      hideLoadingScreen()
      if (childrenView) {
        showElement(childrenView)
      }
    }
    alert('Some data failed to load. You can still add children and use the app.')
  }
}

// Credit unlock modal helpers
function openPurchaseModal(module) {
  if (!purchaseModal || !purchaseModalTitle || !purchaseModalBody || !purchaseModalCost) return

  if (!isModuleNextUnlockable(module)) {
    showUnlockResultModal({
      title: 'Almost there!',
      message: "Let's unlock this path one step at a time. Try the first locked module.",
      type: 'error'
    })
    return
  }

  setCurrentPurchaseModule(module)

  purchaseModalTitle.textContent = `Unlock Module: ${module.title}`

  const safeAgeRange = getSafeAgeRange(module)
  const ageRange = safeAgeRange ? `Ages ${safeAgeRange}. ` : ''
  const description = module.short_description || 'This workbook helps support your child with emotional regulation and practical activities.'
  const walletValue = currentCreditSummary?.credits_available ?? 0
  const tierConfig = subscriptionTiers.find((tier) => tier.tier === currentSubscription?.tier)
  const tierCreditCount = tierConfig?.modules_per_month ?? null
  const nextCreditDate = getNextCreditRefreshDateLabel()

  if (walletValue > 0) {
    purchaseModalBody.innerHTML = `
      <span>${ageRange}${description}</span>
      <span style="display:block; margin-top: 10px; color: #2e7d32; font-size: 13px;">Spend 1 credit to unlock this workbook for your family.</span>
      <span style="display:block; margin-top: 6px; color: #4c6c96; font-size: 13px;">Credits available right now: ${walletValue}</span>
    `
    if (confirmPurchaseButton) {
      confirmPurchaseButton.disabled = false
      confirmPurchaseButton.textContent = 'Spend 1 Credit'
    }
  } else {
    const renewalLine = nextCreditDate
      ? `Your next refill is on <strong>${nextCreditDate}</strong>.`
      : 'Your next refill date will appear once your subscription is active.'
    const tierLine = tierCreditCount !== null
      ? `You'll receive <strong>${tierCreditCount}</strong> new credits for that billing period.`
      : 'Your monthly credit amount will appear once a tier is selected.'

    purchaseModalBody.innerHTML = `
      <span>${ageRange}${description}</span>
      <span style="display:block; margin-top: 10px; color: #b45309; font-size: 13px;">You do not have any credits available right now.</span>
      <span style="display:block; margin-top: 6px; color: #4c6c96; font-size: 13px;">${renewalLine}</span>
      <span style="display:block; margin-top: 6px; color: #4c6c96; font-size: 13px;">${tierLine}</span>
      <span style="display:block; margin-top: 8px; color: #4c6c96; font-size: 13px;">Review your unlocked modules anytime from the dashboard and billing pages.</span>
    `

    if (confirmPurchaseButton) {
      confirmPurchaseButton.disabled = true
      confirmPurchaseButton.textContent = 'No Credits Available'
    }
  }

  purchaseModalCost.textContent = 'Unlock cost: 1 credit'

  showElement(purchaseModal)
}

window.openPurchaseModal = openPurchaseModal

function closePurchaseModal() {
  if (!purchaseModal) return
  setCurrentPurchaseModule(null)
  if (confirmPurchaseButton) {
    confirmPurchaseButton.disabled = false
    confirmPurchaseButton.textContent = 'Spend 1 Credit'
  }
  hideElement(purchaseModal)
}

function showUnlockResultModal({ title, message, type = 'success' }) {
  if (!unlockResultModal || !unlockResultTitle || !unlockResultMessage || !unlockResultIcon) return

  unlockResultTitle.textContent = title
  unlockResultMessage.textContent = message

  unlockResultIcon.classList.remove('success', 'error')
  if (type === 'error') {
    unlockResultIcon.classList.add('error')
    unlockResultIcon.textContent = '⚠️'
  } else {
    unlockResultIcon.classList.add('success')
    unlockResultIcon.textContent = '🎉'
  }

  showElement(unlockResultModal)
}

window.showUnlockResultModal = showUnlockResultModal

function getNextCreditRefreshDateLabel() {
  if (!currentSubscription?.current_period_end) return null
  const nextDate = new Date(`${currentSubscription.current_period_end}T00:00:00Z`)
  nextDate.setUTCDate(nextDate.getUTCDate() + 1)
  return nextDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function updateCreditWalletBadge() {
  if (!creditWalletValue) return
  const creditsAvailable = currentCreditSummary?.credits_available ?? 0
  creditWalletValue.textContent = String(creditsAvailable)
  if (creditWalletBadge) {
    creditWalletBadge.classList.toggle('credit-wallet--empty', creditsAvailable <= 0)
  }
}

// Load children
async function loadChildren() {
  try {
    setChildren(await getChildren(state.currentUser.id))
    renderChildren()
  } catch (error) {
    console.error('Error loading children:', error)
    // Show children view anyway so user can add a child
    setChildren([])
    renderChildren()
  }
}

// Render children
function renderChildren() {
  const loadingState = document.getElementById('loadingState')
  
  if (loadingState) hideElement(loadingState)
  
  childrenGrid.innerHTML = ''
  
  // Render each child
  state.children.forEach(child => {
    const childCard = createChildCard(child)
    childrenGrid.appendChild(childCard)
  })
}

// Create child card
function createChildCard(child) {
  const card = document.createElement('div')
  card.className = 'child-card'

  // Use custom avatar if set, otherwise use deterministic avatar
  let avatar = child.avatar
  if (!avatar) {
    // Deterministic avatar emoji based on child id/name so it stays consistent
    const avatars = ['👦', '👧', '🧒', '👶', '🧑']
    const key = (child.id || child.name || '').toString()
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0
    }
    avatar = avatars[hash % avatars.length]
  }

  card.innerHTML = `
    <button class="child-card-edit-btn" type="button" title="Edit child">✏️</button>
    <div class="child-avatar">${avatar}</div>
    <div class="child-name">${child.name}</div>
    <div class="child-stars">
      <span>⭐</span>
      <span>${child.stars || 0}</span>
    </div>
  `
  
  // Add click handler for edit button
  const editBtn = card.querySelector('.child-card-edit-btn')
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    promptEditChild(child)
  })
  
  card.addEventListener('click', async () => {
    // Show loading state
    showLoadingScreen()
    
    try {
      await selectChild(child)
    } catch (error) {
      console.error('Error selecting child:', error)
      hideLoadingScreen()
      alert('Failed to load child dashboard. Please try again.')
    }
  })
  
  return card
}

// Render avatar picker
function renderAvatarPicker(selectedAvatar, pickerElement, hiddenInputElement) {
  if (!pickerElement) return
  
  pickerElement.innerHTML = ''
  
  avatarOptions.forEach(emoji => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'avatar-option'
    if (selectedAvatar === emoji) {
      button.classList.add('selected')
    }
    button.textContent = emoji
    button.addEventListener('click', () => {
      if (selectedTriggers.has(emoji)) {
        selectedTriggers.delete(emoji)
        button.classList.remove('selected')
      } else {
        selectedTriggers.add(emoji)
        button.classList.add('selected')
      }
      if (hiddenInputElement) {
        hiddenInputElement.value = emoji
      }
    })
    pickerElement.appendChild(button)
  })
}

function getEnhancedEditModalHTML() {
    return `
    <div class="modal-header-fun">
        <button type="button" class="close-btn-fun" id="closeEditModalBtn">✕</button>
        <div class="header-sparkles">
            <span class="header-sparkle">✨</span>
            <span class="header-sparkle">⭐</span>
            <span class="header-sparkle">💫</span>
            <span class="header-sparkle">🌟</span>
        </div>
        <h2 class="modal-title-fun">Edit Your Profile!</h2>
        <p class="modal-subtitle-fun">Make it totally YOU! 🎨</p>
        
        <div class="avatar-preview-wrapper">
            <div class="avatar-preview-circle" id="avatarPreviewCircle">🦊</div>
        </div>
    </div>

    <div class="modal-body-fun">
        <div id="editModalError" class="error-message hidden"></div>
        
        <form id="editChildForm">
            <div class="form-group-fun">
                <label class="form-label-fun">
                    <span class="form-label-icon">📝</span>
                    What's Your Name?
                </label>
                <input type="text" id="editChildName" class="form-input-fun" placeholder="Type your awesome name..." required>
            </div>

            <div class="avatar-section-fun" id="avatarSectionFun">
                <h3 class="avatar-section-title"><span>🎭</span> Pick Your Avatar!</h3>
                <p class="avatar-section-subtitle">Choose a cool character to represent you</p>

                <div class="avatar-category">
                    <div class="avatar-category-label"><span>🐾</span> Cool Animals</div>
                    <div class="avatar-picker-fun" id="avatarPickerAnimals"></div>
                </div>

                <div class="avatar-category">
                    <div class="avatar-category-label"><span>✨</span> Magical Creatures</div>
                    <div class="avatar-picker-fun" id="avatarPickerMagical"></div>
                </div>

                <div class="avatar-category">
                    <div class="avatar-category-label"><span>🦸</span> Super Heroes</div>
                    <div class="avatar-picker-fun" id="avatarPickerHeroes"></div>
                </div>

                <div class="avatar-category">
                    <div class="avatar-category-label"><span>🚀</span> Space & Adventure</div>
                    <div class="avatar-picker-fun" id="avatarPickerSpace"></div>
                </div>

                <input type="hidden" id="editChildAvatar">
            </div>

            <div class="password-section-fun">
                <button type="button" class="password-btn-fun" id="forgetPasswordBtn">
                    <span>🔐</span> Reset Secret Password
                </button>
            </div>

            <div class="modal-buttons-fun">
                <button type="button" class="btn-fun btn-secondary-fun" id="cancelEditChildButton">Maybe Later</button>
                <button type="submit" class="btn-fun btn-primary-fun"><span>✨</span> Save Changes!</button>
            </div>

            <div class="remove-section-fun">
                <button type="button" class="btn-remove-fun" id="removeChildBtn"><span>🗑️</span> Remove Profile</button>
            </div>
        </form>
    </div>
    `;
}

// HTML for ADD Child Modal  
function getEnhancedAddModalHTML() {
    return `
    <div class="modal-header-fun">
        <button type="button" class="close-btn-fun" id="closeAddModalBtn">✕</button>
        <div class="header-sparkles">
            <span class="header-sparkle">✨</span>
            <span class="header-sparkle">⭐</span>
            <span class="header-sparkle">💫</span>
            <span class="header-sparkle">🌟</span>
        </div>
        <h2 class="modal-title-fun">Add New Explorer!</h2>
        <p class="modal-subtitle-fun">Let's create a profile! 🚀</p>
        
        <div class="avatar-preview-wrapper">
            <div class="avatar-preview-circle" id="addAvatarPreviewCircle">🦊</div>
        </div>
    </div>

    <div class="modal-body-fun">
        <div id="modalError" class="error-message hidden"></div>
        
        <form id="addChildForm">
            <div class="form-group-fun">
                <label class="form-label-fun">
                    <span class="form-label-icon">📝</span>
                    What's Their Name?
                </label>
                <input type="text" id="childName" class="form-input-fun" placeholder="Type their awesome name..." required>
            </div>

            <div class="form-group-fun">
                <label class="form-label-fun">
                    <span class="form-label-icon">🎂</span>
                    Date of Birth
                </label>
                <input type="date" id="childDob" class="form-input-fun" required>
            </div>

            <div class="avatar-section-fun" id="addAvatarSectionFun">
                <h3 class="avatar-section-title"><span>🎭</span> Pick Their Avatar!</h3>
                <p class="avatar-section-subtitle">Choose a cool character to represent them</p>

                <div class="avatar-category">
                    <div class="avatar-category-label"><span>🐾</span> Cool Animals</div>
                    <div class="avatar-picker-fun" id="addAvatarPickerAnimals"></div>
                </div>

                <div class="avatar-category">
                    <div class="avatar-category-label"><span>✨</span> Magical Creatures</div>
                    <div class="avatar-picker-fun" id="addAvatarPickerMagical"></div>
                </div>

                <div class="avatar-category">
                    <div class="avatar-category-label"><span>🦸</span> Super Heroes</div>
                    <div class="avatar-picker-fun" id="addAvatarPickerHeroes"></div>
                </div>

                <div class="avatar-category">
                    <div class="avatar-category-label"><span>🚀</span> Space & Adventure</div>
                    <div class="avatar-picker-fun" id="addAvatarPickerSpace"></div>
                </div>

                <input type="hidden" id="addChildAvatar">
            </div>

            <div class="modal-buttons-fun">
                <button type="button" class="btn-fun btn-secondary-fun" id="cancelAddChild">Maybe Later</button>
                <button type="submit" class="btn-fun btn-primary-fun"><span>✨</span> Add Child!</button>
            </div>
        </form>
    </div>
    `;
}

// Confetti celebration
function createConfettiCelebration() {
    const colors = ['#7c3aed', '#ec4899', '#fbbf24', '#14b8a6', '#3b82f6', '#f97316', '#22c55e'];
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.width = (6 + Math.random() * 8) + 'px';
        piece.style.height = piece.style.width;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 0.5 + 's';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        container.appendChild(piece);
    }
    
    setTimeout(() => container.remove(), 3500);
}

// Form submit handler for EDIT
async function handleEditFormSubmit(e) {
    e.preventDefault();
    
    if (!state.editingChild) return;
    
    const editModalError = document.getElementById('editModalError');
    const editChildName = document.getElementById('editChildName');
    
    try {
        const newName = editChildName.value.trim();
        const newAvatar = document.getElementById('editChildAvatar').value.trim();
        
        if (!newName) {
            editModalError.textContent = 'Name is required.';
            showElement(editModalError);
            return;
        }
        
        const updates = { name: newName, avatar: newAvatar || null };
        const updatedChild = await updateChildProfile(state.editingChild.id, updates);
        
        const childIndex = state.children.findIndex(c => c.id === state.editingChild.id);
        if (childIndex !== -1) {
            const nextChildren = [...state.children];
            nextChildren[childIndex] = updatedChild;
            setChildren(nextChildren);
        }
        if (state.selectedChild && state.selectedChild.id === state.editingChild.id) {
            setSelectedChild(updatedChild);
        }
        
        renderChildren();
        createConfettiCelebration();
        closeEditChildModal();
        
    } catch (error) {
        console.error('Error updating child:', error);
        editModalError.textContent = 'Failed to save changes. Please try again.';
        showElement(editModalError);
    }
}

// Form submit handler for ADD
async function handleAddFormSubmit(e) {
    e.preventDefault();
    
    const modalError = document.getElementById('modalError');
    
    try {
        const name = document.getElementById('childName').value.trim();
        const dob = document.getElementById('childDob').value;
        const avatar = document.getElementById('addChildAvatar').value || '🦊';
        
        if (!name || !dob) {
            modalError.textContent = 'Please fill in all fields.';
            showElement(modalError);
            return;
        }
        
        hideElement(modalError);
        
        const newChild = await createChild(state.currentUser.id, name, dob, avatar);
        setChildren([...state.children, newChild]);
        renderChildren();
        createConfettiCelebration();
        hideAddChildModal();
        
    } catch (error) {
        console.error('Error creating child:', error);
        modalError.textContent = error.message || 'Failed to add child';
        showElement(modalError);
    }
}

// Setup listeners for EDIT modal
function setupEditModalListeners() {
    document.getElementById('closeEditModalBtn')?.addEventListener('click', closeEditChildModal);
    document.getElementById('cancelEditChildButton')?.addEventListener('click', closeEditChildModal);
    
    document.getElementById('forgetPasswordBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeEditChildModal();
        showElement(parentPasswordModal);
    });
    
    document.getElementById('removeChildBtn')?.addEventListener('click', () => {
        if (state.editingChild) {
            removeChildName.textContent = state.editingChild.name;
            showElement(removeChildModal);
        }
    });
    
    document.getElementById('editChildForm')?.addEventListener('submit', handleEditFormSubmit);
}

// Setup listeners for ADD modal
function setupAddModalListeners() {
    document.getElementById('closeAddModalBtn')?.addEventListener('click', hideAddChildModal);
    document.getElementById('cancelAddChild')?.addEventListener('click', hideAddChildModal);
    document.getElementById('addChildForm')?.addEventListener('submit', handleAddFormSubmit);
}


function promptEditChild(child) {
    setEditingChild(child);
    
    const modal = document.querySelector('#editChildModal .modal');
    if (modal && !modal.querySelector('.modal-header-fun')) {
        modal.innerHTML = getEnhancedEditModalHTML();
        setupEditModalListeners();
    }
    
    document.getElementById('editChildName').value = child.name;
    hideElement(document.getElementById('editModalError'))
    
    renderEnhancedAvatarPicker(child.avatar || '🦊');
    
    showElement(editChildModal);
    setTimeout(() => document.getElementById('editChildName')?.focus(), 100);
}

function renderEnhancedAvatarPicker(selectedAvatar) {
  const categories = ['animals', 'magical', 'heroes', 'space']
  
  categories.forEach(category => {
    const pickerElement = document.getElementById(`avatarPicker${category.charAt(0).toUpperCase() + category.slice(1)}`)
    if (!pickerElement) return
    
    pickerElement.innerHTML = ''
    avatarCategories[category].forEach(emoji => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'avatar-option-fun'
      if (selectedAvatar === emoji) {
        button.classList.add('selected')
      }
      button.textContent = emoji
      button.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option-fun').forEach(btn => btn.classList.remove('selected'))
        button.classList.add('selected')
        const editChildAvatar = document.getElementById('editChildAvatar')
        const avatarPreviewCircle = document.getElementById('avatarPreviewCircle')
        if (editChildAvatar) editChildAvatar.value = emoji
        if (avatarPreviewCircle) avatarPreviewCircle.textContent = emoji
      })
      pickerElement.appendChild(button)
    })
  })
  
  const avatarPreviewCircle = document.getElementById('avatarPreviewCircle')
  if (avatarPreviewCircle) avatarPreviewCircle.textContent = selectedAvatar || '🦊'
}

function closeEditChildModal() {
  hideElement(editChildModal)
  setEditingChild(null)
  editChildForm.reset()
  hideElement(editModalError)
}

// Wait for the enhanced dashboard / adventure map to finish rendering.
// Returns a promise that resolves when the map signals completion,
// or after a safety timeout so the user is never stuck on the loading screen.
function waitForDashboardRender() {
  return new Promise((resolve) => {
    const SAFETY_TIMEOUT = 3000
    let resolved = false
    
    const safetyTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        console.warn('Dashboard render safety timeout reached - showing UI')
        window._dashboardRenderComplete = null
        resolve()
      }
    }, SAFETY_TIMEOUT)
    
    window._dashboardRenderComplete = () => {
      if (!resolved) {
        resolved = true
        clearTimeout(safetyTimer)
        resolve()
      }
    }
  })
}

// Select child
async function selectChild(child) {
  
  // Prevent multiple simultaneous selections
  if (window.selectingChild) {
    console.log('Child selection already in progress, ignoring duplicate call')
    return
  }
  
  window.selectingChild = true
  
  if (!child) {
    console.error('selectChild called with null/undefined child')
    window.selectingChild = false
    return
  }
  
  setSelectedChild(child)
  setAppState('selectedChild', child)
  
  try {
    // PARALLEL LOADING - Load child modules, weekly plan, and update login streak
    const [childModulesResult, weeklyPlanResult, focusPlanResult, streakResult] = await Promise.allSettled([
      getChildModules(child.id),
      loadLatestWeeklyPlanData(child.id), // New optimized function
      checkFocusPlan(child.id),
      // Update login streak for this child (using parent's user_id + child_id)
      state.currentUser ? updateLoginStreak(state.currentUser.id, child.id).then(() => getLoginStreak(state.currentUser.id, child.id)) : Promise.reject('No parent user')
    ])
    
    // Process child modules
    if (childModulesResult.status === 'fulfilled') {
      setChildModules(childModulesResult.value || [])
    } else {
      console.error('Error loading child modules:', childModulesResult.reason)
      setChildModules([])
    }
    
    // Process weekly plan
    if (weeklyPlanResult.status === 'fulfilled') {
      setCurrentWeeklyPlan(weeklyPlanResult.value)
    }
    
    // Process focus plan
    if (focusPlanResult.status === 'fulfilled') {
      setCurrentFocusPlan(focusPlanResult.value)
    } else {
      setCurrentFocusPlan(null)
    }

    // Process and display login streak
    if (streakResult.status === 'fulfilled') {
      const streakData = streakResult.value
      if (streakData) {
        console.log(`[Child Selection] ${child.name} streak: ${streakData.current_streak}`)
        // Update the day streak display
        const dayStreakEl = document.getElementById('dayStreak')
        if (dayStreakEl) {
          dayStreakEl.textContent = streakData.current_streak ?? 0
        }
        // Show streak popup if streak is 3 or more AND hasn't been shown today for this child
        if (streakData.current_streak >= 3 && !hasStreakPopupBeenShownToday(child.id)) {
          markStreakPopupAsShown(child.id)
          showStreakPopup(child.name, streakData.current_streak)
        }
      }
    } else if (streakResult.status === 'rejected') {
      console.log('[Child Selection] Streak update skipped (non-critical)')
    }

    // Setup rewards event listeners for this child (non-blocking)
    setupRewardsEventListeners(child)
    
    // Initialize daily quest system for this child
    if (typeof window.initDailyQuest === 'function') {
      window.initDailyQuest(child.id)
    }
    
    // ... (rest of the code remains the same)
    
    if (!state.currentFocusPlan) {
      // No active focus plan - show onboarding
      showFocusPlanOnboarding(child.id, async (plan, superSkillOrPathway) => {
        setCurrentFocusPlan(plan)
        window.state.currentFocusPlan = plan
        
        // Apply the focus plan to the map (handles both super skills and legacy pathways)
        applyFocusPlanToMap(plan)
        
        // Now show the child detail view
        showChildDetailView(child)
        
        // Render modules after onboarding is complete
        renderModules()
        
        // Wait for the adventure map to finish rendering before showing the UI
        await waitForDashboardRender()
        hideLoadingScreen()
      })
      return // Don't show detail view yet - wait for onboarding
    }
    
    // Show child detail view AFTER all data is loaded
    showChildDetailView(child)
    
    // Render modules immediately after showing the view
    renderModules()
    
    // Wait for the adventure map to finish rendering before showing the UI
    await waitForDashboardRender()
    hideLoadingScreen()
    
  } catch (error) {
    console.error('Error loading child modules:', error)
    console.error('Error details:', error.message, error.stack)
    // Still show the view even if modules fail to load
    setChildModules([])
    showChildDetailView(child)
    // Still try to render modules even with empty data
    renderModules()
    hideLoadingScreen()
  } finally {
    // Always reset the selecting flag
    window.selectingChild = false
  }
}

// Optimized weekly plan loading - returns data directly instead of setting global
async function loadLatestWeeklyPlanData(childId) {
  try {
    if (!state.currentUser || !state.currentUser.id) {
      console.warn('Current user not available for weekly plan loading')
      return null
    }
    return await getLatestWeeklyPlan(state.currentUser.id, childId)
  } catch (error) {
    console.error('Error loading weekly plan:', error)
    return null
  }
}

// Show children view
function showChildrenView() {
  const welcomeLandingPage = document.getElementById('welcomeLandingPage')
  
  if (loadingState) {
    hideElement(loadingState)
  }

  if (welcomeLandingPage) {
    if (!state.children || state.children.length === 0) {
      showElement(welcomeLandingPage)
    } else {
      hideElement(welcomeLandingPage)
    }
  }
  
  showElement(childrenView)
  hideElement(childDetailView)
  
  if (state.children && state.children.length > 0) {
    renderParentModulesOverview()
  }
  
  // Hide dashboard button when on main view
  if (dashboardButton) {
    dashboardButton.style.display = 'none'
  }
}

// Setup category colors
function setupCategoryColors() {
  // Default category colors if none are loaded from database
  if (!state.categoryColors || Object.keys(state.categoryColors).length === 0) {
    setCategoryColors({
      'emotions': '#4c6c96',
      'social': '#14b8a6',
      'coping': '#f59e0b',
      'cognitive': '#8b5cf6',
      'behavioral': '#ef4444',
      'default': '#6b7280'
    })
  }
}

// Setup All Workbooks filters
function setupAllWorkbooksFilter() {
  if (!allWorkbooksCategoryFilter || !allWorkbooksSeriesFilter || !state.modules) return
  
  // Get unique categories
  const categories = [...new Set(state.modules.map(m => m.category).filter(Boolean))].sort()
  
  // Populate category filter options
  allWorkbooksCategoryFilter.innerHTML = '<option value="all">All Categories</option>' + 
    categories.map(cat => `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`).join('')
  
  // Get unique series
  const series = [...new Set(state.modules.map(m => m.series).filter(Boolean))].sort()
  
  // Populate series filter options
  allWorkbooksSeriesFilter.innerHTML = '<option value="all">All Series</option>' + 
    series.map(s => `<option value="${s}">${s}</option>`).join('')
  
  // Add change event listeners
  allWorkbooksCategoryFilter.addEventListener('change', renderParentModulesOverview)
  allWorkbooksSeriesFilter.addEventListener('change', renderParentModulesOverview)
}

// Setup Dashboard filters
function setupDashboardFilters() {
  if (!dashboardCategoryFilter || !dashboardSeriesFilter || !state.modules) return
  
  // Get unique categories
  const categories = [...new Set(state.modules.map(m => m.category).filter(Boolean))].sort()
  
  // Populate category filter options
  dashboardCategoryFilter.innerHTML = '<option value="all">All Categories</option>' + 
    categories.map(cat => `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`).join('')
  
  // Get unique series
  const series = [...new Set(state.modules.map(m => m.series).filter(Boolean))].sort()
  
  // Populate series filter options
  dashboardSeriesFilter.innerHTML = '<option value="all">All Series</option>' + 
    series.map(s => `<option value="${s}">${s}</option>`).join('')
  
  // Add change event listeners
  dashboardCategoryFilter.addEventListener('change', renderModules)
  dashboardSeriesFilter.addEventListener('change', renderModules)
}

// Render parent-facing overview of unlocked vs locked modules
function renderParentModulesOverview() {
  if (!parentUnlockedModulesGrid || !parentLockedModulesGrid) return

  parentUnlockedModulesGrid.innerHTML = ''
  parentLockedModulesGrid.innerHTML = ''

  if (!state.modules || state.modules.length === 0) {
    parentUnlockedModulesGrid.innerHTML = '<p class="progress-label">No modules available yet.</p>'
    parentLockedModulesGrid.innerHTML = '<p class="progress-label">No modules configured yet.</p>'
    return
  }

  const parentModuleMap = new Map()
  state.parentModules.forEach(pm => {
    parentModuleMap.set(pm.module_id, pm.is_active)
  })
  const moduleList = [...state.modules]
  state.parentModules.forEach(pm => {
    if (pm.modules) {
      const alreadyExists = moduleList.some(m => m.id === pm.module_id)
      if (!alreadyExists) {
        moduleList.push(pm.modules)
      }
    }
  })

  // Get selected filters
  const selectedCategory = allWorkbooksCategoryFilter ? allWorkbooksCategoryFilter.value : 'all'
  const selectedSeries = allWorkbooksSeriesFilter ? allWorkbooksSeriesFilter.value : 'all'
  
  const unlocked = moduleList.filter(m => {
    const parentHasModule = parentModuleMap.get(m.id)
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory
    const matchesSeries = selectedSeries === 'all' || m.series === selectedSeries
    return parentHasModule && matchesCategory && matchesSeries
  })
  
  const locked = moduleList.filter(m => {
    const parentHasModule = parentModuleMap.has(m.id)
    const parentActive = parentModuleMap.get(m.id)
    const globallyInactive = m.is_active === false
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory
    const matchesSeries = selectedSeries === 'all' || m.series === selectedSeries
    return (!parentHasModule || !parentActive || globallyInactive) && matchesCategory && matchesSeries
  })

  // Simple, factual cards for parent overview
  const makeStaticCard = (module, options = {}) => {
    const card = document.createElement('div')
    card.className = `module-card ${options.locked ? 'locked' : ''}`

    const ageRange = getSafeAgeRange(module)
    const shortDescription = module.short_description || ''

    // Use category colors like other sections
    const categoryColor = state.categoryColors[module.category] || '#4c6c96'
    
    card.style.borderLeftColor = options.locked ? '#9ca3af' : categoryColor

    const icon = options.locked ? '🔒' : '📖'
    const statusText = options.locked ? 'Locked • Not yet active' : 'Unlocked • Active on your account'

    card.innerHTML = `
      <div class="module-left">
        <div class="module-icon ${options.locked ? 'default' : ''}" style="background: ${options.locked ? 'linear-gradient(135deg, #eeeeee 0%, #f9f9f9 100%)' : `linear-gradient(135deg, ${categoryColor}20 0%, ${categoryColor}10 100%)`}">${icon}</div>
        <div>
          <h3 class="module-title">${module.title}</h3>
          ${ageRange ? `<div class="module-subtitle" style="font-weight: 600;">Ages ${ageRange}</div>` : ''}
          ${shortDescription ? `<p class="module-subtitle" style="margin-top: 4px;">${shortDescription}</p>` : ''}
          <p class="module-subtitle" style="margin-top: 8px; color: ${options.locked ? '#9ca3af' : '#4c6c96'};">
            ${statusText} • Code: ${module.code}
          </p>
        </div>
      </div>
      ${options.locked ? `
      <div class="module-card-footer" style="margin-top: 12px;">
        <div class="module-card-progress">
          <span>Unlock with 1 credit</span>
        </div>
        <button class="btn-module start parent-purchase-button" type="button">Unlock</button>
      </div>
      ` : ''}
    `

    if (options.locked) {
      const purchaseBtn = card.querySelector('.parent-purchase-button')
      if (purchaseBtn) {
        purchaseBtn.addEventListener('click', () => openPurchaseModal(module))
      }
    }

    return card
  }

  // Render active modules (all of them)
  if (unlocked.length === 0) {
    parentUnlockedModulesGrid.innerHTML = '<p class="progress-label">No unlocked modules yet.</p>'
  } else {
    unlocked.forEach(m => parentUnlockedModulesGrid.appendChild(makeStaticCard(m, { locked: false })))
  }

  // Render locked modules with show more functionality
  if (locked.length === 0) {
    parentLockedModulesGrid.innerHTML = '<p class="progress-label">No locked modules.</p>'
    document.getElementById('showMoreModulesBtn').style.display = 'none'
    document.getElementById('showLessModulesBtn').style.display = 'none'
  } else {
    // Show first 3 locked modules initially
    const initialCount = 3
    let showingCount = Math.min(initialCount, locked.length)
    
    // Render initial locked modules
    for (let i = 0; i < showingCount; i++) {
      parentLockedModulesGrid.appendChild(makeStaticCard(locked[i], { locked: true }))
    }
    
    // Hide the rest
    for (let i = showingCount; i < locked.length; i++) {
      const card = makeStaticCard(locked[i], { locked: true })
      hideElement(card)
      parentLockedModulesGrid.appendChild(card)
    }
    
    // Setup show more/less buttons
    const showMoreBtn = document.getElementById('showMoreModulesBtn')
    const showLessBtn = document.getElementById('showLessModulesBtn')
    
    if (locked.length > initialCount) {
      showMoreBtn.style.display = 'inline-block'
      showLessBtn.style.display = 'none'
      
      showMoreBtn.onclick = () => {
        const hiddenCards = parentLockedModulesGrid.querySelectorAll('.module-card.hidden')
        const toShow = Array.from(hiddenCards).slice(0, 3)
        
        toShow.forEach(card => showElement(card))
        
        const remainingHidden = parentLockedModulesGrid.querySelectorAll('.module-card.hidden').length
        if (remainingHidden === 0) {
          showMoreBtn.style.display = 'none'
          showLessBtn.style.display = 'inline-block'
        }
      }
      
      showLessBtn.onclick = () => {
        const allLockedCards = parentLockedModulesGrid.querySelectorAll('.module-card.locked')
        const visibleLockedCards = Array.from(allLockedCards).filter(card => !card.classList.contains('hidden'))
        
        if (visibleLockedCards.length > initialCount) {
          const toHide = visibleLockedCards.slice(-3)
          toHide.forEach(card => hideElement(card))
          
          showMoreBtn.style.display = 'inline-block'
          if (visibleLockedCards.length - 3 <= initialCount) {
            showLessBtn.style.display = 'none'
          }
        }
      }
    } else {
      showMoreBtn.style.display = 'none'
      showLessBtn.style.display = 'none'
    }
  }
}

// Show child detail view - OPTIMIZED with batched DOM operations
function showChildDetailView(child) {
  // Set global variables SYNCHRONOUSLY before any rendering
  // so the enhanced dashboard / adventure map reads correct data
  window.state.selectedChild = child
  window.childModules = state.childModules
  setAppState('childModules', state.childModules)
  window.state.currentFocusPlan = state.currentFocusPlan
  
  // Batch DOM writes using requestAnimationFrame to avoid forced reflow
  requestAnimationFrame(() => {
    // Update header
    headerSubtitle.textContent = `Welcome back, ${child.name}!`
    
    // Show child detail view
    hideElement(childrenView)
    showElement(childDetailView)
    
    // Show dashboard tab by default
    showTab('dashboard')
    
    // Show dashboard button when viewing child details
    if (dashboardButton) {
      dashboardButton.style.display = 'inline-block'
    }
    
    // Update stats immediately (fast operation)
    updateDashboardStats()
  })
  
  // Apply focus plan's default super skill or pathway to adventure map
  if (state.currentFocusPlan && (state.currentFocusPlan.super_skill_id || state.currentFocusPlan.default_pathway_id)) {
    applyFocusPlanToMap(state.currentFocusPlan)
  }
  
  // Show/setup Focus Plan settings button
  setupFocusPlanSettingsButton()
  
  // Refresh enhanced dashboard synchronously (it has its own debounce)
  if (typeof window.refreshEnhancedDashboard === 'function') {
    window.refreshEnhancedDashboard()
  }
  
  // Defer leaderboard and weekly plan to idle callback or setTimeout
  // These are not visible on initial load
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      renderLeaderboard()
      renderWeeklyPlan(state.currentWeeklyPlan)
    }, { timeout: 2000 })
  } else {
    setTimeout(() => {
      renderLeaderboard()
      renderWeeklyPlan(state.currentWeeklyPlan)
    }, 100)
  }
  
  // NOTE: Loading screen is NOT hidden here.
  // The caller (selectChild) hides it after all rendering is complete.
}

function resolveModuleSuperSkillSlug(module) {
  if (!module) return null
  if (module.super_skill_slug) return String(module.super_skill_slug).toLowerCase()
  if (module.super_skill && module.super_skill.slug) {
    return String(module.super_skill.slug).toLowerCase()
  }
  if (module.super_skill_id && Array.isArray(window.superSkills)) {
    const matchedSkill = window.superSkills.find(skill => skill.id === module.super_skill_id)
    if (matchedSkill && matchedSkill.slug) {
      return String(matchedSkill.slug).toLowerCase()
    }
  }

  const rawCategory = module.category
  const categoryName = (rawCategory && typeof rawCategory === 'object' ? rawCategory.name : rawCategory) || module.category_name || ''
  if (!categoryName) return null

  const normalizedCategory = String(categoryName).toLowerCase()
  const categoryToSuperSkill = window.CATEGORY_TO_SUPERSKILL || {
    anger: 'emotion-navigator',
    anxiety: 'calm-controller',
    depression: 'resilience-ranger',
    emotions: 'emotion-navigator',
    body: 'body-boss',
    cognitive: 'brain-builder',
    social: 'connection-captain',
    general: 'all'
  }

  return categoryToSuperSkill[normalizedCategory] || normalizedCategory
}

function getAvailableSuperSkillSlugs() {
  if (window.enhancedDashboard && window.enhancedDashboard.adventureMap && typeof window.enhancedDashboard.adventureMap.getAvailableCategories === 'function') {
    const categories = window.enhancedDashboard.adventureMap.getAvailableCategories()
    if (Array.isArray(categories) && categories.length > 0) {
      return categories.map(category => String(category).toLowerCase())
    }
  }

  const modules = getAppState('modules') || window.modules || state.modules || []
  const slugs = []
  const seen = new Set()
  modules.forEach(module => {
    const slug = resolveModuleSuperSkillSlug(module)
    if (slug && !seen.has(slug)) {
      seen.add(slug)
      slugs.push(slug)
    }
  })
  return slugs
}

// Apply focus plan to adventure map - now uses Super Skills
async function applyFocusPlanToMap(focusPlan) {
  if (!focusPlan) return
  
  try {
    let superSkillSlug = 'all'
    
    // First check if focus plan has a super_skill_id (new system)
    if (focusPlan.super_skill_id) {
      const { data: superSkill } = await supabase
        .from('super_skills')
        .select('id, slug, name')
        .eq('id', focusPlan.super_skill_id)
        .single()
      
      if (superSkill && superSkill.slug) {
        superSkillSlug = superSkill.slug
      }
    }
    // Fall back to pathway if no super_skill_id (backward compatibility)
    else if (focusPlan.default_pathway_id) {
      const { data: pathway } = await supabase
        .from('pathways')
        .select('id, name, category')
        .eq('id', focusPlan.default_pathway_id)
        .single()
      
      if (pathway) {
        // Map old category to super skill
        const categoryName = (pathway.category || pathway.name || '').toLowerCase()
        const categoryToSuperSkill = {
          'anger': 'emotion-navigator',
          'anxiety': 'calm-controller',
          'depression': 'resilience-ranger',
          'emotions': 'emotion-navigator',
          'body': 'body-boss',
          'cognitive': 'brain-builder',
          'social': 'connection-captain',
          'general': 'all'
        }
        superSkillSlug = categoryToSuperSkill[categoryName] || 'all'
      }
    }

    const availableSuperSkills = getAvailableSuperSkillSlugs()
    if (availableSuperSkills.length > 0 && !availableSuperSkills.includes(superSkillSlug)) {
      superSkillSlug = availableSuperSkills[0]
    }
    
    // Store the super skill as a default for the enhanced dashboard.
    // The adventure map's own init() handles priority:
    //   1. User's explicit localStorage choice (from dropdown)
    //   2. This focus plan default (window.currentFocusSuperSkill)
    //   3. First available category
    // So we do NOT directly set currentCategory on the map here —
    // that would race with init() and override the user's stored preference.
    window.currentFocusSuperSkill = superSkillSlug
  } catch (error) {
    console.error('Error applying focus plan to map:', error)
  }
}

// Setup Focus Plan settings button
function setupFocusPlanSettingsButton() {
  const focusPlanBtn = document.getElementById('focusPlanSettingsBtn')
  if (!focusPlanBtn) return
  
  // Show the button if there's a focus plan
  if (state.currentFocusPlan) {
    focusPlanBtn.style.display = 'flex'
    
    // Remove old listener and add new one
    const newBtn = focusPlanBtn.cloneNode(true)
    focusPlanBtn.parentNode.replaceChild(newBtn, focusPlanBtn)
    
    newBtn.addEventListener('click', () => {
      if (state.selectedChild && state.currentFocusPlan) {
        showFocusPlanSettings(state.selectedChild.id, state.currentFocusPlan, (updatedPlan, superSkillOrPathway) => {
          setCurrentFocusPlan(updatedPlan)
          window.state.currentFocusPlan = updatedPlan
          
          // Apply the updated focus plan to the map
          applyFocusPlanToMap(updatedPlan)
        })
      }
    })
  } else {
    focusPlanBtn.style.display = 'none'
  }
}

// Render modules
function renderModules() {
  if (!modulesGrid) return
  
  // Add safeguard: if childModules is not loaded yet, show loading state and retry
  if (state.selectedChild && (!state.childModules || state.childModules.length === 0) && state.modules && state.modules.length > 0) {
    modulesGrid.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #4c6c96;">
        <div style="font-size: 18px; margin-bottom: 12px;">Loading modules...</div>
        <div style="font-size: 14px;">Just getting your progress ready...</div>
      </div>
    `
    
    // Retry after a short delay
    setTimeout(() => {
      renderModules()
    }, 100)
    return
  }
  
  modulesGrid.innerHTML = ''
  modulesGrid.style.display = 'block'
  
  

  // Series tabs removed - now using dropdown filters instead
  
  // Get selected filters
  const selectedCategory = dashboardCategoryFilter ? dashboardCategoryFilter.value : 'all'
  const selectedSeries = dashboardSeriesFilter ? dashboardSeriesFilter.value : 'all'
  
  const childModuleLockMap = new Map()
  state.childModules.forEach((cm) => {
    childModuleLockMap.set(cm.module_id, cm.locked !== false)
  })

  // All modules are shown, but locked until a credit unlocks them for this child
  const availableModules = state.modules.filter((m) => m.is_active !== false)

  // Apply filters
  let visibleModules = availableModules.filter(m => {
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory
    const matchesSeries = selectedSeries === 'all' || m.series === selectedSeries
    return matchesCategory && matchesSeries
  })

  if (visibleModules.length === 0) {
    modulesGrid.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #4c6c96;">
        <p style="font-size: 18px; margin-bottom: 12px;">No modules available yet.</p>
        <p style="font-size: 14px;">Modules will appear here once they are added to the database.</p>
      </div>
    `
    return
  }

  const unlockedModules = visibleModules.filter((module) => childModuleLockMap.get(module.id) === false)
  const lockedModules = visibleModules.filter((module) => childModuleLockMap.get(module.id) !== false)

  // Separate completed and incomplete modules for modules the family has unlocked
  const incompleteModules = unlockedModules.filter(module => {
    const childModule = state.childModules.find(cm => cm.module_id === module.id)
    return !childModule || childModule.is_completed !== true
  })

  const completedModules = unlockedModules.filter(module => {
    const childModule = state.childModules.find(cm => cm.module_id === module.id)
    return childModule && childModule.is_completed === true
  })

  if (unlockedModules.length === 0 && lockedModules.length > 0) {
    const emptyUnlockedMessage = document.createElement('div')
    emptyUnlockedMessage.style.gridColumn = '1 / -1'
    emptyUnlockedMessage.style.textAlign = 'center'
    emptyUnlockedMessage.style.padding = '16px'
    emptyUnlockedMessage.style.color = '#4c6c96'
    emptyUnlockedMessage.innerHTML = '<p style="font-size: 16px; margin: 0;">All modules are currently locked. Spend a credit on any module below to unlock it.</p>'
    modulesGrid.appendChild(emptyUnlockedMessage)
  }
  
  // Find the oldest incomplete module (created first)
  let oldestIncompleteModule = null
  if (incompleteModules.length > 0) {
    oldestIncompleteModule = incompleteModules.reduce((oldest, current) => {
      const oldestDate = new Date(oldest.created_at || 0)
      const currentDate = new Date(current.created_at || 0)
      return oldestDate < currentDate ? oldest : current
    })
  }

  // Render Incomplete Modules Section
  if (incompleteModules.length > 0) {
    const readyHasHidden = incompleteModules.length > 6
    const readyModulesToDisplay = state.showAllChildModules ? incompleteModules : incompleteModules.slice(0, 6)

    const incompleteSection = document.createElement('div')
    incompleteSection.style.gridColumn = '1 / -1'
    incompleteSection.style.marginBottom = '32px'
    
    // Add highlighted oldest incomplete module at the top
    if (oldestIncompleteModule && readyModulesToDisplay.includes(oldestIncompleteModule)) {
      const highlightSection = document.createElement('div')
      highlightSection.style.gridColumn = '1 / -1'
      highlightSection.style.marginBottom = '24px'
      highlightSection.style.padding = '20px'
      highlightSection.style.borderRadius = '12px'
      highlightSection.style.position = 'relative'
      
      const highlightLabel = document.createElement('div')
      highlightLabel.style.position = 'absolute'
      highlightLabel.style.top = '-10px'
      highlightLabel.style.left = '20px'
      highlightLabel.style.background = '#f59e0b'
      highlightLabel.style.color = 'white'
      highlightLabel.style.padding = '4px 12px'
      highlightLabel.style.borderRadius = '20px'
      highlightLabel.style.fontSize = '12px'
      highlightLabel.style.fontWeight = '600'
      highlightLabel.textContent = '⭐ NEXT MODULE'
      
      const highlightedCard = createModuleCard(oldestIncompleteModule)
      highlightedCard.style.margin = '0'
      highlightedCard.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
      
      highlightSection.appendChild(highlightLabel)
      highlightSection.appendChild(highlightedCard)
      incompleteSection.appendChild(highlightSection)
    }
    
    const incompleteHeader = document.createElement('div')
    incompleteHeader.style.display = 'flex'
    incompleteHeader.style.alignItems = 'center'
    incompleteHeader.style.gap = '8px'
    incompleteHeader.style.marginBottom = '16px'
    incompleteHeader.innerHTML = `
      <span style="font-size: 24px;">📚</span>
      <h3 style="font-size: 18px; color: #405878; font-weight: 700; margin: 0;">Ready to Start</h3>
      <span style="color: #4c6c96; font-size: 14px; margin-left: 8px;">(${incompleteModules.length})</span>
    `
    
    incompleteSection.appendChild(incompleteHeader)
    
    const incompleteGrid = document.createElement('div')
    incompleteGrid.className = 'modules-grid'
    incompleteGrid.style.marginBottom = '0'
    incompleteGrid.style.display = 'grid'
    incompleteGrid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))'
    incompleteGrid.style.gap = '20px'
    
    readyModulesToDisplay.forEach(module => {
      // Skip the oldest module if it's already highlighted
      if (oldestIncompleteModule && module.id === oldestIncompleteModule.id) return
      const moduleCard = createModuleCard(module)
      incompleteGrid.appendChild(moduleCard)
    })
    
    incompleteSection.appendChild(incompleteGrid)

    if (readyHasHidden) {
      const showMoreWrapper = document.createElement('div')
      showMoreWrapper.style.display = 'flex'
      showMoreWrapper.style.justifyContent = 'center'
      showMoreWrapper.style.marginTop = '16px'
      const toggleButton = document.createElement('button')
      toggleButton.className = 'btn-module start'
      toggleButton.style.padding = '12px 28px'
      toggleButton.textContent = state.showAllChildModules
        ? 'Show Less'
        : `Show More (${incompleteModules.length - readyModulesToDisplay.length})`
      toggleButton.addEventListener('click', () => {
        setShowAllChildModules(!state.showAllChildModules)
        renderModules()
      })
      showMoreWrapper.appendChild(toggleButton)
      incompleteSection.appendChild(showMoreWrapper)
    }

    modulesGrid.appendChild(incompleteSection)
  }

  // Render Completed Modules Section
  if (completedModules.length > 0) {
    const completedSection = document.createElement('div')
    completedSection.style.gridColumn = '1 / -1'
    
    const completedHeader = document.createElement('div')
    completedHeader.style.display = 'flex'
    completedHeader.style.alignItems = 'center'
    completedHeader.style.gap = '8px'
    completedHeader.style.marginBottom = '16px'
    completedHeader.innerHTML = `
      <span style="font-size: 24px;">✅</span>
      <h3 style="font-size: 18px; color: #405878; font-weight: 700; margin: 0;">Completed</h3>
      <span style="color: #4c6c96; font-size: 14px; margin-left: 8px;">(${completedModules.length})</span>
    `
    
    completedSection.appendChild(completedHeader)
    
    const completedGrid = document.createElement('div')
    completedGrid.className = 'modules-grid'
    completedGrid.style.marginBottom = '0'
    completedGrid.style.display = 'grid'
    completedGrid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))'
    completedGrid.style.gap = '20px'
    
    completedModules.forEach(module => {
      const moduleCard = createModuleCard(module)
      completedGrid.appendChild(moduleCard)
    })
    
    completedSection.appendChild(completedGrid)
    modulesGrid.appendChild(completedSection)
  }

  if (lockedModules.length > 0) {
    const lockedSection = document.createElement('div')
    lockedSection.style.gridColumn = '1 / -1'

    const lockedHeader = document.createElement('div')
    lockedHeader.style.display = 'flex'
    lockedHeader.style.alignItems = 'center'
    lockedHeader.style.gap = '8px'
    lockedHeader.style.marginBottom = '16px'
    lockedHeader.style.marginTop = '12px'
    lockedHeader.innerHTML = `
      <span style="font-size: 24px;">🔒</span>
      <h3 style="font-size: 18px; color: #405878; font-weight: 700; margin: 0;">Locked Modules</h3>
      <span style="color: #4c6c96; font-size: 14px; margin-left: 8px;">(${lockedModules.length})</span>
    `

    const lockedHint = document.createElement('p')
    lockedHint.className = 'module-subtitle'
    lockedHint.style.margin = '0 0 14px 0'
    lockedHint.textContent = "Let's go in order! Unlock the first locked module to keep the adventure going."

    const lockedGrid = document.createElement('div')
    lockedGrid.className = 'modules-grid'
    lockedGrid.style.display = 'grid'
    lockedGrid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))'
    lockedGrid.style.gap = '20px'

    lockedModules.forEach((module) => {
      lockedGrid.appendChild(createModuleCard(module, { locked: true, canUnlock: isModuleNextUnlockable(module) }))
    })

    lockedSection.appendChild(lockedHeader)
    lockedSection.appendChild(lockedHint)
    lockedSection.appendChild(lockedGrid)
    modulesGrid.appendChild(lockedSection)
  }
}

// Create module card
function createModuleCard(module, options = {}) {
  const card = document.createElement('div')

  const isLocked = Boolean(options.locked)
  const canUnlock = options.canUnlock !== false

  // Check if module is completed
  const childModule = state.childModules.find(cm => cm.module_id === module.id)
  const isCompleted = !isLocked && childModule && childModule.is_completed === true

  card.className = `module-card ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`

  const iconHtml = isLocked ? '🔒' : (isCompleted ? '✓' : '📖')
  const iconClass = isLocked ? 'default' : (isCompleted ? 'completed' : 'default')
  const buttonHtml = isLocked
    ? `<button class="btn-module locked ${canUnlock ? '' : 'locked-disabled'}" ${canUnlock ? '' : 'disabled'}>${canUnlock ? 'Unlock with 1 Credit' : 'Unlock the first lock first'}</button>`
    : isCompleted
      ? '<button class="btn-module completed">✓ Completed</button>'
      : `<button class="btn-module start">Start Module →</button>`

  const ageRange = getSafeAgeRange(module)
  const shortDescription = module.short_description || ''
  const category = module.category || ''
  const series = module.series || ''

  // Use category color from database, fallback to default
  const categoryColor = state.categoryColors[category] || '#4c6c96'
  card.style.borderLeftColor = isLocked ? '#9ca3af' : (isCompleted ? '#2e7d32' : categoryColor)

  // Build category/series badges
  let badges = ''
  if (series) {
    badges += `<span style="display: inline-block; padding: 2px 8px; background: #e3f2fd; color: #1976d2; border-radius: 12px; font-size: 11px; font-weight: 600; margin-right: 6px;">${series}</span>`
  }
  if (category) {
    badges += `<span style="display: inline-block; padding: 2px 8px; background: #f3e5f5; color: #7b1fa2; border-radius: 12px; font-size: 11px; font-weight: 600;">${category}</span>`
  }

  card.innerHTML = `
    <div class="module-left">
      <div class="module-icon ${iconClass}" style="background: linear-gradient(135deg, #e0f5e9 0%, #f3fff7 100%);">${iconHtml}</div>
      <div>
        <h3 class="module-title">${module.title}</h3>
        ${badges ? `<div style="margin-top: 6px; margin-bottom: 4px;">${badges}</div>` : ''}
        ${ageRange ? `<div class="module-subtitle" style="font-weight: 600;">Ages ${ageRange}</div>` : ''}
        ${shortDescription ? `<p class="module-subtitle" style="margin-top: 4px;">${shortDescription}</p>` : ''}
        <p class="module-subtitle" style="margin-top: 8px;">
          ${isLocked ? (canUnlock ? 'Locked — spend 1 credit to unlock' : 'Locked — start with the first lock') : (isCompleted ? 'Completed' : 'Ready to start')}
        </p>
      </div>
    </div>
    ${buttonHtml}
  `
  
  // Add click handler for start/unlock button
  if (isLocked) {
    const unlockButton = card.querySelector('.btn-module.locked')
    if (canUnlock) {
      unlockButton?.addEventListener('click', () => openPurchaseModal(module))
    }
  } else if (!isCompleted) {
    const startButton = card.querySelector('.btn-module.start')
    startButton?.addEventListener('click', () => startModule(module))
  }
  
  return card
}

// Check-in trigger weeks
const CHECKIN_WEEKS = [1, 4, 7, 10]

async function hasExistingCheckin(childId, moduleId) {
  if (!childId || !moduleId) return true
  try {
    // Check if a check-in has been started for this specific module
    // Check for both 'checkin' and 'check_in' assessment types
    const { data: assessmentData } = await supabase
      .from('pathway_assessments')
      .select('id')
      .eq('child_id', childId)
      .eq('module_id', moduleId)
      .in('assessment_type', ['checkin', 'check_in'])
      .limit(1)
      .maybeSingle()
    
    // If an assessment exists for this module, the check-in was already triggered
    if (assessmentData) {
      console.log('[Check-in] Found existing assessment for module:', moduleId)
      return true
    }
    
    // Also check if a weekly_checkin exists for this module (for backwards compatibility)
    const { data: checkinData } = await supabase
      .from('weekly_checkins')
      .select('id')
      .eq('child_id', childId)
      .eq('module_id', moduleId)
      .limit(1)
      .maybeSingle()
    
    // If a weekly_checkin exists for this module, the check-in was completed
    if (checkinData) {
      console.log('[Check-in] Found existing weekly_checkin for module:', moduleId)
      return true
    }
    
    console.log('[Check-in] No existing check-in found for module:', moduleId)
    return false
  } catch (e) {
    console.error('Error checking existing checkin:', e)
    return true
  }
}

function shouldTriggerCheckin(module) {
  const week = module.week_number || module.pathway_order || module.order
  return week && CHECKIN_WEEKS.includes(Number(week))
}

function navigateToModule(module) {
  const moduleUrl = buildModuleUrl({
    link: `/module.html?code=${module.code}&moduleId=${module.id}&parentUserId=${state.currentUser.id}`
  }, state.selectedChild.id)
  window.location.href = moduleUrl
}

window.showCheckinPopup = showCheckinPopup
function showCheckinPopup(module, onComplete) {
  // Determine the pathway/super skill for the psychometric assessment
  // Priority: module's super_skill_id → current adventure map category → 'general'
  let pathwayOrSuperSkill = 'general'

  // Try to get super skill slug from the module's super_skill_id
  if (module.super_skill_id && window.superSkills) {
    const ss = window.superSkills.find(s => s.id === module.super_skill_id)
    if (ss && ss.slug) pathwayOrSuperSkill = ss.slug
  }

  // Fallback: use the current adventure map category
  if (pathwayOrSuperSkill === 'general') {
    const mapCat = window.enhancedDashboard?.adventureMap?.currentCategory ||
                   window.currentFocusSuperSkill || 'general'
    if (mapCat && mapCat !== 'all') pathwayOrSuperSkill = mapCat
  }

  const childId = state.selectedChild?.id || window.state?.selectedChild?.id
  if (!childId) {
    onComplete()
    return
  }

  // Initialize the progress tracking system if needed
  if (window.progressTrackingSystem && !window.progressTrackingSystem.supabaseClient) {
    window.progressTrackingSystem.init(supabase)
  }

  if (!window.progressTrackingSystem) {
    console.warn('Progress tracking system not available, skipping check-in')
    onComplete()
    return
  }

  // Use 'checkin' assessment type for weekly check-ins
  window.progressTrackingSystem.showAssessment(
    childId,
    pathwayOrSuperSkill,
    'checkin',
    // onComplete — assessment finished, also record in weekly_checkins so it won't trigger again
    async (results) => {
      try {
        await saveWeeklyCheckin({
          parentUserId: state.currentUser?.id || window.state?.currentUser?.id,
          childId: childId,
          intensity: results?.totalScore || 0,
          challenge: pathwayOrSuperSkill,
          triggers: [],
          goal: null,
          notes: `Psychometric check-in (${results?.assessmentType || 'checkin'}) — score: ${results?.totalScore || 0}/${results?.maxScore || 0}`,
          generatedPlan: null,
          subSkillId: module.sub_skill_id || null,
          weekNumber: Number(module.week_number || module.pathway_order || module.order || 0) || null,
          moduleId: module.id
        })
      } catch (e) {
        console.error('Error recording weekly checkin after assessment:', e)
      }
      onComplete()
    },
    // onSkip — user skipped, still navigate to module
    () => {
      onComplete()
    },
    // Pass module data for tracking
    module
  )
}

// Start module (with check-in intercept for weeks 1, 4, 7, 10)
async function startModule(module) {
  try {
    if (shouldTriggerCheckin(module) && state.selectedChild && state.currentUser) {
      const alreadyDone = await hasExistingCheckin(state.selectedChild.id, module.id)
      if (!alreadyDone) {
        showCheckinPopup(module, () => navigateToModule(module))
        return
      }
    }
    navigateToModule(module)
  } catch (error) {
    console.error('Error starting module:', error)
    alert('Failed to start module. Please try again.')
  }
}

// Show add child modal
function showAddChildModal() {
    const modal = document.querySelector('#addChildModal .modal');
    if (modal && !modal.querySelector('.modal-header-fun')) {
        modal.innerHTML = getEnhancedAddModalHTML();
        setupAddModalListeners();
    }
    
    // Reset form
    document.getElementById('childName').value = '';
    document.getElementById('childDob').value = '';
    hideElement(document.getElementById('modalError'))
    
    renderEnhancedAvatarPicker('🦊');
    
    showElement(addChildModal);
    setTimeout(() => document.getElementById('childName')?.focus(), 100);
}

// Hide add child modal
function hideAddChildModal() {
  hideElement(addChildModal)
}

// Handle add child form submission
/*if (addChildForm) {
  addChildForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const name = document.getElementById('childName').value
    const dob = document.getElementById('childDob').value
    const avatar = addChildAvatar.value || null
    
    try {
      if (modalError) {
        hideElement(modalError)
      }
      
      // Create child with avatar
      const newChild = await createChild(state.currentUser.id, name, dob, avatar)
      
      // Add to children array
      children.push(newChild)
      
      // Re-render children
      renderChildren()
      
      // Hide modal
      hideAddChildModal()
      
    } catch (error) {
      console.error('Error creating child:', error)
      if (modalError) {
        modalError.textContent = error.message || 'Failed to add child'
        showElement(modalError)
      }
    }
  })
}
*/

// Purchase modal buttons
if (cancelPurchaseButton) {
  cancelPurchaseButton.addEventListener('click', () => {
    closePurchaseModal()
  })
}


if (unlockResultCloseButton) {
  unlockResultCloseButton.addEventListener('click', () => {
    hideElement(unlockResultModal)
  })
}

if (unlockResultModal) {
  unlockResultModal.addEventListener('click', (event) => {
    if (event.target === unlockResultModal) hideElement(unlockResultModal)
  })
}

if (confirmPurchaseButton) {
  confirmPurchaseButton.addEventListener('click', async () => {
    if (!state.currentPurchaseModule || !state.currentUser) return

    if (!isModuleNextUnlockable(state.currentPurchaseModule)) {
      showUnlockResultModal({
        title: 'Unlock in order',
        message: 'Please unlock the next module in sequence first.',
        type: 'error'
      })
      closePurchaseModal()
      return
    }

    try {
      confirmPurchaseButton.disabled = true
      confirmPurchaseButton.textContent = 'Unlocking...'

      await unlockModuleWithCredit(state.currentPurchaseModule.id, currentBillingPeriod.periodStart)

      if (state.selectedChild?.id) {
        const { error: childUnlockError } = await supabase
          .from('child_modules')
          .upsert([
            {
              child_id: state.selectedChild.id,
              module_id: state.currentPurchaseModule.id,
              locked: false
            }
          ], { onConflict: 'child_id,module_id' })

        if (childUnlockError) throw childUnlockError
      }

      currentCreditSummary = await getCreditSummary(
        state.currentUser.id,
        currentBillingPeriod.periodStart,
        currentBillingPeriod.periodEnd
      )
      updateCreditWalletBadge()

      const refreshedLegacy = await supabase
        .from('parent_modules')
        .select('module_id, is_active, modules(*)')
        .eq('parent_id', state.currentUser.id)

      const refreshedUnlocks = await getModuleUnlocks(
        state.currentUser.id,
        currentBillingPeriod.periodStart,
        currentBillingPeriod.periodEnd
      )

      const mergedMap = new Map()
      ;[(refreshedLegacy.data || []), ...(refreshedUnlocks || []).map(entry => ({
        module_id: entry.module_id,
        is_active: true,
        modules: entry.modules || null,
        unlock_source: entry.unlock_source || 'subscription_credit'
      }))].flat().forEach(entry => {
        const existing = mergedMap.get(entry.module_id)
        if (!existing || (entry.is_active && !existing.is_active)) mergedMap.set(entry.module_id, entry)
      })
      setParentModules(Array.from(mergedMap.values()))

      renderParentModulesOverview()
      renderAllModulesGrid()
      if (state.selectedChild) {
        await selectChild(state.selectedChild)
      }

      closePurchaseModal()
      createConfettiCelebration()
      showUnlockResultModal({
        title: 'Module Unlocked!',
        message: 'Your module is now active and ready for your child to start.'
      })
    } catch (error) {
      console.error('Unlock error:', error)
      showUnlockResultModal({
        title: 'Could not unlock module',
        message: error.message || 'We could not unlock this module right now. Please check your credits and try again.',
        type: 'error'
      })
    } finally {
      confirmPurchaseButton.disabled = false
      confirmPurchaseButton.textContent = 'Spend 1 Credit'
    }
  })
}

// Password modal handlers
if (childPasswordForm) {
  childPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    if (!state.pendingChildSelection) return
    
    const enteredPassword = childPasswordInput.value
    
    try {
      // Save reference to child before closing modal
      const childToSelect = state.pendingChildSelection
      
      if (childToSelect.password) {
        // Verify password against database
        const isValid = await verifyChildPassword(childToSelect.id, enteredPassword)
        
        if (isValid) {
          closePasswordModal()
          await selectChild(childToSelect)
        } else {
          passwordModalError.textContent = 'Incorrect password. Please try again.'
          showElement(passwordModalError)
          childPasswordInput.value = ''
          childPasswordInput.focus()
        }
      } else {
        // Set new password in database
        if (enteredPassword.length < 3) {
          passwordModalError.textContent = 'Password must be at least 3 characters.'
          showElement(passwordModalError)
          return
        }
        
        await setChildPassword(childToSelect.id, enteredPassword)
        // Update local child object with password
        childToSelect.password = "***"
        const childIndex = state.children.findIndex(c => c.id === childToSelect.id)
        if (childIndex !== -1) {
          const nextChildren = [...state.children]
          nextChildren[childIndex] = {
            ...nextChildren[childIndex],
            password: "***"
          }
          setChildren(nextChildren)
        }
        
        closePasswordModal()
        await selectChild(childToSelect)
      }
    } catch (error) {
      console.error('Password error:', error)
      passwordModalError.textContent = 'An error occurred. Please try again.'
      showElement(passwordModalError)
    }
  })
}

if (cancelPasswordButton) {
  cancelPasswordButton.addEventListener('click', () => {
    closePasswordModal()
  })
}

// Child Forgot Password button
const childForgotPasswordBtn = document.getElementById('childForgotPasswordBtn')
if (childForgotPasswordBtn) {
  childForgotPasswordBtn.addEventListener('click', async () => {
    if (!state.pendingChildSelection) return
    
    // Clear the password for this child so they can set a new one
    try {
      await setChildPassword(state.pendingChildSelection.id, null)
      
      // Update local child object
      state.pendingChildSelection.password = null
      const childIndex = state.children.findIndex(c => c.id === state.pendingChildSelection.id)
      if (childIndex !== -1) {
        const nextChildren = [...state.children]
        nextChildren[childIndex] = {
          ...nextChildren[childIndex],
          password: null
        }
        setChildren(nextChildren)
      }
      
      // Update modal to show password creation mode
      childPasswordModalTitle.textContent = `Set New Password for ${state.pendingChildSelection.name}`
      childPasswordInput.placeholder = 'Create a new password'
      childPasswordInput.value = ''
      passwordModalError.textContent = 'Password reset! Please create a new password.'
      passwordModalError.style.color = '#4caf50'
      showElement(passwordModalError)
      childPasswordInput.focus()
    } catch (error) {
      console.error('Error resetting password:', error)
      passwordModalError.textContent = 'Failed to reset password. Please try again.'
      passwordModalError.style.color = '#c02626'
      showElement(passwordModalError)
    }
  })
}

// Edit child form handler
/*if (editChildForm) {
  editChildForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    if (!state.editingChild) return
    
    try {
      const newName = editChildName.value.trim()
      const newAvatar = document.getElementById('editChildAvatar').value.trim()
      
      // Validate name
      if (!newName) {
        editModalError.textContent = 'Name is required.'
        showElement(editModalError)
        return
      }
      
      // Build update object
      const updates = { name: newName }
      
      // Update avatar (always include, even if empty)
      updates.avatar = newAvatar || null
      
      // Update child in database
      const updatedChild = await updateChildProfile(state.editingChild.id, updates)
      
      // Update local children array
      const childIndex = children.findIndex(c => c.id === state.editingChild.id)
      if (childIndex !== -1) {
        children[childIndex] = updatedChild
      }
      
      // Update selected child if it's the one being edited
      if (state.selectedChild && state.selectedChild.id === state.editingChild.id) {
        setSelectedChild(updatedChild)
      }
      
      // Re-render children
      renderChildren()

      createConfettiCelebration()
      
      // Close modal
      closeEditChildModal()
      
    } catch (error) {
      console.error('Error updating child:', error)
      editModalError.textContent = 'Failed to save changes. Please try again.'
      showElement(editModalError)
    }
  })
} */

/*if (cancelEditChildButton) {
  cancelEditChildButton.addEventListener('click', () => {
    closeEditChildModal()
  })
}

// Forget password button
if (forgetPasswordBtn) {
  forgetPasswordBtn.addEventListener('click', (e) => {
    e.preventDefault()
    // Show parent password verification modal
    showElement(parentPasswordModal)
    hideElement(parentPasswordError)
    parentPasswordForm.reset()
    setTimeout(() => parentPassword.focus(), 100)
  })
}

// Parent password form handler
if (parentPasswordForm) {
  parentPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    if (!state.currentUser) {
      parentPasswordError.textContent = 'User not authenticated.'
      showElement(parentPasswordError)
      return
    }
    
    const enteredPassword = parentPassword.value
    const newChildPassword = editChildPassword.value.trim()
    
    try {
      // Verify parent password against auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: state.currentUser.email,
        password: "***"
      })
      
      if (error || !data.user) {
        parentPasswordError.textContent = 'Incorrect parent password.'
        showElement(parentPasswordError)
        parentPassword.value = ''
        parentPassword.focus()
        return
      }
      
      // Password verified - update the child's password
      if (state.editingChild) {
        // Validate new password if provided
        if (newChildPassword && newChildPassword.length < 6) {
          parentPasswordError.textContent = 'New password must be at least 6 characters.'
          showElement(parentPasswordError)
          return
        }
        
        // Update password (null if blank, which clears it)
        const passwordUpdate = newChildPassword || null
        await updateChildProfile(state.editingChild.id, { password: passwordUpdate })
        
        // Update local child object
        const updatedEditingChild = {
          ...state.editingChild,
          password: passwordUpdate
        }
        setEditingChild(updatedEditingChild)
        const childIndex = state.children.findIndex(c => c.id === state.editingChild.id)
        if (childIndex !== -1) {
          const nextChildren = [...state.children]
          nextChildren[childIndex] = {
            ...nextChildren[childIndex],
            password: passwordUpdate
          }
          setChildren(nextChildren)
        }
        
        // Show success message in edit modal
        const successMsg = passwordUpdate 
          ? 'Password has been reset successfully!' 
          : 'Password cleared! The child will set a new password on next login.'
        editModalError.textContent = successMsg
        editModalError.style.color = '#4caf50'
        showElement(editModalError)
        
        // Close parent password modal
        hideElement(parentPasswordModal)
        parentPasswordForm.reset()
      }
    } catch (error) {
      console.error('Error verifying parent password:', error)
      parentPasswordError.textContent = 'An error occurred. Please try again.'
      showElement(parentPasswordError)
    }
  })
}

// Cancel parent password modal
if (cancelParentPasswordButton) {
  cancelParentPasswordButton.addEventListener('click', () => {
    hideElement(parentPasswordModal)
    parentPasswordForm.reset()
    hideElement(parentPasswordError)
    if (editChildPassword) {
      editChildPassword.value = ''
    }
  })
}

// Remove child button
if (removeChildBtn) {
  removeChildBtn.addEventListener('click', () => {
    if (!state.editingChild) return
    
    // Show confirmation modal
    removeChildName.textContent = state.editingChild.name
    hideElement(removeChildError)
    showElement(removeChildModal)
  })
}

// Cancel remove child
if (cancelRemoveChildButton) {
  cancelRemoveChildButton.addEventListener('click', () => {
    hideElement(removeChildModal)
  })
}

// Confirm remove child
if (confirmRemoveChildButton) {
  confirmRemoveChildButton.addEventListener('click', async () => {
    if (!state.editingChild) return
    
    try {
      hideElement(removeChildError)
      
      // Delete child from database
      await deleteChild(state.editingChild.id)
      
      // Remove from local children array
      setChildren(state.children.filter(c => c.id !== state.editingChild.id))
      
      // Re-render children
      renderChildren()
      
      // Close both modals
      hideElement(removeChildModal)
      closeEditChildModal()
      
      // Show success message (optional)
      alert(`${state.editingChild.name} has been removed successfully.`)
      
    } catch (error) {
      console.error('Error removing child:', error)
      removeChildError.textContent = 'Failed to remove child. Please try again.'
      showElement(removeChildError)
    }
  })
}
  */

// Quick add child button
if (addChildQuickBtn) {
  addChildQuickBtn.addEventListener('click', showAddChildModal)
}

// Welcome page "Get Started" button
const welcomeGetStartedBtn = document.getElementById('welcomeGetStartedBtn')
if (welcomeGetStartedBtn) {
  welcomeGetStartedBtn.addEventListener('click', showAddChildModal)
}

// Cancel add child
if (cancelAddChild) {
  cancelAddChild.addEventListener('click', hideAddChildModal)
}

// Back button
if (backButton) {
  backButton.addEventListener('click', () => {
    setSelectedChild(null)
    showChildrenView()
  })
}

// Desktop Navigation Buttons (same functionality as mobile)
const dashboardHomeButtonDesktop = document.getElementById('dashboardHomeButtonDesktop')
const profileButtonDesktop = document.getElementById('profileButtonDesktop')
const billingButtonDesktop = document.getElementById('billingButtonDesktop')
const logoutButtonDesktop = document.getElementById('logoutButtonDesktop')
const adminButtonDesktop = document.getElementById('adminButtonDesktop')

if (dashboardHomeButtonDesktop) {
  dashboardHomeButtonDesktop.addEventListener('click', () => {
    if (state.selectedChild) {
      window.location.href = `/dashboard.html?childId=${state.selectedChild.id}`
    } else {
      window.location.href = '/dashboard.html'
    }
  })
}

if (profileButtonDesktop) {
  profileButtonDesktop.addEventListener('click', () => {
    window.location.href = '/dashboard.html'
  })
}

if (billingButtonDesktop) {
  billingButtonDesktop.addEventListener('click', () => {
    window.location.href = '/billing.html'
  })
}

if (logoutButtonDesktop) {
  logoutButtonDesktop.addEventListener('click', async () => {
    try {
      await signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      alert('Failed to logout. Please try again.')
    }
  })
}

if (adminButtonDesktop) {
  adminButtonDesktop.addEventListener('click', () => {
    window.location.href = '/admin.html'
  })
}

const adminButton = document.getElementById('adminButton')
if (adminButton) {
  adminButton.addEventListener('click', () => {
    window.location.href = '/admin.html'
  })
}

if (closeMoreModulesButton) {
  closeMoreModulesButton.addEventListener('click', closeMoreModulesModal)
}

if (moreModulesModal) {
  moreModulesModal.addEventListener('click', (event) => {
    if (event.target === moreModulesModal) {
      closeMoreModulesModal()
    }
  })
}

if (showAllModulesButton) {
  showAllModulesButton.addEventListener('click', () => {
    closeMoreModulesModal()
    openAllModulesModal()
  })
}

if (closeAllModulesButton) {
  closeAllModulesButton.addEventListener('click', closeAllModulesModal)
}

if (allModulesModal) {
  allModulesModal.addEventListener('click', (event) => {
    if (event.target === allModulesModal) {
      closeAllModulesModal()
    }
  })
}

  if (allModulesCategoryFilter) {
    allModulesCategoryFilter.addEventListener('change', (event) => {
    setAllModulesFilters({ category: event.target.value || 'all' })
    renderAllModulesGrid()
    })
  }

  if (allModulesSeriesFilter) {
    allModulesSeriesFilter.addEventListener('change', (event) => {
    setAllModulesFilters({ series: event.target.value || 'all' })
    renderAllModulesGrid()
    })
  }

if (moreModulesPrevButton) {
  moreModulesPrevButton.addEventListener('click', () => {
    shiftMoreModulesSlide(-1)
    restartMoreModulesRotation()
  })
}

if (moreModulesNextButton) {
  moreModulesNextButton.addEventListener('click', () => {
    shiftMoreModulesSlide(1)
    restartMoreModulesRotation()
  })
}

if (dashboardHomeButton) {
  dashboardHomeButton.addEventListener('click', () => {
    window.location.href = '/dashboard.html'
  })
}

if (profileButton) {
  profileButton.addEventListener('click', () => {
    window.location.href = '/dashboard.html'
  })
}

if (billingButton) {
  billingButton.addEventListener('click', () => {
    window.location.href = '/billing.html'
  })
}

// Logout
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    try {
      await signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      alert('Failed to logout. Please try again.')
    }
  })
}

// Hamburger Menu Toggle
const hamburgerMenu = document.getElementById('hamburgerMenu')
const dropdownMenu = document.getElementById('dropdownMenu')

if (hamburgerMenu && dropdownMenu) {
  hamburgerMenu.addEventListener('click', (e) => {
    e.stopPropagation()
    hamburgerMenu.classList.toggle('active')
    dropdownMenu.classList.toggle('active')
  })

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!hamburgerMenu.contains(e.target) && !dropdownMenu.contains(e.target)) {
      hamburgerMenu.classList.remove('active')
      dropdownMenu.classList.remove('active')
    }
  })

  // Close dropdown when clicking a menu item
  const dropdownItems = dropdownMenu.querySelectorAll('.dropdown-item')
  dropdownItems.forEach(item => {
    item.addEventListener('click', () => {
      hamburgerMenu.classList.remove('active')
      dropdownMenu.classList.remove('active')
    })
  })
}

// Tab switching
function showTab(tabName) {
  if (!tabDashboard || !tabModules || !tabLeaderboard || !tabSpendStars || !tabParentInsights) return
  
  // Remove active class from all tabs
  tabDashboard.classList.remove('active')
  tabModules.classList.remove('active')
  tabLeaderboard.classList.remove('active')
  tabSpendStars.classList.remove('active')
  tabParentInsights.classList.remove('active')
  
  // Hide all tab content
  hideElement(dashboardTabContent)
  hideElement(modulesTabContent)
  hideElement(leaderboardTabContent)
  hideElement(spendStarsTabContent)
  hideElement(parentInsightsTabContent)
  
  // Show selected tab
  if (tabName === 'dashboard') {
    tabDashboard.classList.add('active')
    showElement(dashboardTabContent)
  } else if (tabName === 'modules') {
    tabModules.classList.add('active')
    showElement(modulesTabContent)
  } else if (tabName === 'leaderboard') {
    tabLeaderboard.classList.add('active')
    showElement(leaderboardTabContent)
  } else if (tabName === 'spendStars') {
    tabSpendStars.classList.add('active')
    showElement(spendStarsTabContent)
    // Initialize rewards tab when shown
    initializeRewardsTab(state.selectedChild)
  } else if (tabName === 'parentInsights') {
    tabParentInsights.classList.add('active')
    showElement(parentInsightsTabContent)
    setParentInsightsSubtab(state.currentInsightsSubtab)
    // Update insights when tab is shown
    updateParentInsights()
  }
}

// Tab click handlers (only add if elements exist)
if (tabDashboard) {
  tabDashboard.addEventListener('click', () => showTab('dashboard'))
}
if (tabModules) {
  tabModules.addEventListener('click', () => showTab('modules'))
}
if (tabLeaderboard) {
  tabLeaderboard.addEventListener('click', () => showTab('leaderboard'))
}
if (tabSpendStars) {
  tabSpendStars.addEventListener('click', () => showTab('spendStars'))
}
if (tabParentInsights) {
  tabParentInsights.addEventListener('click', () => {
    // Navigate to the dedicated Parent Insights page for better performance and richer data
    if (state.selectedChild) {
      window.location.href = `/parent-insights.html?childId=${state.selectedChild.id}`
    } else {
      window.location.href = '/parent-insights.html'
    }
  })
}

// Update dashboard stats
async function updateDashboardStats() {
  if (!state.selectedChild) return
  
  // Count completed modules (only active modules)
  const activeModules = state.modules.filter(m => m.is_active)
  const completedCount = state.childModules.filter(cm => cm.is_completed === true).length
  const totalCount = activeModules.length
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  
  // Update stats
  const totalStarsEl = document.getElementById('totalStars')
  const completedModulesEl = document.getElementById('completedModules')
  const totalModulesEl = document.getElementById('totalModules')
  if (totalStarsEl) totalStarsEl.textContent = state.selectedChild.stars || 0
  if (completedModulesEl) completedModulesEl.textContent = completedCount
  if (totalModulesEl) totalModulesEl.textContent = totalCount

  const totalXp = state.selectedChild.total_xp || 0
  const currentLevel = state.selectedChild.level || 1
  
  // Get XP required for next level
  let nextLevelXp = 0
  let currentLevelXp = 0
  
  try {
    // Get XP required for current level (to show progress from)
    const currentLevelInfo = await getLevelInfo(currentLevel)
    currentLevelXp = currentLevelInfo?.xp_required || 0
    
    // Get XP required for next level
    nextLevelXp = await getXpForNextLevel(currentLevel)
  } catch (error) {
    console.error('Error getting level info:', error)
    // Fallback to simple calculation
    nextLevelXp = currentLevelXp + 500
  }
  
  // Calculate progress within current level
  const levelProgress = totalXp - currentLevelXp
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp
  const levelPercent = xpNeededForNextLevel > 0 ? Math.min(100, Math.round((levelProgress / xpNeededForNextLevel) * 100)) : 0
  
  const levelValueEl = document.getElementById('childLevel')
  const levelProgressBarEl = document.getElementById('levelProgressBar')
  const levelProgressTextEl = document.getElementById('levelProgressText')
  if (levelValueEl) levelValueEl.textContent = currentLevel
  if (levelProgressBarEl) levelProgressBarEl.style.width = `${levelPercent}%`
  if (levelProgressTextEl) levelProgressTextEl.textContent = `${levelProgress} / ${xpNeededForNextLevel} XP`
  
  // Get rank from leaderboard
  try {
    const leaderboard = await getAllChildrenLeaderboard(100)
    const rank = leaderboard.findIndex(child => child.id === state.selectedChild.id) + 1
    const childRankEl = document.getElementById('childRank')
    if (childRankEl) childRankEl.textContent = rank > 0 ? `#${rank}` : '#-'
  } catch (error) {
    console.error('Error getting rank:', error)
    const childRankEl = document.getElementById('childRank')
    if (childRankEl) childRankEl.textContent = '#-'
  }
  
  // Update progress bar
  const progressBar = document.getElementById('progressBar')
  const progressPercent = document.getElementById('progressPercent')
  const progressText = document.getElementById('progressText')
  
  if (progressBar && progressPercent && progressText) {
    progressBar.style.width = percentage + '%'
    progressPercent.textContent = percentage + '%'
    progressText.textContent = `${completedCount} of ${totalCount}`
  }
  
  // Update Parent Insights
  updateParentInsights()
}

// Update Parent Insights Panel
function normalizeTextArray(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item.trim() : item))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => (typeof item === 'string' ? item.trim() : item))
          .filter(Boolean)
      }
    } catch (_) {
      // Ignore JSON parse errors and fall back to brace/comma parsing
    }

    const noBraces = trimmed.replace(/[\{\}\[\]]/g, '')
    return noBraces
      .split(',')
      .map(item => item.replace(/^"|"$/g, '').trim())
      .filter(Boolean)
  }

  return []
}

function buildInsightList(items, accent = '#4caf50', icon = '✓') {
  if (!items || items.length === 0) return ''
  return items.map(item => `
    <div style="display: flex; align-items: center; gap: 8px; margin: 6px 0;">
      <span style="color: ${accent};">${icon}</span>
      <span>${item}</span>
    </div>
  `).join('')
}

function updateParentInsights() {
  if (!state.selectedChild || !state.childModules || !state.modules) return
  
  // Get completed modules with their details
  const completedModules = state.childModules
    .filter(cm => cm.is_completed === true)
    .map(cm => state.modules.find(m => m.id === cm.module_id))
    .filter(m => m) // Remove any undefined
  
  // Get recently started modules (in progress)
  const inProgressModules = state.childModules
    .filter(cm => cm.is_completed === false && cm.stars_earned > 0)
    .map(cm => state.modules.find(m => m.id === cm.module_id))
    .filter(m => m)
  
  const totalStars = state.selectedChild.stars || 0
  const completedCount = completedModules.length
  
  // Reinforcement suggestions keyed by workbook
  const moduleReinforcements = {
    'MODULE1': 'Practice the "feelings check-in" at bedtime. Ask: "What emotion did you feel most today?"',
    'MODULE2': 'Try the "5-4-3-2-1" grounding technique together when your child feels overwhelmed.',
    'MODULE3': 'Role-play friendship scenarios at home. Practice saying "no" kindly and setting boundaries.',
    'MODULE4': 'Create a "calm-down corner" at home with breathing exercises and sensory tools.',
    'MODULE5': 'Practice the "worry time" technique: set aside 10 minutes daily for worries, then move on.',
    'MODULE6': 'Start a "wins journal" - write down 3 things your child did well each day.',
    'MODULE7': 'Create a memory box together. Talk openly about feelings and validate their emotions.',
    'MODULE8': 'Practice "emotion detective" - watch shows together and identify characters\' feelings.'
  }
  
  // Aggregate skills and emotions from completed modules
  const completedSkills = new Set()
  const completedEmotions = new Set()
  completedModules.forEach(module => {
    normalizeTextArray(module?.skills).forEach(skill => completedSkills.add(skill))
    normalizeTextArray(module?.emotions).forEach(emotion => completedEmotions.add(emotion))
  })

  // Update "Your Journey This Week" stats
  const skillsCount = completedSkills.size
  const emotionsCount = completedEmotions.size
  const activitiesCount = completedCount

  const skillsExploredCountEl = document.getElementById('skillsExploredCount')
  const skillsExploredLabelEl = document.getElementById('skillsExploredLabel')
  const toolsIntroducedCountEl = document.getElementById('toolsIntroducedCount')
  const toolsIntroducedLabelEl = document.getElementById('toolsIntroducedLabel')
  const activitiesCompletedCountEl = document.getElementById('activitiesCompletedCount')
  const activitiesCompletedLabelEl = document.getElementById('activitiesCompletedLabel')

  // Get the skills box container
  const skillsExploredBoxEl = document.getElementById('skillsExploredBox')

  // If all counts are 0, show one large box with a single message
  if (skillsCount === 0 && emotionsCount === 0 && activitiesCount === 0) {
    if (skillsExploredBoxEl) {
      skillsExploredBoxEl.style.gridColumn = '1 / -1'
    }
    if (skillsExploredCountEl) {
      skillsExploredCountEl.textContent = ''
      skillsExploredCountEl.style.display = 'none'
    }
    if (skillsExploredLabelEl) {
      skillsExploredLabelEl.textContent = 'Your child\'s journey will appear here as they explore modules and build skills.'
      skillsExploredLabelEl.style.fontSize = '12px'
      skillsExploredLabelEl.style.lineHeight = '1.4'
    }
    if (toolsIntroducedCountEl) toolsIntroducedCountEl.parentElement.style.display = 'none'
    if (activitiesCompletedCountEl) activitiesCompletedCountEl.parentElement.style.display = 'none'
  } else {
    // Show all three boxes with their data
    if (skillsExploredBoxEl) {
      skillsExploredBoxEl.style.gridColumn = 'auto'
    }
    if (toolsIntroducedCountEl) toolsIntroducedCountEl.parentElement.style.display = 'block'
    if (activitiesCompletedCountEl) activitiesCompletedCountEl.parentElement.style.display = 'block'
    if (skillsExploredCountEl) {
      skillsExploredCountEl.style.display = 'block'
      skillsExploredCountEl.textContent = skillsCount
    }
    if (skillsExploredLabelEl) {
      skillsExploredLabelEl.textContent = 'SKILLS EXPLORED'
      skillsExploredLabelEl.style.fontSize = '11px'
    }
    if (toolsIntroducedCountEl) toolsIntroducedCountEl.textContent = emotionsCount
    if (toolsIntroducedLabelEl) {
      toolsIntroducedLabelEl.textContent = 'TOOLS INTRODUCED'
      toolsIntroducedLabelEl.style.fontSize = '11px'
    }
    if (activitiesCompletedCountEl) activitiesCompletedCountEl.textContent = activitiesCount
    if (activitiesCompletedLabelEl) {
      activitiesCompletedLabelEl.textContent = 'ACTIVITIES COMPLETED'
      activitiesCompletedLabelEl.style.fontSize = '11px'
    }
  }
  
  // Reinforcement tips sourced from active modules
  const reinforcements = []
  inProgressModules.forEach(module => {
    const tip = moduleReinforcements[module.workbook_id]
    if (tip) {
      reinforcements.push(tip)
    }
  })
  
  // Update Weekly Activity
  const weeklyActivityEl = document.getElementById('weeklyActivity')
  if (weeklyActivityEl) {
    if (completedCount === 0 && inProgressModules.length === 0) {
      weeklyActivityEl.innerHTML = `
        <p style="margin: 8px 0;">🌱 <strong>Getting Started:</strong> Your child hasn't started any modules yet.</p>
        <p style="margin: 8px 0;">💡 Encourage them to explore the available modules and choose one that interests them!</p>
      `
    } else {
      const activityText = []
      if (inProgressModules.length > 0) {
        activityText.push(`<p style="margin: 8px 0;">📚 <strong>Currently working on:</strong> ${inProgressModules.map(m => m.title).join(', ')}</p>`)
      }
      if (completedCount > 0) {
        activityText.push(`<p style="margin: 8px 0;">✅ <strong>Completed ${completedCount} module${completedCount > 1 ? 's' : ''}:</strong> ${completedModules.slice(-3).map(m => m.title).join(', ')}</p>`)
      }
      activityText.push(`<p style="margin: 8px 0;">⭐ <strong>Total stars earned:</strong> ${totalStars} - Great progress!</p>`)
      weeklyActivityEl.innerHTML = activityText.join('')
    }
  }
  
  // Update Skills Practiced
  const skillsPracticedEl = document.getElementById('skillsPracticed')
  if (skillsPracticedEl) {
    if (completedSkills.size === 0) {
      skillsPracticedEl.innerHTML = '<p style="margin: 4px 0; color: #999;">No skills practiced yet</p>'
    } else {
      const insightList = buildInsightList(Array.from(completedSkills).slice(0, 6))
      skillsPracticedEl.innerHTML = insightList
    }
  }
  
  // Update Emotions Explored
  const emotionsExploredEl = document.getElementById('emotionsExplored')
  if (emotionsExploredEl) {
    if (completedEmotions.size === 0) {
      emotionsExploredEl.innerHTML = '<p style="margin: 4px 0; color: #999;">No emotions explored yet</p>'
    } else {
      const emotionsList = buildInsightList(Array.from(completedEmotions).slice(0, 6), '#1976d2', '●')
      emotionsExploredEl.innerHTML = emotionsList
    }
  }
  
  // Update Reinforcement Suggestions
  const reinforcementEl = document.getElementById('reinforcementSuggestions')
  if (reinforcementEl) {
    if (reinforcements.length === 0) {
      reinforcementEl.innerHTML = `
        <p style="margin: 4px 0;"><strong>💡 General tip:</strong> Create a consistent routine for emotional check-ins. Ask your child daily: "What was your favorite part of today?" and "Was there anything that felt hard?"</p>
        <p style="margin: 8px 0 4px 0;"><strong>🎯 Next step:</strong> Encourage your child to start a module that interests them!</p>
      `
    } else {
      const suggestionText = reinforcements[0] // Show most recent
      reinforcementEl.innerHTML = `<p style="margin: 4px 0;">${suggestionText}</p>`
    }
  }
  
  // Update Recent Achievements
  const achievementsEl = document.getElementById('recentAchievements')
  if (achievementsEl) {
    const achievements = []
    
    if (completedCount > 0) {
      achievements.push(`🎉 Completed ${completedCount} module${completedCount > 1 ? 's' : ''}!`)
    }
    if (totalStars >= 50) {
      achievements.push(`⭐ Earned ${totalStars} stars - Excellent dedication!`)
    } else if (totalStars >= 20) {
      achievements.push(`⭐ Earned ${totalStars} stars - Great progress!`)
    } else if (totalStars > 0) {
      achievements.push(`⭐ Started earning stars - Keep going!`)
    }
    if (inProgressModules.length > 0) {
      achievements.push(`📖 Actively engaged in ${inProgressModules.length} module${inProgressModules.length > 1 ? 's' : ''}`)
    }
    
    if (achievements.length === 0) {
      achievementsEl.innerHTML = '<p style="margin: 4px 0;">🌟 Ready to start the journey! Every small step counts.</p>'
    } else {
      achievementsEl.innerHTML = achievements.map(a => `<p style="margin: 6px 0;">• ${a}</p>`).join('')
    }
  }
}

// Render leaderboard
async function renderLeaderboard() {
  if (!leaderboardList || !state.selectedChild) return
  
  leaderboardList.innerHTML = '<div style="text-align: center; padding: 20px; color: #4c6c96;">Loading leaderboard...</div>'
  
  try {
    // Get all children from database, ordered by stars
    const allChildren = await getAllChildrenLeaderboard(10)
    
    if (!allChildren || allChildren.length === 0) {
      leaderboardList.innerHTML = '<div style="text-align: center; padding: 20px; color: #4c6c96;">No leaderboard data yet. Be the first to earn stars!</div>'
      return
    }
    
    leaderboardList.innerHTML = ''

    // Random avatars for variety
    const avatars = ['🌟', '🚀', '⭐', '🌈', '🎯', '💫', '🎨', '🎭', '🎪', '🎬']
    const fakeFirstNames = ['Oliver', 'Amelia', 'Noah', 'Ava', 'Leo', 'Isla', 'Mason', 'Mia', 'Ethan', 'Lily', 'Lucas', 'Ella']
    const fakeLastInitials = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'J.', 'K.', 'L.', 'M.']

    const getStableHash = (value = '') => {
      return value.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    }

    const toDisplayName = (child, index) => {
      if (child.id === state.selectedChild.id) {
        return child.name
      }

      const hash = getStableHash(child.id || `${index}`)
      const firstName = fakeFirstNames[hash % fakeFirstNames.length]
      const lastInitial = fakeLastInitials[Math.floor(hash / fakeFirstNames.length) % fakeLastInitials.length]
      return `${firstName} ${lastInitial}`
    }

    const displayChildren = [...allChildren]
    const currentChildPosition = displayChildren.findIndex(child => child.id === state.selectedChild.id)

    // Add supportive practice buddies below the current child if they'd otherwise appear last.
    if (currentChildPosition === displayChildren.length - 1) {
      const currentStars = state.selectedChild.stars || 0
      displayChildren.push(
        { id: '__practice_buddy_1__', name: 'Practice Buddy', stars: Math.max(currentStars - 1, 0) },
        { id: '__practice_buddy_2__', name: 'Practice Buddy', stars: Math.max(currentStars - 2, 0) }
      )
    }

    displayChildren.forEach((child, index) => {
      const rank = index + 1
      const isCurrentUser = child.id === state.selectedChild.id
      const avatar = avatars[index % avatars.length]
      const displayName = child.id.startsWith('__practice_buddy_')
        ? toDisplayName({ ...child, id: `${child.id}_${index}` }, index)
        : toDisplayName(child, index)
      
      const item = document.createElement('div')
      item.className = `leaderboard-item ${isCurrentUser ? 'current-user' : ''}`
      
      const rankBadgeClass = rank <= 3 ? 'top3' : 'regular'
      const rankContent = rank <= 3 
        ? (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉')
        : rank
      
      item.innerHTML = `
        <div class="leaderboard-left">
          <div class="rank-badge ${rankBadgeClass}">${rankContent}</div>
          <div class="user-avatar">${avatar}</div>
          <div>
            <div class="user-name">
              ${displayName}
              ${isCurrentUser ? '<span class="user-badge">YOU</span>' : ''}
            </div>
          </div>
        </div>
        <div class="user-points">
          <span>⭐</span>
          <span class="points-value">${child.stars || 0}</span>
        </div>
      `
      
      leaderboardList.appendChild(item)
    })
  } catch (error) {
    console.error('Error loading leaderboard:', error)
    leaderboardList.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff4444;">Failed to load leaderboard. Please try again.</div>'
  }
}

// Check if user is admin
async function checkAdminStatus() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('[Dashboard] No user found')
      return
    }
    
    // Use the database function to check admin status
    const isAdmin = await isUserAdmin(user.id)
    
    if (isAdmin) {
      const adminButton = document.getElementById('adminButton')
      const adminButtonDesktop = document.getElementById('adminButtonDesktop')
      if (adminButton) {
        showElement(adminButton)
      }
      if (adminButtonDesktop) {
        showElement(adminButtonDesktop)
      }
    }
  } catch (error) {
    console.error('[Dashboard] Error checking admin status:', error)
  }
}

// Load and display login streak
async function loadStreakDisplay() {
  try {
    const streakData = await getLoginStreak(state.currentUser.id)
    console.log('[Dashboard] Streak data:', streakData)
    const dayStreakEl = document.getElementById('dayStreak')
    
    if (dayStreakEl) {
      dayStreakEl.textContent = streakData.current_streak ?? 0
    }
  } catch (error) {
    console.error('Error loading streak display:', error)
  }
}

// Get motivational message based on streak
function getStreakMessage(streak) {
  if (streak === 1) return "Great start! Keep it going!"
  if (streak === 2) return "Two days in a row! You're on fire! 🔥"
  if (streak === 3) return "Three day streak! Building momentum!"
  if (streak === 5) return "Five days! You're developing a great habit!"
  if (streak === 7) return "One week streak! Amazing consistency! 🎉"
  if (streak === 10) return "Double digits! You're crushing it!"
  if (streak === 14) return "Two weeks! Your dedication is inspiring!"
  if (streak === 21) return "Three weeks! You're unstoppable!"
  if (streak === 30) return "One month! This is incredible! 🌟"
  if (streak === 50) return "50 days! You're a legend! 🏆"
  if (streak === 100) return "100 days! Absolutely phenomenal! 👑"
  if (streak % 7 === 0) return `${Math.floor(streak / 7)} weeks! Consistency is key!`
  if (streak % 10 === 0) return `${streak} days! Milestone reached! 🎯`
  return "Keep it going!"
}

// ================================================
// PROFILE HUB
// Replaces the workbook gallery with billing + subscription profile info
// ================================================

class ModuleGallery {
    constructor(containerId, options) {
        this.containerId = containerId;
        this.container = null;
        this.options = options || {};
        this.changePlanModal = null;
        this.expandedTier = null;
    }

    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.warn('Profile hub container not found:', this.containerId);
            return;
        }

        this.render();
        this.createChangePlanModal();
        this.attachEventListeners();
    }

    getSafeTiers() {
        return (subscriptionTiers || []).filter(function(tier) {
            return tier && tier.is_active !== false;
        });
    }

    getCurrentTierName() {
        return (currentSubscription?.tier || 'mid').toLowerCase();
    }

    getNextPaymentDateLabel() {
        var rawDate = currentSubscription?.stripe_current_period_end || currentSubscription?.current_period_end || null;
        if (!rawDate) {
            return this.formatDateLabel(currentBillingPeriod?.periodEnd);
        }
        return this.formatDateLabel(rawDate);
    }

    formatDateLabel(value) {
        if (!value) return 'Not available';
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not available';
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    formatDateDDMMYYYY(value) {
        if (!value) return '-';
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        var day = String(date.getDate()).padStart(2, '0');
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var year = date.getFullYear();
        return day + '/' + month + '/' + year;
    }

    formatCurrency(cents) {
        if (typeof cents !== 'number') return 'Contact support';
        var formatter = getCurrencyFormatter('AUD');
        return formatter.format(cents / 100) + '/month';
    }

    render() {
        if (!this.container) return;

        var tiers = this.getSafeTiers();
        var currentTierName = this.getCurrentTierName();
        var activeTier = tiers.find(function(t) { return t.tier === currentTierName; }) || null;

        this.container.innerHTML =
            '<section class="profile-hub">' +
                '<div class="profile-hub-header">' +
                    '<h2 class="profile-hub-title">👤 Your Profile & Plan</h2>' +
                    '<p class="profile-hub-subtitle">Manage billing, subscription details, and your current family learning tier.</p>' +
                '</div>' +
                '<div class="profile-hub-grid">' +
                    '<article class="profile-hub-card">' +
                        '<h3>Subscription Overview</h3>' +
                        '<div class="profile-stat-list">' +
                            '<div class="profile-stat-item"><span>Current Tier</span><strong>' + this.escapeHtml((activeTier?.tier || currentTierName).toUpperCase()) + '</strong></div>' +
                            '<div class="profile-stat-item"><span>Monthly Modules</span><strong>' + (activeTier?.modules_per_month || 0) + '</strong></div>' +
                            '<div class="profile-stat-item"><span>Monthly Cost</span><strong>' + this.escapeHtml(this.formatCurrency(activeTier?.monthly_price_cents)) + '</strong></div>' +
                            '<div class="profile-stat-item"><span>Status</span><strong>' + this.escapeHtml((currentSubscription?.status || 'active').toUpperCase()) + '</strong></div>' +
                        '</div>' +
                    '</article>' +
                    '<article class="profile-hub-card">' +
                        '<h3>Billing Snapshot</h3>' +
                        '<div class="profile-stat-list">' +
                            '<div class="profile-stat-item"><span>Next Payment Due</span><strong>' + this.escapeHtml(this.getNextPaymentDateLabel()) + '</strong></div>' +
                            '<div class="profile-stat-item"><span>Credits Available</span><strong>' + (currentCreditSummary?.credits_available ?? 0) + '</strong></div>' +
                            '<div class="profile-stat-item"><span>Credits Used This Month</span><strong>' + (currentCreditSummary?.credits_used ?? 0) + '</strong></div>' +
                            '<div class="profile-stat-item"><span>Billing Cycle</span><strong>' + this.escapeHtml(this.formatDateDDMMYYYY(currentBillingPeriod?.periodStart) + ' → ' + this.formatDateDDMMYYYY(currentBillingPeriod?.periodEnd)) + '</strong></div>' +
                        '</div>' +
                    '</article>' +
                '</div>' +
                '<article class="profile-hub-card profile-hub-card-full">' +
                    '<div class="profile-plan-cta">' +
                        '<div><h3>Need a different tier?</h3><p>Compare plans and switch to the level that best supports your family.</p></div>' +
                        '<button type="button" id="openChangePlanModal" class="profile-change-plan-btn">Change Plan</button>' +
                    '</div>' +
                '</article>' +
            '</section>';
    }

    renderTierAccordion(tiers, selectedTierName) {
        if (!tiers.length) {
            return '<p class="change-plan-empty">No plans available right now. Please contact support.</p>';
        }

        var expandedTier = this.expandedTier || selectedTierName || tiers[0].tier;

        return tiers.map((tier) => {
            var isCurrent = tier.tier === selectedTierName;
            var isOpen = tier.tier === expandedTier;
            
            var featuresList = '<ul class="plan-features-list">' +
                '<li class="plan-feature-item included"><strong>' + tier.modules_per_month + '</strong>  modules per month</li>' +
                '<li class="plan-feature-item ' + (tier.includes_parent_insights ? 'included' : 'excluded') + '">Parent insights and progress tracking</li>' +
                '<li class="plan-feature-item ' + (tier.includes_behavioural_support ? 'included' : 'excluded') + '">Behavioral support resources</li>' +
                '</ul>';
            
            return '<div class="plan-accordion-item ' + (isCurrent ? 'is-current' : '') + ' ' + (isOpen ? 'is-open' : '') + '" data-tier="' + this.escapeHtml(tier.tier) + '">' +
                '<button type="button" class="plan-accordion-trigger" data-tier-trigger="' + this.escapeHtml(tier.tier) + '">' +
                    '<div><span class="plan-tier-name">' + this.escapeHtml(tier.tier.toUpperCase()) + '</span>' +
                    (isCurrent ? '<span class="plan-current-badge">Current Plan</span>' : '') + '</div>' +
                    '<span class="plan-tier-price">' + this.escapeHtml(this.formatCurrency(tier.monthly_price_cents)) + '</span>' +
                '</button>' +
                '<div class="plan-accordion-panel" ' + (isOpen ? '' : 'hidden') + '>' +
                    '<p>' + this.escapeHtml(tier.description || 'A balanced plan designed for steady emotional growth and family support.') + '</p>' +
                    '<ul>' +
                        '<li><strong>' + tier.modules_per_month + '</strong> modules per month</li>' +
                        '<li>Includes progress tracking and family dashboard tools</li>' +
                        '<li>Priority content updates for active subscribers</li>' +
                    '</ul>' +
                    '<button type="button" class="profile-select-plan-btn" data-select-tier="' + this.escapeHtml(tier.tier) + '" ' + (isCurrent ? 'disabled' : '') + '>' + (isCurrent ? 'Current Plan' : 'Select ' + this.escapeHtml(tier.tier.toUpperCase())) + '</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    createChangePlanModal() {
        var existingModal = document.getElementById('changePlanModal');
        if (existingModal) existingModal.remove();

        var tiers = this.getSafeTiers();
        var selectedTierName = this.getCurrentTierName();
        this.expandedTier = selectedTierName;

        var modal = document.createElement('div');
        modal.id = 'changePlanModal';
        modal.className = 'module-modal-overlay';
        modal.innerHTML =
            '<div class="module-modal change-plan-modal-shell">' +
                '<div class="change-plan-header">' +
                    '<h2>Change your plan</h2>' +
                    '<button type="button" class="modal-close" id="changePlanCloseBtn">✕</button>' +
                '</div>' +
                '<p class="change-plan-subtitle">Choose the best tier for your family. Your current plan is highlighted.</p>' +
                '<div id="changePlanAccordion">' + this.renderTierAccordion(tiers, selectedTierName) + '</div>' +
            '</div>';

        document.body.appendChild(modal);
        this.changePlanModal = modal;
    }

    attachEventListeners() {
        var openButton = document.getElementById('openChangePlanModal');
        if (openButton) {
            openButton.addEventListener('click', () => {
                if (this.changePlanModal) {
                    this.changePlanModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        }

        if (this.changePlanModal) {
            var closeButton = document.getElementById('changePlanCloseBtn');
            if (closeButton) {
                closeButton.addEventListener('click', () => this.closeModal());
            }

            this.changePlanModal.addEventListener('click', (event) => {
                if (event.target === this.changePlanModal) this.closeModal();
            });

            this.changePlanModal.addEventListener('click', (event) => {
                var trigger = event.target.closest('[data-tier-trigger]');
                if (trigger) {
                    this.expandedTier = trigger.getAttribute('data-tier-trigger');
                    this.refreshAccordion();
                    return;
                }

                var selectButton = event.target.closest('.profile-select-plan-btn');
                if (selectButton) {
                    var tierName = selectButton.getAttribute('data-select-tier');
                    if (tierName) this.handleTierSwitch(tierName, selectButton);
                }
            });
        }
    }

    refreshAccordion() {
        var accordion = document.getElementById('changePlanAccordion');
        if (!accordion) return;
        accordion.innerHTML = this.renderTierAccordion(this.getSafeTiers(), this.getCurrentTierName());
    }

    closeModal() {
        if (!this.changePlanModal) return;
        this.changePlanModal.classList.remove('active');
        document.body.style.overflow = '';
    }


    notifyUser(message) {
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
            window.showToast(message);
            return;
        }
        alert(message);
    }

    async handleTierSwitch(tierName, button) {
        var parentUserId = state?.currentUser?.id || window.state?.currentUser?.id;
        if (!parentUserId) {
            this.notifyUser('Unable to switch plans right now. Please refresh and try again.');
            return;
        }

        var targetTier = String(tierName || '').toLowerCase();
        if (!targetTier) return;

        var originalLabel = button?.textContent || '';
        if (button) {
            button.disabled = true;
            button.textContent = 'Redirecting...';
        }

        try {
            var result = await switchStripeSubscriptionPlan(targetTier);
            if (!result?.url) throw new Error('Stripe checkout URL was not returned.');
            window.location.assign(result.url);
        } catch (error) {
            console.error('Failed to switch subscription tier:', error);
            this.notifyUser(error?.message || 'Unable to open Stripe checkout. Please try again.');
            if (button) {
                button.disabled = false;
                button.textContent = originalLabel;
            }
        }
    }

    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        var div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }
}

// Initialize and export
window.ModuleGallery = ModuleGallery;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    var checkAndInit = function() {
        var container = document.getElementById('moduleGalleryContainer');
        if (container) {
            var gallery = new ModuleGallery('moduleGalleryContainer');
            gallery.init();
            window.moduleGallery = gallery;
            return true;
        }
        return false;
    };

    window.addEventListener('dashboardDataReady', checkAndInit);
    checkAndInit();
});

// Initialize app
init();
