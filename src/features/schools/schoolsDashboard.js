import { supabase } from '../../supabaseClient.js'
import { getCurrentSchoolUser, getActiveWorkbook } from './schoolsService.js'

// ============================================================
// DOM Elements
// ============================================================
const loadingScreen = document.getElementById('schoolsLoading')
const mainContent = document.getElementById('schoolsMain')
const errorScreen = document.getElementById('schoolsError')
const errorText = document.getElementById('schoolsErrorText')
const userNameEl = document.getElementById('schoolsUserName')
const schoolNameEl = document.getElementById('schoolsSchoolName')
const roleBadgeEl = document.getElementById('schoolsRoleBadge')
const workbookContainer = document.getElementById('workbookContainer')
const emptyStateEl = document.getElementById('workbookEmptyState')
const workbookTabs = document.getElementById('workbookTabs')

// ============================================================
// State
// ============================================================
let cachedWorkbooks = {}

// ============================================================
// Initialize
// ============================================================
async function init() {
  try {
    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/schools-login.html'
      return
    }

    // Get school user record
    const schoolUser = await getCurrentSchoolUser(user.id)
    if (!schoolUser) {
      window.location.href = '/schools-login.html'
      return
    }

    // Populate header
    userNameEl.textContent = schoolUser.display_name
    schoolNameEl.textContent = schoolUser.schools?.name || 'School'
    roleBadgeEl.textContent = schoolUser.role === 'child' ? 'Student' : 'Practitioner'
    roleBadgeEl.className = `role-badge role-${schoolUser.role}`

    // Show admin button if user is a site admin
    const { data: profile } = await supabase
      .from('parent_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.is_admin) {
      const adminBtn = document.getElementById('adminPanelBtn')
      if (adminBtn) adminBtn.classList.remove('hidden')
    }

    if (schoolUser.role === 'practitioner') {
      // Practitioners can see both workbooks — load both
      const [practitionerWb, childWb] = await Promise.all([
        getActiveWorkbook('practitioner'),
        getActiveWorkbook('child')
      ])

      cachedWorkbooks.practitioner = practitionerWb
      cachedWorkbooks.child = childWb

      if (!practitionerWb && !childWb) {
        showElement(emptyStateEl)
        hideElement(workbookContainer)
      } else {
        hideElement(emptyStateEl)
        showElement(workbookContainer)
        showElement(workbookTabs)
        // Default to practitioner tab
        renderWorkbook(practitionerWb || childWb)
        if (!practitionerWb) {
          setActiveTab('child')
        }
      }
    } else {
      // Children see only their workbook
      const workbook = await getActiveWorkbook('child')

      if (!workbook) {
        showElement(emptyStateEl)
        hideElement(workbookContainer)
      } else {
        hideElement(emptyStateEl)
        showElement(workbookContainer)
        renderWorkbook(workbook)
      }
    }

    // Show main content
    hideElement(loadingScreen)
    showElement(mainContent)

  } catch (error) {
    console.error('[Schools Dashboard] Error:', error)
    hideElement(loadingScreen)
    showElement(errorScreen)
    errorText.textContent = error.message || 'Something went wrong. Please try again.'
  }
}

// ============================================================
// Tab Switching (practitioners only)
// ============================================================
window.switchWorkbookTab = function (tab) {
  setActiveTab(tab)
  const workbook = cachedWorkbooks[tab]
  if (workbook) {
    hideElement(emptyStateEl)
    showElement(workbookContainer)
    renderWorkbook(workbook)
  } else {
    hideElement(workbookContainer)
    showElement(emptyStateEl)
  }
}

function setActiveTab(tab) {
  const tabPractitioner = document.getElementById('tabPractitioner')
  const tabChild = document.getElementById('tabChild')
  if (tab === 'practitioner') {
    tabPractitioner.classList.add('active')
    tabChild.classList.remove('active')
  } else {
    tabChild.classList.add('active')
    tabPractitioner.classList.remove('active')
  }
}

// ============================================================
// Render Workbook
// ============================================================
function renderWorkbook(workbook) {
  const titleEl = document.getElementById('workbookTitle')
  if (titleEl) titleEl.textContent = workbook.title

  const html = workbook.html_content || ''

  // Use srcdoc on a sandboxed iframe — workbook content is trusted (admin-uploaded)
  const iframe = document.createElement('iframe')
  iframe.sandbox = 'allow-same-origin allow-popups allow-scripts allow-modals'
  iframe.style.cssText = 'width:100%;border:none;background:#fff;'
  iframe.title = workbook.title
  iframe.srcdoc = html

  const bodyEl = document.getElementById('workbookBody')
  bodyEl.innerHTML = ''
  bodyEl.appendChild(iframe)

}

// ============================================================
// Fullscreen Toggle
// ============================================================
window.toggleFullscreen = function () {
  const container = document.getElementById('workbookContainer')
  const btn = document.getElementById('btnFullscreen')
  if (!container) return
  container.classList.toggle('fullscreen-mode')
  if (container.classList.contains('fullscreen-mode')) {
    btn.textContent = '✕ Exit Fullscreen'
  } else {
    btn.innerHTML = '&#x26F6; Fullscreen'
  }
}

// ============================================================
// Logout
// ============================================================
window.schoolsLogout = async function () {
  await supabase.auth.signOut()
  window.location.href = '/schools-login.html'
}

// ============================================================
// Helpers
// ============================================================
function showElement(el) {
  if (el) el.classList.remove('hidden')
}

function hideElement(el) {
  if (el) el.classList.add('hidden')
}

// ============================================================
// Start
// ============================================================
init()
