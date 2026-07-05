// ================================================
// PARENT ZONE GATE
// Families share one login, so this PIN gate is how parent-only surfaces
// (profile, billing, parent insights) stay out of children's reach.
//
// Usage:
//   const ok = await requireParentGate()
//   if (!ok) { window.location.href = '/dashboard.html'; return }
//
// Behaviour:
//   - No PIN set: offers a one-time setup ("Not now" continues without one,
//     "Don't ask again" hides the offer until re-enabled from settings).
//   - PIN set: must be entered. 5 wrong tries = 30s cooldown.
//   - Forgot PIN: re-authenticate with the account password, then set a
//     new PIN.
//   - A passed gate is remembered for 15 minutes (per tab).
// ================================================

import { getSupabaseClient } from '../supabaseClient.js'

const GATE_WINDOW_MS = 15 * 60 * 1000
const GATE_KEY = 'dd_parent_gate_until'
const DISMISS_KEY = 'dd_parent_gate_dismissed'
const MAX_ATTEMPTS = 5
const COOLDOWN_MS = 30 * 1000

function gateStillOpen() {
  try {
    const until = Number(sessionStorage.getItem(GATE_KEY) || 0)
    return until > Date.now()
  } catch { return false }
}

function markGatePassed() {
  try { sessionStorage.setItem(GATE_KEY, String(Date.now() + GATE_WINDOW_MS)) } catch { /* private mode */ }
}

function injectStyles() {
  if (document.getElementById('parentGateStyles')) return
  const st = document.createElement('style')
  st.id = 'parentGateStyles'
  st.textContent = `
.pg-overlay{position:fixed;inset:0;background:rgba(22,50,79,.72);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px}
.pg-modal{background:#fff;border-radius:20px;max-width:400px;width:100%;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,.35);font-family:'Fredoka',system-ui,sans-serif;text-align:center}
.pg-emoji{font-size:40px;margin-bottom:6px}
.pg-title{font-size:20px;font-weight:700;color:#16324f;margin:0 0 8px}
.pg-sub{font-size:13.5px;color:#5b6b80;line-height:1.5;margin:0 0 18px}
.pg-input{width:100%;box-sizing:border-box;padding:14px;border:2px solid #d4dbe6;border-radius:12px;font-family:inherit;font-size:24px;letter-spacing:12px;text-align:center;color:#16324f;margin-bottom:12px}
.pg-input:focus{outline:none;border-color:#14b8a6}
.pg-error{color:#c02626;font-size:13px;min-height:18px;margin:0 0 10px}
.pg-btn{width:100%;padding:13px;border:none;border-radius:12px;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px}
.pg-btn-primary{background:linear-gradient(135deg,#14b8a6,#0d9488);color:#fff}
.pg-btn-primary:disabled{opacity:.55;cursor:not-allowed}
.pg-btn-ghost{background:#fff;border:2px solid #d4dbe6;color:#405878}
.pg-link{background:none;border:none;color:#6b7c8f;font-size:12.5px;font-family:inherit;cursor:pointer;text-decoration:underline;padding:4px}
.pg-links{display:flex;justify-content:center;gap:14px;flex-wrap:wrap}
`
  document.head.appendChild(st)
}

function buildModal() {
  injectStyles()
  const overlay = document.createElement('div')
  overlay.className = 'pg-overlay'
  overlay.innerHTML = '<div class="pg-modal" role="dialog" aria-modal="true" aria-label="Parent verification"></div>'
  document.body.appendChild(overlay)
  return { overlay, modal: overlay.querySelector('.pg-modal') }
}

