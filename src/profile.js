// Profile Page - Separate from Dashboard
import { escapeHtml } from './lib/sanitize.js'
import { signOut, getCurrentUser } from './auth.js'
import { getSupabaseClient } from './supabaseClient.js'
import { showElement, hideElement } from './utils/dom.js'
import { switchStripeSubscriptionPlan, manageSubscription } from './services/databaseService.js'
import { showLoadingScreen, hideLoadingScreen } from './features/dashboard/loadingScreen.js'
import { showToast } from './ui/toast.js'
import { requireParentGate, openParentPinSettings } from './features/parentGate.js'
import { initNativeChrome } from './lib/nativeApp.js'

// Companion mode: hides the Plan/billing section when inside the iOS app.
initNativeChrome()
import { initKidIcons } from './lib/kidIcons.js'
import { initTelemetry, trackEvent } from './lib/telemetry.js'
import { childAvatarHTML, DD_AVATARS } from './lib/childAvatar.js'

// Error tracking + page view (fail-silent, self-hosted in Supabase)
initTelemetry()

// Consistent emoji artwork on every device
initKidIcons()

const supabase = getSupabaseClient()

// Check if user is admin
async function checkIsAdmin() {
  try {
    const user = await getCurrentUser()
    if (!user) return false
    
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    
    if (error) return false
    return data?.is_admin === true
  } catch (e) {
    return false
  }
}

// Avatar categories for the fun picker
const avatarCategories = {
    crew: Object.keys(DD_AVATARS),
  animals: ['🦊', '🐼', '🦁', '🐨', '🦋', '🐸', '🐯', '🐺'],
  magical: ['🧚', '🧙', '🧜', '🐉', '🦄', '🌈', '🔮', '🦕'],
  heroes: ['🦸', '🦹', '🥷', '🤖', '👑', '🎭', '🎯', '💎'],
  space: ['🚀', '👨‍🚀', '👩‍🚀', '🛸', '🌙', '⭐', '🪐', '☄️']
}

// State
const state = {
  currentUser: null,
  children: [],
  modules: [],
  parentModules: [],
  editingChild: null,
  isAdmin: false
}

// DOM Elements
const loadingState = document.getElementById('loadingState')
const profileView = document.getElementById('profileView')
const headerSubtitle = document.getElementById('headerSubtitle')

// Navigation buttons
const dashboardHomeButton = document.getElementById('dashboardHomeButton')
const dashboardHomeButtonDesktop = document.getElementById('dashboardHomeButtonDesktop')
const profileButton = document.getElementById('profileButton')
const profileButtonDesktop = document.getElementById('profileButtonDesktop')
const logoutButton = document.getElementById('logoutButton')
const logoutButtonDesktop = document.getElementById('logoutButtonDesktop')
const adminButton = document.getElementById('adminButton')
const adminButtonDesktop = document.getElementById('adminButtonDesktop')
const hamburgerMenu = document.getElementById('hamburgerMenu')
const dropdownMenu = document.getElementById('dropdownMenu')

// Modals
const addChildModal = document.getElementById('addChildModal')
const editChildModal = document.getElementById('editChildModal')
const removeChildModal = document.getElementById('removeChildModal')
const parentPasswordModal = document.getElementById('parentPasswordModal')

// Initialize
async function init() {
  // Show the Daniel loading screen immediately
  showLoadingScreen()

  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      window.location.href = '/login.html'
      return
    }

    state.currentUser = user

    // Parent Zone gate: the whole profile page (children, billing, account)
    // is parent-only, so verify before anything renders
    hideLoadingScreen()
    const gatePassed = await requireParentGate()
    if (!gatePassed) {
      window.location.href = '/dashboard.html'
      return
    }
    showLoadingScreen()

    // Update header
    if (headerSubtitle) {
      headerSubtitle.textContent = `Welcome back, ${user.email}!`
    }

    // Check if admin
    state.isAdmin = await checkIsAdmin()
    if (state.isAdmin) {
      if (adminButton) adminButton.style.display = 'flex'
      if (adminButtonDesktop) showElement(adminButtonDesktop)
    }

    // Load data
    await loadData()

    // Hide loading screen, show profile view
    hideLoadingScreen()
    hideElement(loadingState)
    showElement(profileView)

    // Initialize profile hub (ModuleGallery)
    initProfileHub()

  } catch (error) {
    console.error('Profile initialization error:', error)
    hideLoadingScreen()
    hideElement(loadingState)
    showElement(profileView)
  }
}

// Load user data - all queries run in parallel for speed
async function loadData() {
  try {
    const userId = state.currentUser.id

    const [childrenResult, modulesResult, tiersResult, subResult, creditResult] = await Promise.allSettled([
      supabase.from('children').select('*').eq('parent_user_id', userId).order('created_at', { ascending: true }),
      supabase.from('modules').select('*, super_skills(*)').eq('is_active', true).order('pathway_order', { ascending: true }),
      supabase.from('subscription_tiers').select('*').eq('is_active', true).order('created_at', { ascending: true }),
      supabase.from('parent_subscriptions').select('*, subscription_tiers(*)').eq('parent_id', userId).maybeSingle(),
      supabase.from('parent_profiles').select('credits').eq('id', userId).maybeSingle()
    ])

    // Children
    if (childrenResult.status === 'fulfilled' && !childrenResult.value.error) {
      state.children = childrenResult.value.data || []
      window.dashboardState = window.dashboardState || {}
      window.dashboardState.children = state.children
    }

    // Modules
    if (modulesResult.status === 'fulfilled' && !modulesResult.value.error) {
      state.modules = modulesResult.value.data || []
      window.modules = state.modules
      window.dashboardState = window.dashboardState || {}
      window.dashboardState.modules = state.modules
    }

    // Subscription tiers
    if (tiersResult.status === 'fulfilled' && !tiersResult.value.error) {
      window.subscriptionTiers = tiersResult.value.data || []
    }

    // Current subscription
    if (subResult.status === 'fulfilled' && !subResult.value.error) {
      const subscription = subResult.value.data
      if (subscription) {
        state.subscription = subscription
        window.currentSubscription = subscription
        if (subscription.subscription_tiers) {
          subscription.tierData = subscription.subscription_tiers
        }

        // Self-healing: if Stripe has a customer for this family but the
        // subscription doesn't look active (e.g. a webhook delivery was
        // missed after checkout), ask the server to sync the truth from
        // Stripe. Idempotent — it can activate and grant missed credits,
        // never double-grant.
        if (subscription.stripe_customer_id &&
            !['active', 'trialing'].includes(subscription.status)) {
          maybeSyncSubscription()
        }
      }
    }

    // Credit summary (from parent_profiles.credits column)
    if (creditResult.status === 'fulfilled' && !creditResult.value.error && creditResult.value.data) {
      window.currentCreditSummary = { credits_available: creditResult.value.data.credits ?? 0 }
    } else {
      window.currentCreditSummary = { credits_available: 0 }
    }

  } catch (error) {
    console.error('Error loading data:', error)
  }
}

// Ask the server to reconcile the subscription with Stripe. Fire-and-
// forget with a page refresh only when something actually changed.
let _syncAttempted = false
async function maybeSyncSubscription() {
  if (_syncAttempted) return
  _syncAttempted = true
  try {
    const { data, error } = await supabase.functions.invoke('sync-subscription', { body: {} })
    if (error || !data?.synced) return
    if (['active', 'trialing'].includes(data.status) || data.credits_granted > 0) {
      showToast(
        data.credits_granted > 0
          ? `Subscription activated — ${data.credits_granted} module credits added!`
          : 'Subscription status updated.',
        'success'
      )
      // Reload so the plan section and credit counts reflect reality
      setTimeout(() => window.location.reload(), 1500)
    }
  } catch (err) {
    console.warn('Subscription sync failed (will retry next visit):', err)
    _syncAttempted = false
  }
}

// Initialize the profile hub
function initProfileHub() {
  const container = document.getElementById('moduleGalleryContainer')
  if (!container) return
  
  // Render the profile sections
  renderBasicProfileSections(container)
}

