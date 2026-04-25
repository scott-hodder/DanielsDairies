import { supabase } from '../../supabaseClient.js'

// ============================================================
// Schools Data Service
// ============================================================

/**
 * Fetch all active schools (for login dropdown)
 */
export async function getActiveSchools() {
  const { data, error } = await supabase
    .from('schools')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Validate school access key via server-side function
 */
export async function validateSchoolAccess(schoolId, accessKey) {
  const { data, error } = await supabase
    .rpc('validate_school_access', {
      p_school_id: schoolId,
      p_access_key: accessKey
    })

  if (error) throw error
  return data === true
}

/**
 * Look up existing school_users record for current auth user + school
 */
export async function getSchoolUser(authUserId, schoolId) {
  const { data, error } = await supabase
    .from('school_users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Get school user record for any authenticated user (used after login)
 */
export async function getCurrentSchoolUser(authUserId) {
  const { data, error } = await supabase
    .from('school_users')
    .select('*, schools(name)')
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Create a school user account via edge function
 */
export async function createSchoolAccount({ email, password, displayName, schoolId, role }) {
  const { data, error } = await supabase.functions.invoke('schools-auth', {
    body: {
      action: 'signup',
      email,
      password,
      displayName,
      schoolId,
      role
    }
  })

  if (error) {
    // Extract the actual error message from the edge function response
    let msg = error.message
    try {
      const body = error.context?.json ? await error.context.json() : data
      if (body?.error) msg = body.error
    } catch (_) { /* use default message */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

/**
 * Get the active workbook for a given audience type
 */
export async function getActiveWorkbook(audience) {
  const { data, error } = await supabase
    .from('school_workbooks')
    .select('id, title, html_content, audience')
    .eq('audience', audience)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data
}

// ============================================================
// Admin-only operations
// ============================================================

/**
 * Get all schools (admin)
 */
export async function getAllSchools() {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Create a new school (admin)
 */
export async function createSchool(name, accessKey) {
  const { data, error } = await supabase
    .from('schools')
    .insert({ name, access_key: accessKey })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update school (admin)
 */
export async function updateSchool(id, updates) {
  const { data, error } = await supabase
    .from('schools')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete school (admin)
 */
export async function deleteSchool(id) {
  const { error } = await supabase
    .from('schools')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Get all workbooks (admin)
 */
export async function getAllWorkbooks() {
  const { data, error } = await supabase
    .from('school_workbooks')
    .select('*')
    .order('audience')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Create a workbook (admin)
 */
export async function createWorkbook(title, audience, htmlContent) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('school_workbooks')
    .insert({
      title,
      audience,
      html_content: htmlContent,
      created_by: user?.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a workbook (admin)
 */
export async function updateWorkbook(id, updates) {
  const { data, error } = await supabase
    .from('school_workbooks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a workbook (admin)
 */
export async function deleteWorkbook(id) {
  const { error } = await supabase
    .from('school_workbooks')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Set a workbook as the active one for its audience (admin)
 */
export async function activateWorkbook(workbookId, audience) {
  const { error } = await supabase
    .rpc('set_active_workbook', {
      p_workbook_id: workbookId,
      p_audience: audience
    })

  if (error) throw error
}

/**
 * Get all school users (admin)
 */
export async function getAllSchoolUsers() {
  const { data, error } = await supabase
    .from('school_users')
    .select('*, schools(name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get school audit log (admin)
 */
export async function getSchoolAuditLog(limit = 50) {
  const { data, error } = await supabase
    .from('school_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}
