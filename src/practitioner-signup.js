// Practitioner signup page — token-gated by a practitioner account invite
// created in the Admin Centre. The token is validated and redeemed by the
// practitioner-signup edge function; is_practitioner is only ever set
// server-side.
import { getSupabaseClient } from './supabaseClient.js'

const subtitle = document.getElementById('pracSubtitle')
const errorMessage = document.getElementById('errorMessage')
const successMessage = document.getElementById('successMessage')
const invalidInvite = document.getElementById('invalidInvite')
const wrongAccount = document.getElementById('wrongAccount')
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

const urlToken = new URLSearchParams(window.location.search).get('token') || ''

// The invite email is sent by Supabase Auth (inviteUserByEmail), so the link
// arrives here WITH a session. The token also travels in user metadata as a
// fallback in case the redirect dropped the query string.
let token = urlToken
let invitedSession = null

function showError(message) {
  errorMessage.textContent = message
  errorMessage.classList.remove('hidden')
}

function clearError() {
  errorMessage.classList.add('hidden')
}

function showOnly(section) {
  for (const el of [invalidInvite, wrongAccount, existingAccount, signupForm, signupDone]) {
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
  // A session may be present: either the invited user arriving from the
  // Supabase Auth invite email, or someone else (e.g. an admin) who is
  // already logged in in this browser. Only trust it if the session's email
  // MATCHES the invite — otherwise setting a password here would hit the
  // wrong account.
  let session = null
  try {
    const supabase = getSupabaseClient()
    ;({ data: { session } } = await supabase.auth.getSession())
  } catch { /* treat as signed out */ }

  token = urlToken || session?.user?.user_metadata?.prac_invite_token || ''

  if (!token) {
    subtitle.textContent = 'Invitation required'
    showOnly(invalidInvite)
    return
  }

  let inviteEmail = ''
  try {
    const result = await callSignupFunction({ action: 'validate', token })
    if (!result?.valid) {
      subtitle.textContent = 'Invitation required'
      showOnly(invalidInvite)
      return
    }
    inviteEmail = String(result.email || '')
  } catch (err) {
    console.error('Invite validation error:', err)
    subtitle.textContent = 'Invitation required'
    showOnly(invalidInvite)
    return
  }

  localStorage.setItem(INVITE_STORAGE_KEY, token)
  emailInput.value = inviteEmail

  const sessionEmail = (session?.user?.email || '').toLowerCase()
  if (session && sessionEmail === inviteEmail.toLowerCase()) {
    // Authenticated as the invitee (came from the invite email).
    invitedSession = session
    subtitle.textContent = 'Set a password to finish your account'
    showOnly(signupForm)
  } else if (session) {
    // Logged in as someone else — do not touch that account.
    subtitle.textContent = 'Almost there'
    document.getElementById('wrongAccountInvitee').textContent = inviteEmail
    document.getElementById('wrongAccountCurrent').textContent = session.user.email || 'another account'
    showOnly(wrongAccount)
  } else {
    subtitle.textContent = 'Set up your professional workspace'
    showOnly(signupForm)
  }
}

document.getElementById('wrongAccountSignOut')?.addEventListener('click', async () => {
  try {
    await getSupabaseClient().auth.signOut()
  } catch { /* session already gone */ }
  window.location.reload()
})

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

    if (invitedSession) {
      // Authenticated invite flow: set the password on the existing session,
      // then redeem the invite (grants is_practitioner + demo child) and go
      // straight to the hub — email is already confirmed by the invite link.
      const supabase = getSupabaseClient()
      const { error: pwError } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName }
      })
      if (pwError) throw pwError

      await supabase.from('parent_profiles')
        .update({ full_name: fullName })
        .eq('id', invitedSession.user.id)

      const { data: redeemed, error: redeemError } = await supabase
        .rpc('redeem_practitioner_account_invite', { p_token: token })
      if (redeemError) throw redeemError
      if (!redeemed?.success && redeemed?.reason !== 'invalid') {
        throw new Error('Could not activate practitioner access. Please contact info@danielsdiaries.com')
      }

      localStorage.removeItem(INVITE_STORAGE_KEY)
      try { sessionStorage.setItem('dd_is_practitioner', '1') } catch { /* private mode */ }
      window.location.href = '/practitioner-dashboard.html'
      return
    }

    const result = await callSignupFunction({ action: 'complete', token, password, fullName })

    if (result?.alreadyRegistered) {
      subtitle.textContent = 'You already have an account'
      existingEmail.textContent = result.email
      showOnly(existingAccount)
      return
    }

    // The account is created already-confirmed (the invite token proved
    // email ownership), so sign straight in and land in the hub.
    if (result?.canSignIn) {
      try {
        const supabase = getSupabaseClient()
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: result.email || emailInput.value,
          password
        })
        if (!signInError) {
          localStorage.removeItem(INVITE_STORAGE_KEY)
          try { sessionStorage.setItem('dd_is_practitioner', '1') } catch { /* private mode */ }
          window.location.href = '/practitioner-dashboard.html'
          return
        }
        console.error('Auto sign-in failed:', signInError)
      } catch (err) {
        console.error('Auto sign-in error:', err)
      }
    }

    // Fallback: account exists, just have them log in normally.
    subtitle.textContent = 'Account created'
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