// ── PIN entry (PIN exists) ──
function showEntry(modal, { onVerify, onForgot }) {
  let attempts = 0
  modal.innerHTML = `
    <div class="pg-emoji">🔒</div>
    <h3 class="pg-title">Parents only</h3>
    <p class="pg-sub">Enter your Parent Zone PIN to continue.</p>
    <form id="pgEntryForm">
      <input class="pg-input" id="pgPin" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="••••">
      <p class="pg-error" id="pgError"></p>
      <button class="pg-btn pg-btn-primary" id="pgSubmit" type="submit">Unlock</button>
    </form>
    <div class="pg-links">
      <button class="pg-link" id="pgForgot" type="button">Forgot your PIN?</button>
      <button class="pg-link" id="pgBack" type="button">Back to the kids' dashboard</button>
    </div>`

  const input = modal.querySelector('#pgPin')
  const error = modal.querySelector('#pgError')
  const submit = modal.querySelector('#pgSubmit')
  setTimeout(() => input.focus(), 100)

  async function attempt() {
    const pin = input.value.trim()
    if (!pin) return
    submit.disabled = true
    error.textContent = ''
    try {
      const ok = await onVerify(pin)
      if (ok) return
      attempts++
      input.value = ''
      if (attempts >= MAX_ATTEMPTS) {
        error.textContent = 'Too many tries — take a short break.'
        input.disabled = true
        setTimeout(() => {
          attempts = 0
          input.disabled = false
          submit.disabled = false
          error.textContent = ''
          input.focus()
        }, COOLDOWN_MS)
        return
      }
      error.textContent = "That PIN isn't right. Try again."
      submit.disabled = false
      input.focus()
    } catch (e) {
      error.textContent = e.message || 'Something went wrong. Try again.'
      submit.disabled = false
    }
  }

  modal.querySelector('#pgEntryForm').addEventListener('submit', e => { e.preventDefault(); attempt() })
  modal.querySelector('#pgForgot').addEventListener('click', onForgot)
  return { back: modal.querySelector('#pgBack') }
}

// ── PIN setup (create or change) ──
function showSetup(modal, { title, sub, allowSkip, allowRemove, onSet, onRemove }) {
  modal.innerHTML = `
    <div class="pg-emoji">🛡️</div>
    <h3 class="pg-title">${title}</h3>
    <p class="pg-sub">${sub}</p>
    <form id="pgSetupForm">
      <input class="pg-input" id="pgPin1" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" placeholder="Choose a PIN (4+ digits)" style="letter-spacing:4px;font-size:16px">
      <input class="pg-input" id="pgPin2" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" placeholder="Type it again" style="letter-spacing:4px;font-size:16px">
      <p class="pg-error" id="pgError"></p>
      <button class="pg-btn pg-btn-primary" id="pgSet" type="submit">Save PIN</button>
    </form>
    ${allowSkip ? '<button class="pg-btn pg-btn-ghost" id="pgSkip" type="button">Not now</button>' : ''}
    <div class="pg-links">
      ${allowSkip ? '<button class="pg-link" id="pgDismiss" type="button">Don’t ask me again</button>' : ''}
      ${allowRemove ? '<button class="pg-link" id="pgRemove" type="button">Turn the PIN off</button>' : ''}
    </div>`

  const pin1 = modal.querySelector('#pgPin1')
  const pin2 = modal.querySelector('#pgPin2')
  const error = modal.querySelector('#pgError')
  const setBtn = modal.querySelector('#pgSet')
  setTimeout(() => pin1.focus(), 100)

  modal.querySelector('#pgSetupForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const a = pin1.value.trim(), b = pin2.value.trim()
    if (!/^[0-9]{4,8}$/.test(a)) { error.textContent = 'Use 4 to 8 digits.'; return }
    if (a !== b) { error.textContent = "Those PINs don't match."; return }
    setBtn.disabled = true
    try {
      await onSet(a)
    } catch (err) {
      error.textContent = err.message || 'Could not save the PIN.'
      setBtn.disabled = false
    }
  })

  if (allowRemove) modal.querySelector('#pgRemove')?.addEventListener('click', onRemove)
  return {
    skip: modal.querySelector('#pgSkip'),
    dismiss: modal.querySelector('#pgDismiss')
  }
}

// ── Forgot PIN: re-authenticate with the account password ──
function showForgot(modal, { onVerified, onBack }) {
  modal.innerHTML = `
    <div class="pg-emoji">🔑</div>
    <h3 class="pg-title">Forgot your PIN?</h3>
    <p class="pg-sub">Enter your account password (the one you sign in with) to set a new PIN.</p>
    <form id="pgForgotForm">
      <input class="pg-input" id="pgPw" type="password" autocomplete="current-password" placeholder="Account password" style="letter-spacing:2px;font-size:16px">
      <p class="pg-error" id="pgError"></p>
      <button class="pg-btn pg-btn-primary" id="pgVerify" type="submit">Verify</button>
    </form>
    <div class="pg-links"><button class="pg-link" id="pgBackEntry" type="button">Back</button></div>`

  const pw = modal.querySelector('#pgPw')
  const error = modal.querySelector('#pgError')
  const verify = modal.querySelector('#pgVerify')
  setTimeout(() => pw.focus(), 100)

  modal.querySelector('#pgForgotForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const value = pw.value
    if (!value) return
    verify.disabled = true
    error.textContent = ''
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: value
      })
      if (authError) {
        error.textContent = "That password isn't right."
        verify.disabled = false
        pw.value = ''
        pw.focus()
        return
      }
      onVerified()
    } catch (err) {
      error.textContent = err.message || 'Something went wrong. Try again.'
      verify.disabled = false
    }
  })
  modal.querySelector('#pgBackEntry').addEventListener('click', onBack)
}

