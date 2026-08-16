import { checkAuth, signIn, signUp, resetPassword, updatePassword } from '../../auth.js'
import { showElement, hideElement, setLoadingState, setMessage, clearMessages as clearMessagesUI } from '../../utils/dom.js'
import { renderDevSetupMessage } from '../../ui/devSetupMessage.js'
import { getSupabaseClient } from '../../supabaseClient.js'

// DOM Elements
const loginForm = document.getElementById('loginForm')
const signupForm = document.getElementById('signupForm')
const forgotPasswordForm = document.getElementById('forgotPasswordForm')
const resetPasswordForm = document.getElementById('resetPasswordForm')
const forgotPasswordLink = document.getElementById('forgotPasswordLink')
const forgotBackToLogin = document.getElementById('forgotBackToLogin')
const resetBackToLogin = document.getElementById('resetBackToLogin')
const toggleLink = document.getElementById('toggleLink')
const toggleText = document.getElementById('toggleText')
const errorMessage = document.getElementById('errorMessage')
const successMessage = document.getElementById('successMessage')

// State
let isLoginMode = true
let isRecoverySession = false

// Practitioner account invite token, stashed by practitioner-signup.html (or
// carried on the email-confirmation redirect) and redeemed after login.
const PRAC_INVITE_KEY = 'dd_prac_account_invite'
const PRAC_SESSION_KEY = 'dd_is_practitioner'

// Where to send a signed-in user: practitioners go straight to the hub.
// Also redeems any pending practitioner invite so an existing family account
// invited as a practitioner activates on their next login.
async function resolvePostLoginDestination() {
  try {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return '/landing.html'

    const inviteToken = localStorage.getItem(PRAC_INVITE_KEY)
    if (inviteToken) {
      const { data: redeemed } = await supabase.rpc('redeem_practitioner_account_invite', { p_token: inviteToken })
      // Clear on success or a dead token; keep it only for transient failures.
      if (redeemed?.success || redeemed?.reason === 'invalid') {
        localStorage.removeItem(PRAC_INVITE_KEY)
      }
    }

    const { data: isPractitioner } = await supabase.rpc('is_user_practitioner_check', { user_id: user.id })
    try { sessionStorage.setItem(PRAC_SESSION_KEY, isPractitioner ? '1' : '0') } catch { /* private mode */ }
    return isPractitioner ? '/practitioner-dashboard.html' : '/landing.html'
  } catch (err) {
    console.error('Post-login routing error:', err)
    return '/landing.html'
  }
}

