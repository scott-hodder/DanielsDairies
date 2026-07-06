// ================================================
// ARCADE LOOP CORE — pure logic, no imports.
// Split from arcadeLoop.js so the Node test suite can verify the daily
// challenge rotation stays in lockstep with the SQL function
// arcade_daily_challenge_game() (migration 20260704003000).
// ================================================

// Must match arcade_daily_challenge_game() in the database. Ordered and
// append-only so the rotation stays stable.
export const CHALLENGE_ROTATION = [
  'shield-sprint', 'calm-river-rapids', 'courage-canyon', 'thought-forest',
  'emotion-ocean', 'kindness-kingdom', 'focus-firefly-forest', 'coping-cave',
  'gratitude-garden', 'breathing-bridge'
]

/**
 * Day-of-year rotation, same rule as the SQL function (DOY % 10).
 * Uses the LOCAL calendar date — the child's day runs midnight to
 * midnight in their own timezone, and record_arcade_play receives the
 * same local date so the server agrees on which game is the challenge.
 */
export function getDailyChallengeGameId(date = new Date()) {
  const start = Date.UTC(date.getFullYear(), 0, 0)
  const doy = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000)
  return CHALLENGE_ROTATION[doy % CHALLENGE_ROTATION.length]
}

/** The local calendar date as YYYY-MM-DD (what record_arcade_play expects). */
export function localDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// One short reflection question per game, tied to its Super Skill focus.
// Options are tappable so young children can answer without typing.
export const REFLECTIONS = {
  'shield-sprint': {
    question: 'Which helpful thought will you keep for a tricky moment?',
    options: ['I can try my best', 'Mistakes help me learn', 'I can ask for help']
  },
  'thought-forest': {
    question: 'What can you do when an unhelpful thought pops up?',
    options: ['Notice it and let it pass', 'Swap it for a helpful one', 'Tell someone about it']
  },
  'calm-river-rapids': {
    question: 'When could pausing and noticing help you in real life?',
    options: ['When I feel rushed', "When I'm getting upset", 'Before a big task']
  },
  'breathing-bridge': {
    question: 'When will you try slow breathing this week?',
    options: ['Before school', "When I'm upset", 'At bedtime']
  },
  'courage-canyon': {
    question: "What's one small brave step you could take this week?",
    options: ['Try something new', 'Put my hand up in class', 'Talk to someone new']
  },
  'emotion-ocean': {
    question: 'How can you tell how someone else is feeling?',
    options: ['Look at their face', 'Listen to their voice', 'Ask them how they feel']
  },
  'kindness-kingdom': {
    question: "What's one kind thing you could do today?",
    options: ['Say something nice', 'Help someone', 'Include someone who is left out']
  },
  'focus-firefly-forest': {
    question: 'When do you need your focus powers the most?',
    options: ['Homework time', 'Listening in class', 'Finishing a job at home']
  },
  'coping-cave': {
    question: 'Which coping tool would you try on a hard day?',
    options: ['Slow breathing', 'Taking a break', 'Talking to someone']
  },
  'gratitude-garden': {
    question: "What's one thing you feel thankful for right now?",
    options: ['My family', 'A friend', 'Something fun I did']
  }
}

export function getReflectionFor(gameId) {
  return REFLECTIONS[gameId] || {
    question: 'What did you practise in that game?',
    options: ['Staying calm', 'Helpful thinking', 'Trying my best']
  }
}
