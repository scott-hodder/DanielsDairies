import { supabase } from './supabaseClient.js'
import { checkAuth, signOut, getCurrentUser } from './auth.js'
import { getChildren, createChild, getModules, getChildModules, updateChildModuleStatus, awardStars, getChild, getAllChildrenLeaderboard, setChildPassword, verifyChildPassword, updateChildProfile, deleteChild, saveWeeklyCheckin, getLatestWeeklyPlan, getSettings, updateLoginStreak, getLoginStreak } from './database.js'
import { redirectToPaymentLink } from './stripe.js'
import { initializeRewardsTab, setupRewardsEventListeners } from './dashboard-rewards.js'

// State
let currentUser = null
let children = []
let selectedChild = null
let modules = []
let childModules = []
let parentModules = []
let categoryColors = {}
let currentModuleSeries = 'all'
let currentPurchaseModule = null
let pendingChildSelection = null
let editingChild = null
let showAllUnlockedModules = false
let showAllChildModules = false
let currentWeeklyPlan = null
let currentInsightsSubtab = 'overview'
let lockedModulesShowcase = []
let moreModulesCurrentIndex = 0
let moreModulesRotationTimer = null
let allModulesFilters = {
  category: 'all',
  series: 'all'
}

// DOM Elements
const loadingState = document.getElementById('loadingState')
const childrenView = document.getElementById('childrenView')
const childDetailView = document.getElementById('childDetailView')
const childrenGrid = document.getElementById('childrenGrid')
const parentUnlockedModulesGrid = document.getElementById('parentUnlockedModulesGrid')
const parentLockedModulesGrid = document.getElementById('parentLockedModulesGrid')
const modulesGrid = document.getElementById('modulesGrid')
const modulesSeriesTabs = document.getElementById('modulesCategoryTabs')
const logoutButton = document.getElementById('logoutButton')
const dashboardHomeButton = document.getElementById('dashboardHomeButton')
const profileButton = document.getElementById('profileButton')
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

// Avatar options - 4 boys and 4 girls
const avatarOptions = ['👦', '🧒', '👨', '👱', '👧', '👩', '👱‍♀️', '👶']
const triggerOptions = ['Anger', 'Overwhelm', 'Worry/Anxiety', 'Sadness', 'Frustration']
const selectedTriggers = new Set()

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
  if (module?.age_range) {
    highlights.push(`Ages ${module.age_range}`)
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

  return `
    <div class="sales-card">
      <div class="sales-card-header">
        <div class="sales-badge">✨ ${heroLabel}</div>
        <h3 class="sales-title">${module.title}</h3>
        ${module.age_range ? `<p class="sales-age">Perfect for ages ${module.age_range}</p>` : ''}
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
        <button type="button" class="sales-cta">🚀 Unlock Module</button>
      </div>
    </div>
  `
}

