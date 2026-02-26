import { getSupabaseClient } from '../supabaseClient.js'
import { setChildPasswordServer, verifyChildPasswordServer } from './childCredentials.js'

const LEVEL_XP = 100

// Get all children for a parent
export async function getChildren(parentUserId) {
  const { data, error } = await getSupabaseClient()
    .from('children')
    .select('*')
    .eq('parent_user_id', parentUserId)
    .order('created_at', { ascending: true })
  
  if (error) {
    throw error
  }
  
  return data
}

// Save a weekly check-in response with generated plan
export async function saveWeeklyCheckin({
  parentUserId,
  childId,
  intensity,
  challenge,
  triggers = [],
  goal = null,
  notes = null,
  generatedPlan = null,
  subSkillId = null,
  weekNumber = null,
  moduleId = null
}) {
  const payload = {
    parent_user_id: parentUserId,
    child_id: childId,
    intensity,
    challenge,
    triggers,
    goal,
    notes,
    generated_plan: generatedPlan
  }
  
  if (subSkillId) payload.sub_skill_id = subSkillId
  if (weekNumber) payload.week_number = weekNumber
  if (moduleId) payload.module_id = moduleId

  const { data, error } = await getSupabaseClient()
    .from('weekly_checkins')
    .insert([payload])
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

// Get the latest weekly plan for a parent/child combo
export async function getLatestWeeklyPlan(parentUserId, childId) {
  const { data, error } = await getSupabaseClient()
    .from('weekly_checkins')
    .select('*')
    .eq('parent_user_id', parentUserId)
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

// Get a specific child
export async function getChild(childId) {
  const { data, error } = await getSupabaseClient()
    .from('children')
    .select('*')
    .eq('id', childId)
    .single()
  
  if (error) {
    throw error
  }
  
  return data
}

// Create a new child
export async function createChild(parentUserId, name, dateOfBirth, avatar = null) {
  const { data, error } = await getSupabaseClient()
    .from('children')
    .insert([
      { 
        parent_user_id: parentUserId, 
        name, 
        date_of_birth: dateOfBirth,
        stars: 0,
        password: null,
        avatar: avatar
      }
    ])
    .select()
    .single()
  
  if (error) {
    throw error
  }
  
  return data
}

// Set child password via server-side function (never hashes in browser)
export async function setChildPassword(childId, password) {
  const result = await setChildPasswordServer(childId, password)
  return result
}

// Verify child password via server-side function (never compares in browser)
export async function verifyChildPassword(childId, password) {
  const result = await verifyChildPasswordServer(childId, password)
  return Boolean(result?.valid)
}

// Update child's stars
export async function updateChildStars(childId, stars) {
  const { data, error } = await getSupabaseClient()
    .from('children')
    .update({ stars })
    .eq('id', childId)
    .select()
    .single()
  
  if (error) {
    throw error
  }
  
  return data
}

// Update child's profile (name, avatar, password)
export async function updateChildProfile(childId, updates) {
  const { data, error } = await getSupabaseClient()
    .from('children')
    .update(updates)
    .eq('id', childId)
    .select()
    .single()
  
  if (error) {
    throw error
  }
  
  return data
}

// Delete a child and all their associated data
export async function deleteChild(childId) {
  // First delete all child_modules records (if cascade delete is not set up)
  const { error: modulesError } = await getSupabaseClient()
    .from('child_modules')
    .delete()
    .eq('child_id', childId)
  
  if (modulesError) {
    console.warn('Error deleting child modules:', modulesError)
    // Continue anyway as the child table might have cascade delete
  }
  
  // Delete the child
  const { error } = await getSupabaseClient()
    .from('children')
    .delete()
    .eq('id', childId)
  
  if (error) {
    throw error
  }
  
  return true
}

// Get all modules (active and inactive)
export async function getModules() {
  const { data, error } = await getSupabaseClient()
    .from('modules')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    throw error
  }
  
  return data
}

// Get all Super Skills for dropdowns
export async function getSuperSkills() {
  console.log('[Database] Fetching Super Skills...');
  const { data, error } = await getSupabaseClient()
    .from('super_skills')
    .select('*')
    // .eq('is_active', true)  // Temporarily removed - show all skills
    .order('sort_order', { ascending: true })
  
  console.log('[Database] Super Skills query result:', { data, error });
  
  if (error) {
    console.error('[Database] Super Skills query error:', error);
    throw error
  }
  
  console.log('[Database] Returning Super Skills:', data);
  return data
}

// Get modules a parent has access to
export async function getParentModules(parentUserId) {
  const { data, error } = await getSupabaseClient()
    .from('parent_modules')
    .select('module_id')
    .eq('parent_id', parentUserId)
    .eq('is_active', true)

  if (error) {
    throw error
  }

  return data || []
}



export function getCurrentBillingPeriod(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear()
  const month = referenceDate.getUTCMonth()
  const periodStart = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
  const periodEnd = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10)
  return { periodStart, periodEnd }
}

