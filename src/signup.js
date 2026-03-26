// ── Daniel's Diaries - Sign Up Page ──
import { signUp } from './auth.js'
import { getSupabaseClient } from './supabaseClient.js'
import { getSubscriptionTiers } from './services/databaseService.js'

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
    plan: null       // will be set from DB tiers (e.g. 'low', 'mid', 'top')
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

    // Check if returning from successful Stripe payment
    if (params.get('payment') === 'success') {
        await completeSignupAfterPayment()
        return
    }

    // Check if payment was cancelled — restore form state
    if (params.get('payment') === 'cancelled') {
        const pending = localStorage.getItem('dd_pending_signup')
        if (pending) {
            const data = JSON.parse(pending)
            formData.firstName = data.firstName
            formData.lastName = data.lastName
            formData.email = data.email
            formData.phone = data.phone
            formData.password = data.password
            formData.plan = data.plan

            // Restore form field values
            document.getElementById('firstName').value = data.firstName
            document.getElementById('lastName').value = data.lastName
            document.getElementById('email').value = data.email
            document.getElementById('phone').value = data.phone || ''
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
        if (header) header.textContent = 'Start your free trial'
        const subtitle = document.querySelector('#step1 .form-header p')
        if (subtitle) subtitle.textContent = 'Create your account and get 2 free module credits to try Daniel\'s Diaries.'
    }

    // Load subscription tiers from DB
    await loadTiers()

    // Pre-select plan from URL if provided
    const planParam = params.get('plan')
    if (planParam && tiers.some(t => t.tier === planParam)) {
        formData.plan = planParam
    }
    updatePlanSelection()

    // If returning from cancelled payment, go to step 2 (plan selection)
    if (params.get('payment') === 'cancelled') {
        showAlert('error', 'Payment was cancelled. Please choose your plan and try again.')
        await loadTiers()
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
    container.innerHTML = ''

    tiers.forEach((tier, index) => {
        const priceInDollars = tier.monthly_price_cents ? (tier.monthly_price_cents / 100) : 0
        const priceDisplay = priceInDollars % 1 === 0 ? priceInDollars.toFixed(0) : priceInDollars.toFixed(2)
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
            <input type="radio" name="plan" value="${tier.tier}" ${formData.plan === tier.tier ? 'checked' : ''}>
            ${isMiddle ? '<div class="plan-card-popular">Most Popular</div>' : ''}
            <div class="plan-card-name">${tier.display_name || tier.tier}</div>
            <div class="plan-card-price">$${priceDisplay}<span>/mo</span></div>
            <ul class="plan-card-features-list">
                ${features.map(f => `<li><span class="plan-feature-check">&#10003;</span> ${f}</li>`).join('')}
            </ul>
            ${tagline ? `<p class="plan-card-tagline">${tagline}</p>` : ''}
        `

        card.addEventListener('click', () => {
            formData.plan = tier.tier
            card.querySelector('input').checked = true
            updatePlanSelection()
        })

        container.appendChild(card)
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

    if (password.length < 6) { showFieldError('password', 'passwordError'); valid = false }
    else clearFieldError('password', 'passwordError')

    if (password !== confirmPassword) { showFieldError('confirmPassword', 'confirmPasswordError'); valid = false }
    else clearFieldError('confirmPassword', 'confirmPasswordError')

    if (!valid) return

    formData.firstName = firstName
    formData.lastName = lastName
    formData.email = email
    formData.phone = phone
    formData.password = password

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
        if (reviewHeader) reviewHeader.textContent = 'Review & create account'
        if (reviewSubtext) reviewSubtext.textContent = 'You\'ll get 2 free module credits to try Daniel\'s Diaries.'
        if (termsText) termsText.textContent = 'Your free trial includes 2 module credits. Upgrade anytime from your profile.'
    } else {
        const selectedTier = tiers.find(t => t.tier === formData.plan)
        if (selectedTier) {
            const price = selectedTier.monthly_price_cents ? (selectedTier.monthly_price_cents / 100) : 0
            document.getElementById('reviewPlan').textContent = selectedTier.display_name || selectedTier.tier
            document.getElementById('reviewTotal').textContent = `$${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}/mo`
        } else {
            document.getElementById('reviewPlan').textContent = formData.plan || '-'
            document.getElementById('reviewTotal').textContent = '-'
        }
        submitBtnText.textContent = 'Subscribe & Pay'
        if (reviewHeader) reviewHeader.textContent = 'Review & subscribe'
        if (reviewSubtext) reviewSubtext.textContent = 'Check your details, then you\'ll be taken to Stripe to pay securely.'
        if (termsText) termsText.textContent = 'Your account will be created after payment is confirmed. Cancel anytime from your profile.'
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
                    isFreeTrial: true
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

            // Show inline login form (same as paid flow)
            showPostSignupLoginForm(formData.email)

        } else {
            // ── Paid plan: redirect to Stripe FIRST, account created after payment ──
            submitBtnText.textContent = 'Redirecting to payment...'

            // Store signup details so we can create the account after payment
            localStorage.setItem('dd_pending_signup', JSON.stringify({
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                plan: formData.plan
            }))

            const supabase = getSupabaseClient()
            const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    plan: formData.plan,
                    email: formData.email,
                    successUrl: `${window.location.origin}/signup.html?payment=success`,
                    cancelUrl: `${window.location.origin}/signup.html?payment=cancelled`
                }
            })

            if (checkoutError) throw checkoutError

            const redirectUrl = checkoutData?.url || checkoutData?.paymentLink
            if (redirectUrl) {
                window.location.href = redirectUrl
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

// After Stripe payment success, complete account creation via server-side edge function
async function completeSignupAfterPayment() {
    const pending = localStorage.getItem('dd_pending_signup')
    if (!pending) {
        showAlert('error', 'Could not find your signup details. Please try signing up again.')
        return
    }

    const data = JSON.parse(pending)

    // Populate formData so the review step shows correct info
    formData.firstName = data.firstName
    formData.lastName = data.lastName
    formData.email = data.email
    formData.phone = data.phone
    formData.plan = data.plan

    // Load tiers so populateReview can show the plan name/price
    await loadTiers()

    const submitBtn = document.getElementById('submitBtn')
    const submitBtnText = document.getElementById('submitBtnText')
    const submitSpinner = document.getElementById('submitSpinner')

    try {
        // Show step 3 with the review populated
        goToStep(3)
        if (submitBtn) submitBtn.disabled = true
        if (submitBtnText) submitBtnText.textContent = 'Setting up your account...'
        if (submitSpinner) submitSpinner.classList.remove('hidden')

        showAlert('success', 'Payment successful! Creating your account...')

        // Call the server-side edge function that uses service role
        const supabase = getSupabaseClient()
        const { data: result, error: fnError } = await supabase.functions.invoke('complete-signup', {
            body: {
                email: data.email,
                password: data.password,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                plan: data.plan
            }
        })

        if (fnError) {
            // Try to get the actual error message from the response
            let errorMsg = fnError.message || 'Failed to create account'
            if (fnError.context && typeof fnError.context.json === 'function') {
                try {
                    const errorBody = await fnError.context.json()
                    if (errorBody?.error) errorMsg = errorBody.error
                } catch (e) { /* ignore parse errors */ }
            }
            throw new Error(errorMsg)
        }

        console.log('Account created successfully:', result)

        // Clear pending data
        localStorage.removeItem('dd_pending_signup')

        // Clear the "Payment successful! Creating your account..." banner
        clearAlerts()

        // Show inline login form
        showPostSignupLoginForm(data.email)

    } catch (error) {
        console.error('Post-payment signup error:', error)

        if (submitBtn) submitBtn.disabled = false
        if (submitBtnText) submitBtnText.textContent = 'Retry'
        if (submitSpinner) submitSpinner.classList.add('hidden')

        let message = 'Payment was successful but we had trouble creating your account. Please contact support.'
        if (error.message) {
            if (error.message.includes('already exists') || error.message.includes('already registered')) {
                message = 'An account with this email already exists. Please log in instead.'
                localStorage.removeItem('dd_pending_signup')
            } else {
                message = error.message
            }
        }
        showAlert('error', message)

        // Allow retry — keep localStorage so they can try again
        if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.onclick = () => completeSignupAfterPayment()
        }
    }
}

// Helper to update parent profile with retry logic
async function updateParentProfile(userId, updateData) {
    const supabase = getSupabaseClient()
    const maxRetries = 5
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 600 * attempt))

        const { data: existingProfile } = await supabase
            .from('parent_profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle()

        if (!existingProfile) {
            console.log(`Profile not found yet, attempt ${attempt}/${maxRetries}`)
            continue
        }

        const { data: updateResult, error: updateError } = await supabase
            .from('parent_profiles')
            .update(updateData)
            .eq('id', userId)
            .select()

        if (updateError) {
            console.error(`Update error on attempt ${attempt}:`, updateError)
            continue
        }

        if (updateResult && updateResult.length > 0) {
            console.log('Profile updated successfully:', updateResult[0])
            return
        }
    }
    console.error('Failed to update profile after all retries')
}


// ── Post-Signup Login Form ──
function showPostSignupLoginForm(email) {
    const step3 = document.getElementById('step3')
    if (!step3) return

    step3.innerHTML = `
        <div class="form-header">
            <h2>You're all set!</h2>
            <p>We've sent a confirmation email to <strong>${email}</strong>. Please check your inbox (and spam folder) and click the link to verify your account, then log in below.</p>
        </div>
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
            messagesDiv.innerHTML = `<div class="alert alert-error visible">${msg}</div>`
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
            resendLink.textContent = 'Failed — try again'
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