// Render basic profile sections if ModuleGallery isn't available
function renderBasicProfileSections(container) {
  // Get plan details
  const planHtml = renderPlanSection()
  const modulesHtml = renderModulesSection()
  
  container.innerHTML = `
    <section class="profile-hub">
      <div class="profile-hub-header">
        <h2 class="profile-hub-title">👤 Your Profile & Plan</h2>
        <p class="profile-hub-subtitle">Manage your family learning journey</p>
      </div>
      
      <div class="profile-sections">
        <!-- Children Section - collapsed by default -->
        <div class="profile-section">
          <button class="profile-section-toggle" data-section="children">
            <span class="profile-section-icon">👨‍👩‍👧‍👦</span>
            <span class="profile-section-title">Children</span>
            <span class="profile-section-arrow">▼</span>
          </button>
          <div class="profile-section-content collapsed" id="childrenSectionContent">
            <div id="childrenList"></div>
            <button class="btn-primary" id="addChildBtn" style="margin-top: 16px;">+ Add Child</button>
          </div>
        </div>
        
        <!-- Plan Section - collapsed by default. Hidden inside the iOS app:
             subscriptions are managed on the website only (companion mode). -->
        <div class="profile-section" data-web-only>
          <button class="profile-section-toggle" data-section="plan">
            <span class="profile-section-icon">📋</span>
            <span class="profile-section-title">Plan</span>
            <span class="profile-section-arrow">▼</span>
          </button>
          <div class="profile-section-content collapsed" id="planSectionContent">
            ${planHtml}
          </div>
        </div>
        
        <!-- Modules Section - collapsed by default -->
        <div class="profile-section">
          <button class="profile-section-toggle" data-section="modules">
            <span class="profile-section-icon">📚</span>
            <span class="profile-section-title">Modules</span>
            <span class="profile-section-arrow">▼</span>
          </button>
          <div class="profile-section-content collapsed" id="modulesSectionContent">
            ${modulesHtml}
          </div>
        </div>
      </div>
    </section>

    <!-- Feedback Section -->
    <section class="profile-hub" style="margin-top:24px;">
      <div class="profile-hub-header">
        <h2 class="profile-hub-title">💬 Send Us Feedback</h2>
        <p class="profile-hub-subtitle">We'd love to hear what you think — your feedback helps us improve</p>
      </div>
      <div style="padding:0 24px 24px;">
        <div class="feedback-stars" id="feedbackStars" style="display:flex; gap:6px; margin-bottom:16px;">
          <button type="button" class="feedback-star" data-rating="1" aria-label="1 star" style="background:none; border:none; font-size:28px; cursor:pointer; opacity:0.35; transition:opacity 0.15s, transform 0.15s;">⭐</button>
          <button type="button" class="feedback-star" data-rating="2" aria-label="2 stars" style="background:none; border:none; font-size:28px; cursor:pointer; opacity:0.35; transition:opacity 0.15s, transform 0.15s;">⭐</button>
          <button type="button" class="feedback-star" data-rating="3" aria-label="3 stars" style="background:none; border:none; font-size:28px; cursor:pointer; opacity:0.35; transition:opacity 0.15s, transform 0.15s;">⭐</button>
          <button type="button" class="feedback-star" data-rating="4" aria-label="4 stars" style="background:none; border:none; font-size:28px; cursor:pointer; opacity:0.35; transition:opacity 0.15s, transform 0.15s;">⭐</button>
          <button type="button" class="feedback-star" data-rating="5" aria-label="5 stars" style="background:none; border:none; font-size:28px; cursor:pointer; opacity:0.35; transition:opacity 0.15s, transform 0.15s;">⭐</button>
        </div>
        <textarea id="feedbackText" placeholder="What's working well? What could be better?" rows="4" style="width:100%; padding:12px 14px; border:1.5px solid #d4dbe6; border-radius:12px; font-family:'Fredoka',sans-serif; font-size:14px; resize:vertical; box-sizing:border-box; color:#2b3a55; line-height:1.5;"></textarea>
        <div style="display:flex; align-items:center; gap:12px; margin-top:12px;">
          <button id="feedbackSubmitBtn" type="button" style="padding:10px 24px; background:linear-gradient(135deg,#14b8a6,#0d9488); color:white; border:none; border-radius:12px; font-family:'Fredoka',sans-serif; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s;">Send Feedback</button>
          <span id="feedbackStatus" style="font-size:13px; color:#6b7c8f;"></span>
        </div>
      </div>
    </section>

    <!-- Privacy & Data - subtle footer links -->
    <div style="margin-top:32px; padding:0 24px 24px; text-align:center;">
      <p style="font-size:12px; font-weight:600; color:#6b7c8f; margin:0 0 10px; font-family:'Fredoka',sans-serif;">Account</p>
      <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
        <button id="parentPinBtn" type="button" style="background:none; border:none; color:#6b7c8f; font-size:13px; font-family:'Fredoka',sans-serif; cursor:pointer; text-decoration:underline; padding:0;">Parent Zone PIN</button>
        <span style="color:#d1d5db; font-size:13px;">|</span>
        <button id="downloadDataBtn" type="button" style="background:none; border:none; color:#6b7c8f; font-size:13px; font-family:'Fredoka',sans-serif; cursor:pointer; text-decoration:underline; padding:0;">Download My Data</button>
        <span style="color:#d1d5db; font-size:13px;">|</span>
        <button id="deleteAccountBtn" type="button" style="background:none; border:none; color:#dc2626; font-size:13px; font-weight:600; font-family:'Fredoka',sans-serif; cursor:pointer; text-decoration:underline; padding:0;">Delete Account</button>
      </div>
      <p id="dataActionStatus" style="font-size:11px; color:#9ca3af; margin-top:8px;"></p>
    </div>

    <style>
      .profile-section-content.collapsed {
        display: none;
      }
      .profile-section.expanded .profile-section-content.collapsed {
        display: block;
      }
      .profile-section.expanded .profile-section-arrow {
        transform: rotate(180deg);
      }
      .profile-section-arrow {
        transition: transform 0.2s ease;
      }
      .feedback-star.active {
        opacity: 1 !important;
        transform: scale(1.15);
      }
    </style>
  `
  
  // Setup toggle listeners
  container.querySelectorAll('.profile-section-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const section = toggle.closest('.profile-section')
      section.classList.toggle('expanded')
    })
  })
  
  // Render children list
  renderChildrenList()
  
  // Setup add child button
  const addChildBtn = document.getElementById('addChildBtn')
  if (addChildBtn) {
    addChildBtn.addEventListener('click', showAddChildModal)
  }

  // Wire plan action buttons
  document.getElementById('changePlanBtn')?.addEventListener('click', openChangePlanModal)
  document.getElementById('makePaymentBtn')?.addEventListener('click', openMakePaymentModal)

  // Subscription management buttons
  document.getElementById('cancelSubscriptionBtn')?.addEventListener('click', () => {
    showSubscriptionConfirmModal('cancel')
  })
  document.getElementById('pauseSubscriptionBtn')?.addEventListener('click', () => {
    showSubscriptionConfirmModal('pause')
  })
  document.getElementById('resumeSubscriptionBtn')?.addEventListener('click', (e) => {
    handleSubscriptionAction('resume', e.target)
  })
  document.getElementById('retryPaymentBtn')?.addEventListener('click', () => {
    openMakePaymentModal()
  })

  // Feedback star rating
  let feedbackRating = 0
  const stars = container.querySelectorAll('.feedback-star')
  stars.forEach(star => {
    star.addEventListener('click', () => {
      feedbackRating = parseInt(star.dataset.rating)
      stars.forEach((s, i) => {
        s.classList.toggle('active', i < feedbackRating)
      })
    })
  })

  // Feedback submit
  const feedbackBtn = document.getElementById('feedbackSubmitBtn')
  const feedbackText = document.getElementById('feedbackText')
  const feedbackStatus = document.getElementById('feedbackStatus')

  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', async () => {
      const message = feedbackText.value.trim()
      if (!message && feedbackRating === 0) {
        feedbackStatus.textContent = 'Please add a rating or message.'
        feedbackStatus.style.color = '#ef4444'
        return
      }

      feedbackBtn.disabled = true
      feedbackBtn.textContent = 'Sending...'
      feedbackStatus.textContent = ''

      try {
        const user = state.currentUser
        const { error } = await supabase.from('user_feedback').insert({
          user_id: user?.id || null,
          email: user?.email || 'unknown',
          rating: feedbackRating || null,
          message: message || null
        })

        if (error) throw error

        feedbackText.value = ''
        feedbackRating = 0
        stars.forEach(s => s.classList.remove('active'))
        feedbackStatus.textContent = 'Thank you for your feedback!'
        feedbackStatus.style.color = '#0d9488'
        feedbackBtn.textContent = 'Send Feedback'
        feedbackBtn.disabled = false
      } catch (err) {
        console.error('Feedback error:', err)
        feedbackStatus.textContent = 'Something went wrong. Please try again.'
        feedbackStatus.style.color = '#ef4444'
        feedbackBtn.textContent = 'Send Feedback'
        feedbackBtn.disabled = false
      }
    })
  }

  // ── Download My Data (APP 12 compliance) ──
  const downloadBtn = document.getElementById('downloadDataBtn')
  const dataStatus = document.getElementById('dataActionStatus')
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      downloadBtn.disabled = true
      downloadBtn.textContent = 'Preparing download...'
      if (dataStatus) dataStatus.textContent = ''

      try {
        const { data, error } = await supabase.functions.invoke('export-user-data')
        if (error) throw error

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `daniels-diaries-data-export-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        if (dataStatus) {
          dataStatus.textContent = 'Download started!'
          dataStatus.style.color = '#0d9488'
        }
      } catch (err) {
        console.error('Data export error:', err)
        if (dataStatus) {
          dataStatus.textContent = 'Failed to export data. Please try again or contact support.'
          dataStatus.style.color = '#ef4444'
        }
      } finally {
        downloadBtn.disabled = false
        downloadBtn.textContent = 'Download My Data'
      }
    })
  }

  // ── Parent Zone PIN ──
  document.getElementById('parentPinBtn')?.addEventListener('click', () => {
    openParentPinSettings()
  })

  // ── Delete My Account ──
  const deleteBtn = document.getElementById('deleteAccountBtn')
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const user = state.currentUser
      if (!user) return

      const confirmed = confirm(
        'Are you sure you want to permanently delete your account?\n\n' +
        'This will delete:\n' +
        '- Your profile and all personal information\n' +
        '- All children\'s profiles and their data\n' +
        '- All module progress, mood check-ins, and responses\n' +
        '- Your subscription (will be cancelled)\n\n' +
        'This action CANNOT be undone.'
      )
      if (!confirmed) return

      const confirmEmail = prompt(
        'To confirm, please type your email address:\n' + (user.email || '')
      )
      if (!confirmEmail) return

      deleteBtn.disabled = true
      deleteBtn.textContent = 'Deleting...'
      if (dataStatus) dataStatus.textContent = ''

      try {
        const { data, error } = await supabase.functions.invoke('delete-account', {
          body: { confirmEmail }
        })
        if (error) {
          let msg = error.message || 'Deletion failed'
          if (error.context && typeof error.context.json === 'function') {
            try {
              const body = await error.context.json()
              if (body?.error) msg = body.error
            } catch (_) {}
          }
          throw new Error(msg)
        }

        alert('Your account has been permanently deleted. You will now be redirected to the home page.')
        window.location.href = '/'
      } catch (err) {
        console.error('Account deletion error:', err)
        if (dataStatus) {
          dataStatus.textContent = err.message || 'Failed to delete account. Please contact support.'
          dataStatus.style.color = '#ef4444'
        }
        deleteBtn.disabled = false
        deleteBtn.textContent = 'Delete My Account'
      }
    })
  }
}

// Render plan section content
function renderPlanSection() {
  const sub = window.currentSubscription || state.subscription
  const creditSummary = window.currentCreditSummary || {}
  const creditsAvailable = creditSummary.credits_available || 0
  const creditsUsed = creditSummary.credits_used || 0
  
  // Get tier data from the joined subscription_tiers
  const tierData = sub?.subscription_tiers || sub?.tierData || {}
  const currentTierName = sub?.tier || 'free'
  
  const tierBadge = (currentTierName || 'FREE').toUpperCase()
  const modulesPerMonth = tierData.modules_per_month || 0
  const monthlyPrice = tierData.monthly_price_cents ? `$${(tierData.monthly_price_cents / 100).toFixed(2)}/month` : 'Free'
  const status = (sub && sub.status) ? sub.status.toUpperCase() : 'INACTIVE'
  
  // Format next payment date from parent_subscriptions fields
  let nextPayment = 'Not set'
  if (sub && sub.stripe_current_period_end) {
    const date = new Date(sub.stripe_current_period_end)
    if (!isNaN(date.getTime())) {
      nextPayment = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }
  } else if (sub && sub.current_period_end) {
    const date = new Date(sub.current_period_end)
    if (!isNaN(date.getTime())) {
      nextPayment = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }
  }
  
  const isPastDue = sub && sub.status === 'past_due'
  const isPaused = sub && sub.status === 'paused'
  const isCancelScheduled = sub && sub.cancel_at_period_end

  let statusBanner = ''
  if (isPastDue) {
    statusBanner = `
      <div class="plan-status-banner plan-status-banner-warning">
        <strong>Payment issue</strong>
        <p>We had trouble with your last payment. Please update your payment method to keep your subscription active.</p>
        <button type="button" id="retryPaymentBtn" class="profile-action-btn profile-action-btn-primary" style="margin-top:8px;">Update Payment</button>
      </div>`
  } else if (isPaused) {
    statusBanner = `
      <div class="plan-status-banner plan-status-banner-info">
        <strong>Subscription paused</strong>
        <p>Your subscription is currently paused. You won't be charged until you resume.</p>
        <button type="button" id="resumeSubscriptionBtn" class="profile-action-btn profile-action-btn-primary" style="margin-top:8px;">Resume Subscription</button>
      </div>`
  } else if (isCancelScheduled) {
    statusBanner = `
      <div class="plan-status-banner plan-status-banner-info">
        <strong>Cancellation scheduled</strong>
        <p>Your subscription will end on ${nextPayment}. You can still use it until then.</p>
        <button type="button" id="resumeSubscriptionBtn" class="profile-action-btn profile-action-btn-primary" style="margin-top:8px;">Keep Subscription</button>
      </div>`
  }

  const manageLinks =
    (!isPaused && !isCancelScheduled ? '<button type="button" id="pauseSubscriptionBtn" class="plan-manage-link">Pause subscription</button>' : '') +
    (!isCancelScheduled ? '<button type="button" id="cancelSubscriptionBtn" class="plan-manage-link plan-manage-link-danger">Cancel subscription</button>' : '')

  return `
    <div class="plan-overview">
      ${statusBanner}
      <div class="plan-current-info">
        <div class="plan-tier-badge">${tierBadge}</div>
        <h3>Current Plan Details</h3>
        <div class="plan-stats">
          <div class="plan-stat">
            <span class="plan-stat-label">Monthly Modules</span>
            <span class="plan-stat-value">${modulesPerMonth}</span>
          </div>
          <div class="plan-stat">
            <span class="plan-stat-label">Monthly Cost</span>
            <span class="plan-stat-value">${monthlyPrice}</span>
          </div>
          <div class="plan-stat">
            <span class="plan-stat-label">Status</span>
            <span class="plan-stat-value">${status}</span>
          </div>
        </div>
      </div>
      <div class="plan-billing-info">
        <h4>Billing Snapshot</h4>
        <div class="billing-stats">
          <div class="billing-stat">
            <span class="billing-stat-label">Next Payment</span>
            <span class="billing-stat-value">${nextPayment}</span>
          </div>
          <div class="billing-stat">
            <span class="billing-stat-label">Credits Available</span>
            <span class="billing-stat-value">${creditsAvailable}</span>
          </div>
          <div class="billing-stat">
            <span class="billing-stat-label">Credits Used</span>
            <span class="billing-stat-value">${creditsUsed}</span>
          </div>
        </div>
      </div>
      <div class="plan-actions">
        <button class="profile-action-btn" id="changePlanBtn">Change Plan</button>
        <button class="profile-action-btn profile-action-btn-primary" id="makePaymentBtn">Make a Payment</button>
      </div>
      <div class="plan-manage-links">
        ${sub && sub.status && sub.status !== 'inactive' ? '<button type="button" id="printStatementBtn" class="plan-manage-link">Print plan statement (for NDIS claims)</button>' : ''}
        ${manageLinks}
      </div>
    </div>
  `
}

// Printable subscription statement, worded so plan managers can process
// self/plan-managed NDIS claims (business identity + service description).
const STATEMENT_BUSINESS = {
  name: "Daniel's Diaries — Foundational Minds",
  abn: '', // set before public release; the ABN row is hidden while empty
  email: 'info@danielsdiaries.com',
  web: 'danielsdiaries.com'
}

async function openPlanStatement() {
  const sub = window.currentSubscription || state.subscription
  if (!sub || !sub.status || sub.status === 'inactive') {
    showToast('You need an active subscription to generate a statement.', 'error')
    return
  }

  const tierData = sub.subscription_tiers || sub.tierData || {}
  const price = tierData.monthly_price_cents ? `A$${(tierData.monthly_price_cents / 100).toFixed(2)} per month` : '—'
  const planName = tierData.display_name || (sub.tier || '').toUpperCase()

  let parentName = ''
  try {
    const { data } = await supabase
      .from('parent_profiles')
      .select('full_name')
      .eq('id', state.currentUser.id)
      .maybeSingle()
    parentName = data?.full_name || ''
  } catch { /* fall back to email only */ }

  const fmt = (d) => {
    const date = new Date(d)
    return isNaN(date.getTime()) ? null : date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  const periodStart = fmt(sub.stripe_current_period_start || sub.current_period_start)
  const periodEnd = fmt(sub.stripe_current_period_end || sub.current_period_end)
  const today = fmt(new Date())

  const win = window.open('', '_blank')
  if (!win) {
    showToast('Please allow pop-ups to print your statement.', 'error')
    return
  }

  const row = (label, value) => value
    ? `<tr><td style="padding:6px 14px 6px 0;color:#6b7280;white-space:nowrap;">${label}</td><td style="padding:6px 0;font-weight:600;">${value}</td></tr>`
    : ''

  win.document.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Subscription statement — Daniel's Diaries</title>
<style>
  body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1f2937; max-width: 720px; margin: 40px auto; padding: 0 24px; line-height: 1.6; }
  h1 { font-size: 22px; margin-bottom: 2px; }
  .muted { color: #6b7280; font-size: 13px; }
  table { border-collapse: collapse; font-size: 14px; margin: 18px 0; }
  .box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; margin-top: 18px; font-size: 13px; }
  @media print { .noprint { display: none; } }
</style></head><body>
  <h1>Subscription statement</h1>
  <p class="muted">${escapeHtml(STATEMENT_BUSINESS.name)}${STATEMENT_BUSINESS.abn ? ' · ABN ' + escapeHtml(STATEMENT_BUSINESS.abn) : ''} · ${escapeHtml(STATEMENT_BUSINESS.web)} · ${escapeHtml(STATEMENT_BUSINESS.email)}</p>
  <p class="muted">Statement generated ${today}</p>
  <table>
    ${row('Account holder', escapeHtml(parentName))}
    ${row('Account email', escapeHtml(state.currentUser?.email || ''))}
    ${row('Service', "Daniel's Diaries — structured psychoeducational skill-building program for children (family subscription)")}
    ${row('Plan', escapeHtml(planName))}
    ${row('Subscription price', escapeHtml(price))}
    ${row('Status', escapeHtml((sub.status || '').replace('_', ' ')))}
    ${row('Current billing period', periodStart && periodEnd ? `${periodStart} — ${periodEnd}` : null)}
  </table>
  <div class="box">
    This statement is provided to assist families who self-manage or plan-manage NDIS funding. Daniel's Diaries is a
    mainstream educational wellbeing product; whether a subscription can be claimed depends on the participant's plan
    and is a matter for the participant, their plan manager and the NDIA. Payment receipts for individual charges are
    issued by our payment processor (Stripe) at the time of each payment.
  </div>
  <p class="noprint" style="margin-top:24px;"><button onclick="window.print()" style="padding:10px 18px;font-size:14px;cursor:pointer;">Print / Save as PDF</button></p>
</body></html>`)
  win.document.close()
}