export async function getSubscriptionTiers() {
  const { data, error } = await getSupabaseClient()
    .from('subscription_tiers')
    .select('*')
    .eq('is_active', true)
    .order('modules_per_month', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getParentSubscription(parentUserId) {
  const { data, error } = await getSupabaseClient()
    .from('parent_subscriptions')
    .select('*')
    .eq('parent_id', parentUserId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertParentSubscription(subscriptionPayload) {
  const { data, error } = await getSupabaseClient()
    .from('parent_subscriptions')
    .upsert([subscriptionPayload], { onConflict: 'parent_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getCreditSummary(parentUserId, periodStart, periodEnd) {
  const { data, error } = await getSupabaseClient()
    .from('v_parent_credit_summary')
    .select('*')
    .eq('parent_id', parentUserId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .maybeSingle()

  if (error) throw error

  return data || {
    parent_id: parentUserId,
    period_start: periodStart,
    period_end: periodEnd,
    credits_granted: 0,
    credits_used: 0,
    credits_available: 0
  }
}

export async function getCreditLedger(parentUserId, periodStart, periodEnd) {
  const { data, error } = await getSupabaseClient()
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
  const { data, error } = await getSupabaseClient()
    .from('module_unlocks')
    .select('module_id, period_start, period_end, unlock_source, modules(*)')
    .eq('parent_id', parentUserId)
    .eq('is_active', true)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)

  if (error) throw error
  return data || []
}

export async function unlockModuleWithCredit(moduleId, periodStart) {
  const { data, error } = await getSupabaseClient().rpc('unlock_module_with_credit', {
    p_module_id: moduleId,
    p_period_start: periodStart
  })

  if (error) throw error
  return data
}

// Retrieve module category color configuration
export async function getCategoryColors() {
  const { data, error } = await getSupabaseClient()
    .from('category_colors')
    .select('*')

  if (error) {
    throw error
  }

  return data || []
}

// Get child's module progress
export async function getChildModules(childId) {
  const { data, error } = await getSupabaseClient()
    .from('child_modules')
    .select(`
      *,
      modules (*)
    `)
    .eq('child_id', childId)
  
  if (error) {
    throw error
  }
  
  return data
}

// Create or update child module status
export async function updateChildModuleStatus(childId, moduleId, status) {
  // First check if record exists
  const { data: existing } = await getSupabaseClient()
    .from('child_modules')
    .select('*')
    .eq('child_id', childId)
    .eq('module_id', moduleId)
    .single()
  
  if (existing) {
    // Update existing record
    const { data, error } = await getSupabaseClient()
      .from('child_modules')
      .update({ status })
      .eq('child_id', childId)
      .eq('module_id', moduleId)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return data
  } else {
    // Create new record
    const { data, error } = await getSupabaseClient()
      .from('child_modules')
      .insert([
        { 
          child_id: childId, 
          module_id: moduleId, 
          status 
        }
      ])
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return data
  }
}

// Mark module as completed
export async function completeModule(childId, moduleId) {
  // First check if record exists
  const { data: existing } = await getSupabaseClient()
    .from('child_modules')
    .select('*')
    .eq('child_id', childId)
    .eq('module_id', moduleId)
    .single()
  
  const wasCompleted = existing?.is_completed === true

  if (existing) {
    // Update existing record
    if (!wasCompleted) {
      const { data, error } = await getSupabaseClient()
        .from('child_modules')
        .update({ 
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('child_id', childId)
        .eq('module_id', moduleId)
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      await awardModuleXp(childId, moduleId)
      
      // Temporarily disabled assessment check to identify if this is causing the second modal
      // await checkForAssessmentAfterCompletion(childId, moduleId)
      
      return data
    }

    return existing
  } else {
    // Create new record with completed status
    const { data, error } = await getSupabaseClient()
      .from('child_modules')
      .insert([
        { 
          child_id: childId, 
          module_id: moduleId, 
          is_completed: true,
          completed_at: new Date().toISOString()
        }
      ])
      .select()
      .single()
    
    if (error) {
      throw error
    }

    await awardModuleXp(childId, moduleId)
    
    // Temporarily disabled assessment check to identify if this is causing the second modal
    // await checkForAssessmentAfterCompletion(childId, moduleId)
    
    return data
  }
}

async function awardModuleXp(childId, moduleId) {
  const { data: moduleData, error: moduleError } = await getSupabaseClient()
    .from('modules')
    .select('xp_reward')
    .eq('id', moduleId)
    .single()

  if (moduleError) {
    throw moduleError
  }

  const xpReward = moduleData?.xp_reward || 0
  if (!xpReward) return

  try {
    const { error: rpcError } = await getSupabaseClient().rpc('increment_child_rewards', {
      p_child_id: childId,
      p_stars: 0,
      p_xp: xpReward
    })

    if (!rpcError) return
    console.warn('increment_child_rewards RPC failed, falling back to direct update:', rpcError)
  } catch (rpcError) {
    console.warn('increment_child_rewards RPC error, falling back to direct update:', rpcError)
  }

  const { data: child, error: childError } = await getSupabaseClient()
    .from('children')
    .select('total_xp, level')
    .eq('id', childId)
    .single()

  if (childError) {
    throw childError
  }

  const currentXp = child?.total_xp || 0
  const newTotalXp = currentXp + xpReward
  const newLevel = Math.max(1, Math.floor(newTotalXp / LEVEL_XP) + 1)

  const { error: updateError } = await getSupabaseClient()
    .from('children')
    .update({ total_xp: newTotalXp, level: newLevel })
    .eq('id', childId)

  if (updateError) {
    throw updateError
  }
}

// Award stars to a child
export async function awardStars(childId, starsToAdd) {
  // Get current stars
  const child = await getChild(childId)
  const newStars = (child.stars || 0) + starsToAdd
  
  // Update stars
  return await updateChildStars(childId, newStars)
}

// Get all children ordered by stars (for leaderboard)
export async function getAllChildrenLeaderboard(limit = 10) {
  const { data, error } = await getSupabaseClient()
    .from('children')
    .select('id, name, stars, created_at')
    .order('stars', { ascending: false })
    .order('created_at', { ascending: true }) // Tie-breaker: earlier signup wins
    .limit(limit)
  
  if (error) {
    throw error
  }
  
  return data
}

// Check if user is admin
export async function isUserAdmin(userId) {
  // Use the security definer function to avoid RLS recursion
  const { data, error } = await getSupabaseClient()
    .rpc('is_user_admin_check', { user_id: userId })
  
  if (error) {
    console.error('Error checking admin status:', error)
    return false
  }
  
  return data || false
}

// Set user admin status
export async function setUserAdmin(userId, isAdmin) {
  const { data, error } = await getSupabaseClient()
    .from('parent_profiles')
    .update({ is_admin: isAdmin })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) {
    throw error
  }
  
  return data
}

// Get parent profile
export async function getParentProfile(userId) {
  const { data, error } = await getSupabaseClient()
    .from('parent_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    throw error
  }
  
  return data
}

// Create a parent profile (called when user signs up)
export async function createParentProfile(userId, email) {
  const { data, error } = await getSupabaseClient()
    .from('parent_profiles')
    .insert([
      {
        id: userId,
        username: email.split('@')[0], // Use email prefix as default username
        is_admin: false
      }
    ])
    .select()
    .single()
  
  if (error) {
    console.error('Error creating parent profile:', error)
    throw error
  }
  
  return data
}

// Auto-create missing parent profiles for orphaned children
export async function createMissingParentProfiles() {
  try {
    // Get all unique parent_user_ids from children table
    const { data: children, error: childrenError } = await getSupabaseClient()
      .from('children')
      .select('parent_user_id')
    
    if (childrenError) throw childrenError
    
    if (!children || children.length === 0) {
      console.log('No children found')
      return { created: 0, skipped: 0 }
    }
    
    // Get unique parent IDs
    const uniqueParentIds = [...new Set(children.map(c => c.parent_user_id))]
    
    // Get existing parent profiles
    const { data: existingProfiles, error: profilesError } = await getSupabaseClient()
      .from('parent_profiles')
      .select('id')
      .in('id', uniqueParentIds)
    
    if (profilesError) throw profilesError
    
    const existingIds = existingProfiles?.map(p => p.id) || []
    const missingIds = uniqueParentIds.filter(id => !existingIds.includes(id))
    
    if (missingIds.length === 0) {
      console.log('All parent profiles already exist')
      return { created: 0, skipped: uniqueParentIds.length }
    }
    
    // Create missing profiles
    const { data: createdProfiles, error: createError } = await getSupabaseClient()
      .from('parent_profiles')
      .insert(
        missingIds.map(id => ({
          id,
          username: `parent_${id.slice(0, 8)}`,
          is_admin: false
        }))
      )
      .select()
    
    if (createError) throw createError
    
    console.log(`Created ${createdProfiles.length} missing parent profiles`)
    return { created: createdProfiles.length, skipped: existingIds.length }
    
  } catch (error) {
    console.error('Error creating missing parent profiles:', error)
    throw error
  }
}

// Login Streak Functions

// Update login streak (supports both parent and child streaks)
export async function updateLoginStreak(userId, childId = null) {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    // Get current streak record
    let query = supabase
      .from('login_streaks')
      .select('*')
      .eq('user_id', userId)
    
    // Add child_id filter if provided
    if (childId) {
      query = query.eq('child_id', childId)
    } else {
      query = query.is('child_id', null)
    }
    
    const { data: streakRecord, error: fetchError } = await query.single()
    
    if (fetchError && fetchError.code !== 'PGRST116') { // Not found error
      throw fetchError
    }
    
    if (!streakRecord) {
      // First time login - create streak record
      const insertData = {
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_login_date: today
      }
      
      // Add child_id if provided
      if (childId) {
        insertData.child_id = childId
      }
      
      const { data: newRecord, error: createError } = await getSupabaseClient()
        .from('login_streaks')
        .insert(insertData)
        .select()
        .single()
      
      if (createError) throw createError
      return newRecord
    }
    
    // Check if already logged in today
    if (streakRecord.last_login_date === today) {
      return streakRecord // No update needed
    }
    
    // Calculate yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    let newStreak = streakRecord.current_streak
    let newLongest = streakRecord.longest_streak
    
    if (streakRecord.last_login_date === yesterdayStr) {
      // Consecutive day - increment streak
      newStreak += 1
      newLongest = Math.max(newLongest, newStreak)
    } else {
      // Streak broken - reset to 1
      newStreak = 1
    }
    
    // Update streak record
    let updateQuery = supabase
      .from('login_streaks')
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_login_date: today,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
    
    // Add child_id filter if provided
    if (childId) {
      updateQuery = updateQuery.eq('child_id', childId)
    } else {
      updateQuery = updateQuery.is('child_id', null)
    }
    
    const { data: updatedRecord, error: updateError } = await updateQuery
      .select()
      .single()
    
    if (updateError) throw updateError
    return updatedRecord
    
  } catch (error) {
    console.error('Error updating login streak:', error)
    throw error
  }
}

// Get user's current streak (supports both parent and child streaks)
export async function getLoginStreak(userId, childId = null) {
  try {
    let query = supabase
      .from('login_streaks')
      .select('current_streak, longest_streak, last_login_date')
      .eq('user_id', userId)
    
    // Add child_id filter if provided
    if (childId) {
      query = query.eq('child_id', childId)
    } else {
      query = query.is('child_id', null)
    }
    
    const { data, error } = await query.single()
    
    if (error && error.code !== 'PGRST116') { // Not found error
      throw error
    }
    
    // Return default values if no record exists
    if (!data) {
      return {
        current_streak: 0,
        longest_streak: 0,
        last_login_date: null
      }
    }
    
    return data
  } catch (error) {
    console.error('Error getting login streak:', error)
    throw error
  }
}

// Module Response Functions

// Save a module response
export async function saveModuleResponse({
  childId,
  moduleId,
  parentUserId,
  questionText,
  responseType,
  responseValue = null,
  responseOptions = null,
  selectedOption = null,
  pageNumber = 1,
  questionOrder = 1,
  responseTimeMs = null,
  isCorrect = null
}) {
  try {
    const payload = {
      child_id: childId,
      module_id: moduleId,
      parent_user_id: parentUserId,
      question_text: questionText,
      response_type: responseType,
      response_value: responseValue,
      response_options: responseOptions,
      selected_option: selectedOption,
      page_number: pageNumber,
      question_order: questionOrder,
      response_time_ms: responseTimeMs,
      is_correct: isCorrect
    }

    const { data, error } = await getSupabaseClient()
      .from('module_responses')
      .insert([payload])
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error saving module response:', error)
    throw error
  }
}

// Get all responses for a specific child and module
export async function getModuleResponses(childId, moduleId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('module_responses')
      .select('*')
      .eq('child_id', childId)
      .eq('module_id', moduleId)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error getting module responses:', error)
    throw error
  }
}

// Get all responses for a child across all modules
export async function getChildResponses(childId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('module_responses')
      .select(`
        *,
        modules(id, title, category),
        children(id, name)
      `)
      .eq('child_id', childId)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error getting child responses:', error)
    throw error
  }
}

// Get response analytics for a parent's children
export async function getParentResponseAnalytics(parentUserId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('module_response_analytics')
      .select('*')
      .eq('parent_user_id', parentUserId)
      .order('last_response', { ascending: false })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error getting response analytics:', error)
    throw error
  }
}

// Update an existing response
export async function updateModuleResponse(responseId, updates) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('module_responses')
      .update(updates)
      .eq('id', responseId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error updating module response:', error)
    throw error
  }
}

// Delete a response
export async function deleteModuleResponse(responseId) {
  try {
    const { error } = await getSupabaseClient()
      .from('module_responses')
      .delete()
      .eq('id', responseId)

    if (error) {
      throw error
    }

    return true
  } catch (error) {
    console.error('Error deleting module response:', error)
    throw error
  }
}

// Get response statistics for a module
export async function getModuleStatistics(moduleId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('module_responses')
      .select(`
        response_type,
        response_value,
        is_correct,
        created_at,
        children(id, name)
      `)
      .eq('module_id', moduleId)

    if (error) {
      throw error
    }

    // Process statistics
    const stats = {
      totalResponses: data.length,
      responseTypes: {},
      averageRating: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      responsesByChild: {}
    }

    data.forEach(response => {
      // Count by response type
      stats.responseTypes[response.response_type] = 
        (stats.responseTypes[response.response_type] || 0) + 1

      // Calculate average rating
      if (response.response_type === 'rating' && response.response_value) {
        const rating = parseInt(response.response_value)
        if (!isNaN(rating)) {
          stats.averageRating += rating
        }
      }

      // Count correct/incorrect answers
      if (response.is_correct === true) {
        stats.correctAnswers++
      } else if (response.is_correct === false) {
        stats.incorrectAnswers++
      }

      // Group by child
      const childName = response.children?.name || 'Unknown'
      if (!stats.responsesByChild[childName]) {
        stats.responsesByChild[childName] = 0
      }
      stats.responsesByChild[childName]++
    })

    // Calculate average rating
    const ratingResponses = data.filter(r => r.response_type === 'rating' && r.response_value)
    if (ratingResponses.length > 0) {
      stats.averageRating = stats.averageRating / ratingResponses.length
    }

    return stats
  } catch (error) {
    console.error('Error getting module statistics:', error)
    throw error
  }
}

// Settings Management
export async function getSettings() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('settings')
      .select('*')
      .single()
    
    if (error) {
      // If no settings exist, return defaults
      if (error.code === 'PGRST116') {
        return {
          weekly_checkin_enabled: true,
          challenges: [
            'Morning routine',
            'Bedtime routine',
            'Homework time',
            'Sibling conflict',
            'Screen time limits',
            'Transitions',
            'Mealtime'
          ],
          goals: [
            'Use a calm-down tool once',
            'Name the feeling before reacting',
            'Take 3 deep breaths when upset',
            'Use kind words during conflict',
            'Ask for help when needed'
          ],
          tools: [
            {
              label: 'Volcano Scale (1-5)',
              description: 'Rate the feeling, then choose one action to lower it by one point.',
              triggers: ['Anger', 'Frustration']
            },
            {
              label: 'Thought Bubble',
              description: 'Name what the brain is saying so you can respond to it.',
              triggers: ['Worry/Anxiety', 'Sadness']
            },
            {
              label: 'Fix-It / Accept-It Choices',
              description: 'Decide if this problem can be fixed or if we ride it out.',
              triggers: ['Frustration', 'Overwhelm']
            }
          ],
          scripts: [
            {
              title: 'Volcano scale prompt',
              script: 'If your volcano is a 1 to 5 right now, what number are you? What helps you go down by one?',
              context: 'Scale the feeling and choose a step'
            }
          ]
        }
      }
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Error fetching settings:', error)
    throw error
  }
}

