import { checkAuth, getCurrentUser, signOut } from './auth.js'
import {
  getCurrentBillingPeriod,
  getCreditLedger,
  getCreditSummary,
  getParentSubscription,
  getSubscriptionTiers,
  upsertParentSubscription
} from './database.js'
import { getSupabaseClient } from './supabaseClient.js'

const tierSelect = document.getElementById('tierSelect')
const statusSelect = document.getElementById('statusSelect')
const periodStart = document.getElementById('periodStart')
const periodEnd = document.getElementById('periodEnd')
const cancelAtPeriodEnd = document.getElementById('cancelAtPeriodEnd')
const subscriptionForm = document.getElementById('subscriptionForm')
const quickGrantForm = document.getElementById('quickGrantForm')
const quickGrantCredits = document.getElementById('quickGrantCredits')
const statusMessage = document.getElementById('statusMessage')
const tiersGrid = document.getElementById('tiersGrid')
const creditsGranted = document.getElementById('creditsGranted')
const creditsUsed = document.getElementById('creditsUsed')
const creditsAvailable = document.getElementById('creditsAvailable')
const periodLabel = document.getElementById('periodLabel')
const ledgerRows = document.getElementById('ledgerRows')
const logoutButton = document.getElementById('logoutButton')

let currentUser = null
let period = getCurrentBillingPeriod()

function setStatus(message, type = 'ok') {
  if (!statusMessage) return
  statusMessage.style.display = 'block'
  statusMessage.className = `card status-${type === 'error' ? 'error' : 'ok'}`
  statusMessage.textContent = message
}

function renderTiers(tiers) {
  tiersGrid.innerHTML = ''
  tierSelect.innerHTML = ''
  tiers.forEach((tier) => {
    const card = document.createElement('article')
    card.className = 'tier'
    card.innerHTML = `<h3>${tier.tier.toUpperCase()}</h3><p>${tier.modules_per_month} module credits/month</p>`
    tiersGrid.appendChild(card)

    const option = document.createElement('option')
    option.value = tier.tier
    option.textContent = `${tier.tier.toUpperCase()} (${tier.modules_per_month}/month)`
    tierSelect.appendChild(option)
  })
}

function renderWallet(summary) {
  creditsGranted.textContent = summary.credits_granted
  creditsUsed.textContent = summary.credits_used
  creditsAvailable.textContent = summary.credits_available
}

function renderLedger(rows) {
  if (!rows.length) {
    ledgerRows.innerHTML = '<p class="muted">No entries for this period yet.</p>'
    return
  }

  ledgerRows.innerHTML = '<div class="ledger-row ledger-head"><span>When</span><span>Type</span><span>Delta</span><span>Module</span><span>Notes</span></div>'
  rows.forEach((row) => {
    const item = document.createElement('div')
    item.className = 'ledger-row'
    item.innerHTML = `
      <span>${new Date(row.created_at).toLocaleString()}</span>
      <span>${row.entry_type}</span>
      <span>${row.credits_delta}</span>
      <span>${row.module_id || '-'}</span>
      <span>${row.notes || '-'}</span>
    `
    ledgerRows.appendChild(item)
  })
}

async function refreshCredits() {
  const [summary, ledger] = await Promise.all([
    getCreditSummary(currentUser.id, period.periodStart, period.periodEnd),
    getCreditLedger(currentUser.id, period.periodStart, period.periodEnd)
  ])
  renderWallet(summary)
  renderLedger(ledger)
}

async function init() {
  const session = await checkAuth()
  if (!session) {
    window.location.href = '/'
    return
  }

  currentUser = await getCurrentUser()
  period = getCurrentBillingPeriod()
  periodStart.value = period.periodStart
  periodEnd.value = period.periodEnd
  periodLabel.textContent = `${period.periodStart} → ${period.periodEnd}`

  const [tiers, subscription] = await Promise.all([
    getSubscriptionTiers(),
    getParentSubscription(currentUser.id)
  ])

  renderTiers(tiers)

  if (subscription) {
    tierSelect.value = subscription.tier || tierSelect.value
    statusSelect.value = subscription.status || 'active'
    periodStart.value = subscription.current_period_start || period.periodStart
    periodEnd.value = subscription.current_period_end || period.periodEnd
    cancelAtPeriodEnd.checked = Boolean(subscription.cancel_at_period_end)
  }

  await refreshCredits()
}

subscriptionForm?.addEventListener('submit', async (event) => {
  event.preventDefault()
  try {
    await upsertParentSubscription({
      parent_id: currentUser.id,
      tier: tierSelect.value,
      status: statusSelect.value,
      current_period_start: periodStart.value,
      current_period_end: periodEnd.value,
      cancel_at_period_end: cancelAtPeriodEnd.checked
    })
    setStatus('Subscription profile saved.')
  } catch (error) {
    setStatus(error.message || 'Failed to save subscription profile.', 'error')
  }
})

quickGrantForm?.addEventListener('submit', async (event) => {
  event.preventDefault()
  try {
    const credits = Number(quickGrantCredits.value)
    const { error } = await getSupabaseClient()
      .from('subscription_credit_ledger')
      .insert([
        {
          parent_id: currentUser.id,
          period_start: period.periodStart,
          period_end: period.periodEnd,
          entry_type: 'grant',
          credits_delta: credits,
          notes: 'Manual test grant from billing page',
          created_by: currentUser.id
        }
      ])

    if (error) throw error
    await refreshCredits()
    setStatus(`Added ${credits} credits to your current period wallet.`)
  } catch (error) {
    setStatus(error.message || 'Failed to grant credits.', 'error')
  }
})

logoutButton?.addEventListener('click', async () => {
  await signOut()
  window.location.href = '/'
})

init().catch((error) => {
  console.error('Billing init failed:', error)
  setStatus(error.message || 'Failed to initialize billing page.', 'error')
})
