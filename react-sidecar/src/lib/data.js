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

export async function getChildModules(childId) {
  const { data, error } = await supabase
    .from('child_modules')
    .select('*, modules(*)')
    .eq('child_id', childId)

  if (error) throw error
  return data || []
}
