import { supabase } from '../../supabaseClient.js'
import { escapeHtml } from '../../lib/sanitize.js'
import { checkAuth, signOut, getCurrentUser } from '../../auth.js'
import { requireParentGate } from '../parentGate.js'
import { initKidIcons } from '../../lib/kidIcons.js'
import { initTelemetry } from '../../lib/telemetry.js'
import { childAvatarHTML, DD_AVATARS } from '../../lib/childAvatar.js'

// Error tracking + page view (fail-silent, self-hosted in Supabase)
initTelemetry()

// Consistent emoji artwork on every device (skips the SVG map)
initKidIcons()
import { getChildren, createChild, getModules, getChildModules, updateChildModuleStatus, awardStars, getChild, getAllChildrenLeaderboard, setChildPassword, verifyChildPassword, updateChildProfile, deleteChild, getLatestWeeklyPlan, getSettings, updateLoginStreak, getLoginStreak, isUserAdmin, isUserPractitioner, getChildFocusPlan, getSuperSkills, getModuleUnlocks, getCreditSummary, getCurrentBillingPeriod, unlockModuleWithCredit, getParentSubscription, getSubscriptionTiers, getLevelInfo, getXpForNextLevel, invalidateCacheByPrefix, getChildCredits, spendChildCredit } from '../../services/databaseService.js'
import { initializeRewardsTab, setupRewardsEventListeners } from './dashboardRewards.js'
import { showLoadingScreen, hideLoadingScreen } from './loadingScreen.js'
import { checkFocusPlan, showFocusPlanOnboarding, showFocusPlanSettings } from './focusPlan.js'
import { showElement, hideElement, setLoadingState } from '../../utils/dom.js'
import { dashboardState, setAllModulesFilters, setCategoryColors, setChildModules, setChildren, setCurrentFocusPlan, setCurrentInsightsSubtab, setCurrentPurchaseModule, setCurrentUser, setEditingChild, setIsCurrentUserAdmin, setModules, setMoreModulesCurrentIndex, setMoreModulesRotationTimer, setParentModules, setSelectedChild, setShowAllChildModules, setCurrentWeeklyPlan } from '../../state/dashboardState.js'
import { setAppState, getAppState } from '../../services/appState.js'
import { buildModuleUrl } from '../modules/moduleNavigation.js'
import { renderDevSetupMessage } from '../../ui/devSetupMessage.js'
import { maybeShowOnboarding, addHelpButton } from './onboardingWalkthrough.js'
import { initPushNotifications, removePushNotifications } from '../../services/pushNotifications.js'
import { initNativeApp } from '../../services/nativeApp.js'
import { hasStreakPopupBeenShownToday, markStreakPopupAsShown, maybeCelebrateFirstStar, createConfettiCelebration, showStreakPopup, showLevelUpPopup, showWelcomeBackBanner } from './dashboardCelebrations.js'
import { loadCheckinOptions, setupWeeklyCheckinUI, setupParentInsightsSubtabs, setParentInsightsSubtab, checkWeeklyCheckinSettings, renderWeeklyPlan } from './dashboardCheckin.js'
import { initFamilyGoldTab, isGoldTier } from './familyGoldDashboard.js'
import { startModule } from './dashboardCheckinInterception.js'
import { setupDanielMoodCheckin, refreshMoodCheckinState, updateMoodHeroText } from './dashboardMoodCheckin.js'
import { getCurrencyFormatter } from './dashboardProfileHub.js'
import { isPractitionerSession } from './superSkillGate.js'

// Practitioner "view as client" mode: a practitioner opens a caseload child's
// dashboard read-only via /dashboard.html?childId=X&pracView=1. Reads work
// through the practitioner RLS policies; write paths are skipped.
const isPracView = new URLSearchParams(window.location.search).get('pracView') === '1'

// Practitioners see every module unlocked — no per-child credit locks.
function moduleLockedForChild(lockMap, moduleId) {
  if (isPractitionerSession()) return false
  return lockMap.get(moduleId) !== false
}

// Floating panel (bottom-right, follows scroll) shown while a practitioner
// is viewing a client's dashboard, with a one-click way back to the hub.
function showPractitionerViewBanner(child) {
  if (document.getElementById('pracViewPanel')) return
  const panel = document.createElement('div')
  panel.id = 'pracViewPanel'
  panel.style.cssText = [
    'position:fixed', 'bottom:18px', 'right:18px', 'z-index:12000',
    'background:linear-gradient(135deg,#0d9488,#14b8a6)', 'color:#fff',
    'border-radius:16px', 'padding:14px 16px', 'max-width:280px',
    'box-shadow:0 10px 30px rgba(13,148,136,.45)',
    "font-family:'Fredoka',sans-serif"
  ].join(';')

  const title = document.createElement('div')
  title.style.cssText = 'font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px;'
  title.textContent = `👁 Viewing as ${child.name || 'this child'}`

  const sub = document.createElement('div')
  sub.style.cssText = 'font-size:12px;opacity:.9;margin:4px 0 10px;line-height:1.4;'
  sub.textContent = "Practitioner view — you're seeing this client's dashboard. Changes aren't saved."

  const back = document.createElement('a')
  back.href = '/practitioner-dashboard.html'
  back.textContent = '← Back to Practitioner Hub'
  back.style.cssText = 'display:block;text-align:center;background:#fff;color:#0d9488;font-size:13px;font-weight:700;padding:9px 12px;border-radius:10px;text-decoration:none;'

  panel.append(title, sub, back)
  document.body.appendChild(panel)
}
import { showToast } from '../../ui/toast.js'

let currentCreditSummary = null
let currentBillingPeriod = getCurrentBillingPeriod()
let currentSubscription = null
let subscriptionTiers = []
const MODULES_LOADING_RETRY_LIMIT = 12
let modulesLoadingRetryCount = 0

// Make supabase available to non-module scripts and inline dashboard.html code
window.supabase = supabase

const state = dashboardState

window.state = window.state || {}
window.__danielMoodCheckinEnabled = true
window.maybeCelebrateFirstStar = maybeCelebrateFirstStar

const SELECTED_CHILD_STORAGE_PREFIX = 'dashboard:selectedChild:'

function getSelectedChildStorageKey() {
  if (!state.currentUser || !state.currentUser.id) return null
  return `${SELECTED_CHILD_STORAGE_PREFIX}${state.currentUser.id}`
}

function rememberSelectedChildId(childId) {
  const key = getSelectedChildStorageKey()
  if (!key || !childId) return
  localStorage.setItem(key, String(childId))
}

function getRememberedChildId() {
  const key = getSelectedChildStorageKey()
  if (!key) return null
  return localStorage.getItem(key)
}