// Delegated so it survives plan-section re-renders
document.addEventListener('click', (e) => {
  if (e.target.closest('#printStatementBtn')) openPlanStatement()
})

// Render modules section content
function renderModulesSection() {
  const modules = state.modules || []
  
  if (modules.length === 0) {
    return '<p style="color: #6c757d; padding: 16px;">No modules available.</p>'
  }
  
  // Group modules by super skill
  const grouped = {}
  modules.forEach(m => {
    const skillName = m.super_skills?.name || 'Other'
    if (!grouped[skillName]) grouped[skillName] = []
    grouped[skillName].push(m)
  })
  
  let html = '<div style="padding: 8px;">'
  
  for (const [skillName, skillModules] of Object.entries(grouped)) {
    html += `
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 600; color: #405878; margin-bottom: 8px; font-size: 14px;">${skillName}</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
          ${skillModules.slice(0, 6).map(m => `
            <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; font-size: 13px;">
              <div style="font-weight: 500; color: #405878;">${m.title || 'Module'}</div>
              <div style="font-size: 11px; color: #6c757d; margin-top: 4px;">Week ${m.pathway_order || m.week_number || '?'}</div>
            </div>
          `).join('')}
          ${skillModules.length > 6 ? `<div style="padding: 12px; color: #6c757d; font-size: 12px;">+${skillModules.length - 6} more</div>` : ''}
        </div>
      </div>
    `
  }
  
  html += '</div>'
  return html
}

