// Display names for internal identifiers that occasionally reach
// parent/practitioner-facing UI (check-in challenges, activity ids).

const SLUG_DISPLAY_NAMES = {
  'brain-builder': 'Brain Builder',
  'thought-driver': 'Thought Driver',
  'emotion-navigator': 'Emotion Navigator',
  'behaviour-engineer': 'Behaviour Engineer',
  'resilience-architect': 'Resilience Architect',
  'social-mapper': 'Social Mapper',
  'future-designer': 'Future Designer',
  general: 'General wellbeing'
}

/** "social-mapper" -> "Social Mapper"; leaves normal text untouched. */
export function humanizeSlug(value) {
  const raw = String(value == null ? '' : value).trim()
  if (!raw) return raw
  if (SLUG_DISPLAY_NAMES[raw]) return SLUG_DISPLAY_NAMES[raw]
  if (/^[a-z0-9]+([-_][a-z0-9]+)+$/.test(raw)) {
    return raw.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  return raw
}

/** Raw stored answers like "true"/"false" read badly in reports. */
export function humanizeResponseValue(value) {
  const raw = String(value == null ? '' : value).trim()
  if (raw === 'true') return 'Completed'
  if (raw === 'false') return 'Not completed'
  return raw
}

/** "Activity: weather_1" -> "Activity: Weather 1" */
export function humanizeQuestionText(value) {
  const raw = String(value == null ? '' : value).trim()
  const m = raw.match(/^Activity:\s*(\S+)$/i)
  if (m) return `Activity: ${humanizeSlug(m[1])}`
  return raw
}
