import { checkAuth, signIn, signUp, resetPassword, updatePassword } from './auth.js'

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

// Initialize
async function init() {
  console.log('🚀 Login page initializing...')
  console.log('Error element:', errorMessage)
  console.log('Success element:', successMessage)
  
  try {
    // Check if user is already logged in
    const session = await checkAuth()
    console.log('Session check:', session ? 'Logged in' : 'Not logged in')

    if (session && !session.user?.app_metadata?.provider) {
      // Regular session
      console.log('Redirecting to landing page...')
      window.location.href = '/landing.html'
      return
    }

    if (session && session.user?.app_metadata?.provider === 'email') {
      isRecoverySession = true
      showResetPasswordForm()
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
  loginForm.classList.remove('hidden')
  signupForm.classList.add('hidden')
  forgotPasswordForm.classList.add('hidden')
  resetPasswordForm.classList.add('hidden')
  toggleText.textContent = "Don't have an account?"
  toggleLink.textContent = 'Sign up'
  isLoginMode = true
  clearMessages()
}

// Show signup form
function showSignupForm() {
  loginForm.classList.add('hidden')
  signupForm.classList.remove('hidden')
  forgotPasswordForm.classList.add('hidden')
  resetPasswordForm.classList.add('hidden')
  toggleText.textContent = 'Already have an account?'
  toggleLink.textContent = 'Sign in'
  isLoginMode = false
  clearMessages()
}

// Show forgot password form
function showForgotPasswordForm() {
  loginForm.classList.add('hidden')
  signupForm.classList.add('hidden')
  forgotPasswordForm.classList.remove('hidden')
  resetPasswordForm.classList.add('hidden')
  toggleText.textContent = 'Remembered your password?'
  toggleLink.textContent = 'Sign in'
  isLoginMode = false
  clearMessages()
}

// Show reset password form
function showResetPasswordForm() {
  loginForm.classList.add('hidden')
  signupForm.classList.add('hidden')
  forgotPasswordForm.classList.add('hidden')
  resetPasswordForm.classList.remove('hidden')
  toggleText.textContent = ''
  toggleLink.textContent = ''
  clearMessages()
}

// Toggle between login and signup
toggleLink.addEventListener('click', (e) => {
  e.preventDefault()
  if (loginForm.classList.contains('hidden') && forgotPasswordForm.classList.contains('hidden') && resetPasswordForm.classList.contains('hidden')) {
    showLoginForm()
    return
  }
  if (isLoginMode) {
    showSignupForm()
  } else {
    showLoginForm()
  }
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
    forgotButton.disabled = true
    forgotButtonText.classList.add('hidden')
    forgotSpinner.classList.remove('hidden')
    clearMessages()

    await resetPassword(email)

    showSuccess('Reset link sent! Please check your inbox.')
    forgotPasswordForm.reset()
  } catch (error) {
    console.error('Forgot password error:', error)
    showError(error.message || 'Failed to send reset email.')
  } finally {
    forgotButton.disabled = false
    forgotButtonText.classList.remove('hidden')
    forgotSpinner.classList.add('hidden')
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

  if (newPassword.length < 6) {
    showError('Password must be at least 6 characters long.')
    return
  }

  try {
    resetButton.disabled = true
    resetButtonText.classList.add('hidden')
    resetSpinner.classList.remove('hidden')
    clearMessages()

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
    resetButton.disabled = false
    resetButtonText.classList.remove('hidden')
    resetSpinner.classList.add('hidden')
  }
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
    loginButton.disabled = true
    loginButtonText.classList.add('hidden')
    loginSpinner.classList.remove('hidden')
    clearMessages()
    
    // Sign in
    await signIn(email, password)
    
    // Show success message
    showSuccess('Login successful! Redirecting...')
    
    // Redirect to landing page
    setTimeout(() => {
      window.location.href = '/landing.html'
    }, 1000)
    
  } catch (error) {
    console.error('Login error:', error)
    
    // Show user-friendly error message
    let errorMsg = 'Invalid email or password'
    if (error.message) {
      if (error.message.includes('Invalid login credentials')) {
        errorMsg = 'Invalid email or password. Please try again.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMsg = 'Please verify your email before signing in.'
      } else {
        errorMsg = error.message
      }
    }
    
    showError(errorMsg)
    
    // Reset button state
    loginButton.disabled = false
    loginButtonText.classList.remove('hidden')
    loginSpinner.classList.add('hidden')
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
  if (password.length < 6) {
    showError('Password must be at least 6 characters')
    return
  }
  
  try {
    // Show loading state
    signupButton.disabled = true
    signupButtonText.classList.add('hidden')
    signupSpinner.classList.remove('hidden')
    clearMessages()
    
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
    signupButton.disabled = false
    signupButtonText.classList.remove('hidden')
    signupSpinner.classList.add('hidden')
  }
})

// Show error message
function showError(message) {
  console.log('Showing error:', message)
  if (errorMessage) {
    errorMessage.textContent = message
    errorMessage.classList.remove('hidden')
  } else {
    console.error('Error message element not found')
  }
  if (successMessage) {
    successMessage.classList.add('hidden')
  }
}

// Show success message
function showSuccess(message) {
  successMessage.textContent = message
  successMessage.classList.remove('hidden')
  errorMessage.classList.add('hidden')
}

// Clear messages
function clearMessages() {
  errorMessage.classList.add('hidden')
  successMessage.classList.add('hidden')
}

// Initialize app
init()
