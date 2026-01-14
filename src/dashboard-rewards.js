// Rewards Tab Functionality for Dashboard
import { getRewards, createCustomReward, purchaseReward, getChildPurchaseHistory, getChildSpendableStars } from './rewards.js'

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
    // Load rewards and child's spendable stars
    rewards = await getRewards()
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
  
  if (rewards.length === 0) {
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
    const card = document.createElement('div')
    card.className = `shop-item ${canAfford ? '' : 'insufficient-stars'}`
    
    card.innerHTML = `
      <div class="item-icon">${reward.icon || '🎁'}</div>
      <div class="item-name">${reward.title}</div>
      ${reward.description ? `<div style="font-size: 13px; color: #4c6c96; margin-bottom: 12px;">${reward.description}</div>` : ''}
      <div class="item-price">
        <span>⭐</span>
        <span>${reward.star_cost}</span>
      </div>
      ${!canAfford ? '<p style="color: #ff4444; font-size: 12px; margin-top: 8px; text-align: center;">Not enough stars</p>' : ''}
    `
    
    if (canAfford) {
      card.style.cursor = 'pointer'
      card.addEventListener('click', () => showPurchaseModal(reward, selectedChild))
    } else {
      card.style.opacity = '0.6'
      card.style.cursor = 'not-allowed'
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
      const date = new Date(purchase.created_at).toLocaleDateString()
      const statusClass = purchase.status.toLowerCase()
      
      return `
        <div class="purchase-history-item">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 32px;">${getRewardIcon(purchase.reward_title)}</div>
            <div>
              <div style="font-weight: 600; color: #405878; margin-bottom: 4px;">${purchase.reward_title}</div>
              <div style="font-size: 13px; color: #4c6c96;">${date} • ⭐ ${purchase.star_cost} stars</div>
            </div>
          </div>
          <div class="purchase-status ${statusClass}">${purchase.status}</div>
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
          category: document.getElementById('rewardCategory').value
        }
        
        await createCustomReward(rewardData)
        
        // Reload rewards
        rewards = await getRewards()
        renderRewards(selectedChild)
        
        closeCustomRewardModal()
        alert('✅ Custom reward created successfully!')
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
        alert(`🎉 Success! You've redeemed: ${currentPurchaseReward.title}`)
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