function renderMoreModulesCarousel() {
  if (!moreModulesCarousel || !moreModulesCarouselIndicators) return

  moreModulesCarousel.innerHTML = ''
  moreModulesCarouselIndicators.innerHTML = ''

  if (!lockedModulesShowcase || lockedModulesShowcase.length === 0) {
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

  lockedModulesShowcase.forEach((module, index) => {
    const slide = document.createElement('div')
    slide.className = 'sales-slide'
    slide.dataset.index = index
    slide.innerHTML = createSalesSlideMarkup(module)

    // Set category color on the sales card
    const salesCard = slide.querySelector('.sales-card')
    if (salesCard && module.category) {
      const categoryColor = categoryColors[module.category] || '#4c6c96'
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

  setMoreModulesActiveSlide(moreModulesCurrentIndex)
}

function setMoreModulesActiveSlide(index) {
  if (!lockedModulesShowcase || lockedModulesShowcase.length === 0) return
  const total = lockedModulesShowcase.length
  moreModulesCurrentIndex = ((index % total) + total) % total

  const slides = Array.from(moreModulesCarousel?.querySelectorAll('.sales-slide') || [])
  const indicators = Array.from(moreModulesCarouselIndicators?.children || [])

  slides.forEach((slide, idx) => {
    slide.classList.toggle('active', idx === moreModulesCurrentIndex)
  })

  indicators.forEach((button, idx) => {
    button.classList.toggle('active', idx === moreModulesCurrentIndex)
  })
}

function shiftMoreModulesSlide(direction = 1) {
  if (!lockedModulesShowcase || lockedModulesShowcase.length === 0) return
  setMoreModulesActiveSlide(moreModulesCurrentIndex + direction)
}

function startMoreModulesRotation() {
  stopMoreModulesRotation()
  if (!lockedModulesShowcase || lockedModulesShowcase.length <= 1) return
  moreModulesRotationTimer = setInterval(() => {
    shiftMoreModulesSlide(1)
  }, 6000)
}

function restartMoreModulesRotation() {
  startMoreModulesRotation()
}

function stopMoreModulesRotation() {
  if (moreModulesRotationTimer) {
    clearInterval(moreModulesRotationTimer)
    moreModulesRotationTimer = null
  }
}

function populateAllModulesFilters() {
  if (!modules || modules.length === 0) return
  if (!allModulesCategoryFilter || !allModulesSeriesFilter) return

  const categories = new Set()
  const seriesValues = new Set()

  modules.forEach(module => {
    if (module?.category) {
      categories.add(module.category.trim())
    }
    if (module?.series) {
      seriesValues.add(module.series.trim())
    }
  })

  setFilterOptions(allModulesCategoryFilter, Array.from(categories).sort(), 'All categories', allModulesFilters.category)
  setFilterOptions(allModulesSeriesFilter, Array.from(seriesValues).sort(), 'All series', allModulesFilters.series)
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
    allModulesFilters.category = normalizedSelected
  }
  if (selectEl === allModulesSeriesFilter) {
    allModulesFilters.series = normalizedSelected
  }
}

function renderAllModulesGrid() {
  if (!allModulesGrid) return

  if (!modules || modules.length === 0) {
    allModulesGrid.innerHTML = '<p class="all-modules-empty">No modules available yet. Please check back soon.</p>'
    return
  }

  const filtered = modules.filter(module => {
    const matchesCategory = allModulesFilters.category === 'all' || module.category === allModulesFilters.category
    const matchesSeries = allModulesFilters.series === 'all' || module.series === allModulesFilters.series
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
      const categoryColor = categoryColors[module.category] || '#4c6c96'
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

  return `
    <div class="all-module-card">
      <div class="all-module-card__header">
        <span class="module-tag">✨ ${heroLabel}</span>
        ${module?.category && module?.category !== heroLabel ? `<span class="module-tag module-tag--soft">${module.category}</span>` : ''}
      </div>
      <h3>${module.title}</h3>
      ${module.age_range ? `<p class="module-age">Ages ${module.age_range}</p>` : ''}
      <p class="module-description">${shortDesc}</p>
      <ul class="module-benefits">${highlightItems}</ul>
      <div class="all-module-card__footer">
        <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
          <p class="sales-price" style="margin: 0;">${priceLabel}</p>
          <p class="module-price-subtext" style="margin: 0;">${module?.price_frequency || ''}</p>
        </div>
        <button type="button" class="sales-cta">Get Access →</button>
      </div>
    </div>
  `
}

function openAllModulesModal() {
  if (!allModulesModal) return
  populateAllModulesFilters()
  renderAllModulesGrid()
  allModulesModal.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

function closeAllModulesModal() {
  if (!allModulesModal) return
  allModulesModal.classList.add('hidden')
  document.body.style.overflow = ''
}

function openMoreModulesModal() {
  if (!moreModulesModal) return
  moreModulesModal.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
  setMoreModulesActiveSlide(moreModulesCurrentIndex)
  startMoreModulesRotation()
}

function closeMoreModulesModal() {
  if (!moreModulesModal) return
  moreModulesModal.classList.add('hidden')
  document.body.style.overflow = ''
  stopMoreModulesRotation()
}

setupWeeklyCheckinUI()
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

  setParentInsightsSubtab(currentInsightsSubtab)
}

function setParentInsightsSubtab(target) {
  if (!insightsOverviewTab || !weeklyCheckinTab || !insightsOverviewPanel || !weeklyCheckinPanel) return

  currentInsightsSubtab = target === 'weekly' ? 'weekly' : 'overview'
  const showOverview = currentInsightsSubtab === 'overview'

  insightsOverviewTab.classList.toggle('active', showOverview)
  weeklyCheckinTab.classList.toggle('active', !showOverview)
  insightsOverviewPanel.classList.toggle('hidden', !showOverview)
  weeklyCheckinPanel.classList.toggle('hidden', showOverview)
}

async function checkWeeklyCheckinSettings() {
  try {
    const settings = await getSettings()
    
    // Hide the Weekly Check-In tab if disabled
    if (weeklyCheckinTab && settings.weekly_checkin_enabled === false) {
      weeklyCheckinTab.style.display = 'none'
      
      // If currently on weekly tab, switch to overview
      if (currentInsightsSubtab === 'weekly') {
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

  if (!selectedChild || !currentUser) {
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
      parentUserId: currentUser.id,
      childId: selectedChild.id,
      intensity,
      challenge,
      triggers: triggersArray,
      goal: goal || null,
      notes: notes || null,
      generatedPlan: planPayload
    })

    currentWeeklyPlan = saved?.generated_plan || planPayload
    weeklyCheckinForm.reset()
    selectedTriggers.clear()
    renderTriggerPicker()
    checkinIntensityInput.value = ''
    clearIntensityButtonClasses()

    renderWeeklyPlan(currentWeeklyPlan)
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
  if (!currentUser || !selectedChild) return
  try {
    const latest = await getLatestWeeklyPlan(currentUser.id, selectedChild.id)
    currentWeeklyPlan = latest?.generated_plan || null
    renderWeeklyPlan(currentWeeklyPlan)
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
    planToolsEl.innerHTML = plan.tools.map(tool => `
      <div class="plan-tool-card">
        <h5>${tool.label}</h5>
        <p>${tool.description}</p>
        <span>Helps with: ${tool.triggers.join(', ')}</span>
      </div>
    `).join('') || '<p style="color:#9ca3af;">No tools suggested yet.</p>'

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
  checkinSubmitButton.disabled = isLoading
  if (checkinSubmitText && checkinSubmitSpinner) {
    if (isLoading) {
      checkinSubmitText.classList.add('hidden')
      checkinSubmitSpinner.classList.remove('hidden')
    } else {
      checkinSubmitText.classList.remove('hidden')
      checkinSubmitSpinner.classList.add('hidden')
    }
  }
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

// Initialize
async function init() {
  
  // Safety timeout - force hide loading after 10 seconds
  const loadingTimeout = setTimeout(() => {
    console.warn('Loading timeout reached - forcing UI to show')
    if (loadingState) {
      loadingState.classList.add('hidden')
    }
    if (childrenView) {
      childrenView.classList.remove('hidden')
    }
  }, 10000)
  
  try {
    // Check authentication
    const session = await checkAuth()
    
    if (!session) {
      window.location.href = '/'
      return
    }
    
    // Get current user
    currentUser = await getCurrentUser()
    
    // Update login streak
    await updateLoginStreak(currentUser.id)
    
    if (currentUser && currentUser.email) {
      headerSubtitle.textContent = `Welcome back, ${currentUser.email}!`
    }
    
    // Check if user is admin and show admin button
    await checkAdminStatus()
    
    // Load login streak display
    await loadStreakDisplay()
    
    // Load modules first
    try {
      
      modules = await getModules()
      
    } catch (error) {
      console.error('Error loading modules:', error)
      modules = []
    }
    
    // Load parent's modules
    try {
      
      const { data, error } = await supabase
        .from('parent_modules')
        .select('module_id, is_active, modules(*)')
        .eq('parent_id', currentUser.id)
      
      if (error) throw error
      parentModules = data || []

      if (parentModules.length > 0) {
       
      }
      
    } catch (error) {
      console.error('Error loading parent modules:', error)
      parentModules = []
    }
    
    // Load category colors
    try {
      const { data, error } = await supabase
        .from('category_colors')
        .select('*')
      
      if (error) throw error
      categoryColors = {}
      data?.forEach(cc => {
        if (!cc?.category || !cc?.color) return
        categoryColors[cc.category] = cc.color
      })
    } catch (error) {
      console.error('Error loading category colors:', error)
      categoryColors = {}
    }
    
    // Load children
    
    await loadChildren()
    

    // Check URL for a childId to auto-select (coming back from a module)
    const params = new URLSearchParams(window.location.search)
    const childIdFromUrl = params.get('childId')
    const tabFromUrl = params.get('tab')

    if (childIdFromUrl && children && children.length > 0) {
      const childFromUrl = children.find(c => String(c.id) === String(childIdFromUrl))
      if (childFromUrl) {
        
        // Skip password check when returning from module (already authenticated)
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
    
    clearTimeout(loadingTimeout)
    
  } catch (error) {
    console.error('Initialization error:', error)
    console.error('Error stack:', error.stack)
    clearTimeout(loadingTimeout)
    // Show children view anyway so user isn't stuck
    try {
      showChildrenView()
    } catch (e) {
      console.error('Error showing children view:', e)
      // Force hide loading state
      if (loadingState) {
        loadingState.classList.add('hidden')
      }
      if (childrenView) {
        childrenView.classList.remove('hidden')
      }
    }
    alert('Some data failed to load. You can still add children and use the app.')
  }
}

// Purchase modal helpers
function openPurchaseModal(module) {
  if (!purchaseModal || !purchaseModalTitle || !purchaseModalBody || !purchaseModalCost) return

  currentPurchaseModule = module

  purchaseModalTitle.textContent = `Purchase: ${module.title}`

  const ageRange = module.age_range ? `Ages ${module.age_range}. ` : ''
  const description = module.short_description || 'This workbook helps support your child with emotional regulation and practical activities.'
  const priceLabel = getModulePriceLabel(module)
  const priceSubtext = getModulePriceSubtext(module)
  purchaseModalBody.innerHTML = `
    <span>${ageRange}${description}</span>
    <span style="display:block; margin-top: 10px; color: #2e7d32; font-size: 13px;">${priceSubtext}</span>
  `

  purchaseModalCost.textContent = `Price: ${priceLabel}`

  purchaseModal.classList.remove('hidden')
}

function closePurchaseModal() {
  if (!purchaseModal) return
  currentPurchaseModule = null
  purchaseModal.classList.add('hidden')
}

// Load children
async function loadChildren() {
  try {
    children = await getChildren(currentUser.id)
    renderChildren()
  } catch (error) {
    console.error('Error loading children:', error)
    // Show children view anyway so user can add a child
    children = []
    renderChildren()
  }
}

// Render children
function renderChildren() {
  childrenGrid.innerHTML = ''
  
  // Render each child
  children.forEach(child => {
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
  
  // Add click handler for card (to select child)
  card.addEventListener('click', () => promptChildPassword(child))
  
  return card
}

// Password management functions
function promptChildPassword(child) {
  pendingChildSelection = child
  
  // Check if password exists in database (child.password field)
  if (child.password) {
    // Password exists, prompt for it
    childPasswordModalTitle.textContent = `Enter Password for ${child.name}`
    childPasswordInput.placeholder = 'Enter password'
  } else {
    // First time, set password
    childPasswordModalTitle.textContent = `Set Password for ${child.name}`
    childPasswordInput.placeholder = 'Create a password'
  }
  
  childPasswordModal.classList.remove('hidden')
  passwordModalError.classList.add('hidden')
  childPasswordForm.reset()
  
  // Focus the password input
  setTimeout(() => childPasswordInput.focus(), 100)
}

function closePasswordModal() {
  childPasswordModal.classList.add('hidden')
  pendingChildSelection = null
  childPasswordForm.reset()
  passwordModalError.classList.add('hidden')
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
    button.addEventListener('click', (e) => {
      e.preventDefault()
      // Remove selected class from all buttons in this picker
      pickerElement.querySelectorAll('.avatar-option').forEach(btn => {
        btn.classList.remove('selected')
      })
      // Add selected class to clicked button
      button.classList.add('selected')
      // Store the selected avatar
      if (hiddenInputElement) {
        hiddenInputElement.value = emoji
      }
    })
    pickerElement.appendChild(button)
  })
}

// Edit child functions
function promptEditChild(child) {
  editingChild = child
  
  // Populate form with current child data
  editChildName.value = child.name
  editModalError.classList.add('hidden')
  
  // Render avatar picker with current avatar
  renderAvatarPicker(child.avatar, avatarPicker, document.getElementById('editChildAvatar'))
  
  editChildModal.classList.remove('hidden')
  setTimeout(() => editChildName.focus(), 100)
}

function closeEditChildModal() {
  editChildModal.classList.add('hidden')
  editingChild = null
  editChildForm.reset()
  editModalError.classList.add('hidden')
}

// Select child
async function selectChild(child) {
  
  
  if (!child) {
    console.error('selectChild called with null/undefined child')
    return
  }
  
  selectedChild = child
  
  try {
    // Load child's module progress
    
    childModules = await getChildModules(child.id)

    // Setup rewards event listeners for this child
    setupRewardsEventListeners(child)
    await loadLatestWeeklyPlan()
    
    // Show child detail view
    showChildDetailView()
    
  } catch (error) {
    console.error('Error loading child modules:', error)
    console.error('Error details:', error.message, error.stack)
    // Still show the view even if modules fail to load
    childModules = []
    showChildDetailView()
  }
}

// Show children view
function showChildrenView() {
  if (loadingState) {
    loadingState.classList.add('hidden')
  }
  childrenView.classList.remove('hidden')
  childDetailView.classList.add('hidden')
  
  // Hide dashboard button when on main view
  if (dashboardButton) {
    dashboardButton.style.display = 'none'
  }

  // Render parent overview of modules
  renderParentModulesOverview()
}

// Render parent-facing overview of unlocked vs locked modules
function renderParentModulesOverview() {
  if (!parentUnlockedModulesGrid || !parentLockedModulesGrid) return

  parentUnlockedModulesGrid.innerHTML = ''
  parentLockedModulesGrid.innerHTML = ''

  if (!modules || modules.length === 0) {
    parentUnlockedModulesGrid.innerHTML = '<p class="progress-label">No modules available yet.</p>'
    parentLockedModulesGrid.innerHTML = '<p class="progress-label">No modules configured yet.</p>'
    return
  }

  const parentModuleMap = new Map()
  parentModules.forEach(pm => {
    parentModuleMap.set(pm.module_id, pm.is_active)
    if (pm.modules) {
      const alreadyExists = modules.some(m => m.id === pm.module_id)
      if (!alreadyExists) {
        modules.push(pm.modules)
      }
    }
  })


  const unlocked = modules.filter(m => parentModuleMap.get(m.id))

  const locked = modules.filter(m => {
    const parentHasModule = parentModuleMap.has(m.id)
    const parentActive = parentModuleMap.get(m.id)
    const globallyInactive = m.is_active === false
    return !parentHasModule || !parentActive || globallyInactive
  })



  lockedModulesShowcase = locked.slice()
  moreModulesCurrentIndex = 0
  updateMoreModulesButtonState()
  renderMoreModulesCarousel()
  populateAllModulesFilters()

  // Simple, factual cards for parent overview
  const makeStaticCard = (module, options = {}) => {
    const card = document.createElement('div')
    card.className = 'module-card'

    const ageRange = module.age_range || ''
    const shortDescription = module.short_description || ''

    const palette = [
      { border: '#f46b6b', iconBg: 'linear-gradient(135deg, #ffe1e1 0%, #fff5f5 100%)' },
      { border: '#35a4d4', iconBg: 'linear-gradient(135deg, #def5ff 0%, #f2fbff 100%)' },
      { border: '#f4a73b', iconBg: 'linear-gradient(135deg, #fff1da 0%, #fff8ea 100%)' },
      { border: '#4caf50', iconBg: 'linear-gradient(135deg, #e0f5e9 0%, #f3fff7 100%)' },
      { border: '#ab47bc', iconBg: 'linear-gradient(135deg, #f7e3ff 0%, #fdf5ff 100%)' }
    ]

    const key = (module.id || module.code || module.title || '').toString()
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0
    }
    const colors = palette[hash % palette.length]

    card.style.borderLeftColor = options.locked ? '#9ca3af' : colors.border

    const icon = options.locked ? '🔒' : '📖'
    const statusText = options.locked ? 'Locked • Not yet active' : 'Unlocked • Active on your account'

    card.innerHTML = `
      <div class="module-left">
        <div class="module-icon ${options.locked ? 'default' : ''}" style="background: ${options.locked ? 'linear-gradient(135deg, #eeeeee 0%, #f9f9f9 100%)' : colors.iconBg};">${icon}</div>
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
          <span>Available to purchase</span>
        </div>
        <button class="btn-module start parent-purchase-button" type="button">Purchase</button>
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

  if (unlocked.length === 0) {
    parentUnlockedModulesGrid.innerHTML = '<p class="progress-label">No unlocked modules yet.</p>'
  } else {
    // Show max 6 modules initially
    const maxInitialModules = 6
    const modulesToShow = showAllUnlockedModules ? unlocked : unlocked.slice(0, maxInitialModules)
    
    modulesToShow.forEach(m => parentUnlockedModulesGrid.appendChild(makeStaticCard(m, { locked: false })))
    
    // Add "More" button if there are more than 6 modules
    if (unlocked.length > maxInitialModules) {
      const moreButtonContainer = document.createElement('div')
      moreButtonContainer.style.gridColumn = '1 / -1'
      moreButtonContainer.style.textAlign = 'center'
      moreButtonContainer.style.marginTop = '16px'
      
      const moreButton = document.createElement('button')
      moreButton.className = 'btn-module start'
      moreButton.textContent = showAllUnlockedModules ? 'Show Less' : `More (${unlocked.length - maxInitialModules} more)`
      moreButton.style.padding = '12px 32px'
      moreButton.addEventListener('click', () => {
        showAllUnlockedModules = !showAllUnlockedModules
        renderParentModulesOverview()
      })
      
      moreButtonContainer.appendChild(moreButton)
      parentUnlockedModulesGrid.appendChild(moreButtonContainer)
    }
  }

  locked.forEach(m => parentLockedModulesGrid.appendChild(makeStaticCard(m, { locked: true })))
}

// Show child detail view
function showChildDetailView() {
  // Hide loading state
  if (loadingState) {
    loadingState.classList.add('hidden')
  }
  
  childrenView.classList.add('hidden')
  childDetailView.classList.remove('hidden')
  
  // Show dashboard button when viewing child details
  if (dashboardButton) {
    dashboardButton.style.display = 'inline-block'
  }
  
  // Show dashboard tab by default
  showTab('dashboard')
  
  // Update stats and render content
  updateDashboardStats()
  renderModules()
  renderLeaderboard()
  renderWeeklyPlan(currentWeeklyPlan)
}

// Render modules
function renderModules() {
  if (!modulesGrid) return
  
  modulesGrid.innerHTML = ''
  modulesGrid.style.display = 'block'
  
  

  // Build series tabs from modules
  if (modulesSeriesTabs) {
    const series = Array.from(new Set(
      modules
        .map(m => m.series)
        .filter(Boolean)
    ))

    const allLabel = 'All'
    const tabsHtml = [allLabel, ...series].map(ser => {
      const value = ser === allLabel ? 'all' : ser
      const isActive = value === currentModuleSeries
      return `
        <button
          class="module-category-tab ${isActive ? 'active' : ''}"
          data-series="${value}"
        >
          ${ser}
        </button>
      `
    }).join('')

    modulesSeriesTabs.innerHTML = tabsHtml

    // Attach click handlers
    Array.from(modulesSeriesTabs.querySelectorAll('.module-category-tab')).forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.getAttribute('data-series') || 'all'
        currentModuleSeries = value
        showAllChildModules = false // Reset when changing series
        renderModules()
      })
    })
  }
  
  // Filter to only show modules that the parent owns
  const parentModuleIds = parentModules.map(pm => pm.module_id)
  const parentOwnedModules = modules.filter(m => parentModuleIds.includes(m.id))
  
  // If a child is selected, further filter to only show modules active for that child
  let availableModules = parentOwnedModules

    
    const activeChildModuleIds = childModules
      .filter(cm => cm.is_active === true) // Explicitly check for true
      .map(cm => cm.module_id)
    
    
    availableModules = parentOwnedModules.filter(m => activeChildModuleIds.includes(m.id))

  
  const visibleModules = currentModuleSeries === 'all'
    ? availableModules
    : availableModules.filter(m => m.series === currentModuleSeries)

  if (visibleModules.length === 0) {
    modulesGrid.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #4c6c96;">
        <p style="font-size: 18px; margin-bottom: 12px;">No modules available yet.</p>
        <p style="font-size: 14px;">Modules will appear here once they are added to the database.</p>
      </div>
    `
    return
  }

  const activeModules = visibleModules.filter(m => m.is_active)

  // Separate completed and incomplete modules
  const incompleteModules = activeModules.filter(module => {
    const childModule = childModules.find(cm => cm.module_id === module.id)
    return !childModule || childModule.is_completed !== true
  })

  const completedModules = activeModules.filter(module => {
    const childModule = childModules.find(cm => cm.module_id === module.id)
    return childModule && childModule.is_completed === true
  })

  // Render Incomplete Modules Section
  if (incompleteModules.length > 0) {
    const readyHasHidden = incompleteModules.length > 6
    const readyModulesToDisplay = showAllChildModules ? incompleteModules : incompleteModules.slice(0, 6)

    const incompleteSection = document.createElement('div')
    incompleteSection.style.gridColumn = '1 / -1'
    incompleteSection.style.marginBottom = '32px'
    
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
      toggleButton.textContent = showAllChildModules
        ? 'Show Less'
        : `Show More (${incompleteModules.length - readyModulesToDisplay.length})`
      toggleButton.addEventListener('click', () => {
        showAllChildModules = !showAllChildModules
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
}

// Create module card
function createModuleCard(module) {
  const card = document.createElement('div')

  // Check if module is completed
  const childModule = childModules.find(cm => cm.module_id === module.id)
  const isCompleted = childModule && childModule.is_completed === true

  card.className = `module-card ${isCompleted ? 'completed' : ''}`

  const iconHtml = isCompleted ? '✓' : '📖'
  const iconClass = isCompleted ? 'completed' : 'default'
  const buttonHtml = isCompleted 
    ? '<button class="btn-module completed">✓ Completed</button>'
    : `<button class="btn-module start">Start Module →</button>`

  const ageRange = module.age_range || ''
  const shortDescription = module.short_description || ''
  const category = module.category || ''
  const series = module.series || ''

  // Use category color from database, fallback to default
  const categoryColor = categoryColors[category] || '#4c6c96'
  card.style.borderLeftColor = isCompleted ? '#2e7d32' : categoryColor

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
          ${isCompleted ? 'Completed' : 'Ready to start'}
        </p>
      </div>
    </div>
    ${buttonHtml}
  `
  
  // Add click handler for start button
  if (!isCompleted) {
    const startButton = card.querySelector('.btn-module.start')
    startButton.addEventListener('click', () => startModule(module))
  }
  
  return card
}

// Start module
async function startModule(module) {
  try {
    // Update module status to in_progress
    await updateChildModuleStatus(selectedChild.id, module.id, 'in_progress')
    
    // Load module through the module player
    const moduleUrl = `/module.html?code=${module.code}&childId=${selectedChild.id}&moduleId=${module.id}&parentUserId=${currentUser.id}`
    window.location.href = moduleUrl
    
  } catch (error) {
    console.error('Error starting module:', error)
    alert('Failed to start module. Please try again.')
  }
}

// Show add child modal
function showAddChildModal() {
  addChildModal.classList.remove('hidden')
  modalError.classList.add('hidden')
  addChildForm.reset()
  
  // Render avatar picker with no selection
  renderAvatarPicker(null, addChildAvatarPicker, addChildAvatar)
}

// Hide add child modal
function hideAddChildModal() {
  addChildModal.classList.add('hidden')
}

// Handle add child form submission
if (addChildForm) {
  addChildForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const name = document.getElementById('childName').value
    const dob = document.getElementById('childDob').value
    const avatar = addChildAvatar.value || null
    
    try {
      if (modalError) {
        modalError.classList.add('hidden')
      }
      
      // Create child with avatar
      const newChild = await createChild(currentUser.id, name, dob, avatar)
      
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
        modalError.classList.remove('hidden')
      }
    }
  })
}

// Purchase modal buttons
if (cancelPurchaseButton) {
  cancelPurchaseButton.addEventListener('click', () => {
    closePurchaseModal()
  })
}

if (confirmPurchaseButton) {
  confirmPurchaseButton.addEventListener('click', async () => {
    if (!currentPurchaseModule) return
    
    try {
      // Show loading state
      confirmPurchaseButton.disabled = true
      confirmPurchaseButton.textContent = 'Redirecting to checkout...'
      
      // Option 1: Use Stripe Payment Link (stored in database)
      if (currentPurchaseModule.stripe_payment_link) {
        await redirectToPaymentLink(currentPurchaseModule.stripe_payment_link)
      } else {
        // Fallback: Show message if no payment link configured
        alert('Payment link not configured for this module. Please contact support.')
        closePurchaseModal()
      }
      
      // Note: User will be redirected to Stripe, so modal will close automatically
    } catch (error) {
      console.error('Purchase error:', error)
      alert('Failed to process purchase. Please try again.')
      confirmPurchaseButton.disabled = false
      confirmPurchaseButton.textContent = 'Purchase'
    }
  })
}

// Password modal handlers
if (childPasswordForm) {
  childPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    if (!pendingChildSelection) return
    
    const enteredPassword = childPasswordInput.value
    
    try {
      // Save reference to child before closing modal
      const childToSelect = pendingChildSelection
      
      if (childToSelect.password) {
        // Verify password against database
        const isValid = await verifyChildPassword(childToSelect.id, enteredPassword)
        
        if (isValid) {
          closePasswordModal()
          await selectChild(childToSelect)
        } else {
          passwordModalError.textContent = 'Incorrect password. Please try again.'
          passwordModalError.classList.remove('hidden')
          childPasswordInput.value = ''
          childPasswordInput.focus()
        }
      } else {
        // Set new password in database
        if (enteredPassword.length < 3) {
          passwordModalError.textContent = 'Password must be at least 3 characters.'
          passwordModalError.classList.remove('hidden')
          return
        }
        
        await setChildPassword(childToSelect.id, enteredPassword)
        // Update local child object with password
        childToSelect.password = enteredPassword
        const childIndex = children.findIndex(c => c.id === childToSelect.id)
        if (childIndex !== -1) {
          children[childIndex].password = enteredPassword
        }
        
        closePasswordModal()
        await selectChild(childToSelect)
      }
    } catch (error) {
      console.error('Password error:', error)
      passwordModalError.textContent = 'An error occurred. Please try again.'
      passwordModalError.classList.remove('hidden')
    }
  })
}

if (cancelPasswordButton) {
  cancelPasswordButton.addEventListener('click', () => {
    closePasswordModal()
  })
}

// Edit child form handler
if (editChildForm) {
  editChildForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    if (!editingChild) return
    
    try {
      const newName = editChildName.value.trim()
      const newAvatar = document.getElementById('editChildAvatar').value.trim()
      
      // Validate name
      if (!newName) {
        editModalError.textContent = 'Name is required.'
        editModalError.classList.remove('hidden')
        return
      }
      
      // Build update object
      const updates = { name: newName }
      
      // Update avatar (always include, even if empty)
      updates.avatar = newAvatar || null
      
      // Update child in database
      const updatedChild = await updateChildProfile(editingChild.id, updates)
      
      // Update local children array
      const childIndex = children.findIndex(c => c.id === editingChild.id)
      if (childIndex !== -1) {
        children[childIndex] = updatedChild
      }
      
      // Update selected child if it's the one being edited
      if (selectedChild && selectedChild.id === editingChild.id) {
        selectedChild = updatedChild
      }
      
      // Re-render children
      renderChildren()
      
      // Close modal
      closeEditChildModal()
      
    } catch (error) {
      console.error('Error updating child:', error)
      editModalError.textContent = 'Failed to save changes. Please try again.'
      editModalError.classList.remove('hidden')
    }
  })
}

if (cancelEditChildButton) {
  cancelEditChildButton.addEventListener('click', () => {
    closeEditChildModal()
  })
}

// Forget password button
if (forgetPasswordBtn) {
  forgetPasswordBtn.addEventListener('click', (e) => {
    e.preventDefault()
    // Show parent password verification modal
    parentPasswordModal.classList.remove('hidden')
    parentPasswordError.classList.add('hidden')
    parentPasswordForm.reset()
    setTimeout(() => parentPassword.focus(), 100)
  })
}

// Parent password form handler
if (parentPasswordForm) {
  parentPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    if (!currentUser) {
      parentPasswordError.textContent = 'User not authenticated.'
      parentPasswordError.classList.remove('hidden')
      return
    }
    
    const enteredPassword = parentPassword.value
    const newChildPassword = editChildPassword.value.trim()
    
    try {
      // Verify parent password against auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: enteredPassword
      })
      
      if (error || !data.user) {
        parentPasswordError.textContent = 'Incorrect parent password.'
        parentPasswordError.classList.remove('hidden')
        parentPassword.value = ''
        parentPassword.focus()
        return
      }
      
      // Password verified - update the child's password
      if (editingChild) {
        // Validate new password if provided
        if (newChildPassword && newChildPassword.length < 6) {
          parentPasswordError.textContent = 'New password must be at least 6 characters.'
          parentPasswordError.classList.remove('hidden')
          return
        }
        
        // Update password (null if blank, which clears it)
        const passwordUpdate = newChildPassword || null
        await updateChildProfile(editingChild.id, { password: passwordUpdate })
        
        // Update local child object
        editingChild.password = passwordUpdate
        const childIndex = children.findIndex(c => c.id === editingChild.id)
        if (childIndex !== -1) {
          children[childIndex].password = passwordUpdate
        }
        
        // Show success message in edit modal
        const successMsg = passwordUpdate 
          ? 'Password has been reset successfully!' 
          : 'Password cleared! The child will set a new password on next login.'
        editModalError.textContent = successMsg
        editModalError.style.color = '#4caf50'
        editModalError.classList.remove('hidden')
        
        // Close parent password modal
        parentPasswordModal.classList.add('hidden')
        parentPasswordForm.reset()
      }
    } catch (error) {
      console.error('Error verifying parent password:', error)
      parentPasswordError.textContent = 'An error occurred. Please try again.'
      parentPasswordError.classList.remove('hidden')
    }
  })
}

// Cancel parent password modal
if (cancelParentPasswordButton) {
  cancelParentPasswordButton.addEventListener('click', () => {
    parentPasswordModal.classList.add('hidden')
    parentPasswordForm.reset()
    parentPasswordError.classList.add('hidden')
    if (editChildPassword) {
      editChildPassword.value = ''
    }
  })
}

// Remove child button
if (removeChildBtn) {
  removeChildBtn.addEventListener('click', () => {
    if (!editingChild) return
    
    // Show confirmation modal
    removeChildName.textContent = editingChild.name
    removeChildError.classList.add('hidden')
    removeChildModal.classList.remove('hidden')
  })
}

// Cancel remove child
if (cancelRemoveChildButton) {
  cancelRemoveChildButton.addEventListener('click', () => {
    removeChildModal.classList.add('hidden')
  })
}

// Confirm remove child
if (confirmRemoveChildButton) {
  confirmRemoveChildButton.addEventListener('click', async () => {
    if (!editingChild) return
    
    try {
      removeChildError.classList.add('hidden')
      
      // Delete child from database
      await deleteChild(editingChild.id)
      
      // Remove from local children array
      children = children.filter(c => c.id !== editingChild.id)
      
      // Re-render children
      renderChildren()
      
      // Close both modals
      removeChildModal.classList.add('hidden')
      closeEditChildModal()
      
      // Show success message (optional)
      alert(`${editingChild.name} has been removed successfully.`)
      
    } catch (error) {
      console.error('Error removing child:', error)
      removeChildError.textContent = 'Failed to remove child. Please try again.'
      removeChildError.classList.remove('hidden')
    }
  })
}

// Quick add child button
if (addChildQuickBtn) {
  addChildQuickBtn.addEventListener('click', showAddChildModal)
}

// Cancel add child
if (cancelAddChild) {
  cancelAddChild.addEventListener('click', hideAddChildModal)
}

// Back button
if (backButton) {
  backButton.addEventListener('click', () => {
    selectedChild = null
    showChildrenView()
  })
}

// Dashboard button
if (dashboardButton) {
  dashboardButton.addEventListener('click', () => {
    selectedChild = null
    showChildrenView()
  })
}

// Dashboard Home Button - goes to child's dashboard view
if (dashboardHomeButton) {
  dashboardHomeButton.addEventListener('click', () => {
    if (selectedChild) {
      // If a child is selected, go to their dashboard
      window.location.href = `/dashboard.html?childId=${selectedChild.id}`
    } else {
      // If no child selected, go to children selection
      window.location.href = '/dashboard.html'
    }
  })
}

// Profile Button - goes to children selection view (same as dashboard for now)
if (profileButton) {
  profileButton.addEventListener('click', () => {
    window.location.href = '/dashboard.html'
  })
}

if (moreModulesButton) {
  moreModulesButton.addEventListener('click', () => {
    openMoreModulesModal()
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
    allModulesFilters.category = event.target.value || 'all'
    renderAllModulesGrid()
  })
}

if (allModulesSeriesFilter) {
  allModulesSeriesFilter.addEventListener('change', (event) => {
    allModulesFilters.series = event.target.value || 'all'
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
  if (dashboardTabContent) dashboardTabContent.classList.add('hidden')
  if (modulesTabContent) modulesTabContent.classList.add('hidden')
  if (leaderboardTabContent) leaderboardTabContent.classList.add('hidden')
  if (spendStarsTabContent) spendStarsTabContent.classList.add('hidden')
  if (parentInsightsTabContent) parentInsightsTabContent.classList.add('hidden')
  
  // Show selected tab
  if (tabName === 'dashboard') {
    tabDashboard.classList.add('active')
    if (dashboardTabContent) dashboardTabContent.classList.remove('hidden')
  } else if (tabName === 'modules') {
    tabModules.classList.add('active')
    if (modulesTabContent) modulesTabContent.classList.remove('hidden')
  } else if (tabName === 'leaderboard') {
    tabLeaderboard.classList.add('active')
    if (leaderboardTabContent) leaderboardTabContent.classList.remove('hidden')
  } else if (tabName === 'spendStars') {
    tabSpendStars.classList.add('active')
    if (spendStarsTabContent) spendStarsTabContent.classList.remove('hidden')
    // Initialize rewards tab when shown
    initializeRewardsTab(selectedChild)
  } else if (tabName === 'parentInsights') {
    tabParentInsights.classList.add('active')
    if (parentInsightsTabContent) parentInsightsTabContent.classList.remove('hidden')
    setParentInsightsSubtab(currentInsightsSubtab)
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
  tabParentInsights.addEventListener('click', () => showTab('parentInsights'))
}

// Update dashboard stats
async function updateDashboardStats() {
  if (!selectedChild) return
  
  // Count completed modules (only active modules)
  const activeModules = modules.filter(m => m.is_active)
  const completedCount = childModules.filter(cm => cm.is_completed === true).length
  const totalCount = activeModules.length
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  
  // Update stats
  document.getElementById('totalStars').textContent = selectedChild.stars || 0
  document.getElementById('completedModules').textContent = completedCount
  document.getElementById('totalModules').textContent = totalCount
  document.getElementById('dayStreak').textContent = 0 // TODO: Implement streak tracking
  
  // Get rank from leaderboard
  try {
    const leaderboard = await getAllChildrenLeaderboard(100)
    const rank = leaderboard.findIndex(child => child.id === selectedChild.id) + 1
    document.getElementById('childRank').textContent = rank > 0 ? `#${rank}` : '#-'
  } catch (error) {
    console.error('Error getting rank:', error)
    document.getElementById('childRank').textContent = '#-'
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
  if (!selectedChild || !childModules || !modules) return
  
  // Get completed modules with their details
  const completedModules = childModules
    .filter(cm => cm.is_completed === true)
    .map(cm => modules.find(m => m.id === cm.module_id))
    .filter(m => m) // Remove any undefined
  
  // Get recently started modules (in progress)
  const inProgressModules = childModules
    .filter(cm => cm.is_completed === false && cm.stars_earned > 0)
    .map(cm => modules.find(m => m.id === cm.module_id))
    .filter(m => m)
  
  const totalStars = selectedChild.stars || 0
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
  if (!leaderboardList || !selectedChild) return
  
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
    
    allChildren.forEach((child, index) => {
      const rank = index + 1
      const isCurrentUser = child.id === selectedChild.id
      const avatar = avatars[index % avatars.length]
      
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
              ${child.name}
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
    
    // Try querying parent_profiles
    const { data: profiles, error } = await supabase
      .from('parent_profiles')
      .select('id, is_admin, username')
      .eq('id', user.id)
    
    
    // Debug: try querying all to see if table is accessible
    const { data: allProfiles, error: allError } = await supabase
      .from('parent_profiles')
      .select('id, username')
      .limit(5)
    
    // Debug: try querying with different select
    const { data: testQuery, error: testError } = await supabase
      .from('parent_profiles')
      .select('*')
      .limit(1)
    
    const profile = profiles && profiles.length > 0 ? profiles[0] : null
    
    if (error) {
      console.error('[Dashboard] Error checking admin status:', error)
      return
    }
    
    if (profile && profile.is_admin) {
      const adminButton = document.getElementById('adminButton')
      if (adminButton) {
        adminButton.style.display = 'block'
      }
    } else {
    }
  } catch (error) {
    console.error('[Dashboard] Error checking admin status:', error)
  }
}

// Load and display login streak
async function loadStreakDisplay() {
  try {
    const streakData = await getLoginStreak(currentUser.id)
    const streakDisplay = document.getElementById('streakDisplay')
    const currentStreakEl = document.getElementById('currentStreak')
    const longestStreakEl = document.getElementById('longestStreak')
    const streakMessageEl = document.getElementById('streakMessage')
    const streakCard = streakDisplay?.querySelector('.streak-card')
    
    if (streakDisplay && currentStreakEl && longestStreakEl && streakMessageEl) {
      // Update streak numbers
      currentStreakEl.textContent = streakData.current_streak
      longestStreakEl.textContent = streakData.longest_streak
      
      // Show streak display if user has a streak
      if (streakData.current_streak > 0) {
        streakDisplay.style.display = 'block'
        
        // Update milestone styling
        if (streakCard) {
          streakCard.className = 'streak-card'
          if (streakData.current_streak >= 100) {
            streakCard.classList.add('milestone-100')
          } else if (streakData.current_streak >= 30) {
            streakCard.classList.add('milestone-30')
          } else if (streakData.current_streak >= 7) {
            streakCard.classList.add('milestone-7')
          }
        }
        
        // Update motivational message
        streakMessageEl.textContent = getStreakMessage(streakData.current_streak)
      } else {
        streakDisplay.style.display = 'none'
      }
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

// Admin button click handler
const adminButton = document.getElementById('adminButton')
if (adminButton) {
  adminButton.addEventListener('click', () => {
    window.location.href = '/admin.html'
  })
}

// Initialize app
init()
