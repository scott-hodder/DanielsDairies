import { getSupabaseClient } from './supabaseClient'

export async function checkAuth() {
  const supabase = getSupabaseClient()
  const {
    data: { session }
  } = await supabase.auth.getSession()

  return session
}

export async function getCurrentUser() {
  const supabase = getSupabaseClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  return user
}

export async function signIn(email, password) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email, password, metadata = {}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })

  if (error) throw error
  return data
}

export async function resetPassword(email) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`
  })

  if (error) throw error
}

export async function updatePassword(newPassword) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function onAuthStateChange(callback) {
  const supabase = getSupabaseClient()
  return supabase.auth.onAuthStateChange(callback)
}