export async function updateSettings(settings) {
  try {
    // Check if settings exist
    const { data: existing } = await getSupabaseClient()
      .from('settings')
      .select('id')
      .single()
    
    if (existing) {
      // Update existing settings
      const { data, error } = await getSupabaseClient()
        .from('settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } else {
      // Create new settings
      const { data, error } = await getSupabaseClient()
        .from('settings')
        .insert([settings])
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  } catch (error) {
    console.error('Error updating settings:', error)
    throw error
  }
}

// Series Management
export async function getSeries() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('series')
      .select('*')
      .order('label', { ascending: true })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching series:', error)
    throw error
  }
}

export async function addSeries(label) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('series')
      .insert([{ label }])
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding series:', error)
    throw error
  }
}

export async function deleteSeries(id) {
  try {
    const { error } = await getSupabaseClient()
      .from('series')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting series:', error)
    throw error
  }
}

// Emotions Management
export async function getEmotions() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('emotions')
      .select('*')
      .order('label', { ascending: true })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching emotions:', error)
    throw error
  }
}

export async function addEmotion(id, label) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('emotions')
      .insert([{ id, label }])
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding emotion:', error)
    throw error
  }
}

export async function deleteEmotion(id) {
  try {
    const { error } = await getSupabaseClient()
      .from('emotions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting emotion:', error)
    throw error
  }
}

