// ================================================
// BRAIN TOWN MAP - Layered Interactive Super Skill Map
// Layer 1: Town.webp base artwork (1448x1086)
// Layer 2: SVG road overlays connecting Town Square to buildings
// Layer 3: Small pin markers for each Super Skill
// Layer 4: Side drawer (desktop) / bottom sheet (mobile) for details
// Layer 5: Progress/state visual layer
// ================================================

import { getSuperSkills } from '../../services/databaseService.js'
import { SUPER_SKILL_THEMES, KID_FRIENDLY_COPY } from '../../adventure-map-themes.js'
import { escapeHtml } from '../../lib/sanitize.js'

const WORLD_W = 1448
const WORLD_H = 1086

const TOWN_SQUARE = { x: 724, y: 488 }

// ── Building positions (center of each building in 1448x1086 image) ──
// The image has 8 buildings around a central fountain; we use 7 + town square
const BUILDING_POSITIONS = {
  topLeft:      { x: 275, y: 205 },   // Red-roof school
  topCenter:    { x: 660, y: 120 },   // Playground with swings
  topRight:     { x: 1010, y: 205 },  // Yellow cottage / cafe
  midLeft:      { x: 195, y: 470 },   // Blue-roof hall / library
  midRight:     { x: 1100, y: 455 },  // Pond area with gazebo
  botLeft:      { x: 305, y: 750 },   // Red barn with garden
  botCenter:    { x: 660, y: 770 },   // Ornate gazebo / bandstand
}

// Map each DB super skill slug → a building position
// DB slugs: brain-builder, thought-driver, emotion-navigator,
//           behaviour-engineer, resilience-architect, social-mapper, future-designer
const SLUG_TO_BUILDING = {
  'brain-builder':        'topLeft',      // School - learning about the brain
  'thought-driver':       'midLeft',      // Library - steering thoughts
  'emotion-navigator':    'midRight',     // Pond - navigating emotions (calm water)
  'behaviour-engineer':   'topCenter',    // Playground - building habits through action
  'resilience-architect': 'botLeft',      // Barn - building resilience (hard work)
  'social-mapper':        'topRight',     // Cafe - social connection
  'future-designer':      'botCenter',    // Gazebo - planning and dreaming
}

// Theme colors for DB skills that might not be in SUPER_SKILL_THEMES
const SKILL_COLORS = {
  'brain-builder':        '#6366F1',
  'thought-driver':       '#8B5CF6',
  'emotion-navigator':    '#EC4899',
  'behaviour-engineer':   '#D97706',
  'resilience-architect': '#EF4444',
  'social-mapper':        '#0D9488',
  'future-designer':      '#7C3AED',
}

// Emoji for each skill (fallback if DB/theme doesn't have one)
const SKILL_EMOJIS = {
  'brain-builder':        '\u{1F9E0}',
  'thought-driver':       '\u{1F9E9}',
  'emotion-navigator':    '\u{1F49B}',
  'behaviour-engineer':   '\u26A1',
  'resilience-architect': '\u{1F6E1}\uFE0F',
  'social-mapper':        '\u{1F91D}',
  'future-designer':      '\u{1F52E}',
}

// Road paths from plaza edge → building (tracing the visible dirt roads)
const ROAD_PATHS = {
  topLeft:   'M 645,400 C 540,330 420,270 290,215',
  topCenter: 'M 700,385 C 690,290 680,210 665,140',
  topRight:  'M 800,400 C 880,330 940,270 1000,215',
  midLeft:   'M 610,488 C 470,483 340,478 215,473',
  midRight:  'M 840,490 C 940,483 1020,470 1090,458',
  botLeft:   'M 645,575 C 530,640 420,700 320,745',
  botCenter: 'M 715,580 C 700,650 685,715 665,765',
}

// ── State ──
let _container = null
let _superSkills = []
let _childModules = []
let _modules = []
let _onSelectSkill = null
let _selectedSlug = null

// Pan/zoom
let _tx = 0, _ty = 0, _scale = 1
let _down = false, _lastX = 0, _lastY = 0, _moved = 0, _wasDragging = false
let _pinchStartDist = 0, _pinchStartScale = 1
let _minScale = 0.85
const MAX_SCALE = 1.8

// ── Helpers ──

