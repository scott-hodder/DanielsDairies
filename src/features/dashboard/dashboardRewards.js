// Rewards Tab Functionality for Dashboard
import { escapeHtml } from '../../lib/sanitize.js'
import { getRewards, createCustomReward, purchaseReward, getChildPurchaseHistory, getChildSpendableStars } from '../../rewards.js'
import { supabase } from '../../supabaseClient.js'
import { isTownPlayEnabled } from './townPlayFlag.js'
import { trackEvent } from '../../lib/telemetry.js'
import { showToast } from '../../ui/toast.js'

const SHIELD_COST = 15
let shieldCount = 0
let shieldAvailable = false

async function loadShieldState(childId) {
  try {
    if (!(await isTownPlayEnabled())) { shieldAvailable = false; return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { shieldAvailable = false; return }
    const { data } = await supabase.from('login_streaks')
      .select('shields')
      .eq('user_id', user.id).eq('child_id', childId)
      .maybeSingle()
    shieldCount = data?.shields || 0
    shieldAvailable = true
  } catch {
    shieldAvailable = false
  }
}

async function buyStreakShield(selectedChild) {
  try {
    const { data, error } = await supabase.rpc('purchase_streak_shield', { p_child_id: selectedChild.id })
    if (error) throw error
    if (!data?.ok) {
      const msg = data?.error === 'not-enough-stars' ? 'Not enough stars yet — keep exploring!'
        : data?.error === 'already-protected' ? "You're already protected!"
        : 'Could not buy the shield right now.'
      showToast(msg, 'error')
      return
    }
    shieldCount += 1
    childSpendableStars -= SHIELD_COST
    trackEvent('streak_shield_purchased', {})
    showRewardCelebration('Streak Shield', '🛡️')
    const availableStarsCount = document.getElementById('availableStarsCount')
    if (availableStarsCount) availableStarsCount.textContent = childSpendableStars
    renderRewards(selectedChild)
  } catch (e) {
    console.error('Shield purchase failed:', e)
    showToast('Could not buy the shield right now.', 'error')
  }
}

function shieldCardHtml() {
  const protectedNow = shieldCount >= 1
  const canAfford = childSpendableStars >= SHIELD_COST
  const status = protectedNow
    ? '<div class="reward-card-status can-afford">🛡️ Protected! Daniel is guarding your streak.</div>'
    : canAfford
      ? '<div class="reward-card-status can-afford">Tap to buy!</div>'
      : `<div class="reward-card-status need-more">${SHIELD_COST - childSpendableStars} more star${SHIELD_COST - childSpendableStars === 1 ? '' : 's'} to go!</div>`
  return `
    <div class="reward-card-icon">🛡️</div>
    <div class="reward-card-name">Streak Shield</div>
    <div class="reward-card-desc">If you miss a day, Daniel keeps your streak safe. Holds one shield at a time.</div>
    <div class="reward-card-cost"><span>⭐</span><span>${SHIELD_COST}</span></div>
    ${status}`
}

/**
 * Show a celebration popup when a reward is redeemed
 */
function showRewardCelebration(rewardTitle, rewardIcon) {
  // Ensure celebration keyframes exist
  if (!document.getElementById('rewardCelebrationStyles')) {
    const style = document.createElement('style')
    style.id = 'rewardCelebrationStyles'
    style.textContent = `
      @keyframes celebrationFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes celebrationCardPop { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
    `
    document.head.appendChild(style)
  }

  const existing = document.getElementById('rewardCelebrationPopup')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'rewardCelebrationPopup'
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(24,34,56,0.45);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;z-index:10000;animation:celebrationFadeIn 0.25s ease;'
  overlay.innerHTML = `
    <div style="position:relative;width:min(420px,100%);border-radius:28px;padding:32px 28px 26px;color:#243b5a;text-align:center;background:linear-gradient(145deg,#fffdf7 0%,#fff3fb 45%,#eef8ff 100%);box-shadow:0 28px 80px rgba(75,85,180,0.28);animation:celebrationCardPop 0.35s ease;">
      <div style="font-size:64px;margin-bottom:16px;">${rewardIcon}</div>
      <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.85);color:#14b8a6;font-weight:700;font-size:13px;letter-spacing:0.03em;text-transform:uppercase;margin-bottom:16px;">Reward Redeemed!</div>
      <h2 style="margin:0 0 12px;font-size:clamp(24px,4vw,32px);line-height:1.1;color:#2f3e74;font-family:'Fredoka',sans-serif;">${rewardTitle}</h2>
      <p style="margin:0 auto 22px;max-width:300px;font-size:16px;line-height:1.6;color:#506487;font-family:'Fredoka',sans-serif;">You earned this! Ask your parent when you can enjoy your reward.</p>
      <button type="button" style="border:none;border-radius:16px;padding:14px 22px;min-width:170px;background:linear-gradient(135deg,#14b8a6 0%,#0d9488 100%);color:#fff;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 14px 30px rgba(20,184,166,0.28);font-family:'Fredoka',sans-serif;" id="rewardCelebrationClose">Awesome!</button>
    </div>
  `

  const closePopup = () => overlay.remove()
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closePopup()
  })

  document.body.appendChild(overlay)
  document.getElementById('rewardCelebrationClose')?.addEventListener('click', closePopup)
}