// Skills Management
export async function getSkills() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('skills')
      .select('*')
      .order('label', { ascending: true })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching skills:', error)
    throw error
  }
}

export async function addSkill(id, label) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('skills')
      .insert([{ id, label }])
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding skill:', error)
    throw error
  }
}

export async function deleteSkill(id) {
  try {
    const { error } = await getSupabaseClient()
      .from('skills')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting skill:', error)
    throw error
  }
}

// ================================================
// Child Focus Plan Functions
// ================================================

// Get active focus plan for a child
export async function getChildFocusPlan(childId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('child_focus_plan')
      .select('*')
      .eq('child_id', childId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error) {
      // Table might not exist yet - return null instead of throwing
      console.warn('Warning getting child focus plan:', error.message)
      return null
    }
    return data
  } catch (error) {
    console.error('Error getting child focus plan:', error)
    return null
  }
}

// Get all focus plans for a child (including inactive)
export async function getChildFocusPlanHistory(childId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('child_focus_plan')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting child focus plan history:', error)
    throw error
  }
}

// Create a new focus plan for a child
export async function createChildFocusPlan({
  childId,
  targetCategoryIds,
  defaultPathwayId = null,
  goalKeys = null,
  goalText = null,
  frequency = null,
  intensity = null,
  comments = null,
  superSkillId = null
}) {
  try {
    // First, deactivate any existing active plans for this child
    try {
      await getSupabaseClient()
        .from('child_focus_plan')
        .update({ is_active: false })
        .eq('child_id', childId)
        .eq('is_active', true)
    } catch (deactivateError) {
      // Log but don't fail if deactivation fails
      console.warn('Warning deactivating old plans:', deactivateError)
    }
    
    // Build the insert object with only non-null fields
    const insertData = {
      child_id: childId,
      is_active: true,
      target_category_ids: targetCategoryIds || []
    }
    
    if (superSkillId) insertData.super_skill_id = superSkillId
    
    // Set the primary category (first selected)
    if (targetCategoryIds && targetCategoryIds.length > 0) {
      insertData.category = targetCategoryIds[0]
      
      // Look up the pathway for this category
      try {
        const { data: categoryData } = await getSupabaseClient()
          .from('category_colors')
          .select('category')
          .eq('id', targetCategoryIds[0])
          .single()
        
        if (categoryData && categoryData.category) {
          // Find the pathway that matches this category
          const { data: pathwayData } = await getSupabaseClient()
            .from('pathways')
            .select('id')
            .eq('category', categoryData.category)
            .single()
          
          if (pathwayData) {
            insertData.default_pathway_id = pathwayData.id
          }
        }
      } catch (pathwayError) {
        console.warn('Warning looking up pathway:', pathwayError)
        // Continue without pathway if lookup fails
      }
    }
    
    // Store selected categories in comments as well
    let categoryInfo = ''
    if (targetCategoryIds && targetCategoryIds.length > 0) {
      categoryInfo = `Focus areas: ${targetCategoryIds.join(', ')}`
    }
    
    // Add optional fields only if they have values
    if (goalKeys) insertData.goal_key = Array.isArray(goalKeys) ? goalKeys.join(',') : goalKeys
    if (goalText) insertData.goal_text = goalText
    if (frequency) insertData.frequency = frequency
    if (intensity) insertData.intensity = intensity
    
    // Combine category info with comments
    if (categoryInfo && comments) {
      insertData.comments = `${categoryInfo} | ${comments}`
    } else if (categoryInfo) {
      insertData.comments = categoryInfo
    } else if (comments) {
      insertData.comments = comments
    }
    
    // Create the new plan
    const { data, error } = await getSupabaseClient()
      .from('child_focus_plan')
      .insert([insertData])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating child focus plan - Details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        insertData: insertData
      })
      throw error
    }
    return data
  } catch (error) {
    console.error('Error creating child focus plan:', error)
    throw error
  }
}

