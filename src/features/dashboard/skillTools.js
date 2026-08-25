// ================================================
// SKILL TOOLS
// Completed adventures mint tools the child can *use* — starting with the
// arcade, where equipped tools give a small visible boost (an extra heart).
// The inventory is derived entirely from completed modules per Super Skill;
// nothing new is stored server-side. The current tool ids are mirrored to
// localStorage so the minigame controller can read them synchronously.
// Part of the town_play layer (see townPlayFlag.js).
// ================================================

import { escapeHtml } from '../../lib/sanitize.js'
import { isTownPlayEnabled } from './townPlayFlag.js'

// Three tools per Super Skill, unlocking at 1, 4 and 8 completed adventures
// in that skill — so the shelf keeps growing across a whole skill journey
// instead of finishing on day one.
export const SKILL_TOOLS = [
  { id: 'memory-lantern', skill: 'brain-builder', unlockAt: 1, name: 'Memory Lantern', emoji: '🏮', desc: 'Lights the way when learning feels foggy.', boost: 'A builder is never lost in the dark' },
  { id: 'road-kit', skill: 'brain-builder', unlockAt: 4, name: "Road Builder's Kit", emoji: '🧱', desc: 'Every practice lays another brick on your brain roads.', boost: 'Earned by real road-building practice' },
  { id: 'lennys-whistle', skill: 'brain-builder', unlockAt: 8, name: "Lenny's Golden Whistle", emoji: '📯', desc: "Lenny's own whistle — for a master brain builder who kept showing up.", boost: 'Master builder badge of honour' },

  { id: 'thought-filter', skill: 'thought-driver', unlockAt: 1, name: 'Thought Filter', emoji: '🔍', desc: 'Helps you spot unhelpful thoughts before they spread.', boost: 'Extra heart in Thought Forest' },
  { id: 'calm-feather', skill: 'thought-driver', unlockAt: 4, name: "Coco's Calm Feather", emoji: '🪶', desc: 'A feather from Coco — proof you can let squawky thoughts fly past.', boost: 'Steady thoughts, smooth feathers' },
  { id: 'bright-goggles', skill: 'thought-driver', unlockAt: 8, name: 'Bright-Side Goggles', emoji: '🥽', desc: 'See the fair, true version of any thought.', boost: 'Master thought-driver badge' },

  { id: 'feelings-compass', skill: 'emotion-navigator', unlockAt: 1, name: 'Feelings Compass', emoji: '🧭', desc: 'Points to what you are really feeling.', boost: 'Never lost in a feelings storm' },
  { id: 'gum-leaf', skill: 'emotion-navigator', unlockAt: 4, name: "Kip's Gum Leaf", emoji: '🍃', desc: 'Kip’s favourite calm-down leaf, for slow koala breaths.', boost: 'Breathe slow like a koala' },
  { id: 'feelings-thermometer', skill: 'emotion-navigator', unlockAt: 8, name: 'Feelings Thermometer', emoji: '🌡️', desc: 'Measure how big a feeling is before it measures you.', boost: 'Master navigator badge' },

  { id: 'habit-hammer', skill: 'behaviour-engineer', unlockAt: 1, name: 'Habit Hammer', emoji: '🔨', desc: 'Builds strong habits one small tap at a time.', boost: 'Every tap builds the habit' },
  { id: 'routine-planner', skill: 'behaviour-engineer', unlockAt: 4, name: 'Routine Planner', emoji: '🗓️', desc: 'Hook new habits to things you already do.', boost: 'Same time, same trigger, no forgetting' },
  { id: 'peppers-pouch', skill: 'behaviour-engineer', unlockAt: 8, name: "Pepper's Night Pouch", emoji: '🎒', desc: "Pepper's own stash pouch — for an engineer whose habits stick.", boost: 'Master engineer badge' },

  { id: 'bounce-shield', skill: 'resilience-architect', unlockAt: 1, name: 'Bounce Shield', emoji: '🛡️', desc: 'Helps you bounce back when things get tough.', boost: 'Extra heart in Courage Canyon' },
  { id: 'brave-rope', skill: 'resilience-architect', unlockAt: 4, name: 'Brave Rope', emoji: '🪢', desc: 'For climbing back up, one small brave step at a time.', boost: 'Falls are just part of the climb' },
  { id: 'eddies-spikes', skill: 'resilience-architect', unlockAt: 8, name: "Eddie's Spiky Armour", emoji: '⚔️', desc: "Eddie's gift — you weathered the storms and kept going.", boost: 'Master architect badge' },

  { id: 'friendship-map', skill: 'social-mapper', unlockAt: 1, name: 'Friendship Map', emoji: '🗺️', desc: 'Shows the way to kinder, stronger friendships.', boost: 'Every hello adds to the map' },
  { id: 'listening-ears', skill: 'social-mapper', unlockAt: 4, name: "Kai's Listening Ears", emoji: '👂', desc: 'Hear what friends mean, not just what they say.', boost: 'The best mappers listen first' },
  { id: 'kindness-badge', skill: 'social-mapper', unlockAt: 8, name: 'Kindness Badge', emoji: '💞', desc: 'Awarded for mapping the whole world of people with kindness.', boost: 'Master mapper badge' },

  { id: 'tomorrow-lens', skill: 'future-designer', unlockAt: 1, name: 'Tomorrow Lens', emoji: '🔭', desc: 'Lets you peek at the future you are building.', boost: 'See where today is taking you' },
  { id: 'dream-journal', skill: 'future-designer', unlockAt: 4, name: 'Dream Journal', emoji: '📔', desc: 'Big dreams, written down, become plans.', boost: 'Dreams with pages grow legs' },
  { id: 'billies-star', skill: 'future-designer', unlockAt: 8, name: "Billie's Wish Star", emoji: '🌠', desc: "Billie's own star — for a designer who builds tomorrow every day.", boost: 'Master designer badge' }
]

