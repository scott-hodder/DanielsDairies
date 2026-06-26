import { supabase } from '../../supabaseClient.js'
import { escapeHtml } from '../../lib/sanitize.js'

// ============================================================
// State
// ============================================================
let currentUser = null
let practitionerProfile = null
let clients = []
let selectedClient = null
let clientModules = []
let clientGoals = []
let clientBehaviours = []
let clientNotes = []
let clientWeeklyCheckins = []
let clientMoodCheckins = []
let clientModuleResponses = []

// ============================================================
// DOM references
// ============================================================
const loadingEl = document.getElementById('pracLoading')
const errorEl = document.getElementById('pracError')
const errorTextEl = document.getElementById('pracErrorText')
const mainEl = document.getElementById('pracMain')

// ============================================================
// Service layer
// ============================================================
async function getPractitionerCaseload() {
  const { data, error } = await supabase.rpc('get_practitioner_caseload', {
    prac_user_id: currentUser.id
  })
  if (error) throw error
  return data || []
}

async function searchByEmail(email) {
  const { data, error } = await supabase.rpc('search_children_by_parent_email', {
    search_email: email
  })
  if (error) throw error
  return data || []
}

async function linkClient(childId, parentUserId) {
  const { data, error } = await supabase
    .from('practitioner_clients')
    .insert({
      practitioner_user_id: currentUser.id,
      child_id: childId,
      parent_user_id: parentUserId,
      status: 'active'
    })
    .select()
    .single()
  if (error) throw error
  return data
}

async function unlinkClient(childId) {
  const { error } = await supabase
    .from('practitioner_clients')
    .update({ status: 'inactive' })
    .eq('practitioner_user_id', currentUser.id)
    .eq('child_id', childId)
  if (error) throw error
}