// Update an existing focus plan
export async function updateChildFocusPlan(planId, updates) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('child_focus_plan')
      .update(updates)
      .eq('id', planId)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating child focus plan:', error)
    throw error
  }
}

// Deactivate a focus plan (for starting a new cycle)
export async function deactivateChildFocusPlan(planId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('child_focus_plan')
      .update({ is_active: false })
      .eq('id', planId)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error deactivating child focus plan:', error)
    throw error
  }
}

// Get all categories from the category_colors table
export async function getCategories() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('category_colors')
      .select('id, category')
      .order('category', { ascending: true })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching categories:', error)
    // Return empty array instead of throwing - let fallback categories work
    return []
  }
}

// Get all pathways
export async function getPathways() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('pathways')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching pathways:', error)
    throw error
  }
}

// Determine default pathway based on selected categories
export function determineDefaultPathway(selectedCategoryNames, pathways) {
  // Priority order for pathway mapping
  const pathwayMapping = {
    'anger': 'Anger Journey',
    'anxiety': 'Bravery Journey',
    'sadness': 'Heavy Heart Journey',
    'depression': 'Heavy Heart Journey'
  }
  
  // Check selected categories in priority order
  const lowerCaseNames = selectedCategoryNames.map(n => n.toLowerCase())
  
  for (const [category, pathwayName] of Object.entries(pathwayMapping)) {
    if (lowerCaseNames.some(name => name.includes(category))) {
      const pathway = pathways.find(p => p.name === pathwayName)
      if (pathway) return pathway
    }
  }
  
  // Default to "Foundations" or first available pathway
  const foundationsPathway = pathways.find(p => 
    p.name.toLowerCase().includes('foundation') || 
    p.name.toLowerCase().includes('general')
  )
  
  // If foundations pathway exists, return it
  if (foundationsPathway) return foundationsPathway
  
  // Otherwise, return the first pathway that has modules
  // We'll check this asynchronously in the calling function
  return pathways[0] || null
}

