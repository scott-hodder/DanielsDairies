import { escapeHtml } from '../../lib/sanitize.js'
import { showElement, hideElement, setLoadingState } from '../../utils/dom.js'
import { dashboardState, setCurrentInsightsSubtab, setCurrentWeeklyPlan } from '../../state/dashboardState.js'
import { saveWeeklyCheckin, getLatestWeeklyPlan, getSettings } from '../../services/databaseService.js'
import { computeCheckinRecommendation } from './parentInsightsEngine.js'
import { supabase } from '../../supabaseClient.js'

const state = dashboardState

// ── Data ──

export const parentScriptsSeed = [
  {
    title: 'Anger (in the moment)',
    context: 'Use when a child is actively angry',
    script: '"I can see you\'re really angry. You\'re not in trouble. I\'m here. Let\'s do 3 slow breaths together."',
    feelings: ['Anger'],
    tool: 'Belly Breathing'
  },
  {
    title: 'Overwhelm (in the moment)',
    context: 'When everything feels "too much"',
    script: '"This feels like too much right now. Let\'s make it smaller. What\'s one tiny next step we can do first?"',
    feelings: ['Overwhelm'],
    tool: 'Fix-It / Accept-It'
  },
  {
    title: 'Worry (reassurance without feeding it)',
    context: 'Validate worry while keeping agency',
    script: '"Thanks for telling me. Worry is trying to protect you. Let\'s take a breath and then we\'ll make a plan."',
    feelings: ['Worry/Anxiety'],
    tool: 'Thought Bubble'
  },
  {
    title: 'After a meltdown (repair)',
    context: 'Debrief once everyone is calm',
    script: '"That was really hard. I\'m glad you\'re safe now. What did your body feel like right before it got too big?"',
    feelings: ['Anger', 'Overwhelm'],
    tool: 'Emotional Identification'
  },
  {
    title: 'Volcano scale prompt',
    context: 'Scale the feeling and choose a step',
    script: '"If your volcano is a 1 to 5 right now, what number are you? What helps you go down by one?"',
    feelings: ['Anger', 'Frustration'],
    tool: 'Volcano Scale'
  },
  {
    title: '5-4-3-2-1 grounding prompt',
    context: 'Bring focus back to the present',
    script: '"Let\'s help your brain come back. Tell me 5 things you can see… now 4 things you can feel…"',
    feelings: ['Overwhelm', 'Worry/Anxiety'],
    tool: '5-4-3-2-1 Grounding'
  },
  {
    title: 'Choice to reduce escalation',
    context: 'Offer co-regulation choices',
    script: '"You can choose: we can sit quietly together for one minute, or we can get a drink of water. Which one helps?"',
    feelings: ['Anger', 'Overwhelm'],
    tool: 'Calming Strategies'
  },
  {
    title: 'Brave step (anxiety)',
    context: 'Encourage brave behavior',
    script: '"Brave doesn\'t mean not scared. Brave means \'I can do it even when I feel scared.\' What\'s a tiny brave step?"',
    feelings: ['Worry/Anxiety'],
    tool: 'Brave Ladder'
  },
  {
    title: 'Emotion naming',
    context: 'Help children identify feelings',
    script: '"Is this anger, worry, sadness, or overwhelm? If it\'s hard to tell, that\'s okay - we\'ll figure it out together."',
    feelings: ['Anger', 'Worry/Anxiety', 'Sadness', 'Overwhelm'],
    tool: 'Emotional Identification'
  },
  {
    title: 'Bedtime reset',
    context: 'Use when nights feel stuck',
    script: '"Your brain is still loud. Let\'s do a calm-down routine: one slow breath, one stretch, one safe thought."',
    feelings: ['Overwhelm', 'Worry/Anxiety'],
    tool: 'Calming Strategies'
  }
]

export const intensityLabels = {
  1: 'Mostly calm',
  2: 'A little wobbly',
  3: 'A few hard moments',
  4: 'Bumpy',
  5: 'Really tough week'
}

const triggerToSkills = {
  Anger: ['Calming Strategies', 'Emotional Identification'],
  Overwhelm: ['Calming Strategies', 'Problem Solving'],
  'Worry/Anxiety': ['Calming Strategies', 'Confidence / Self-belief', 'Problem Solving'],
  Sadness: ['Emotional Identification', 'Problem Solving'],
  Frustration: ['Problem Solving', 'Calming Strategies']
}