function getSlug(skill) {
  if (skill.slug) return skill.slug
  const label = skill.title || skill.name || ''
  return label.toLowerCase().replace(/\s+/g, '-')
}

function getSkillColor(skill) {
  const slug = getSlug(skill)
  const theme = SUPER_SKILL_THEMES[slug]
  if (theme?.color) return theme.color
  if (skill.theme_color && skill.theme_color !== '#405878') return skill.theme_color
  return SKILL_COLORS[slug] || '#405878'
}

function getSkillEmoji(skill) {
  const slug = getSlug(skill)
  if (skill.emoji && skill.emoji !== '\u{1F4D8}') return skill.emoji
  const theme = SUPER_SKILL_THEMES[slug]
  if (theme?.emoji) return theme.emoji
  return SKILL_EMOJIS[slug] || '\u2B50'
}

function getSkillCopy(skill) {
  const slug = getSlug(skill)
  const copy = KID_FRIENDLY_COPY[slug]
  if (copy) return copy
  // Build from DB description
  return {
    description: skill.description || 'Explore this Super Skill adventure.',
    pickThisIf: null,
    youllLearn: null,
    tag: null,
  }
}

function getSkillProgress(skill) {
  const slug = getSlug(skill)
  const skillModules = _modules.filter(m =>
    m.super_skill_id === skill.id ||
    (m.category && m.category.toLowerCase().replace(/\s+/g, '-') === slug)
  )
  const total = skillModules.length
  const done = skillModules.filter(m => {
    const cm = _childModules.find(c => c.module_id === m.id)
    return cm && cm.is_completed === true
  }).length
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
}

function getBuildingKey(skill) {
  const slug = getSlug(skill)
  return SLUG_TO_BUILDING[slug] || null
}

function getBuildingPos(skill) {
  const key = getBuildingKey(skill)
  return key ? BUILDING_POSITIONS[key] : null
}

// ── Init ──

export async function initBrainTownMap(containerEl, { modules, childModules, onSelectSkill }) {
  _container = containerEl
  _modules = modules || []
  _childModules = childModules || []
  _onSelectSkill = onSelectSkill || null

  try {
    const dbSkills = await getSuperSkills()
    _superSkills = dbSkills && dbSkills.length > 0 ? dbSkills : []
  } catch (e) {
    console.warn('[BrainTownMap] Could not load super skills:', e)
    _superSkills = []
  }

  // Ensure slugs exist
  _superSkills = _superSkills.map(s => {
    if (!s.slug) s.slug = (s.title || s.name || '').toLowerCase().replace(/\s+/g, '-')
    return s
  })

  console.log('[BrainTownMap] Skills loaded:', _superSkills.map(s => s.slug).join(', '))
  render()
}

export function updateBrainTownData({ modules, childModules }) {
  if (modules) _modules = modules
  if (childModules) _childModules = childModules
}

// ── Render ──