// Determine default pathway with module availability check
export async function determineDefaultPathwayWithModules(selectedCategoryNames, pathways, childId) {
  try {
    console.log('Focus Plan: Determining pathway with module check...')
    
    // First get the default pathway using the original logic
    const defaultPathway = determineDefaultPathway(selectedCategoryNames, pathways)
    
    console.log('Focus Plan: Default pathway determined:', defaultPathway?.name)
    
    // If no pathway found, return null
    if (!defaultPathway) {
      console.log('Focus Plan: No default pathway found')
      return null
    }
    
    // Check if this pathway has modules available for the child
    const hasModules = await checkPathwayHasModules(defaultPathway, childId)
    
    if (hasModules) {
      console.log(`Focus Plan: Using default pathway "${defaultPathway.name}" - has modules`)
      return defaultPathway
    }
    
    // If the default pathway doesn't have modules, find one that does
    for (const pathway of pathways) {
      if (pathway.id !== defaultPathway.id) {
        const pathwayHasModules = await checkPathwayHasModules(pathway, childId)
        if (pathwayHasModules) {
          console.log(`Focus Plan: Default pathway "${defaultPathway.name}" has no modules, switching to "${pathway.name}"`)
          return pathway
        }
      }
    }
    
    // If no pathway has modules, check super skills as fallback
    console.log(`Focus Plan: No pathways have modules, checking super skills...`)
    const superSkillWithModules = await findSuperSkillWithModules()
    
    if (superSkillWithModules) {
      // Create a pseudo-pathway object for the super skill
      const pseudoPathway = {
        id: `super-skill-${superSkillWithModules.id}`,
        name: superSkillWithModules.name,
        super_skill_id: superSkillWithModules.id
      }
      console.log(`Focus Plan: Using super skill "${superSkillWithModules.name}" as fallback`)
      return pseudoPathway
    }
    
    // If no pathway or super skill has modules, return null to force onboarding to handle it
    console.warn(`Focus Plan: No pathways or super skills have available modules`)
    return null
  } catch (error) {
    console.error('Focus Plan: Error in determineDefaultPathwayWithModules:', error)
    // Fallback to original logic
    return determineDefaultPathway(selectedCategoryNames, pathways)
  }
}

