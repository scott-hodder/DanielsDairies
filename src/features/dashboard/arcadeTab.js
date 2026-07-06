// ================================================
// ARCADE TAB - Shows available roadblock games for free play
// Uses the existing mini-game registry, no duplication of game logic.
// Includes Daniel's challenge of the day and per-game personal bests
// (loaded from arcade_plays; star caps enforced server-side).
// ================================================

import { listGames, isMiniGamesEnabled } from '../../minigames/index.js'
import { escapeHtml } from '../../lib/sanitize.js'
import { getDailyChallengeGameId, getArcadeBests, getTodaysArcadeState } from './arcadeLoop.js'

// Extra metadata for arcade display (skillTags already on each game def)
const GAME_META = {
  'shield-sprint':        { icon: '&#x1F6E1;&#xFE0F;', purpose: 'Practise helpful self-talk', color: '#6366F1' },
  'calm-river-rapids':    { icon: '&#x1F98B;', purpose: 'Pause, notice, then move', color: '#06B6D4' },
  'courage-canyon':       { icon: '&#x1F3D4;&#xFE0F;', purpose: 'Breathing and courage', color: '#EF4444' },
  'thought-forest':       { icon: '&#x1F33B;', purpose: 'Pull out unhelpful thoughts', color: '#8B5CF6' },
  'emotion-ocean':        { icon: '&#x1F60A;', purpose: 'Reading faces and feelings', color: '#EC4899' },
  'kindness-kingdom':     { icon: '&#x1F451;', purpose: 'Empathy and kindness', color: '#F59E0B' },
  'focus-firefly-forest': { icon: '&#x1FA94;', purpose: 'Focus and attention', color: '#10B981' },
  'coping-cave':          { icon: '&#x1F3DA;&#xFE0F;', purpose: 'Coping strategies', color: '#14b8a6' },
  'gratitude-garden':     { icon: '&#x1F33B;', purpose: 'Gratitude and positivity', color: '#4caf50' },
  'breathing-bridge':     { icon: '&#x1F32C;&#xFE0F;', purpose: 'Calm breathing', color: '#0ea5e9' },
}

let _container = null
let _onPlayGame = null
let _childId = null
let _bests = new Map()
// Today's arcade state: plays so far, whether the daily challenge was won
// (which unlocks a bonus game), and how many plays remain.
let _today = { plays: [], challengeWon: false, playsAllowed: 1, playsLeft: 1 }

export function initArcadeTab(containerEl, { onPlayGame, childId } = {}) {
  _container = containerEl
  _onPlayGame = onPlayGame || null
  _childId = childId || window.selectedChild?.id || window.state?.selectedChild?.id || null
  render()

  // Personal bests + today's plays load in the background, then enrich cards.
  if (_childId) {
    Promise.all([getArcadeBests(_childId), getTodaysArcadeState(_childId)]).then(([bests, today]) => {
      _bests = bests
      _today = today
      render()
    })
  }
}

/** Re-fetch bests + today's plays after a game so the tab updates live. */
export function refreshArcadeBests() {
  if (!_childId) return
  Promise.all([getArcadeBests(_childId), getTodaysArcadeState(_childId)]).then(([bests, today]) => {
    _bests = bests
    _today = today
    render()
  })
}

function render() {
  if (!_container) return

  const games = listGames() || []
  const challengeId = getDailyChallengeGameId()
  const challengeGame = games.find(g => g.id === challengeId)
  const outOfPlays = _today.playsLeft <= 0
  const bonusUnlocked = _today.challengeWon && _today.playsLeft > 0 && _today.plays.length >= 1
  const challengePlayed = _today.plays.some(p => p.game_id === challengeId)

  _container.innerHTML = `
    <div class="arcade-header">
      <div class="arcade-header-icon">
        <img src="/images/characters/Daniel_Celebrating.webp" alt="Daniel" style="width:56px;height:56px;object-fit:contain" />
      </div>
      <div>
        <h2 class="arcade-title">Daniel's Arcade</h2>
        <p class="arcade-sub">Quick games that practise real wellbeing skills. You get <strong>one arcade game a day</strong> — win Daniel's challenge to unlock a bonus game!</p>
      </div>
    </div>
    ${outOfPlays ? `
      <div class="arcade-done-banner">
        <span style="font-size:26px">&#x1F31F;</span>
        <div>
          <strong>That's your arcade for today${_today.challengeWon ? ' — challenge won AND bonus game played!' : '!'}</strong>
          <span>A fresh game unlocks tomorrow. Want more? Modules are always open.</span>
        </div>
      </div>` : ''}
    ${bonusUnlocked ? `
      <div class="arcade-bonus-banner">
        <span style="font-size:26px">&#x1F386;</span>
        <div>
          <strong>Challenge won — bonus game unlocked!</strong>
          <span>You beat Daniel's challenge, so you've earned one more game today. Pick any game!</span>
        </div>
      </div>` : ''}
    ${challengeGame && !challengePlayed && !outOfPlays ? `
      <div class="arcade-challenge" id="arcadeChallenge">
        <span class="arcade-challenge-badge">&#x2B50; Daniel's challenge of the day</span>
        <div class="arcade-challenge-body">
          <strong>${escapeHtml(challengeGame.displayName || challengeGame.name || challengeGame.id)}</strong>
          <span>Win it for a bonus star — and unlock a second game today!</span>
        </div>
        <button class="arcade-play-btn" data-game-id="${escapeHtml(challengeGame.id)}">&#x25B6; Play</button>
      </div>` : ''}
    <div class="arcade-grid" id="arcadeGrid">
      ${games.length === 0 ? '<p style="color:#6b7e95;text-align:center;padding:20px">No games available yet.</p>' : ''}
      ${games.map(game => renderGameCard(game, game.id === challengeId, outOfPlays)).join('')}
    </div>
  `

  injectStyles()

  // Attach play handlers (fresh plays-left check on click so a tab left
  // open can't sneak extra games in)
  _container.querySelectorAll('.arcade-play-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      const gameId = btn.dataset.gameId
      if (_childId) {
        const fresh = await getTodaysArcadeState(_childId)
        _today = fresh
        if (fresh.playsLeft <= 0) {
          render()
          return
        }
      }
      if (_onPlayGame) _onPlayGame(gameId)
    })
  })
}