// Render children list
function renderChildrenList() {
  const childrenList = document.getElementById('childrenList')
  if (!childrenList) return
  
  if (state.children.length === 0) {
    childrenList.innerHTML = '<p style="color: #6c757d;">No children added yet.</p>'
    return
  }
  
  childrenList.innerHTML = state.children.map(child => `
    <div class="child-card" data-child-id="${child.id}" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8f9fa; border-radius: 12px; margin-bottom: 8px; cursor: pointer;">
      <span style="font-size: 32px;">${childAvatarHTML(child.avatar)}</span>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #405878;">${escapeHtml(child.name)}</div>
        <div style="font-size: 12px; color: #6c757d;">Click to view dashboard</div>
      </div>
      <button class="edit-child-btn" data-child-id="${child.id}" style="background: none; border: none; cursor: pointer; font-size: 18px;">✏️</button>
    </div>
  `).join('')
  
  // Add click listeners
  childrenList.querySelectorAll('.child-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-child-btn')) return
      const childId = card.dataset.childId
      window.location.href = `/dashboard.html?childId=${childId}`
    })
  })
  
  childrenList.querySelectorAll('.edit-child-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const childId = btn.dataset.childId
      const child = state.children.find(c => c.id === childId)
      if (child) openEditChildModal(child)
    })
  })
}

// Open edit child modal
function openEditChildModal(child) {
  state.editingChild = child
  const editChildName = document.getElementById('editChildName')
  if (editChildName) editChildName.value = child.name

  const currentAvatar = child.avatar || '🦊'
  const avatarInput = document.getElementById('editChildAvatar')
  if (avatarInput) avatarInput.value = currentAvatar
  const preview = document.getElementById('editAvatarPreviewCircle')
  if (preview) preview.innerHTML = childAvatarHTML(currentAvatar)

  const errorEl = document.getElementById('editModalError')
  if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden') }

  renderAvatarPicker('edit', currentAvatar)
  showElement(editChildModal)
}

// Setup navigation
function setupNavigation() {
  // Dashboard button - go to dashboard with remembered child
  const goToDashboard = () => {
    showLoadingScreen()
    const rememberedChildId = localStorage.getItem('selectedChildId')
    if (rememberedChildId) {
      window.location.href = `/dashboard.html?childId=${rememberedChildId}`
    } else if (state.children.length === 1) {
      window.location.href = `/dashboard.html?childId=${state.children[0].id}`
    } else if (state.children.length > 0) {
      window.location.href = `/dashboard.html?childId=${state.children[0].id}`
    } else {
      window.location.href = '/dashboard.html'
    }
  }
  
  if (dashboardHomeButton) {
    dashboardHomeButton.addEventListener('click', goToDashboard)
  }
  if (dashboardHomeButtonDesktop) {
    dashboardHomeButtonDesktop.addEventListener('click', goToDashboard)
  }
  
  // Profile button - already on profile page
  if (profileButton) {
    profileButton.addEventListener('click', () => {
      // Already on profile page, do nothing or refresh
    })
  }
  if (profileButtonDesktop) {
    profileButtonDesktop.addEventListener('click', () => {
      // Already on profile page, do nothing or refresh
    })
  }
  
  // Logout
  const handleLogout = async () => {
    try {
      localStorage.removeItem('selectedChildId')
      await signOut()
      window.location.href = '/login.html'
    } catch (error) {
      console.error('Logout error:', error)
      showToast('Failed to logout. Please try again.', 'error')
    }
  }
  
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout)
  }
  if (logoutButtonDesktop) {
    logoutButtonDesktop.addEventListener('click', handleLogout)
  }
  
  // Admin button
  if (adminButton) {
    adminButton.addEventListener('click', () => {
      window.location.href = '/admin.html'
    })
  }
  if (adminButtonDesktop) {
    adminButtonDesktop.addEventListener('click', () => {
      window.location.href = '/admin.html'
    })
  }
  
  // Hamburger menu
  if (hamburgerMenu && dropdownMenu) {
    hamburgerMenu.addEventListener('click', () => {
      dropdownMenu.classList.toggle('show')
    })
    
    document.addEventListener('click', (e) => {
      if (!hamburgerMenu.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove('show')
      }
    })
  }
}

// Render emoji avatar picker into a modal (add or edit)
function renderAvatarPicker(prefix, selectedAvatar) {
  const selected = selectedAvatar || '🦊'
  const categoryNames = ['crew', 'animals', 'magical', 'heroes', 'space']

  categoryNames.forEach(cat => {
    const container = document.getElementById(prefix + 'AvatarPicker' + cat.charAt(0).toUpperCase() + cat.slice(1))
    if (!container) return
    container.innerHTML = ''
    avatarCategories[cat].forEach(emoji => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'avatar-option-fun' + (emoji === selected ? ' selected' : '')
      btn.dataset.avatar = emoji
      btn.innerHTML = childAvatarHTML(emoji)
      btn.addEventListener('click', () => {
        // Deselect all in this modal
        document.querySelectorAll('#' + prefix + 'AvatarPickerCrew .avatar-option-fun, #' + prefix + 'AvatarPickerAnimals .avatar-option-fun, #' + prefix + 'AvatarPickerMagical .avatar-option-fun, #' + prefix + 'AvatarPickerHeroes .avatar-option-fun, #' + prefix + 'AvatarPickerSpace .avatar-option-fun')
          .forEach(b => b.classList.remove('selected'))
        btn.classList.add('selected')
        // Update hidden input and preview
        const hiddenInput = document.getElementById(prefix + 'ChildAvatar')
        const preview = document.getElementById(prefix + 'AvatarPreviewCircle')
        if (hiddenInput) hiddenInput.value = emoji
        if (preview) preview.innerHTML = childAvatarHTML(emoji)
      })
      container.appendChild(btn)
    })
  })
}