// Find a super skill that has modules
async function findSuperSkillWithModules() {
  try {
    // Get all active modules and super skills
    const [modulesResult, superSkillsResult] = await Promise.all([
      supabase
        .from('modules')
        .select('*')
        .eq('is_active', true),
      supabase
        .from('super_skills')
        .select('*')
        .order('name', { ascending: true })
    ])
    
    const { data: modules, error: modulesError } = modulesResult
    const { data: superSkills, error: superSkillsError } = superSkillsResult
    
    if (modulesError || !modules || superSkillsError || !superSkills) return null
    
    // Check each super skill for modules
    for (const superSkill of superSkills) {
      const modulesWithSuperSkill = modules.filter(m => m.super_skill_id === superSkill.id)
      
      if (modulesWithSuperSkill.length > 0) {
        console.log(`Found super skill "${superSkill.name}" with ${modulesWithSuperSkill.length} modules`)
        return superSkill
      }
    }
    
    return null
  } catch (error) {
    console.error('Error finding super skill with modules:', error)
    return null
  }
}

// Check if a pathway has modules available for a child
async function checkPathwayHasModules(pathway, childId) {
  try {
    // Get all active modules and super skills
    const [modulesResult, superSkillsResult] = await Promise.all([
      supabase
        .from('modules')
        .select('*')
        .eq('is_active', true),
      supabase
        .from('super_skills')
        .select('*')
    ])
    
    const { data: modules, error: modulesError } = modulesResult
    const { data: superSkills, error: superSkillsError } = superSkillsResult
    
    if (modulesError || !modules) return false
    
    // Filter modules based on pathway's super skill
    let pathwayModules = []
    
    // Check if pathway has a super_skill_id (new system)
    if (pathway.super_skill_id) {
      // Get the super skill to find its slug
      const pathwaySuperSkill = superSkills?.find(s => s.id === pathway.super_skill_id)
      if (pathwaySuperSkill) {
        // Find modules with this super skill
        pathwayModules = modules.filter(m => m.super_skill_id === pathway.super_skill_id)
      }
    } 
    // Fall back to pathway name to super skill mapping
    else {
      // Map pathway names to super skill slugs
      const pathwayToSuperSkill = {
        'anger journey': 'anger-manager',
        'bravery journey': 'bravery-builder',
        'heavy heart journey': 'heavy-heart',
        'connection journey': 'connection-captain',
        'calm journey': 'calm-controller',
        'foundations': 'all',
        "daniel's big feelings": 'all' // Special case for Daniel's pathway
      }
      
      const superSkillSlug = pathwayToSuperSkill[pathway.name?.toLowerCase()] || 'all'
      
      // Filter modules by super skill
      pathwayModules = modules.filter(m => {
        // First check if module has super_skill_id
        if (m.super_skill_id && superSkills) {
          const moduleSuperSkill = superSkills.find(s => s.id === m.super_skill_id)
          if (moduleSuperSkill) {
            return moduleSuperSkill.slug === superSkillSlug
          }
        }
        
        // Fall back to checking category mapping
        const category = ((m.category && m.category.name) || (m.category && typeof m.category === 'string' ? m.category : '') || m.category_name || '').toLowerCase()
        
        // Map categories to super skills
        const categoryToSuperSkill = {
          'anger': 'anger-manager',
          'anxiety': 'bravery-builder',
          'sadness': 'heavy-heart',
          'social': 'connection-captain',
          'calm': 'calm-controller',
          'general': 'all'
        }
        
        const moduleSuperSkill = categoryToSuperSkill[category] || 'all'
        return moduleSuperSkill === superSkillSlug
      })
    }
    
    console.log(`Checking pathway "${pathway.name}": Found ${pathwayModules.length} modules`)
    return pathwayModules.length > 0
  } catch (error) {
    console.error('Error checking pathway modules:', error)
    return false
  }
}

