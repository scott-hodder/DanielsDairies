// ── Daniel's Diaries - Sign Up Page ──
import { signUp } from './auth.js'
import { loadStripe } from '@stripe/stripe-js'
import { getSupabaseClient } from './supabaseClient.js'

// ── State ──
let currentStep = 1
const formData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    plan: 'family'
}

const planDetails = {
    starter: { name: 'Starter', price: '$9/mo', amount: '$9.00' },
    family: { name: 'Family', price: '$19/mo', amount: '$19.00' },
    school: { name: 'School', price: '$49/mo', amount: '$49.00' }
}

// ── DOM Elements ──
const steps = document.querySelectorAll('.form-step')
const stepDots = document.querySelectorAll('.step-dot')
const stepLines = document.querySelectorAll('.step-line')
const alertError = document.getElementById('alertError')
const alertSuccess = document.getElementById('alertSuccess')

// ── Init ──
function init() {
    // Read plan from URL query parameter
    const params = new URLSearchParams(window.location.search)
    const planParam = params.get('plan')
    if (planParam && planDetails[planParam]) {
        formData.plan = planParam
    }

    // Set up plan card selection
    setupPlanCards()

    // Set up form submissions
    document.getElementById('step1Form').addEventListener('submit', handleStep1)
    document.getElementById('step2Form').addEventListener('submit', handleStep2)

    // Back buttons
    document.getElementById('backToStep1').addEventListener('click', () => goToStep(1))
    document.getElementById('backToStep2').addEventListener('click', () => goToStep(2))

    // Submit button
    document.getElementById('submitBtn').addEventListener('click', handleSubmit)

    // Update active plan card
    updatePlanSelection()
}

// ── Plan Card Selection ──
function setupPlanCards() {
    const cards = document.querySelectorAll('.plan-card')
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const plan = card.dataset.plan
            formData.plan = plan
            card.querySelector('input').checked = true
            updatePlanSelection()
        })
    })
}

function updatePlanSelection() {
    const cards = document.querySelectorAll('.plan-card')
    cards.forEach(card => {
        card.classList.toggle('selected', card.dataset.plan === formData.plan)
        if (card.dataset.plan === formData.plan) {
            card.querySelector('input').checked = true
        }
    })
}


// ── Step Navigation ──
function goToStep(step) {
    currentStep = step
    clearAlerts()

    // Update step visibility
    steps.forEach((el, i) => {
        el.classList.toggle('active', i + 1 === step)
    })

    // Update step indicator
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

    // If going to review step, populate the summary
    if (step === 3) {
        populateReview()
    }

    // Scroll to top of form
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

    if (!firstName) {
        showFieldError('firstName', 'firstNameError')
        valid = false
    } else {
        clearFieldError('firstName', 'firstNameError')
    }

    if (!lastName) {
        showFieldError('lastName', 'lastNameError')
        valid = false
    } else {
        clearFieldError('lastName', 'lastNameError')
    }

    if (!email || !isValidEmail(email)) {
        showFieldError('email', 'emailError')
        valid = false
    } else {
        clearFieldError('email', 'emailError')
    }

    if (password.length < 6) {
        showFieldError('password', 'passwordError')
        valid = false
    } else {
        clearFieldError('password', 'passwordError')
    }

    if (password !== confirmPassword) {
        showFieldError('confirmPassword', 'confirmPasswordError')
        valid = false
    } else {
        clearFieldError('confirmPassword', 'confirmPasswordError')
    }

    if (!valid) return

    // Save data
    formData.firstName = firstName
    formData.lastName = lastName
    formData.email = email
    formData.phone = phone
    formData.password = password

    goToStep(2)
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
    document.getElementById('reviewPlan').textContent = planDetails[formData.plan].name
    document.getElementById('reviewTotal').textContent = planDetails[formData.plan].amount
}

async function handleSubmit() {
    clearAlerts()

    const submitBtn = document.getElementById('submitBtn')
    const submitBtnText = document.getElementById('submitBtnText')
    const submitSpinner = document.getElementById('submitSpinner')

    try {
        // Show loading
        submitBtn.disabled = true
        submitBtnText.textContent = 'Creating account...'
        submitSpinner.classList.remove('hidden')

        // 1. Create account via Supabase Auth
        const data = await signUp(formData.email, formData.password, {
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`,
            phone: formData.phone,
            plan: formData.plan
        })

        // 2. Update parent profile with additional details if user was created
        if (data.user) {
            try {
                const supabase = getSupabaseClient()
                await supabase
                    .from('parent_profiles')
                    .update({
                        full_name: `${formData.firstName} ${formData.lastName}`,
                        phone: formData.phone,
                        subscription_tier: formData.plan
                    })
                    .eq('user_id', data.user.id)
            } catch (profileErr) {
                console.error('Error updating profile:', profileErr)
                // Non-blocking - continue to payment
            }
        }

        // 3. Redirect to Stripe Checkout for payment
        submitBtnText.textContent = 'Redirecting to payment...'

        // Try to create a Stripe checkout session via Supabase Edge Function
        try {
            const supabase = getSupabaseClient()
            const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    plan: formData.plan,
                    email: formData.email,
                    userId: data.user?.id,
                    successUrl: `${window.location.origin}/index.html?signup=success`,
                    cancelUrl: `${window.location.origin}/signup.html?step=3`
                }
            })

            if (checkoutError) throw checkoutError

            if (checkoutData?.url) {
                window.location.href = checkoutData.url
                return
            }

            // If no checkout URL, try payment link approach
            if (checkoutData?.paymentLink) {
                window.location.href = checkoutData.paymentLink
                return
            }
        } catch (stripeErr) {
            console.warn('Stripe checkout not configured, proceeding without payment:', stripeErr)
        }

        // Fallback: If Stripe isn't configured yet, show success and redirect to login
        showAlert('success', 'Account created successfully! Please check your email to verify, then log in.')
        submitBtnText.textContent = 'Account Created!'
        submitSpinner.classList.add('hidden')

        setTimeout(() => {
            window.location.href = '/index.html'
        }, 3000)

    } catch (error) {
        console.error('Signup error:', error)
        submitBtn.disabled = false
        submitBtnText.textContent = 'Create Account & Pay'
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
