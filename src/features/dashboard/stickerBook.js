// ================================================
// STICKER BOOK
// A collection book derived entirely from data the app already records —
// completed modules, skills started, arcade wins, stars. No new tables.
// Locked stickers render as silhouettes so the child can see what's left
// to earn. Part of the town_play layer (see townPlayFlag.js).
// ================================================

import { supabase } from '../../supabaseClient.js'
import { escapeHtml } from '../../lib/sanitize.js'
import { isTownPlayEnabled } from './townPlayFlag.js'
import { trackEvent } from '../../lib/telemetry.js'

const SKILL_EMOJI = {
  'brain-builder': '🧠', 'thought-driver': '💭', 'emotion-navigator': '🧭',
  'behaviour-engineer': '🔧', 'resilience-architect': '🏰', 'social-mapper': '🗺️',
  'future-designer': '🔮'
}

// Each adventure sticker gets its own art, picked deterministically from the
// skill's themed pool so the book doesn't read as the same emoji repeated.
const SKILL_STICKER_POOL = {
  'brain-builder': ['🧠', '💡', '🏗️', '🧩', '⚡', '📚', '🔬', '🌱'],
  'thought-driver': ['💭', '🦜', '🌤️', '🛣️', '🚦', '🌈', '🪁', '🔎'],
  'emotion-navigator': ['🧭', '🐨', '💛', '🌦️', '🌊', '🎈', '🫧', '🌡️'],
  'behaviour-engineer': ['🔧', '⚙️', '🔨', '🧱', '📋', '⏰', '🪜', '🎯'],
  'resilience-architect': ['🏰', '🦔', '🛡️', '💪', '🌋', '⛰️', '🌉', '🔥'],
  'social-mapper': ['🗺️', '🐦', '🤝', '💞', '👋', '🎪', '🧑‍🤝‍🧑', '💬'],
  'future-designer': ['🔮', '🔭', '✨', '🚀', '🌟', '🎨', '📔', '🌅']
}
const STICKER_TINTS = ['#fff7e6', '#eef6ff', '#f0fdf4', '#fdf2f8', '#f5f3ff', '#fffbeb']

