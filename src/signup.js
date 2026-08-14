// ── Daniel's Diaries - Sign Up Page ──
import { escapeHtml } from './lib/sanitize.js'
import { signUp } from './auth.js'
import { getSupabaseClient } from './supabaseClient.js'
import { getSubscriptionTiers } from './services/databaseService.js'
import { initTelemetry, trackEvent } from './lib/telemetry.js'

initTelemetry()

// ── State ──
let currentStep = 1
let tiers = []       // loaded from DB
let isFreeTrial = false

const formData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    plan: null,       // will be set from DB tiers (e.g. 'low', 'mid', 'top')
    billing: 'monthly', // 'monthly' | 'annual' (annual = 10x monthly, 2 months free)
    mailchimpOptIn: false
}

// Annual price is always 10 x the monthly price ("2 months free") — must
// match ANNUAL_MONTHS_CHARGED in the start-paid-signup edge function.
const ANNUAL_MONTHS_CHARGED = 10

function formatDollars(cents) {
    const dollars = cents / 100
    return '$' + (dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2))
}

// ── DOM Elements ──
const steps = document.querySelectorAll('.form-step')
const stepDots = document.querySelectorAll('.step-dot')
const stepLines = document.querySelectorAll('.step-line')
const alertError = document.getElementById('alertError')
const alertSuccess = document.getElementById('alertSuccess')

// ── Init ──
async function init() {
    const params = new URLSearchParams(window.location.search)
    isFreeTrial = params.get('trial') === 'true'

    // Practitioner invite: stash the code so the dashboard can link this
    // family to their practitioner after signup/login completes.
    const inviteCode = params.get('invite')
    if (inviteCode) localStorage.setItem('dd_practitioner_invite', inviteCode)

    // Returning from successful Stripe payment: the account was already
    // created server-side before checkout, so nothing sensitive is needed
    // here — just confirm and hand over to login.
    if (params.get('payment') === 'success') {
        const resume = readSignupResumeState()
        clearSignupResumeState()
        trackEvent('signup_payment_success', { plan: resume?.plan || null, billing: resume?.billing || null })
        showPaymentSuccessScreen(resume?.email || '')
        return
    }

    // Payment cancelled: the account exists (pending, no charge taken).
    // Offer a safe retry via the single-purpose resume token — never by
    // re-collecting or re-storing credentials.
    if (params.get('payment') === 'cancelled') {
        const resume = readSignupResumeState()
        trackEvent('signup_payment_cancelled', { plan: resume?.plan || null, has_resume: !!resume?.resumeToken })
        if (resume?.resumeToken) {
            showPaymentCancelledScreen(resume)
            return
        }
    }

    // Set up form submissions
    document.getElementById('step1Form').addEventListener('submit', handleStep1)
    document.getElementById('step2Form').addEventListener('submit', handleStep2)

    // Back buttons
    document.getElementById('backToStep1').addEventListener('click', () => goToStep(1))
    document.getElementById('backToStep2').addEventListener('click', () => goToStep(2))

    // Submit button
    document.getElementById('submitBtn').addEventListener('click', handleSubmit)

    // If free trial, update UI text
    if (isFreeTrial) {
        const header = document.querySelector('#step1 .form-header h2')
        if (header) header.textContent = 'Try it free - no commitment'
        const subtitle = document.querySelector('#step1 .form-header p')
        if (subtitle) subtitle.textContent = 'Set up your account and get 2 free module credits to explore Daniel\'s Diaries with your child.'
    }

    // Load subscription tiers from DB
    await loadTiers()

    // Pre-select plan and billing from URL if provided
    const planParam = params.get('plan')
    if (planParam && tiers.some(t => t.tier === planParam)) {
        formData.plan = planParam
    }
    if (params.get('billing') === 'annual') {
        formData.billing = 'annual'
        const container = document.getElementById('planCardsContainer')
        if (container) renderPlanCards(container)
    }
    updatePlanSelection()

    // Cancelled payment with no resume state (e.g. new browser): no charge
    // was taken. If they already created the account, login is the recovery
    // path; otherwise they can start over.
    if (params.get('payment') === 'cancelled') {
        showAlert('error', 'Payment was cancelled and no charge was taken. If you already created your account, log in to finish upgrading from your profile — or start again below.')
        goToStep(2)
    }
}

