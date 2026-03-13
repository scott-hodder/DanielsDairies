// Profile Page - Separate from Dashboard
import { signOut, getCurrentUser } from './auth.js'
import { getSupabaseClient } from './supabaseClient.js'
import { showElement, hideElement } from './utils/dom.js'

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
      .single()
    
    if (error) return false
    return data?.is_admin === true
  } catch (e) {
    return false
  }
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
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      window.location.href = '/'
      return
    }
    
    state.currentUser = user
    
    // Update header
    if (headerSubtitle) {
      headerSubtitle.textContent = `Welcome back, ${user.email}!`
    }
    
    // Check if admin
    state.isAdmin = await checkIsAdmin()
    if (state.isAdmin) {
      if (adminButton) adminButton.style.display = 'block'
      if (adminButtonDesktop) showElement(adminButtonDesktop)
    }
    
    // Load data
    await loadData()
    
    // Show profile view
    hideElement(loadingState)
    showElement(profileView)
    
    // Initialize profile hub (ModuleGallery)
    initProfileHub()
    
  } catch (error) {
    console.error('Profile initialization error:', error)
    hideElement(loadingState)
    showElement(profileView)
  }
}

// Load user data
async function loadData() {
  try {
    // Load children
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('*')
      .eq('parent_user_id', state.currentUser.id)
      .order('created_at', { ascending: true })
    
    if (childrenError) throw childrenError
    state.children = children || []
    
    // Set global dashboardState for ModuleGallery compatibility
    window.dashboardState = window.dashboardState || {}
    window.dashboardState.children = state.children
    
    // Load modules for the parent overview
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('*, super_skills(*)')
      .eq('is_active', true)
      .order('pathway_order', { ascending: true })
    
    if (!modulesError) {
      state.modules = modules || []
      window.modules = state.modules
      window.dashboardState.modules = state.modules
    }
    
    // Load subscription tiers (all available tiers)
    const { data: tiers, error: tiersError } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    
    if (!tiersError && tiers) {
      window.subscriptionTiers = tiers
    }
    
    // Load current subscription from parent_subscriptions table
    const { data: subscription, error: subError } = await supabase
      .from('parent_subscriptions')
      .select('*, subscription_tiers(*)')
      .eq('parent_id', state.currentUser.id)
      .maybeSingle()
    
    if (!subError && subscription) {
      state.subscription = subscription
      window.currentSubscription = subscription
      // Also set the tier data from the joined subscription_tiers
      if (subscription.subscription_tiers) {
        // Merge tier data into subscription for easier access
        subscription.tierData = subscription.subscription_tiers
      }
    }
    
    // Load credit summary from v_parent_credit_summary view (same as dashboard credit button)
    // Get the most recent credit summary for this user (don't filter by date - get latest)
    const { data: creditData, error: creditError } = await supabase
      .from('v_parent_credit_summary')
      .select('*')
      .eq('parent_id', state.currentUser.id)
      .order('period_end', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    console.log('[Profile] Credit data:', creditData, 'Error:', creditError)
    
    if (!creditError && creditData) {
      window.currentCreditSummary = creditData
    } else {
      // Default if no data found
      window.currentCreditSummary = {
        credits_granted: 0,
        credits_used: 0,
        credits_available: 0
      }
    }
    
  } catch (error) {
    console.error('Error loading data:', error)
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
        
        <!-- Plan Section - collapsed by default -->
        <div class="profile-section">
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
    addChildBtn.addEventListener('click', () => showElement(addChildModal))
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
  
  return `
    <div class="plan-overview">
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
        <a href="/billing.html" class="profile-action-btn">Change Plan</a>
        <a href="/billing.html" class="profile-action-btn profile-action-btn-primary">Make Payment</a>
      </div>
    </div>
  `
}

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
      <span style="font-size: 32px;">${child.avatar || '🦊'}</span>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #405878;">${child.name}</div>
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
  showElement(editChildModal)
}

// Setup navigation
function setupNavigation() {
  // Dashboard button - go to dashboard with remembered child
  const goToDashboard = () => {
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
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      alert('Failed to logout. Please try again.')
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

// Setup modal listeners
function setupModals() {
  // Close buttons
  document.getElementById('closeAddChildModal')?.addEventListener('click', () => hideElement(addChildModal))
  document.getElementById('closeEditChildModal')?.addEventListener('click', () => hideElement(editChildModal))
  document.getElementById('closeRemoveChildModal')?.addEventListener('click', () => hideElement(removeChildModal))
  document.getElementById('closeParentPasswordModal')?.addEventListener('click', () => hideElement(parentPasswordModal))
  
  // Cancel buttons
  document.getElementById('cancelRemoveChild')?.addEventListener('click', () => hideElement(removeChildModal))
  document.getElementById('cancelParentPassword')?.addEventListener('click', () => hideElement(parentPasswordModal))
  
  // Add child button
  document.getElementById('addChildBtn')?.addEventListener('click', () => showElement(addChildModal))
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation()
  setupModals()
  init()
})

// Export for use by ModuleGallery
window.profileState = state