export function toolsStorageKey(childId) { return 'dd_tools_' + childId }

/** Read equipped tool ids synchronously (used by the minigame controller). */
export function getEquippedToolIds(childId) {
  try { return JSON.parse(localStorage.getItem(toolsStorageKey(childId)) || '[]') } catch { return [] }
}

function computeUnlocked({ modules, childModules }) {
  const completedModuleIds = new Set((childModules || []).filter(cm => cm.is_completed).map(cm => cm.module_id))
  const bySkillSlug = {}
  const skills = window.superSkills || []
  const slugById = Object.fromEntries(skills.map(s => [s.id, s.slug]))
  for (const m of (modules || [])) {
    if (!completedModuleIds.has(m.id)) continue
    const slug = m.superSkillSlug || slugById[m.super_skill_id] || m.category
    if (!slug) continue
    bySkillSlug[slug] = (bySkillSlug[slug] || 0) + 1
  }
  return SKILL_TOOLS.filter(t => (bySkillSlug[t.skill] || 0) >= t.unlockAt)
}

function injectStyles() {
  if (document.getElementById('skillToolsStyles')) return
  const st = document.createElement('style')
  st.id = 'skillToolsStyles'
  st.textContent = `
.stl-shelf{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:rgba(255,255,255,.85);border:2px solid #e8e0c9;border-radius:16px;padding:8px 12px;margin:10px 0;font-family:'Fredoka',system-ui,sans-serif}
.stl-label{font-size:12.5px;font-weight:700;color:#8a7a4d;margin-right:2px}
.stl-tool{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;background:#fff;border:2px solid #f2c94c;cursor:pointer;transition:transform .15s}
.stl-tool:hover{transform:scale(1.12)}
.stl-tool.locked{border-color:#dfe6ef;opacity:.4;filter:grayscale(1)}
.stl-overlay{position:fixed;inset:0;z-index:11000;background:rgba(22,50,79,.78);display:flex;align-items:center;justify-content:center;padding:16px}
.stl-card{background:#fffdf7;border-radius:24px;max-width:380px;width:100%;padding:26px 22px;text-align:center;font-family:'Nunito',system-ui,sans-serif;box-shadow:0 24px 60px rgba(0,0,0,.4)}
.stl-big{font-size:52px;line-height:1;margin-bottom:8px;animation:stlPop .4s ease-out}
@keyframes stlPop{from{transform:scale(.3) rotate(-15deg)}to{transform:scale(1) rotate(0)}}
.stl-name{font-family:'Fredoka',sans-serif;font-size:21px;font-weight:800;color:#16324f;margin:0 0 6px}
.stl-desc{font-size:14.5px;color:#5b6b80;line-height:1.5;margin:0 0 8px}
.stl-boost{display:inline-block;background:#fef3c7;border:1px solid #f2c94c;border-radius:999px;padding:5px 13px;font-size:12.5px;font-weight:700;color:#92600a;margin-bottom:16px}
.stl-btn{width:100%;padding:13px;border:none;border-radius:14px;background:linear-gradient(135deg,#f2c94c,#e6a800);color:#5b4300;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer}
`
  document.head.appendChild(st)
}