// State
let rewards = []
let currentPurchaseReward = null
let childSpendableStars = 0
let selectedChildId = null

// DOM Elements
const totalStarsCount = document.getElementById('totalStarsCount')
const spentStarsCount = document.getElementById('spentStarsCount')
const availableStarsCount = document.getElementById('availableStarsCount')
const rewardsGrid = document.getElementById('rewardsGrid')
const purchaseHistory = document.getElementById('purchaseHistory')
const addCustomRewardBtn = document.getElementById('addCustomRewardBtn')

// Modals
const customRewardModal = document.getElementById('customRewardModal')
const customRewardForm = document.getElementById('customRewardForm')
const customRewardError = document.getElementById('customRewardError')
const cancelCustomRewardButton = document.getElementById('cancelCustomRewardButton')

const purchaseRewardModal = document.getElementById('purchaseRewardModal')
const purchaseRewardIcon = document.getElementById('purchaseRewardIcon')
const purchaseRewardTitle = document.getElementById('purchaseRewardTitle')
const purchaseRewardDescription = document.getElementById('purchaseRewardDescription')
const purchaseRewardCost = document.getElementById('purchaseRewardCost')
const purchaseCurrentStars = document.getElementById('purchaseCurrentStars')
const purchaseRewardError = document.getElementById('purchaseRewardError')
const cancelPurchaseRewardButton = document.getElementById('cancelPurchaseRewardButton')
const confirmPurchaseRewardButton = document.getElementById('confirmPurchaseRewardButton')

/**
 * Initialize rewards tab
 */
export async function initializeRewardsTab(selectedChild) {
  if (!selectedChild) return
  
  selectedChildId = selectedChild.id
  
  try {
    // Load rewards and child's spendable stars (filtered to this child)
    rewards = await getRewards(selectedChild.id)
    const starsData = await getChildSpendableStars(selectedChild.id)
    childSpendableStars = starsData.spendable_stars || 0
    
    // Calculate star statistics
    const totalStars = starsData.stars || 0
    const spentStars = totalStars - childSpendableStars
    
    // Update star count displays
    if (totalStarsCount) totalStarsCount.textContent = totalStars
    if (spentStarsCount) spentStarsCount.textContent = spentStars
    if (availableStarsCount) availableStarsCount.textContent = childSpendableStars
    
    // Render rewards and history
    await loadShieldState(selectedChild.id)
    renderRewards(selectedChild)
    await renderPurchaseHistory(selectedChild)
  } catch (error) {
    console.error('Error initializing rewards tab:', error)
  }
}

/**
 * Render rewards grid
 */
