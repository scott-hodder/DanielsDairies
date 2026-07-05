// ================================================
// ARCADE LEARNING LOOP
// Personal bests, capped daily star rewards, Daniel's challenge of the day,
// and post-game reflections that connect each game back to its Super Skill.
//
// Star rules are enforced SERVER-SIDE by record_arcade_play (5 arcade stars
// per child per day; +1 bonus for the first daily-challenge win) — the client
// only displays what the server decided, so replaying can't farm rewards.
// ================================================

import { getSupabaseClient } from '../../supabaseClient.js'
// Pure logic (challenge rotation, reflection prompts) lives in
// arcadeLoopCore.js so the test suite can import it without a browser env.
export { CHALLENGE_ROTATION, getDailyChallengeGameId, getReflectionFor } from './arcadeLoopCore.js'

/**
 * Record a finished arcade play. Returns the server's decision:
 * { play_id, awarded_stars, daily_stars_used, daily_cap, is_daily_challenge,
 *   personal_best, is_new_best } or null when recording wasn't possible
 * (no real child selected / offline) — the game still ends gracefully.
 */
export async function recordArcadePlay(childId, gameId, { score = 0, success = false } = {}) {
  if (!childId || childId === 'arcade') return null
  try {
    const { data, error } = await getSupabaseClient().rpc('record_arcade_play', {
      p_child_id: childId,
      p_game_id: gameId,
      p_score: Math.max(0, Math.round(score)),
      p_success: !!success
    })
    if (error) throw error
    return data
  } catch (err) {
    console.warn('[arcade] Could not record play:', err)
    return null
  }
}

export async function saveArcadeReflection(playId, reflection) {
  if (!playId || !reflection) return
  try {
    const { error } = await getSupabaseClient().rpc('save_arcade_reflection', {
      p_play_id: playId,
      p_reflection: reflection
    })
    if (error) throw error
  } catch (err) {
    console.warn('[arcade] Could not save reflection:', err)
  }
}

/** Personal bests per game: Map<gameId, { best_score, plays }> */
export async function getArcadeBests(childId) {
  const bests = new Map()
  if (!childId || childId === 'arcade') return bests
  try {
    const { data, error } = await getSupabaseClient().rpc('get_arcade_bests', { p_child_id: childId })
    if (error) throw error
    ;(data || []).forEach(row => bests.set(row.game_id, { best: row.best_score, plays: Number(row.plays) }))
  } catch (err) {
    console.warn('[arcade] Could not load personal bests:', err)
  }
  return bests
}
