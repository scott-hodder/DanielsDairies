import { supabase } from './supabaseClient.js'
import bcrypt from 'bcryptjs'

// Get all children for a parent
export async function getChildren(parentUserId) {
  const { data, error } = await supabase
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
  generatedPlan = null
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

  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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

// Set child's password (hashes before storing)
export async function setChildPassword(childId, password) {
  // Hash the password with bcrypt (salt rounds: 10)
  const hashedPassword = await bcrypt.hash(password, 10)
  
  const { data, error } = await supabase
    .from('children')
    .update({ password: hashedPassword })
    .eq('id', childId)
    .select()
    .single()
  
  if (error) {
    throw error
  }
  
  return data
}

// Verify child's password (compares with hashed version)
export async function verifyChildPassword(childId, password) {
  const { data, error } = await supabase
    .from('children')
    .select('password')
    .eq('id', childId)
    .single()
  
  if (error) {
    throw error
  }
  
  // If no password is set, return false
  if (!data.password) {
    return false
  }
  
  // Compare plain text password with hashed password
  return await bcrypt.compare(password, data.password)
}

// Update child's stars
export async function updateChildStars(childId, stars) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { error: modulesError } = await supabase
    .from('child_modules')
    .delete()
    .eq('child_id', childId)
  
  if (modulesError) {
    console.warn('Error deleting child modules:', modulesError)
    // Continue anyway as the child table might have cascade delete
  }
  
  // Delete the child
  const { error } = await supabase
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
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    throw error
  }
  
  return data
}

// Get modules a parent has access to
export async function getParentModules(parentUserId) {
  const { data, error } = await supabase
    .from('parent_modules')
    .select('module_id')
    .eq('parent_id', parentUserId)
    .eq('is_active', true)

  if (error) {
    throw error
  }

  return data || []
}

// Retrieve module category color configuration
export async function getCategoryColors() {
  const { data, error } = await supabase
    .from('category_colors')
    .select('*')

  if (error) {
    throw error
  }

  return data || []
}

// Get child's module progress
export async function getChildModules(childId) {
  const { data, error } = await supabase
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
  const { data: existing } = await supabase
    .from('child_modules')
    .select('*')
    .eq('child_id', childId)
    .eq('module_id', moduleId)
    .single()
  
  if (existing) {
    // Update existing record
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
  const { data: existing } = await supabase
    .from('child_modules')
    .select('*')
    .eq('child_id', childId)
    .eq('module_id', moduleId)
    .single()
  
  if (existing) {
    // Update existing record
    const { data, error } = await supabase
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
    
    return data
  } else {
    // Create new record with completed status
    const { data, error } = await supabase
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
    
    return data
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .rpc('is_user_admin_check', { user_id: userId })
  
  if (error) {
    console.error('Error checking admin status:', error)
    return false
  }
  
  return data || false
}

// Set user admin status
export async function setUserAdmin(userId, isAdmin) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
    const { data: children, error: childrenError } = await supabase
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
    const { data: existingProfiles, error: profilesError } = await supabase
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
    const { data: createdProfiles, error: createError } = await supabase
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

// Update user's login streak
export async function updateLoginStreak(userId) {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    // Get current streak record
    const { data: streakRecord, error: fetchError } = await supabase
      .from('login_streaks')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') { // Not found error
      throw fetchError
    }
    
    if (!streakRecord) {
      // First time login - create streak record
      const { data: newRecord, error: createError } = await supabase
        .from('login_streaks')
        .insert({
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_login_date: today
        })
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
    const { data: updatedRecord, error: updateError } = await supabase
      .from('login_streaks')
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_login_date: today,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()
    
    if (updateError) throw updateError
    return updatedRecord
    
  } catch (error) {
    console.error('Error updating login streak:', error)
    throw error
  }
}

// Get user's current streak
export async function getLoginStreak(userId) {
  try {
    const { data, error } = await supabase
      .from('login_streaks')
      .select('current_streak, longest_streak, last_login_date')
      .eq('user_id', userId)
      .single()
    
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

    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .single()
    
    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from('settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } else {
      // Create new settings
      const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