function hashStr(s) {
  let h = 0
  const str = String(s)
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function stickerArtFor(moduleId, skillSlug) {
  const pool = SKILL_STICKER_POOL[skillSlug] || ['📖', '⭐', '🎉', '🌟', '🏅']
  const h = hashStr(moduleId)
  return { emoji: pool[h % pool.length], tint: STICKER_TINTS[h % STICKER_TINTS.length] }
}

const GAME_BADGES = [
  { id: 'shield-sprint', name: 'Shield Sprint', emoji: '🛡️' },
  { id: 'calm-river-rapids', name: 'Calm River Rapids', emoji: '🛶' },
  { id: 'courage-canyon', name: 'Courage Canyon', emoji: '🌉' },
  { id: 'thought-forest', name: 'Thought Forest', emoji: '🌱' },
  { id: 'emotion-ocean', name: 'Emotion Ocean', emoji: '🌊' },
  { id: 'kindness-kingdom', name: 'Kindness Kingdom', emoji: '👑' },
  { id: 'focus-firefly-forest', name: 'Focus Firefly Forest', emoji: '✨' },
  { id: 'coping-cave', name: 'Coping Cave', emoji: '⛺' },
  { id: 'gratitude-garden', name: 'Gratitude Garden', emoji: '🌻' },
  { id: 'breathing-bridge', name: 'Breathing Bridge', emoji: '🌬️' }
]

function milestoneDefs({ modulesDone, starsTotal, gamesWon, skillsStarted }) {
  return [
    { id: 'first-adventure', name: 'First Adventure', emoji: '🚩', earned: modulesDone >= 1, hint: 'Finish your first adventure' },
    { id: 'road-builder', name: 'Road Builder', emoji: '🛤️', earned: modulesDone >= 5, hint: 'Finish 5 adventures' },
    { id: 'town-hero', name: 'Town Hero', emoji: '🏆', earned: modulesDone >= 10, hint: 'Finish 10 adventures' },
    { id: 'first-star', name: 'First Star', emoji: '⭐', earned: starsTotal >= 1, hint: 'Earn your first star' },
    { id: 'star-collector', name: 'Star Collector', emoji: '🌟', earned: starsTotal >= 25, hint: 'Collect 25 stars' },
    { id: 'super-star', name: 'Super Star', emoji: '💫', earned: starsTotal >= 100, hint: 'Collect 100 stars' },
    { id: 'game-winner', name: 'Game Winner', emoji: '🎮', earned: gamesWon >= 1, hint: 'Win an arcade game' },
    { id: 'arcade-champ', name: 'Arcade Champ', emoji: '🕹️', earned: gamesWon >= 5, hint: 'Win 5 arcade games' },
    { id: 'skill-explorer', name: 'Skill Explorer', emoji: '🧭', earned: skillsStarted >= 2, hint: 'Start 2 Super Skills' }
  ]
}

async function loadCollection(childId) {
  const [cmRes, skillsRes, playsRes, childRes] = await Promise.all([
    supabase.from('child_modules')
      .select('is_completed, completed_at, modules(id, title, super_skill_id)')
      .eq('child_id', childId),
    supabase.from('super_skills').select('id, name, slug, character_name, character_image_url'),
    supabase.from('arcade_plays').select('game_id, success').eq('child_id', childId),
    supabase.from('children').select('stars').eq('id', childId).maybeSingle()
  ])

  const cms = cmRes.data || []
  const skills = skillsRes.data || []
  const plays = playsRes.data || []
  const starsTotal = childRes.data?.stars || 0

  const skillById = Object.fromEntries(skills.map(s => [s.id, s]))
  const completed = cms.filter(c => c.is_completed && c.modules)

  const adventures = completed.map(c => {
    const skill = skillById[c.modules.super_skill_id]
    const art = stickerArtFor(c.modules.id, skill?.slug)
    return {
      id: 'mod-' + c.modules.id,
      name: c.modules.title,
      emoji: art.emoji,
      tint: art.tint,
      earned: true
    }
  })

  const startedSkillIds = new Set(cms.filter(c => c.modules).map(c => c.modules.super_skill_id))
  const crew = skills
    .filter(s => SKILL_EMOJI[s.slug])
    .map(s => ({
      id: 'crew-' + s.slug,
      name: s.character_name || s.name,
      sub: s.name,
      emoji: SKILL_EMOJI[s.slug],
      img: s.character_image_url || null,
      earned: startedSkillIds.has(s.id)
    }))

  const wonIds = new Set(plays.filter(p => p.success).map(p => p.game_id))
  const games = GAME_BADGES.map(g => ({
    id: 'game-' + g.id, name: g.name, emoji: g.emoji, earned: wonIds.has(g.id)
  }))

  const milestones = milestoneDefs({
    modulesDone: completed.length,
    starsTotal,
    gamesWon: wonIds.size,
    skillsStarted: startedSkillIds.size
  })

  return { adventures, crew, games, milestones }
}

function earnedCount(col) {
  return [...col.adventures, ...col.crew, ...col.games, ...col.milestones].filter(s => s.earned).length
}

function injectStyles() {
  if (document.getElementById('stickerBookStyles')) return
  const st = document.createElement('style')
  st.id = 'stickerBookStyles'
  st.textContent = `
.sb-chip{position:absolute;left:14px;bottom:14px;z-index:60;display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.96);border:2px solid #f2c94c;border-radius:999px;padding:8px 14px;font-family:'Fredoka',system-ui,sans-serif;font-size:14px;font-weight:700;color:#16324f;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.15)}
@media (max-width:540px){.sb-chip{font-size:12px;padding:6px 10px;left:10px;bottom:10px}}
.sb-chip:hover{transform:translateY(-1px)}
.sb-new{width:10px;height:10px;border-radius:50%;background:#ef4444;animation:sbPulse 1.2s infinite}
@keyframes sbPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.35)}}
.sb-overlay{position:fixed;inset:0;z-index:11000;background:rgba(22,50,79,.78);display:flex;align-items:center;justify-content:center;padding:16px}
.sb-modal{background:#fffdf7;border-radius:24px;max-width:560px;width:100%;max-height:86vh;overflow-y:auto;padding:24px 22px;font-family:'Nunito',system-ui,sans-serif;box-shadow:0 24px 60px rgba(0,0,0,.4)}
.sb-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.sb-title{font-family:'Fredoka',sans-serif;font-size:22px;font-weight:700;color:#16324f;margin:0}
.sb-count{font-size:13px;color:#8a97a8;margin:0 0 14px}
.sb-close{background:#eef2f7;border:none;border-radius:50%;width:34px;height:34px;font-size:16px;cursor:pointer;color:#405878}
.sb-section{font-family:'Fredoka',sans-serif;font-size:15px;font-weight:700;color:#405878;margin:16px 0 8px}
.sb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px}
.sb-sticker{background:#fff;border:2px solid #eadfc4;border-radius:16px;padding:10px 6px;text-align:center;min-height:86px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.sb-sticker .em{font-size:30px;line-height:1}
.sb-sticker img{width:44px;height:44px;object-fit:contain}
.sb-sticker .nm{font-size:11px;font-weight:700;color:#16324f;line-height:1.25}
.sb-sticker .sub{font-size:9.5px;color:#8a97a8}
.sb-sticker.locked{opacity:.45;filter:grayscale(1);border-style:dashed}
.sb-sticker.locked .em{filter:blur(1px)}
`
  document.head.appendChild(st)
}

function stickerHtml(s) {
  const art = s.img
    ? `<img src="${escapeHtml(s.img)}" alt="" onerror="this.outerHTML='<span class=em>${s.emoji}</span>'">`
    : `<span class="em">${s.earned ? s.emoji : '❓'}</span>`
  const tint = s.earned && s.tint ? ` style="background:${s.tint}"` : ''
  return `<div class="sb-sticker${s.earned ? '' : ' locked'}"${tint} title="${escapeHtml(s.earned ? s.name : (s.hint || 'Keep exploring to earn this!'))}">
    ${s.earned ? art : `<span class="em">❓</span>`}
    <span class="nm">${escapeHtml(s.earned ? s.name : (s.hint || '???'))}</span>
    ${s.sub && s.earned ? `<span class="sub">${escapeHtml(s.sub)}</span>` : ''}
  </div>`
}

function openBook(collection, childId) {
  const total = [...collection.adventures, ...collection.crew, ...collection.games, ...collection.milestones].length
  const earned = earnedCount(collection)
  const ov = document.createElement('div')
  ov.className = 'sb-overlay'
  const section = (title, items) => items.length
    ? `<h4 class="sb-section">${title}</h4><div class="sb-grid">${items.map(stickerHtml).join('')}</div>`
    : ''
  ov.innerHTML = `<div class="sb-modal" role="dialog" aria-label="Sticker book">
    <div class="sb-head"><h3 class="sb-title">📖 My Sticker Book</h3><button class="sb-close" aria-label="Close">✕</button></div>
    <p class="sb-count">${earned} of ${total} stickers collected</p>
    ${section('🚩 Adventures finished', collection.adventures)}
    ${section('🏘️ Brain Town crew', collection.crew)}
    ${section('🎮 Game badges', collection.games)}
    ${section('🏅 Milestones', collection.milestones)}
  </div>`
  ov.querySelector('.sb-close').addEventListener('click', () => ov.remove())
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove() })
  document.body.appendChild(ov)
  try { localStorage.setItem('dd_stickers_seen_' + childId, String(earned)) } catch { /* ignore */ }
}

