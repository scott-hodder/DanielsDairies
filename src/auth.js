import { supabase } from './supabaseClient.js'

// Check if user is logged in
export async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Sign in with email and password
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    throw error
  }
  
  return data
}

// Sign up new user
export async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })
  
  if (error) {
    throw error
  }
  
  return data
}

// Trigger password reset email
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/index.html`
  })

  if (error) {
    throw error
  }
}

// Update password once user has recovery session
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    throw error
  }

  return data
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw error
  }
}

// Get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Listen to auth state changes
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}