function showToolCard(tool, { isNew } = {}) {
  const ov = document.createElement('div')
  ov.className = 'stl-overlay'
  ov.innerHTML = `<div class="stl-card">
    <div class="stl-big">${tool.emoji}</div>
    ${isNew ? '<p class="stl-boost" style="background:#dcfce7;border-color:#22c55e;color:#166534">✨ NEW TOOL UNLOCKED!</p><br>' : ''}
    <h3 class="stl-name">${escapeHtml(tool.name)}</h3>
    <p class="stl-desc">${escapeHtml(tool.desc)}</p>
    <span class="stl-boost">🎮 ${escapeHtml(tool.boost)}</span>
    <button class="stl-btn">${isNew ? 'Awesome!' : 'Got it!'}</button>
  </div>`
  const close = () => ov.remove()
  ov.querySelector('.stl-btn').addEventListener('click', close)
  ov.addEventListener('click', e => { if (e.target === ov) close() })
  document.body.appendChild(ov)
}

/**
 * Render the tools shelf above the Brain Town map and mirror equipped tool
 * ids to localStorage for the arcade. Shows a one-time unlock celebration
 * when a new tool appears.
 */
export async function initSkillToolsShelf(container, { child, modules, childModules } = {}) {
  const childId = child?.id
  if (!container || !childId) return
  if (!(await isTownPlayEnabled())) {
    try { localStorage.removeItem(toolsStorageKey(childId)) } catch { /* ignore */ }
    return
  }

  const unlocked = computeUnlocked({ modules, childModules })
  const unlockedIds = unlocked.map(t => t.id)

  // Mirror for the minigame controller + detect newly minted tools.
  let previous = []
  try { previous = JSON.parse(localStorage.getItem(toolsStorageKey(childId)) || '[]') } catch { /* ignore */ }
  try { localStorage.setItem(toolsStorageKey(childId), JSON.stringify(unlockedIds)) } catch { /* ignore */ }
  const fresh = unlocked.find(t => !previous.includes(t.id))

  const mapContainer = container.querySelector('#brainTownMapContainer')
  if (!mapContainer || container.querySelector('.stl-shelf')) return
  injectStyles()

  const skillLabel = (slug) => slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  const lockHint = (t) => `Finish ${t.unlockAt} adventure${t.unlockAt === 1 ? '' : 's'} in ${skillLabel(t.skill)} to unlock`
  const shelf = document.createElement('div')
  shelf.className = 'stl-shelf'
  shelf.innerHTML = `<span class="stl-label">🧰 My tools (${unlockedIds.length}/${SKILL_TOOLS.length}):</span>` + SKILL_TOOLS.map(t => {
    const has = unlockedIds.includes(t.id)
    return `<button type="button" class="stl-tool${has ? '' : ' locked'}" data-tool="${t.id}" title="${escapeHtml(has ? t.name : lockHint(t))}">${has ? t.emoji : '🔒'}</button>`
  }).join('')
  // Below the map: the space above it belongs to the explainer chip.
  mapContainer.parentElement.insertBefore(shelf, mapContainer.nextSibling)

  shelf.querySelectorAll('.stl-tool').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = SKILL_TOOLS.find(t => t.id === btn.dataset.tool)
      if (!tool) return
      if (unlockedIds.includes(tool.id)) showToolCard(tool)
      else showToolCard({ ...tool, emoji: '🔒', name: 'Locked tool', desc: lockHint(tool) + '!', boost: tool.boost })
    })
  })

  // Celebrate one newly unlocked tool per visit (skip a child's very first
  // computation so existing progress doesn't dump celebrations at once).
  if (fresh && previous.length > 0) {
    setTimeout(() => showToolCard(fresh, { isNew: true }), 800)
  }
}