function render() {
  if (!_container) return
  _container.innerHTML = ''
  _selectedSlug = null

  const stage = document.createElement('div')
  stage.className = 'bt-stage'
  stage.innerHTML = `
    <div class="bt-viewport" id="btViewport">
      <div class="bt-world" id="btWorld">
        <svg class="bt-roads-svg" viewBox="0 0 ${WORLD_W} ${WORLD_H}">
          <defs>
            <filter id="roadGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          ${renderRoadPaths()}
        </svg>
      </div>
      <div class="bt-hint" id="btHint">Drag to explore \u2022 tap a building to learn more</div>
      <div class="bt-controls">
        <button class="bt-ctrl" id="btZoomIn" aria-label="Zoom in">+</button>
        <button class="bt-ctrl" id="btZoomOut" aria-label="Zoom out">&minus;</button>
        <button class="bt-ctrl bt-ctrl-wide" id="btRecenter" aria-label="Centre map">Centre</button>
      </div>
      <div class="bt-scrim" id="btScrim"></div>
      <aside class="bt-drawer" id="btDrawer" aria-hidden="true"></aside>
    </div>
  `
  _container.appendChild(stage)

  // Mobile fallback list
  const mobileList = document.createElement('div')
  mobileList.className = 'bt-mobile-list'
  renderMobileList(mobileList)
  _container.appendChild(mobileList)

  const world = stage.querySelector('#btWorld')
  const viewport = stage.querySelector('#btViewport')

  // Town Square pin
  addPin(world, {
    x: TOWN_SQUARE.x, y: TOWN_SQUARE.y,
    emoji: '\u26F2', label: 'Town Square',
    color: '#f2c94c', type: 'home'
  })

  // Super Skill pins
  let placed = 0
  _superSkills.forEach(skill => {
    const pos = getBuildingPos(skill)
    if (!pos) {
      console.warn('[BrainTownMap] No building for:', getSlug(skill))
      return
    }
    const slug = getSlug(skill)
    const color = getSkillColor(skill)
    const progress = getSkillProgress(skill)

    addPin(world, {
      x: pos.x, y: pos.y,
      emoji: getSkillEmoji(skill),
      label: skill.name || skill.title || slug,
      color, type: 'skill', slug, skill, progress
    })
    placed++
  })
  console.log(`[BrainTownMap] Placed ${placed}/${_superSkills.length} pins`)

  // Events
  viewport.addEventListener('touchmove', e => e.preventDefault(), { passive: false })
  viewport.addEventListener('wheel', e => {
    e.preventDefault()
    zoomBy(viewport, world, e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY)
  }, { passive: false })

  setupDrag(viewport, world)
  setupTouchZoom(viewport, world)

  stage.querySelector('#btZoomIn').addEventListener('click', () => zoomBy(viewport, world, 1.2))
  stage.querySelector('#btZoomOut').addEventListener('click', () => zoomBy(viewport, world, 1 / 1.2))
  stage.querySelector('#btRecenter').addEventListener('click', () => {
    _scale = getDefaultScale(viewport)
    centerOn(viewport, world)
  })

  stage.querySelector('#btScrim').addEventListener('click', () => closeDrawer(stage))

  // Hide hint after first drag
  viewport.addEventListener('pointerup', () => {
    if (_wasDragging) {
      const hint = stage.querySelector('#btHint')
      if (hint) hint.style.opacity = '0'
    }
  }, { once: true })

  // Initial zoom - fit map so it fills viewport with some panning room
  requestAnimationFrame(() => {
    updateMinScale(viewport)
    _scale = getDefaultScale(viewport)
    centerOn(viewport, world)
  })

  // Keep min scale updated on resize
  window.addEventListener('resize', () => {
    updateMinScale(viewport)
    clampPan(viewport)
    applyTransform(world)
  })
}

function getDefaultScale(viewport) {
  const vw = viewport.clientWidth
  const vh = viewport.clientHeight
  // Scale so the map fills the viewport with slight overflow for drag feel
  const scaleX = vw / WORLD_W
  const scaleY = vh / WORLD_H
  return Math.max(scaleX, scaleY) * 1.15
}

// ── Road paths SVG ──

