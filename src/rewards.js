import { supabase } from './supabaseClient.js'

/**
 * Get all available rewards (baseline + custom for current user)
 */
export async function getRewards() {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('is_active', true)
    .order('is_baseline', { ascending: false })
    .order('star_cost', { ascending: true })

  if (error) {
    console.error('Error fetching rewards:', error)
    throw error
  }

  return data
}

/**
 * Create a custom reward (parent only)
 */
export async function createCustomReward(reward) {
  const { data: user } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Must be logged in to create rewards')
  }

  const { data, error } = await supabase
    .from('rewards')
    .insert({
      parent_user_id: user.user.id,
      title: reward.title,
      description: reward.description,
      star_cost: reward.star_cost,
      icon: reward.icon || '🎁',
      is_baseline: false,
      category: reward.category || 'other'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating reward:', error)
    throw error
  }

  return data
}

/**
 * Update a custom reward
 */
export async function updateReward(rewardId, updates) {
  const { data, error } = await supabase
    .from('rewards')
    .update(updates)
    .eq('id', rewardId)
    .eq('is_baseline', false) // Can only update custom rewards
    .select()
    .single()

  if (error) {
    console.error('Error updating reward:', error)
    throw error
  }

  return data
}

/**
 * Delete a custom reward
 */
export async function deleteReward(rewardId) {
  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', rewardId)
    .eq('is_baseline', false) // Can only delete custom rewards

  if (error) {
    console.error('Error deleting reward:', error)
    throw error
  }

  return true
}

/**
 * Purchase a reward for a child
 */
export async function purchaseReward(childId, rewardId) {
  const { data, error } = await supabase
    .rpc('purchase_reward', {
      p_child_id: childId,
      p_reward_id: rewardId
    })

  if (error) {
    console.error('Error purchasing reward:', error)
    throw error
  }

  return data
}

/**
 * Get purchase history for a child
 */
export async function getChildPurchaseHistory(childId, limit = 50) {
  const { data, error } = await supabase
    .from('reward_purchases')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching purchase history:', error)
    throw error
  }

  return data
}

/**
 * Get all pending purchases (for parent approval)
 */
export async function getPendingPurchases() {
  const { data: user } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Must be logged in')
  }

  const { data, error } = await supabase
    .from('reward_purchases')
    .select(`
      *,
      children (
        name,
        avatar
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending purchases:', error)
    throw error
  }

  return data
}

/**
 * Approve a reward purchase
 */
export async function approvePurchase(purchaseId) {
  const { data: user } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('reward_purchases')
    .update({
      status: 'approved',
      approved_by: user.user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', purchaseId)
    .select()
    .single()

  if (error) {
    console.error('Error approving purchase:', error)
    throw error
  }

  return data
}

/**
 * Complete a reward purchase
 */
export async function completePurchase(purchaseId) {
  const { data, error } = await supabase
    .from('reward_purchases')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', purchaseId)
    .select()
    .single()

  if (error) {
    console.error('Error completing purchase:', error)
    throw error
  }

  return data
}

/**
 * Cancel a reward purchase (refund stars)
 */
export async function cancelPurchase(purchaseId) {
  // Get purchase details
  const { data: purchase, error: fetchError } = await supabase
    .from('reward_purchases')
    .select('*, children(*)')
    .eq('id', purchaseId)
    .single()

  if (fetchError) {
    console.error('Error fetching purchase:', fetchError)
    throw fetchError
  }

  // Refund stars to child
  const { error: refundError } = await supabase
    .from('children')
    .update({
      spendable_stars: purchase.children.spendable_stars + purchase.star_cost
    })
    .eq('id', purchase.child_id)

  if (refundError) {
    console.error('Error refunding stars:', refundError)
    throw refundError
  }

  // Update purchase status
  const { data, error } = await supabase
    .from('reward_purchases')
    .update({
      status: 'cancelled'
    })
    .eq('id', purchaseId)
    .select()
    .single()

  if (error) {
    console.error('Error cancelling purchase:', error)
    throw error
  }

  return data
}

/**
 * Get child's spendable stars
 */
export async function getChildSpendableStars(childId) {
  const { data, error } = await supabase
    .from('children')
    .select('spendable_stars, stars')
    .eq('id', childId)
    .single()

  if (error) {
    console.error('Error fetching spendable stars:', error)
    throw error
  }

  return data
}