async function getClientModules(childId) {
  const { data, error } = await supabase
    .from('child_modules')
    .select('*, modules(title, category, card_color)')
    .eq('child_id', childId)
    .order('completed_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data || []
}

async function getClientGoals(childId) {
  const { data, error } = await supabase
    .from('practitioner_goals')
    .select('*')
    .eq('practitioner_user_id', currentUser.id)
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function addGoal(childId, goalData) {
  const { data, error } = await supabase
    .from('practitioner_goals')
    .insert({
      practitioner_user_id: currentUser.id,
      child_id: childId,
      ...goalData
    })
    .select()
    .single()
  if (error) throw error
  return data
}

async function deleteGoal(goalId) {
  const { error } = await supabase
    .from('practitioner_goals')
    .delete()
    .eq('id', goalId)
    .eq('practitioner_user_id', currentUser.id)
  if (error) throw error
}

async function getClientBehaviours(childId) {
  const { data, error } = await supabase
    .from('practitioner_behaviours')
    .select('*')
    .eq('practitioner_user_id', currentUser.id)
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function addBehaviour(childId, behaviourData) {
  const { data, error } = await supabase
    .from('practitioner_behaviours')
    .insert({
      practitioner_user_id: currentUser.id,
      child_id: childId,
      ...behaviourData
    })
    .select()
    .single()
  if (error) throw error
  return data
}

async function deleteBehaviour(behaviourId) {
  const { error } = await supabase
    .from('practitioner_behaviours')
    .delete()
    .eq('id', behaviourId)
    .eq('practitioner_user_id', currentUser.id)
  if (error) throw error
}

async function getClientWeeklyCheckins(childId) {
  const { data, error } = await supabase
    .from('weekly_checkins')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}

async function getClientMoodCheckins(childId) {
  const { data, error } = await supabase
    .from('child_mood_checkins')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data || []
}

async function getClientModuleResponses(childId) {
  const { data, error } = await supabase
    .from('module_responses')
    .select('*, modules(title)')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

async function getClientNotes(childId) {
  const { data, error } = await supabase
    .from('practitioner_notes')
    .select('*')
    .eq('practitioner_user_id', currentUser.id)
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function addNote(childId, noteText) {
  const { data, error } = await supabase
    .from('practitioner_notes')
    .insert({
      practitioner_user_id: currentUser.id,
      child_id: childId,
      note_text: noteText
    })
    .select()
    .single()
  if (error) throw error
  return data
}

async function deleteNote(noteId) {
  const { error } = await supabase
    .from('practitioner_notes')
    .delete()
    .eq('id', noteId)
    .eq('practitioner_user_id', currentUser.id)
  if (error) throw error
}

// ============================================================
// Init
// ============================================================
async function init() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login.html'
      return
    }
    currentUser = user

    // Check practitioner status
    const { data: isPractitioner } = await supabase.rpc('is_user_practitioner_check', { user_id: user.id })
    if (!isPractitioner) {
      loadingEl.classList.add('hidden')
      errorEl.classList.remove('hidden')
      return
    }

    // Get profile
    const { data: profile } = await supabase
      .from('parent_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    practitionerProfile = profile

    // Load caseload
    await loadCaseload()

    loadingEl.classList.add('hidden')
    mainEl.classList.remove('hidden')
  } catch (err) {
    console.error('Init error:', err)
    loadingEl.classList.add('hidden')
    errorTextEl.textContent = err.message || 'Failed to load Practitioner Hub.'
    errorEl.classList.remove('hidden')
  }
}

async function loadCaseload() {
  try {
    clients = await getPractitionerCaseload()
    renderCaseload()
  } catch (err) {
    console.error('Error loading caseload:', err)
    clients = []
    renderCaseload()
  }
}

// ============================================================
// Render: Caseload
// ============================================================
function renderCaseload() {
  const grid = document.getElementById('clientGrid')

  // Stats
  document.getElementById('statClients').textContent = clients.length
  document.getElementById('statModules').textContent = clients.reduce((n, c) => n + (Number(c.modules_completed) || 0), 0)
  document.getElementById('statGoals').textContent = '...'
  const avgLevel = clients.length > 0
    ? Math.round(clients.reduce((n, c) => n + (c.child_level || 1), 0) / clients.length)
    : 0
  document.getElementById('statAvgLevel').textContent = avgLevel

  // Load total goals count async
  loadGoalCount()

  if (clients.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#6b7280;">
        <p style="font-size:18px;margin-bottom:8px;">No clients linked yet</p>
        <p style="font-size:14px;">Click "+ Add client" to link a family.</p>
      </div>`
    return
  }

  grid.innerHTML = clients.map(c => {
    const age = c.child_age ? `Age ${c.child_age}` : 'Age unknown'
    const lastActive = c.last_login_date
      ? formatRelativeDate(c.last_login_date)
      : 'No activity yet'
    const avatar = c.child_avatar || getDefaultAvatar(c.child_name)

    return `
      <div class="prac-client-card" data-child-id="${c.child_id}">
        <div class="prac-cc-top">
          <div class="prac-cc-avatar">${avatar}</div>
          <div>
            <p class="prac-cc-name">${escapeHtml(c.child_name || 'Unknown')}</p>
            <p class="prac-cc-meta">${age}${c.parent_name ? ' &middot; Parent: ' + escapeHtml(c.parent_name) : ''}</p>
          </div>
        </div>
        <div class="prac-cc-row"><span>Level</span><span>${c.child_level || 1}</span></div>
        <div class="prac-cc-row"><span>Modules completed</span><span>${c.modules_completed || 0}</span></div>
        <div class="prac-cc-row"><span>Current streak</span><span>${c.current_streak || 0} days</span></div>
        <div class="prac-cc-row"><span>Last active</span><span>${lastActive}</span></div>
        <div class="prac-cc-foot">
          <span class="prac-chip prac-chip-green">Level ${c.child_level || 1}</span>
          <span class="prac-chip prac-chip-blue">${c.child_stars || 0} stars</span>
        </div>
      </div>`
  }).join('')
}

async function loadGoalCount() {
  try {
    const { count } = await supabase
      .from('practitioner_goals')
      .select('*', { count: 'exact', head: true })
      .eq('practitioner_user_id', currentUser.id)
      .eq('status', 'in_progress')
    document.getElementById('statGoals').textContent = count || 0
  } catch {
    document.getElementById('statGoals').textContent = 0
  }
}

// ============================================================
// Open client workspace
// ============================================================
async function openClient(childId) {
  const client = clients.find(c => c.child_id === childId)
  if (!client) return

  selectedClient = client

  // Show workspace view
  document.getElementById('viewCaseload').classList.add('hidden')
  document.getElementById('viewResources').classList.add('hidden')
  document.getElementById('viewClient').classList.remove('hidden')

  // Set header
  const avatar = client.child_avatar || getDefaultAvatar(client.child_name)
  document.getElementById('wsAvatar').textContent = avatar
  document.getElementById('wsName').textContent = client.child_name || 'Unknown'
  const age = client.child_age ? `Age ${client.child_age}` : ''
  const parent = client.parent_name ? `Parent: ${client.parent_name}` : ''
  document.getElementById('wsSub').textContent = [age, parent].filter(Boolean).join(' \u00B7 ')

  // Reset to first tab
  setTab('data')

  // Load all client data in parallel
  try {
    const [modules, goals, behaviours, notes, weeklyCheckins, moodCheckins, moduleResponses] = await Promise.all([
      getClientModules(childId),
      getClientGoals(childId),
      getClientBehaviours(childId),
      getClientNotes(childId),
      getClientWeeklyCheckins(childId).catch(() => []),
      getClientMoodCheckins(childId).catch(() => []),
      getClientModuleResponses(childId).catch(() => [])
    ])
    clientModules = modules
    clientGoals = goals
    clientBehaviours = behaviours
    clientNotes = notes
    clientWeeklyCheckins = weeklyCheckins
    clientMoodCheckins = moodCheckins
    clientModuleResponses = moduleResponses

    renderInsights()
    renderModuleList()
    renderMoodHistory()
    renderWeeklyCheckins()
    renderModuleResponses()
    renderGoals()
    renderBehaviours()
    renderNotes()
    renderPlan()
  } catch (err) {
    console.error('Error loading client data:', err)
  }
}

function showCaseload() {
  document.getElementById('viewClient').classList.add('hidden')
  document.getElementById('viewResources').classList.add('hidden')
  document.getElementById('viewCaseload').classList.remove('hidden')
  selectedClient = null
  setNav('caseload')
}

// ============================================================
// Tabs
// ============================================================
function setTab(name) {
  document.querySelectorAll('.prac-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name))
  document.querySelectorAll('.prac-tab-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== name))
  if (name === 'plan') renderPlan()
}

function setNav(view) {
  document.querySelectorAll('.prac-nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view))
}

// ============================================================
// Render: Data & Insights
// ============================================================
function renderInsights() {
  if (!selectedClient) return
  const c = selectedClient
  const completedModules = clientModules.filter(m => m.is_completed).length
  const activeModules = clientModules.filter(m => !m.is_completed && !m.locked).length

  // Mood average
  let moodAvg = '—'
  let lastMood = '—'
  if (clientMoodCheckins.length > 0) {
    const avg = clientMoodCheckins.reduce((s, m) => s + m.mood_score, 0) / clientMoodCheckins.length
    moodAvg = avg.toFixed(1) + ' / 5'
    const last = clientMoodCheckins[0]
    lastMood = (last.mood_emoji || '') + ' ' + (last.mood_label || last.mood_score + '/5')
  }

  // Intensity average from weekly checkins
  let avgIntensity = '—'
  if (clientWeeklyCheckins.length > 0) {
    const avg = clientWeeklyCheckins.reduce((s, c) => s + c.intensity, 0) / clientWeeklyCheckins.length
    avgIntensity = avg.toFixed(1) + ' / 5'
  }

  // Most common challenge
  let topChallenge = '—'
  if (clientWeeklyCheckins.length > 0) {
    const freq = {}
    clientWeeklyCheckins.forEach(c => { if (c.challenge) freq[c.challenge] = (freq[c.challenge] || 0) + 1 })
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0) topChallenge = sorted[0][0]
  }

  // Most common triggers/feelings
  let topTriggers = '—'
  if (clientWeeklyCheckins.length > 0) {
    const freq = {}
    clientWeeklyCheckins.forEach(c => { (c.triggers || []).forEach(t => { freq[t] = (freq[t] || 0) + 1 }) })
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3)
    if (sorted.length > 0) topTriggers = sorted.map(([t]) => t).join(', ')
  }

  document.getElementById('insightGrid').innerHTML = `
    <div class="prac-ig">
      <div class="prac-ig-label">Modules completed</div>
      <div class="prac-ig-value">${completedModules}</div>
      <div class="prac-ig-note">Out of ${clientModules.length} assigned</div>
    </div>
    <div class="prac-ig">
      <div class="prac-ig-label">Current streak</div>
      <div class="prac-ig-value">${c.current_streak || 0} days</div>
      <div class="prac-ig-note">Login streak</div>
    </div>
    <div class="prac-ig">
      <div class="prac-ig-label">Level</div>
      <div class="prac-ig-value">${c.child_level || 1}</div>
      <div class="prac-ig-note">${c.child_total_xp || 0} total XP</div>
    </div>
    <div class="prac-ig">
      <div class="prac-ig-label">Stars earned</div>
      <div class="prac-ig-value">${c.child_stars || 0}</div>
      <div class="prac-ig-note">Lifetime total</div>
    </div>
    <div class="prac-ig">
      <div class="prac-ig-label">Last mood</div>
      <div class="prac-ig-value" style="font-size:18px">${lastMood}</div>
      <div class="prac-ig-note">Avg: ${moodAvg} (${clientMoodCheckins.length} check-ins)</div>
    </div>
    <div class="prac-ig">
      <div class="prac-ig-label">Weekly intensity</div>
      <div class="prac-ig-value" style="font-size:20px">${avgIntensity}</div>
      <div class="prac-ig-note">${clientWeeklyCheckins.length} weekly check-ins</div>
    </div>
    <div class="prac-ig">
      <div class="prac-ig-label">Top challenge</div>
      <div class="prac-ig-value" style="font-size:16px">${escapeHtml(topChallenge)}</div>
      <div class="prac-ig-note">Most reported by parent</div>
    </div>
    <div class="prac-ig">
      <div class="prac-ig-label">Common feelings</div>
      <div class="prac-ig-value" style="font-size:14px">${escapeHtml(topTriggers)}</div>
      <div class="prac-ig-note">Parent-reported triggers</div>
    </div>
    <div class="prac-ig">
      <div class="prac-ig-label">Active modules</div>
      <div class="prac-ig-value">${activeModules}</div>
      <div class="prac-ig-note">In progress</div>
    </div>
    <div class="prac-ig">
      <div class="prac-ig-label">Last active</div>
      <div class="prac-ig-value" style="font-size:18px">${c.last_login_date ? formatRelativeDate(c.last_login_date) : 'Never'}</div>
      <div class="prac-ig-note">Last login</div>
    </div>`
}

function renderModuleList() {
  const el = document.getElementById('moduleList')
  if (clientModules.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;padding:12px 0;">No modules assigned yet.</p>'
    return
  }

  // Sort: completed first (by date desc), then active, then locked
  const sorted = [...clientModules].sort((a, b) => {
    if (a.is_completed && !b.is_completed) return -1
    if (!a.is_completed && b.is_completed) return 1
    if (a.is_completed && b.is_completed) {
      return new Date(b.completed_at || 0) - new Date(a.completed_at || 0)
    }
    return (a.locked ? 1 : 0) - (b.locked ? 1 : 0)
  })

  el.innerHTML = sorted.map(m => {
    const title = m.modules?.title || m.module_title || 'Unknown module'
    const status = m.is_completed ? 'completed' : m.locked ? 'locked' : 'active'
    const statusLabel = m.is_completed ? 'Completed' : m.locked ? 'Locked' : 'In Progress'
    const date = m.completed_at
      ? new Date(m.completed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
      : ''

    return `
      <div class="prac-module-row">
        <div class="prac-module-dot ${status}"></div>
        <div class="prac-module-title">${escapeHtml(title)}</div>
        <div class="prac-module-status ${status}">${statusLabel}</div>
        ${date ? `<div class="prac-module-date">${date}</div>` : ''}
      </div>`
  }).join('')
}

// ============================================================
// Render: Mood History
// ============================================================
function renderMoodHistory() {
  const el = document.getElementById('moodHistory')
  if (clientMoodCheckins.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;padding:8px 0;">No mood check-ins recorded yet.</p>'
    return
  }

  // Mood bar chart (last 15)
  const recent = clientMoodCheckins.slice(0, 15).reverse()
  const moodLabels = { 1: 'Awful', 2: 'Bad', 3: 'Okay', 4: 'Good', 5: 'Great' }
  const moodColors = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#14b8a6' }

  el.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:6px;height:80px;margin-bottom:12px;">
      ${recent.map(m => `<div style="flex:1;background:${moodColors[m.mood_score] || '#94a3b8'};border-radius:4px 4px 0 0;height:${m.mood_score * 20}%;min-height:4px;" title="${m.mood_emoji || ''} ${moodLabels[m.mood_score] || m.mood_score} — ${new Date(m.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}"></div>`).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#6b7280;">
      <span>${new Date(recent[0].created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
      <span>${new Date(recent[recent.length - 1].created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
    </div>
    <p style="font-size:11px;color:#6b7280;margin-top:8px;">${clientMoodCheckins.length} mood check-ins total. Showing last ${recent.length}.</p>`
}

// ============================================================
// Render: Weekly Checkins
// ============================================================
function renderWeeklyCheckins() {
  const el = document.getElementById('weeklyCheckinsList')
  if (clientWeeklyCheckins.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;padding:8px 0;">No weekly check-ins submitted yet.</p>'
    return
  }

  el.innerHTML = clientWeeklyCheckins.slice(0, 10).map(c => {
    const date = new Date(c.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    const intensityColor = c.intensity <= 2 ? '#22c55e' : c.intensity <= 3 ? '#eab308' : '#ef4444'
    const triggers = (c.triggers || []).join(', ') || 'None reported'
    const goal = c.goal || '—'

    return `
      <div class="prac-item">
        <div class="prac-item-top">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <span style="font-family:'Fredoka';font-weight:700;font-size:18px;color:${intensityColor};">${c.intensity}/5</span>
              <span style="font-size:12px;color:#6b7280;">intensity</span>
              <span style="font-size:12px;color:#6b7280;margin-left:auto;">${date}</span>
            </div>
            <div style="font-size:13px;margin-bottom:4px;"><strong>Challenge:</strong> ${escapeHtml(c.challenge || '—')}</div>
            <div style="font-size:13px;margin-bottom:4px;"><strong>Feelings:</strong> ${escapeHtml(triggers)}</div>
            <div style="font-size:13px;margin-bottom:4px;"><strong>Goal set:</strong> ${escapeHtml(goal)}</div>
            ${c.notes ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;font-style:italic;">"${escapeHtml(c.notes)}"</div>` : ''}
          </div>
        </div>
      </div>`
  }).join('') + (clientWeeklyCheckins.length > 10 ? `<p style="font-size:12px;color:#6b7280;margin-top:8px;">Showing 10 of ${clientWeeklyCheckins.length} check-ins.</p>` : '')
}

// ============================================================
// Render: Module Responses
// ============================================================
function renderModuleResponses() {
  const el = document.getElementById('moduleResponsesList')
  if (clientModuleResponses.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;padding:8px 0;">No module responses recorded yet.</p>'
    return
  }

  // Group responses by module
  const byModule = {}
  clientModuleResponses.forEach(r => {
    const title = r.modules?.title || 'Unknown module'
    if (!byModule[title]) byModule[title] = []
    byModule[title].push(r)
  })

  el.innerHTML = Object.entries(byModule).map(([title, responses]) => {
    const date = new Date(responses[0].created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    return `
      <div class="prac-item" style="margin-bottom:14px;">
        <p class="prac-item-title">${escapeHtml(title)}</p>
        <p class="prac-item-meta">${responses.length} responses &middot; ${date}</p>
        <div style="margin-top:10px;">
          ${responses.map(r => `
            <div style="font-size:13px;padding:6px 0;border-top:1px solid #f0f0f0;">
              <div style="color:#6b7280;font-size:11px;margin-bottom:2px;">${escapeHtml(r.question_text)}</div>
              <div style="font-weight:600;color:#1f2937;">${escapeHtml(r.response_value || (r.response_options && r.selected_option != null ? r.response_options[r.selected_option] : '—'))}${r.is_correct !== null ? (r.is_correct ? ' <span style="color:#22c55e;">Correct</span>' : ' <span style="color:#ef4444;">Incorrect</span>') : ''}</div>
            </div>`).join('')}
        </div>
      </div>`
  }).join('')
}

// ============================================================
// Render: Goals & Behaviours
// ============================================================
function renderGoals() {
  const el = document.getElementById('goalList')
  if (clientGoals.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;">No goals set yet.</p>'
    return
  }

  el.innerHTML = clientGoals.map(g => {
    const review = g.review_date ? `Review: ${new Date(g.review_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}` : ''
    const category = g.category ? g.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : ''

    return `
      <div class="prac-item">
        <div class="prac-item-top">
          <div>
            <p class="prac-item-title">${escapeHtml(g.goal_text)}</p>
            <p class="prac-item-meta">${[review, g.measure].filter(Boolean).join(' \u00B7 ')}</p>
          </div>
          <button class="prac-del" data-goal-id="${g.id}">Remove</button>
        </div>
        ${category ? `<div class="prac-item-tags"><span class="prac-chip prac-chip-blue">${escapeHtml(category)}</span><span class="prac-chip ${g.status === 'in_progress' ? 'prac-chip-amber' : 'prac-chip-green'}">${g.status === 'in_progress' ? 'In progress' : g.status}</span></div>` : ''}
      </div>`
  }).join('')
}

function renderBehaviours() {
  const el = document.getElementById('behaviourList')
  if (clientBehaviours.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;">No behaviours recorded yet.</p>'
    return
  }

  el.innerHTML = clientBehaviours.map(b => `
    <div class="prac-item">
      <div class="prac-item-top">
        <div>
          <p class="prac-item-title">${escapeHtml(b.description)}</p>
          <p class="prac-item-meta">${b.setting || ''}</p>
        </div>
        <button class="prac-del" data-behaviour-id="${b.id}">Remove</button>
      </div>
      ${b.baseline ? `<div class="prac-item-tags"><span class="prac-chip prac-chip-amber">Baseline: ${escapeHtml(b.baseline)}</span></div>` : ''}
    </div>`
  ).join('')
}

// ============================================================
// Render: Notes
// ============================================================
function renderNotes() {
  const el = document.getElementById('notesList')
  if (clientNotes.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;">No notes yet.</p>'
    return
  }

  el.innerHTML = clientNotes.map(n => {
    const date = new Date(n.created_at).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    return `
      <div class="prac-item">
        <div class="prac-item-top">
          <div>
            <p class="prac-item-body" style="margin:0;">${escapeHtml(n.note_text)}</p>
            <p class="prac-item-meta">${date}</p>
          </div>
          <button class="prac-del" data-note-id="${n.id}">Remove</button>
        </div>
      </div>`
  }).join('')
}

// ============================================================
// Render: Support Plan
// ============================================================
function renderPlan() {
  if (!selectedClient) return
  const c = selectedClient
  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const completedModules = clientModules.filter(m => m.is_completed)

  const behaviourHtml = clientBehaviours.length > 0
    ? clientBehaviours.map(b => `<p class="prac-plan-item">${escapeHtml(b.description)}${b.setting ? ` — <em>${escapeHtml(b.setting)}</em>` : ''}${b.baseline ? ` (baseline: ${escapeHtml(b.baseline)})` : ''}</p>`).join('')
    : '<p class="prac-plan-item">None recorded.</p>'

  const goalsHtml = clientGoals.length > 0
    ? clientGoals.map(g => `<p class="prac-plan-item">${escapeHtml(g.goal_text)}${g.category ? ` — <strong>${escapeHtml(g.category.replace(/-/g, ' '))}</strong>` : ''}${g.review_date ? `, review ${g.review_date}` : ''}</p>`).join('')
    : '<p class="prac-plan-item">None set.</p>'

  const moduleCategories = [...new Set(completedModules.map(m => m.modules?.category).filter(Boolean))]

  document.getElementById('planDoc').innerHTML = `
    <div class="prac-plan-head">
      <div>
        <h3>Support plan — ${escapeHtml(c.child_name || 'Client')}</h3>
        <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${c.child_age ? 'Age ' + c.child_age : ''}${c.parent_name ? ' \u00B7 Parent: ' + escapeHtml(c.parent_name) : ''}</p>
      </div>
      <div class="prac-plan-meta">
        Daniel's Diaries Practitioner Hub<br>
        Practitioner: ${escapeHtml(practitionerProfile?.full_name || 'Unknown')}<br>
        Generated ${today}
      </div>
    </div>

    <div class="prac-plan-section">
      <h4>Behaviours of concern</h4>
      ${behaviourHtml}
    </div>

    <div class="prac-plan-section">
      <h4>Goals</h4>
      ${goalsHtml}
    </div>

    <div class="prac-plan-section app-data">
      <h4>App engagement (collated by Daniel's Diaries)</h4>
      <p class="prac-plan-item">${completedModules.length} modules completed \u00B7 ${c.current_streak || 0}-day streak \u00B7 Level ${c.child_level || 1} (${c.child_total_xp || 0} XP).</p>
      <p class="prac-plan-item">${c.child_stars || 0} stars earned lifetime.</p>
      ${moduleCategories.length > 0 ? `<p class="prac-plan-item">Module categories covered: ${moduleCategories.join(', ')}.</p>` : ''}
    </div>

    <div class="prac-plan-section app-data">
      <h4>Practitioner note</h4>
      <p style="font-size:12px;color:#6b7280;margin:0;">App data reflects engagement and self-report only. Clinical formulation, interpretation and treatment decisions sit with the practitioner and are not generated by Daniel's Diaries.</p>
    </div>`
}

// ============================================================
// Render: Resources
// ============================================================
const RESOURCE_TOPICS = [
  { title: 'Understanding Emotions', desc: 'Help children build a vocabulary for their feelings and recognise body cues.', tag: 'Emotional Awareness', color: '#f46b6b' },
  { title: 'Building Resilience', desc: 'Tools and activities for developing coping strategies and bounce-back skills.', tag: 'Resilience', color: '#f4a73b' },
  { title: 'Social Skills & Friendships', desc: 'Navigating peer relationships, conflict resolution, and teamwork.', tag: 'Social Skills', color: '#4caf50' },
  { title: 'Managing Anxiety', desc: 'Practical strategies for when worries feel too big, including breathing and grounding.', tag: 'Anxiety', color: '#35a4d4' },
  { title: 'Self-Awareness', desc: 'Understanding how your brain works and recognising patterns in thinking.', tag: 'Self-Awareness', color: '#ab47bc' },
  { title: 'Behaviour & Choices', desc: 'The connection between feelings, thoughts and actions, and making good choices.', tag: 'Behaviour', color: '#40916c' }
]

function renderResources() {
  document.getElementById('resourceGrid').innerHTML = RESOURCE_TOPICS.map(r => `
    <div class="prac-guide">
      <div class="prac-guide-band" style="background:linear-gradient(135deg,${r.color},${r.color}cc);">${r.title}</div>
      <div class="prac-guide-body">
        <p>${r.desc}</p>
        <span class="prac-guide-tag">${r.tag}</span>
      </div>
    </div>`
  ).join('')
}

// ============================================================
// Event listeners
// ============================================================
function setupEventListeners() {
  // Nav buttons
  document.querySelectorAll('.prac-nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view
      document.getElementById('viewClient').classList.add('hidden')
      document.getElementById('viewCaseload').classList.toggle('hidden', view !== 'caseload')
      document.getElementById('viewResources').classList.toggle('hidden', view !== 'resources')
      setNav(view)
      if (view === 'resources') renderResources()
    })
  })

  // Dashboard button
  document.getElementById('backToDashboardBtn').addEventListener('click', () => {
    window.location.href = '/dashboard.html'
  })

  // Close guardrail
  document.getElementById('closeGuardrail')?.addEventListener('click', () => {
    document.getElementById('pracGuardrail')?.classList.add('hidden')
  })

  // Back to caseload
  document.getElementById('backToCaseload').addEventListener('click', showCaseload)

  // Client card clicks (delegated)
  document.getElementById('clientGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.prac-client-card')
    if (card) openClient(card.dataset.childId)
  })

  // Tab clicks
  document.querySelectorAll('.prac-tab').forEach(t => {
    t.addEventListener('click', () => setTab(t.dataset.tab))
  })

  // Add client modal
  document.getElementById('addClientBtn').addEventListener('click', () => {
    document.getElementById('addClientModal').classList.remove('hidden')
    document.getElementById('searchEmail').value = ''
    document.getElementById('searchResults').innerHTML = ''
    document.getElementById('searchError').classList.add('hidden')
  })
  document.getElementById('closeAddClientBtn').addEventListener('click', () => {
    document.getElementById('addClientModal').classList.add('hidden')
  })

  // Dynamic search on input
  let searchTimeout = null
  document.getElementById('searchEmail').addEventListener('input', () => {
    clearTimeout(searchTimeout)
    const val = document.getElementById('searchEmail').value.trim()
    if (val.length < 1) {
      document.getElementById('searchResults').innerHTML = ''
      document.getElementById('searchError').classList.add('hidden')
      return
    }
    searchTimeout = setTimeout(() => handleSearchFamily(), 400)
  })
  document.getElementById('searchFamilyBtn').addEventListener('click', handleSearchFamily)

  // Remove client
  document.getElementById('removeClientBtn').addEventListener('click', () => {
    document.getElementById('removeClientModal').classList.remove('hidden')
  })
  document.getElementById('cancelRemoveBtn').addEventListener('click', () => {
    document.getElementById('removeClientModal').classList.add('hidden')
  })
  document.getElementById('confirmRemoveBtn').addEventListener('click', handleRemoveClient)

  // Add behaviour toggle + submit
  document.getElementById('addBehaviourToggle').addEventListener('click', () => {
    document.getElementById('addBehaviourForm').classList.toggle('hidden')
  })
  document.getElementById('submitBehaviour').addEventListener('click', handleAddBehaviour)

  // Add goal toggle + submit
  document.getElementById('addGoalToggle').addEventListener('click', () => {
    document.getElementById('addGoalForm').classList.toggle('hidden')
  })
  document.getElementById('submitGoal').addEventListener('click', handleAddGoal)

  // Add note
  document.getElementById('submitNote').addEventListener('click', handleAddNote)

  // Print plan
  document.getElementById('printPlanBtn').addEventListener('click', () => {
    setTab('plan')
    setTimeout(() => window.print(), 100)
  })

  // Delegated delete clicks for goals, behaviours, notes
  document.addEventListener('click', (e) => {
    const goalDel = e.target.closest('[data-goal-id]')
    if (goalDel && e.target.classList.contains('prac-del')) {
      handleDeleteGoal(goalDel.dataset.goalId)
      return
    }
    const behDel = e.target.closest('[data-behaviour-id]')
    if (behDel && e.target.classList.contains('prac-del')) {
      handleDeleteBehaviour(behDel.dataset.behaviourId)
      return
    }
    const noteDel = e.target.closest('[data-note-id]')
    if (noteDel && e.target.classList.contains('prac-del')) {
      handleDeleteNote(noteDel.dataset.noteId)
      return
    }
  })

  // Close modals on overlay click
  document.querySelectorAll('.prac-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden')
    })
  })
}

// ============================================================
// Handlers
// ============================================================
async function handleSearchFamily() {
  const email = document.getElementById('searchEmail').value.trim()
  const errorEl = document.getElementById('searchError')
  const resultsEl = document.getElementById('searchResults')

  if (!email) {
    errorEl.textContent = 'Please enter an email address.'
    errorEl.classList.remove('hidden')
    return
  }

  errorEl.classList.add('hidden')
  resultsEl.innerHTML = '<p style="color:#6b7280;font-size:13px;">Searching...</p>'

  try {
    const children = await searchByEmail(email)
    if (children.length === 0) {
      resultsEl.innerHTML = ''
      errorEl.textContent = 'No family found with that email address.'
      errorEl.classList.remove('hidden')
      return
    }

    // Filter out already-linked children
    const existingIds = new Set(clients.map(c => c.child_id))

    resultsEl.innerHTML = children.map(child => {
      const alreadyLinked = existingIds.has(child.child_id)
      return `
        <div class="prac-search-child">
          <div class="prac-search-child-avatar">${child.child_avatar || getDefaultAvatar(child.child_name)}</div>
          <div class="prac-search-child-info">
            <div class="prac-search-child-name">${escapeHtml(child.child_name || 'Unknown')}</div>
            <div class="prac-search-child-detail">${child.child_age ? 'Age ' + child.child_age : ''}${child.parent_name ? ' \u00B7 Parent: ' + escapeHtml(child.parent_name) : ''}</div>
          </div>
          ${alreadyLinked
            ? '<span class="prac-chip prac-chip-green">Already linked</span>'
            : `<button class="prac-btn prac-btn-primary prac-btn-sm" onclick="window._linkChild('${child.child_id}','${child.parent_user_id}')">Link</button>`
          }
        </div>`
    }).join('')
  } catch (err) {
    console.error('Search error:', err)
    resultsEl.innerHTML = ''
    errorEl.textContent = err.message || 'Search failed. Please try again.'
    errorEl.classList.remove('hidden')
  }
}

// Expose link function for inline onclick
window._linkChild = async function(childId, parentUserId) {
  try {
    await linkClient(childId, parentUserId)
    document.getElementById('addClientModal').classList.add('hidden')
    await loadCaseload()
  } catch (err) {
    console.error('Link error:', err)
    const errorEl = document.getElementById('searchError')
    errorEl.textContent = err.message || 'Failed to link client.'
    errorEl.classList.remove('hidden')
  }
}

async function handleRemoveClient() {
  if (!selectedClient) return
  try {
    await unlinkClient(selectedClient.child_id)
    document.getElementById('removeClientModal').classList.add('hidden')
    showCaseload()
    await loadCaseload()
  } catch (err) {
    console.error('Remove error:', err)
  }
}

async function handleAddBehaviour() {
  if (!selectedClient) return
  const desc = document.getElementById('bDesc').value.trim()
  if (!desc) return

  try {
    await addBehaviour(selectedClient.child_id, {
      description: desc,
      setting: document.getElementById('bSetting').value.trim(),
      baseline: document.getElementById('bBaseline').value.trim()
    })
    document.getElementById('bDesc').value = ''
    document.getElementById('bSetting').value = ''
    document.getElementById('bBaseline').value = ''
    document.getElementById('addBehaviourForm').classList.add('hidden')
    clientBehaviours = await getClientBehaviours(selectedClient.child_id)
    renderBehaviours()
  } catch (err) {
    console.error('Add behaviour error:', err)
  }
}

async function handleAddGoal() {
  if (!selectedClient) return
  const stmt = document.getElementById('gStmt').value.trim()
  if (!stmt) return

  try {
    await addGoal(selectedClient.child_id, {
      goal_text: stmt,
      category: document.getElementById('gCategory').value,
      review_date: document.getElementById('gReview').value || null,
      measure: document.getElementById('gMeasure').value.trim()
    })
    document.getElementById('gStmt').value = ''
    document.getElementById('gReview').value = ''
    document.getElementById('gMeasure').value = ''
    document.getElementById('addGoalForm').classList.add('hidden')
    clientGoals = await getClientGoals(selectedClient.child_id)
    renderGoals()
    loadGoalCount()
  } catch (err) {
    console.error('Add goal error:', err)
  }
}

async function handleAddNote() {
  if (!selectedClient) return
  const text = document.getElementById('noteText').value.trim()
  if (!text) return

  try {
    await addNote(selectedClient.child_id, text)
    document.getElementById('noteText').value = ''
    clientNotes = await getClientNotes(selectedClient.child_id)
    renderNotes()
  } catch (err) {
    console.error('Add note error:', err)
  }
}

async function handleDeleteGoal(goalId) {
  try {
    await deleteGoal(goalId)
    clientGoals = await getClientGoals(selectedClient.child_id)
    renderGoals()
    loadGoalCount()
  } catch (err) {
    console.error('Delete goal error:', err)
  }
}

async function handleDeleteBehaviour(behaviourId) {
  try {
    await deleteBehaviour(behaviourId)
    clientBehaviours = await getClientBehaviours(selectedClient.child_id)
    renderBehaviours()
  } catch (err) {
    console.error('Delete behaviour error:', err)
  }
}

async function handleDeleteNote(noteId) {
  try {
    await deleteNote(noteId)
    clientNotes = await getClientNotes(selectedClient.child_id)
    renderNotes()
  } catch (err) {
    console.error('Delete note error:', err)
  }
}

// ============================================================
// Utilities
// ============================================================

function formatRelativeDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function getDefaultAvatar(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0][0].toUpperCase()
}

// ============================================================
// Bootstrap
// ============================================================
setupEventListeners()
init()
