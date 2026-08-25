import { supabase } from '../../supabaseClient.js'
import { showElement, hideElement } from '../../utils/dom.js'
import { dashboardState } from '../../state/dashboardState.js'

const state = dashboardState

export const MOOD_CHECKIN_COOLDOWN_MS = 2 * 60 * 60 * 1000
export const DANIEL_MOOD_OPTIONS = [
  { score: 1, emoji: '😢', label: 'Very sad', shortLabel: 'very sad', description: 'I need extra comfort today.' },
  { score: 2, emoji: '😣', label: 'Frustrated', shortLabel: 'frustrated', description: 'Everything feels a bit too much.' },
  { score: 2, emoji: '😟', label: 'Worried', shortLabel: 'worried', description: 'My tummy or thoughts feel wobbly.' },
  { score: 3, emoji: '😐', label: 'Okay-ish', shortLabel: 'okay-ish', description: 'I am somewhere in the middle.' },
  { score: 4, emoji: '😌', label: 'Calm', shortLabel: 'calm', description: 'My body feels settled and safe.' },
  { score: 5, emoji: '😄', label: 'Happy', shortLabel: 'happy', description: 'I feel bright, smiley, and ready.' }
]
export const DANIEL_COOLDOWN_QUOTES = [
  'Every feeling is welcome here - even the wobbly ones.',
  'Small feelings can still be important feelings.',
  'A slow breath can help your body feel a little safer.',
  'You do not have to fix every feeling straight away.',
  'Talking about feelings is a brave thing to do.',
  'You are growing every time you notice how you feel.'
]

let latestMoodCheckin = null

function getMoodTextElement() {
  return document.getElementById('moodText')
}

function getDanielMoodModalElements() {
  return {
    overlay: document.getElementById('danielMoodModal'),
    title: document.getElementById('danielMoodTitle'),
    subtitle: document.getElementById('danielMoodSubtitle'),
    kicker: document.getElementById('danielMoodKicker'),
    options: document.getElementById('danielMoodOptions'),
    footer: document.getElementById('danielMoodFooter'),
    close: document.getElementById('closeDanielMoodModal')
  }
}

function getRandomDanielQuote() {
  return DANIEL_COOLDOWN_QUOTES[Math.floor(Math.random() * DANIEL_COOLDOWN_QUOTES.length)]
}

function getMoodOptionByScore(score) {
  return DANIEL_MOOD_OPTIONS.find(option => option.score === score) || null
}

function formatTimeRemaining(ms) {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours && minutes) return `${hours}h ${minutes}m`
  if (hours) return `${hours}h`
  return `${minutes}m`
}

async function getLatestMoodCheckin(childId) {
  if (!childId) return null
  const { data, error } = await supabase
    .from('child_mood_checkins')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data || null
}

function getMoodCooldownState(checkin = latestMoodCheckin) {
  if (!checkin?.created_at) {
    return { canRate: true, msRemaining: 0, nextRatingAt: null }
  }

  const nextRatingAt = new Date(new Date(checkin.created_at).getTime() + MOOD_CHECKIN_COOLDOWN_MS)
  const msRemaining = nextRatingAt.getTime() - Date.now()
  return {
    canRate: msRemaining <= 0,
    msRemaining: Math.max(0, msRemaining),
    nextRatingAt
  }
}

function getDanielPromptText() {
  if (!state.selectedChild) return 'Tap me to share how you feel right now!'

  const cooldown = getMoodCooldownState()
  if (cooldown.canRate) {
    return 'Tap me to share how you feel right now!'
  }

  const mood = getMoodOptionByScore(latestMoodCheckin?.mood_score)
  const prefix = mood ? `You picked ${mood.emoji} earlier.` : 'Checked in!'
  return `${prefix} Tap me for a kind quote!`
}

export function updateMoodHeroText() {
  const moodText = getMoodTextElement()
  if (moodText) moodText.textContent = getDanielPromptText()
}

export async function refreshMoodCheckinState(childId = state.selectedChild?.id) {
  if (!childId) {
    latestMoodCheckin = null
    updateMoodHeroText()
    return
  }

  try {
    latestMoodCheckin = await getLatestMoodCheckin(childId)
  } catch (error) {
    latestMoodCheckin = null
    console.error('Error loading latest mood check-in:', error)
  }

  updateMoodHeroText()
}

export function closeDanielMoodModal() {
  const { overlay } = getDanielMoodModalElements()
  if (!overlay) return
  hideElement(overlay)
  overlay.setAttribute('aria-hidden', 'true')
}

function showDanielMoodModalLocked() {
  const { overlay, title, subtitle, kicker, options, footer } = getDanielMoodModalElements()
  if (!overlay || !title || !subtitle || !kicker || !options || !footer) return

  const cooldown = getMoodCooldownState()
  const quote = getRandomDanielQuote()
  kicker.textContent = 'Daniel says'
  title.textContent = 'Thanks for checking in already 🌟'
  subtitle.textContent = `You can rate again in about ${formatTimeRemaining(cooldown.msRemaining)}.`
  options.innerHTML = `<div class="daniel-mood-quote">"${quote}"</div>`
  footer.textContent = 'Come back a little later for another emoji check-in.'
  showElement(overlay)
  overlay.setAttribute('aria-hidden', 'false')
}