// Show add child modal with avatar picker
function showAddChildModal() {
  // Reset form
  const form = document.getElementById('addChildForm')
  if (form) form.reset()
  const avatarInput = document.getElementById('addChildAvatar')
  if (avatarInput) avatarInput.value = '🦊'
  const preview = document.getElementById('addAvatarPreviewCircle')
  if (preview) preview.textContent = '🦊'
  const errorEl = document.getElementById('modalError')
  if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden') }

  renderAvatarPicker('add', '🦊')
  showElement(addChildModal)

  // Auto-focus name
  setTimeout(() => document.getElementById('childName')?.focus(), 100)
}

// Handle add child form submission
async function handleAddChild(e) {
  e.preventDefault()
  const name = document.getElementById('childName')?.value.trim()
  const dob = document.getElementById('childDob')?.value
  const avatar = document.getElementById('addChildAvatar')?.value || '🦊'
  const errorEl = document.getElementById('modalError')
  const submitBtn = e.target.querySelector('button[type="submit"]')

  if (!name || !dob) {
    if (errorEl) { errorEl.textContent = 'Please fill in both name and date of birth.'; errorEl.classList.remove('hidden') }
    return
  }

  try {
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating...' }

    const { data, error } = await supabase
      .from('children')
      .insert([{ parent_user_id: state.currentUser.id, name, date_of_birth: dob, avatar }])
      .select()
      .single()

    if (error) throw error

    state.children.push(data)
    renderChildrenList()
    hideElement(addChildModal)

    // Confetti celebration
    createConfetti()
  } catch (err) {
    console.error('Error adding child:', err)
    if (errorEl) { errorEl.textContent = err.message || 'Could not add child. Please try again.'; errorEl.classList.remove('hidden') }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '✨ Add Child!' }
  }
}

// Handle edit child form submission
async function handleEditChild(e) {
  e.preventDefault()
  if (!state.editingChild) return

  const name = document.getElementById('editChildName')?.value.trim()
  const avatar = document.getElementById('editChildAvatar')?.value || state.editingChild.avatar || '🦊'
  const errorEl = document.getElementById('editModalError')
  const submitBtn = e.target.querySelector('button[type="submit"]')

  if (!name) {
    if (errorEl) { errorEl.textContent = 'Please enter a name.'; errorEl.classList.remove('hidden') }
    return
  }

  try {
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...' }

    const { error } = await supabase
      .from('children')
      .update({ name, avatar })
      .eq('id', state.editingChild.id)

    if (error) throw error

    // Update local state
    const idx = state.children.findIndex(c => c.id === state.editingChild.id)
    if (idx >= 0) {
      state.children[idx].name = name
      state.children[idx].avatar = avatar
    }

    renderChildrenList()
    hideElement(editChildModal)
  } catch (err) {
    console.error('Error editing child:', err)
    if (errorEl) { errorEl.textContent = err.message || 'Could not save changes. Please try again.'; errorEl.classList.remove('hidden') }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '✨ Save Changes' }
  }
}

// Simple confetti celebration
function createConfetti() {
  const colors = ['#7c3aed', '#ec4899', '#fbbf24', '#14b8a6', '#3b82f6', '#f97316', '#22c55e']
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div')
    piece.style.cssText = `position:fixed;width:${6 + Math.random() * 8}px;height:${6 + Math.random() * 8}px;background:${colors[Math.floor(Math.random() * colors.length)]};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};top:-10px;left:${Math.random() * 100}%;z-index:100000;pointer-events:none;animation:confettiFall ${1.5 + Math.random() * 2}s ease-out forwards;animation-delay:${Math.random() * 0.5}s;opacity:0;`
    document.body.appendChild(piece)
    setTimeout(() => piece.remove(), 3500)
  }
}

// Add confetti keyframe if not present
if (!document.getElementById('confetti-keyframes')) {
  const style = document.createElement('style')
  style.id = 'confetti-keyframes'
  style.textContent = '@keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }'
  document.head.appendChild(style)
}

// Setup modal listeners
function setupModals() {
  // Close buttons
  document.getElementById('closeAddChildModal')?.addEventListener('click', () => hideElement(addChildModal))
  document.getElementById('closeEditChildModal')?.addEventListener('click', () => hideElement(editChildModal))
  document.getElementById('closeRemoveChildModal')?.addEventListener('click', () => hideElement(removeChildModal))
  document.getElementById('closeParentPasswordModal')?.addEventListener('click', () => hideElement(parentPasswordModal))

  // Cancel buttons
  document.getElementById('cancelAddChild')?.addEventListener('click', () => hideElement(addChildModal))
  document.getElementById('cancelEditChild')?.addEventListener('click', () => hideElement(editChildModal))
  document.getElementById('cancelRemoveChild')?.addEventListener('click', () => hideElement(removeChildModal))
  document.getElementById('cancelParentPassword')?.addEventListener('click', () => hideElement(parentPasswordModal))

  // Form submissions
  document.getElementById('addChildForm')?.addEventListener('submit', handleAddChild)
  document.getElementById('editChildForm')?.addEventListener('submit', handleEditChild)

  // Remove child button (in edit modal) -> opens confirmation
  document.getElementById('removeChildBtn')?.addEventListener('click', () => {
    if (!state.editingChild) return
    const nameEl = document.getElementById('removeChildName')
    if (nameEl) nameEl.textContent = state.editingChild.name
    hideElement(editChildModal)
    showElement(removeChildModal)
  })

  // Confirm remove child
  document.getElementById('confirmRemoveChild')?.addEventListener('click', async () => {
    if (!state.editingChild) return
    try {
      const { error } = await supabase.from('children').delete().eq('id', state.editingChild.id)
      if (error) throw error
      state.children = state.children.filter(c => c.id !== state.editingChild.id)
      state.editingChild = null
      renderChildrenList()
      hideElement(removeChildModal)
    } catch (err) {
      console.error('Error removing child:', err)
      showToast('Could not remove child. Please try again.', 'error')
    }
  })
}

// ─── Make Payment Modal ───────────────────────────────────────────────────────

const DISCOUNT_RATES = { 1: 0, 3: 0.05, 6: 0.10, 12: 0.17 }
const CREDIT_PRICE = 6.99

function getMonthlyPriceDollars() {
  const sub = window.currentSubscription || state.subscription
  const currentTier = sub?.tier
  const tiers = window.subscriptionTiers || []
  const tierConfig = tiers.find(t => t.tier === currentTier)
  const cents = Number(tierConfig?.monthly_price_cents)
  return Number.isFinite(cents) && cents > 0 ? cents / 100 : 19
}

function calcPaymentTotal(months) {
  const monthly = getMonthlyPriceDollars()
  const discount = DISCOUNT_RATES[months] || 0
  return Number((monthly * months * (1 - discount)).toFixed(2))
}

function formatPaymentLabel(months) {
  const price = calcPaymentTotal(months)
  const discount = DISCOUNT_RATES[months] || 0
  return discount > 0
    ? `$${price.toFixed(2)} - Save ${Math.round(discount * 100)}%`
    : `$${price.toFixed(2)}`
}

function calcNewEndDate(months) {
  const sub = window.currentSubscription || state.subscription
  const periodEnd = sub?.stripe_current_period_end || sub?.current_period_end
  const base = periodEnd && new Date(periodEnd) > new Date() ? new Date(periodEnd) : new Date()
  const result = new Date(base)
  result.setMonth(result.getMonth() + months)
  return result
}

function formatDateAU(date) {
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function callCheckoutSession(payload) {
  trackEvent('upgrade_checkout_start', {
    payment_type: payload?.paymentType || 'subscription',
    months: payload?.months || null,
    credits: payload?.credits || null
  })
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  if (!supabaseUrl) throw new Error('Supabase URL is not configured.')

  const session = await supabase.auth.getSession()
  const accessToken = session?.data?.session?.access_token
  if (!accessToken) throw new Error('Your session has expired. Please sign in again.')

  const origin = window.location.origin
  const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({
      ...payload,
      success_url: `${origin}/profile.html?payment=success`,
      cancel_url: `${origin}/profile.html?payment=cancelled`
    })
  })

  let result
  try { result = await response.json() } catch { result = {} }

  if (!response.ok) {
    throw new Error(result?.error || result?.message || `Request failed (${response.status})`)
  }
  return result
}

