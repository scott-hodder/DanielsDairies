import { getSupabaseClient } from './supabaseClient'

function supabase() {
  return getSupabaseClient()
}

export async function getChildren(parentUserId) {
  const { data, error } = await supabase()
    .from('children')
    .select('*')
    .eq('parent_user_id', parentUserId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createChild(parentUserId, name, dateOfBirth) {
  const { data, error } = await supabase()
    .from('children')
    .insert([
      {
        parent_user_id: parentUserId,
        name,
        date_of_birth: dateOfBirth,
        stars: 0,
        password: null
      }
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getModules() {
  const { data, error } = await supabase()
    .from('modules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getModuleById(moduleId) {
  const { data, error } = await supabase().from('modules').select('*').eq('id', moduleId).single()
  if (error) throw error
  return data
}

export async function createModule(modulePayload) {
  const { data, error } = await supabase().from('modules').insert([modulePayload]).select().single()
  if (error) throw error
  return data
}

export async function updateModule(moduleId, updates) {
  const { data, error } = await supabase()
    .from('modules')
    .update(updates)
    .eq('id', moduleId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteModule(moduleId) {
  const { error } = await supabase().from('modules').delete().eq('id', moduleId)
  if (error) throw error
  return true
}

export async function getSuperSkills() {
  const { data, error } = await supabase()
    .from('super_skills')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getParentModules(parentUserId) {
  const { data, error } = await supabase()
    .from('parent_modules')
    .select('module_id')
    .eq('parent_id', parentUserId)
    .eq('is_active', true)

  if (error) throw error
  return data || []
}

export async function getSubscriptionTiers() {
  const { data, error } = await supabase()
    .from('subscription_tiers')
    .select('*')
    .eq('is_active', true)
    .order('modules_per_month', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getParentSubscription(parentUserId) {
  const { data, error } = await supabase()
    .from('parent_subscriptions')
    .select('*')
    .eq('parent_id', parentUserId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertParentSubscription(subscriptionPayload) {
  const { data, error } = await supabase()
    .from('parent_subscriptions')
    .upsert([subscriptionPayload], { onConflict: 'parent_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getCreditSummary(parentUserId, periodStart, periodEnd) {
  const { data, error } = await supabase()
    .from('v_parent_credit_summary')
    .select('*')
    .eq('parent_id', parentUserId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .maybeSingle()

  if (error) throw error
  return (
    data || {
      parent_id: parentUserId,
      period_start: periodStart,
      period_end: periodEnd,
      credits_granted: 0,
      credits_used: 0,
      credits_available: 0
    }
  )
}

export async function getCreditLedger(parentUserId, periodStart, periodEnd) {
  const { data, error } = await supabase()
    .from('subscription_credit_ledger')
    .select('*')
    .eq('parent_id', parentUserId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getModuleUnlocks(parentUserId, periodStart, periodEnd) {
  const { data, error } = await supabase()
    .from('module_unlocks')
    .select('module_id, period_start, period_end, unlock_source')
    .eq('parent_id', parentUserId)
    .eq('is_active', true)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)

  if (error) throw error
  return data || []
}

export async function unlockModuleWithCredit(moduleId, periodStart) {
  const { data, error } = await supabase().rpc('unlock_module_with_credit', {
    p_module_id: moduleId,
    p_period_start: periodStart
  })

  if (error) throw error
  return data
}

export async function getChildModules(childId) {
  const { data, error } = await supabase()
    .from('child_modules')
    .select('*, modules(*)')
    .eq('child_id', childId)

  if (error) throw error
  return data || []
}

export async function updateChildModuleStatus(childId, moduleId, status) {
  const { data: existing, error: existingError } = await supabase()
    .from('child_modules')
    .select('*')
    .eq('child_id', childId)
    .eq('module_id', moduleId)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    const { data, error } = await supabase()
      .from('child_modules')
      .update({ status })
      .eq('child_id', childId)
      .eq('module_id', moduleId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase()
    .from('child_modules')
    .insert([
      {
        child_id: childId,
        module_id: moduleId,
        status,
        progress: status === 'completed' ? 100 : 0
      }
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getWeeklyCheckins(parentUserId, childId = null) {
  let query = supabase()
    .from('weekly_checkins')
    .select('*')
    .eq('parent_user_id', parentUserId)
    .order('created_at', { ascending: false })

  if (childId) {
    query = query.eq('child_id', childId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}