function renderGameCard(game, isChallenge, outOfPlays) {
  const meta = GAME_META[game.id] || { icon: '&#x1F3AE;', purpose: 'Wellbeing practice', color: '#405878' }
  const tags = (game.skillTags || []).slice(0, 2).map(t => t.replace(/-/g, ' '))
  const best = _bests.get(game.id)
  const playedToday = _today.plays.some(p => p.game_id === game.id)
  const showChallengeFlag = isChallenge && !playedToday && !outOfPlays

  const button = playedToday && outOfPlays
    ? '<button class="arcade-play-btn arcade-play-btn-done" disabled>&#x2713; Played today</button>'
    : outOfPlays
      ? '<button class="arcade-play-btn arcade-play-btn-locked" disabled>Tomorrow</button>'
      : `<button class="arcade-play-btn" data-game-id="${escapeHtml(game.id)}">&#x25B6; Play</button>`

  return `
    <div class="arcade-card${showChallengeFlag ? ' arcade-card-challenge' : ''}${outOfPlays && !playedToday ? ' arcade-card-waiting' : ''}">
      ${showChallengeFlag ? '<span class="arcade-card-flag">&#x2B50; Today\'s challenge</span>' : ''}
      <div class="arcade-card-icon" style="background:${meta.color}">${meta.icon}</div>
      <div class="arcade-card-body">
        <h3 class="arcade-card-title">${escapeHtml(game.displayName || game.name || game.id)}</h3>
        <p class="arcade-card-desc">${escapeHtml(game.description || '')}</p>
        <div class="arcade-card-purpose">${escapeHtml(meta.purpose)}</div>
        ${tags.length > 0 ? `<div class="arcade-card-tags">${tags.map(t => `<span class="arcade-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        ${best ? `<div class="arcade-card-best">&#x1F3C6; Personal best: ${best.best}</div>` : ''}
      </div>
      ${button}
    </div>
  `
}

let _stylesInjected = false
function injectStyles() {
  if (_stylesInjected) return
  _stylesInjected = true
  const style = document.createElement('style')
  style.textContent = `
.arcade-challenge{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:linear-gradient(135deg,#fff6df,#fdeeca);border:2px solid #f2c94c;border-radius:16px;padding:14px 18px;margin:0 0 18px}
.arcade-challenge-badge{font-size:12px;font-weight:700;color:#8a6d1a;background:#fff;border-radius:100px;padding:5px 12px;border:1px solid #f0dca0}
.arcade-challenge-body{flex:1;min-width:180px;display:flex;flex-direction:column}
.arcade-challenge-body strong{color:#16324f;font-size:15.5px}
.arcade-challenge-body span{color:#8a6d1a;font-size:12.5px}
.arcade-card-challenge{border:2px solid #f2c94c;position:relative}
.arcade-card-flag{position:absolute;top:-11px;left:14px;background:#f2c94c;color:#5c4500;font-size:11px;font-weight:700;border-radius:100px;padding:3px 10px}
.arcade-card-best{font-size:12px;color:#8a6d1a;font-weight:600;margin-top:6px}
.arcade-done-banner{display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#eefaf3,#ddf3e7);border:2px solid #9ed8b8;border-radius:16px;padding:14px 18px;margin:0 0 18px}
.arcade-done-banner div{display:flex;flex-direction:column}
.arcade-done-banner strong{color:#1e5b3c;font-size:15px}
.arcade-done-banner span{color:#3f7a5b;font-size:12.5px}
.arcade-bonus-banner{display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#f3edff,#e6dcfb);border:2px solid #b79ce8;border-radius:16px;padding:14px 18px;margin:0 0 18px}
.arcade-bonus-banner div{display:flex;flex-direction:column}
.arcade-bonus-banner strong{color:#4c2d8f;font-size:15px}
.arcade-bonus-banner span{color:#6b4fae;font-size:12.5px}
.arcade-card-waiting{opacity:.62;filter:saturate(.6)}
.arcade-play-btn-done{background:#2E8B57!important;cursor:default!important;opacity:.9}
.arcade-play-btn-locked{background:#aeb9c4!important;cursor:default!important}
`
  document.head.appendChild(style)
}