export const challengeToDefaultTriggers = {
  'Morning routine': ['Frustration', 'Overwhelm'],
  'School refusal / drop-off': ['Worry/Anxiety', 'Overwhelm'],
  'Homework / focus': ['Frustration', 'Worry/Anxiety'],
  Bedtime: ['Overwhelm', 'Worry/Anxiety'],
  'Sibling conflict': ['Anger', 'Frustration'],
  'Social worries': ['Worry/Anxiety', 'Sadness'],
  'Anger outbursts': ['Anger', 'Frustration'],
  'Sensory overwhelm': ['Overwhelm'],
  Other: ['Anger']
}

const planToolsLibrary = [
  { id: 'volcano_scale', label: 'Volcano Scale (1–5)', description: 'Rate the feeling, then choose one action to lower it by one point.', triggers: ['Anger', 'Frustration'], skills: ['Calming Strategies', 'Emotional Identification'] },
  { id: 'belly_breathing', label: 'Belly Breathing (3 breaths)', description: 'Hands on belly, slow breaths to calm body signals.', triggers: ['Overwhelm', 'Worry/Anxiety'], skills: ['Calming Strategies'] },
  { id: 'grounding_54321', label: '5-4-3-2-1 Grounding', description: 'Use senses to anchor back into the present moment.', triggers: ['Overwhelm', 'Worry/Anxiety'], skills: ['Calming Strategies'] },
  { id: 'thought_bubble', label: 'Thought Bubble', description: 'Name what the brain is saying so you can respond to it.', triggers: ['Worry/Anxiety', 'Sadness'], skills: ['Problem Solving', 'Emotional Identification'] },
  { id: 'brave_ladder', label: 'Brave Ladder', description: 'Break big scary things into tiny brave steps.', triggers: ['Worry/Anxiety'], skills: ['Confidence / Self-belief'] },
  { id: 'fix_accept', label: 'Fix-It / Accept-It Choices', description: 'Decide if this problem can be fixed or if we ride it out.', triggers: ['Frustration', 'Overwhelm'], skills: ['Problem Solving'] },
  { id: 'friend_phrase', label: 'Friendship "Try this phrase"', description: 'Offer wording your child can borrow in social moments.', triggers: ['Social worries', 'Sadness'], skills: ['Social Skills'] }
]

// ── Mutable state ──

let triggerOptions = ['Anger', 'Overwhelm', 'Worry/Anxiety', 'Sadness', 'Frustration']
const selectedTriggers = new Set()

// ── DOM references (resolved lazily) ──

function el(id) { return document.getElementById(id) }

// ── Public API ──

export async function loadCheckinOptions() {
  try {
    const [challRes, goalRes, trigRes] = await Promise.all([
      supabase.from('checkin_challenges').select('label').eq('is_active', true).order('sort_order'),
      supabase.from('checkin_goals').select('label').eq('is_active', true).order('sort_order'),
      supabase.from('checkin_triggers').select('label').eq('is_active', true).order('sort_order'),
    ])

    if (challRes.data && challRes.data.length > 0) {
      const sel = el('checkinChallenge')
      if (sel) {
        sel.innerHTML = '<option value="">Select one</option>' +
          challRes.data.map(c => `<option>${escapeHtml(c.label)}</option>`).join('')
      }
    }

    if (goalRes.data && goalRes.data.length > 0) {
      const sel = el('checkinGoal')
      if (sel) {
        sel.innerHTML = '<option value="">Choose a goal</option>' +
          goalRes.data.map(g => `<option>${escapeHtml(g.label)}</option>`).join('')
      }
    }

    if (trigRes.data && trigRes.data.length > 0) {
      triggerOptions = trigRes.data.map(t => t.label)
    }
  } catch (error) {
    console.error('Error loading check-in options from DB, using defaults:', error)
  }
}

export function setupWeeklyCheckinUI() {
  const weeklyCheckinForm = el('weeklyCheckinForm')
  if (!weeklyCheckinForm) return

  renderParentScriptsList()
  renderTriggerPicker()
  attachIntensityHandlers()

  weeklyCheckinForm.addEventListener('submit', handleWeeklyCheckinSubmit)
}

