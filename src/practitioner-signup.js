// Practitioner signup page — token-gated by a practitioner account invite
// created in the Admin Centre. The token is validated and redeemed by the
// practitioner-signup edge function; is_practitioner is only ever set
// server-side.
import { getSupabaseClient } from './supabaseClient.js'

const subtitle = document.getElementById('pracSubtitle')
const errorMessage = document.getElementById('errorMessage')
const successMessage = document.getElementById('successMessage')
const invalidInvite = document.getElementById('invalidInvite')
const existingAccount = document.getElementById('existingAccount')
const existingEmail = document.getElementById('existingEmail')
const signupForm = document.getElementById('pracSignupForm')
const signupDone = document.getElementById('signupDone')
const doneEmail = document.getElementById('doneEmail')

const emailInput = document.getElementById('pracEmail')
const nameInput = document.getElementById('pracName')
const passwordInput = document.getElementById('pracPassword')
const passwordConfirmInput = document.getElementById('pracPasswordConfirm')
const submitButton = document.getElementById('pracSubmitButton')
const submitText = document.getElementById('pracSubmitText')
const submitSpinner = document.getElementById('pracSubmitSpinner')

// Kept in localStorage so the invite still redeems if the user ends up on the
// login page (existing account, or confirming email on this device).
const INVITE_STORAGE_KEY = 'dd_prac_account_invite'

const token = new URLSearchParams(window.location.search).get('token') || ''

function showError(message) {
  errorMessage.textContent = message
  errorMessage.classList.remove('hidden')
}

function clearError() {
  errorMessage.classList.add('hidden')
}

function showOnly(section) {
  for (const el of [invalidInvite, existingAccount, signupForm, signupDone]) {
    el.classList.toggle('hidden', el !== section)
  }
}

function setSubmitting(isSubmitting) {
  submitButton.disabled = isSubmitting
  submitText.textContent = isSubmitting ? 'Creating your account...' : 'Create Practitioner Account'
  submitSpinner.classList.toggle('hidden', !isSubmitting)
}

async function callSignupFunction(body) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('practitioner-signup', { body })
  if (error) {
    // supabase-js wraps non-2xx responses; surface the function's message
    let detail = null
    try { detail = await error.context?.json() } catch { /* not json */ }
    throw new Error(detail?.error || error.message || 'Something went wrong')
  }
  return data
}

async function init() {
  if (!token) {
    subtitle.textContent = 'Invitation required'
    showOnly(invalidInvite)
    return
  }

  try {
    const result = await callSignupFunction({ action: 'validate', token })
    if (!result?.valid) {
      subtitle.textContent = 'Invitation required'
      showOnly(invalidInvite)
      return
    }
    localStorage.setItem(INVITE_STORAGE_KEY, token)
    subtitle.textContent = 'Set up your professional workspace'
    emailInput.value = result.email
    showOnly(signupForm)
  } catch (err) {
    console.error('Invite validation error:', err)
    subtitle.textContent = 'Invitation required'
    showOnly(invalidInvite)
  }
}

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  clearError()

  const fullName = nameInput.value.trim()
  const password = passwordInput.value
  if (!fullName) { showError('Please enter your name.'); return }
  if (password.length < 8) { showError('Password must be at least 8 characters.'); return }
  if (password !== passwordConfirmInput.value) { showError('Passwords do not match.'); return }

  try {
    setSubmitting(true)
    const result = await callSignupFunction({ action: 'complete', token, password, fullName })

    if (result?.alreadyRegistered) {
      subtitle.textContent = 'You already have an account'
      existingEmail.textContent = result.email
      showOnly(existingAccount)
      return
    }

    subtitle.textContent = 'Check your email'
    doneEmail.textContent = result?.email || emailInput.value
    showOnly(signupDone)
  } catch (err) {
    console.error('Practitioner signup error:', err)
    showError(err.message || 'Failed to create your account. Please try again.')
  } finally {
    setSubmitting(false)
  }
})

init()