function showSubscriptionConfirmModal(action) {
  const isCancel = action === 'cancel'
  const overlay = document.createElement('div')
  overlay.className = 'module-modal-overlay active'
  overlay.id = 'subscriptionConfirmModal'
  overlay.innerHTML = `
    <div class="module-modal" style="max-width:400px; padding:28px; text-align:center;">
      <h3 style="margin:0 0 12px; color:#1F2937;">${isCancel ? 'Cancel subscription?' : 'Pause subscription?'}</h3>
      <p style="color:#64748B; font-size:14px; margin:0 0 8px;">
        ${isCancel
          ? 'Your subscription will remain active until the end of your current billing period.'
          : "Billing will be paused and you won't be charged. You can resume anytime."}
      </p>
      ${isCancel ? '<p style="color:#64748B; font-size:14px; margin:0 0 20px;">You can resubscribe anytime.</p>' : '<div style="height:12px;"></div>'}
      <div style="display:flex; gap:10px; justify-content:center;">
        <button type="button" id="confirmModalBack" class="profile-action-btn" style="flex:1;">${isCancel ? 'Keep subscription' : 'Go back'}</button>
        <button type="button" id="confirmModalYes" class="profile-action-btn" style="flex:1; background:${isCancel ? '#DC2626' : '#F59E0B'}; color:white; border-color:${isCancel ? '#DC2626' : '#F59E0B'};">${isCancel ? 'Cancel' : 'Pause'}</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  document.body.style.overflow = 'hidden'

  const closeModal = () => {
    overlay.remove()
    document.body.style.overflow = ''
  }

  overlay.querySelector('#confirmModalBack').addEventListener('click', closeModal)
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal() })
  overlay.querySelector('#confirmModalYes').addEventListener('click', () => {
    const btn = overlay.querySelector('#confirmModalYes')
    handleSubscriptionAction(action, btn, closeModal)
  })
}

async function handleSubscriptionAction(action, button, onComplete) {
  const originalLabel = button ? button.textContent : ''
  if (button) {
    button.disabled = true
    button.textContent = 'Processing...'
  }

  try {
    await manageSubscription(action)

    const sub = window.currentSubscription || state.subscription
    if (action === 'cancel') {
      if (sub) sub.cancel_at_period_end = true
      showToast('Your subscription will be cancelled at the end of the billing period.', 'info')
    } else if (action === 'pause') {
      if (sub) sub.status = 'paused'
      showToast('Your subscription has been paused.', 'info')
    } else if (action === 'resume') {
      if (sub) {
        sub.status = 'active'
        sub.cancel_at_period_end = false
      }
      showToast('Your subscription is active again!', 'success')
    }

    if (onComplete) onComplete()

    // Re-render the plan section
    const planContent = document.getElementById('profile-plan-content')
    if (planContent) {
      planContent.innerHTML = renderPlanSection()
      // Re-wire the buttons
      document.getElementById('changePlanBtn')?.addEventListener('click', openChangePlanModal)
      document.getElementById('makePaymentBtn')?.addEventListener('click', openMakePaymentModal)
      document.getElementById('cancelSubscriptionBtn')?.addEventListener('click', () => showSubscriptionConfirmModal('cancel'))
      document.getElementById('pauseSubscriptionBtn')?.addEventListener('click', () => showSubscriptionConfirmModal('pause'))
      document.getElementById('resumeSubscriptionBtn')?.addEventListener('click', (e) => handleSubscriptionAction('resume', e.target))
      document.getElementById('retryPaymentBtn')?.addEventListener('click', () => openMakePaymentModal())
    }
  } catch (error) {
    console.error('Subscription action failed:', error)
    showToast(error?.message || 'Something went wrong. Please try again.', 'error')
    if (button) {
      button.disabled = false
      button.textContent = originalLabel
    }
  }
}

function openMakePaymentModal() {
  document.getElementById('ddPaymentModalOverlay')?.remove()

  const sub = window.currentSubscription || state.subscription
  const periodEnd = sub?.stripe_current_period_end || sub?.current_period_end
  const isPastDue = !periodEnd || new Date(periodEnd) < new Date()
  const paidToDisplay = periodEnd ? formatDateAU(new Date(periodEnd)) : 'Not set'

  let selectedMonths = null

  const durationOptions = [1, 3, 6, 12].map(m => `
    <label class="dd-pay-option" data-months="${m}" style="
      display:flex;align-items:center;gap:14px;padding:14px 16px;
      border:2px solid #e8edf5;border-radius:12px;cursor:pointer;
      transition:border-color 0.15s,background 0.15s;background:white;
    ">
      <input type="radio" name="ddPayDuration" value="${m}" style="width:18px;height:18px;accent-color:#14b8a6;flex-shrink:0;">
      <div style="flex:1;">
        <div style="font-weight:600;color:#2b3a55;font-family:'Fredoka',sans-serif;">${m} Month${m > 1 ? 's' : ''}</div>
        <div style="font-size:13px;color:#5f6b85;font-family:'Fredoka',sans-serif;margin-top:2px;">${formatPaymentLabel(m)}</div>
      </div>
    </label>
  `).join('')

  const overlay = document.createElement('div')
  overlay.id = 'ddPaymentModalOverlay'
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.82);
    z-index:2000;display:flex;align-items:center;justify-content:center;
    padding:20px;overflow-y:auto;
  `
  overlay.innerHTML = `
    <div style="
      background:#fffff5;border-radius:24px;width:100%;max-width:500px;
      box-shadow:0 24px 64px rgba(64,88,120,0.35);overflow:hidden;position:relative;
    ">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#405878,#4c6c96);padding:24px 28px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h2 style="color:white;font-size:22px;font-weight:700;margin:0;font-family:'Fredoka',sans-serif;">Make a Payment</h2>
          <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:4px 0 0;font-family:'Fredoka',sans-serif;">Extend your subscription or buy module credits</p>
        </div>
        <button id="ddClosePayModal" style="
          width:36px;height:36px;border-radius:50%;border:none;
          background:rgba(255,255,255,0.2);color:white;font-size:22px;
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          line-height:1;
        ">&times;</button>
      </div>

      <div style="padding:24px 28px;">

        <!-- Error banner -->
        <div id="ddPayError" style="
          display:none;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;
          padding:12px 16px;color:#c02626;font-size:14px;
          font-family:'Fredoka',sans-serif;margin-bottom:20px;
        "></div>

        <!-- Current status -->
        <div style="
          background:${isPastDue ? '#fef2f2' : '#f0fdf4'};
          border:1px solid ${isPastDue ? '#fecaca' : '#bbf7d0'};
          border-radius:10px;padding:14px 16px;margin-bottom:22px;
          display:flex;justify-content:space-between;align-items:center;
        ">
          <span style="font-size:14px;color:#5f6b85;font-family:'Fredoka',sans-serif;">Currently paid to:</span>
          <span style="font-size:16px;font-weight:700;color:${isPastDue ? '#c02626' : '#16a34a'};font-family:'Fredoka',sans-serif;">${paidToDisplay}</span>
        </div>

        <!-- Section: Subscription -->
        <div style="margin-bottom:24px;">
          <div style="font-size:14px;font-weight:700;color:#405878;font-family:'Fredoka',sans-serif;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
            <span style="background:linear-gradient(135deg,#405878,#4c6c96);color:white;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;">1</span>
            Select Payment Duration
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;" id="ddDurationOptions">
            ${durationOptions}
          </div>

          <!-- Preview -->
          <div id="ddPayPreview" style="
            display:none;background:#f0f4ff;border:1px solid #c7d7f5;
            border-radius:10px;padding:14px 16px;margin-top:14px;
          ">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="font-size:13px;color:#5f6b85;font-family:'Fredoka',sans-serif;">New paid-to date:</span>
              <span id="ddNewEndDate" style="font-size:13px;font-weight:600;color:#2b3a55;font-family:'Fredoka',sans-serif;">-</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="font-size:13px;color:#5f6b85;font-family:'Fredoka',sans-serif;">Total:</span>
              <span id="ddPayAmount" style="font-size:18px;font-weight:700;color:#14b8a6;font-family:'Fredoka',sans-serif;">-</span>
            </div>
          </div>
        </div>

        <button id="ddProceedSubBtn" disabled style="
          width:100%;padding:14px;border:none;border-radius:12px;
          background:#cbd5e1;color:white;font-size:15px;font-weight:700;
          font-family:'Fredoka',sans-serif;cursor:not-allowed;
          transition:background 0.2s,transform 0.15s;margin-bottom:24px;
        ">Select a duration above</button>

        <!-- Divider -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="flex:1;height:1px;background:#e8edf5;"></div>
          <span style="font-size:12px;color:#9baab8;font-family:'Fredoka',sans-serif;font-weight:600;">OR</span>
          <div style="flex:1;height:1px;background:#e8edf5;"></div>
        </div>

        <!-- Section: Credits -->
        <div>
          <div style="font-size:14px;font-weight:700;color:#405878;font-family:'Fredoka',sans-serif;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
            <span style="background:linear-gradient(135deg,#f6b700,#e6a800);color:white;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;">2</span>
            Buy Module Credits
          </div>
          <div style="background:white;border:2px solid #e8edf5;border-radius:12px;padding:16px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
              <div style="display:flex;align-items:center;gap:8px;border:1.5px solid #e8edf5;border-radius:8px;padding:4px;background:#f8faff;">
                <button id="ddCreditMinus" style="width:30px;height:30px;border:none;background:none;font-size:18px;cursor:pointer;color:#405878;font-weight:700;border-radius:6px;display:flex;align-items:center;justify-content:center;">−</button>
                <input type="number" id="ddCreditCount" min="1" max="100" value="5" style="width:48px;padding:6px;border:none;font-size:16px;font-weight:700;text-align:center;color:#2b3a55;font-family:'Fredoka',sans-serif;background:transparent;">
                <button id="ddCreditPlus" style="width:30px;height:30px;border:none;background:none;font-size:18px;cursor:pointer;color:#405878;font-weight:700;border-radius:6px;display:flex;align-items:center;justify-content:center;">+</button>
              </div>
              <div style="flex:1;">
                <div style="font-size:14px;color:#2b3a55;font-family:'Fredoka',sans-serif;font-weight:600;">credits × $${CREDIT_PRICE.toFixed(2)} each</div>
                <div style="font-size:12px;color:#5f6b85;font-family:'Fredoka',sans-serif;">1 credit = 1 module unlock</div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid #f0f4ff;">
              <span id="ddCreditTotal" style="font-size:16px;font-weight:700;color:#f6b700;font-family:'Fredoka',sans-serif;">Total: $${(5 * CREDIT_PRICE).toFixed(2)}</span>
              <button id="ddBuyCreditBtn" style="
                padding:10px 22px;background:linear-gradient(135deg,#f6b700,#e6a800);
                color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;
                font-family:'Fredoka',sans-serif;cursor:pointer;transition:opacity 0.2s;
              ">Buy Credits →</button>
            </div>
          </div>
        </div>

        <p style="text-align:center;margin-top:18px;font-size:12px;color:#9baab8;font-family:'Fredoka',sans-serif;">
          🔒 Secure checkout via Stripe. Cancel anytime.
        </p>
      </div>

      <!-- Loading overlay -->
      <div id="ddPayLoading" style="
        display:none;position:absolute;inset:0;background:rgba(255,255,254,0.93);
        border-radius:24px;flex-direction:column;align-items:center;justify-content:center;gap:16px;
      ">
        <div style="
          width:44px;height:44px;border:4px solid #e8edf5;border-top-color:#14b8a6;
          border-radius:50%;animation:ddSpin 0.75s linear infinite;
        "></div>
        <p style="color:#405878;font-weight:600;font-family:'Fredoka',sans-serif;margin:0;">Connecting to Stripe…</p>
      </div>
    </div>

    <style>
      .dd-pay-option:hover { border-color: #14b8a6 !important; background: #f0fdfb !important; }
      .dd-pay-option.selected { border-color: #14b8a6 !important; background: #f0fdfb !important; }
      #ddCreditMinus:hover, #ddCreditPlus:hover { background: #f0f4ff !important; }
      #ddBuyCreditBtn:hover { opacity: 0.88; }
    </style>
  `

  document.body.appendChild(overlay)

  // Helpers scoped to this modal
  const errorEl = () => document.getElementById('ddPayError')
  const loadingEl = () => document.getElementById('ddPayLoading')
  const proceedBtn = document.getElementById('ddProceedSubBtn')
  const preview = document.getElementById('ddPayPreview')
  const creditInput = document.getElementById('ddCreditCount')
  const creditTotal = document.getElementById('ddCreditTotal')

  function showError(msg) {
    if (loadingEl()) loadingEl().style.display = 'none'
    const el = errorEl()
    if (el) { el.textContent = msg; el.style.display = 'block' }
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  function updateCreditTotal() {
    const count = Math.max(1, parseInt(creditInput.value) || 1)
    creditInput.value = count
    if (creditTotal) creditTotal.textContent = `Total: $${(count * CREDIT_PRICE).toFixed(2)}`
  }

  // Duration radio listeners
  overlay.querySelectorAll('input[name="ddPayDuration"]').forEach(radio => {
    radio.addEventListener('change', () => {
      selectedMonths = parseInt(radio.value)
      overlay.querySelectorAll('.dd-pay-option').forEach(el => el.classList.remove('selected'))
      radio.closest('.dd-pay-option').classList.add('selected')

      const newEnd = calcNewEndDate(selectedMonths)
      document.getElementById('ddNewEndDate').textContent = formatDateAU(newEnd)
      document.getElementById('ddPayAmount').textContent = `$${calcPaymentTotal(selectedMonths).toFixed(2)}`
      if (preview) preview.style.display = 'block'

      proceedBtn.disabled = false
      proceedBtn.style.background = 'linear-gradient(135deg,#405878,#4c6c96)'
      proceedBtn.style.cursor = 'pointer'
      proceedBtn.textContent = `Pay $${calcPaymentTotal(selectedMonths).toFixed(2)} →`
    })
  })

  // Proceed subscription button
  proceedBtn.addEventListener('click', async () => {
    if (!selectedMonths) return
    if (errorEl()) errorEl().style.display = 'none'
    if (loadingEl()) loadingEl().style.display = 'flex'
    proceedBtn.disabled = true

    try {
      const newEndDate = calcNewEndDate(selectedMonths).toISOString().split('T')[0]
      const data = await callCheckoutSession({
        paymentType: 'subscription',
        months: selectedMonths,
        newEndDate,
        amount: calcPaymentTotal(selectedMonths)
      })
      if (data?.url) { window.location.href = data.url }
      else throw new Error('No checkout URL returned. Please try again.')
    } catch (err) {
      proceedBtn.disabled = false
      proceedBtn.textContent = `Pay $${calcPaymentTotal(selectedMonths).toFixed(2)} →`
      showError(err.message || 'Something went wrong. Please try again.')
    }
  })

  // Credit +/- buttons
  document.getElementById('ddCreditMinus').addEventListener('click', () => {
    creditInput.value = Math.max(1, (parseInt(creditInput.value) || 1) - 1)
    updateCreditTotal()
  })
  document.getElementById('ddCreditPlus').addEventListener('click', () => {
    creditInput.value = Math.min(100, (parseInt(creditInput.value) || 1) + 1)
    updateCreditTotal()
  })
  creditInput.addEventListener('input', updateCreditTotal)

  // Buy credits button
  document.getElementById('ddBuyCreditBtn').addEventListener('click', async () => {
    const credits = Math.max(1, parseInt(creditInput.value) || 1)
    if (errorEl()) errorEl().style.display = 'none'
    if (loadingEl()) loadingEl().style.display = 'flex'

    try {
      const data = await callCheckoutSession({ paymentType: 'prepaid', credits, pricePerCredit: CREDIT_PRICE })
      if (data?.url) { window.location.href = data.url }
      else throw new Error('No checkout URL returned. Please try again.')
    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.')
    }
  })

  // Close
  document.getElementById('ddClosePayModal').addEventListener('click', closeMakePaymentModal)
  overlay.addEventListener('click', e => { if (e.target === overlay) closeMakePaymentModal() })
}

function closeMakePaymentModal() {
  document.getElementById('ddPaymentModalOverlay')?.remove()
}

// ─── Plan Selection Modal ────────────────────────────────────────────────────

const PLAN_META = {
  low: {
    icon: '🌱',
    label: 'Starter',
    gradient: 'linear-gradient(135deg, #405878, #4c6c96)',
    accent: '#4c6c96',
    shadow: 'rgba(64,88,120,0.25)',
    features: [
      '4 modules per month',
      'Unlimited children',
      'Progress tracking',
      'Parent insights dashboard'
    ]
  },
  mid: {
    icon: '⭐',
    label: 'Family',
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    accent: '#14b8a6',
    shadow: 'rgba(20,184,166,0.25)',
    badge: 'Most Popular',
    features: [
      '8 modules per month',
      'Unlimited children',
      'Progress tracking',
      'Parent insights dashboard',
      'Priority support'
    ]
  },
  top: {
    icon: '🚀',
    label: 'Champion',
    gradient: 'linear-gradient(135deg, #f6b700, #e6a800)',
    accent: '#f6b700',
    shadow: 'rgba(246,183,0,0.25)',
    features: [
      '16 modules per month',
      'Unlimited children',
      'Progress tracking',
      'Parent insights dashboard',
      'Priority support',
      'Early access to new content'
    ]
  }
}

function buildPlanCard(tier, isCurrent) {
  const price = tier.monthly_price_cents
    ? `$${(tier.monthly_price_cents / 100).toFixed(2)}`
    : 'Free'
  const meta = PLAN_META[tier.tier] || {
    icon: '📋',
    label: tier.display_name || tier.tier.toUpperCase(),
    gradient: 'linear-gradient(135deg, #405878, #4c6c96)',
    accent: '#4c6c96',
    shadow: 'rgba(64,88,120,0.25)',
    features: [`${tier.modules_per_month || 0} modules per month`]
  }
  const displayName = tier.display_name || meta.label

  const topBadge = isCurrent
    ? `<div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:${meta.accent};color:white;font-size:11px;font-weight:700;padding:4px 14px;border-radius:20px;white-space:nowrap;font-family:'Fredoka',sans-serif;letter-spacing:0.5px;box-shadow:0 2px 8px ${meta.shadow};">CURRENT PLAN</div>`
    : meta.badge
    ? `<div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:${meta.gradient};color:white;font-size:11px;font-weight:700;padding:4px 14px;border-radius:20px;white-space:nowrap;font-family:'Fredoka',sans-serif;letter-spacing:0.5px;box-shadow:0 2px 8px ${meta.shadow};">${meta.badge}</div>`
    : ''

  const featureItems = meta.features.map(f => `
    <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:9px;">
      <span style="color:#14b8a6;font-size:14px;flex-shrink:0;margin-top:1px;">✓</span>
      <span style="font-size:13px;color:#3b475f;font-family:'Fredoka',sans-serif;line-height:1.4;">${f}</span>
    </div>`).join('')

  const btnStyle = isCurrent
    ? `background:#f0f4ff;color:#405878;cursor:default;`
    : `background:${meta.gradient};color:white;cursor:pointer;`

  return `
    <div class="dd-plan-card" data-tier="${tier.tier}" style="
      position:relative;
      background:white;
      border-radius:16px;
      padding:28px 20px 20px;
      border:2px solid ${isCurrent ? meta.accent : '#e8edf5'};
      box-shadow:${isCurrent ? `0 6px 24px ${meta.shadow}` : '0 2px 10px rgba(64,88,120,0.07)'};
      display:flex;flex-direction:column;gap:16px;
      transition:transform 0.2s,box-shadow 0.2s;
    ">
      ${topBadge}
      <div style="text-align:center;">
        <div style="font-size:38px;margin-bottom:8px;">${meta.icon}</div>
        <div style="font-size:18px;font-weight:700;font-family:'Fredoka',sans-serif;background:${meta.gradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${displayName}</div>
        <div style="margin-top:10px;">
          <span style="font-size:30px;font-weight:700;color:#2b3a55;font-family:'Fredoka',sans-serif;">${price}</span>
          <span style="font-size:13px;color:#5f6b85;font-family:'Fredoka',sans-serif;">/mo</span>
        </div>
      </div>
      <div style="border-top:1px solid #f0f4ff;padding-top:14px;flex:1;">
        ${featureItems}
      </div>
      <button
        class="dd-select-plan-btn"
        data-tier="${tier.tier}"
        ${isCurrent ? 'disabled' : ''}
        style="
          width:100%;padding:12px;border:none;border-radius:10px;
          font-size:14px;font-weight:600;font-family:'Fredoka',sans-serif;
          transition:opacity 0.2s,transform 0.15s;
          ${btnStyle}
        "
      >${isCurrent ? 'Current Plan' : 'Select Plan →'}</button>
    </div>`
}

function openChangePlanModal() {
  document.getElementById('changePlanModalOverlay')?.remove()

  const tiers = window.subscriptionTiers || []
  const currentTier = (window.currentSubscription || state.subscription)?.tier

  const cards = tiers.length
    ? tiers.map(t => buildPlanCard(t, t.tier === currentTier)).join('')
    : '<p style="text-align:center;color:#5f6b85;font-family:\'Fredoka\',sans-serif;grid-column:1/-1;">Loading plans…</p>'

  const overlay = document.createElement('div')
  overlay.id = 'changePlanModalOverlay'
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.82);
    z-index:2000;display:flex;align-items:center;justify-content:center;
    padding:20px;overflow-y:auto;
  `
  overlay.innerHTML = `
    <div style="
      background:#fffff5;border-radius:24px;width:100%;max-width:700px;
      box-shadow:0 24px 64px rgba(64,88,120,0.35);overflow:hidden;position:relative;
    ">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#405878,#4c6c96);padding:24px 28px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h2 style="color:white;font-size:22px;font-weight:700;margin:0;font-family:'Fredoka',sans-serif;">Choose Your Plan</h2>
          <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:4px 0 0;font-family:'Fredoka',sans-serif;">Select a plan and you'll be taken securely to Stripe</p>
        </div>
        <button id="ddClosePlanModal" style="
          width:36px;height:36px;border-radius:50%;border:none;
          background:rgba(255,255,255,0.2);color:white;font-size:22px;
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          line-height:1;transition:background 0.2s;
        ">&times;</button>
      </div>

      <!-- Body -->
      <div style="padding:28px;">
        <div id="ddPlanError" style="
          display:none;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;
          padding:12px 16px;color:#c02626;font-size:14px;
          font-family:'Fredoka',sans-serif;margin-bottom:20px;
        "></div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:20px;margin-top:8px;">
          ${cards}
        </div>

        <p style="text-align:center;margin-top:22px;font-size:12px;color:#5f6b85;font-family:'Fredoka',sans-serif;">
          🔒 Payments are processed securely by Stripe. Cancel anytime.
        </p>
      </div>

      <!-- Loading overlay -->
      <div id="ddPlanLoading" style="
        display:none;position:absolute;inset:0;background:rgba(255,255,254,0.93);
        border-radius:24px;flex-direction:column;align-items:center;justify-content:center;gap:16px;
      ">
        <div style="
          width:44px;height:44px;border:4px solid #e8edf5;border-top-color:#14b8a6;
          border-radius:50%;animation:ddSpin 0.75s linear infinite;
        "></div>
        <p style="color:#405878;font-weight:600;font-family:'Fredoka',sans-serif;margin:0;">Connecting to Stripe…</p>
      </div>
    </div>

    <style>
      @keyframes ddSpin{to{transform:rotate(360deg)}}
      .dd-plan-card:not([style*="cursor:default"]):hover{transform:translateY(-3px)!important;box-shadow:0 12px 32px rgba(64,88,120,0.18)!important;}
      .dd-select-plan-btn:not([disabled]):hover{opacity:0.88;transform:translateY(-1px);}
    </style>
  `

  document.body.appendChild(overlay)

  document.getElementById('ddClosePlanModal').addEventListener('click', closeChangePlanModal)
  overlay.addEventListener('click', e => { if (e.target === overlay) closeChangePlanModal() })

  overlay.querySelectorAll('.dd-select-plan-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => selectPlan(btn.dataset.tier))
  })
}

function closeChangePlanModal() {
  document.getElementById('changePlanModalOverlay')?.remove()
}

async function selectPlan(tier) {
  const errorEl = document.getElementById('ddPlanError')
  const loadingEl = document.getElementById('ddPlanLoading')

  if (errorEl) errorEl.style.display = 'none'
  if (loadingEl) loadingEl.style.display = 'flex'

  try {
    const data = await switchStripeSubscriptionPlan(tier)
    if (data?.url) {
      window.location.href = data.url
    } else {
      throw new Error('No checkout URL was returned. Please try again.')
    }
  } catch (err) {
    if (loadingEl) loadingEl.style.display = 'none'
    if (errorEl) {
      errorEl.textContent = err.message || 'Something went wrong. Please try again.'
      errorEl.style.display = 'block'
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation()
  setupModals()
  init().then(() => {
    // If we were redirected here from the dashboard because the user has no children,
    // show a friendly message and auto-open the Add Child modal.
    const params = new URLSearchParams(window.location.search)
    if (params.get('addChild') === '1') {
      const reason = params.get('reason')
      if (reason === 'no-child') {
        const banner = document.createElement('div')
        banner.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#fff7ed;border:2px solid #f59e0b;color:#92400e;padding:14px 22px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:10000;max-width:480px;text-align:center;font-size:14px;font-weight:500;'
        banner.innerHTML = '👋 <strong>Oops — you haven\'t added a child yet!</strong><br><span style="font-weight:400;">Add your first child below to start using the dashboard.</span>'
        document.body.appendChild(banner)
        setTimeout(() => { banner.style.transition = 'opacity 0.5s'; banner.style.opacity = '0'; setTimeout(() => banner.remove(), 500) }, 8000)
      }
      // Open the Add Child modal after a short delay so the page has settled
      setTimeout(() => { try { showAddChildModal() } catch (e) { console.error(e) } }, 400)
      // Clean the query params from the URL
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
    }
  })
})

// Export for use by ModuleGallery
window.profileState = state
