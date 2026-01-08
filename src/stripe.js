import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

/**
 * Create a Stripe Checkout session for purchasing a module
 * @param {Object} module - The module to purchase
 * @param {Object} user - The current user
 * @returns {Promise} - Redirects to Stripe Checkout
 */
export async function createCheckoutSession(module, user) {
  try {
    const stripe = await stripePromise
    
    if (!stripe) {
      throw new Error('Stripe failed to load')
    }

    // Call your backend to create a checkout session
    // This should be a Supabase Edge Function or your own backend
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        moduleId: module.id,
        moduleTitle: module.title,
        modulePrice: module.price || 2999, // Price in cents (e.g., $29.99)
        userId: user.id,
        userEmail: user.email,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create checkout session')
    }

    const { sessionId } = await response.json()

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({
      sessionId,
    })

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Stripe checkout error:', error)
    throw error
  }
}

/**
 * Alternative: Use Stripe Payment Links (simpler, no backend needed)
 * Create payment links in your Stripe Dashboard and store them in your database
 */
export async function redirectToPaymentLink(paymentLinkUrl) {
  if (!paymentLinkUrl) {
    throw new Error('No payment link provided')
  }
  
  window.location.href = paymentLinkUrl
}

/**
 * Handle successful payment
 * This should be called on your success page
 */
export async function handlePaymentSuccess(sessionId) {
  try {
    // Verify the payment with your backend
    const response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    })

    if (!response.ok) {
      throw new Error('Failed to verify payment')
    }

    const { success, moduleId } = await response.json()
    
    return { success, moduleId }
  } catch (error) {
    console.error('Payment verification error:', error)
    throw error
  }
}