/**
 * Mount the sticker book chip inside the Brain Town map container.
 * Everything is lazy: collection data loads on first open.
 */
export async function initStickerBook(mapContainer, childId) {
  if (!mapContainer || !childId) return
  if (!(await isTownPlayEnabled())) return
  if (mapContainer.querySelector('.sb-chip')) return
  injectStyles()

  const chip = document.createElement('button')
  chip.className = 'sb-chip'
  chip.type = 'button'
  chip.innerHTML = '📖 Stickers'
  if (getComputedStyle(mapContainer).position === 'static') mapContainer.style.position = 'relative'
  mapContainer.appendChild(chip)
  // The map re-renders by clearing its container; put the chip back when
  // that happens.
  new MutationObserver(() => {
    if (!mapContainer.contains(chip)) mapContainer.appendChild(chip)
  }).observe(mapContainer, { childList: true })

  // Cheap earned-count probe for the "new sticker" pulse.
  loadCollection(childId).then(col => {
    const earned = earnedCount(col)
    let seen = 0
    try { seen = Number(localStorage.getItem('dd_stickers_seen_' + childId) || 0) } catch { /* ignore */ }
    if (earned > seen) {
      const dot = document.createElement('span')
      dot.className = 'sb-new'
      chip.appendChild(dot)
    }
  }).catch(() => { /* chip still works on click */ })

  chip.addEventListener('click', async () => {
    chip.disabled = true
    try {
      const col = await loadCollection(childId)
      trackEvent('sticker_book_opened', { earned: earnedCount(col) })
      openBook(col, childId)
      chip.querySelector('.sb-new')?.remove()
    } catch (e) {
      console.error('Sticker book failed to load:', e)
    } finally {
      chip.disabled = false
    }
  })
}
