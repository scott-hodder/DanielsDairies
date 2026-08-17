import { supabase } from '../../supabaseClient.js'
import { escapeHtml } from '../../lib/sanitize.js'
import { initKidIcons } from '../../lib/kidIcons.js'
import { initTelemetry, trackEvent } from '../../lib/telemetry.js'
import { childAvatarHTML } from '../../lib/childAvatar.js'
import { computeOverviewStats, computeNeedsAttention, relativeDayLabel } from './overviewStats.js'

// Error tracking + page view (fail-silent, self-hosted in Supabase)
initTelemetry()

// Consistent emoji artwork on every device
initKidIcons()

// ============================================================
// State
// ============================================================
let currentUser = null
let practitionerProfile = null
let clients = []
let selectedClient = null
let clientModules = []
let clientBehaviours = []
let clientNotes = []
let clientWeeklyCheckins = []
let clientMoodCheckins = []
let clientModuleResponses = []

let tags = []               // super_skill_tags (developmental areas)
let superSkills = []        // super_skills reference data
let goalProgress = []       // all goals for this practitioner, with computed progress
let planUsage = null        // plan + caseload usage from get_practitioner_plan_usage
let plans = []              // practitioner_plans for the comparison grid
let invites = []            // this practitioner's invites
let selectedGoalTagIds = new Set()
let familyTiers = null      // family subscription_tiers, for pricing in the NDIS letter
let letterhead = {}         // practitioner letterhead details, persisted per device
let activeDoc = 'plan'      // which document is shown in the Support Plan tab
let progressSummary = null  // this client's progress summary row (practitioner_progress_summaries)
let recentCompletions = []  // latest module completions across the caseload (Overview feed)

const SUPPORT_EMAIL = 'info@danielsdiaries.com'
const INACTIVE_DAYS = 14

// ============================================================
// Toast notifications
// ============================================================
function showToast(message, type = 'info') {
  let host = document.getElementById('pracToastHost')
  if (!host) {
    host = document.createElement('div')
    host.id = 'pracToastHost'
    host.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:10000;display:flex;flex-direction:column;gap:8px;align-items:center;'
    document.body.appendChild(host)
  }
  const toast = document.createElement('div')
  const colors = {
    info: 'background:#16324f;color:#fff;',
    success: 'background:#0d9488;color:#fff;',
    error: 'background:#b91c1c;color:#fff;'
  }
  toast.style.cssText = `${colors[type] || colors.info}padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:90vw;`
  toast.textContent = message
  host.appendChild(toast)
  setTimeout(() => {
    toast.style.transition = 'opacity .4s'
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 400)
  }, 4500)
}

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

async function getGoalProgress() {
  const { data, error } = await supabase.rpc('get_practitioner_goal_progress', {
    prac_user_id: currentUser.id
  })
  if (error) throw error
  return data || []
}

async function getPlanUsage() {
  const { data, error } = await supabase.rpc('get_practitioner_plan_usage')
  if (error) throw error
  return data
}