// Initialize
async function init() {
  if (renderDevSetupMessage('authContainer')) return
  console.log('🚀 Login page initializing...')
  console.log('Error element:', errorMessage)
  console.log('Success element:', successMessage)
  
  try {
    // Check for password recovery flow FIRST (before session check)
    // Supabase sends tokens in URL hash (#access_token=...&type=recovery)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const isResetFlow = hashParams.get('type') === 'recovery'
    
    if (isResetFlow) {
      console.log('🔑 Password recovery flow detected')
      // Show reset form immediately - Supabase will process the tokens
      isRecoverySession = true
      showResetPasswordForm()
      // Clear the hash to clean up the URL
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    // Check if user is already logged in
    const session = await checkAuth()
    console.log('Session check:', session ? 'Logged in' : 'Not logged in')

    // A practitioner invite token can arrive on the email-confirmation
    // redirect; stash it before any routing so login can redeem it.
    const urlParams = new URLSearchParams(window.location.search)
    const pracToken = urlParams.get('pracToken')
    if (pracToken) {
      localStorage.setItem(PRAC_INVITE_KEY, pracToken)
    }

    if (session && !session.user?.app_metadata?.provider) {
      // Regular session
      console.log('Redirecting...')
      window.location.href = await resolvePostLoginDestination()
      return
    }

    // Check if user just confirmed their email
    if (urlParams.get('confirmed') === 'true') {
      showLoginForm()
      showSuccess('Email confirmed! Please log in.')
      // Clean up the URL
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    // Default to login form
    showLoginForm()
  } catch (error) {
    console.error('Initialization error:', error)
    // Show login form anyway
    showLoginForm()
    
    // Show error if Supabase is not configured
    if (error.message && error.message.includes('supabaseUrl')) {
      showError('Please configure your Supabase credentials in the .env file')
    }
  }
}

// Show login form
function showLoginForm() {
  showElement(loginForm)
  hideElement(signupForm)
  hideElement(forgotPasswordForm)
  hideElement(resetPasswordForm)
  toggleText.textContent = "Don't have an account?"
  toggleLink.textContent = 'Sign up'
  isLoginMode = true
  clearMessagesUI(errorMessage, successMessage)
}

// Show signup form
function showSignupForm() {
  hideElement(loginForm)
  showElement(signupForm)
  hideElement(forgotPasswordForm)
  hideElement(resetPasswordForm)
  toggleText.textContent = 'Already have an account?'
  toggleLink.textContent = 'Sign in'
  isLoginMode = false
  clearMessagesUI(errorMessage, successMessage)
}

// Show forgot password form
function showForgotPasswordForm() {
  hideElement(loginForm)
  hideElement(signupForm)
  showElement(forgotPasswordForm)
  hideElement(resetPasswordForm)
  toggleText.textContent = 'Remembered your password?'
  toggleLink.textContent = 'Sign in'
  isLoginMode = false
  clearMessagesUI(errorMessage, successMessage)
}

// Show reset password form
function showResetPasswordForm() {
  hideElement(loginForm)
  hideElement(signupForm)
  hideElement(forgotPasswordForm)
  showElement(resetPasswordForm)
  toggleText.textContent = ''
  toggleLink.textContent = ''
  clearMessagesUI(errorMessage, successMessage)
}

// Toggle between login and signup
toggleLink.addEventListener('click', (e) => {
  // If in forgot/reset password mode, go back to login instead of navigating away
  if (forgotPasswordForm && !forgotPasswordForm.classList.contains('hidden') || resetPasswordForm && !resetPasswordForm.classList.contains('hidden')) {
    e.preventDefault()
    showLoginForm()
    return
  }
  // Otherwise let the href="/" navigate to the home page for sign up
})

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault()
    showForgotPasswordForm()
  })
}

if (forgotBackToLogin) {
  forgotBackToLogin.addEventListener('click', () => {
    showLoginForm()
  })
}

if (resetBackToLogin) {
  resetBackToLogin.addEventListener('click', () => {
    showLoginForm()
  })
}

forgotPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('forgotPasswordEmail').value
  const forgotButton = document.getElementById('forgotPasswordButton')
  const forgotButtonText = document.getElementById('forgotPasswordButtonText')
  const forgotSpinner = document.getElementById('forgotPasswordSpinner')

  try {
    setLoadingState(forgotButton, forgotButtonText, forgotSpinner, true)
    clearMessagesUI(errorMessage, successMessage)

    await resetPassword(email)

    showSuccess('Reset link sent! Please check your inbox.')
    forgotPasswordForm.reset()
  } catch (error) {
    console.error('Forgot password error:', error)
    showError(error.message || 'Failed to send reset email.')
  } finally {
    setLoadingState(forgotButton, forgotButtonText, forgotSpinner, false)
  }
})

resetPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const newPassword = document.getElementById('resetNewPassword').value
  const confirmPassword = document.getElementById('resetConfirmPassword').value
  const resetButton = document.getElementById('resetPasswordButton')
  const resetButtonText = document.getElementById('resetPasswordButtonText')
  const resetSpinner = document.getElementById('resetPasswordSpinner')

  if (newPassword !== confirmPassword) {
    showError('Passwords do not match.')
    return
  }

  if (newPassword.length < 8) {
    showError('Password must be at least 8 characters long.')
    return
  }

  try {
    setLoadingState(resetButton, resetButtonText, resetSpinner, true)
    clearMessagesUI(errorMessage, successMessage)

    await updatePassword(newPassword)
    showSuccess('Password updated! Please sign in with your new password.')
    resetPasswordForm.reset()
    isRecoverySession = false
    setTimeout(() => {
      showLoginForm()
    }, 1500)
  } catch (error) {
    console.error('Reset password error:', error)
    showError(error.message || 'Failed to update password.')
  } finally {
    setLoadingState(resetButton, resetButtonText, resetSpinner, false)
  }
})

