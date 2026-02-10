import { getSupabaseClient } from '../../supabaseClient.js'

// Check if user is logged in
export async function checkAuth() {
  const { data: { session } } = await getSupabaseClient().auth.getSession()
  return session
}

// Sign in with email and password
export async function signIn(email, password) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
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
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })
  
  if (error) {
    throw error
  }
  
  // Create parent profile after successful signup
  if (data.user) {
    try {
      const { error: profileError } = await getSupabaseClient().rpc('create_parent_profile', {
        user_id: data.user.id,
        user_email: email
      })
      
      if (profileError) {
        console.error('Error creating parent profile:', profileError)
        // Don't throw - profile creation failure shouldn't block signup
      }
    } catch (err) {
      console.error('Error calling create_parent_profile:', err)
      // Don't throw - profile creation failure shouldn't block signup
    }
  }
  
  return data
}

// Trigger password reset email
export async function resetPassword(email) {
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/index.html`
  })

  if (error) {
    throw error
  }
}

// Update password once user has recovery session
export async function updatePassword(newPassword) {
  const { data, error } = await getSupabaseClient().auth.updateUser({ password: newPassword })

  if (error) {
    throw error
  }

  return data
}

// Sign out
export async function signOut() {
  const { error } = await getSupabaseClient().auth.signOut()
  
  if (error) {
    throw error
  }
}

// Get current user
export async function getCurrentUser() {
  const { data: { user } } = await getSupabaseClient().auth.getUser()
  return user
}

// Listen to auth state changes
export function onAuthStateChange(callback) {
  return getSupabaseClient().auth.onAuthStateChange(callback)
}