function clearRememberedChildId() {
  const key = getSelectedChildStorageKey()
  if (!key) return
  localStorage.removeItem(key)
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
    crew: Object.keys(DD_AVATARS),
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
const avatarSelections = new Set()

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

  return orderedModules.find((module) => moduleLockedForChild(childModuleLockMap, module.id)) || null
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
        <div class="sales-badge">✨ ${escapeHtml(heroLabel)}</div>
        <h3 class="sales-title">${escapeHtml(module.title)}</h3>
        ${ageRange ? `<p class="sales-age">Perfect for ages ${escapeHtml(ageRange)}</p>` : ''}
        <p class="sales-description">${escapeHtml(description)}</p>
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
        <span class="module-tag">✨ ${escapeHtml(heroLabel)}</span>
        ${module?.category && module?.category !== heroLabel ? `<span class="module-tag module-tag--soft">${escapeHtml(module.category)}</span>` : ''}
      </div>
      <h3>${escapeHtml(module.title)}</h3>
      ${ageRange ? `<p class="module-age">Ages ${escapeHtml(ageRange)}</p>` : ''}
      <p class="module-description">${escapeHtml(shortDesc)}</p>
      <ul class="module-benefits">${highlightItems}</ul>
      <div class="all-module-card__footer">
        <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
          <p class="sales-price" style="margin: 0;">${priceLabel}</p>
          <p class="module-price-subtext" style="margin: 0;">${escapeHtml(module?.price_frequency || '')}</p>
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


// Tab elements
const tabDashboard = document.getElementById('tabDashboard')
const tabAdventures = document.getElementById('tabAdventures')
const tabModules = document.getElementById('tabModules')
const tabLeaderboard = document.getElementById('tabLeaderboard')
const tabArcade = document.getElementById('tabArcade')
const tabSpendStars = document.getElementById('tabSpendStars')
const tabParentInsights = document.getElementById('tabParentInsights')
const familyGoldTabContent = document.getElementById('familyGoldTabContent')
const dashboardTabContent = document.getElementById('dashboardTabContent')
const adventuresTabContent = document.getElementById('adventuresTabContent')
const modulesTabContent = document.getElementById('modulesTabContent')
const leaderboardTabContent = document.getElementById('leaderboardTabContent')
const arcadeTabContent = document.getElementById('arcadeTabContent')
const spendStarsTabContent = document.getElementById('spendStarsTabContent')
const parentInsightsTabContent = document.getElementById('parentInsightsTabContent')
const leaderboardList = document.getElementById('leaderboardList')

// Feature flags
const FEATURE_FLAGS = {
  leaderboard: false // Set to true to show the Leaderboard tab
}

// Practitioner invite redemption: families arrive from signup/login with an
// invite code (?invite=CODE, stashed in localStorage). Redeeming links their
// children to the inviting practitioner's caseload.
async function redeemPendingPractitionerInvite() {
  try {
    const params = new URLSearchParams(window.location.search)
    const urlCode = params.get('invite')
    if (urlCode) localStorage.setItem('dd_practitioner_invite', urlCode)
    const code = localStorage.getItem('dd_practitioner_invite')
    if (!code) return

    const { data, error } = await supabase.rpc('redeem_practitioner_invite', { p_code: code })
    if (error) {
      // Invalid/expired codes are cleared so we don't retry forever;
      // "add a child first" is retried on the next visit.
      if (!/child profile/i.test(error.message || '')) {
        localStorage.removeItem('dd_practitioner_invite')
      }
      console.warn('Practitioner invite not redeemed:', error.message)
      return
    }
    localStorage.removeItem('dd_practitioner_invite')
    const name = data?.practitioner_name || 'your practitioner'
    showToast(`You're now connected with ${name}. They can see module progress to support your child.`, 'success', 8000)
  } catch (err) {
    console.warn('Practitioner invite redemption failed:', err)
  }
}

// Initialize - OPTIMIZED for performance
async function init() {
  if (renderDevSetupMessage('dashboardRoot')) return
  // Show fun loading screen
  showLoadingScreen()
  
  // Safety timeout in case something hangs
  const loadingTimeout = setTimeout(() => {
    console.warn('Loading timeout reached - forcing UI to show')
    hideLoadingScreen()
    showElement(childrenView)
  }, 12000)
  
  try {
    // Check authentication first (required before anything else)
    const session = await checkAuth()

    if (!session) {
      clearTimeout(loadingTimeout)
      window.location.href = '/login.html'
      return
    }

    // Use user from session (already available - avoids slow getUser() network call)
    setCurrentUser(session.user)
    window.state.currentUser = state.currentUser

    // Set up native app (status bar, splash screen) + push notifications (no-op on web)
    initNativeApp()
    initPushNotifications()

    // Link this family to a practitioner if they arrived with an invite code
    // (not when a practitioner is only viewing a client's dashboard)
    if (!isPracView) redeemPendingPractitionerInvite()

    if (state.currentUser && state.currentUser.email) {
      headerSubtitle.textContent = `Welcome back, ${state.currentUser.email}!`
    }

    // CRITICAL PATH - only fetch what's needed to show the dashboard
    currentBillingPeriod = getCurrentBillingPeriod()

    const [
      modulesResult,
      parentModulesResult,
      creditUnlocksResult,
      childrenResult
    ] = await Promise.allSettled([
      getModules(),
      supabase
        .from('parent_modules')
        .select('module_id, is_active, modules(id, code, title, short_description, description, category, series, cycle_id, super_skill_id, sub_skill_id, week_number, age_range, is_active, created_at, is_multi_age)')
        .eq('parent_id', state.currentUser.id),
      getModuleUnlocks(state.currentUser.id, currentBillingPeriod.periodStart, currentBillingPeriod.periodEnd),
      getChildren(state.currentUser.id)
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

    // Process children
    if (childrenResult.status === 'fulfilled') {
      setChildren(childrenResult.value || [])
    } else {
      console.error('Error loading children:', childrenResult.reason)
      setChildren([])
    }

    // Update global variables for enhanced dashboard
    window.modules = state.modules
    setAppState('modules', state.modules)
    window.parentModules = state.parentModules

    // Setup category colors with defaults - real colors load in background
    setCategoryColors({})
    setupCategoryColors()

    // Setup filters (batch DOM operations)
    requestAnimationFrame(() => {
      setupAllWorkbooksFilter()
      setupDashboardFilters()
      renderChildren()
    })

    // DEFERRED - load non-critical data in background (doesn't block UI)
    Promise.allSettled([
      state.selectedChild?.id ? getChildCredits(state.selectedChild.id) : Promise.resolve(0),
      supabase.from('category_colors').select('*'),
      isUserAdmin(state.currentUser.id),
      getParentSubscription(state.currentUser.id),
      getSubscriptionTiers(),
      isUserPractitioner(state.currentUser.id)
    ]).then(([creditSummaryResult, categoryColorsResult, adminResult, subscriptionResult, tiersResult, practitionerResult]) => {
      currentCreditSummary = creditSummaryResult.status === 'fulfilled' ? { credits_available: creditSummaryResult.value } : { credits_available: 0 }
      currentSubscription = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null
      subscriptionTiers = tiersResult.status === 'fulfilled' ? (tiersResult.value || []) : []
      updateCreditWalletBadge()

      // Hide Parent Insights tab if tier doesn't include it
      const userTierConfig = subscriptionTiers.find(t => t.tier === currentSubscription?.tier)
      if (userTierConfig && userTierConfig.includes_parent_insights === false) {
        if (tabParentInsights) tabParentInsights.style.display = 'none'
        const piMobile = document.getElementById('parentInsightsButtonMobile')
        if (piMobile) piMobile.style.display = 'none'
      }

      // Family Gold hub: visible only on a Gold membership. It lives in the
      // grown-up header (not the kids' tab bar) and is the default view when
      // the parent lands, unless they've already navigated themselves.
      if (isGoldTier(currentSubscription)) {
        const fgDesktop = document.getElementById('familyGoldButtonDesktop')
        const fgMobile = document.getElementById('familyGoldButtonMobile')
        if (fgDesktop) fgDesktop.style.display = ''
        if (fgMobile) fgMobile.style.display = ''
        if (!window.__ddUserChoseTab || !window.__ddUserChoseTab()) {
          showTab('familyGold')
        }
      }

      if (categoryColorsResult.status === 'fulfilled' && categoryColorsResult.value.data) {
        const colors = {}
        categoryColorsResult.value.data.forEach(cc => {
          if (cc?.category && cc?.color) colors[cc.category] = cc.color
        })
        setCategoryColors(colors)
        setupCategoryColors()
      }

      if (adminResult.status === 'fulfilled') {
        setIsCurrentUserAdmin(adminResult.value || false)
        if (state.isCurrentUserAdmin) {
          const adminButton = document.getElementById('adminButton')
          const adminButtonDesktop = document.getElementById('adminButtonDesktop')
          if (adminButton) adminButton.style.display = 'block'
          if (adminButtonDesktop) showElement(adminButtonDesktop)
          showAdminDropdownWrap()
        }
      }

      // Show Schools Program button for admins and practitioners (only if feature flag is on)
      const isPractitioner = practitionerResult.status === 'fulfilled' && practitionerResult.value

      // Stamp practitioner status for the super-skill gate (practitioners see
      // the whole adventure map unlocked) and re-render the map if it painted
      // with locks before this resolved.
      try {
        const prev = sessionStorage.getItem('dd_is_practitioner')
        sessionStorage.setItem('dd_is_practitioner', isPractitioner ? '1' : '0')
        if (isPractitioner && prev !== '1') {
          // The map may have painted with locks before this resolved.
          if (typeof window.initBrainTown === 'function') window.initBrainTown()
          const map = window.enhancedDashboard?.adventureMap
          if (map && typeof map.render === 'function') map.render()
        }
      } catch { /* private mode */ }
      if (state.isCurrentUserAdmin || isPractitioner) {
        getSettings().then(settings => {
          if (settings?.feature_flags?.schools_program_enabled) {
            const schoolsButton = document.getElementById('schoolsButton')
            const schoolsButtonDesktop = document.getElementById('schoolsButtonDesktop')
            if (schoolsButton) schoolsButton.style.display = 'block'
            if (schoolsButtonDesktop) showElement(schoolsButtonDesktop)
            showAdminDropdownWrap()
          }
        }).catch(() => { /* flag defaults to off */ })
      }

      // Show Practitioner Hub button for practitioners
      if (isPractitioner) {
        const practiceHubButton = document.getElementById('practiceHubButton')
        const practiceHubButtonDesktop = document.getElementById('practiceHubButtonDesktop')
        if (practiceHubButton) practiceHubButton.style.display = 'block'
        if (practiceHubButtonDesktop) showElement(practiceHubButtonDesktop)
        showAdminDropdownWrap()
      }
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

    // Practitioner viewing a caseload child: the child isn't in this user's
    // own list, but the practitioner RLS read policy lets us fetch it by id.
    if (childIdFromUrl && isPracView && isPractitionerSession()) {
      const { data: clientChild } = await supabase
        .from('children')
        .select('*')
        .eq('id', childIdFromUrl)
        .maybeSingle()
      if (clientChild) {
        showPractitionerViewBanner(clientChild)
        await selectChild(clientChild)
        if (tabFromUrl) showTab(tabFromUrl)
        clearTimeout(loadingTimeout)
        return
      }
    }

    // No childId in URL: restore remembered child or auto-select the only child.
    if (state.children && state.children.length === 1) {
      await selectChild(state.children[0])
      clearTimeout(loadingTimeout)
      return
    }

    const rememberedChildId = getRememberedChildId()
    if (rememberedChildId && state.children && state.children.length > 1) {
      const rememberedChild = state.children.find(c => String(c.id) === String(rememberedChildId))
      if (rememberedChild) {
        await selectChild(rememberedChild)
        clearTimeout(loadingTimeout)
        return
      }
      clearRememberedChildId()
    }
    
    // If multiple children and no remembered child, auto-select the first one
    if (state.children && state.children.length > 0) {
      await selectChild(state.children[0])
      clearTimeout(loadingTimeout)
      return
    }

    // No children - redirect to profile page with a flag so it auto-opens the Add Child modal
    showLoadingScreen()
    window.location.href = '/profile.html?addChild=1&reason=no-child'
    clearTimeout(loadingTimeout)
    
  } catch (error) {
    console.error('Initialization error:', error)
    console.error('Error stack:', error.stack)
    clearTimeout(loadingTimeout)
    // Redirect to profile page on error
    hideLoadingScreen()
    showToast('Some data failed to load. Redirecting to profile page.', 'error')
    window.location.href = '/profile.html'
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
  // Practitioners never buy credits — everything is already unlocked for
  // them, so the wallet and buy prompts are hidden entirely.
  if (isPractitionerSession()) {
    if (creditWalletBadge) hideElement(creditWalletBadge)
    const pracBuyBtn = document.getElementById('buyCreditsBtn')
    if (pracBuyBtn) pracBuyBtn.style.display = 'none'
    return
  }
  const creditsAvailable = currentCreditSummary?.credits_available ?? 0
  creditWalletValue.textContent = String(creditsAvailable)
  if (creditWalletBadge) {
    creditWalletBadge.classList.toggle('credit-wallet--empty', creditsAvailable <= 0)
  }
  const buyBtn = document.getElementById('buyCreditsBtn')
  if (buyBtn) {
    buyBtn.style.display = creditsAvailable <= 0 ? 'inline-block' : 'none'
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
  // Don't hide the loading screen here — it gets hidden after selectChild() completes
  // or in showChildrenView() when there are multiple children to choose from.

  if (!childrenGrid) return
  
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
    <div class="child-avatar-wrap">
      <button class="child-card-edit-btn" type="button" title="Edit child" aria-label="Edit ${escapeHtml(child.name)}">✏️</button>
      <div class="child-avatar">${childAvatarHTML(avatar)}</div>
    </div>
    <div class="child-name">${escapeHtml(child.name)}</div>
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
    // Ensure loading screen is visible (but don't re-render if already showing)
    const ls = document.getElementById('loadingState')
    if (ls && ls.classList.contains('hidden')) showLoadingScreen()
    
    try {
      await selectChild(child)
    } catch (error) {
      console.error('Error selecting child:', error)
      hideLoadingScreen()
      showToast('Failed to load child dashboard. Please try again.', 'error')
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
      if (avatarSelections.has(emoji)) {
        avatarSelections.delete(emoji)
        button.classList.remove('selected')
      } else {
        avatarSelections.add(emoji)
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
                    <div class="avatar-category-label crew-label">Brain Town Crew</div>
                    <div class="avatar-picker-fun avatar-picker-crew" id="avatarPickerCrew"></div>
                </div>

                <div class="avatar-category">
                    <div class="avatar-category-label">Cool Animals</div>
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
    <div class="modal-header-fun modal-header-sky">
        <button type="button" class="close-btn-fun" id="closeAddModalBtn" aria-label="Close">✕</button>
        <div class="header-cloud header-cloud-1"></div>
        <div class="header-cloud header-cloud-2"></div>
        <img src="/images/characters/DanielTheDogThumbsUp.webp" alt="" class="header-daniel" draggable="false">
        <h2 class="modal-title-fun">Add your explorer</h2>
        <p class="modal-subtitle-fun">Daniel can't wait to meet them!</p>

        <div class="avatar-preview-wrapper">
            <div class="avatar-preview-circle" id="addAvatarPreviewCircle">🦊</div>
        </div>
    </div>

    <div class="modal-body-fun">
        <div id="modalError" class="error-message hidden" role="alert"></div>

        <form id="addChildForm" novalidate>
            <div class="form-group-fun">
                <label class="form-label-fun" for="childName">
                    <span class="form-label-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></span>
                    Their name (or nickname)
                </label>
                <input type="text" id="childName" class="form-input-fun" placeholder="e.g. Charlie" maxlength="40" autocomplete="off" required>
                <p class="form-hint-fun">A first name or nickname is perfect — this is what Daniel will call them.</p>
            </div>

            <div class="form-group-fun">
                <label class="form-label-fun" for="childDob">
                    <span class="form-label-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0 2-.8 2.5-.4"/><path d="M12 6v5"/><path d="M12 2c.5 1 .5 2 0 3"/></svg></span>
                    Date of birth
                </label>
                <input type="date" id="childDob" class="form-input-fun" required>
                <p class="form-hint-fun">We use their age to pick the right level for games and modules.</p>
            </div>

            <div class="avatar-section-fun" id="addAvatarSectionFun">
                <div class="avatar-section-head">
                    <div>
                        <h3 class="avatar-section-title">Pick their avatar</h3>
                        <p class="avatar-section-subtitle">They can change it any time</p>
                    </div>
                    <button type="button" class="avatar-shuffle-btn" id="addAvatarShuffle">Surprise me!</button>
                </div>

                <div class="avatar-category">
                    <div class="avatar-category-label crew-label">Brain Town Crew</div>
                    <div class="avatar-picker-fun avatar-picker-crew" id="addAvatarPickerCrew"></div>
                </div>

                <div class="avatar-category">
                    <div class="avatar-category-label">Cool Animals</div>
                    <div class="avatar-picker-fun" id="addAvatarPickerAnimals"></div>
                </div>

                <div class="avatar-category">
                    <div class="avatar-category-label">Magical Creatures</div>
                    <div class="avatar-picker-fun" id="addAvatarPickerMagical"></div>
                </div>

                <div class="avatar-category">
                    <div class="avatar-category-label">Super Heroes</div>
                    <div class="avatar-picker-fun" id="addAvatarPickerHeroes"></div>
                </div>

                <div class="avatar-category">
                    <div class="avatar-category-label">Space & Adventure</div>
                    <div class="avatar-picker-fun" id="addAvatarPickerSpace"></div>
                </div>

                <input type="hidden" id="addChildAvatar">
            </div>

            <div class="modal-buttons-fun">
                <button type="button" class="btn-fun btn-secondary-fun" id="cancelAddChild">Maybe later</button>
                <button type="submit" class="btn-fun btn-primary-fun" id="addChildSubmitBtn"><span>✨</span> Start their adventure</button>
            </div>
        </form>
    </div>
    `;
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
    const submitBtn = document.getElementById('addChildSubmitBtn');

    const showError = (message) => {
        modalError.textContent = message;
        showElement(modalError);
        modalError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    const name = document.getElementById('childName').value.trim();
    const dob = document.getElementById('childDob').value;
    const avatar = document.getElementById('addChildAvatar').value || '🦊';

    // Specific, friendly validation — never a generic "fill in all fields"
    if (!name) {
        showError("What should Daniel call them? Add a name or nickname to continue.");
        document.getElementById('childName').focus();
        return;
    }
    if (!dob) {
        showError('Add their date of birth so we can match games and modules to their age.');
        document.getElementById('childDob').focus();
        return;
    }
    const dobDate = new Date(dob);
    if (dobDate > new Date()) {
        showError("That birthday is in the future — double-check the date.");
        document.getElementById('childDob').focus();
        return;
    }

    hideElement(modalError);

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>⏳</span> Creating their profile…';
        }

        const newChild = await createChild(state.currentUser.id, name, dob, avatar);
        setChildren([...state.children, newChild]);
        renderChildren();
        createConfettiCelebration();
        hideAddChildModal();

        // Auto-select the new child and scroll to modules so they can start immediately
        await selectChild(newChild);
        setTimeout(() => {
            const modulesSection = document.getElementById('modulesList') || document.getElementById('modulesSection');
            if (modulesSection) modulesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 600);

    } catch (error) {
        console.error('Error creating child:', error);
        showError(error.message || "We couldn't save their profile — please try again.");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>✨</span> Start their adventure';
        }
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

    // "Surprise me": pick a random avatar and highlight it in the grid
    document.getElementById('addAvatarShuffle')?.addEventListener('click', () => {
        const current = document.getElementById('addChildAvatar')?.value;
        let next = current;
        while (next === current) {
            next = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
        }
        document.querySelectorAll('#addAvatarSectionFun .avatar-option-fun').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.avatar === next);
        });
        const hidden = document.getElementById('addChildAvatar');
        const preview = document.getElementById('addAvatarPreviewCircle');
        if (hidden) hidden.value = next;
        if (preview) {
            preview.innerHTML = childAvatarHTML(next);
            preview.style.transform = 'scale(1.18) rotate(8deg)';
            setTimeout(() => { preview.style.transform = ''; }, 200);
        }
    });

    // DOB can't be in the future
    const dobInput = document.getElementById('childDob');
    if (dobInput) dobInput.max = new Date().toISOString().slice(0, 10);
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

// Render the avatar picker into a modal. Both the edit modal
// (avatarPicker*/avatarPreviewCircle/editChildAvatar) and the add modal
// (addAvatarPicker*/addAvatarPreviewCircle/addChildAvatar) use this —
// previously the add modal's picker was never rendered at all because
// the renderer only knew the edit modal's element ids.
function renderModalAvatarPicker({ pickerPrefix, previewId, hiddenInputId, selectedAvatar }) {
  const categories = ['crew', 'animals', 'magical', 'heroes', 'space']

  const setSelection = (emoji) => {
    const hidden = document.getElementById(hiddenInputId)
    const preview = document.getElementById(previewId)
    if (hidden) hidden.value = emoji
    if (preview) {
      preview.innerHTML = childAvatarHTML(emoji)
      // Little pop so the choice feels alive
      preview.style.transform = 'scale(1.18)'
      setTimeout(() => { preview.style.transform = '' }, 180)
    }
  }

  categories.forEach(category => {
    const idSuffix = category.charAt(0).toUpperCase() + category.slice(1)
    const pickerElement = document.getElementById(`${pickerPrefix}${idSuffix}`)
    if (!pickerElement) return

    pickerElement.innerHTML = ''
    avatarCategories[category].forEach(emoji => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'avatar-option-fun'
      button.setAttribute('aria-label', `Choose ${DD_AVATARS[emoji]?.name || emoji} avatar`)
      button.dataset.avatar = emoji
      if (selectedAvatar === emoji) {
        button.classList.add('selected')
      }
      button.innerHTML = childAvatarHTML(emoji)
      button.addEventListener('click', () => {
        // Only clear selections inside THIS modal's picker groups
        categories.forEach(cat => {
          const suffix = cat.charAt(0).toUpperCase() + cat.slice(1)
          document.getElementById(`${pickerPrefix}${suffix}`)
            ?.querySelectorAll('.avatar-option-fun')
            .forEach(btn => btn.classList.remove('selected'))
        })
        button.classList.add('selected')
        setSelection(emoji)
      })
      pickerElement.appendChild(button)
    })
  })

  setSelection(selectedAvatar || '🦊')
}

// Back-compat wrapper for the EDIT modal
function renderEnhancedAvatarPicker(selectedAvatar) {
  renderModalAvatarPicker({
    pickerPrefix: 'avatarPicker',
    previewId: 'avatarPreviewCircle',
    hiddenInputId: 'editChildAvatar',
    selectedAvatar
  })
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
    const SAFETY_TIMEOUT = 10000
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
  
  // Everything below only needs child.id, so all four queries leave
  // together — one round-trip of latency instead of three sequential ones.
  const freshChildPromise = supabase
    .from('children')
    .select('*')
    .eq('id', child.id)
    .single()
  const criticalBatch = Promise.allSettled([
    getChildModules(child.id),
    checkFocusPlan(child.id),
    getChildCredits(child.id),
    refreshMoodCheckinState(child.id)
  ])

  // Fresh child data ensures we have latest level/XP values
  try {
    const { data: freshChild, error } = await freshChildPromise
    if (!error && freshChild) {
      child = freshChild
    }
  } catch (err) {
    console.warn('Could not fetch fresh child data:', err)
  }

  setSelectedChild(child)
  setAppState('selectedChild', child)
  rememberSelectedChildId(child.id)
  maybeCelebrateFirstStar(child)

  // Level-up detection: compare current level to last known level
  const currentLevel = child.level || 1
  const levelKey = `lastKnownLevel_child_${child.id}`
  const lastKnownLevel = parseInt(localStorage.getItem(levelKey) || '0')
  if (lastKnownLevel > 0 && currentLevel > lastKnownLevel) {
    // Wait until loading screen is hidden, then show after a brief pause
    const showLevelUp = () => setTimeout(() => showLevelUpPopup(child.name, currentLevel), 400)
    const loadingEl = document.getElementById('loadingState')
    if (loadingEl && !loadingEl.classList.contains('hidden')) {
      const obs = new MutationObserver(() => {
        if (loadingEl.classList.contains('hidden')) { obs.disconnect(); showLevelUp() }
      })
      obs.observe(loadingEl, { attributes: true, attributeFilter: ['class'] })
      setTimeout(() => { obs.disconnect() }, 12000)
    } else {
      showLevelUp()
    }
  }
  localStorage.setItem(levelKey, String(currentLevel))
  
  try {
    // CRITICAL PATH - the batch has been in flight since selectChild began
    const [childModulesResult, focusPlanResult, childCreditsResult] = await criticalBatch

    // Process child modules
    if (childModulesResult.status === 'fulfilled') {
      setChildModules(childModulesResult.value || [])
    } else {
      console.error('Error loading child modules:', childModulesResult.reason)
      setChildModules([])
    }

    // Process focus plan
    if (focusPlanResult.status === 'fulfilled') {
      setCurrentFocusPlan(focusPlanResult.value)
    } else {
      setCurrentFocusPlan(null)
    }

    // Process child credits and update the badge
    if (childCreditsResult.status === 'fulfilled') {
      currentCreditSummary = { credits_available: childCreditsResult.value }
    } else {
      currentCreditSummary = { credits_available: 0 }
    }
    updateCreditWalletBadge()

    // Setup rewards event listeners for this child (non-blocking)
    setupRewardsEventListeners(child)

    // Initialize daily quest system for this child
    if (typeof window.initDailyQuest === 'function') {
      window.initDailyQuest(child.id)
    }

    // Mood check-in state already loaded in the critical batch above
    setupDanielMoodCheckin()

    // ... (rest of the code remains the same)
    
    // DEFERRED - weekly plan, streak, and leaderboard data load in background
    Promise.allSettled([
      loadLatestWeeklyPlanData(child.id),
      (state.currentUser && !isPracView) ? updateLoginStreak(state.currentUser.id, child.id) : Promise.reject('Streak not recorded (practitioner view or no user)')
    ]).then(([weeklyPlanResult, streakResult]) => {
      if (weeklyPlanResult.status === 'fulfilled') {
        setCurrentWeeklyPlan(weeklyPlanResult.value)
        renderWeeklyPlan(state.currentWeeklyPlan)
      }
      if (streakResult.status === 'fulfilled') {
        const streakData = streakResult.value
        if (streakData) {
          const dayStreakEl = document.getElementById('dayStreak')
          if (dayStreakEl) dayStreakEl.textContent = streakData.current_streak ?? 0

          // Queue popups to show AFTER loading screen is fully hidden.
          // Practitioners touring a dashboard (their demo child or a client)
          // are not the child — no streak or welcome-back celebrations.
          const showAfterLoad = () => {
            if (isPractitionerSession()) return
            // Show streak popup for day 1+ (encourage from the very start)
            if (streakData.current_streak >= 1 && !hasStreakPopupBeenShownToday(child.id)) {
              markStreakPopupAsShown(child.id)
              showStreakPopup(child.name, streakData.current_streak)
            }

            // Welcome back message if they've been away
            if (streakData._previousLoginDate) {
              const today = new Date()
              const prevLogin = new Date(streakData._previousLoginDate)
              const daysAway = Math.floor((today - prevLogin) / (1000 * 60 * 60 * 24))
              if (daysAway >= 3) {
                showWelcomeBackBanner(child.name, daysAway)
              }
            }
          }

          // Wait until loading screen is gone before showing popups
          const loadingEl = document.getElementById('loadingState')
          if (loadingEl && !loadingEl.classList.contains('hidden')) {
            const observer = new MutationObserver(() => {
              if (loadingEl.classList.contains('hidden')) {
                observer.disconnect()
                setTimeout(showAfterLoad, 600)
              }
            })
            observer.observe(loadingEl, { attributes: true, attributeFilter: ['class'] })
            // Safety fallback
            setTimeout(() => { observer.disconnect(); showAfterLoad() }, 12000)
          } else {
            setTimeout(showAfterLoad, 600)
          }
        }
      }
    })

    // The "What matters most?" focus-plan onboarding is a parent decision —
    // practitioners viewing a dashboard skip it (the map fails open without
    // a plan and every Super Skill is unlocked for them anyway).
    if (!state.currentFocusPlan && !isPractitionerSession()) {
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
        addHelpButton()

        // Wait for adventure map to finish rendering before hiding loading screen
        await waitForDashboardRender()
        hideLoadingScreen()

        // Show app walkthrough for first-time users after focus plan is set
        maybeShowOnboarding(child.id)
      })
      return // Don't show detail view yet - wait for onboarding
    }

    // Show child detail view, then wait for adventure map to finish rendering
    showChildDetailView(child)
    renderModules()
    addHelpButton()
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
    // On error, hide loading screen immediately (don't wait for map)
    hideLoadingScreen()
    window._dashboardRenderComplete = null
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
  const childrenWelcomeHeader = document.getElementById('childrenWelcomeHeader')
  const childrenSelectionSection = document.getElementById('childrenSelectionSection')

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

  const hasDefaultChild = Boolean(state.selectedChild)
  const shouldShowSelector = !hasDefaultChild && Array.isArray(state.children) && state.children.length > 1

  if (childrenWelcomeHeader) {
    childrenWelcomeHeader.style.display = shouldShowSelector ? '' : 'none'
  }
  if (childrenSelectionSection) {
    childrenSelectionSection.style.display = shouldShowSelector ? '' : 'none'
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

// Show parent view (profile hub) - now navigates to separate profile page
function showParentView() {
  showLoadingScreen()
  window.location.href = '/profile.html'
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
          <h3 class="module-title">${escapeHtml(module.title)}</h3>
          ${ageRange ? `<div class="module-subtitle" style="font-weight: 600;">Ages ${escapeHtml(ageRange)}</div>` : ''}
          ${shortDescription ? `<p class="module-subtitle" style="margin-top: 4px;">${escapeHtml(shortDescription)}</p>` : ''}
          <p class="module-subtitle" style="margin-top: 8px; color: ${options.locked ? '#9ca3af' : '#4c6c96'};">
            ${statusText} • Code: ${escapeHtml(module.code)}
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
  
  // Apply focus plan's default super skill or pathway to adventure map
  // (must happen before rendering so the map picks up the right category)
  if (state.currentFocusPlan && (state.currentFocusPlan.super_skill_id || state.currentFocusPlan.default_pathway_id)) {
    applyFocusPlanToMap(state.currentFocusPlan)
  }

  // Show/setup Focus Plan settings button
  setupFocusPlanSettingsButton()

  // Batch DOM writes - show the container first, then render the map
  // inside the same frame so the map's container is guaranteed to be visible
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
    updateMoodHeroText()

    // Re-sync globals in case they were updated between
    // the synchronous set and this rAF callback (e.g. after module unlock)
    window.childModules = state.childModules
    if (state.modules && state.modules.length > 0) {
      window.modules = state.modules
    }

    // Refresh enhanced dashboard now that the container is visible
    if (typeof window.refreshEnhancedDashboard === 'function') {
      window.refreshEnhancedDashboard()
    }

    // Notify Brain Town that child data is ready
    window.dispatchEvent(new CustomEvent('childSelected', { detail: { childId: child.id } }))
  })
  
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
    // So we do NOT directly set currentCategory on the map here -
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
    if (modulesLoadingRetryCount >= MODULES_LOADING_RETRY_LIMIT) {
      modulesGrid.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #4c6c96;">
          <div style="font-size: 18px; margin-bottom: 12px;">Modules are taking longer than expected.</div>
          <div style="font-size: 14px;">Please refresh to sync the latest progress.</div>
        </div>
      `
      return
    }

    modulesLoadingRetryCount += 1
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

  modulesLoadingRetryCount = 0
  
  modulesGrid.innerHTML = ''
  modulesGrid.style.display = 'block'
  
  

  // Series tabs removed - now using dropdown filters instead
  
  // Get selected filters
  const selectedCategory = dashboardCategoryFilter ? dashboardCategoryFilter.value : 'all'
  const selectedSeries = dashboardSeriesFilter ? dashboardSeriesFilter.value : 'all'
  
  const childModulesById = new Map()
  const childModuleLockMap = new Map()
  state.childModules.forEach((cm) => {
    childModulesById.set(cm.module_id, cm)
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

  const unlockedModules = visibleModules.filter((module) => !moduleLockedForChild(childModuleLockMap, module.id))
  const lockedModules = visibleModules.filter((module) => moduleLockedForChild(childModuleLockMap, module.id))

  // Separate completed and incomplete modules for modules the family has unlocked
  const incompleteModules = unlockedModules.filter(module => {
    const childModule = childModulesById.get(module.id)
    return !childModule || childModule.is_completed !== true
  })

  const completedModules = unlockedModules.filter(module => {
    const childModule = childModulesById.get(module.id)
    return childModule && childModule.is_completed === true
  })

  const contentFragment = document.createDocumentFragment()

  if (unlockedModules.length === 0 && lockedModules.length > 0) {
    const emptyUnlockedMessage = document.createElement('div')
    emptyUnlockedMessage.style.gridColumn = '1 / -1'
    emptyUnlockedMessage.style.textAlign = 'center'
    emptyUnlockedMessage.style.padding = '16px'
    emptyUnlockedMessage.style.color = '#4c6c96'
    emptyUnlockedMessage.innerHTML = '<p style="font-size: 16px; margin: 0;">All modules are currently locked. Spend a credit on any module below to unlock it.</p>'
    contentFragment.appendChild(emptyUnlockedMessage)
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
      
      const highlightedCard = createModuleCard(oldestIncompleteModule, { childModule: childModulesById.get(oldestIncompleteModule.id) })
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
      const moduleCard = createModuleCard(module, { childModule: childModulesById.get(module.id) })
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

    contentFragment.appendChild(incompleteSection)
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
      const moduleCard = createModuleCard(module, { childModule: childModulesById.get(module.id) })
      completedGrid.appendChild(moduleCard)
    })
    
    completedSection.appendChild(completedGrid)
    contentFragment.appendChild(completedSection)
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
      lockedGrid.appendChild(createModuleCard(module, {
        locked: true,
        canUnlock: isModuleNextUnlockable(module),
        childModule: childModulesById.get(module.id)
      }))
    })

    lockedSection.appendChild(lockedHeader)
    lockedSection.appendChild(lockedHint)
    lockedSection.appendChild(lockedGrid)
    contentFragment.appendChild(lockedSection)
  }

  modulesGrid.appendChild(contentFragment)
}

// Create module card
function createModuleCard(module, options = {}) {
  const card = document.createElement('div')

  const isLocked = Boolean(options.locked)
  const canUnlock = options.canUnlock !== false

  // Check if module is completed
  const childModule = options.childModule ?? state.childModules.find(cm => cm.module_id === module.id)
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
        <h3 class="module-title">${escapeHtml(module.title)}</h3>
        ${badges ? `<div style="margin-top: 6px; margin-bottom: 4px;">${badges}</div>` : ''}
        ${ageRange ? `<div class="module-subtitle" style="font-weight: 600;">Ages ${escapeHtml(ageRange)}</div>` : ''}
        ${shortDescription ? `<p class="module-subtitle" style="margin-top: 4px;">${escapeHtml(shortDescription)}</p>` : ''}
        <p class="module-subtitle" style="margin-top: 8px;">
          ${isLocked ? (canUnlock ? 'Locked - spend 1 credit to unlock' : 'Locked - start with the first lock') : (isCompleted ? 'Completed' : 'Ready to start')}
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

    // Reset the submit button in case a previous attempt left it disabled
    const submitBtn = document.getElementById('addChildSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>✨</span> Start their adventure';
    }

    // A random starting avatar makes the picker feel alive (and the
    // "surprise me" shuffle keeps hesitant kids moving)
    const randomAvatar = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
    renderModalAvatarPicker({
        pickerPrefix: 'addAvatarPicker',
        previewId: 'addAvatarPreviewCircle',
        hiddenInputId: 'addChildAvatar',
        selectedAvatar: randomAvatar
    });
    // Mark the random pick as selected in the grid
    document.querySelectorAll('#addAvatarSectionFun .avatar-option-fun').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.avatar === randomAvatar);
    });

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

      // Spend 1 credit from the child's balance
      await spendChildCredit(state.selectedChild.id)

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

        // Immediately update local child modules so the adventure map
        // reflects the unlock even if the DB re-fetch returns stale data
        const updatedChildModules = (state.childModules || []).slice()
        const existingIdx = updatedChildModules.findIndex(cm => cm.module_id === state.currentPurchaseModule.id)
        if (existingIdx >= 0) {
          updatedChildModules[existingIdx] = { ...updatedChildModules[existingIdx], locked: false }
        } else {
          updatedChildModules.push({
            child_id: state.selectedChild.id,
            module_id: state.currentPurchaseModule.id,
            locked: false
          })
        }
        setChildModules(updatedChildModules)
        window.childModules = updatedChildModules
      }

      // Invalidate child modules cache so selectChild fetches fresh data
      if (state.selectedChild?.id) {
        invalidateCacheByPrefix(`childModules:${state.selectedChild.id}`)
      }

      // Run all refresh queries in parallel - these are independent
      const [creditResult, legacyResult, unlocksResult] = await Promise.all([
        getChildCredits(state.selectedChild.id),
        supabase
          .from('parent_modules')
          .select('module_id, is_active, modules(*)')
          .eq('parent_id', state.currentUser.id),
        getModuleUnlocks(
          state.currentUser.id,
          currentBillingPeriod.periodStart,
          currentBillingPeriod.periodEnd
        )
      ])

      currentCreditSummary = { credits_available: creditResult }
      updateCreditWalletBadge()

      const mergedMap = new Map()
      ;[(legacyResult.data || []), ...(unlocksResult || []).map(entry => ({
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

      // Re-render adventure map immediately with the local state we already updated
      // (skipping selectChild which would make 3+ redundant DB calls)
      if (window.enhancedDashboard && window.enhancedDashboard.adventureMap) {
        window.enhancedDashboard.adventureMap.render()
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
      showToast(`${state.editingChild.name} has been removed successfully.`, 'success')
      
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

// Back button - go to profile page
if (backButton) {
  backButton.addEventListener('click', () => {
    showLoadingScreen()
    window.location.href = '/profile.html'
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
    const fallbackChild = state.selectedChild ||
      (state.children && state.children.length === 1 ? state.children[0] : null) ||
      (state.children && state.children.find(child => String(child.id) === String(getRememberedChildId())))

    if (fallbackChild) {
      window.location.href = `/dashboard.html?childId=${fallbackChild.id}`
    } else {
      window.location.href = '/dashboard.html'
    }
  })
}

if (profileButtonDesktop) {
  profileButtonDesktop.addEventListener('click', () => {
    showLoadingScreen()
    window.location.href = '/profile.html'
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
      clearRememberedChildId()
      await removePushNotifications()
      await signOut()
      window.location.href = '/login.html'
    } catch (error) {
      console.error('Logout error:', error)
      showToast('Failed to logout. Please try again.', 'error')
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

const schoolsButtonDesktop = document.getElementById('schoolsButtonDesktop')
if (schoolsButtonDesktop) {
  schoolsButtonDesktop.addEventListener('click', () => {
    window.location.href = '/schools-dashboard.html'
  })
}

const schoolsButton = document.getElementById('schoolsButton')
if (schoolsButton) {
  schoolsButton.addEventListener('click', () => {
    window.location.href = '/schools-dashboard.html'
  })
}

const practiceHubButtonDesktopEl = document.getElementById('practiceHubButtonDesktop')
if (practiceHubButtonDesktopEl) {
  practiceHubButtonDesktopEl.addEventListener('click', () => {
    window.location.href = '/practitioner-dashboard.html'
  })
}

const practiceHubButtonEl = document.getElementById('practiceHubButton')
if (practiceHubButtonEl) {
  practiceHubButtonEl.addEventListener('click', () => {
    window.location.href = '/practitioner-dashboard.html'
  })
}

// Admin dropdown toggle
function showAdminDropdownWrap() {
  const wrap = document.getElementById('adminDropdownWrap')
  if (wrap) wrap.classList.remove('hidden')
}

const adminDropdownToggle = document.getElementById('adminDropdownToggle')
const adminDropdownMenu = document.getElementById('adminDropdownMenu')
if (adminDropdownToggle && adminDropdownMenu) {
  adminDropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation()
    adminDropdownMenu.classList.toggle('hidden')
  })
  document.addEventListener('click', () => {
    adminDropdownMenu.classList.add('hidden')
  })
  adminDropdownMenu.addEventListener('click', (e) => {
    e.stopPropagation()
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
    const fallbackChild = state.selectedChild ||
      (state.children && state.children.length === 1 ? state.children[0] : null) ||
      (state.children && state.children.find(child => String(child.id) === String(getRememberedChildId())))

    if (fallbackChild) {
      window.location.href = `/dashboard.html?childId=${fallbackChild.id}`
    } else {
      window.location.href = '/dashboard.html'
    }
  })
}

if (profileButton) {
  profileButton.addEventListener('click', () => {
    showLoadingScreen()
    window.location.href = '/profile.html'
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
      clearRememberedChildId()
      await removePushNotifications()
      await signOut()
      window.location.href = '/login.html'
    } catch (error) {
      console.error('Logout error:', error)
      showToast('Failed to logout. Please try again.', 'error')
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
  if (!tabDashboard) return

  // All tab buttons and content panels
  const allTabs = [tabDashboard, tabAdventures, tabModules, tabLeaderboard, tabArcade, tabSpendStars, tabParentInsights]
  const allContent = [dashboardTabContent, adventuresTabContent, modulesTabContent, leaderboardTabContent, arcadeTabContent, spendStarsTabContent, parentInsightsTabContent, familyGoldTabContent]

  // Remove active class from all tabs
  allTabs.forEach(t => { if (t) t.classList.remove('active') })

  // Hide all tab content
  allContent.forEach(c => hideElement(c))

  // Show selected tab
  if (tabName === 'dashboard') {
    tabDashboard.classList.add('active')
    showElement(dashboardTabContent)
  } else if (tabName === 'adventures') {
    if (tabAdventures) tabAdventures.classList.add('active')
    showElement(adventuresTabContent)
    // Re-render adventure map since it may have been hidden
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
      const map = window.enhancedDashboard?.adventureMap
      if (map && typeof map.centerOnCurrentModule === 'function') map.centerOnCurrentModule()
    }, 100)
  } else if (tabName === 'modules') {
    tabModules.classList.add('active')
    showElement(modulesTabContent)
  } else if (tabName === 'leaderboard') {
    if (tabLeaderboard) tabLeaderboard.classList.add('active')
    showElement(leaderboardTabContent)
  } else if (tabName === 'arcade') {
    if (tabArcade) tabArcade.classList.add('active')
    showElement(arcadeTabContent)
  } else if (tabName === 'spendStars') {
    if (tabSpendStars) tabSpendStars.classList.add('active')
    showElement(spendStarsTabContent)
    // Initialize rewards tab when shown
    initializeRewardsTab(state.selectedChild)
  } else if (tabName === 'parentInsights') {
    if (tabParentInsights) tabParentInsights.classList.add('active')
    showElement(parentInsightsTabContent)
    setParentInsightsSubtab(state.currentInsightsSubtab)
  } else if (tabName === 'familyGold') {
    showElement(familyGoldTabContent)
    initFamilyGoldTab(familyGoldTabContent, {
      child: state.selectedChild,
      modules: state.modules,
      childModules: state.childModules,
      onOpenKidWorld: () => showTab('dashboard')
    })
  }
}

// Expose showTab globally for Brain Town integration
window.showDashboardTab = showTab

// Tab click handlers (only add if elements exist)
if (tabDashboard) {
  tabDashboard.addEventListener('click', () => showTab('dashboard'))
}
if (tabAdventures) {
  tabAdventures.addEventListener('click', () => showTab('adventures'))
}
if (tabModules) {
  tabModules.addEventListener('click', () => showTab('modules'))
}
if (tabLeaderboard && FEATURE_FLAGS.leaderboard) {
  tabLeaderboard.style.display = ''
  tabLeaderboard.addEventListener('click', () => showTab('leaderboard'))
}
if (tabArcade) {
  tabArcade.addEventListener('click', () => showTab('arcade'))
}
if (tabSpendStars) {
  tabSpendStars.addEventListener('click', () => showTab('spendStars'))
}
// Parent Insights sits behind the Parent Zone PIN gate, so a child tapping
// around cannot read parent-facing analysis of themselves. Passing the gate
// here also covers the insights page itself (shared 15-minute window).
async function openParentInsightsGated() {
  const ok = await requireParentGate()
  if (!ok) return
  if (state.selectedChild) {
    window.location.href = `/parent-insights.html?childId=${state.selectedChild.id}`
  } else {
    window.location.href = '/parent-insights.html'
  }
}

if (tabParentInsights) {
  tabParentInsights.addEventListener('click', openParentInsightsGated)
}
document.getElementById('familyGoldButtonDesktop')?.addEventListener('click', () => showTab('familyGold'))
document.getElementById('familyGoldButtonMobile')?.addEventListener('click', () => {
  document.getElementById('hamburgerMenu')?.classList.remove('active')
  document.getElementById('dropdownMenu')?.classList.remove('active')
  showTab('familyGold')
})
// Track whether the user has picked a tab themselves, so the Family Gold
// auto-default (which arrives after the async subscription lookup) never
// yanks them away from a tab they already chose.
let userChoseTab = false
document.querySelectorAll('.nav-tab').forEach(t => {
  t.addEventListener('click', () => { userChoseTab = true })
})
window.__ddUserChoseTab = () => userChoseTab
const parentInsightsMobileBtn = document.getElementById('parentInsightsButtonMobile')
if (parentInsightsMobileBtn) {
  parentInsightsMobileBtn.addEventListener('click', openParentInsightsGated)
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
  
  // Get XP required for current and next level
  let nextLevelXp = 0
  let currentLevelXp = 0
  
  try {
    // Get XP required for current level (to show progress from)
    const currentLevelInfo = await getLevelInfo(currentLevel)
    currentLevelXp = currentLevelInfo?.xp_required || 0
  } catch (error) {
    console.error('Error getting current level info:', error)
    // Fallback: estimate based on 500 XP per level
    currentLevelXp = (currentLevel - 1) * 500
  }
  
  try {
    // Get XP required for next level
    nextLevelXp = await getXpForNextLevel(currentLevel)
  } catch (error) {
    console.error('Error getting next level info:', error)
    // Fallback: estimate next level as current + 500-700 XP
    nextLevelXp = currentLevelXp + 500 + (currentLevel * 100)
  }
  
  // Ensure nextLevelXp is always greater than currentLevelXp
  if (nextLevelXp <= currentLevelXp) {
    nextLevelXp = currentLevelXp + 500
  }
  
  // Calculate progress within current level
  const levelProgress = Math.max(0, totalXp - currentLevelXp)
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp
  const levelPercent = xpNeededForNextLevel > 0 ? Math.min(100, Math.round((levelProgress / xpNeededForNextLevel) * 100)) : 0
  
  // Update level display elements (matching dashboard.html IDs)
  const levelValueEl = document.getElementById('currentLevelDisplay')
  const totalXpEl = document.getElementById('totalXpDisplay')
  const levelProgressBarEl = document.getElementById('xpProgressBar')
  const levelProgressTextEl = document.getElementById('xpProgressText')
  const levelRingEl = document.getElementById('levelRingProgress')
  
  if (levelValueEl) levelValueEl.textContent = currentLevel
  if (totalXpEl) totalXpEl.textContent = totalXp
  if (levelProgressBarEl) levelProgressBarEl.style.width = `${levelPercent}%`
  if (levelProgressTextEl) levelProgressTextEl.textContent = `${totalXp} / ${nextLevelXp} XP`
  
  // Update the SVG ring progress (circumference is 213.6, so offset = circumference * (1 - percent/100))
  if (levelRingEl) {
    const circumference = 213.6
    const offset = circumference * (1 - levelPercent / 100)
    levelRingEl.style.strokeDashoffset = offset
  }
  
  // Roads built — the child's own progress, no comparison to other children
  const roadsBuiltEl = document.getElementById('roadsBuilt')
  if (roadsBuiltEl) roadsBuiltEl.textContent = completedCount
  
  // Update progress bar
  const progressBar = document.getElementById('progressBar')
  const progressPercent = document.getElementById('progressPercent')
  const progressText = document.getElementById('progressText')
  
  if (progressBar && progressPercent && progressText) {
    progressBar.style.width = percentage + '%'
    progressPercent.textContent = percentage + '%'
    progressText.textContent = `${completedCount} of ${totalCount}`
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

// Check if user is admin or practitioner
async function checkAdminStatus() {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('[Dashboard] No user found')
      return
    }

    // Use the database function to check admin status
    const [isAdmin, isPractitioner] = await Promise.all([
      isUserAdmin(user.id),
      isUserPractitioner(user.id)
    ])

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

    if (isAdmin || isPractitioner) {
      getSettings().then(flagSettings => {
        if (flagSettings?.feature_flags?.schools_program_enabled) {
          const schoolsButton = document.getElementById('schoolsButton')
          const schoolsButtonDesktop = document.getElementById('schoolsButtonDesktop')
          if (schoolsButton) showElement(schoolsButton)
          if (schoolsButtonDesktop) showElement(schoolsButtonDesktop)
        }
      }).catch(() => { /* flag defaults to off */ })
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




// Initialize app
init();