function renderRewards(selectedChild) {
  if (!rewardsGrid) return

  rewardsGrid.innerHTML = ''

  // Built-in Streak Shield — the one item the child buys for themselves.
  if (shieldAvailable) {
    const shieldCard = document.createElement('div')
    const buyable = shieldCount < 1 && childSpendableStars >= SHIELD_COST
    shieldCard.className = `reward-card ${buyable || shieldCount >= 1 ? '' : 'reward-locked'}`
    shieldCard.innerHTML = shieldCardHtml()
    if (buyable) shieldCard.addEventListener('click', () => buyStreakShield(selectedChild))
    rewardsGrid.appendChild(shieldCard)
  }

  if (rewards.length === 0 && !shieldAvailable) {
    rewardsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #4c6c96;">
        <p style="font-size: 18px; margin-bottom: 12px;">No rewards available.</p>
        <p style="font-size: 14px;">Try adding a custom reward!</p>
      </div>
    `
    return
  }
  
  rewards.forEach(reward => {
    const canAfford = childSpendableStars >= reward.star_cost
    const starsAway = reward.star_cost - childSpendableStars
    const card = document.createElement('div')
    card.className = `reward-card ${canAfford ? '' : 'reward-locked'}`

    card.innerHTML = `
      <div class="reward-card-icon">${reward.icon || '🎁'}</div>
      <div class="reward-card-name">${escapeHtml(reward.title)}</div>
      ${reward.description ? `<div class="reward-card-desc">${escapeHtml(reward.description)}</div>` : ''}
      <div class="reward-card-cost">
        <span>⭐</span>
        <span>${reward.star_cost}</span>
      </div>
      ${canAfford
        ? '<div class="reward-card-status can-afford">Tap to redeem!</div>'
        : `<div class="reward-card-status need-more">${starsAway} more star${starsAway === 1 ? '' : 's'} to go!</div>`
      }
    `

    if (canAfford) {
      card.addEventListener('click', () => showPurchaseModal(reward, selectedChild))
    }

    rewardsGrid.appendChild(card)
  })
}

/**
 * Render purchase history
 */
async function renderPurchaseHistory(selectedChild) {
  if (!purchaseHistory) return
  
  try {
    const history = await getChildPurchaseHistory(selectedChild.id, 10)
    
    if (history.length === 0) {
      purchaseHistory.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #4c6c96;">
          <p style="font-size: 16px;">No purchases yet</p>
          <p style="font-size: 14px; margin-top: 8px;">Start earning stars and redeem rewards!</p>
        </div>
      `
      return
    }
    
    purchaseHistory.innerHTML = history.map(purchase => {
      const date = new Date(purchase.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })

      return `
        <div class="purchase-row">
          <div class="purchase-row-icon">${getRewardIcon(purchase.reward_title)}</div>
          <div class="purchase-row-info">
            <div class="purchase-row-title">${escapeHtml(purchase.reward_title)}</div>
            <div class="purchase-row-date">${date}</div>
          </div>
          <div class="purchase-row-cost">⭐ ${purchase.star_cost}</div>
        </div>
      `
    }).join('')
  } catch (error) {
    console.error('Error loading purchase history:', error)
    purchaseHistory.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #ff4444;">
        Failed to load purchase history
      </div>
    `
  }
}

/**
 * Get icon for a reward based on title
 */
function getRewardIcon(title) {
  const iconMap = {
    'ipad': '📱',
    'screen': '📱',
    'dinner': '🍕',
    'bedtime': '🌙',
    'movie': '🎬',
    'ice cream': '🍦',
    'park': '🎪',
    'story': '📚',
    'sleepover': '🏠',
    'chore': '✨',
    'baking': '🧁'
  }
  
  const lowerTitle = title.toLowerCase()
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lowerTitle.includes(key)) return icon
  }
  
  return '🎁'
}

/**
 * Show purchase confirmation modal
 */
function showPurchaseModal(reward, selectedChild) {
  currentPurchaseReward = reward
  
  if (purchaseRewardIcon) purchaseRewardIcon.textContent = reward.icon || '🎁'
  if (purchaseRewardTitle) purchaseRewardTitle.textContent = reward.title
  if (purchaseRewardDescription) purchaseRewardDescription.textContent = reward.description || ''
  if (purchaseRewardCost) purchaseRewardCost.textContent = reward.star_cost
  if (purchaseCurrentStars) purchaseCurrentStars.textContent = childSpendableStars
  
  if (purchaseRewardError) purchaseRewardError.classList.add('hidden')
  if (purchaseRewardModal) purchaseRewardModal.classList.remove('hidden')
}

/**
 * Close purchase modal
 */
function closePurchaseModal() {
  if (purchaseRewardModal) purchaseRewardModal.classList.add('hidden')
  currentPurchaseReward = null
}

/**
 * Show custom reward modal
 */
function showCustomRewardModal() {
  if (customRewardForm) customRewardForm.reset()
  if (customRewardError) customRewardError.classList.add('hidden')
  if (customRewardModal) customRewardModal.classList.remove('hidden')
}

/**
 * Close custom reward modal
 */
function closeCustomRewardModal() {
  if (customRewardModal) customRewardModal.classList.add('hidden')
}

/**
 * Setup event listeners
 */
export function setupRewardsEventListeners(selectedChild) {
  // Add custom reward button
  if (addCustomRewardBtn) {
    addCustomRewardBtn.addEventListener('click', showCustomRewardModal)
  }
  
  // Custom reward form
  if (customRewardForm) {
    customRewardForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      try {
        const rewardData = {
          title: document.getElementById('rewardTitle').value,
          description: document.getElementById('rewardDescription').value,
          star_cost: parseInt(document.getElementById('rewardCost').value),
          icon: document.getElementById('rewardIcon').value || '🎁',
          category: document.getElementById('rewardCategory').value,
          child_id: selectedChildId
        }

        await createCustomReward(rewardData)

        // Reload rewards (filtered to this child)
        rewards = await getRewards(selectedChildId)
        renderRewards(selectedChild)
        
        closeCustomRewardModal()
        showRewardCelebration(rewardData.title, rewardData.icon)
      } catch (error) {
        console.error('Error creating reward:', error)
        if (customRewardError) {
          customRewardError.textContent = error.message || 'Failed to create reward'
          customRewardError.classList.remove('hidden')
        }
      }
    })
  }
  
  // Cancel custom reward
  if (cancelCustomRewardButton) {
    cancelCustomRewardButton.addEventListener('click', closeCustomRewardModal)
  }
  
  // Purchase reward confirmation
  if (confirmPurchaseRewardButton) {
    confirmPurchaseRewardButton.addEventListener('click', async () => {
      if (!currentPurchaseReward || !selectedChild) return
      
      try {
        confirmPurchaseRewardButton.disabled = true
        confirmPurchaseRewardButton.textContent = 'Processing...'
        
        const result = await purchaseReward(selectedChild.id, currentPurchaseReward.id)
        
        // Update spendable stars and recalculate statistics
        childSpendableStars = result.remaining_stars
        const starsData = await getChildSpendableStars(selectedChild.id)
        const totalStars = starsData.stars || 0
        const spentStars = totalStars - childSpendableStars
        
        // Update all star displays
        if (totalStarsCount) totalStarsCount.textContent = totalStars
        if (spentStarsCount) spentStarsCount.textContent = spentStars
        if (availableStarsCount) availableStarsCount.textContent = childSpendableStars
        
        // Refresh displays
        renderRewards(selectedChild)
        await renderPurchaseHistory(selectedChild)
        
        closePurchaseModal()
        showRewardCelebration(currentPurchaseReward.title, currentPurchaseReward.icon || '🎁')
      } catch (error) {
        console.error('Error purchasing reward:', error)
        if (purchaseRewardError) {
          purchaseRewardError.textContent = error.message || 'Failed to purchase reward'
          purchaseRewardError.classList.remove('hidden')
        }
      } finally {
        confirmPurchaseRewardButton.disabled = false
        confirmPurchaseRewardButton.textContent = 'Purchase'
      }
    })
  }
  
  // Cancel purchase
  if (cancelPurchaseRewardButton) {
    cancelPurchaseRewardButton.addEventListener('click', closePurchaseModal)
  }
}