export function setupParentInsightsSubtabs() {
  const insightsOverviewTab = el('insightsOverviewTab')
  const weeklyCheckinTab = el('weeklyCheckinTab')
  const insightsOverviewPanel = el('insightsOverviewPanel')
  const weeklyCheckinPanel = el('weeklyCheckinPanel')
  if (!insightsOverviewTab || !weeklyCheckinTab || !insightsOverviewPanel || !weeklyCheckinPanel) return

  insightsOverviewTab.addEventListener('click', () => setParentInsightsSubtab('overview'))
  weeklyCheckinTab.addEventListener('click', () => setParentInsightsSubtab('weekly'))

  setParentInsightsSubtab(state.currentInsightsSubtab)
}

export function setParentInsightsSubtab(target) {
  const insightsOverviewTab = el('insightsOverviewTab')
  const weeklyCheckinTab = el('weeklyCheckinTab')
  const insightsOverviewPanel = el('insightsOverviewPanel')
  const weeklyCheckinPanel = el('weeklyCheckinPanel')
  if (!insightsOverviewTab || !weeklyCheckinTab || !insightsOverviewPanel || !weeklyCheckinPanel) return

  setCurrentInsightsSubtab(target === 'weekly' ? 'weekly' : 'overview')
  const showOverview = state.currentInsightsSubtab === 'overview'

  insightsOverviewTab.classList.toggle('active', showOverview)
  weeklyCheckinTab.classList.toggle('active', !showOverview)
  if (showOverview) {
    showElement(insightsOverviewPanel)
    hideElement(weeklyCheckinPanel)
  } else {
    hideElement(insightsOverviewPanel)
    showElement(weeklyCheckinPanel)
  }
}

export async function checkWeeklyCheckinSettings() {
  const weeklyCheckinTab = el('weeklyCheckinTab')
  try {
    const settings = await getSettings()
    if (weeklyCheckinTab && settings.weekly_checkin_enabled === false) {
      weeklyCheckinTab.style.display = 'none'
      if (state.currentInsightsSubtab === 'weekly') {
        setParentInsightsSubtab('overview')
      }
    } else if (weeklyCheckinTab) {
      weeklyCheckinTab.style.display = ''
    }
  } catch (error) {
    console.error('Error checking weekly check-in settings:', error)
    if (weeklyCheckinTab) {
      weeklyCheckinTab.style.display = ''
    }
  }
}

export async function loadLatestWeeklyPlan() {
  if (!state.currentUser || !state.selectedChild) return
  try {
    const latest = await getLatestWeeklyPlan(state.currentUser.id, state.selectedChild.id)
    setCurrentWeeklyPlan(latest?.generated_plan || null)
    renderWeeklyPlan(state.currentWeeklyPlan)
  } catch (error) {
    console.error('Failed to load weekly plan:', error)
  }
}

