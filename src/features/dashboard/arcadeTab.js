// ================================================
// ARCADE TAB - Shows available roadblock games for free play
// Uses the existing mini-game registry, no duplication of game logic.
// ================================================

import { listGames, isMiniGamesEnabled } from '../../minigames/index.js'
import { escapeHtml } from '../../lib/sanitize.js'

// Extra metadata for arcade display (skillTags already on each game def)
const GAME_META = {
  'shield-sprint':        { icon: '&#x1F6E1;&#xFE0F;', purpose: 'Practise helpful self-talk', color: '#6366F1' },
  'calm-river-rapids':    { icon: '&#x1F30A;', purpose: 'Patience and self-control', color: '#06B6D4' },
  'courage-canyon':       { icon: '&#x1F3D4;&#xFE0F;', purpose: 'Breathing and courage', color: '#EF4444' },
  'thought-forest':       { icon: '&#x1F332;', purpose: 'Cognitive reframing', color: '#8B5CF6' },
  'emotion-ocean':        { icon: '&#x1F30A;', purpose: 'Recognising emotions', color: '#EC4899' },
  'kindness-kingdom':     { icon: '&#x1F451;', purpose: 'Empathy and kindness', color: '#F59E0B' },
  'focus-firefly-forest': { icon: '&#x1FA94;', purpose: 'Focus and attention', color: '#10B981' },
  'coping-cave':          { icon: '&#x1F3DA;&#xFE0F;', purpose: 'Coping strategies', color: '#14b8a6' },
  'gratitude-garden':     { icon: '&#x1F33B;', purpose: 'Gratitude and positivity', color: '#4caf50' },
  'breathing-bridge':     { icon: '&#x1F32C;&#xFE0F;', purpose: 'Calm breathing', color: '#0ea5e9' },
}

let _container = null
let _onPlayGame = null

export function initArcadeTab(containerEl, { onPlayGame }) {
  _container = containerEl
  _onPlayGame = onPlayGame || null
  render()
}

function render() {
  if (!_container) return

  const games = listGames() || []

  _container.innerHTML = `
    <div class="arcade-header">
      <div class="arcade-header-icon">
        <img src="/images/characters/Daniel_Celebrating.webp" alt="Daniel" style="width:56px;height:56px;object-fit:contain" />
      </div>
      <div>
        <h2 class="arcade-title">Daniel's Arcade</h2>
        <p class="arcade-sub">Quick games that practise real wellbeing skills. Every game connects back to a Super Skill.</p>
      </div>
    </div>
    <div class="arcade-grid" id="arcadeGrid">
      ${games.length === 0 ? '<p style="color:#6b7e95;text-align:center;padding:20px">No games available yet.</p>' : ''}
      ${games.map(game => renderGameCard(game)).join('')}
    </div>
  `

  // Attach play handlers
  _container.querySelectorAll('.arcade-play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const gameId = btn.dataset.gameId
      if (_onPlayGame) _onPlayGame(gameId)
    })
  })
}

function renderGameCard(game) {
  const meta = GAME_META[game.id] || { icon: '&#x1F3AE;', purpose: 'Wellbeing practice', color: '#405878' }
  const tags = (game.skillTags || []).slice(0, 2).map(t => t.replace(/-/g, ' '))

  return `
    <div class="arcade-card">
      <div class="arcade-card-icon" style="background:${meta.color}">${meta.icon}</div>
      <div class="arcade-card-body">
        <h3 class="arcade-card-title">${escapeHtml(game.displayName || game.name || game.id)}</h3>
        <p class="arcade-card-desc">${escapeHtml(game.description || '')}</p>
        <div class="arcade-card-purpose">${escapeHtml(meta.purpose)}</div>
        ${tags.length > 0 ? `<div class="arcade-card-tags">${tags.map(t => `<span class="arcade-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </div>
      <button class="arcade-play-btn" data-game-id="${escapeHtml(game.id)}">&#x25B6; Play</button>
    </div>
  `
}
