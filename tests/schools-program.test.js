/**
 * Schools Program - Integration Test Scenarios
 *
 * These tests document the expected behavior for the Schools Program feature.
 * Run manually against a Supabase instance with the migration applied.
 *
 * Usage: import and call runSchoolsTests() from browser console or test runner.
 */

import { getSupabaseClient } from '../src/supabaseClient.js'

const supabase = getSupabaseClient()

const results = []

function assert(condition, description) {
  results.push({ pass: condition, description })
  console.log(condition ? '  PASS' : '  FAIL', description)
}

async function cleanup(schoolName) {
  // Remove test data (admin/service role only)
  await supabase.from('schools').delete().eq('name', schoolName)
}

// ============================================================
// Test 1: Schools Login Path
// ============================================================
async function testSchoolsLoginPath() {
  console.log('\n--- Test: Schools Login Path ---')

  const testSchoolName = '__test_school_' + Date.now()
  const testAccessKey = 'test-key-' + Date.now()

  // 1. Create a test school
  const { data: school, error: createErr } = await supabase
    .from('schools')
    .insert({ name: testSchoolName, access_key: testAccessKey, is_active: true })
    .select()
    .single()

  assert(!createErr && school, 'Can create a school')
  assert(school?.is_active === true, 'School is active by default')

  // 2. Validate access key (correct)
  const { data: validResult } = await supabase.rpc('validate_school_access', {
    p_school_id: school.id,
    p_access_key: testAccessKey
  })
  assert(validResult === true, 'Correct access key validates successfully')

  // 3. Validate access key (incorrect)
  const { data: invalidResult } = await supabase.rpc('validate_school_access', {
    p_school_id: school.id,
    p_access_key: 'wrong-key'
  })
  assert(invalidResult === false, 'Incorrect access key is rejected')

  // 4. Inactive school should fail validation
  await supabase.from('schools').update({ is_active: false }).eq('id', school.id)
  const { data: inactiveResult } = await supabase.rpc('validate_school_access', {
    p_school_id: school.id,
    p_access_key: testAccessKey
  })
  assert(inactiveResult === false, 'Inactive school fails validation')

  // Cleanup
  await cleanup(testSchoolName)
}

// ============================================================
// Test 2: Role-based Workbook Routing
// ============================================================
async function testRoleBasedRouting() {
  console.log('\n--- Test: Role-based Workbook Routing ---')

  // 1. Create test workbooks
  const { data: childWb, error: cwErr } = await supabase
    .from('school_workbooks')
    .insert({
      title: '__test_child_wb',
      audience: 'child',
      html_content: '<h1>Child Workbook</h1>',
      is_active: false
    })
    .select()
    .single()

  assert(!cwErr && childWb, 'Can create child workbook')

  const { data: practWb, error: pwErr } = await supabase
    .from('school_workbooks')
    .insert({
      title: '__test_pract_wb',
      audience: 'practitioner',
      html_content: '<h1>Practitioner Workbook</h1>',
      is_active: false
    })
    .select()
    .single()

  assert(!pwErr && practWb, 'Can create practitioner workbook')

  // 2. Activate child workbook
  await supabase.rpc('set_active_workbook', {
    p_workbook_id: childWb.id,
    p_audience: 'child'
  })

  const { data: activeChild } = await supabase
    .from('school_workbooks')
    .select('is_active')
    .eq('id', childWb.id)
    .single()

  assert(activeChild?.is_active === true, 'Child workbook activated successfully')

  // 3. Activate practitioner workbook
  await supabase.rpc('set_active_workbook', {
    p_workbook_id: practWb.id,
    p_audience: 'practitioner'
  })

  const { data: activePract } = await supabase
    .from('school_workbooks')
    .select('is_active')
    .eq('id', practWb.id)
    .single()

  assert(activePract?.is_active === true, 'Practitioner workbook activated successfully')

  // 4. Only one active per audience
  const { data: childWb2 } = await supabase
    .from('school_workbooks')
    .insert({
      title: '__test_child_wb_2',
      audience: 'child',
      html_content: '<h1>Child Workbook 2</h1>',
      is_active: false
    })
    .select()
    .single()

  await supabase.rpc('set_active_workbook', {
    p_workbook_id: childWb2.id,
    p_audience: 'child'
  })

  const { data: previousChild } = await supabase
    .from('school_workbooks')
    .select('is_active')
    .eq('id', childWb.id)
    .single()

  assert(previousChild?.is_active === false, 'Previous child workbook deactivated when new one activated')

  // Cleanup
  await supabase.from('school_workbooks').delete().like('title', '__test_%')
}

// ============================================================
// Test 3: Admin Workbook Management
// ============================================================
async function testAdminWorkbookManagement() {
  console.log('\n--- Test: Admin Workbook Management ---')

  // 1. Create workbook
  const { data: wb, error: createErr } = await supabase
    .from('school_workbooks')
    .insert({
      title: '__test_admin_wb',
      audience: 'child',
      html_content: '<p>Test content</p>',
      is_active: false
    })
    .select()
    .single()

  assert(!createErr && wb, 'Admin can create workbook')

  // 2. Update workbook
  const { data: updated, error: updateErr } = await supabase
    .from('school_workbooks')
    .update({ title: '__test_admin_wb_updated', html_content: '<p>Updated</p>' })
    .eq('id', wb.id)
    .select()
    .single()

  assert(!updateErr && updated?.title === '__test_admin_wb_updated', 'Admin can update workbook')

  // 3. Delete workbook
  const { error: deleteErr } = await supabase
    .from('school_workbooks')
    .delete()
    .eq('id', wb.id)

  assert(!deleteErr, 'Admin can delete workbook')

  const { data: deleted } = await supabase
    .from('school_workbooks')
    .select('id')
    .eq('id', wb.id)
    .maybeSingle()

  assert(!deleted, 'Deleted workbook no longer exists')
}

// ============================================================
// Test 4: Audit Logging
// ============================================================
async function testAuditLogging() {
  console.log('\n--- Test: Audit Logging ---')

  const testSchoolName = '__test_audit_school_' + Date.now()

  // Create school and validate access (which logs an event)
  const { data: school } = await supabase
    .from('schools')
    .insert({ name: testSchoolName, access_key: 'audit-key', is_active: true })
    .select()
    .single()

  await supabase.rpc('validate_school_access', {
    p_school_id: school.id,
    p_access_key: 'audit-key'
  })

  // Check audit log
  const { data: logs } = await supabase
    .from('school_audit_log')
    .select('*')
    .eq('school_id', school.id)
    .eq('event_type', 'school_access_validation')

  assert(logs && logs.length > 0, 'Access validation creates audit log entry')
  assert(logs[0]?.metadata?.valid === true, 'Audit log captures validation result')

  // Cleanup
  await cleanup(testSchoolName)
}

// ============================================================
// Run All Tests
// ============================================================
export async function runSchoolsTests() {
  console.log('=== Schools Program Tests ===')

  await testSchoolsLoginPath()
  await testRoleBasedRouting()
  await testAdminWorkbookManagement()
  await testAuditLogging()

  const passed = results.filter(r => r.pass).length
  const failed = results.filter(r => !r.pass).length

  console.log(`\n=== Results: ${passed} passed, ${failed} failed out of ${results.length} ===`)

  if (failed > 0) {
    console.log('\nFailed tests:')
    results.filter(r => !r.pass).forEach(r => console.log('  -', r.description))
  }

  return { passed, failed, total: results.length, results }
}