// ── Load Tiers from DB ──
async function loadTiers() {
    const container = document.getElementById('planCardsContainer')

    try {
        tiers = await getSubscriptionTiers()

        if (!tiers || tiers.length === 0) {
            container.innerHTML = '<div class="plan-cards-loading">No plans available. Please try again later.</div>'
            return
        }

        // Default to the middle tier
        if (!formData.plan) {
            formData.plan = tiers.length >= 2 ? tiers[1].tier : tiers[0].tier
        }

        renderPlanCards(container)
    } catch (err) {
        console.error('Failed to load subscription tiers:', err)
        container.innerHTML = '<div class="plan-cards-loading">Failed to load plans. Please refresh the page.</div>'
    }
}

function renderPlanCards(container) {
    // The container must NOT be the grid itself — the toggle sits above
    // the grid, otherwise it becomes a squashed grid cell.
    container.classList.remove('plan-cards')
    container.innerHTML = ''

    // Monthly / annual segmented toggle (annual = 2 months free)
    const toggle = document.createElement('div')
    toggle.className = 'billing-toggle-wrap'
    toggle.innerHTML = `
        <div class="billing-toggle">
            <button type="button" data-billing="monthly" class="${formData.billing === 'monthly' ? 'active' : ''}">Monthly</button>
            <button type="button" data-billing="annual" class="${formData.billing === 'annual' ? 'active' : ''}">Annual</button>
        </div>
        <span class="billing-toggle-note">${formData.billing === 'annual' ? 'Nice choice — 2 months free!' : 'Save with annual: 2 months free'}</span>
    `
    toggle.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            formData.billing = btn.dataset.billing
            renderPlanCards(container)
        })
    })
    container.appendChild(toggle)

    const grid = document.createElement('div')
    grid.className = 'plan-cards'
    container.appendChild(grid)

    tiers.forEach((tier, index) => {
        const monthlyCents = tier.monthly_price_cents || 0
        const isAnnual = formData.billing === 'annual'
        const priceHtml = isAnnual
            ? `${formatDollars(monthlyCents * ANNUAL_MONTHS_CHARGED)}<span>/yr</span>`
            : `${formatDollars(monthlyCents)}<span>/mo</span>`
        const annualNote = isAnnual
            ? `<div class="plan-card-annual-note">${formatDollars(monthlyCents * ANNUAL_MONTHS_CHARGED / 12)}/mo equivalent — 2 months free</div>`
            : ''
        const isMiddle = index === 1 && tiers.length >= 2

        // Build features list
        const features = []
        features.push(`${tier.modules_per_month} guided module${tier.modules_per_month > 1 ? 's' : ''} per month`)
        if (tier.includes_parent_insights) features.push('Parent insights dashboard')
        if (tier.includes_behavioural_support) features.push('1-on-1 behavioural support')

        // Short tagline per tier (first sentence of description, or a sensible fallback)
        let tagline = ''
        if (tier.description) {
            // Take first sentence only
            const firstSentence = tier.description.split(/\.\s/)[0]
            tagline = firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence
            if (!tagline.endsWith('.')) tagline += '.'
        }

        const card = document.createElement('label')
        card.className = 'plan-card' + (isMiddle ? '' : '')
        card.dataset.plan = tier.tier

        card.innerHTML = `
            <input type="radio" name="plan" value="${escapeHtml(tier.tier)}" ${formData.plan === tier.tier ? 'checked' : ''}>
            ${isMiddle ? '<div class="plan-card-popular">Most Popular</div>' : ''}
            <div class="plan-card-name">${escapeHtml(tier.display_name || tier.tier)}</div>
            <div class="plan-card-price">${priceHtml}</div>
            ${annualNote}
            <ul class="plan-card-features-list">
                ${features.map(f => `<li><span class="plan-feature-check">&#10003;</span> ${f}</li>`).join('')}
            </ul>
            ${tagline ? `<p class="plan-card-tagline">${escapeHtml(tagline)}</p>` : ''}
        `

        card.addEventListener('click', () => {
            formData.plan = tier.tier
            card.querySelector('input').checked = true
            updatePlanSelection()
        })

        grid.appendChild(card)
    })

    updatePlanSelection()
}

function updatePlanSelection() {
    const cards = document.querySelectorAll('.plan-card')
    cards.forEach(card => {
        card.classList.toggle('selected', card.dataset.plan === formData.plan)
    })
}


// ── Step Navigation ──
function goToStep(step) {
    currentStep = step
    clearAlerts()

    steps.forEach((el, i) => {
        el.classList.toggle('active', i + 1 === step)
    })

    stepDots.forEach((dot, i) => {
        const stepNum = i + 1
        dot.classList.remove('active', 'completed')
        if (stepNum === step) {
            dot.classList.add('active')
        } else if (stepNum < step) {
            dot.classList.add('completed')
            dot.innerHTML = '&#10003;'
        } else {
            dot.textContent = stepNum
        }
    })

    stepLines.forEach((line, i) => {
        line.classList.toggle('completed', i + 1 < step)
    })

    if (step === 3) {
        populateReview()
    }

    document.querySelector('.signup-form-area').scrollTop = 0
}


// ── Step 1: Validate & Collect ──
function handleStep1(e) {
    e.preventDefault()
    clearAlerts()

    const firstName = document.getElementById('firstName').value.trim()
    const lastName = document.getElementById('lastName').value.trim()
    const email = document.getElementById('email').value.trim()
    const phone = document.getElementById('phone').value.trim()
    const password = document.getElementById('password').value
    const confirmPassword = document.getElementById('confirmPassword').value

    let valid = true

    if (!firstName) { showFieldError('firstName', 'firstNameError'); valid = false }
    else clearFieldError('firstName', 'firstNameError')

    if (!lastName) { showFieldError('lastName', 'lastNameError'); valid = false }
    else clearFieldError('lastName', 'lastNameError')

    if (!email || !isValidEmail(email)) { showFieldError('email', 'emailError'); valid = false }
    else clearFieldError('email', 'emailError')

    if (phone && !isValidPhone(phone)) { showFieldError('phone', 'phoneError'); valid = false }
    else clearFieldError('phone', 'phoneError')

    if (password.length < 8) { showFieldError('password', 'passwordError'); valid = false }
    else clearFieldError('password', 'passwordError')

    if (password !== confirmPassword) { showFieldError('confirmPassword', 'confirmPasswordError'); valid = false }
    else clearFieldError('confirmPassword', 'confirmPasswordError')

    if (!valid) return

    formData.firstName = firstName
    formData.lastName = lastName
    formData.email = email
    formData.phone = phone
    formData.password = password
    formData.mailchimpOptIn = document.getElementById('mailchimpOptIn')?.checked || false

    trackEvent('signup_start', { trial: isFreeTrial })

    // If free trial, skip plan selection - go straight to review
    if (isFreeTrial) {
        formData.plan = null  // no plan for free trial
        goToStep(3)
    } else {
        goToStep(2)
    }
}


// ── Step 2: Plan Selection ──
function handleStep2(e) {
    e.preventDefault()
    clearAlerts()

    const selected = document.querySelector('input[name="plan"]:checked')
    if (selected) {
        formData.plan = selected.value
    }

    goToStep(3)
}


// ── Step 3: Review & Submit ──
function populateReview() {
    document.getElementById('reviewName').textContent = `${formData.firstName} ${formData.lastName}`
    document.getElementById('reviewEmail').textContent = formData.email
    document.getElementById('reviewPhone').textContent = formData.phone || 'Not provided'

    const submitBtnText = document.getElementById('submitBtnText')
    const reviewHeader = document.querySelector('#step3 .form-header h2')
    const reviewSubtext = document.querySelector('#step3 .form-header p')
    const termsText = document.querySelector('#step3 .terms-text')

    if (isFreeTrial) {
        document.getElementById('reviewPlan').textContent = 'Free Trial'
        document.getElementById('reviewTotal').textContent = 'Free (2 credits)'
        submitBtnText.textContent = 'Create Free Account'
        if (reviewHeader) reviewHeader.textContent = 'Looking good - ready to go?'
        if (reviewSubtext) reviewSubtext.textContent = 'You\'ll get 2 free module credits to explore with your child.'
        if (termsText) termsText.textContent = 'Your free trial includes 2 module credits. No payment needed - upgrade anytime from your profile.'
    } else {
        const selectedTier = tiers.find(t => t.tier === formData.plan)
        if (selectedTier) {
            const monthlyCents = selectedTier.monthly_price_cents || 0
            const isAnnual = formData.billing === 'annual'
            document.getElementById('reviewPlan').textContent =
                `${selectedTier.display_name || selectedTier.tier}${isAnnual ? ' (Annual)' : ''}`
            document.getElementById('reviewTotal').textContent = isAnnual
                ? `${formatDollars(monthlyCents * ANNUAL_MONTHS_CHARGED)}/yr (2 months free)`
                : `${formatDollars(monthlyCents)}/mo`
        } else {
            document.getElementById('reviewPlan').textContent = formData.plan || '-'
            document.getElementById('reviewTotal').textContent = '-'
        }
        submitBtnText.textContent = 'Subscribe & Pay'
        if (reviewHeader) reviewHeader.textContent = 'You\'re almost there'
        if (reviewSubtext) reviewSubtext.textContent = 'Everything look right? You\'ll be taken to Stripe to complete payment securely.'
        if (termsText) termsText.textContent = 'Your account is created after payment. No lock-in - cancel or change your plan anytime.'
    }
}

async function handleSubmit() {
    clearAlerts()

    const submitBtn = document.getElementById('submitBtn')
    const submitBtnText = document.getElementById('submitBtnText')
    const submitSpinner = document.getElementById('submitSpinner')

    try {
        submitBtn.disabled = true
        submitSpinner.classList.remove('hidden')

        if (isFreeTrial) {
            // ── Free trial: create account via server-side function ──
            submitBtnText.textContent = 'Creating account...'

            const supabase = getSupabaseClient()
            const { data: result, error: fnError } = await supabase.functions.invoke('complete-signup', {
                body: {
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone,
                    plan: 'free_trial',
                    isFreeTrial: true,
                    mailchimpOptIn: formData.mailchimpOptIn
                }
            })

            if (fnError) {
                let errorMsg = fnError.message || 'Failed to create account'
                if (fnError.context && typeof fnError.context.json === 'function') {
                    try {
                        const errorBody = await fnError.context.json()
                        if (errorBody?.error) errorMsg = errorBody.error
                    } catch (e) { /* ignore */ }
                }
                throw new Error(errorMsg)
            }

            clearAlerts()
            submitSpinner.classList.add('hidden')

            trackEvent('free_trial_created')

            // Show inline login form (same as paid flow)
            showPostSignupLoginForm(formData.email)

        } else {
            // ── Paid plan: account is created SERVER-SIDE first (pending,
            // zero credits), then we redirect to Stripe. The webhook
            // activates the plan after payment. The password is sent once to
            // the edge function and never stored in the browser.
            submitBtnText.textContent = 'Setting up your account...'

            const supabase = getSupabaseClient()
            const { data: startData, error: startError } = await supabase.functions.invoke('start-paid-signup', {
                body: {
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone,
                    plan: formData.plan,
                    billing: formData.billing,
                    mailchimpOptIn: formData.mailchimpOptIn,
                    successUrl: `${window.location.origin}/signup.html?payment=success`,
                    cancelUrl: `${window.location.origin}/signup.html?payment=cancelled`
                }
            })

            if (startError) {
                let errorMsg = startError.message || 'Failed to start signup'
                if (startError.context && typeof startError.context.json === 'function') {
                    try {
                        const errorBody = await startError.context.json()
                        if (errorBody?.error) errorMsg = errorBody.error
                    } catch (e) { /* ignore */ }
                }
                throw new Error(errorMsg)
            }

            if (startData?.url) {
                // Keep only non-sensitive resume state for the cancelled path.
                saveSignupResumeState({
                    email: formData.email,
                    plan: formData.plan,
                    billing: formData.billing,
                    resumeToken: startData.resumeToken || null
                })
                trackEvent('checkout_redirect', { plan: formData.plan, billing: formData.billing })
                submitBtnText.textContent = 'Redirecting to payment...'
                window.location.href = startData.url
                return
            }

            throw new Error('Could not start payment session. Please try again.')
        }

    } catch (error) {
        console.error('Signup error:', error)
        submitBtn.disabled = false
        submitBtnText.textContent = isFreeTrial ? 'Create Free Account' : 'Subscribe & Pay'
        submitSpinner.classList.add('hidden')

        let message = 'Something went wrong. Please try again.'
        if (error.message) {
            if (error.message.includes('already registered')) {
                message = 'An account with this email already exists. Please log in instead.'
            } else {
                message = error.message
            }
        }
        showAlert('error', message)
    }
}

// ── Signup resume state (non-sensitive) ──
// Only the email, plan, and a single-purpose resume token are kept, so a
// cancelled checkout can be retried. Never store passwords in the browser.
const RESUME_STATE_KEY = 'dd_signup_resume'

function saveSignupResumeState(state) {
    try { sessionStorage.setItem(RESUME_STATE_KEY, JSON.stringify(state)) } catch (e) { /* ignore */ }
}

function readSignupResumeState() {
    try { return JSON.parse(sessionStorage.getItem(RESUME_STATE_KEY)) } catch (e) { return null }
}

function clearSignupResumeState() {
    try { sessionStorage.removeItem(RESUME_STATE_KEY) } catch (e) { /* ignore */ }
}

// ── Payment success screen ──
// Account + subscription were created and activated server-side; nothing to
// do here but confirm and hand over to email verification + login.
function showPaymentSuccessScreen(email) {
    goToStep(3)
    clearAlerts()
    showAlert('success', 'Payment successful! Your account and subscription are active.')
    showPostSignupLoginForm(email)
}

// ── Payment cancelled screen ──
function showPaymentCancelledScreen(resume) {
    goToStep(3)
    const step3 = document.getElementById('step3')
    if (!step3) return

    const stepIndicator = document.querySelector('.step-indicator')
    if (stepIndicator) stepIndicator.style.display = 'none'

    step3.innerHTML = `
        <div class="form-header" style="margin-bottom: 8px;">
            <div style="font-size: 48px; margin-bottom: 12px;">💳</div>
            <h2>Payment not completed</h2>
            <p style="margin-bottom: 16px;">No charge was taken. Your account for <strong>${escapeHtml(resume.email || '')}</strong> is created and waiting — you can finish your subscription now, or log in later and upgrade from your profile.</p>
        </div>
        <div id="cancelledMessages"></div>
        <div class="form-buttons" style="justify-content: center; flex-direction: column; gap: 12px; align-items: center;">
            <button type="button" class="btn-submit" id="resumeCheckoutBtn">
                <span id="resumeCheckoutBtnText">Try payment again</span>
                <span id="resumeCheckoutSpinner" class="spinner hidden"></span>
            </button>
            <a href="/login.html" style="color: #6B9BD1; font-size: 14px; text-decoration: underline;">Log in instead</a>
        </div>
    `

    document.getElementById('resumeCheckoutBtn').addEventListener('click', async () => {
        const btn = document.getElementById('resumeCheckoutBtn')
        const btnText = document.getElementById('resumeCheckoutBtnText')
        const spinner = document.getElementById('resumeCheckoutSpinner')
        const messages = document.getElementById('cancelledMessages')
        btn.disabled = true
        btnText.textContent = 'Preparing payment...'
        spinner.classList.remove('hidden')

        try {
            const supabase = getSupabaseClient()
            const { data, error } = await supabase.functions.invoke('start-paid-signup', {
                body: {
                    resumeToken: resume.resumeToken,
                    successUrl: `${window.location.origin}/signup.html?payment=success`,
                    cancelUrl: `${window.location.origin}/signup.html?payment=cancelled`
                }
            })
            if (error) throw error
            if (data?.url) {
                window.location.href = data.url
                return
            }
            throw new Error('Could not restart payment. Please log in and upgrade from your profile.')
        } catch (err) {
            console.error('Resume checkout error:', err)
            messages.innerHTML = '<div class="alert alert-error visible">Could not restart payment. Please log in and upgrade from your profile, or contact support.</div>'
            btn.disabled = false
            btnText.textContent = 'Try payment again'
            spinner.classList.add('hidden')
        }
    })
}


// ── Post-Signup Login Form ──
function showPostSignupLoginForm(email) {
    const step3 = document.getElementById('step3')
    if (!step3) return

    // Hide step indicator since we're past the signup flow
    const stepIndicator = document.querySelector('.step-indicator')
    if (stepIndicator) stepIndicator.style.display = 'none'

    step3.innerHTML = `
        <div class="form-header" style="margin-bottom: 8px;">
            <div style="font-size: 48px; margin-bottom: 12px;">📬</div>
            <h2>Check your inbox</h2>
            <p style="margin-bottom: 16px;">We've sent a confirmation link to <strong>${email ? escapeHtml(email) : 'your email address'}</strong></p>
        </div>

        <div class="email-confirm-steps">
            <div class="email-step">
                <span class="email-step-num">1</span>
                <span>Open the email from Daniel's Diaries</span>
            </div>
            <div class="email-step">
                <span class="email-step-num">2</span>
                <span>Click the confirmation link inside</span>
            </div>
            <div class="email-step">
                <span class="email-step-num">3</span>
                <span>Come back here and log in</span>
            </div>
        </div>

        <p style="text-align:center; font-size: 13px; color: #8896a8; margin: 12px 0 20px;">
            Can't find it? Check your <strong>spam or junk folder</strong> - sometimes it ends up there.
        </p>

        <div style="border-top: 1px solid #e8edf4; padding-top: 20px; margin-top: 8px;">
            <p style="text-align:center; font-size: 14px; color: #5f6b85; font-weight: 600; margin-bottom: 14px;">Once confirmed, log in below</p>
            <div id="signupLoginMessages"></div>
            <form id="signupLoginForm">
                <div class="form-group">
                    <label class="form-label" for="signupLoginEmail">Email</label>
                    <input type="email" id="signupLoginEmail" class="form-input" value="${email}" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="signupLoginPassword">Password</label>
                    <input type="password" id="signupLoginPassword" class="form-input" placeholder="Enter your password" required>
                </div>
                <div class="form-buttons" style="justify-content: center;">
                    <button type="submit" class="btn-submit" id="signupLoginBtn">
                        <span id="signupLoginBtnText">Log In</span>
                        <span id="signupLoginSpinner" class="spinner hidden"></span>
                    </button>
                </div>
            </form>
            <p style="text-align:center; margin-top: 12px; font-size: 13px; color: #7a8a9e;">
                Didn't get the email? <a href="#" id="signupResendLink" style="color: #6B9BD1; text-decoration: underline; cursor: pointer;">Resend verification email</a>
            </p>
        </div>
    `

    // Wire up the inline login form
    const loginForm = document.getElementById('signupLoginForm')
    const messagesDiv = document.getElementById('signupLoginMessages')
    loginForm.addEventListener('submit', async (ev) => {
        ev.preventDefault()
        const loginEmail = document.getElementById('signupLoginEmail').value
        const loginPassword = document.getElementById('signupLoginPassword').value
        const loginBtn = document.getElementById('signupLoginBtn')
        const loginBtnText = document.getElementById('signupLoginBtnText')
        const loginSpinner = document.getElementById('signupLoginSpinner')

        loginBtn.disabled = true
        loginBtnText.textContent = 'Logging in...'
        loginSpinner.classList.remove('hidden')
        messagesDiv.innerHTML = ''

        try {
            const { signIn } = await import('./auth.js')
            await signIn(loginEmail, loginPassword)
            messagesDiv.innerHTML = '<div class="alert alert-success visible">Login successful! Redirecting...</div>'
            setTimeout(() => { window.location.href = '/landing.html' }, 1000)
        } catch (loginErr) {
            let msg = loginErr.message || 'Login failed'
            if (msg.includes('Email not confirmed')) {
                msg = 'Please verify your email first. Check your inbox for the confirmation link.'
            } else if (msg.includes('Invalid login credentials')) {
                msg = 'Invalid email or password. Please try again.'
            }
            messagesDiv.innerHTML = `<div class="alert alert-error visible">${escapeHtml(msg)}</div>`
            loginBtn.disabled = false
            loginBtnText.textContent = 'Log In'
            loginSpinner.classList.add('hidden')
        }
    })

    // Wire up resend link
    const resendLink = document.getElementById('signupResendLink')
    resendLink.addEventListener('click', async (ev) => {
        ev.preventDefault()
        resendLink.textContent = 'Sending...'
        try {
            const supabaseResend = getSupabaseClient()
            const { error: resendErr } = await supabaseResend.auth.resend({
                type: 'signup',
                email
            })
            if (resendErr) throw resendErr
            resendLink.textContent = 'Email sent!'
            resendLink.style.color = '#2E7D32'
            setTimeout(() => {
                resendLink.textContent = 'Resend verification email'
                resendLink.style.color = '#6B9BD1'
            }, 30000)
        } catch (err) {
            resendLink.textContent = 'Failed - try again'
            resendLink.style.color = '#c0392b'
            setTimeout(() => {
                resendLink.textContent = 'Resend verification email'
                resendLink.style.color = '#6B9BD1'
            }, 3000)
        }
    })
}

// ── Helpers ──
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPhone(phone) {
    // Strip spaces, dashes, parens for checking
    const digits = phone.replace(/[\s\-\(\)\+]/g, '')
    // Must be at least 8 digits and only contain valid characters
    return /^[\d\s\-\(\)\+]+$/.test(phone) && digits.length >= 8 && digits.length <= 15
}

function showFieldError(inputId, errorId) {
    document.getElementById(inputId).classList.add('error')
    document.getElementById(errorId).classList.add('visible')
}

function clearFieldError(inputId, errorId) {
    document.getElementById(inputId).classList.remove('error')
    document.getElementById(errorId).classList.remove('visible')
}

function showAlert(type, message) {
    const el = type === 'error' ? alertError : alertSuccess
    const other = type === 'error' ? alertSuccess : alertError
    el.textContent = message
    el.classList.add('visible')
    other.classList.remove('visible')
}

function clearAlerts() {
    alertError.classList.remove('visible')
    alertSuccess.classList.remove('visible')
}


// ── Init ──
init()