export function renderWeeklyPlan(plan) {
  const weeklyPlanSummary = el('weeklyPlanSummary')
  const planSkillsEl = el('planSkills')
  const planEmotionsEl = el('planEmotions')
  const planToolsEl = el('planTools')
  const planScriptEl = el('planScript')
  if (!weeklyPlanSummary || !planSkillsEl || !planEmotionsEl || !planToolsEl || !planScriptEl) return

  const planContainer = weeklyPlanSummary.closest('.insights-panel') || weeklyPlanSummary.parentElement

  if (!plan) {
    weeklyPlanSummary.innerHTML = '<p style="margin:4px 0; color:#9ca3af;">Complete a quick check-in to generate a tailored plan.</p>'
    planSkillsEl.innerHTML = ''
    planEmotionsEl.innerHTML = ''
    planToolsEl.innerHTML = ''
    planScriptEl.innerHTML = '<p style="margin:0; color:#9ca3af;">We\'ll surface a script once a plan is created.</p>'
    return
  }

  if (planContainer) {
    planContainer.style.opacity = '0.5'
    planContainer.style.transform = 'scale(0.98)'
    planContainer.style.transition = 'all 0.3s ease'
  }

  setTimeout(() => {
    const intensityText = intensityLabels[plan.intensity] || 'This week'
    // Older stored plans predate recommendations — compute on the fly so the
    // loop closes for them too.
    const recommendation = plan.recommendation || computeCheckinRecommendation(plan)
    weeklyPlanSummary.innerHTML = `
      <p style="margin:4px 0;">${intensityText} • toughest moment: <strong>${escapeHtml(plan.challenge)}</strong></p>
      ${plan.goal ? `<p style="margin:4px 0;">Goal: ${escapeHtml(plan.goal)}</p>` : ''}
      ${plan.summary ? `<p style="margin:4px 0; color:#4b5563;">${escapeHtml(plan.summary)}</p>` : ''}
      ${recommendation ? `
        <div style="margin:10px 0 4px; padding:10px 14px; background:#eef6ff; border:1px solid #cfe3f7; border-radius:12px; display:flex; gap:10px; align-items:flex-start;">
          <img src="/images/characters/Daniel_Thinking.webp" alt="" style="width:34px;height:34px;object-fit:contain;flex-shrink:0;" />
          <p style="margin:0; font-size:13.5px; color:#2b4a6f; line-height:1.55;">${escapeHtml(recommendation.message)}</p>
        </div>` : ''}
    `

    planSkillsEl.innerHTML = renderPlanChips(plan.skills, 'No skills yet')
    planEmotionsEl.innerHTML = renderPlanChips(plan.triggers, 'No focus feelings yet')
    planToolsEl.innerHTML = (plan.tools && plan.tools.length > 0) ? plan.tools.map(tool => `
      <div class="plan-tool-card">
        <h5>${escapeHtml(tool.label)}</h5>
        <p>${escapeHtml(tool.description)}</p>
        <span>Helps with: ${escapeHtml(tool.triggers?.join(', ') || '')}</span>
      </div>
    `).join('') : '<p style="color:#9ca3af;">No tools suggested yet.</p>'

    if (plan.script) {
      planScriptEl.innerHTML = `
        <p style="margin:0 0 6px; font-weight:600;">${escapeHtml(plan.script.title)}</p>
        <p style="margin:0 0 8px; color:#4b5563;">${escapeHtml(plan.script.script)}</p>
        <small>${escapeHtml(plan.script.context)}</small>
      `
    }

    if (planContainer) {
      planContainer.style.opacity = '1'
      planContainer.style.transform = 'scale(1)'
      planContainer.style.boxShadow = '0 0 0 3px rgba(76, 108, 150, 0.2)'
      setTimeout(() => {
        planContainer.style.boxShadow = ''
        planContainer.style.transition = ''
      }, 600)
    }
  }, 400)
}

// ── Private helpers ──

function renderTriggerPicker() {
  const checkinTriggersContainer = el('checkinTriggers')
  if (!checkinTriggersContainer) return
  checkinTriggersContainer.innerHTML = ''

  triggerOptions.forEach(trigger => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'trigger-chip'
    btn.textContent = trigger
    btn.addEventListener('click', () => {
      if (selectedTriggers.has(trigger)) {
        selectedTriggers.delete(trigger)
        btn.classList.remove('selected')
      } else {
        selectedTriggers.add(trigger)
        btn.classList.add('selected')
      }
    })
    checkinTriggersContainer.appendChild(btn)
  })
}

function attachIntensityHandlers() {
  const scaleButtons = document.querySelectorAll('.checkin-scale')
  if (!scaleButtons || scaleButtons.length === 0) return

  scaleButtons.forEach(button => {
    button.addEventListener('click', () => {
      clearIntensityButtonClasses()
      button.classList.add('selected')
      const value = Number(button.getAttribute('data-value'))
      const scaleClass = getIntensityClass(value)
      if (scaleClass) button.classList.add(scaleClass)
      const checkinIntensityInput = el('checkinIntensity')
      if (checkinIntensityInput) checkinIntensityInput.value = value
    })
  })
}

function clearIntensityButtonClasses() {
  document.querySelectorAll('.checkin-scale').forEach(btn => {
    btn.classList.remove('selected', 'scale-low', 'scale-medium', 'scale-high')
  })
}

function getIntensityClass(value) {
  if (!value) return ''
  if (value < 3) return 'scale-low'
  if (value === 3) return 'scale-medium'
  return 'scale-high'
}

