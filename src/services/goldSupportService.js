// ================================================
// GOLD SUPPORT SERVICE
// Database persistence for the Family Gold hub (Daniel time, appointments,
// practitioner/parent tasks). Replaces the old per-device localStorage
// prototype so Gold data follows the family across devices.
// ================================================

import { getSupabaseClient } from '../supabaseClient.js'

function sb() { return getSupabaseClient() }

// ── Settings (Daniel time + delivery model) ──

export async function getGoldSettings(childId) {
  const { data, error } = await sb()
    .from('gold_support_settings')
    .select('child_id, daniel_days, daniel_time, delivery_model')
    .eq('child_id', childId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveGoldDanielTime(childId, parentId, days, time) {
  const { error } = await sb()
    .from('gold_support_settings')
    .upsert(
      { child_id: childId, parent_id: parentId, daniel_days: days, daniel_time: time },
      { onConflict: 'child_id' }
    )
  if (error) throw error
}

// ── Appointments ──

export async function getNextGoldAppointment(childId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await sb()
    .from('gold_appointments')
    .select('id, appt_date, appt_time, appt_type, status, notes, created_by')
    .eq('child_id', childId)
    .eq('status', 'scheduled')
    .gte('appt_date', today)
    .order('appt_date', { ascending: true })
    .order('appt_time', { ascending: true })
    .limit(1)
  if (error) throw error
  return data?.[0] || null
}

export async function saveGoldAppointment(childId, parentId, { date, time, type }) {
  const { error } = await sb()
    .from('gold_appointments')
    .insert({ child_id: childId, parent_id: parentId, appt_date: date, appt_time: time, appt_type: type })
  if (error) throw error
}

export async function cancelGoldAppointment(appointmentId) {
  const { error } = await sb()
    .from('gold_appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
  if (error) throw error
}

// ── Tasks ──

export async function getGoldTasks(childId) {
  const { data, error } = await sb()
    .from('gold_tasks')
    .select('id, text, done, source, created_at')
    .eq('child_id', childId)
    .order('done', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addGoldTask(childId, parentId, text, source = 'parent') {
  const { error } = await sb()
    .from('gold_tasks')
    .insert({ child_id: childId, parent_id: parentId, text, source })
  if (error) throw error
}

export async function setGoldTaskDone(taskId, done) {
  const { error } = await sb()
    .from('gold_tasks')
    .update({ done })
    .eq('id', taskId)
  if (error) throw error
}

// ── One-time migration from the old localStorage prototype ──
// If the DB has no data for this child but the device does, push the device
// data up so nothing a Gold family entered is lost, then clear the old keys.

export async function migrateGoldLocalStorage(childId, parentId) {
  let migrated = false
  try {
    const timeRaw = localStorage.getItem(`fg_time_${childId}`)
    const apptRaw = localStorage.getItem(`fg_appt_${childId}`)
    const tasksRaw = localStorage.getItem(`fg_tasks_${childId}`)
    if (!timeRaw && !apptRaw && !tasksRaw) return false

    if (timeRaw) {
      const existing = await getGoldSettings(childId)
      if (!existing) {
        const time = JSON.parse(timeRaw)
        if (time && Array.isArray(time.days)) {
          await saveGoldDanielTime(childId, parentId, time.days, time.time || '16:00')
          migrated = true
        }
      }
      localStorage.removeItem(`fg_time_${childId}`)
    }

    if (apptRaw) {
      const existing = await getNextGoldAppointment(childId)
      if (!existing) {
        const appt = JSON.parse(apptRaw)
        if (appt && appt.date) {
          await saveGoldAppointment(childId, parentId, {
            date: appt.date,
            time: appt.time || '15:30',
            type: appt.type || 'Parent review (online)'
          })
          migrated = true
        }
      }
      localStorage.removeItem(`fg_appt_${childId}`)
    }

    if (tasksRaw) {
      const existing = await getGoldTasks(childId)
      if (existing.length === 0) {
        const tasks = JSON.parse(tasksRaw)
        if (Array.isArray(tasks)) {
          for (const task of tasks) {
            if (task?.text) {
              await addGoldTask(childId, parentId, task.text, 'practitioner')
              if (task.done) {
                const rows = await getGoldTasks(childId)
                const created = rows.find(r => r.text === task.text && !r.done)
                if (created) await setGoldTaskDone(created.id, true)
              }
              migrated = true
            }
          }
        }
      }
      localStorage.removeItem(`fg_tasks_${childId}`)
    }
  } catch (err) {
    console.warn('[goldSupport] localStorage migration issue (non-fatal):', err)
  }
  return migrated
}