async function getPlans() {
  const { data, error } = await supabase
    .from('practitioner_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data || []
}

async function getTags() {
  const { data, error } = await supabase
    .from('super_skill_tags')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data || []
}

async function getSuperSkills() {
  const { data, error } = await supabase
    .from('super_skills')
    .select('id, name, slug, emoji, theme_color, sort_order')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data || []
}

async function getFamilyTiers() {
  if (familyTiers) return familyTiers
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('tier, display_name, monthly_price_cents')
    .eq('is_active', true)
  if (error) throw error
  familyTiers = data || []
  return familyTiers
}

async function getInvites() {
  const { data, error } = await supabase
    .from('practitioner_invites')
    .select('*')
    .eq('practitioner_user_id', currentUser.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function createInvite(email) {
  const { data, error } = await supabase.rpc('create_practitioner_invite', {
    p_family_email: email || null
  })
  if (error) throw error
  return data
}

// ── Self-serve billing (Stripe checkout + billing portal) ──
async function startPlanCheckout(planCode) {
  trackEvent('practitioner_checkout_start', { plan: planCode })
  const { data, error } = await supabase.functions.invoke('practitioner-checkout', {
    body: {
      plan: planCode,
      successUrl: `${window.location.origin}/practitioner-dashboard.html?billing=success`,
      cancelUrl: `${window.location.origin}/practitioner-dashboard.html?billing=cancelled`
    }
  })
  if (error) throw error
  if (!data?.url) throw new Error(data?.error || 'Could not start checkout')
  window.location.href = data.url
}

async function openBillingPortal() {
  const { data, error } = await supabase.functions.invoke('practitioner-checkout', {
    body: { portal: true, returnUrl: `${window.location.origin}/practitioner-dashboard.html` }
  })
  if (error) throw error
  if (!data?.url) throw new Error(data?.error || 'Could not open billing portal')
  window.location.href = data.url
}

async function revokeInvite(inviteId) {
  const { error } = await supabase
    .from('practitioner_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .eq('practitioner_user_id', currentUser.id)
  if (error) throw error
}

async function searchByEmail(email) {
  const { data, error } = await supabase.rpc('search_children_by_parent_email', {
    search_email: email
  })
  if (error) throw error
  return data || []
}

async function linkClient(childId, parentUserId) {
  // Upsert so re-linking a previously removed client reactivates the row
  const { data, error } = await supabase
    .from('practitioner_clients')
    .upsert({
      practitioner_user_id: currentUser.id,
      child_id: childId,
      parent_user_id: parentUserId,
      status: 'active'
    }, { onConflict: 'practitioner_user_id,child_id' })
    .select()
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

// Latest completions across the whole caseload, for the Overview feed.
// Practitioner read access to child_modules comes from the caseload RLS.
async function getRecentCompletions(childIds) {
  if (!childIds.length) return []
  const { data, error } = await supabase
    .from('child_modules')
    .select('child_id, completed_at, is_completed, modules(title, category)')
    .in('child_id', childIds)
    .eq('is_completed', true)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(15)
  if (error) throw error
  return data || []
}

async function getClientModules(childId) {
  const { data, error } = await supabase
    .from('child_modules')
    .select('*, modules(title, category, card_color, super_skill_id)')
    .eq('child_id', childId)
    .order('completed_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data || []
}

async function addGoal(childId, goalData, tagIds) {
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

  if (tagIds.length > 0) {
    const { error: tagError } = await supabase
      .from('practitioner_goal_tags')
      .insert(tagIds.map(tagId => ({ goal_id: data.id, tag_id: tagId })))
    if (tagError) throw tagError
  }
  return data
}

async function updateGoalStatus(goalId, status) {
  const { error } = await supabase
    .from('practitioner_goals')
    .update({
      status,
      completed_at: status === 'complete' ? new Date().toISOString() : null
    })
    .eq('id', goalId)
    .eq('practitioner_user_id', currentUser.id)
  if (error) throw error
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

async function getProgressSummary(childId) {
  const { data, error } = await supabase
    .from('practitioner_progress_summaries')
    .select('*')
    .eq('practitioner_user_id', currentUser.id)
    .eq('child_id', childId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function upsertProgressSummary(childId, fields) {
  const { data, error } = await supabase
    .from('practitioner_progress_summaries')
    .upsert({
      practitioner_user_id: currentUser.id,
      child_id: childId,
      practitioner_name: practitionerProfile?.full_name || null,
      ...fields
    }, { onConflict: 'practitioner_user_id,child_id' })
    .select()
    .single()
  if (error) throw error
  return data
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

    // Load reference + caseload data in parallel. Plan/tag data failing
    // (e.g. migrations not applied yet) must not take the whole hub down.
    const [caseloadRes, tagsRes, skillsRes, progressRes, usageRes] = await Promise.allSettled([
      getPractitionerCaseload(),
      getTags(),
      getSuperSkills(),
      getGoalProgress(),
      getPlanUsage()
    ])
    clients = caseloadRes.status === 'fulfilled' ? caseloadRes.value : []
    tags = tagsRes.status === 'fulfilled' ? tagsRes.value : []
    superSkills = skillsRes.status === 'fulfilled' ? skillsRes.value : []
    goalProgress = progressRes.status === 'fulfilled' ? progressRes.value : []
    planUsage = usageRes.status === 'fulfilled' ? usageRes.value : null

    renderPlanNotice()
    renderCaseload()
    loadLetterhead()

    // Overview feed loads after the caseload is known; never blocks the hub.
    try {
      recentCompletions = await getRecentCompletions(clients.map(c => c.child_id))
    } catch (err) {
      console.error('Error loading recent activity:', err)
      recentCompletions = []
    }
    renderOverview()

    loadingEl.classList.add('hidden')
    mainEl.classList.remove('hidden')

    // Returning from Stripe checkout
    const billingReturn = new URLSearchParams(window.location.search).get('billing')
    if (billingReturn) {
      window.history.replaceState({}, '', window.location.pathname)
      if (billingReturn === 'success') {
        showToast('Payment successful — your plan is being activated. This can take a few seconds.', 'success')
        setView('plan')
        // The webhook activates the plan; poll briefly so the page reflects it.
        setTimeout(async () => {
          try { planUsage = await getPlanUsage() } catch { /* keep current */ }
          renderPlanNotice()
          renderPlanView()
        }, 4000)
      } else if (billingReturn === 'cancelled') {
        showToast('Checkout cancelled — no charge was taken.', 'info')
        setView('plan')
      }
    }
  } catch (err) {
    console.error('Init error:', err)
    loadingEl.classList.add('hidden')
    errorTextEl.textContent = err.message || 'Failed to load Practitioner Hub.'
    errorEl.classList.remove('hidden')
  }
}

async function refreshCaseload() {
  try {
    clients = await getPractitionerCaseload()
  } catch (err) {
    console.error('Error loading caseload:', err)
    clients = []
  }
  try {
    planUsage = await getPlanUsage()
  } catch { /* keep previous value */ }
  renderPlanNotice()
  renderCaseload()
}

async function refreshGoalProgress() {
  try {
    goalProgress = await getGoalProgress()
  } catch (err) {
    console.error('Error loading goal progress:', err)
  }
}

// ============================================================
// Goal helpers
// ============================================================
function goalsForChild(childId) {
  return goalProgress.filter(g => g.child_id === childId)
}

function activeGoalsForChild(childId) {
  return goalsForChild(childId).filter(g => g.status === 'in_progress')
}

function goalAtTarget(g) {
  return g.target_modules && Number(g.progress_count) >= g.target_modules
}

function goalReviewOverdue(g) {
  return g.status === 'in_progress' && g.review_date && new Date(g.review_date) < new Date().setHours(0, 0, 0, 0)
}

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

// What needs the practitioner's attention for a client
function attentionFlags(client) {
  const flags = []
  const inactive = daysSince(client.last_login_date)
  if (inactive === null || inactive > INACTIVE_DAYS) {
    flags.push({ type: 'warn', label: inactive === null ? 'No activity yet' : `Inactive ${inactive} days` })
  }
  const goals = activeGoalsForChild(client.child_id)
  if (goals.some(goalReviewOverdue)) flags.push({ type: 'warn', label: 'Goal review overdue' })
  if (goals.some(goalAtTarget)) flags.push({ type: 'good', label: 'Goal target reached' })
  return flags
}

function goalProgressBar(g, opts = {}) {
  if (!g.target_modules) return ''
  const count = Math.min(Number(g.progress_count), g.target_modules)
  const pct = Math.round((count / g.target_modules) * 100)
  const done = goalAtTarget(g)
  return `
    <div class="prac-progress ${opts.compact ? 'compact' : ''}">
      <div class="prac-progress-track"><div class="prac-progress-fill ${done ? 'done' : ''}" style="width:${pct}%"></div></div>
      <span class="prac-progress-label">${Number(g.progress_count)} of ${g.target_modules} modules</span>
    </div>`
}

function tagChips(goalTags) {
  return (goalTags || []).map(t => `<span class="prac-chip prac-chip-blue">${escapeHtml(t.name)}</span>`).join('')
}

// ============================================================
// Render: plan notice banner
// ============================================================
function renderPlanNotice() {
  // FREE PERIOD: the Practitioner Hub is free while the offering is being
  // developed — no trial countdowns or plan warnings. The billing plumbing
  // stays intact underneath; delete this block when the paywall returns.
  document.getElementById('planNotice')?.classList.add('hidden')
  // eslint-disable-next-line no-unreachable
  return
  /* Original notice logic preserved below for the paywall's return. */
  const el = document.getElementById('planNotice')
  if (!el) return
  if (!planUsage) { el.classList.add('hidden'); return }

  if (planUsage.trial_expired) {
    el.innerHTML = `<strong>Your free trial has ended.</strong> You can still view your caseload, but adding clients is paused. <a href="#" data-goto-plan>Choose a plan</a> to keep going — it takes about a minute.`
    el.className = 'prac-plan-notice warn'
    return
  }
  if (['past_due', 'canceled', 'inactive'].includes(planUsage.status)) {
    el.innerHTML = `<strong>Your plan is ${planUsage.status === 'past_due' ? 'past due' : 'inactive'}.</strong> Your caseload stays visible, but adding clients is paused. <a href="#" data-goto-plan>Go to Plan &amp; Billing</a> to fix it up.`
    el.className = 'prac-plan-notice warn'
    return
  }
  if (planUsage.status === 'trialing') {
    const daysLeft = Math.max(0, Math.ceil((new Date(planUsage.trial_ends_at) - Date.now()) / (1000 * 60 * 60 * 24)))
    el.innerHTML = `<strong>Free trial:</strong> ${daysLeft} day${daysLeft === 1 ? '' : 's'} left with full access (up to ${planUsage.included_clients} active clients). See <a href="#" data-goto-plan>Plan &amp; Billing</a> for plans.`
    el.className = 'prac-plan-notice info'
    return
  }
  el.classList.add('hidden')
}

// ============================================================
// Render: Caseload
// ============================================================
function renderCaseload() {
  const grid = document.getElementById('clientGrid')

  const activeGoals = goalProgress.filter(g => g.status === 'in_progress')
  const atTarget = activeGoals.filter(goalAtTarget).length
  const attentionCount = clients.filter(c => attentionFlags(c).some(f => f.type === 'warn')).length

  document.getElementById('statClients').textContent = clients.length
  // Free period: no plan-limit messaging on the client count.
  document.getElementById('statClientsNote').textContent = ''
  document.getElementById('statGoals').textContent = activeGoals.length
  document.getElementById('statGoalsNote').textContent = atTarget > 0
    ? `${atTarget} reached their module target`
    : 'Across your caseload'
  document.getElementById('statAttention').textContent = attentionCount
  document.getElementById('statAttentionNote').textContent = attentionCount > 0
    ? 'Inactive or review overdue'
    : 'Everyone is on track'
  document.getElementById('statModules').textContent = clients.reduce((n, c) => n + (Number(c.modules_completed) || 0), 0)

  if (clients.length === 0) {
    grid.innerHTML = `
      <div class="prac-empty" style="grid-column:1/-1;">
        <p class="prac-empty-title">No clients yet</p>
        <p class="prac-empty-sub">Invite a family with a private code, or link a family that already uses Daniel's Diaries.</p>
        <button class="prac-btn prac-btn-primary" id="emptyAddClientBtn">+ Add your first client</button>
      </div>`
    document.getElementById('emptyAddClientBtn')?.addEventListener('click', openAddClientModal)
    return
  }

  grid.innerHTML = clients.map(c => {
    const age = c.child_age ? `Age ${c.child_age}` : 'Age unknown'
    const lastActive = c.last_login_date ? formatRelativeDate(c.last_login_date) : 'No activity yet'
    const avatar = c.child_avatar || getDefaultAvatar(c.child_name)
    const goals = activeGoalsForChild(c.child_id)
    const flags = attentionFlags(c)

    const goalHtml = goals.length === 0
      ? '<p class="prac-cc-nogoal">No active goals — add one in the client workspace.</p>'
      : goals.slice(0, 2).map(g => `
          <div class="prac-cc-goal">
            <p class="prac-cc-goal-text">${escapeHtml(g.goal_text)}</p>
            ${goalProgressBar(g, { compact: true }) || `<p class="prac-cc-goal-meta">Tracked by: ${escapeHtml(g.measure || 'practitioner review')}</p>`}
          </div>`).join('') +
        (goals.length > 2 ? `<p class="prac-cc-goal-meta">+ ${goals.length - 2} more goal${goals.length - 2 === 1 ? '' : 's'}</p>` : '')

    const flagChips = flags.length > 0
      ? flags.map(f => `<span class="prac-chip ${f.type === 'warn' ? 'prac-chip-amber' : 'prac-chip-green'}">${escapeHtml(f.label)}</span>`).join('')
      : '<span class="prac-chip prac-chip-green">On track</span>'

    return `
      <div class="prac-client-card" data-child-id="${c.child_id}">
        <div class="prac-cc-top">
          <div class="prac-cc-avatar">${childAvatarHTML(avatar)}</div>
          <div>
            <p class="prac-cc-name">${escapeHtml(c.child_name || 'Unknown')}</p>
            <p class="prac-cc-meta">${age}${c.parent_name ? ' &middot; Parent: ' + escapeHtml(c.parent_name) : ''}</p>
          </div>
        </div>
        <div class="prac-cc-goals">${goalHtml}</div>
        <div class="prac-cc-row"><span>Modules completed</span><span>${c.modules_completed || 0}</span></div>
        <div class="prac-cc-row"><span>Last active</span><span>${lastActive}</span></div>
        <div class="prac-cc-foot">${flagChips}</div>
      </div>`
  }).join('')
}

// ============================================================
// Open client workspace
// ============================================================
async function openClient(childId) {
  const client = clients.find(c => c.child_id === childId)
  if (!client) return

  selectedClient = client

  // Show workspace view
  setView('client')

  // Set header
  const avatar = client.child_avatar || getDefaultAvatar(client.child_name)
  document.getElementById('wsAvatar').innerHTML = childAvatarHTML(avatar)
  document.getElementById('wsName').textContent = client.child_name || 'Unknown'
  const age = client.child_age ? `Age ${client.child_age}` : ''
  const parent = client.parent_name ? `Parent: ${client.parent_name}` : ''
  document.getElementById('wsSub').textContent = [age, parent].filter(Boolean).join(' · ')

  // Reset to first tab
  setTab('data')

  // Load all client data in parallel
  try {
    const [modules, behaviours, notes, weeklyCheckins, moodCheckins, moduleResponses, summary] = await Promise.all([
      getClientModules(childId),
      getClientBehaviours(childId),
      getClientNotes(childId),
      getClientWeeklyCheckins(childId).catch(() => []),
      getClientMoodCheckins(childId).catch(() => []),
      getClientModuleResponses(childId).catch(() => []),
      getProgressSummary(childId).catch(() => null),
      refreshGoalProgress()
    ])
    clientModules = modules
    clientBehaviours = behaviours
    clientNotes = notes
    clientWeeklyCheckins = weeklyCheckins
    clientMoodCheckins = moodCheckins
    clientModuleResponses = moduleResponses
    progressSummary = summary

    renderGoalProgressPanel()
    renderInsights()
    renderSkillCoverage()
    renderModuleList()
    renderMoodHistory()
    renderWeeklyCheckins()
    renderModuleResponses()
    renderGoals()
    renderBehaviours()
    renderNotes()
    renderSupportPlan()
  } catch (err) {
    console.error('Error loading client data:', err)
  }
}

function showCaseload() {
  selectedClient = null
  setView('caseload')
  renderCaseload()
}

// ============================================================
// Views & tabs
// ============================================================
function setView(view) {
  document.getElementById('viewOverview').classList.toggle('hidden', view !== 'overview')
  document.getElementById('viewCaseload').classList.toggle('hidden', view !== 'caseload')
  document.getElementById('viewClient').classList.toggle('hidden', view !== 'client')
  document.getElementById('viewResources').classList.toggle('hidden', view !== 'resources')
  document.getElementById('viewPlan').classList.toggle('hidden', view !== 'plan')
  const navView = view === 'client' ? 'caseload' : view
  document.querySelectorAll('.prac-nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === navView))
  if (view === 'overview') renderOverview()
  if (view === 'resources') renderResources()
  if (view === 'plan') renderPlanView()
}

// ============================================================
// Render: Overview (the hub's home view)
// ============================================================
function renderOverview() {
  const greetingEl = document.getElementById('overviewGreeting')
  if (!greetingEl) return

  const firstName = (practitionerProfile?.full_name || '').trim().split(/\s+/)[0]
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  greetingEl.textContent = firstName ? `${timeOfDay}, ${firstName}` : `${timeOfDay}`
  document.getElementById('overviewSub').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  // Empty caseload: swap the zero-filled stats for a getting-started guide.
  const isEmpty = !clients.length
  document.getElementById('ovEmptyState')?.classList.toggle('hidden', !isEmpty)
  document.getElementById('overviewStatStrip')?.classList.toggle('hidden', isEmpty)
  document.getElementById('ovPanels')?.classList.toggle('hidden', isEmpty)
  if (isEmpty) return

  const stats = computeOverviewStats({ clients, goalProgress, recentCompletions })
  document.getElementById('ovClients').textContent = stats.activeClients
  document.getElementById('ovActiveWeek').textContent = stats.activeThisWeek
  document.getElementById('ovModulesWeek').textContent = stats.modulesThisWeek
  document.getElementById('ovGoalsDue').textContent = stats.goalsDueSoon

  // Free period: no plan-limit messaging on the client count.
  document.getElementById('ovClientsNote').textContent = ''

  // Needs attention
  const attentionEl = document.getElementById('ovAttentionList')
  const attention = computeNeedsAttention({ clients, goalProgress })
  if (!clients.length) {
    attentionEl.innerHTML = '<p style="font-size:14px;color:#6b7280;">No clients yet — add your first client to start seeing engagement data here.</p>'
  } else if (!attention.length) {
    attentionEl.innerHTML = '<p style="font-size:14px;color:#0d9488;font-weight:600;">All quiet — nothing needs chasing right now.</p>'
  } else {
    attentionEl.innerHTML = attention.map(a => `
      <div class="prac-ov-row" data-child-id="${escapeHtml(a.childId)}" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;cursor:pointer;">
        <span style="font-weight:600;color:#16324f;flex:1;">${escapeHtml(a.childName || 'Client')}</span>
        ${a.reasons.map(r => `<span style="background:#FEF3C7;color:#92400E;font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px;">${escapeHtml(r)}</span>`).join('')}
      </div>`).join('')
    attentionEl.querySelectorAll('.prac-ov-row').forEach(row => {
      row.addEventListener('click', () => openClient(row.dataset.childId))
    })
  }

  // Recent activity
  const feedEl = document.getElementById('ovActivityFeed')
  if (!recentCompletions.length) {
    feedEl.innerHTML = '<p style="font-size:14px;color:#6b7280;">No module completions yet. Once your clients start working through the program, their latest wins show up here.</p>'
  } else {
    const nameById = Object.fromEntries(clients.map(c => [c.child_id, c.child_name]))
    feedEl.innerHTML = recentCompletions.slice(0, 8).map(cm => `
      <div style="display:flex;align-items:baseline;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-weight:600;color:#16324f;white-space:nowrap;">${escapeHtml(nameById[cm.child_id] || 'Client')}</span>
        <span style="font-size:13px;color:#475569;flex:1;">completed <strong>${escapeHtml(cm.modules?.title || 'a module')}</strong></span>
        <span style="font-size:12px;color:#94a3b8;white-space:nowrap;">${escapeHtml(relativeDayLabel(cm.completed_at))}</span>
      </div>`).join('')
  }
}

function setTab(name) {
  document.querySelectorAll('.prac-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name))
  document.querySelectorAll('.prac-tab-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== name))
  if (name === 'plan') setDoc(activeDoc)
}

// ============================================================
// Render: Goal progress (Data & Insights)
// ============================================================
function renderGoalProgressPanel() {
  const el = document.getElementById('goalProgressPanel')
  if (!selectedClient) return
  const goals = goalsForChild(selectedClient.child_id)
  const active = goals.filter(g => g.status === 'in_progress')
  const complete = goals.filter(g => g.status === 'complete')

  if (goals.length === 0) {
    el.innerHTML = `
      <div class="prac-empty small">
        <p class="prac-empty-sub">No goals set for this client yet. Add one in the <strong>Goals &amp; Behaviours</strong> tab and link it to focus areas — completed modules will count toward it automatically.</p>
      </div>`
    return
  }

  const goalCard = (g) => {
    const contributing = g.contributing_modules || []
    const skills = g.skills || []
    const remaining = g.target_modules ? Math.max(0, g.target_modules - Number(g.progress_count)) : null
    const statusChip = g.status === 'complete'
      ? '<span class="prac-chip prac-chip-green">Complete</span>'
      : goalAtTarget(g)
        ? '<span class="prac-chip prac-chip-green">Target reached — review</span>'
        : goalReviewOverdue(g)
          ? '<span class="prac-chip prac-chip-amber">Review overdue</span>'
          : '<span class="prac-chip prac-chip-blue">In progress</span>'

    return `
      <div class="prac-goal-progress-card">
        <div class="prac-item-top">
          <p class="prac-item-title">${escapeHtml(g.goal_text)}</p>
          ${statusChip}
        </div>
        <div class="prac-item-tags">${tagChips(g.tags)}</div>
        ${goalProgressBar(g) || `<p class="prac-cc-goal-meta">No module target set — tracked by: ${escapeHtml(g.measure || 'practitioner review')}</p>`}
        ${skills.length > 0 ? `<p class="prac-goal-skills">Counts modules from: ${skills.map(s => `${s.emoji || ''} ${escapeHtml(s.name)}`).join(', ')}</p>` : ''}
        ${contributing.length > 0 ? `
          <div class="prac-goal-contrib">
            <p class="prac-goal-contrib-head">Modules that counted</p>
            ${contributing.slice(0, 5).map(m => `
              <div class="prac-goal-contrib-row">
                <span>${escapeHtml(m.title)}</span>
                <span>${m.skill_name ? escapeHtml(m.skill_name) + ' · ' : ''}${m.completed_at ? new Date(m.completed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}</span>
              </div>`).join('')}
            ${contributing.length > 5 ? `<p class="prac-cc-goal-meta">+ ${contributing.length - 5} more</p>` : ''}
          </div>` : `<p class="prac-cc-goal-meta" style="margin-top:8px;">No modules have counted yet${skills.length > 0 ? ' — progress starts when new modules from the areas above are completed' : ''}.</p>`}
        ${remaining !== null && remaining > 0 && g.status === 'in_progress' ? `<p class="prac-goal-remaining">${remaining} module${remaining === 1 ? '' : 's'} to go.</p>` : ''}
      </div>`
  }

  el.innerHTML =
    active.map(goalCard).join('') +
    (complete.length > 0 ? `
      <details class="prac-goal-completed-group">
        <summary>${complete.length} completed goal${complete.length === 1 ? '' : 's'}</summary>
        ${complete.map(goalCard).join('')}
      </details>` : '')
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
    const avg = clientWeeklyCheckins.reduce((s, w) => s + w.intensity, 0) / clientWeeklyCheckins.length
    avgIntensity = avg.toFixed(1) + ' / 5'
  }

  // Most common challenge
  let topChallenge = '—'
  if (clientWeeklyCheckins.length > 0) {
    const freq = {}
    clientWeeklyCheckins.forEach(w => { if (w.challenge) freq[w.challenge] = (freq[w.challenge] || 0) + 1 })
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0) topChallenge = sorted[0][0]
  }

  // Most common triggers/feelings
  let topTriggers = '—'
  if (clientWeeklyCheckins.length > 0) {
    const freq = {}
    clientWeeklyCheckins.forEach(w => { (w.triggers || []).forEach(t => { freq[t] = (freq[t] || 0) + 1 }) })
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

// How the client's completed work spreads across Super Skills
function renderSkillCoverage() {
  const el = document.getElementById('skillCoverage')
  if (!el) return
  if (superSkills.length === 0 || clientModules.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;padding:8px 0;">No module data yet.</p>'
    return
  }

  const rows = superSkills.map(s => {
    const assigned = clientModules.filter(m => m.modules?.super_skill_id === s.id)
    const completed = assigned.filter(m => m.is_completed)
    return { skill: s, assigned: assigned.length, completed: completed.length }
  }).filter(r => r.assigned > 0)

  if (rows.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;padding:8px 0;">No modules assigned across Super Skills yet.</p>'
    return
  }

  el.innerHTML = rows.map(r => {
    const pct = r.assigned > 0 ? Math.round((r.completed / r.assigned) * 100) : 0
    return `
      <div class="prac-skill-row">
        <span class="prac-skill-name">${r.skill.emoji || ''} ${escapeHtml(r.skill.name)}</span>
        <div class="prac-progress-track" style="flex:1;"><div class="prac-progress-fill" style="width:${pct}%;background:${r.skill.theme_color || '#405878'};"></div></div>
        <span class="prac-skill-count">${r.completed}/${r.assigned}</span>
      </div>`
  }).join('')
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
function renderTagPicker() {
  const el = document.getElementById('gTagPicker')
  if (!el) return
  if (tags.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;">Focus areas are unavailable right now.</p>'
    return
  }
  el.innerHTML = tags.map(t => `
    <button type="button" class="prac-tag-option ${selectedGoalTagIds.has(t.id) ? 'selected' : ''}" data-tag-id="${t.id}" title="${escapeHtml(t.description || '')}">
      ${escapeHtml(t.name)}
    </button>`).join('')
}

function renderGoals() {
  const el = document.getElementById('goalList')
  if (!selectedClient) return
  const goals = goalsForChild(selectedClient.child_id)

  if (goals.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;">No goals set yet. Add a goal and link it to focus areas — completed modules will count toward it automatically.</p>'
    return
  }

  el.innerHTML = goals.map(g => {
    const review = g.review_date ? `Review: ${new Date(g.review_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}` : ''
    const contributing = g.contributing_modules || []
    const isComplete = g.status === 'complete'
    const statusChip = isComplete
      ? '<span class="prac-chip prac-chip-green">Complete</span>'
      : goalAtTarget(g)
        ? '<span class="prac-chip prac-chip-green">Target reached</span>'
        : goalReviewOverdue(g)
          ? '<span class="prac-chip prac-chip-amber">Review overdue</span>'
          : '<span class="prac-chip prac-chip-amber">In progress</span>'

    return `
      <div class="prac-item ${isComplete ? 'prac-item-complete' : ''}">
        <div class="prac-item-top">
          <div style="flex:1;">
            <p class="prac-item-title">${escapeHtml(g.goal_text)}</p>
            <p class="prac-item-meta">${[review, g.measure].filter(Boolean).map(escapeHtml).join(' · ')}</p>
          </div>
          <button class="prac-del" data-goal-id="${g.goal_id}">Remove</button>
        </div>
        <div class="prac-item-tags">${tagChips(g.tags)}${statusChip}</div>
        ${goalProgressBar(g)}
        ${contributing.length > 0 ? `
          <details class="prac-goal-detail">
            <summary>${contributing.length} module${contributing.length === 1 ? '' : 's'} counted</summary>
            ${contributing.map(m => `
              <div class="prac-goal-contrib-row">
                <span>${escapeHtml(m.title)}</span>
                <span>${m.completed_at ? new Date(m.completed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}</span>
              </div>`).join('')}
          </details>` : ''}
        <div class="prac-goal-actions">
          ${isComplete
            ? `<button class="prac-btn prac-btn-ghost prac-btn-sm" data-reopen-goal="${g.goal_id}">Reopen</button>`
            : `<button class="prac-btn prac-btn-ghost prac-btn-sm" data-complete-goal="${g.goal_id}">Mark complete</button>`}
        </div>
      </div>`
  }).join('')
}

// Split a one-item-per-line field into trimmed, non-empty lines
function behaviourLines(text) {
  return (text || '').split('\n').map(l => l.trim()).filter(Boolean)
}

// Does this behaviour carry any behaviour-plan detail beyond the basics?
function hasBehaviourDetail(b) {
  return Object.values(BEHAVIOUR_DETAIL_FIELDS).some(col => b[col])
}

function renderBehaviours() {
  const el = document.getElementById('behaviourList')
  if (clientBehaviours.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;">No behaviours recorded yet.</p>'
    return
  }

  const lineList = (label, text) => {
    const lines = behaviourLines(text)
    if (lines.length === 0) return ''
    return `<p class="prac-bx-mini-head">${label}</p><ul class="prac-bx-mini-list">${lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
  }
  const para = (label, text) => text ? `<p class="prac-bx-mini-head">${label}</p><p class="prac-bx-mini-para">${escapeHtml(text)}</p>` : ''

  el.innerHTML = clientBehaviours.map(b => `
    <div class="prac-item">
      <div class="prac-item-top">
        <div>
          <p class="prac-item-title">${escapeHtml(b.description)}</p>
          <p class="prac-item-meta">${escapeHtml(b.setting || '')}</p>
        </div>
        <button class="prac-del" data-behaviour-id="${b.id}">Remove</button>
      </div>
      <div class="prac-item-tags">
        ${b.baseline ? `<span class="prac-chip prac-chip-amber">Baseline: ${escapeHtml(b.baseline)}</span>` : ''}
        ${b.behaviour_function ? `<span class="prac-chip prac-chip-blue">Function: ${escapeHtml(b.behaviour_function)}</span>` : ''}
        ${b.review_date ? `<span class="prac-chip prac-chip-blue">Review ${new Date(b.review_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>` : ''}
      </div>
      ${hasBehaviourDetail(b) ? `
        <details class="prac-goal-detail">
          <summary>Behaviour plan detail</summary>
          ${para('Operational definition', b.definition)}
          ${lineList('This looks like', b.looks_like)}
          ${lineList('This does not include', b.not_included)}
          ${lineList('Setting events', b.setting_events)}
          ${lineList('Antecedents / triggers', b.antecedents)}
          ${para('What typically follows', b.consequences)}
          ${lineList('What works', b.what_works)}
          ${lineList('What doesn\'t', b.what_doesnt)}
          ${lineList('Proactive strategies', b.proactive_strategies)}
          ${lineList('Response — early signs', b.response_early)}
          ${lineList('Response — escalation', b.response_escalation)}
          ${lineList('Response — recovery', b.response_recovery)}
          ${para('Data source', b.data_source)}
        </details>` : ''}
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
// Render: Support Plan (printable document)
// ============================================================
function renderSupportPlan() {
  if (!selectedClient) return
  const c = selectedClient
  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const completedModules = clientModules.filter(m => m.is_completed)
  const goals = goalsForChild(c.child_id)

  const bxList = (title, text, cls = '') => {
    const lines = behaviourLines(text)
    if (lines.length === 0) return ''
    return `
      <div class="prac-bx-panel ${cls}">
        <h5>${title}</h5>
        <ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
      </div>`
  }
  const bxTags = (title, lede, text) => {
    const lines = behaviourLines(text)
    if (lines.length === 0) return ''
    return `
      <div class="prac-bx-sub">
        <h5>${title}</h5>
        <p class="prac-bx-lede">${lede}</p>
        <div class="prac-bx-tagline">${lines.map(l => `<span class="prac-bx-tag">${escapeHtml(l)}</span>`).join('')}</div>
      </div>`
  }

  // A behaviour with plan detail prints as a full behaviour-plan block;
  // one without falls back to the original single line.
  const behaviourBlock = (b) => {
    if (!hasBehaviourDetail(b)) {
      return `<p class="prac-plan-item">${escapeHtml(b.description)}${b.setting ? ` — <em>${escapeHtml(b.setting)}</em>` : ''}${b.baseline ? ` (baseline: ${escapeHtml(b.baseline)})` : ''}</p>`
    }

    const definitionCols = (behaviourLines(b.looks_like).length || behaviourLines(b.not_included).length)
      ? `<div class="prac-bx-cols">${bxList('This looks like', b.looks_like, 'green')}${bxList('This does not include', b.not_included, 'red')}</div>`
      : ''

    const consequenceHtml = (b.consequences || b.behaviour_function) ? `
      <div class="prac-bx-sub">
        <h5>Consequence analysis</h5>
        ${b.consequences ? `<p class="prac-bx-lede">${escapeHtml(b.consequences)}</p>` : ''}
        ${b.behaviour_function ? `<p class="prac-bx-lede"><strong>Likely function:</strong> ${escapeHtml(b.behaviour_function)}</p>` : ''}
      </div>` : ''

    const worksCols = (behaviourLines(b.what_works).length || behaviourLines(b.what_doesnt).length)
      ? `<div class="prac-bx-sub"><h5>What works and what doesn't</h5>
         <div class="prac-bx-cols">${bxList('What works', b.what_works, 'green')}${bxList('What doesn\'t', b.what_doesnt, 'red')}</div></div>`
      : ''

    const proactiveLines = behaviourLines(b.proactive_strategies)
    const proactiveHtml = proactiveLines.length ? `
      <div class="prac-bx-sub">
        <h5>Proactive strategies</h5>
        <ul class="prac-bx-list">${proactiveLines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
      </div>` : ''

    const stage = (title, cls, text) => {
      const lines = behaviourLines(text)
      if (lines.length === 0) return ''
      return `
        <div class="prac-bx-stage ${cls}">
          <div class="prac-bx-stage-head"><span class="prac-bx-dot"></span><h5>${title}</h5></div>
          <ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
        </div>`
    }
    const stagesHtml = (b.response_early || b.response_escalation || b.response_recovery) ? `
      <div class="prac-bx-sub">
        <h5>Response strategies</h5>
        <div class="prac-bx-stages">
          ${stage('Early signs', 'calm', b.response_early)}
          ${stage('Escalation', 'rise', b.response_escalation)}
          ${stage('Recovery', 'after', b.response_recovery)}
        </div>
      </div>` : ''

    const reviewBits = [
      b.data_source ? `Data source: <strong>${escapeHtml(b.data_source)}</strong>` : null,
      b.baseline ? `Baseline: <strong>${escapeHtml(b.baseline)}</strong>` : null,
      b.review_date ? `Next review: <strong>${new Date(b.review_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>` : null
    ].filter(Boolean)

    return `
      <div class="prac-bx-block">
        <div class="prac-bx-banner">
          <span class="prac-bx-name">${escapeHtml(b.description)}${b.setting ? ` <em>· ${escapeHtml(b.setting)}</em>` : ''}</span>
          ${b.baseline ? `<span class="prac-bx-baseline">Baseline: ${escapeHtml(b.baseline)}</span>` : ''}
        </div>
        ${b.definition ? `<div class="prac-bx-sub"><h5>Operational definition</h5><p class="prac-bx-lede">${escapeHtml(b.definition)}</p></div>` : ''}
        ${definitionCols}
        ${bxTags('Setting events', 'Conditions that make an incident more likely on a given day — they lower the threshold rather than trigger the behaviour.', b.setting_events)}
        ${bxTags('Antecedents / triggers', 'What typically happens immediately before an incident.', b.antecedents)}
        ${consequenceHtml}
        ${worksCols}
        ${proactiveHtml}
        ${stagesHtml}
        ${reviewBits.length ? `<div class="prac-bx-review">${reviewBits.map(r => `<span>${r}</span>`).join('')}</div>` : ''}
      </div>`
  }

  const behaviourHtml = clientBehaviours.length > 0
    ? clientBehaviours.map(behaviourBlock).join('')
    : '<p class="prac-plan-item">None recorded.</p>'

  const goalsHtml = goals.length > 0
    ? goals.map(g => {
        const areas = (g.tags || []).map(t => t.name).join(', ')
        const progress = g.target_modules
          ? `${g.progress_count} of ${g.target_modules} modules completed since goal set`
          : null
        const bits = [
          areas ? `Focus: ${areas}` : null,
          progress,
          g.status === 'complete' ? 'Complete' : 'In progress',
          g.review_date ? `review ${g.review_date}` : null
        ].filter(Boolean).join(' · ')
        return `<p class="prac-plan-item">${escapeHtml(g.goal_text)}${bits ? ` — <em>${escapeHtml(bits)}</em>` : ''}</p>`
      }).join('')
    : '<p class="prac-plan-item">None set.</p>'

  const skillNames = [...new Set(completedModules.map(m => {
    const s = superSkills.find(x => x.id === m.modules?.super_skill_id)
    return s?.name
  }).filter(Boolean))]

  document.getElementById('planDoc').innerHTML = `
    <div class="prac-plan-head">
      <div>
        <h3>Support plan — ${escapeHtml(c.child_name || 'Client')}</h3>
        <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${c.child_age ? 'Age ' + c.child_age : ''}${c.parent_name ? ' · Parent: ' + escapeHtml(c.parent_name) : ''}</p>
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
      <p class="prac-plan-item">${completedModules.length} modules completed · ${c.current_streak || 0}-day streak · Level ${c.child_level || 1} (${c.child_total_xp || 0} XP).</p>
      <p class="prac-plan-item">${c.child_stars || 0} stars earned lifetime.</p>
      ${skillNames.length > 0 ? `<p class="prac-plan-item">Super Skills covered: ${skillNames.map(escapeHtml).join(', ')}.</p>` : ''}
    </div>

    <div class="prac-plan-section app-data">
      <h4>Practitioner note</h4>
      <p style="font-size:12px;color:#6b7280;margin:0;">App data reflects engagement and self-report only. Clinical formulation, interpretation and treatment decisions sit with the practitioner and are not generated by Daniel's Diaries.</p>
    </div>`
}

// ============================================================
// Render: NDIS recommendation letter
// ============================================================
function letterheadKey() {
  return `dd_prac_letterhead_${currentUser?.id || 'anon'}`
}

// Letterhead lives in the database (practitioner_settings) so credentials,
// business details and ABN follow the practitioner across devices.
// localStorage is kept as an offline fallback and migrated up on first load.
async function loadLetterhead() {
  let local = {}
  try { local = JSON.parse(localStorage.getItem(letterheadKey()) || '{}') } catch { /* ignore */ }

  try {
    const { data, error } = await supabase
      .from('practitioner_settings')
      .select('letterhead')
      .eq('practitioner_user_id', currentUser.id)
      .maybeSingle()
    if (error) throw error
    if (data?.letterhead && Object.keys(data.letterhead).length > 0) {
      letterhead = data.letterhead
    } else if (Object.keys(local).length > 0) {
      // Migrate device-local letterhead up to the database once.
      letterhead = local
      supabase.from('practitioner_settings').upsert(
        { practitioner_user_id: currentUser.id, letterhead: local },
        { onConflict: 'practitioner_user_id' }
      ).then(() => {})
    } else {
      letterhead = {}
    }
  } catch {
    letterhead = local // offline / pre-migration fallback
  }

  const fields = { lhRole: 'role', lhBusiness: 'business', lhAbn: 'abn', lhNdisId: 'ndisId', lhContact: 'contact' }
  Object.entries(fields).forEach(([id, key]) => {
    const el = document.getElementById(id)
    if (el) el.value = letterhead[key] || ''
  })
}

function saveLetterhead() {
  letterhead = {
    role: document.getElementById('lhRole').value.trim(),
    business: document.getElementById('lhBusiness').value.trim(),
    abn: document.getElementById('lhAbn').value.trim(),
    ndisId: document.getElementById('lhNdisId').value.trim(),
    contact: document.getElementById('lhContact').value.trim()
  }
  try { localStorage.setItem(letterheadKey(), JSON.stringify(letterhead)) } catch { /* private mode */ }
  supabase.from('practitioner_settings').upsert(
    { practitioner_user_id: currentUser.id, letterhead },
    { onConflict: 'practitioner_user_id' }
  ).then(({ error }) => {
    if (error) console.warn('Letterhead cloud save failed (kept locally):', error.message)
  })
}

// Per-client letter details (diagnosis, functional impact, plan goal…).
// Device-local: this is sensitive clinical detail the practitioner types for
// one letter, so it stays on their machine rather than in the app database.
const LETTER_CLIENT_FIELDS = {
  lcDiagnosis: 'diagnosis',
  lcParticipant: 'participant',
  lcImpact: 'impact',
  lcPlanGoal: 'planGoal',
  lcSince: 'since',
  lcContext: 'context',
  lcTier: 'tier',
  lcReview: 'review'
}
let letterClient = {}

function letterClientKey() {
  return `dd_prac_letter_${currentUser?.id || 'anon'}_${selectedClient?.child_id || 'none'}`
}

function loadLetterClient() {
  try { letterClient = JSON.parse(localStorage.getItem(letterClientKey()) || '{}') } catch { letterClient = {} }
  Object.entries(LETTER_CLIENT_FIELDS).forEach(([id, key]) => {
    const el = document.getElementById(id)
    if (el) el.value = letterClient[key] || ''
  })
}

function saveLetterClient() {
  letterClient = {}
  Object.entries(LETTER_CLIENT_FIELDS).forEach(([id, key]) => {
    const el = document.getElementById(id)
    if (el) letterClient[key] = el.value.trim()
  })
  try { localStorage.setItem(letterClientKey(), JSON.stringify(letterClient)) } catch { /* private mode */ }
}

function setDoc(name) {
  activeDoc = name
  document.querySelectorAll('.prac-doc-tab').forEach(t => t.classList.toggle('active', t.dataset.doc === name))
  document.getElementById('planDoc').classList.toggle('hidden', name !== 'plan')
  document.getElementById('letterDoc').classList.toggle('hidden', name !== 'letter')
  document.getElementById('letterDetails').classList.toggle('hidden', name !== 'letter')
  document.getElementById('summaryDoc').classList.toggle('hidden', name !== 'summary')
  document.getElementById('summaryDetails').classList.toggle('hidden', name !== 'summary')
  if (name === 'letter') {
    loadLetterClient()
    renderLetter()
  } else if (name === 'summary') {
    populateSummaryForm()
    renderProgressSummaryDoc()
  } else {
    renderSupportPlan()
  }
}

// ============================================================
// Render: Progress summary (Family Gold share)
// ============================================================
const SUMMARY_FIELDS = {
  sumPeriod: 'period_label',
  sumCheckin: 'next_checkin',
  sumGreen: 'weather_green',
  sumYellow: 'weather_yellow',
  sumRed: 'weather_red',
  sumStory: 'story',
  sumStronger: 'roads_stronger',
  sumResting: 'roads_resting',
  sumNext: 'building_next',
  sumTryHome: 'try_at_home'
}

function populateSummaryForm() {
  Object.entries(SUMMARY_FIELDS).forEach(([id, col]) => {
    const el = document.getElementById(id)
    if (el) el.value = progressSummary?.[col] || ''
  })
  const shared = document.getElementById('sumShared')
  if (shared) shared.checked = !!progressSummary?.shared_with_family
  const state = document.getElementById('sumSaveState')
  if (state) {
    state.textContent = progressSummary?.updated_at
      ? `Last saved ${new Date(progressSummary.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}${progressSummary.shared_with_family ? ' · shared with the family' : ' · not shared yet'}`
      : 'Not saved yet — it saves automatically as you type.'
  }
}

async function saveSummary() {
  if (!selectedClient) return
  const fields = {}
  Object.entries(SUMMARY_FIELDS).forEach(([id, col]) => {
    fields[col] = document.getElementById(id)?.value.trim() || null
  })
  fields.shared_with_family = !!document.getElementById('sumShared')?.checked
  const state = document.getElementById('sumSaveState')
  try {
    progressSummary = await upsertProgressSummary(selectedClient.child_id, fields)
    if (state) state.textContent = `Saved · ${fields.shared_with_family ? 'shared with the family' : 'not shared yet'}`
  } catch (err) {
    console.error('Save summary error:', err)
    if (state) state.textContent = 'Could not save — check your connection and try again.'
    showToast('Could not save the progress summary. If this keeps happening, the database may need the latest update.', 'error')
  }
}

// Seed → Street → Motorway → City Planner, matching how the program
// describes skill acquisition. Staying at Seed is still progress.
function summaryLevel(done, total) {
  if (!total || done === 0) return '—'
  const pct = done / total
  if (pct >= 1) return 'City Planner'
  if (pct >= 0.7) return 'Motorway'
  if (pct >= 0.35) return 'Street'
  return 'Seed'
}

function renderProgressSummaryDoc() {
  if (!selectedClient) return
  const c = selectedClient
  const childName = escapeHtml((c.child_name || 'Your child').split(/\s+/)[0])
  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const s = progressSummary || {}

  const skillRows = superSkills.map(sk => {
    const assigned = clientModules.filter(m => m.modules?.super_skill_id === sk.id)
    const done = assigned.filter(m => m.is_completed).length
    const pct = assigned.length ? Math.round((done / assigned.length) * 100) : 0
    return `
      <div class="prac-sum-row">
        <span class="prac-sum-skill">${sk.emoji || ''} ${escapeHtml(sk.name)}</span>
        <div class="prac-progress-track" style="flex:1;"><div class="prac-progress-fill" style="width:${pct}%;background:${sk.theme_color || '#405878'};"></div></div>
        <span class="prac-sum-count">${done} of ${assigned.length}</span>
        <span class="prac-sum-level">${summaryLevel(done, assigned.length)}</span>
      </div>`
  }).join('')

  const weatherRow = (label, cls, text) => text ? `
    <div class="prac-sum-weather ${cls}">
      <span class="prac-sum-weather-dot"></span>
      <div><strong>${label}</strong><p>${escapeHtml(text)}</p></div>
    </div>` : ''

  const strongerLines = behaviourLines(s.roads_stronger)
  const narrative = (title, html) => html ? `<div class="prac-plan-section"><h4>${title}</h4>${html}</div>` : ''
  const paras = (text) => (text || '').split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => `<p class="prac-sum-para">${escapeHtml(l)}</p>`).join('')

  document.getElementById('summaryDoc').innerHTML = `
    <div class="prac-plan-head">
      <div>
        <h3>${childName}'s town, right now</h3>
        <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">Family Gold · From your practitioner${s.period_label ? ` · Covering ${escapeHtml(s.period_label)}` : ''}</p>
      </div>
      <div class="prac-plan-meta">
        Daniel's Diaries Progress Summary<br>
        ${escapeHtml(practitionerProfile?.full_name || 'Practitioner')}<br>
        ${today}
      </div>
    </div>

    <div class="prac-plan-section">
      <h4>The Super Skills, at a glance</h4>
      ${skillRows || '<p class="prac-plan-item">No modules assigned yet.</p>'}
      <p class="prac-sum-legend">Levels follow how skills are actually acquired: Seed (noticing and naming) → Street (practising on purpose) → Motorway (using it smoothly) → City Planner (owning and teaching it). Staying at Seed for as long as Seed is needed is progress.</p>
    </div>

    ${(s.weather_green || s.weather_yellow || s.weather_red) ? `
      <div class="prac-plan-section">
        <h4>Check-in weather this period</h4>
        ${weatherRow('Green days', 'green', s.weather_green)}
        ${weatherRow('Yellow days', 'yellow', s.weather_yellow)}
        ${weatherRow('Red days', 'red', s.weather_red)}
        <p class="prac-sum-legend">The colours come from ${childName}'s own daily Traffic Light check-ins. They are self-reports, not scores — and honest reporting, whatever the colour, is itself the skill working.</p>
      </div>` : ''}

    ${narrative('The story so far', paras(s.story))}
    ${strongerLines.length ? `
      <div class="prac-plan-section">
        <h4>Roads getting stronger</h4>
        <div class="prac-bx-tagline">${strongerLines.map(l => `<span class="prac-bx-tag">${escapeHtml(l)}</span>`).join('')}</div>
      </div>` : ''}
    ${narrative('Roads we\'re resting for now', paras(s.roads_resting))}
    ${narrative('What we\'re building next', paras(s.building_next))}
    ${narrative('One thing to try at home', paras(s.try_at_home))}

    <div class="prac-plan-section">
      <p class="prac-sum-para" style="margin-top:8px;">Warmly,<br><strong>${escapeHtml(practitionerProfile?.full_name || 'Your practitioner')}</strong>${letterhead.role ? ` · ${escapeHtml(letterhead.role)}` : ''}</p>
      ${s.next_checkin ? `<p class="prac-sum-para">We'll check in again around ${escapeHtml(s.next_checkin)} — and if anything here raises questions before then, you can raise it at our next appointment.</p>` : ''}
    </div>

    <div class="prac-plan-section app-data">
      <h4>Practitioner note</h4>
      <p style="font-size:12px;color:#6b7280;margin:0;">Daniel's Diaries is an educational wellbeing tool, not therapy or clinical treatment. This summary reflects app engagement and practitioner observation, written for the family.</p>
    </div>`
}

async function renderLetter() {
  if (!selectedClient) return
  const el = document.getElementById('letterDoc')
  const c = selectedClient
  const childName = (c.child_name || 'the child').split(/\s+/)[0]
  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const pracName = practitionerProfile?.full_name || 'Practitioner'
  const activeGoals = activeGoalsForChild(c.child_id)
  const lc = letterClient
  const tierName = lc.tier ? lc.tier.charAt(0).toUpperCase() + lc.tier.slice(1) : ''

  // Live family pricing so the letter never quotes stale numbers. If a tier
  // is selected, quote that tier's price specifically.
  let priceLine = tierName
    ? `The ${tierName} subscription is a low-cost monthly support`
    : 'A family subscription is a low-cost monthly support'
  try {
    const tiers = await getFamilyTiers()
    const chosen = lc.tier ? tiers.find(t => (t.tier || '').toLowerCase() === lc.tier) : null
    if (chosen && chosen.monthly_price_cents > 0) {
      priceLine = `The ${tierName} subscription is billed at A$${Math.round(chosen.monthly_price_cents / 100)} per month`
    } else {
      const prices = tiers.map(t => t.monthly_price_cents).filter(p => p > 0)
      if (prices.length > 0) {
        const min = Math.round(Math.min(...prices) / 100)
        const max = Math.round(Math.max(...prices) / 100)
        priceLine = min === max
          ? `A family subscription costs A$${min} per month`
          : `A family subscription costs between A$${min} and A$${max} per month, depending on the plan the family selects`
      }
    }
  } catch { /* keep generic line */ }

  const goalItems = activeGoals.map(g => {
    const areas = (g.tags || []).map(t => t.name).join(', ')
    const skills = (g.skills || []).map(s => s.name).join(', ')
    const detail = [
      areas ? `focus: ${areas}` : null,
      skills ? `supported by the ${skills} program area${(g.skills || []).length === 1 ? '' : 's'}` : null
    ].filter(Boolean).join('; ')
    return `<li>${escapeHtml(g.goal_text)}${detail ? ` <em>(${escapeHtml(detail)})</em>` : ''}</li>`
  }).join('')

  const goalsBlock = activeGoals.length > 0
    ? `<p>Within the program, these are the goals I am currently working on with ${escapeHtml(childName)}:</p>
       <ul>${goalItems}</ul>
       <p>Daniel's Diaries lets me see which modules ${escapeHtml(childName)} completes and how they count toward these goals between sessions, making structured home practice part of ${escapeHtml(childName)}'s support.</p>`
    : `<p class="prac-letter-note">Tip: add an active goal for this client to include their specific goals in this letter.</p>`

  // Paragraph 1 — who you are and the context of your involvement
  const roleIntro = letterhead.role ? `a ${escapeHtml(letterhead.role)}` : 'a practitioner'
  const involvement = [
    lc.since ? `since ${escapeHtml(lc.since)}` : null,
    lc.context ? `in the context of ${escapeHtml(lc.context)}` : null
  ].filter(Boolean).join(' ')
  const p1 = `I am ${roleIntro} and I have been working with ${escapeHtml(childName)}${involvement ? ' ' + involvement : ''}.`

  // Paragraph 2 — functional impact of the disability, and the plan goal
  const impactBits = []
  if (lc.diagnosis) impactBits.push(`${escapeHtml(childName)} lives with ${escapeHtml(lc.diagnosis)}.`)
  if (lc.impact) impactBits.push(`In day-to-day terms, this means ${escapeHtml(childName)} finds it hard to ${escapeHtml(lc.impact)}.`)
  if (lc.planGoal) impactBits.push(`${escapeHtml(childName)}'s current NDIS plan includes the goal of ${escapeHtml(lc.planGoal)}.`)
  const p2 = impactBits.join(' ')
  const impactTip = !p2
    ? `<p class="prac-letter-note">Tip: fill in the diagnosis, functional impact and plan goal above. Plan managers now expect the letter to name the functional impact — not just the diagnosis — and tie it to a goal that is actually in the plan.</p>`
    : ''

  // Paragraph 3 — the recommendation and why this program addresses the impact
  const p3 = `To support ${lc.planGoal ? 'this goal' : escapeHtml(childName)}, I recommend a ${tierName ? `<strong>${escapeHtml(tierName)}</strong> ` : ''}subscription to
    <strong>Daniel's Diaries</strong> — a structured, evidence-informed psychoeducation program that teaches
    children emotional regulation, resilience and social understanding through guided weekly modules completed
    with adult support. The program gives ${escapeHtml(childName)} structured weekly practice in the skills described above,
    complements the supports already in place and extends practice between sessions; it does not replace clinical services.`

  // Paragraph 4 — value for money and review period
  const reviewSentence = lc.review
    ? ` I suggest an initial period of ${escapeHtml(lc.review)}, after which I will review ${escapeHtml(childName)}'s progress and advise whether continuing is warranted.`
    : ''
  const p4 = `${priceLine}, which represents strong value for money against the cost of additional
    clinician-delivered sessions targeting the same skills.${reviewSentence}`

  const headerBits = [
    letterhead.business ? escapeHtml(letterhead.business) : null,
    escapeHtml(pracName) + (letterhead.role ? `, ${escapeHtml(letterhead.role)}` : ''),
    letterhead.abn ? `ABN ${escapeHtml(letterhead.abn)}` : null,
    letterhead.ndisId ? `NDIS practitioner ID ${escapeHtml(letterhead.ndisId)}` : null,
    letterhead.contact ? escapeHtml(letterhead.contact) : null
  ].filter(Boolean).join('<br>')

  const reLine = `Re: ${escapeHtml(c.child_name || childName)}${lc.participant ? ` — NDIS participant ${escapeHtml(lc.participant)}` : ''}`

  el.innerHTML = `
    <div class="prac-plan-head">
      <div>
        <h3>Recommendation — Daniel's Diaries</h3>
        <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${reLine}</p>
      </div>
      <div class="prac-plan-meta">${headerBits}<br>${today}</div>
    </div>

    <div class="prac-plan-section prac-letter-body">
      <p>To whom it may concern,</p>
      <p>${p1}</p>
      ${p2 ? `<p>${p2}</p>` : ''}
      ${impactTip}
      <p>${p3}</p>
      ${goalsBlock}
      <p>${p4}</p>
      <p>
        This recommendation is provided as my professional opinion for consideration against
        ${escapeHtml(childName)}'s plan, goals and available budget. Families who self-manage or plan-manage their
        NDIS funding commonly purchase low-cost supports of this kind; the family's plan manager can confirm
        claimability under their individual plan.
      </p>
      <p>Please contact me if you require any further information.</p>
      <p style="margin-top:34px;">Kind regards,</p>
      <div class="prac-letter-signature">
        <div class="prac-letter-sigline"></div>
        <p><strong>${escapeHtml(pracName)}</strong>${letterhead.role ? `<br>${escapeHtml(letterhead.role)}` : ''}${letterhead.business ? `<br>${escapeHtml(letterhead.business)}` : ''}${letterhead.contact ? `<br>${escapeHtml(letterhead.contact)}` : ''}</p>
      </div>
    </div>

    <div class="prac-plan-section app-data">
      <h4>About Daniel's Diaries</h4>
      <p style="font-size:12px;color:#6b7280;margin:0;">
        Daniel's Diaries is an educational wellbeing tool informed by evidence-based principles. It is not therapy
        or clinical treatment. Progress data reflects engagement and self-report only. More information for plan
        managers: danielsdiaries.com/ndis-funding.html · info@danielsdiaries.com
      </p>
    </div>`
}

// ============================================================
// Render: Plan & Billing view
// ============================================================
function formatPrice(cents, currency) {
  const amount = Math.round(cents / 100)
  const prefix = (currency || 'aud').toLowerCase() === 'aud' ? 'A$' : '$'
  return `${prefix}${amount}`
}

async function renderPlanView() {
  const summaryEl = document.getElementById('planSummary')
  const gridEl = document.getElementById('planGrid')

  if (!planUsage) {
    try { planUsage = await getPlanUsage() } catch { /* handled below */ }
  }
  if (plans.length === 0) {
    try { plans = await getPlans() } catch { /* handled below */ }
  }

  if (!planUsage) {
    summaryEl.innerHTML = '<div class="prac-panel"><p style="font-size:14px;color:#6b7280;">Plan information is unavailable right now. Please try again later.</p></div>'
    gridEl.innerHTML = ''
    document.getElementById('inviteList').innerHTML = ''
    return
  }

  const pct = Math.min(100, Math.round((planUsage.active_clients / planUsage.included_clients) * 100))
  const statusPill = planUsage.trial_expired
    ? '<span class="prac-chip prac-chip-amber">Trial ended</span>'
    : planUsage.status === 'trialing'
      ? '<span class="prac-chip prac-chip-blue">Free trial</span>'
      : planUsage.status === 'active'
        ? '<span class="prac-chip prac-chip-green">Active</span>'
        : `<span class="prac-chip prac-chip-amber">${escapeHtml(planUsage.status)}</span>`

  const trialLine = planUsage.status === 'trialing' && !planUsage.trial_expired
    ? `<p class="prac-plan-usage-note">Trial ends ${new Date(planUsage.trial_ends_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}. Everything stays saved when you choose a plan.</p>`
    : ''

  // A paid (or previously paid) practitioner has a Stripe customer and can
  // self-manage via the billing portal; everyone else gets checkout buttons.
  const isPaid = planUsage.status === 'active' || planUsage.status === 'past_due'

  summaryEl.innerHTML = `
    <div class="prac-panel prac-plan-summary">
      <div class="prac-plan-summary-head">
        <div>
          <p class="prac-plan-summary-name">${escapeHtml(planUsage.plan_name)} plan ${statusPill}</p>
          <p class="prac-plan-summary-price">${formatPrice(planUsage.monthly_price_cents, planUsage.currency)}/month${planUsage.status === 'trialing' ? ' after trial' : ''}</p>
        </div>
        ${isPaid
          ? '<button class="prac-btn prac-btn-primary prac-btn-sm" id="managePlanBtn">Manage billing</button>'
          : ''}
      </div>
      <div class="prac-plan-usage">
        <div class="prac-plan-usage-row">
          <span>Active clients</span>
          <span><strong>${planUsage.active_clients}</strong> of ${planUsage.included_clients} included</span>
        </div>
        <div class="prac-progress-track"><div class="prac-progress-fill ${pct >= 100 ? 'full' : ''}" style="width:${pct}%"></div></div>
        <div class="prac-plan-usage-row" style="margin-top:10px;">
          <span>Pending invites</span>
          <span><strong>${planUsage.pending_invites}</strong></span>
        </div>
      </div>
      ${trialLine}
      <p class="prac-plan-usage-note">Payments are handled securely by Stripe. Cancel any time — your caseload, goals and notes are never deleted. Questions? <a href="mailto:${SUPPORT_EMAIL}?subject=Practitioner plan">Email us</a>.</p>
    </div>`

  const manageBtn = document.getElementById('managePlanBtn')
  if (manageBtn) {
    manageBtn.addEventListener('click', async () => {
      manageBtn.disabled = true
      manageBtn.textContent = 'Opening…'
      try {
        await openBillingPortal()
      } catch (err) {
        console.error('Billing portal error:', err)
        manageBtn.disabled = false
        manageBtn.textContent = 'Manage billing'
        showToast('Could not open billing. Please try again or email us.', 'error')
      }
    })
  }

  gridEl.innerHTML = plans.map(p => {
    const isCurrent = p.code === planUsage.plan_code
    const isCurrentPaid = isCurrent && planUsage.status === 'active'
    const cta = isCurrentPaid
      ? '<button class="prac-btn prac-btn-ghost prac-btn-sm" disabled style="width:100%;">Current plan</button>'
      : `<button class="prac-btn prac-btn-primary prac-btn-sm" data-choose-plan="${escapeHtml(p.code)}" style="width:100%;">${planUsage.status === 'active' ? (p.monthly_price_cents > planUsage.monthly_price_cents ? 'Upgrade' : 'Switch') : 'Choose'} ${escapeHtml(p.display_name)}</button>`
    return `
      <div class="prac-plan-card ${isCurrent ? 'current' : ''}">
        ${isCurrent ? '<span class="prac-plan-card-badge">Your plan</span>' : ''}
        <p class="prac-plan-card-name">${escapeHtml(p.display_name)}</p>
        <p class="prac-plan-card-price">${formatPrice(p.monthly_price_cents, p.currency)}<span>/month</span></p>
        <ul class="prac-plan-card-list">
          <li>Up to <strong>${p.included_clients}</strong> active clients</li>
          <li>${p.practitioner_seats > 1 ? `Up to <strong>${p.practitioner_seats}</strong> practitioner logins` : 'One practitioner login'}</li>
          <li>Goals with automatic module tracking</li>
          <li>Printable support plans</li>
        </ul>
        <p class="prac-plan-card-desc">${escapeHtml(p.description || '')}</p>
        ${cta}
      </div>`
  }).join('')

  gridEl.querySelectorAll('[data-choose-plan]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = btn.dataset.choosePlan
      btn.disabled = true
      btn.textContent = 'Taking you to payment…'
      try {
        await startPlanCheckout(code)
      } catch (err) {
        console.error('Plan checkout error:', err)
        btn.disabled = false
        btn.textContent = 'Try again'
        showToast('Could not start checkout. Please try again or email us.', 'error')
      }
    })
  })

  await renderInviteList()
}

async function renderInviteList() {
  const el = document.getElementById('inviteList')
  try {
    invites = await getInvites()
  } catch {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;">Invites are unavailable right now.</p>'
    return
  }

  const pending = invites.filter(i => i.status === 'pending' && new Date(i.expires_at) > new Date())
  if (pending.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#6b7280;">No pending invites. Use "+ Add Client" on the Caseload page to invite a family.</p>'
    return
  }

  el.innerHTML = pending.map(i => `
    <div class="prac-item">
      <div class="prac-item-top">
        <div>
          <p class="prac-item-title" style="font-family:monospace;letter-spacing:1px;">${escapeHtml(i.invite_code)}</p>
          <p class="prac-item-meta">${i.family_email ? escapeHtml(i.family_email) + ' · ' : ''}Expires ${new Date(i.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="prac-btn prac-btn-ghost prac-btn-sm" data-copy-invite="${escapeHtml(i.invite_code)}">Copy link</button>
          <button class="prac-del" data-revoke-invite="${i.id}">Revoke</button>
        </div>
      </div>
    </div>`).join('')
}

// ============================================================
// Render: Resources
// ============================================================
// Featured resources sit above the grid: Meet Your Brain Town underpins the
// whole program and the Super Skills Map shows how the skills link together,
// so practitioners are pointed at those two before anything else.
const FEATURED_RESOURCES = [
  { title: 'Meet Your Brain Town', desc: 'The key resource that underpins the whole Daniel\'s Diaries program — the Brain Town model, the crew, and the language children learn to use about their own minds.', tag: 'Read this first', color: '#405878', href: '/resources/meet-your-brain-town.pdf', kind: 'PDF workbook' },
  { title: 'Super Skills Map', desc: 'How all the Super Skills link together — the roadmap that connects every module and workbook below into one program.', tag: 'Read this first', color: '#2f9c8d', href: '/resources/super-skills-map.html', kind: 'Guide' }
]

const RESOURCE_TOPICS = [
  { title: 'Practitioner Guide to the Super Skills Roadmap', desc: 'Written for Practitioner Hub accounts: how to use the Super Skills sequence in your clinical work, session by session.', tag: 'Practitioner', color: '#22364e', href: '/resources/practitioner-guide-super-skills.html', kind: 'Guide' },
  { title: 'Practitioner Companion — The Decoder', desc: 'The practitioner version of the Parent\'s Decoder: the brain story behind what kids say, and how to work with it in session.', tag: 'Practitioner', color: '#22364e', href: '/resources/practitioner-companion.pdf', kind: 'PDF guide' },
  { title: 'The Parent\'s Decoder', desc: 'Five things kids say and what they actually mean — share with families alongside the "Does This Sound Like Me?" conversation.', tag: 'For families', color: '#8a6d00', href: '/resources/parents-decoder.pdf', kind: 'PDF guide' },
  { title: 'Traffic Light Check-In — Parent Guide', desc: 'The daily thirty-second check-in: fridge card, the brain story behind each colour, and what to say back. Pairs with the What\'s My Road Today worksheet.', tag: 'For families', color: '#8a6d00', href: '/resources/traffic-light-parent-guide.pdf', kind: 'PDF guide' },
  { title: 'Understanding Emotions', desc: 'The Emotion Navigator — help children build a vocabulary for their feelings and recognise body cues.', tag: 'Emotional Awareness', color: '#f46b6b', href: '/resources/understanding-emotions.html', kind: 'Explainer workbook' },
  { title: 'Building Resilience', desc: 'Tools and activities for developing coping strategies and bounce-back skills.', tag: 'Resilience', color: '#f4a73b', href: '/resources/building-resilience.pdf', kind: 'PDF workbook' },
  { title: 'Social Skills & Friendships', desc: 'Navigating peer relationships, conflict resolution, and teamwork.', tag: 'Social Skills', color: '#4caf50', href: '/resources/social-skills-friendships.pdf', kind: 'PDF workbook' },
  { title: 'Managing Anxiety', desc: 'Practical strategies for when worries feel too big, including breathing and grounding.', tag: 'Anxiety', color: '#35a4d4', href: '/resources/managing-anxiety.html', kind: 'Explainer workbook' },
  { title: 'Self-Awareness', desc: 'Understanding how your brain works and recognising patterns in thinking.', tag: 'Self-Awareness', color: '#ab47bc', href: '/resources/self-awareness.html', kind: 'Explainer workbook' },
  { title: 'Behaviour & Choices', desc: 'The connection between feelings, thoughts and actions, and making good choices.', tag: 'Behaviour', color: '#40916c', href: '/resources/behaviour-and-choices.pdf', kind: 'PDF workbook' },
  { title: 'NDIS Plans & Daniel\'s Diaries', desc: 'Where the subscription fits in a plan, what plan managers look for in 2026, and how to make a claim as clean as possible.', tag: 'Funding', color: '#405878', href: '/resources/ndis-plans-and-daniels-diaries.html', kind: 'Guide' },
  { title: 'NDIS Recommendation Letter — Template', desc: 'The one-page letter template that makes the reasonable-and-necessary link. A pre-filled version is also generated in each client\'s Support Plan tab.', tag: 'Funding', color: '#8a6d00', href: '/resources/ndis-recommendation-letter-template.html', kind: 'Template' }
]

function resourceCard(r, featured = false) {
  const card = `
    <div class="prac-guide ${featured ? 'prac-guide-featured' : ''}">
      <div class="prac-guide-band" style="background:linear-gradient(135deg,${r.color},${r.color}cc);">${r.title}</div>
      <div class="prac-guide-body">
        <p>${r.desc}</p>
        <div class="prac-guide-foot">
          <span class="prac-guide-tag ${featured ? 'prac-guide-tag-featured' : ''}">${r.tag}</span>
          <span class="prac-guide-kind">${r.kind} · opens in new tab</span>
        </div>
      </div>
    </div>`
  return `<a href="${r.href}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;">${card}</a>`
}

function renderResources() {
  const featuredEl = document.getElementById('resourceFeatured')
  if (featuredEl) featuredEl.innerHTML = FEATURED_RESOURCES.map(r => resourceCard(r, true)).join('')
  document.getElementById('resourceGrid').innerHTML = RESOURCE_TOPICS.map(r => resourceCard(r)).join('')
}

// ============================================================
// Event listeners
// ============================================================
function openAddClientModal() {
  document.getElementById('addClientModal').classList.remove('hidden')
  document.getElementById('searchEmail').value = ''
  document.getElementById('searchResults').innerHTML = ''
  document.getElementById('searchError').classList.add('hidden')
  document.getElementById('inviteEmail').value = ''
  document.getElementById('inviteResult').innerHTML = ''
  document.getElementById('inviteError').classList.add('hidden')
  setAddClientMode('invite')
}

function setAddClientMode(mode) {
  document.querySelectorAll('.prac-modal-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode))
  document.getElementById('inviteMode').classList.toggle('hidden', mode !== 'invite')
  document.getElementById('searchMode').classList.toggle('hidden', mode !== 'search')
}

function inviteLink(code) {
  return `${window.location.origin}/signup.html?invite=${code}`
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function setupEventListeners() {
  // Nav buttons
  document.querySelectorAll('.prac-nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view))
  })

  // View the selected client's dashboard as their practitioner (read-only)
  document.getElementById('viewClientDashboardBtn')?.addEventListener('click', () => {
    if (!selectedClient) return
    window.location.href = `/dashboard.html?childId=${selectedClient.child_id}&pracView=1`
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

  // Overview quick actions
  document.getElementById('overviewAddClientBtn')?.addEventListener('click', openAddClientModal)
  document.getElementById('ovEmptyInviteBtn')?.addEventListener('click', () => {
    openAddClientModal()
    setAddClientMode('invite')
  })
  document.getElementById('qaInviteFamily')?.addEventListener('click', () => {
    openAddClientModal()
    setAddClientMode('invite')
  })
  document.getElementById('qaExploreApp')?.addEventListener('click', () => {
    window.location.href = '/landing.html'
  })
  document.getElementById('qaResources')?.addEventListener('click', () => setView('resources'))

  // Add client modal
  document.getElementById('addClientBtn').addEventListener('click', openAddClientModal)
  document.getElementById('closeAddClientBtn').addEventListener('click', () => {
    document.getElementById('addClientModal').classList.add('hidden')
  })
  document.querySelectorAll('.prac-modal-tab').forEach(t => {
    t.addEventListener('click', () => setAddClientMode(t.dataset.mode))
  })

  // Create invite
  document.getElementById('createInviteBtn').addEventListener('click', handleCreateInvite)

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
    const form = document.getElementById('addGoalForm')
    form.classList.toggle('hidden')
    if (!form.classList.contains('hidden')) renderTagPicker()
  })
  document.getElementById('submitGoal').addEventListener('click', handleAddGoal)

  // Tag picker (delegated)
  document.getElementById('gTagPicker').addEventListener('click', (e) => {
    const btn = e.target.closest('.prac-tag-option')
    if (!btn) return
    const id = btn.dataset.tagId
    if (selectedGoalTagIds.has(id)) selectedGoalTagIds.delete(id)
    else selectedGoalTagIds.add(id)
    btn.classList.toggle('selected')
  })

  // Add note
  document.getElementById('submitNote').addEventListener('click', handleAddNote)

  // Print plan
  document.getElementById('printPlanBtn').addEventListener('click', () => {
    setTab('plan')
    setTimeout(() => window.print(), 100)
  })

  // Document switcher (support plan / NDIS letter)
  document.querySelectorAll('.prac-doc-tab').forEach(t => {
    t.addEventListener('click', () => setDoc(t.dataset.doc))
  })

  // Letterhead details: persist and refresh the letter as they type
  let letterheadTimeout = null
  ;['lhRole', 'lhBusiness', 'lhAbn', 'lhNdisId', 'lhContact'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      clearTimeout(letterheadTimeout)
      letterheadTimeout = setTimeout(() => {
        saveLetterhead()
        if (activeDoc === 'letter') renderLetter()
      }, 300)
    })
  })

  // Per-client letter details: persist per child and refresh the letter
  let letterClientTimeout = null
  Object.keys(LETTER_CLIENT_FIELDS).forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    const handler = () => {
      clearTimeout(letterClientTimeout)
      letterClientTimeout = setTimeout(() => {
        saveLetterClient()
        if (activeDoc === 'letter') renderLetter()
      }, 300)
    }
    el.addEventListener('input', handler)
    el.addEventListener('change', handler)
  })

  // Progress summary: auto-save as they type, refresh the document live
  let summaryTimeout = null
  Object.keys(SUMMARY_FIELDS).forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      clearTimeout(summaryTimeout)
      const state = document.getElementById('sumSaveState')
      if (state) state.textContent = 'Saving…'
      summaryTimeout = setTimeout(async () => {
        await saveSummary()
        if (activeDoc === 'summary') renderProgressSummaryDoc()
      }, 600)
    })
  })
  document.getElementById('sumShared')?.addEventListener('change', async () => {
    clearTimeout(summaryTimeout)
    await saveSummary()
    if (progressSummary) {
      showToast(progressSummary.shared_with_family
        ? 'Progress summary shared — the family will see it on their Family Gold dashboard.'
        : 'Progress summary is no longer shared with the family.', 'success')
    }
  })

  // Delegated clicks: deletes, goal status, invites, plan link
  document.addEventListener('click', (e) => {
    const gotoPlan = e.target.closest('[data-goto-plan]')
    if (gotoPlan) {
      e.preventDefault()
      setView('plan')
      return
    }
    const goalDel = e.target.closest('[data-goal-id]')
    if (goalDel && e.target.classList.contains('prac-del')) {
      handleDeleteGoal(goalDel.dataset.goalId)
      return
    }
    const completeBtn = e.target.closest('[data-complete-goal]')
    if (completeBtn) {
      handleGoalStatus(completeBtn.dataset.completeGoal, 'complete')
      return
    }
    const reopenBtn = e.target.closest('[data-reopen-goal]')
    if (reopenBtn) {
      handleGoalStatus(reopenBtn.dataset.reopenGoal, 'in_progress')
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
    const copyBtn = e.target.closest('[data-copy-invite]')
    if (copyBtn) {
      copyText(inviteLink(copyBtn.dataset.copyInvite)).then(ok => {
        copyBtn.textContent = ok ? 'Copied!' : 'Copy failed'
        setTimeout(() => { copyBtn.textContent = 'Copy link' }, 1500)
      })
      return
    }
    const revokeBtn = e.target.closest('[data-revoke-invite]')
    if (revokeBtn) {
      handleRevokeInvite(revokeBtn.dataset.revokeInvite)
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
async function handleCreateInvite() {
  const errorEl = document.getElementById('inviteError')
  const resultEl = document.getElementById('inviteResult')
  const email = document.getElementById('inviteEmail').value.trim()
  errorEl.classList.add('hidden')

  try {
    const invite = await createInvite(email)
    const link = inviteLink(invite.invite_code)
    resultEl.innerHTML = `
      <div class="prac-invite-result">
        <p class="prac-invite-code">${escapeHtml(invite.invite_code)}</p>
        <p class="prac-invite-hint">Share this code or link with the family. New families sign up with it; existing families just open the link and sign in.</p>
        <p class="prac-invite-hint">NDIS-funded family? Once they're linked, you can generate a recommendation letter from their Support Plan tab to help them claim the subscription.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="prac-btn prac-btn-primary prac-btn-sm" data-copy-invite="${escapeHtml(invite.invite_code)}">Copy link</button>
          <a class="prac-btn prac-btn-ghost prac-btn-sm" href="mailto:${encodeURIComponent(invite.family_email || '')}?subject=${encodeURIComponent("Your Daniel's Diaries invite")}&body=${encodeURIComponent(`Hi,\n\nI'd like to use Daniel's Diaries with your child as part of our work together. Use this link to get set up:\n\n${link}\n\nYour invite code is ${invite.invite_code} (valid for 30 days).`)}">Email it</a>
        </div>
      </div>`
    try { planUsage = await getPlanUsage() } catch { /* non-fatal */ }
  } catch (err) {
    console.error('Create invite error:', err)
    errorEl.textContent = err.message || 'Could not create invite. Please try again.'
    errorEl.classList.remove('hidden')
  }
}

async function handleRevokeInvite(inviteId) {
  try {
    await revokeInvite(inviteId)
    await renderInviteList()
  } catch (err) {
    console.error('Revoke invite error:', err)
  }
}

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
      errorEl.textContent = 'No family found with that email address. Try the "Invite a family" tab instead.'
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
            <div class="prac-search-child-detail">${child.child_age ? 'Age ' + child.child_age : ''}${child.parent_name ? ' · Parent: ' + escapeHtml(child.parent_name) : ''}</div>
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
    await refreshCaseload()
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
    await refreshCaseload()
  } catch (err) {
    console.error('Remove error:', err)
  }
}

const BEHAVIOUR_DETAIL_FIELDS = {
  bDefinition: 'definition',
  bLooksLike: 'looks_like',
  bNotIncluded: 'not_included',
  bSettingEvents: 'setting_events',
  bAntecedents: 'antecedents',
  bConsequences: 'consequences',
  bFunction: 'behaviour_function',
  bWhatWorks: 'what_works',
  bWhatDoesnt: 'what_doesnt',
  bProactive: 'proactive_strategies',
  bRespEarly: 'response_early',
  bRespEscalation: 'response_escalation',
  bRespRecovery: 'response_recovery',
  bDataSource: 'data_source',
  bReviewDate: 'review_date'
}

async function handleAddBehaviour() {
  if (!selectedClient) return
  const desc = document.getElementById('bDesc').value.trim()
  if (!desc) return

  const base = {
    description: desc,
    setting: document.getElementById('bSetting').value.trim(),
    baseline: document.getElementById('bBaseline').value.trim()
  }
  // Only send detail columns that were filled in, so the quick-add path
  // still works on databases without the behaviour-plan migration.
  const detail = {}
  Object.entries(BEHAVIOUR_DETAIL_FIELDS).forEach(([id, col]) => {
    const val = document.getElementById(id)?.value.trim()
    if (val) detail[col] = val
  })

  try {
    try {
      await addBehaviour(selectedClient.child_id, { ...base, ...detail })
    } catch (err) {
      // Detail columns missing (migration not applied yet) — save the basics.
      const missingColumn = Object.keys(detail).length > 0 &&
        (err?.code === 'PGRST204' || err?.code === '42703' || /column/i.test(err?.message || ''))
      if (!missingColumn) throw err
      await addBehaviour(selectedClient.child_id, base)
      showToast('Saved the behaviour, but the plan-detail fields need the latest database update.', 'error')
    }
    document.getElementById('bDesc').value = ''
    document.getElementById('bSetting').value = ''
    document.getElementById('bBaseline').value = ''
    Object.keys(BEHAVIOUR_DETAIL_FIELDS).forEach(id => {
      const el = document.getElementById(id)
      if (el) el.value = ''
    })
    document.getElementById('behaviourDetailForm')?.removeAttribute('open')
    document.getElementById('addBehaviourForm').classList.add('hidden')
    clientBehaviours = await getClientBehaviours(selectedClient.child_id)
    renderBehaviours()
  } catch (err) {
    console.error('Add behaviour error:', err)
    showToast(err.message || 'Could not save the behaviour. Please try again.', 'error')
  }
}

async function handleAddGoal() {
  if (!selectedClient) return
  const errorEl = document.getElementById('gError')
  errorEl.classList.add('hidden')

  const stmt = document.getElementById('gStmt').value.trim()
  if (!stmt) {
    errorEl.textContent = 'Please write a goal statement.'
    errorEl.classList.remove('hidden')
    return
  }
  if (selectedGoalTagIds.size === 0) {
    errorEl.textContent = 'Pick at least one focus area so module progress can be tracked.'
    errorEl.classList.remove('hidden')
    return
  }

  const targetVal = document.getElementById('gTarget').value

  try {
    await addGoal(selectedClient.child_id, {
      goal_text: stmt,
      target_modules: targetVal ? Number(targetVal) : null,
      review_date: document.getElementById('gReview').value || null,
      measure: document.getElementById('gMeasure').value.trim()
    }, [...selectedGoalTagIds])

    document.getElementById('gStmt').value = ''
    document.getElementById('gReview').value = ''
    document.getElementById('gMeasure').value = ''
    document.getElementById('gTarget').value = '3'
    selectedGoalTagIds = new Set()
    document.getElementById('addGoalForm').classList.add('hidden')

    await refreshGoalProgress()
    renderGoals()
    renderGoalProgressPanel()
  } catch (err) {
    console.error('Add goal error:', err)
    errorEl.textContent = err.message || 'Could not save the goal. Please try again.'
    errorEl.classList.remove('hidden')
  }
}

async function handleGoalStatus(goalId, status) {
  try {
    await updateGoalStatus(goalId, status)
    await refreshGoalProgress()
    renderGoals()
    renderGoalProgressPanel()
  } catch (err) {
    console.error('Goal status error:', err)
  }
}

async function handleDeleteGoal(goalId) {
  try {
    await deleteGoal(goalId)
    await refreshGoalProgress()
    renderGoals()
    renderGoalProgressPanel()
  } catch (err) {
    console.error('Delete goal error:', err)
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