async function handleWeeklyCheckinSubmit(e) {
  e.preventDefault()

  if (!state.selectedChild || !state.currentUser) {
    showCheckinMessage('Select a child before submitting a check-in.', 'error')
    return
  }

  const checkinIntensityInput = el('checkinIntensity')
  const checkinChallengeSelect = el('checkinChallenge')
  const checkinGoalSelect = el('checkinGoal')
  const checkinNotesInput = el('checkinNotes')
  const weeklyCheckinForm = el('weeklyCheckinForm')

  const intensity = Number(checkinIntensityInput?.value)
  const challenge = checkinChallengeSelect?.value || ''
  const goal = checkinGoalSelect?.value || ''
  const notes = (checkinNotesInput?.value || '').trim()

  if (!intensity) {
    showCheckinMessage('Please tap a number for "How big were the big feelings?"', 'error')
    return
  }

  if (!challenge) {
    showCheckinMessage('Please choose the hardest moment to manage.', 'error')
    return
  }

  setCheckinLoading(true)

  const triggersArray = selectedTriggers.size > 0
    ? Array.from(selectedTriggers)
    : (challengeToDefaultTriggers[challenge] || ['Anger'])

  const planPayload = generateWeeklyPlan({ intensity, challenge, triggers: triggersArray, goal, notes })

  try {
    const saved = await saveWeeklyCheckin({
      parentUserId: state.currentUser.id,
      childId: state.selectedChild.id,
      intensity,
      challenge,
      triggers: triggersArray,
      goal: goal || null,
      notes: notes || null,
      generatedPlan: planPayload
    })

    setCurrentWeeklyPlan(saved?.generated_plan || planPayload)
    weeklyCheckinForm.reset()
    selectedTriggers.clear()
    renderTriggerPicker()
    checkinIntensityInput.value = ''
    clearIntensityButtonClasses()

    renderWeeklyPlan(state.currentWeeklyPlan)
    const rec = planPayload.recommendation
    showCheckinMessage(
      rec
        ? `Plan saved! Daniel suggests practising ${rec.skillName} this week — see your plan for details.`
        : 'Plan saved! You can view it on the right.',
      'success'
    )
  } catch (error) {
    console.error('Weekly check-in save failed:', error)
    showCheckinMessage(error.message || 'Failed to save check-in. Please try again.', 'error')
  } finally {
    setCheckinLoading(false)
  }
}

function generateWeeklyPlan({ intensity, challenge, triggers, goal, notes }) {
  const uniqueTriggers = Array.from(new Set(triggers))
  const skillSet = new Set()
  uniqueTriggers.forEach(trigger => {
    (triggerToSkills[trigger] || []).forEach(skill => skillSet.add(skill))
  })
  if (skillSet.size === 0) skillSet.add('Emotional Identification')

  const tools = planToolsLibrary.filter(tool =>
    tool.triggers.some(trigger => uniqueTriggers.includes(trigger))
  )
  const planTools = tools.length > 0 ? tools.slice(0, 3) : planToolsLibrary.slice(0, 2)

  const script = parentScriptsSeed.find(item =>
    item.feelings.some(feeling => uniqueTriggers.includes(feeling))
  ) || parentScriptsSeed[0]

  const summary = `This week felt ${intensityLabels[intensity] || 'mixed'} during ${challenge.toLowerCase()}. Focus on ${goal || 'one calm habit'} while supporting ${uniqueTriggers.join(', ')}.`

  // Close the loop: the check-in visibly influences what the app recommends.
  const recommendation = computeCheckinRecommendation({ challenge, triggers: uniqueTriggers })

  return { intensity, challenge, triggers: uniqueTriggers, goal: goal || null, notes: notes || null, skills: Array.from(skillSet), tools: planTools, script, summary, recommendation }
}

function renderPlanChips(items = [], emptyText = '') {
  if (!items || items.length === 0) {
    return emptyText ? `<p style="color:#9ca3af;">${emptyText}</p>` : ''
  }
  return items.map(item => `<span class="plan-chip">${escapeHtml(item)}</span>`).join('')
}

function renderParentScriptsList() {
  const parentScriptsList = el('parentScriptsList')
  if (!parentScriptsList) return
  parentScriptsList.innerHTML = parentScriptsSeed.map(script => `
    <div class="script-card">
      <h4>${script.title}</h4>
      <p>${script.script}</p>
      <small>${script.context}</small>
    </div>
  `).join('')
}

function showCheckinMessage(message, type = 'success') {
  const checkinMessage = el('checkinMessage')
  if (!checkinMessage) return
  checkinMessage.textContent = message
  checkinMessage.style.display = 'block'
  checkinMessage.style.color = type === 'success' ? '#198754' : '#c02626'
}

function setCheckinLoading(isLoading) {
  const checkinSubmitButton = el('checkinSubmitButton')
  const checkinSubmitText = el('checkinSubmitText')
  const checkinSubmitSpinner = el('checkinSubmitSpinner')
  if (!checkinSubmitButton) return
  setLoadingState(checkinSubmitButton, checkinSubmitText, checkinSubmitSpinner, isLoading)
}