// Handle login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const email = document.getElementById('loginEmail').value
  const password = document.getElementById('loginPassword').value
  
  const loginButton = document.getElementById('loginButton')
  const loginButtonText = document.getElementById('loginButtonText')
  const loginSpinner = document.getElementById('loginSpinner')
  
  try {
    // Show loading state
    setLoadingState(loginButton, loginButtonText, loginSpinner, true)
    clearMessagesUI(errorMessage, successMessage)
    
    // Sign in
    await signIn(email, password)
    
    // Show success message
    showSuccess('Login successful! Redirecting...')

    // Practitioners land in the Practitioner Hub, families on the landing page
    const destination = await resolvePostLoginDestination()
    setTimeout(() => {
      window.location.href = destination
    }, 400)
    
  } catch (error) {
    console.error('Login error:', error)
    
    // Show user-friendly error message
    let errorMsg = 'Invalid email or password'
    if (error.message) {
      if (error.message.includes('Invalid login credentials')) {
        errorMsg = 'Invalid email or password. Please try again.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMsg = 'Please verify your email before signing in.'
        // Show resend button
        showResendVerification(email)
      } else {
        errorMsg = error.message
      }
    }

    showError(errorMsg)
    
    // Reset button state
    setLoadingState(loginButton, loginButtonText, loginSpinner, false)
  }
})

// Handle signup
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const email = document.getElementById('signupEmail').value
  const password = document.getElementById('signupPassword').value
  const passwordConfirm = document.getElementById('signupPasswordConfirm').value
  
  const signupButton = document.getElementById('signupButton')
  const signupButtonText = document.getElementById('signupButtonText')
  const signupSpinner = document.getElementById('signupSpinner')
  
  // Validate passwords match
  if (password !== passwordConfirm) {
    showError('Passwords do not match')
    return
  }
  
  // Validate password length
  if (password.length < 8) {
    showError('Password must be at least 8 characters')
    return
  }
  
  try {
    // Show loading state
    setLoadingState(signupButton, signupButtonText, signupSpinner, true)
    clearMessagesUI(errorMessage, successMessage)
    
    // Sign up
    await signUp(email, password)
    
    // Show success message
    showSuccess('Account created! Please check your email to verify your account.')
    
    // Reset form
    signupForm.reset()
    
    // Switch to login form after 3 seconds
    setTimeout(() => {
      showLoginForm()
    }, 3000)
    
  } catch (error) {
    console.error('Signup error:', error)
    showError(error.message || 'Failed to create account')
  } finally {
    // Reset button state
    setLoadingState(signupButton, signupButtonText, signupSpinner, false)
  }
})

// Show error message
function showError(message) {
  console.log('Showing error:', message)
  if (!errorMessage) {
    console.error('Error message element not found')
  }
  setMessage(errorMessage, successMessage, 'error', message)
}

// Show success message
function showSuccess(message) {
  setMessage(errorMessage, successMessage, 'success', message)
}

// Clear messages
function clearMessages() {
  clearMessagesUI(errorMessage, successMessage)
}

// Show resend verification email button
function showResendVerification(email) {
  // Remove existing resend button if any
  const existing = document.getElementById('resendVerificationBtn')
  if (existing) existing.remove()

  const btn = document.createElement('button')
  btn.id = 'resendVerificationBtn'
  btn.type = 'button'
  btn.textContent = 'Resend verification email'
  btn.style.cssText = 'display:block; margin:12px auto 0; background:none; border:2px solid #6B9BD1; color:#405878; padding:10px 20px; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.2s;'
  btn.onmouseenter = () => { btn.style.background = '#E8F4F8' }
  btn.onmouseleave = () => { btn.style.background = 'none' }

  btn.addEventListener('click', async () => {
    btn.disabled = true
    btn.textContent = 'Sending...'

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      })

      if (error) throw error

      btn.textContent = 'Email sent!'
      btn.style.borderColor = '#2E7D32'
      btn.style.color = '#2E7D32'
      showSuccess('Verification email sent! Please check your inbox (and spam folder).')

      // Allow re-sending after 30 seconds
      setTimeout(() => {
        btn.disabled = false
        btn.textContent = 'Resend verification email'
        btn.style.borderColor = '#6B9BD1'
        btn.style.color = '#405878'
      }, 30000)
    } catch (err) {
      console.error('Resend error:', err)
      btn.disabled = false
      btn.textContent = 'Resend verification email'
      showError('Could not send verification email. Please try again.')
    }
  })

  // Insert after the error message
  if (errorMessage && errorMessage.parentNode) {
    errorMessage.parentNode.insertBefore(btn, errorMessage.nextSibling)
  }
}

// Initialize app
init()
