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
        features.push(`${tier.modules_per_month} module${tier.modules_per_month > 1 ? 's' : ''} per month`)
        if (tier.includes_parent_insights) features.push('Parent insights dashboard')
        if (tier.includes_behavioural_support) features.push('Behavioural support')
        if (tier.description) features.push(tier.description)

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
        submitBtnText.textContent = 'Create Account & Pay'
        if (reviewHeader) reviewHeader.textContent = 'Review & subscribe'
        if (reviewSubtext) reviewSubtext.textContent = 'Double-check your details, then we\'ll set up your payment.'
        if (termsText) termsText.textContent = 'You\'ll be redirected to Stripe to securely complete payment. Cancel anytime from your profile.'
    }
}

async function handleSubmit() {
    clearAlerts()

    const submitBtn = document.getElementById('submitBtn')
    const submitBtnText = document.getElementById('submitBtnText')
    const submitSpinner = document.getElementById('submitSpinner')

    try {
        submitBtn.disabled = true
        submitBtnText.textContent = 'Creating account...'
        submitSpinner.classList.remove('hidden')

        // 1. Create account via Supabase Auth
        const data = await signUp(formData.email, formData.password, {
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`,
            phone: formData.phone,
            plan: formData.plan || 'free_trial',
            is_free_trial: isFreeTrial
        })

        // 2. Update parent profile with additional details
        if (data.user) {
            const supabase = getSupabaseClient()
            const updateData = {
                full_name: `${formData.firstName} ${formData.lastName}`,
                phone: formData.phone
            }
            if (formData.plan) {
                updateData.subscription_tier = formData.plan
            }
            // If free trial, set 2 credits on the parent profile
            if (isFreeTrial) {
                updateData.credits = 2
            }
            
            // Retry logic - wait for trigger to create profile, then update
            const maxRetries = 5
            let success = false
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 600 * attempt))
                
                // First check if profile exists
                const { data: existingProfile } = await supabase
                    .from('parent_profiles')
                    .select('id')
                    .eq('id', data.user.id)
                    .maybeSingle()
                
                if (!existingProfile) {
                    console.log(`Profile not found yet, attempt ${attempt}/${maxRetries}`)
                    continue
                }
                
                // Profile exists, now update it
                const { data: updateResult, error: updateError } = await supabase
                    .from('parent_profiles')
                    .update(updateData)
                    .eq('id', data.user.id)
                    .select()
                
                if (updateError) {
                    console.error(`Update error on attempt ${attempt}:`, updateError)
                    continue
                }
                
                if (updateResult && updateResult.length > 0) {
                    console.log('Profile updated successfully with credits:', updateResult[0].credits)
                    success = true
                    break
                }
            }
            
            if (!success) {
                console.error('Failed to update profile with credits after all retries')
            }
        }

        // 4. Handle payment or redirect
        if (isFreeTrial) {
            // Free trial - no payment needed, go to login
            showAlert('success', 'Account created! Please check your email to verify, then log in.')
            submitBtnText.textContent = 'Account Created!'
            submitSpinner.classList.add('hidden')

            setTimeout(() => {
                window.location.href = '/login.html'
            }, 3000)
        } else {
            // Paid plan - redirect to Stripe
            submitBtnText.textContent = 'Redirecting to payment...'

            try {
                const supabase = getSupabaseClient()
                const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout-session', {
                    body: {
                        plan: formData.plan,
                        email: formData.email,
                        userId: data.user?.id,
                        successUrl: `${window.location.origin}/login.html?signup=success`,
                        cancelUrl: `${window.location.origin}/signup.html?step=3`
                    }
                })

                if (checkoutError) throw checkoutError

                if (checkoutData?.url) {
                    window.location.href = checkoutData.url
                    return
                }

                if (checkoutData?.paymentLink) {
                    window.location.href = checkoutData.paymentLink
                    return
                }
            } catch (stripeErr) {
                console.warn('Stripe checkout not configured, proceeding without payment:', stripeErr)
            }

            // Fallback if Stripe isn't configured
            showAlert('success', 'Account created! Please check your email to verify, then log in.')
            submitBtnText.textContent = 'Account Created!'
            submitSpinner.classList.add('hidden')

            setTimeout(() => {
                window.location.href = '/login.html'
            }, 3000)
        }

    } catch (error) {
        console.error('Signup error:', error)
        submitBtn.disabled = false
        submitBtnText.textContent = isFreeTrial ? 'Create Free Account' : 'Create Account & Pay'
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


// ── Helpers ──
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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
