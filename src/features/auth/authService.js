import { getSupabaseClient } from '../../supabaseClient.js'

// Check if user is logged in.
//
// A transient null from getSession() must NOT bounce the user to the login
// page: when a second tab opens (or a suspended tab wakes up) the access
// token may be mid-refresh, and supabase-js coordinates that refresh across
// tabs with a browser lock — during that window getSession can briefly
// report no session even though the user is still signed in. Give the
// refresh a short grace period before treating the user as signed out.
export async function checkAuth() {
  const supabase = getSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  return await new Promise((resolve) => {
    let settled = false
    let subscription = null
    const finish = (result) => {
      if (settled) return
      settled = true
      try { subscription?.unsubscribe() } catch { /* already gone */ }
      resolve(result)
    }

    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (newSession) finish(newSession)
      else if (event === 'SIGNED_OUT') finish(null)
    })
    subscription = data?.subscription

    setTimeout(async () => {
      try {
        const { data: retry } = await supabase.auth.getSession()
        finish(retry.session)
      } catch {
        finish(null)
      }
    }, 1500)
  })
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
    redirectTo: `${window.location.origin}/login.html`
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
