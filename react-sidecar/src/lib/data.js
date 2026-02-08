import { supabase } from './supabaseClient'

export async function getChildren(parentUserId) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('parent_user_id', parentUserId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createChild(parentUserId, name, dateOfBirth) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getModuleById(moduleId) {
  const { data, error } = await supabase.from('modules').select('*').eq('id', moduleId).single()
  if (error) throw error
  return data
}

export async function createModule(modulePayload) {
  const { data, error } = await supabase.from('modules').insert([modulePayload]).select().single()
  if (error) throw error
  return data
}

export async function updateModule(moduleId, updates) {
  const { data, error } = await supabase
    .from('modules')
    .update(updates)
    .eq('id', moduleId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteModule(moduleId) {
  const { error } = await supabase.from('modules').delete().eq('id', moduleId)
  if (error) throw error
  return true
}

export async function getSuperSkills() {
  const { data, error } = await supabase
    .from('super_skills')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getParentModules(parentUserId) {
  const { data, error } = await supabase
    .from('parent_modules')
    .select('module_id')
    .eq('parent_id', parentUserId)
    .eq('is_active', true)

  if (error) throw error
  return data || []
}

export async function getChildModules(childId) {
  const { data, error } = await supabase
    .from('child_modules')
    .select('*, modules(*)')
    .eq('child_id', childId)

  if (error) throw error
  return data || []
}

export async function updateChildModuleStatus(childId, moduleId, status) {
  const { data: existing, error: existingError } = await supabase
    .from('child_modules')
    .select('*')
    .eq('child_id', childId)
    .eq('module_id', moduleId)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    const { data, error } = await supabase
      .from('child_modules')
      .update({ status })
      .eq('child_id', childId)
      .eq('module_id', moduleId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
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
  let query = supabase
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
