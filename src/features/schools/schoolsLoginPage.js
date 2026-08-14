import { supabase } from '../../supabaseClient.js'
import { showElement, hideElement, setLoadingState, setMessage, clearMessages as clearMessagesUI } from '../../utils/dom.js'
import { getActiveSchools, validateSchoolAccess, getSchoolUser, createSchoolAccount } from './schoolsService.js'

// ============================================================
// DOM Elements
// ============================================================
const schoolSelectStep = document.getElementById('schoolSelectStep')
const loginStep = document.getElementById('loginStep')
const signupStep = document.getElementById('signupStep')
const errorMessage = document.getElementById('errorMessage')
const successMessage = document.getElementById('successMessage')
const schoolDropdown = document.getElementById('schoolDropdown')
const accessKeyInput = document.getElementById('accessKeyInput')

// ============================================================
// State
// ============================================================
let selectedSchoolId = null
let validatedSchoolId = null

// ============================================================
// Initialize
// ============================================================
async function init() {
  console.log('[Schools] Login page initializing...')

  try {
    // Check if already logged in as a school user
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: schoolUser } = await supabase
        .from('school_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (schoolUser) {
        window.location.href = '/schools-dashboard.html'
        return
      }
    }

    // Load schools for dropdown
    await loadSchools()
    showStep('select')
  } catch (error) {
    console.error('[Schools] Init error:', error)
    showError('Unable to load schools. Please try again later.')
  }
}

// ============================================================
// Step Management
// ============================================================
function showStep(step) {
  hideElement(schoolSelectStep)
  hideElement(loginStep)
  hideElement(signupStep)
  clearMessages()

  if (step === 'select') showElement(schoolSelectStep)
  else if (step === 'login') showElement(loginStep)
  else if (step === 'signup') showElement(signupStep)
}

// ============================================================
// Load Schools Dropdown
// ============================================================
async function loadSchools() {
  const schools = await getActiveSchools()

  schoolDropdown.innerHTML = '<option value="">Choose your school...</option>'
  schools.forEach(school => {
    const option = document.createElement('option')
    option.value = school.id
    option.textContent = school.name
    schoolDropdown.appendChild(option)
  })
}

// ============================================================
// School Selection & Access Key Validation
// ============================================================
const schoolAccessForm = document.getElementById('schoolAccessForm')
schoolAccessForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const schoolId = schoolDropdown.value
  const accessKey = accessKeyInput.value.trim()

  if (!schoolId) {
    showError('Please select your school.')
    return
  }

  if (!accessKey) {
    showError('Please enter the school access key.')
    return
  }

  const btn = document.getElementById('validateBtn')
  const btnText = document.getElementById('validateBtnText')
  const spinner = document.getElementById('validateSpinner')

  try {
    setLoadingState(btn, btnText, spinner, true)
    clearMessages()

    const valid = await validateSchoolAccess(schoolId, accessKey)

    if (!valid) {
      showError('Invalid access key. Please check with your school administrator.')
      return
    }

    selectedSchoolId = schoolId
    validatedSchoolId = schoolId

    // Check if current user already has a school account
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const existingUser = await getSchoolUser(user.id, schoolId)
      if (existingUser) {
        showSuccess('Access verified! Redirecting...')
        setTimeout(() => {
          window.location.href = '/schools-dashboard.html'
        }, 1000)
        return
      }
    }

    // Show login/signup choice
    showStep('login')
    showSuccess('School verified! Sign in or create an account to continue.')

  } catch (error) {
    console.error('[Schools] Validation error:', error)
    showError('Something went wrong. Please try again.')
  } finally {
    setLoadingState(btn, btnText, spinner, false)
  }
})

// ============================================================
// Login Form
// ============================================================
const schoolLoginForm = document.getElementById('schoolLoginForm')
schoolLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('schoolLoginEmail').value
  const password = document.getElementById('schoolLoginPassword').value

  const btn = document.getElementById('schoolLoginBtn')
  const btnText = document.getElementById('schoolLoginBtnText')
  const spinner = document.getElementById('schoolLoginSpinner')

  try {
    setLoadingState(btn, btnText, spinner, true)
    clearMessages()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    // Check if this user has a school_users record for this school
    const schoolUser = await getSchoolUser(data.user.id, validatedSchoolId)

    if (!schoolUser) {
      // User exists in auth but not in schools program
      showError('This account is not registered for the Schools Program at this school. Please create a new account.')
      await supabase.auth.signOut()
      return
    }

    if (!schoolUser.is_active) {
      showError('Your school account has been deactivated. Please contact your school administrator.')
      await supabase.auth.signOut()
      return
    }

    // Log the login event
    await supabase.from('school_audit_log').insert({
      event_type: 'school_login',
      actor_id: data.user.id,
      school_id: validatedSchoolId,
      metadata: { role: schoolUser.role }
    })

    showSuccess('Login successful! Redirecting...')
    setTimeout(() => {
      window.location.href = '/schools-dashboard.html'
    }, 1000)

  } catch (error) {
    console.error('[Schools] Login error:', error)
    if (error.message?.includes('Invalid login credentials')) {
      showError('Invalid email or password. Please try again.')
    } else {
      showError(error.message || 'Login failed. Please try again.')
    }
  } finally {
    setLoadingState(btn, btnText, spinner, false)
  }
})

// ============================================================
// Signup Form
// ============================================================
const schoolSignupForm = document.getElementById('schoolSignupForm')
schoolSignupForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const displayName = document.getElementById('schoolSignupName').value.trim()
  const email = document.getElementById('schoolSignupEmail').value
  const password = document.getElementById('schoolSignupPassword').value
  const passwordConfirm = document.getElementById('schoolSignupPasswordConfirm').value
  const role = document.getElementById('schoolSignupRole').value

  if (!displayName) {
    showError('Please enter your name.')
    return
  }

  if (!role) {
    showError('Please select your role.')
    return
  }

  if (password !== passwordConfirm) {
    showError('Passwords do not match.')
    return
  }

  if (password.length < 12) {
    showError('Password must be at least 12 characters.')
    return
  }

  const btn = document.getElementById('schoolSignupBtn')
  const btnText = document.getElementById('schoolSignupBtnText')
  const spinner = document.getElementById('schoolSignupSpinner')

  try {
    setLoadingState(btn, btnText, spinner, true)
    clearMessages()

    await createSchoolAccount({
      email,
      password,
      displayName,
      schoolId: validatedSchoolId,
      role
    })

    // Try to sign in immediately
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      // Likely an existing user whose password differs — send them to login
      showStep('login')
      showSuccess('You\'ve been linked to the Schools Program! Please sign in with your existing password.')
      return
    }

    showSuccess('Account created! Redirecting...')
    setTimeout(() => {
      window.location.href = '/schools-dashboard.html'
    }, 1500)

  } catch (error) {
    console.error('[Schools] Signup error:', error)
    showError(error.message || 'Failed to create account. Please try again.')
  } finally {
    setLoadingState(btn, btnText, spinner, false)
  }
})

// ============================================================
// Navigation between login/signup
// ============================================================
window.showSchoolLogin = () => showStep('login')
window.showSchoolSignup = () => showStep('signup')
window.backToSchoolSelect = () => showStep('select')

// ============================================================
// Message Helpers
// ============================================================
function showError(message) {
  setMessage(errorMessage, successMessage, 'error', message)
}

function showSuccess(message) {
  setMessage(errorMessage, successMessage, 'success', message)
}

function clearMessages() {
  clearMessagesUI(errorMessage, successMessage)
}

// ============================================================
// Start
// ============================================================
init()