function showDanielMoodModalRate() {
  const { overlay, title, subtitle, kicker, options, footer } = getDanielMoodModalElements()
  if (!overlay || !title || !subtitle || !kicker || !options || !footer) return

  kicker.textContent = 'Daniel check-in'
  title.textContent = 'How are you feeling right now?'
  subtitle.textContent = 'Tap the emoji that feels the most like you today.'
  options.innerHTML = DANIEL_MOOD_OPTIONS.map(option => `
    <button type="button" class="daniel-mood-option" data-score="${option.score}" aria-label="${option.label}">
      <span class="daniel-mood-option-emoji">${option.emoji}</span>
      <span class="daniel-mood-option-label">${option.label}</span>
      <span class="daniel-mood-option-copy">${option.description}</span>
    </button>
  `).join('')
  footer.textContent = 'You can do another Daniel check-in in about 2 hours.'
  showElement(overlay)
  overlay.setAttribute('aria-hidden', 'false')
}

async function saveMoodCheckin(score, moodNote) {
  if (!state.selectedChild?.id || !state.currentUser?.id) return

  const mood = getMoodOptionByScore(score)
  const payload = {
    child_id: state.selectedChild.id,
    parent_user_id: state.currentUser.id,
    mood_score: score,
    mood_label: mood?.label || null,
    mood_emoji: mood?.emoji || null
  }
  if (moodNote) payload.mood_note = moodNote.substring(0, 100)

  const { error } = await supabase
    .from('child_mood_checkins')
    .insert([payload])

  if (error) throw error
}

async function handleDanielMoodOptionClick(score) {
  const { title, subtitle, options, footer } = getDanielMoodModalElements()

  // Show optional note step
  const mood = getMoodOptionByScore(score)
  if (title) title.textContent = `${mood?.emoji || ''} ${mood?.label || 'Got it!'}`
  if (subtitle) subtitle.textContent = 'Want to add a quick note? (optional)'
  if (options) {
    options.style.display = 'flex'
    options.style.flexDirection = 'column'
    options.style.gridTemplateColumns = 'unset'
    options.innerHTML = `
      <div style="width:100%; padding: 4px 0;">
        <input type="text" id="danielMoodNote" maxlength="100" placeholder="What's on your mind?" style="width:100%; padding:12px 14px; border:2px solid #e5e7eb; border-radius:10px; font-size:14px; font-family:inherit; outline:none; transition: border-color 0.2s;" onfocus="this.style.borderColor='#405878'" onblur="this.style.borderColor='#e5e7eb'">
        <p style="font-size:11px; color:#9ca3af; margin-top:4px; text-align:right;"><span id="danielMoodNoteCount">0</span>/100</p>
      </div>
      <div style="display:flex; gap:10px; width:100%; margin-top:4px;">
        <button type="button" id="danielMoodSkipNote" style="flex:1; padding:12px; border:2px solid #e5e7eb; border-radius:10px; background:white; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit;">Skip</button>
        <button type="button" id="danielMoodSaveNote" style="flex:1; padding:12px; border:none; border-radius:10px; background:linear-gradient(135deg, #405878, #4c6c96); color:white; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit;">Save</button>
      </div>
    `
    const noteInput = document.getElementById('danielMoodNote')
    const noteCount = document.getElementById('danielMoodNoteCount')
    if (noteInput && noteCount) {
      noteInput.addEventListener('input', () => { noteCount.textContent = noteInput.value.length })
    }

    const saveWithNote = async (note) => {
      if (footer) footer.textContent = 'Saving your feeling...'
      try {
        await saveMoodCheckin(score, note || null)
        await refreshMoodCheckinState()
        if (footer) footer.textContent = `Lovely sharing, ${state.selectedChild?.name || 'friend'}! You picked ${mood?.emoji || ''} ${mood?.shortLabel || ''}.`
        setTimeout(() => closeDanielMoodModal(), 900)
      } catch (error) {
        console.error('Error saving mood check-in:', error)
        if (footer) footer.textContent = 'I could not save that check-in yet. Please try again.'
      }
    }

    document.getElementById('danielMoodSkipNote')?.addEventListener('click', () => saveWithNote(null))
    document.getElementById('danielMoodSaveNote')?.addEventListener('click', () => {
      const note = document.getElementById('danielMoodNote')?.value?.trim() || null
      saveWithNote(note)
    })
    // Allow Enter key to save
    noteInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const note = noteInput.value?.trim() || null
        saveWithNote(note)
      }
    })
  }
  if (footer) footer.textContent = ''
}

async function handleDanielClick() {
  if (!state.selectedChild?.id) return
  // Open instantly from the cached check-in state — the modal itself is the
  // tap feedback. Waiting on the network here made the tap feel dead.
  const showForState = () => {
    if (getMoodCooldownState().canRate) {
      showDanielMoodModalRate()
    } else {
      showDanielMoodModalLocked()
    }
  }
  const staleCanRate = getMoodCooldownState().canRate
  showForState()

  // Refresh in the background; only re-render if the state actually changed
  // and the child hasn't already closed the modal.
  await refreshMoodCheckinState()
  const { overlay } = getDanielMoodModalElements()
  const stillOpen = overlay && !overlay.classList.contains('hidden')
  if (stillOpen && getMoodCooldownState().canRate !== staleCanRate) {
    showForState()
  }
}

export function setupDanielMoodCheckin() {
  const danielCharacter = document.getElementById('danielCharacter')
  const { overlay, close, options } = getDanielMoodModalElements()
  if (!danielCharacter || !overlay || !close || !options || danielCharacter.dataset.moodBound === 'true') return

  danielCharacter.dataset.moodBound = 'true'
  danielCharacter.addEventListener('click', handleDanielClick)
  danielCharacter.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleDanielClick()
    }
  })

  close.addEventListener('click', closeDanielMoodModal)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeDanielMoodModal()
  })
  options.addEventListener('click', (event) => {
    const button = event.target.closest('.daniel-mood-option')
    if (!button) return
    const score = Number(button.dataset.score)
    if (Number.isFinite(score)) handleDanielMoodOptionClick(score)
  })
}