function renderRoadPaths() {
  return Object.entries(ROAD_PATHS).map(([key, d]) => {
    // Find which skill is at this building
    const slug = Object.entries(SLUG_TO_BUILDING).find(([, bk]) => bk === key)?.[0]
    const skill = slug ? _superSkills.find(s => getSlug(s) === slug) : null
    const color = skill ? getSkillColor(skill) : '#a08868'
    const progress = skill ? getSkillProgress(skill) : { pct: 0 }

    // Road style based on progress
    const opacity = progress.pct > 0 ? 0.7 : 0.3
    const width = progress.pct >= 100 ? 10 : progress.pct > 0 ? 7 : 5

    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"
      stroke-linecap="round" stroke-dasharray="${progress.pct >= 100 ? 'none' : '14 8'}"
      opacity="${opacity}" class="bt-road" data-slug="${slug || ''}" id="btRoad-${key}"/>`
  }).join('')
}

// ── Pin markers (small, mockup-style) ──

function addPin(world, p) {
  const el = document.createElement('div')
  el.className = `bt-pin${p.type === 'home' ? ' bt-pin-home' : ''}${p.progress?.pct >= 100 ? ' bt-pin-done' : ''}`
  el.style.left = p.x + 'px'
  el.style.top = p.y + 'px'
  el.tabIndex = 0

  if (p.type === 'home') {
    el.innerHTML = `
      <button class="bt-pin-btn" style="background:linear-gradient(135deg,#f2c94c,#e6a800);border-color:#fff">
        <span>${p.emoji}</span>
      </button>
      <span class="bt-pin-label">${escapeHtml(p.label)}</span>
    `
    el.querySelector('.bt-pin-btn').addEventListener('click', (e) => {
      e.stopPropagation()
      openDrawerHome()
    })
  } else {
    const stateClass = p.progress?.pct >= 100 ? 'bt-state-done' : p.progress?.pct > 0 ? 'bt-state-active' : ''
    const imgUrl = p.skill?.character_image_url
    el.innerHTML = `
      <button class="bt-pin-btn" style="border-color:${p.color}" data-slug="${p.slug}">
        ${imgUrl ? `<img src="${escapeHtml(imgUrl)}" alt="" class="bt-pin-img"/>` : `<span>${p.emoji}</span>`}
        ${stateClass ? `<span class="bt-pin-state ${stateClass}"></span>` : ''}
      </button>
      <span class="bt-pin-label">${escapeHtml(p.label)}</span>
      ${p.progress?.total > 0 ? `<span class="bt-pin-progress" style="background:${p.color}">${p.progress.done}/${p.progress.total}</span>` : ''}
    `
    el.querySelector('.bt-pin-btn').addEventListener('click', (e) => {
      e.stopPropagation()
      selectSkill(p.slug, p.skill)
    })
  }

  world.appendChild(el)
}

// ── Skill selection & road highlighting ──

function selectSkill(slug, skill) {
  _selectedSlug = slug

  // Highlight the selected road, dim others
  const roads = _container.querySelectorAll('.bt-road')
  roads.forEach(road => {
    const roadSlug = road.dataset.slug
    if (roadSlug === slug) {
      road.setAttribute('opacity', '0.9')
      road.setAttribute('stroke-width', '10')
      road.setAttribute('filter', 'url(#roadGlow)')
      road.classList.add('bt-road-active')
    } else {
      road.setAttribute('opacity', '0.15')
      road.removeAttribute('filter')
      road.classList.remove('bt-road-active')
    }
  })

  // Highlight the selected pin
  _container.querySelectorAll('.bt-pin-btn[data-slug]').forEach(btn => {
    btn.classList.toggle('bt-pin-selected', btn.dataset.slug === slug)
  })

  openDrawerSkill(skill)
}

function deselectSkill() {
  _selectedSlug = null

  // Reset roads
  const roads = _container.querySelectorAll('.bt-road')
  roads.forEach(road => {
    const slug = road.dataset.slug
    const skill = _superSkills.find(s => getSlug(s) === slug)
    const progress = skill ? getSkillProgress(skill) : { pct: 0 }
    road.setAttribute('opacity', progress.pct > 0 ? '0.7' : '0.3')
    road.setAttribute('stroke-width', progress.pct >= 100 ? '10' : progress.pct > 0 ? '7' : '5')
    road.removeAttribute('filter')
    road.classList.remove('bt-road-active')
  })

  // Reset pins
  _container.querySelectorAll('.bt-pin-btn').forEach(btn => {
    btn.classList.remove('bt-pin-selected')
  })
}

// ── Drawer ──

function openDrawerHome() {
  const stage = _container.querySelector('.bt-stage')
  const drawer = stage.querySelector('#btDrawer')
  const scrim = stage.querySelector('#btScrim')
  deselectSkill()

  drawer.innerHTML = `
    <div class="bt-drawer-head" style="border-bottom-color:#f2c94c">
      <button class="bt-drawer-close" aria-label="Close">\u2715</button>
      <div class="bt-drawer-emoji">\u26F2</div>
      <div class="bt-drawer-name">Town Square</div>
      <div class="bt-drawer-region">Home Base</div>
    </div>
    <div class="bt-drawer-body">
      <p>Welcome to Brain Town! This is where all the roads meet.</p>
      <p>Each building is a Super Skill. Tap one to explore it, or pick the adventure that feels right for you.</p>
      <p>The more you practise, the stronger your roads become!</p>
    </div>
    <div class="bt-drawer-foot">
      <button class="bt-drawer-cta" style="background:linear-gradient(135deg,#f2c94c,#e6a800);color:#16324f">Explore the map</button>
    </div>
  `
  drawer.querySelector('.bt-drawer-close').addEventListener('click', () => closeDrawer(stage))
  drawer.querySelector('.bt-drawer-cta').addEventListener('click', () => closeDrawer(stage))

  drawer.classList.add('open')
  scrim.classList.add('open')
  drawer.setAttribute('aria-hidden', 'false')
}

function openDrawerSkill(skill) {
  const stage = _container.querySelector('.bt-stage')
  const drawer = stage.querySelector('#btDrawer')
  const scrim = stage.querySelector('#btScrim')

  const slug = getSlug(skill)
  const color = getSkillColor(skill)
  const emoji = getSkillEmoji(skill)
  const copy = getSkillCopy(skill)
  const progress = getSkillProgress(skill)
  const name = skill.name || skill.title || slug

  drawer.innerHTML = `
    <div class="bt-drawer-head" style="border-bottom-color:${color}">
      <button class="bt-drawer-close" aria-label="Close">\u2715</button>
      ${skill.character_image_url
        ? `<img class="bt-drawer-char-img" src="${escapeHtml(skill.character_image_url)}" alt="" />`
        : `<div class="bt-drawer-emoji">${emoji}</div>`}
      <div class="bt-drawer-name">${escapeHtml(name)}</div>
      <div class="bt-drawer-region">${escapeHtml(copy.tag || 'Super Skill')}</div>
    </div>
    <div class="bt-drawer-body">
      <p>${escapeHtml(copy.description)}</p>
      ${copy.pickThisIf ? `<div class="bt-drawer-block"><div class="bt-drawer-label">Pick this if</div><p>${escapeHtml(copy.pickThisIf)}</p></div>` : ''}
      ${copy.youllLearn ? `<div class="bt-drawer-block"><div class="bt-drawer-label">You'll learn to</div><ul class="bt-drawer-list">${copy.youllLearn.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul></div>` : ''}
      ${progress.total > 0 ? `
        <div class="bt-progress">
          <div class="bt-progress-top"><span>Adventures completed</span><span>${progress.done} of ${progress.total}</span></div>
          <div class="bt-progress-track"><div class="bt-progress-fill" style="width:${progress.pct}%;background:${color}"></div></div>
          <div class="bt-progress-note">Every adventure makes this road stronger.</div>
        </div>
      ` : ''}
    </div>
    <div class="bt-drawer-foot">
      <button class="bt-drawer-cta" style="background:linear-gradient(135deg,${color},${color}dd);color:#fff">
        ${progress.done > 0 ? 'Continue Adventure' : 'Start Adventure'}
      </button>
    </div>
  `

  drawer.querySelector('.bt-drawer-close').addEventListener('click', () => closeDrawer(stage))
  drawer.querySelector('.bt-drawer-cta').addEventListener('click', () => {
    closeDrawer(stage)
    if (_onSelectSkill) _onSelectSkill(skill)
  })

  drawer.classList.add('open')
  scrim.classList.add('open')
  drawer.setAttribute('aria-hidden', 'false')
}

function closeDrawer(stage) {
  const drawer = stage.querySelector('#btDrawer')
  const scrim = stage.querySelector('#btScrim')
  if (drawer) { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true') }
  if (scrim) scrim.classList.remove('open')
  deselectSkill()
}

// ── Mobile fallback list ──

function renderMobileList(listEl) {
  listEl.innerHTML = `
    <div class="bt-mobile-heading">Super Skill Roads</div>
    ${_superSkills.map(skill => {
      const slug = getSlug(skill)
      const color = getSkillColor(skill)
      const emoji = getSkillEmoji(skill)
      const copy = getSkillCopy(skill)
      const progress = getSkillProgress(skill)
      return `
        <button class="bt-mobile-card" data-skill-id="${skill.id}">
          <span class="bt-mobile-emoji" style="background:${color}">${skill.character_image_url
            ? `<img src="${escapeHtml(skill.character_image_url)}" alt="" style="width:28px;height:28px;object-fit:contain"/>`
            : emoji}</span>
          <span class="bt-mobile-info">
            <b>${escapeHtml(skill.name || skill.title || slug)}</b>
            <span>${escapeHtml(copy.description)}</span>
            ${progress.total > 0 ? `
              <span class="bt-mobile-bar-wrap">
                <span class="bt-mobile-bar"><span class="bt-mobile-bar-fill" style="width:${progress.pct}%;background:${color}"></span></span>
                <span class="bt-mobile-progress">${progress.done}/${progress.total}</span>
              </span>
            ` : ''}
          </span>
        </button>
      `
    }).join('')}
  `
  listEl.querySelectorAll('.bt-mobile-card').forEach(card => {
    card.addEventListener('click', () => {
      const skill = _superSkills.find(s => String(s.id) === String(card.dataset.skillId))
      if (skill && _onSelectSkill) _onSelectSkill(skill)
    })
  })
}

// ── Pan & Zoom ──

function setupDrag(viewport, world) {
  viewport.addEventListener('pointerdown', e => {
    if (e.target.closest('.bt-drawer') || e.target.closest('.bt-controls') || e.target.closest('.bt-hint')) return
    // Don't capture pointer on pin clicks - let the click event fire normally
    if (e.target.closest('.bt-pin')) return
    if (e.pointerType === 'touch' && _pinchStartDist > 0) return
    _down = true; _moved = 0; _wasDragging = false
    _lastX = e.clientX; _lastY = e.clientY
    viewport.classList.add('grabbing')
    try { viewport.setPointerCapture(e.pointerId) } catch (_) {}
  })

  viewport.addEventListener('pointermove', e => {
    if (!_down) return
    const dx = e.clientX - _lastX, dy = e.clientY - _lastY
    _lastX = e.clientX; _lastY = e.clientY
    _moved += Math.abs(dx) + Math.abs(dy)
    if (_moved > 8) _wasDragging = true
    _tx += dx; _ty += dy
    clampPan(viewport)
    applyTransform(world)
  })

  const endPan = () => {
    _down = false
    viewport.classList.remove('grabbing')
    // Reset drag flag after a tick so click handlers can check it
    setTimeout(() => { _wasDragging = false }, 0)
  }
  viewport.addEventListener('pointerup', endPan)
  viewport.addEventListener('pointercancel', endPan)
}

function setupTouchZoom(viewport, world) {
  viewport.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      _pinchStartDist = getTouchDist(e.touches)
      _pinchStartScale = _scale
    }
  }, { passive: true })

  viewport.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && _pinchStartDist > 0) {
      e.preventDefault()
      const dist = getTouchDist(e.touches)
      const ratio = dist / _pinchStartDist
      _scale = clampScale(_pinchStartScale * ratio)
      clampPan(viewport)
      applyTransform(world)
    }
  }, { passive: false })

  viewport.addEventListener('touchend', () => { _pinchStartDist = 0 })
}

function getTouchDist(touches) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
}

function clampScale(s) {
  return Math.max(_minScale, Math.min(MAX_SCALE, s))
}

function updateMinScale(viewport) {
  // Min scale = map must cover the viewport entirely (no green border)
  const scaleX = viewport.clientWidth / WORLD_W
  const scaleY = viewport.clientHeight / WORLD_H
  _minScale = Math.max(scaleX, scaleY)
  // Clamp current scale if needed
  if (_scale < _minScale) _scale = _minScale
}

function applyTransform(world) {
  world.style.transform = `translate(${_tx}px,${_ty}px) scale(${_scale})`
}

function clampPan(viewport) {
  const vw = viewport.clientWidth, vh = viewport.clientHeight
  const ww = WORLD_W * _scale, wh = WORLD_H * _scale

  // Never show empty space: the map must always cover the entire viewport
  if (ww <= vw) {
    _tx = (vw - ww) / 2
  } else {
    _tx = Math.max(vw - ww, Math.min(0, _tx))
  }
  if (wh <= vh) {
    _ty = (vh - wh) / 2
  } else {
    _ty = Math.max(vh - wh, Math.min(0, _ty))
  }
}

function zoomBy(viewport, world, f, cx, cy) {
  const ns = clampScale(_scale * f)
  // Zoom towards center of viewport (or pointer position)
  const px = cx !== undefined ? cx - viewport.getBoundingClientRect().left : viewport.clientWidth / 2
  const py = cy !== undefined ? cy - viewport.getBoundingClientRect().top : viewport.clientHeight / 2
  _tx = px - (px - _tx) * (ns / _scale)
  _ty = py - (py - _ty) * (ns / _scale)
  _scale = ns
  clampPan(viewport)
  applyTransform(world)
}

function centerOn(viewport, world) {
  const vw = viewport.clientWidth, vh = viewport.clientHeight
  _tx = vw / 2 - TOWN_SQUARE.x * _scale
  _ty = vh / 2 - TOWN_SQUARE.y * _scale
  clampPan(viewport)
  applyTransform(world)
}
