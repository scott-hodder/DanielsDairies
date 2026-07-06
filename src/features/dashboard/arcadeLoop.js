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
export { CHALLENGE_ROTATION, getDailyChallengeGameId, getReflectionFor, localDateString } from './arcadeLoopCore.js'
import { localDateString as localDate } from './arcadeLoopCore.js'

/**
 * Record a finished arcade play. Returns the server's decision:
 * { play_id, awarded_stars, daily_stars_used, daily_cap, is_daily_challenge,
 *   personal_best, is_new_best } or null when recording wasn't possible
 * (no real child selected / offline) — the game still ends gracefully.
 */
export async function recordArcadePlay(childId, gameId, { score = 0, success = false } = {}) {
  if (!childId || childId === 'arcade') return null
  const params = {
    p_child_id: childId,
    p_game_id: gameId,
    p_score: Math.max(0, Math.round(score)),
    p_success: !!success
  }
  try {
    // The child's local date defines their arcade day (local midnight to
    // local midnight) — the server clamps it so it can't be gamed.
    const { data, error } = await getSupabaseClient().rpc('record_arcade_play', {
      ...params,
      p_local_date: localDate()
    })
    if (error) {
      // Pre-migration database (4-arg function): retry without the date
      // so plays are never lost during a rollout.
      if (/p_local_date|function .*record_arcade_play/i.test(error.message || '')) {
        const { data: legacyData, error: legacyError } = await getSupabaseClient().rpc('record_arcade_play', params)
        if (legacyError) throw legacyError
        return legacyData
      }
      throw error
    }
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

/**
 * Today's arcade state for a child (today = local midnight to local
 * midnight). One game per day, plus a bonus game for winning Daniel's
 * challenge. Fails open on errors so a network blip never bricks the
 * arcade.
 *
 * @returns {{ plays: Array<{game_id, created_at, success, is_daily_challenge}>,
 *             challengeWon: boolean, playsAllowed: number, playsLeft: number }}
 */
export async function getTodaysArcadeState(childId) {
  const empty = { plays: [], challengeWon: false, playsAllowed: 1, playsLeft: 1 }
  if (!childId || childId === 'arcade') return empty
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data, error } = await getSupabaseClient()
      .from('arcade_plays')
      .select('game_id, created_at, success, is_daily_challenge')
      .eq('child_id', childId)
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: true })
    if (error) throw error
    const plays = data || []
    const challengeWon = plays.some(p => p.is_daily_challenge && p.success)
    const playsAllowed = 1 + (challengeWon ? 1 : 0)
    return {
      plays,
      challengeWon,
      playsAllowed,
      playsLeft: Math.max(0, playsAllowed - plays.length)
    }
  } catch (err) {
    console.warn('[arcade] Could not check today\'s plays:', err)
    return empty
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
