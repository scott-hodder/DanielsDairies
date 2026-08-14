import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHALLENGE_ROTATION,
  getDailyChallengeGameId,
  getReflectionFor,
  localDateString
} from '../src/features/dashboard/arcadeLoopCore.js'

test('challenge rotation has exactly the 10 registered games', () => {
  assert.equal(CHALLENGE_ROTATION.length, 10)
  assert.equal(new Set(CHALLENGE_ROTATION).size, 10)
})

test('daily challenge matches the SQL rule (DOY % 10, 1-indexed array in SQL)', () => {
  // SQL: (EXTRACT(DOY FROM date) % 10) + 1 into a 1-indexed array.
  // JS mirrors with a 0-indexed array: CHALLENGE_ROTATION[doy % 10].
  // Both sides use the child's LOCAL calendar date — the client sends
  // localDateString() to record_arcade_play, which passes it to
  // arcade_daily_challenge_game(), so local Date constructors here mirror
  // what the SQL function will receive.
  const jan1 = new Date(2026, 0, 1) // DOY 1 → SQL index 2 → JS index 1
  assert.equal(getDailyChallengeGameId(jan1), CHALLENGE_ROTATION[1])

  const jan10 = new Date(2026, 0, 10) // DOY 10 → 10 % 10 = 0 → JS index 0
  assert.equal(getDailyChallengeGameId(jan10), CHALLENGE_ROTATION[0])
})

test('challenge is stable within a local day and changes across days', () => {
  const d1 = new Date(2026, 6, 4, 0, 30, 0)
  const d1Later = new Date(2026, 6, 4, 23, 30, 0)
  const d2 = new Date(2026, 6, 5)
  assert.equal(getDailyChallengeGameId(d1), getDailyChallengeGameId(d1Later))
  assert.notEqual(getDailyChallengeGameId(d1), getDailyChallengeGameId(d2))
})

test('localDateString formats the local calendar date the SQL date type expects', () => {
  assert.equal(localDateString(new Date(2026, 0, 5)), '2026-01-05')
  assert.equal(localDateString(new Date(2026, 11, 31, 23, 59, 59)), '2026-12-31')
  // Just after local midnight still belongs to the new local day.
  assert.equal(localDateString(new Date(2026, 6, 6, 0, 0, 1)), '2026-07-06')
})

test('every registered game has a reflection prompt with tappable options', () => {
  for (const gameId of CHALLENGE_ROTATION) {
    const reflection = getReflectionFor(gameId)
    assert.ok(reflection.question.length > 10, `${gameId} question`)
    assert.ok(reflection.options.length >= 3, `${gameId} options`)
  }
})

test('unknown games get a safe fallback reflection', () => {
  const reflection = getReflectionFor('not-a-game')
  assert.ok(reflection.question)
  assert.ok(reflection.options.length > 0)
})