/**
 * Gate a parent-only page. Resolves true when the parent may proceed,
 * false when they backed out (caller should return to the dashboard).
 * Fails open on data errors — a broken RPC must never lock a parent out.
 */
export async function requireParentGate() {
  if (gateStillOpen()) return true

  const supabase = getSupabaseClient()
  let hasPin = false
  try {
    const { data, error } = await supabase.rpc('has_parent_pin')
    if (error) return true // fail open
    hasPin = !!data
  } catch { return true }

  let dismissed = false
  try { dismissed = localStorage.getItem(DISMISS_KEY) === '1' } catch { /* ignore */ }
  if (!hasPin && dismissed) return true

  return new Promise(resolve => {
    const { overlay, modal } = buildModal()
    const finish = (ok) => {
      overlay.remove()
      if (ok) markGatePassed()
      resolve(ok)
    }

    const openSetup = (allowSkip) => {
      const controls = showSetup(modal, {
        title: 'Set up your Parent Zone PIN',
        sub: 'This PIN keeps billing, settings and your parent insights out of little hands. Your child’s dashboard stays exactly the same.',
        allowSkip,
        allowRemove: false,
        onSet: async (pin) => {
          const { error } = await supabase.rpc('set_parent_pin', { p_pin: pin })
          if (error) throw error
          finish(true)
        }
      })
      controls.skip?.addEventListener('click', () => finish(true))
      controls.dismiss?.addEventListener('click', () => {
        try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
        finish(true)
      })
    }

    const openEntry = () => {
      const controls = showEntry(modal, {
        onVerify: async (pin) => {
          const { data, error } = await supabase.rpc('verify_parent_pin', { p_pin: pin })
          if (error) throw error
          if (data) { finish(true); return true }
          return false
        },
        onForgot: () => {
          showForgot(modal, {
            onVerified: () => openSetup(false),
            onBack: openEntry
          })
        }
      })
      controls.back.addEventListener('click', () => finish(false))
    }

    if (hasPin) openEntry()
    else openSetup(true)
  })
}

/**
 * Settings entry point: change, set up, or remove the PIN.
 * Verifies the current PIN first (unless the gate window is already open).
 */
export async function openParentPinSettings() {
  const supabase = getSupabaseClient()
  let hasPin = false
  try {
    const { data } = await supabase.rpc('has_parent_pin')
    hasPin = !!data
  } catch { /* treat as no pin */ }

  const { overlay, modal } = buildModal()
  const finish = () => overlay.remove()

  const openSetup = () => {
    const controls = showSetup(modal, {
      title: hasPin ? 'Change your Parent Zone PIN' : 'Set up your Parent Zone PIN',
      sub: 'This PIN keeps billing, settings and your parent insights out of little hands.',
      allowSkip: false,
      allowRemove: hasPin,
      onSet: async (pin) => {
        const { error } = await supabase.rpc('set_parent_pin', { p_pin: pin })
        if (error) throw error
        try { localStorage.removeItem(DISMISS_KEY) } catch { /* ignore */ }
        markGatePassed()
        finish()
      },
      onRemove: async () => {
        try {
          await supabase.rpc('set_parent_pin', { p_pin: null })
          try { sessionStorage.removeItem(GATE_KEY) } catch { /* ignore */ }
          finish()
        } catch { finish() }
      }
    })
    controls.skip?.addEventListener('click', finish)
  }

  if (hasPin && !gateStillOpen()) {
    const controls = showEntry(modal, {
      onVerify: async (pin) => {
        const { data, error } = await supabase.rpc('verify_parent_pin', { p_pin: pin })
        if (error) throw error
        if (data) { openSetup(); return true }
        return false
      },
      onForgot: () => {
        showForgot(modal, { onVerified: openSetup, onBack: finish })
      }
    })
    controls.back.addEventListener('click', finish)
  } else {
    openSetup()
  }
}