// Check if assessment is needed after module completion
async function checkForAssessmentAfterCompletion(childId, moduleId) {
  try {
    // Get module information to determine pathway/category
    const { data: moduleData, error: moduleError } = await getSupabaseClient()
      .from('modules')
      .select('category, code')
      .eq('id', moduleId)
      .single()
    
    if (moduleError) {
      console.error('Error getting module data for assessment check:', moduleError)
      return
    }
    
    // Get all child modules to count completed modules in this pathway
    const { data: childModules, error: childModulesError } = await getSupabaseClient()
      .from('child_modules')
      .select(`
        *,
        modules (category)
      `)
      .eq('child_id', childId)
      .eq('is_completed', true)
    
    if (childModulesError) {
      console.error('Error getting child modules for assessment check:', childModulesError)
      return
    }
    
    // Count completed modules in the same pathway
    const pathwayCategory = moduleData?.category || 'general'
    const completedModulesInPathway = childModules?.filter(cm => 
      cm.modules?.category === pathwayCategory
    ).length || 0
    
    // Get total modules in this pathway
    const { data: totalModulesData, error: totalModulesError } = await getSupabaseClient()
      .from('modules')
      .select('id')
      .eq('category', pathwayCategory)
      .eq('is_active', true)
    
    if (totalModulesError) {
      console.error('Error getting total modules for assessment check:', totalModulesError)
      return
    }
    
    const totalModulesInPathway = totalModulesData?.length || 0
    
    // Check if assessment is needed using progress tracking system
    if (window.progressTrackingSystem) {
      await window.progressTrackingSystem.init(supabase)
      
      const assessmentNeeded = await window.progressTrackingSystem.checkAssessmentNeeded(
        childId, 
        pathwayCategory, 
        completedModulesInPathway, 
        totalModulesInPathway
      )
      
      if (assessmentNeeded) {
        // Show assessment modal - user will be redirected after completing it
        window.progressTrackingSystem.showAssessment(
          childId, 
          pathwayCategory, 
          assessmentNeeded,
          function(results) {
            console.log('Assessment completed after module:', results)
            // User can continue - no automatic redirect needed since they're already on dashboard
          },
          function() {
            console.log('Assessment skipped after module')
            // User can continue
          }
        )
      }
    }
  } catch (error) {
    console.error('Error in checkForAssessmentAfterCompletion:', error)
  }
}
