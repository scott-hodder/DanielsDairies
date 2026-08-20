// ================================================
// SKILL JOURNEY MAP — "Inside the district"
//
// The view a child sees after tapping a Super Skill in Brain Town.
// Same art language as the town map: they have stepped INSIDE the
// district, and the trail to Brain City is the road they are building.
//
//   - One continuous road runs from the district depot (bottom-left)
//     through Trailhead → Village → Town Centre → Brain City.
//   - Every completed module PAVES a road segment and raises a little
//     building beside it that stays forever — the child's work visibly
//     builds the town (roads = neural pathways, made literal).
//   - The next module is a glowing construction site where the skill's
//     guide character waits with Daniel.
//   - Zones ahead are ghost outlines; Brain City sits pale on the
//     horizon until the child reaches it.
//   - Road Builder mini-game stops render as town gates between zones.
//
// This module renders the whole Adventures view (HUD + scene) for
// AdventureMapV4, which keeps owning the data: module list, statuses,
// cycles, unlock rules and click behaviour.
// ================================================

import { CATEGORY_THEMES } from '../../adventure-map-themes.js'
import { openRoadBuilderGame } from './roadBuilder.js'

/* ── Guide characters ─────────────────────────────────────────── */

const GUIDE_FALLBACK = {
  'brain-builder': { img: '/images/characters/superskill-characters/Lenny.webp', name: 'Lenny', district: "Lenny's Works Depot" },
  'thought-driver': { img: '/images/characters/superskill-characters/Coco.webp', name: 'Coco', district: "Coco's Lookout" },
  'emotion-navigator': { img: '/images/characters/superskill-characters/Kip.webp', name: 'Kip', district: "Kip's Resting Groves" },
  'behaviour-engineer': { img: '/images/characters/superskill-characters/Pepper.webp', name: 'Pepper', district: "Pepper's Night Pathways" },
  'resilience-architect': { img: '/images/characters/superskill-characters/Eddie.webp', name: 'Eddie', district: "Eddie's Shelter & Dig Site" },
  'social-mapper': { img: '/images/characters/superskill-characters/Kai.webp', name: 'Kai', district: "Kai's Town Square" },
  'future-designer': { img: '/images/characters/superskill-characters/Billie.webp', name: 'Billie', district: "Billie's Blueprint Burrows" },
}

function getGuide(slug) {
  const sk = (window.superSkills || []).find(s => s.slug === slug)
  const fb = GUIDE_FALLBACK[slug] || {}
  return {
    img: sk?.character_image_url || fb.img || '/images/characters/superskill-characters/Lenny.webp',
    name: sk?.character_name || fb.name || 'your guide',
    district: fb.district || (sk?.name ? `${sk.name} District` : 'the district'),
  }
}

/* ── Geometry helpers ─────────────────────────────────────────── */

// Smooth path through points (Catmull-Rom → cubic Bézier)
function smoothPath(pts, from = 0, to = pts.length - 1) {
  if (to <= from) return ''
  let d = `M${pts[from].x},${pts[from].y}`
  for (let i = from; i < to; i++) {
    const p0 = pts[Math.max(from, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(to, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x},${p2.y}`
  }
  return d
}

function seededRand(seed) {
  let v = (seed * 2654435761) % 2147483647
  if (v <= 0) v += 2147483646
  return () => { v = (v * 16807) % 2147483647; return (v - 1) / 2146483646 }
}

function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

/* ── Daniel's walk ────────────────────────────────────────────────
   When the child returns with new progress, Daniel WALKS the freshly
   built road from where he was to the new frontier (sprite frames +
   camera follow) instead of teleporting. Their work moves him. */

const WALK_FRAMES = [1, 2, 3, 4, 5].map(n => `/images/characters/daniel-walking${n}.png`)

function walkDaniel(svg, pts, fromIdx, toIdx, follow) {
  const daniel = svg?.querySelector('#sjDaniel')
  if (!daniel || toIdx <= fromIdx) return
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  probe.setAttribute('d', smoothPath(pts, fromIdx, toIdx))
  probe.setAttribute('fill', 'none')
  probe.setAttribute('stroke', 'none')
  svg.appendChild(probe)
  const fullLen = probe.getTotalLength()
  const len = Math.max(0, fullLen - 74) // stop just before the new site
  if (!len) { probe.remove(); return }
  WALK_FRAMES.forEach(src => { const i = new Image(); i.src = src })
  const idle = daniel.getAttribute('href')
  const dur = Math.min(3200, Math.max(1300, len * 3))
  const t0 = performance.now()
  let frame = 0
  let lastSwap = 0
  const step = (now) => {
    const raw = Math.min(1, (now - t0) / dur)
    const t = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2
    const pt = probe.getPointAtLength(len * t)
    daniel.setAttribute('x', pt.x - 42)
    daniel.setAttribute('y', pt.y - 80)
    if (now - lastSwap > 110) {
      frame = (frame + 1) % WALK_FRAMES.length
      daniel.setAttribute('href', WALK_FRAMES[frame])
      lastSwap = now
    }
    follow(pt.x)
    if (raw < 1) { requestAnimationFrame(step) } else {
      daniel.setAttribute('href', idle)
      probe.remove()
    }
  }
  requestAnimationFrame(step)
}

/* ── Scene constants ──────────────────────────────────────────── */

const H = 620                 // world height (viewBox units)
const HORIZON = 232           // meadow starts here
const ROAD_Y = 430            // road band centre
const START_X = 300           // first node x (after the depot)
const NODE_DX = 168           // spacing between nodes
const CITY_PAD = 620          // room for Brain City after the last node

/* ── Small scenery pieces (Brain Town vocabulary) ─────────────── */

function defsSvg(theme) {
  return `<defs>
    <linearGradient id="sjSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#AEE3F5"/><stop offset="100%" stop-color="#DDF2FB"/>
    </linearGradient>
    <radialGradient id="sjMeadow" cx="40%" cy="0%" r="120%">
      <stop offset="0%" stop-color="#BCE49E"/><stop offset="48%" stop-color="#98CF74"/>
      <stop offset="85%" stop-color="#77B45C"/><stop offset="100%" stop-color="#5D9A49"/>
    </radialGradient>
    <linearGradient id="sjWood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#C99263"/><stop offset="1" stop-color="#8A5B36"/></linearGradient>
    <linearGradient id="sjLeaf" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="#A9DB80"/><stop offset=".55" stop-color="#6FB05E"/><stop offset="1" stop-color="#487F4B"/></linearGradient>
    <linearGradient id="sjLeafDark" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="#7CB86A"/><stop offset="1" stop-color="#3C6E44"/></linearGradient>
    <linearGradient id="sjCream" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFF8E7"/><stop offset="1" stop-color="#EBD9B4"/></linearGradient>
    <linearGradient id="sjRoofSkill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${theme.color}" stop-opacity=".85"/><stop offset="1" stop-color="${theme.color}"/></linearGradient>
    <linearGradient id="sjRoofPink" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#F8A8CB"/><stop offset="1" stop-color="#E0619B"/></linearGradient>
    <linearGradient id="sjRoofGreen" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#77BD93"/><stop offset="1" stop-color="#3D8563"/></linearGradient>
    <linearGradient id="sjRoofAmber" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FBC968"/><stop offset="1" stop-color="#DE8F1F"/></linearGradient>
    <linearGradient id="sjWater" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#A8DFF2"/><stop offset="1" stop-color="#5FB6DF"/></linearGradient>
    <radialGradient id="sjGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFE9A8" stop-opacity=".9"/><stop offset="100%" stop-color="#FFE9A8" stop-opacity="0"/>
    </radialGradient>
    <pattern id="sjStripe" width="22" height="22" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <rect width="22" height="22" fill="#F6C445"/><rect width="11" height="22" fill="#3F4652"/>
    </pattern>
    <g id="sjTree">
      <ellipse cy="13" rx="17" ry="6" fill="#2F5B38" opacity=".16"/>
      <path d="M-4 -6 Q-5 7 -6 13 H6 Q5 7 4 -6Z" fill="url(#sjWood)"/>
      <circle cy="-19" r="21" fill="url(#sjLeaf)"/>
      <circle cx="-8" cy="-25" r="8" fill="#C4E8A0" opacity=".6"/>
    </g>
    <g id="sjPine">
      <ellipse cy="11" rx="13" ry="5" fill="#2F5B38" opacity=".16"/>
      <rect x="-3" y="-5" width="6" height="17" rx="2" fill="#7A5439"/>
      <path d="M0 -42 L-15 -16 H-8 L-18 4 H18 L8 -16 H15Z" fill="url(#sjLeafDark)"/>
    </g>
    <g id="sjBush">
      <ellipse cy="4" rx="15" ry="5" fill="#2F5B38" opacity=".13"/>
      <ellipse rx="14" ry="10" fill="url(#sjLeaf)"/><circle cx="-7" cy="-4" r="7" fill="#8CC470"/><circle cx="7" cy="-3" r="8" fill="#6FAE5C"/>
    </g>
    <g id="sjFlowerP"><path d="M0 2 V10" stroke="#4E8F45" stroke-width="2"/><circle cx="-3.4" cy="-1" r="3" fill="#F7A8C4"/><circle cx="3.4" cy="-1" r="3" fill="#F7A8C4"/><circle cy="-4.4" r="3" fill="#F7A8C4"/><circle cy="3.4" r="2.8" fill="#F7A8C4"/><circle r="2.5" fill="#FFE08B"/></g>
    <g id="sjFlowerY"><path d="M0 2 V10" stroke="#4E8F45" stroke-width="2"/><circle cx="-3.4" cy="-1" r="3" fill="#FFD66B"/><circle cx="3.4" cy="-1" r="3" fill="#FFD66B"/><circle cy="-4.4" r="3" fill="#FFD66B"/><circle cy="3.4" r="2.8" fill="#FFD66B"/><circle r="2.5" fill="#F78D5C"/></g>
    <g id="sjRock"><ellipse rx="12" ry="8" fill="#C4CFC6" stroke="#6E8478" stroke-width="2"/><path d="M-6 -3 Q0 -8 7 -3" fill="none" stroke="#E4EDE6" stroke-width="2" opacity=".7"/></g>
  </defs>`
}

// A little building that a completed module raises beside the road.
// Deterministic variety: four styles cycled by module ordinal. Buildings
// sit on the OUTSIDE of the road's curve — below high bends, above low
// ones — so they never crowd the road or drift into the sky band.
function grownBuilding(pt, ordinal, theme, zone = 0) {
  const zs = [0.8, 1, 1.18, 1.36][Math.min(3, zone)]
  const roofs = ['url(#sjRoofPink)', 'url(#sjRoofSkill)', 'url(#sjRoofGreen)', 'url(#sjRoofAmber)']
  const strokes = ['#C74C8B', theme.color, '#2D6A4F', '#B45309']
  const kind = ordinal % 4
  const roof = roofs[kind], stroke = strokes[kind]
  const above = pt.y >= ROAD_Y // low bend → build above the road
  const bx = pt.x + (ordinal % 2 === 0 ? 38 : -38)
  const roadHalf = [14, 20, 26, 33][Math.min(3, zone)]
  const by = above ? pt.y - 106 - roadHalf : pt.y + 40 + roadHalf
  if (kind === 3) {
    // Garden plot instead of a fourth house — variety keeps the street alive
    return `<g class="sj-grown" transform="translate(${bx},${by + 26}) scale(${zs})">
      <ellipse rx="34" ry="12" fill="#8CC470" opacity=".85"/>
      <ellipse rx="34" ry="12" fill="none" stroke="#5F9448" stroke-width="2" stroke-dasharray="4 6"/>
      <use href="#sjFlowerP" x="-14" y="-4"/><use href="#sjFlowerY" x="2" y="2"/><use href="#sjFlowerP" x="16" y="-6"/>
      <use href="#sjBush" x="-28" y="-8" transform="scale(.7)" transform-origin="-28 -8"/>
    </g>`
  }
  return `<g class="sj-grown" transform="translate(${bx},${by}) scale(${zs})">
    <ellipse cy="42" rx="42" ry="12" fill="#2F5D3A" opacity=".13"/>
    <rect x="-26" y="0" width="52" height="36" rx="6" fill="url(#sjCream)" stroke="${stroke}" stroke-width="3"/>
    <path d="M-32 0 Q0 -28 32 0Z" fill="${roof}" stroke="${stroke}" stroke-width="3"/>
    ${kind === 2
      ? `<circle cx="0" cy="14" r="8" fill="#EAF7FF" stroke="#7FA9C2" stroke-width="2.5"/><path d="M0 6 V22 M-8 14 H8" stroke="#7FA9C2" stroke-width="1.6"/>`
      : `<rect x="-18" y="8" width="14" height="12" rx="3" fill="#EAF7FF" stroke="#7FA9C2" stroke-width="2.2"/><rect x="6" y="8" width="13" height="20" rx="3" fill="url(#sjWood)" stroke="#5F4126" stroke-width="2.2"/>`}
    <path d="M0 -26 V-38" stroke="#8A94A8" stroke-width="2.5"/>
    <path d="M0 -38 L13 -33 L0 -28Z" fill="${theme.color}"/>
  </g>`
}

// The district depot — where the child "arrived" from Brain Town
function depotSvg(theme, districtName) {
  return `<g transform="translate(128,${ROAD_Y - 10})">
    <ellipse cy="74" rx="128" ry="36" fill="#D6E4F7" stroke="#9FB6CC" stroke-width="3.5" opacity=".9"/>
    <rect x="-72" y="-22" width="144" height="76" rx="9" fill="#F2F6FC" stroke="#5B679E" stroke-width="3.5"/>
    <rect x="-80" y="-38" width="160" height="18" rx="8" fill="url(#sjRoofSkill)" stroke="${theme.color}" stroke-width="3"/>
    <path d="M-44 -38 Q0 -92 44 -38Z" fill="#E7F6FF" stroke="#5B8FB0" stroke-width="3.5"/>
    <path d="M0 -38 V-80 M-22 -38 Q-12 -66 -4 -78 M22 -38 Q12 -66 4 -78" fill="none" stroke="#5B8FB0" stroke-width="2" opacity=".5"/>
    <path d="M-16 22 V54 H16 V22 Q0 8 -16 22Z" fill="url(#sjWood)" stroke="#5F4126" stroke-width="2.5"/>
    <rect x="-60" y="-6" width="26" height="20" rx="4" fill="#EAF7FF" stroke="#7FA9C2" stroke-width="2.5"/>
    <rect x="34" y="-6" width="26" height="20" rx="4" fill="#FFF3C2" stroke="#C9971F" stroke-width="2.5"/>
    <g transform="translate(100,20)">
      <rect x="-3" y="-44" width="6" height="66" rx="3" fill="url(#sjWood)"/>
      <path d="M-3 -42 H-56 L-64 -34 L-56 -26 H-3Z" fill="#FBEECB" stroke="#C9AA74" stroke-width="2"/>
      <text x="-32" y="-31" font-family="Fredoka" font-size="10.5" font-weight="700" fill="#8A5B36" text-anchor="middle">BRAIN TOWN</text>
    </g>
    <rect x="-92" y="86" width="184" height="30" rx="15" fill="rgba(255,255,255,.95)" stroke="${theme.color}" stroke-width="2"/>
    <text y="106" font-family="Fredoka" font-size="14" font-weight="700" fill="${theme.color}" text-anchor="middle">${esc(districtName)}</text>
  </g>`
}

// Zone landmark clusters. reached=false renders the ghost (dashed) form.
function zoneCluster(zoneIdx, x, reached, theme) {
  const ghost = reached ? '' : ` opacity=".42" stroke-dasharray="7 7"`
  const label = ['🌱 Trailhead', '🏡 Village', '⛲ Town Centre', '🏙️ Brain City'][zoneIdx]
  const y = HORIZON + 42
  let art = ''
  if (zoneIdx === 0) {
    art = `
      <g transform="translate(${x},${y + 34})">
        <path d="M-26 20 L0 -18 L26 20 Z" fill="#8B8DF5" stroke="#5457D6" stroke-width="3"/>
        <path d="M-7 20 L0 6 L7 20 Z" fill="#3F3F74"/>
        <g transform="translate(44,14)">
          <path d="M-9 4 L9 -2 M-9 -2 L9 4" stroke="#96683C" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M0 -4 Q-5 -11 -2 -17 Q0 -12 3 -15 Q5 -8 0 -4Z" fill="#F59E0B" class="sj-flicker"/>
        </g>
        <use href="#sjPine" x="-52" y="6"/>
      </g>`
  } else if (zoneIdx === 1) {
    // Village: a proper little hamlet — three cottages, fence, well
    art = `
      <g transform="translate(${x},${y})"${ghost}>
        <g transform="translate(-84,28)">
          <ellipse cy="44" rx="42" ry="11" fill="#2F5D3A" opacity=".12"/>
          <rect x="-30" y="-8" width="60" height="40" rx="7" fill="url(#sjCream)" stroke="#B58098" stroke-width="3"/>
          <path d="M-37 -8 Q0 -38 37 -8Z" fill="url(#sjRoofPink)" stroke="#C74C8B" stroke-width="3"/>
          <rect x="-18" y="4" width="14" height="12" rx="3" fill="#EAF7FF" stroke="#7FA9C2" stroke-width="2"/>
          <rect x="6" y="6" width="13" height="26" rx="3" fill="url(#sjWood)" stroke="#5F4126" stroke-width="2"/>
        </g>
        <g transform="translate(6,38)">
          <rect x="-26" y="-8" width="52" height="36" rx="6" fill="url(#sjCream)" stroke="#8878B0" stroke-width="3"/>
          <path d="M-33 -8 Q0 -34 33 -8Z" fill="url(#sjRoofSkill)" stroke="${theme.color}" stroke-width="3"/>
          <rect x="-12" y="2" width="12" height="11" rx="3" fill="#FFF3C2" stroke="#C9971F" stroke-width="2"/>
        </g>
        <g transform="translate(84,30)">
          <rect x="-24" y="-6" width="48" height="34" rx="6" fill="url(#sjCream)" stroke="#2D6A4F" stroke-width="3"/>
          <path d="M-30 -6 Q0 -30 30 -6Z" fill="url(#sjRoofGreen)" stroke="#2D6A4F" stroke-width="3"/>
        </g>
        <g transform="translate(46,80)">
          <path d="M-40 0 H40 M-40 9 H40" stroke="#B07D4B" stroke-width="3.5"/>
          <path d="M-36 -7 V14 M0 -7 V14 M36 -7 V14" stroke="#96683C" stroke-width="4" stroke-linecap="round"/>
        </g>
        ${reached ? `<use href="#sjFlowerP" x="-34" y="82"/><use href="#sjFlowerY" x="-116" y="86"/><use href="#sjTree" x="130" y="66" transform="scale(.85)" transform-origin="130 66"/>` : ''}
      </g>`
  } else if (zoneIdx === 2) {
    // Town Centre: a real square — plaza, fountain, two-storey buildings,
    // lamp posts. Clearly a step up from the village.
    art = `
      <g transform="translate(${x},${y + 26})"${ghost}>
        <ellipse cy="46" rx="120" ry="26" fill="#F8EDD2" stroke="#CBAE79" stroke-width="3"/>
        <circle cy="40" r="17" fill="url(#sjWater)" stroke="#5FA8CC" stroke-width="2.5"/>
        <circle cy="34" r="5.5" fill="#FFF8DE" stroke="#D9A520" stroke-width="1.6"/>
        <g transform="translate(-88,-24)">
          <rect x="-27" y="0" width="54" height="62" rx="6" fill="url(#sjCream)" stroke="#B07B33" stroke-width="3"/>
          <path d="M-33 0 Q0 -24 33 0Z" fill="url(#sjRoofAmber)" stroke="#B45309" stroke-width="3"/>
          <rect x="-17" y="10" width="12" height="11" rx="2.5" fill="#EAF7FF" stroke="#7FA9C2" stroke-width="1.8"/>
          <rect x="5" y="10" width="12" height="11" rx="2.5" fill="#FFF3C2" stroke="#C9971F" stroke-width="1.8"/>
          <rect x="-17" y="30" width="12" height="11" rx="2.5" fill="#FFF3C2" stroke="#C9971F" stroke-width="1.8"/>
          <rect x="5" y="30" width="12" height="11" rx="2.5" fill="#EAF7FF" stroke="#7FA9C2" stroke-width="1.8"/>
        </g>
        <g transform="translate(88,-18)">
          <rect x="-26" y="0" width="52" height="56" rx="6" fill="url(#sjCream)" stroke="#4E7A96" stroke-width="3"/>
          <path d="M-32 0 Q0 -22 32 0Z" fill="url(#sjRoofGreen)" stroke="#2D6A4F" stroke-width="3"/>
          <rect x="-16" y="9" width="11" height="10" rx="2.5" fill="#FFF3C2" stroke="#C9971F" stroke-width="1.8"/>
          <rect x="5" y="9" width="11" height="10" rx="2.5" fill="#EAF7FF" stroke="#7FA9C2" stroke-width="1.8"/>
          <rect x="-16" y="27" width="11" height="10" rx="2.5" fill="#EAF7FF" stroke="#7FA9C2" stroke-width="1.8"/>
          <rect x="5" y="27" width="11" height="10" rx="2.5" fill="#FFF3C2" stroke="#C9971F" stroke-width="1.8"/>
        </g>
        ${reached ? `
        <g transform="translate(-36,6)"><path d="M0 34 V-6" stroke="#5C6470" stroke-width="3"/><rect x="-6" y="-14" width="12" height="10" rx="3" fill="#FFE58B" stroke="#B8912E" stroke-width="1.8"/></g>
        <g transform="translate(36,6)"><path d="M0 34 V-6" stroke="#5C6470" stroke-width="3"/><rect x="-6" y="-14" width="12" height="10" rx="3" fill="#FFE58B" stroke="#B8912E" stroke-width="1.8"/></g>` : ''}
      </g>`
  } else {
    art = `
      <g transform="translate(${x},${y + 40})"${ghost}>
        <rect x="-70" y="-46" width="34" height="76" rx="5" fill="${reached ? 'url(#sjCream)' : '#DCE8F2'}" stroke="#4E7A96" stroke-width="3"/>
        <rect x="-24" y="-72" width="42" height="102" rx="5" fill="${reached ? '#F2F6FC' : '#DCE8F2'}" stroke="#5B679E" stroke-width="3"/>
        <rect x="30" y="-34" width="34" height="64" rx="5" fill="${reached ? 'url(#sjCream)' : '#DCE8F2'}" stroke="#4E7A96" stroke-width="3"/>
        <path d="M-24 -72 L-3 -92 L18 -72Z" fill="url(#sjRoofSkill)" stroke="${theme.color}" stroke-width="3"/>
        ${reached ? `
          <rect x="-62" y="-34" width="9" height="9" rx="2" fill="#FFF3C2"/><rect x="-48" y="-34" width="9" height="9" rx="2" fill="#EAF7FF"/>
          <rect x="-62" y="-16" width="9" height="9" rx="2" fill="#EAF7FF"/><rect x="-48" y="-16" width="9" height="9" rx="2" fill="#FFF3C2"/>
          <rect x="-14" y="-58" width="9" height="9" rx="2" fill="#FFF3C2"/><rect x="2" y="-58" width="9" height="9" rx="2" fill="#EAF7FF"/>
          <rect x="-14" y="-40" width="9" height="9" rx="2" fill="#EAF7FF"/><rect x="2" y="-40" width="9" height="9" rx="2" fill="#FFF3C2"/>
          <rect x="38" y="-22" width="8" height="8" rx="2" fill="#FFF3C2"/><rect x="50" y="-22" width="8" height="8" rx="2" fill="#EAF7FF"/>` : ''}
      </g>`
  }
  // Labels float on the horizon line, above the buildings — below they
  // collided with the road's high bends and the grown buildings
  const pillY = zoneIdx === 0 ? y - 46 : HORIZON - 44
  return `${art}
    <g transform="translate(${x},${pillY})">
      <rect x="-72" y="0" width="144" height="28" rx="14" fill="rgba(255,255,255,.95)" stroke="${reached ? theme.color : '#AEB9C4'}" stroke-width="2"/>
      <text y="19" font-family="Fredoka" font-size="13" font-weight="700" fill="${reached ? theme.color : '#7B8794'}" text-anchor="middle">${label}</text>
    </g>`
}

// Road Builder stop → a town gate between zones
function gateSvg(pt, entry) {
  const done = entry.status === 'completed'
  const locked = entry.status === 'locked'
  return `<g class="sj-node sj-gate${locked ? ' sj-locked' : ''}" data-node-index="${entry._idx}" transform="translate(${pt.x},${pt.y})" ${locked ? '' : 'role="button" tabindex="0"'}>
    ${done ? `
      <path d="M-34 10 V-30 Q0 -56 34 -30 V10" fill="none" stroke="#B07D4B" stroke-width="9" stroke-linecap="round"/>
      <path d="M-34 -28 Q0 -52 34 -28" fill="none" stroke="#FFF8E0" stroke-width="3" opacity=".6"/>
      <path d="M-40 8 h12 M28 8 h12" stroke="#96683C" stroke-width="5" stroke-linecap="round"/>
      <circle cy="-38" r="9" fill="#4ADE80" stroke="#22C55E" stroke-width="2.5"/>
      <text y="-33" font-size="11" text-anchor="middle" fill="#fff" font-weight="700">✓</text>` : `
      <circle r="40" fill="url(#sjGlow)" opacity="${locked ? 0 : 1}"/>
      <rect x="-38" y="-14" width="76" height="14" rx="7" fill="url(#sjStripe)" stroke="#7A6234" stroke-width="2" opacity="${locked ? .45 : .95}"/>
      <rect x="-34" y="-2" width="7" height="22" rx="3" fill="#A98B52" opacity="${locked ? .45 : 1}"/>
      <rect x="27" y="-2" width="7" height="22" rx="3" fill="#A98B52" opacity="${locked ? .45 : 1}"/>
      <text y="-24" font-size="19" text-anchor="middle" opacity="${locked ? .5 : 1}">🚧</text>
      ${!locked ? `<g transform="translate(0,40)"><rect x="-58" y="-12" width="116" height="24" rx="12" fill="rgba(255,255,255,.95)" stroke="#E9A23B" stroke-width="2"/><text y="5" font-family="Fredoka" font-size="11.5" font-weight="700" fill="#B45309" text-anchor="middle">Gate game — tap!</text></g>` : ''}`}
  </g>`
}

/* ── Main view ────────────────────────────────────────────────── */

let _stylesInjected = false
function injectStyles() {
  if (_stylesInjected || document.getElementById('sjStyles')) return
  _stylesInjected = true
  const st = document.createElement('style')
  st.id = 'sjStyles'
  st.textContent = `
.sj-hud{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 4px 12px}
.sj-skill{display:flex;align-items:center;gap:8px;background:#fff;border:2px solid #e7ecf3;border-radius:999px;padding:5px 14px 5px 7px;font-weight:700;font-size:14px;cursor:pointer;font-family:Fredoka,sans-serif;transition:transform .15s}
.sj-skill:hover{transform:translateY(-1px)}
.sj-skill img{width:30px;height:30px;object-fit:contain}
.sj-skill .sj-change{font-size:11px;font-weight:600;color:#6b7e95;margin-left:2px}
.sj-progress{flex:1;min-width:210px;display:flex;align-items:center;gap:9px}
.sj-progress .sj-plabel{font-size:12.5px;font-weight:600;color:#405878;white-space:nowrap;font-family:Fredoka,sans-serif}
.sj-track{flex:1;height:11px;background:#eef1f4;border-radius:999px;overflow:hidden;min-width:60px}
.sj-fill{height:100%;border-radius:999px;transition:width .6s ease}
.sj-back{background:#fff;color:#405878;border:2px solid #d7deea;border-radius:12px;padding:8px 14px;font-family:Fredoka,sans-serif;font-weight:700;font-size:12.5px;cursor:pointer;transition:transform .15s}
.sj-back:hover{transform:translateY(-1px)}
.sj-cycle{border:2px solid #d7deea;border-radius:10px;padding:6px 8px;font-family:Fredoka,sans-serif;font-size:12px;color:#405878;background:#fff}
.sj-viewport{position:relative;height:66vh;min-height:430px;max-height:640px;overflow:hidden;border-radius:20px;border:2px solid #e7ecf3;background:#AEE3F5;cursor:grab;touch-action:pan-y;user-select:none;box-shadow:0 8px 30px rgba(40,60,90,.10)}
.sj-viewport.dragging{cursor:grabbing}
.sj-world{position:absolute;top:0;left:0;height:100%;will-change:transform}
.sj-world svg{display:block;height:100%;width:auto}
.sj-node{cursor:pointer}
.sj-node.sj-locked{cursor:default}
.sj-node:focus-visible{outline:3px solid #f2c94c;outline-offset:3px;border-radius:10px}
.sj-halo{pointer-events:none;transform-box:fill-box;transform-origin:center;animation:sjHalo 2s ease-in-out infinite}
@keyframes sjHalo{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.16);opacity:.35}}
.sj-bob{transform-box:fill-box;transform-origin:center;animation:sjBob 3.4s ease-in-out infinite}
@keyframes sjBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.sj-flicker{transform-box:fill-box;transform-origin:bottom center;animation:sjFlick .8s ease-in-out infinite}
@keyframes sjFlick{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.22) scaleX(.92)}}
.sj-grown-new{transform-box:fill-box;transform-origin:center bottom;animation:sjPop .8s cubic-bezier(.3,1.6,.4,1) both}
@keyframes sjPop{from{transform:scale(0)}to{transform:scale(1)}}
.sj-pave-new{stroke-dasharray:1000;stroke-dashoffset:1000;animation:sjPave 1.4s ease-out .15s forwards}
@keyframes sjPave{to{stroke-dashoffset:0}}
.sj-controls{position:absolute;bottom:12px;right:12px;display:flex;flex-direction:column;gap:6px;z-index:5}
.sj-cb{width:40px;height:40px;border:none;border-radius:12px;background:#fff;color:#16324f;font-size:17px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.12);font-family:Fredoka,sans-serif}
.sj-cb:hover{transform:scale(1.07)}
.sj-hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(30,41,59,.82);color:#fff;padding:8px 18px;border-radius:22px;font-size:12.5px;font-weight:600;font-family:Fredoka,sans-serif;pointer-events:none;transition:opacity .5s;z-index:5}
@media(max-width:720px){.sj-viewport{height:56vh;min-height:360px}.sj-progress{order:3;flex-basis:100%}.sj-progress .sj-plabel{font-size:11px}}
@media(prefers-reduced-motion:reduce){.sj-halo,.sj-bob,.sj-flicker,.sj-grown-new,.sj-pave-new{animation:none!important}.sj-pave-new{stroke-dashoffset:0}}
`
  document.head.appendChild(st)
}

export function renderSkillJourneyView(map) {
  const container = document.getElementById('adventureMapContainer')
  if (!container) return
  injectStyles()

  const theme = CATEGORY_THEMES[map.currentCategory] || CATEGORY_THEMES.all
  const guide = getGuide(map.currentCategory)
  const entries = map.modules.map((m, i) => ({ ...m, _idx: i }))
  const real = entries.filter(e => !e.isRoadBuilder)
  const total = real.length
  const completed = real.filter(e => e.status === 'completed').length
  const stages = map.getTownStageMeta()
  const stageIndex = map.getTownStage()

  // Current node: the first playable thing on the road — an unlocked
  // module, a pending gate, or the next silently-unlockable module
  // (credits are invisible to the child, so it plays identically).
  let currentIdx = -1
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (e.status === 'available' || (e.status === 'locked' && e.canUnlock && !e.isRoadBuilder)) { currentIdx = i; break }
  }

  /* ── Geometry ── */
  const rand = seededRand(41)
  const pts = [{ x: 128, y: ROAD_Y }] // depot door
  entries.forEach((e, i) => {
    pts.push({ x: START_X + i * NODE_DX, y: ROAD_Y + Math.round(Math.sin(i * 1.05) * 62) })
  })
  const lastNodeX = pts[pts.length - 1].x
  const cityX = lastNodeX + CITY_PAD - 160
  pts.push({ x: cityX - 130, y: ROAD_Y - 40 }) // road runs on toward the city
  pts.push({ x: cityX, y: HORIZON + 150 })
  const W = cityX + 320

  const nodePt = i => pts[i + 1] // entries offset by depot point

  // ── Zones: the road itself grows with the town ──
  // Each entry belongs to a zone (3 modules per zone; a gate closes the
  // zone it ends). The road through a zone is one grade bigger than the
  // last: dirt track → gravel lane → paved road → grand avenue. Dragging
  // back, the child can see how far the road has come.
  const zoneOfEntry = entries.map(() => 0)
  {
    let ord = 0
    entries.forEach((e, i) => {
      if (e.isRoadBuilder) {
        zoneOfEntry[i] = Math.min(3, Math.max(0, Math.ceil(ord / 3) - 1))
      } else {
        zoneOfEntry[i] = Math.min(3, Math.floor(ord / 3))
        ord++
      }
    })
  }
  // Zone of each pts index (pt 0 = depot; trailing pts = the city road)
  const zoneOfPt = pts.map((_, pi) => {
    if (pi === 0) return 0
    if (pi - 1 < entries.length) return zoneOfEntry[pi - 1]
    return 3
  })

  // Road segments: paved through last completed entry; construction to the
  // current node; faint trail beyond.
  let lastCompletedIdx = -1
  entries.forEach((e, i) => { if (e.status === 'completed') lastCompletedIdx = i })
  const pavedEnd = lastCompletedIdx + 1              // pts index
  const constructionEnd = currentIdx >= 0 ? currentIdx + 1 : pavedEnd

  const constrD = constructionEnd > pavedEnd ? smoothPath(pts, Math.max(0, pavedEnd), constructionEnd) : ''
  const futureD = smoothPath(pts, Math.max(0, constructionEnd), pts.length - 1)

  // Built road, split into runs of equal zone so each zone keeps its grade
  const pavedRuns = []
  {
    let runStart = 0
    for (let pi = 1; pi <= pavedEnd; pi++) {
      const z = zoneOfPt[pi]
      const prevZ = zoneOfPt[Math.max(1, pi === 1 ? 1 : pi - 1)]
      if (pi > 1 && z !== prevZ) { pavedRuns.push({ from: runStart, to: pi - 1, zone: prevZ }); runStart = pi - 1 }
      if (pi === pavedEnd) pavedRuns.push({ from: runStart, to: pi, zone: z })
    }
  }

  // One grade of road per zone — each surface is unmistakably different:
  // dirt track → cobbled lane → bitumen road → grand bitumen avenue
  const ROAD_GRADES = [
    { edge: 22, edgeC: '#B99B6B', fill: 15, fillC: '#E3D2AC', center: null, cobble: false },
    { edge: 36, edgeC: '#A8946E', fill: 27, fillC: '#E6D9BC', center: null, cobble: true },
    { edge: 48, edgeC: '#E0C080', fill: 38, fillC: '#4A4A4A', center: { w: 3.5, dash: '16 20', c: '#FFFFFF' }, cobble: false },
    { edge: 62, edgeC: '#E0C080', fill: 50, fillC: '#3D3D3D', center: { w: 4, dash: '20 24', c: '#F2C94C' }, cobble: false },
  ]

  // Did the child just finish something? Animate the newest paving once.
  const child = window.state?.selectedChild
  const paveKey = `sj_paved_${child?.id || 'x'}_${map.currentCategory}`
  let animatePave = false
  try {
    const prev = parseInt(localStorage.getItem(paveKey) || '-1', 10)
    animatePave = completed > prev && prev >= 0
    localStorage.setItem(paveKey, String(completed))
  } catch (_) { /* private mode */ }

  /* ── Zone clusters: placed at the segment of their first module ── */
  const zoneStartOrdinals = [0, 3, 6, 9] // completed-count boundaries
  const zoneXs = zoneStartOrdinals.map(ord => {
    let seen = 0
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].isRoadBuilder) continue
      if (seen === ord) return nodePt(entries[i]._idx).x + 40
      seen++
    }
    return lastNodeX + 140
  })
  // Trailhead camp sits just BEFORE the first adventure (between the depot
  // and node 1); other clusters sit BETWEEN the zone boundary nodes so they
  // never collide with the buildings the nodes themselves grow
  zoneXs[0] = START_X - 88
  zoneXs[1] -= NODE_DX / 2 + 40
  zoneXs[2] -= NODE_DX / 2 + 40
  zoneXs[3] = cityX // the city IS the last zone

  /* ── Build scene ── */
  let s = defsSvg(theme)

  // Sky + horizon
  s += `<rect width="${W}" height="${HORIZON + 14}" fill="url(#sjSky)"/>`
  s += `<circle cx="170" cy="74" r="34" fill="#FFEFAF" opacity=".9"/><circle cx="170" cy="74" r="48" fill="#FFEFAF" opacity=".25"/>`
  for (let i = 0; i < Math.ceil(W / 560); i++) {
    const cx = 240 + i * 560 + (i % 2) * 90
    s += `<g opacity=".8"><ellipse cx="${cx}" cy="${52 + (i % 3) * 22}" rx="46" ry="15" fill="#fff"/><ellipse cx="${cx + 34}" cy="${60 + (i % 3) * 22}" rx="32" ry="12" fill="#fff"/></g>`
  }
  // Distant hills along the horizon
  for (let i = 0; i < Math.ceil(W / 700); i++) {
    s += `<path d="M${i * 700 - 80} ${HORIZON + 14} Q${i * 700 + 150} ${HORIZON - 52} ${i * 700 + 420} ${HORIZON + 14}Z" fill="#B9DCA4" opacity=".7"/>`
  }
  // Birds
  for (let i = 0; i < Math.ceil(W / 900); i++) {
    const bx = 420 + i * 900
    const by = 70 + (i % 3) * 30
    s += `<g opacity=".45" stroke="#4A5A6A" stroke-width="2.4" fill="none" stroke-linecap="round">
      <path d="M${bx - 8} ${by} Q${bx - 4} ${by - 6} ${bx} ${by} Q${bx + 4} ${by - 6} ${bx + 8} ${by}"/>
      <path d="M${bx + 30} ${by + 14} Q${bx + 33} ${by + 9} ${bx + 36} ${by + 14} Q${bx + 39} ${by + 9} ${bx + 42} ${by + 14}"/>
    </g>`
  }
  // Brain City skyline — pale until the child arrives (stage 3)
  const cityReached = stageIndex >= 3
  s += `<g opacity="${cityReached ? .95 : .38}">
    <g transform="translate(${cityX},${HORIZON + 12})">
      <path d="M-150 0 V-52 h20 v-20 h16 v20 h14 v52 M-88 0 V-84 h22 l7 -18 7 18 h20 V0 M-20 0 V-44 h30 v44 M22 0 V-66 h16 v-16 h14 v16 h14 v66 M78 0 V-38 h26 v38" fill="${cityReached ? '#8FB8D4' : '#A6C6DC'}"/>
      <circle cx="-49" cy="-112" r="9" fill="${cityReached ? '#F2C94C' : '#A6C6DC'}"/>
      <path d="M-170 0 H120" stroke="#7FA9C2" stroke-width="3"/>
    </g>
  </g>`

  // Meadow
  s += `<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#sjMeadow)"/>`
  s += `<path d="M0 ${HORIZON + 8} Q${W / 4} ${HORIZON - 8} ${W / 2} ${HORIZON + 6} Q${W * 3 / 4} ${HORIZON + 16} ${W} ${HORIZON + 4} V${HORIZON + 26} H0 Z" fill="#8CC470" opacity=".5"/>`

  // Scattered nature (kept clear of the road band)
  for (let i = 0; i < Math.floor(W / 130); i++) {
    const tx = 90 + i * 130 + rand() * 60
    const high = rand() > 0.5
    const ty = high ? HORIZON + 34 + rand() * 40 : ROAD_Y + 120 + rand() * 46
    const kind = rand() > 0.6 ? '#sjPine' : '#sjTree'
    const sc = (0.75 + rand() * 0.5).toFixed(2)
    s += `<use href="${kind}" x="${tx.toFixed(0)}" y="${ty.toFixed(0)}" transform="scale(${sc})" transform-origin="${tx.toFixed(0)} ${ty.toFixed(0)}"/>`
    if (i % 2 === 0) s += `<use href="#sjBush" x="${(tx + 70).toFixed(0)}" y="${(ty + 26).toFixed(0)}"/>`
    if (i % 3 === 0) s += `<use href="${i % 2 ? '#sjFlowerP' : '#sjFlowerY'}" x="${(tx - 46).toFixed(0)}" y="${(ty + 40).toFixed(0)}"/>`
    if (i % 5 === 4) s += `<use href="#sjRock" x="${(tx + 30).toFixed(0)}" y="${(ty - 30).toFixed(0)}"/>`
  }

  // Zone clusters (behind the road)
  for (let z = 0; z < 4; z++) {
    if (z === 3) continue // the city is drawn on the horizon
    s += zoneCluster(z, zoneXs[z], stageIndex >= z, theme)
  }
  // City label pill under the skyline
  s += `<g transform="translate(${cityX},${HORIZON + 96})">
    <rect x="-72" y="0" width="144" height="28" rx="14" fill="rgba(255,255,255,.95)" stroke="${cityReached ? theme.color : '#AEB9C4'}" stroke-width="2"/>
    <text y="19" font-family="Fredoka" font-size="13" font-weight="700" fill="${cityReached ? theme.color : '#7B8794'}" text-anchor="middle">🏙️ Brain City</text>
  </g>`

  // ── The road ──
  if (futureD) s += `<path d="${futureD}" fill="none" stroke="#C9AA74" stroke-width="26" stroke-dasharray="5 26" stroke-linecap="round" opacity=".35"/>`
  if (constrD) {
    const cg = ROAD_GRADES[Math.min(3, zoneOfPt[constructionEnd] ?? 0)]
    s += `<path d="${constrD}" fill="none" stroke="#C9AA74" stroke-width="${cg.edge + 4}" stroke-linecap="round" opacity=".55"/>`
    s += `<path d="${constrD}" fill="none" stroke="#E4D5AE" stroke-width="${cg.fill + 4}" stroke-dasharray="30 22" stroke-linecap="round" opacity=".85"/>`
  }
  // Draw wider (later) grades first so narrower early roads lie cleanly on
  // top at the seams; the junction pads under the gates mask the joins.
  const runsWideFirst = [...pavedRuns].sort((a, b) => b.zone - a.zone)
  const newestRun = pavedRuns[pavedRuns.length - 1]
  runsWideFirst.forEach((run) => {
    const g = ROAD_GRADES[run.zone]
    const d = smoothPath(pts, run.from, run.to)
    if (!d) return
    const isNewest = animatePave && run === newestRun
    s += `<path d="${d}" fill="none" stroke="#37583B" stroke-width="${g.edge + 2}" stroke-linecap="round" opacity=".14" transform="translate(0 6)"/>`
    s += `<path d="${d}" fill="none" stroke="${g.edgeC}" stroke-width="${g.edge}" stroke-linecap="round"/>`
    s += `<path d="${d}" fill="none" stroke="${g.fillC}" stroke-width="${g.fill}" stroke-linecap="round"${isNewest ? ' class="sj-pave-new" pathLength="1000"' : ''}/>`
    // Cobbled lane: speckled stone texture along the surface
    if (g.cobble) {
      s += `<path d="${d}" fill="none" stroke="#D3C4A0" stroke-width="${g.fill - 6}" stroke-dasharray="5 11" stroke-linecap="round" opacity=".85"/>`
      s += `<path d="${d}" fill="none" stroke="#C4B28C" stroke-width="${Math.max(6, g.fill - 16)}" stroke-dasharray="4 13" stroke-dashoffset="7" stroke-linecap="round" opacity=".6"/>`
    }
    if (g.center) s += `<path d="${d}" fill="none" stroke="${g.center.c}" stroke-width="${g.center.w}" stroke-dasharray="${g.center.dash}" stroke-linecap="round" opacity=".85"/>`
  })

  // Junction pads: every zone gate stands on a small round plaza that both
  // road grades plug into — no raw seams between surfaces.
  entries.forEach(e => {
    if (!e.isRoadBuilder) return
    const gpt = nodePt(e._idx)
    if (e._idx + 1 > constructionEnd) return // gate not on the built road yet
    const zNext = Math.min(3, zoneOfEntry[e._idx] + 1)
    const g = ROAD_GRADES[zNext]
    const padR = g.edge / 2 + 8
    s += `<circle cx="${gpt.x}" cy="${gpt.y}" r="${padR}" fill="#E6D9BC" stroke="#A8946E" stroke-width="3.5"/>`
    s += `<circle cx="${gpt.x}" cy="${gpt.y}" r="${padR - 8}" fill="none" stroke="#D3C4A0" stroke-width="3" stroke-dasharray="4 8" opacity=".8"/>`
  })

  // Depot (over the road start)
  s += depotSvg(theme, guide.district)

  // ── Nodes + grown buildings ──
  let ordinal = 0
  let newestCompleted = -1
  entries.forEach(e => { if (!e.isRoadBuilder && e.status === 'completed') newestCompleted = e._idx })

  entries.forEach(e => {
    const pt = nodePt(e._idx)
    if (e.isRoadBuilder) { s += gateSvg(pt, e); return }
    ordinal++
    const title = esc((e.module && (e.module.title || e.module.name)) || e.title || `Adventure ${ordinal}`)

    if (e.status === 'completed') {
      // Paved stop + the building this module raised
      const popNew = animatePave && e._idx === newestCompleted
      // The grown building is SCENERY — only the ✓ stud replays the module.
      // (Houses inside the tap target sent children into modules by accident.)
      s += `<g pointer-events="none"${popNew ? ' class="sj-grown-new"' : ''}>${grownBuilding(pt, ordinal - 1, theme, zoneOfEntry[e._idx])}</g>`
      s += `<g class="sj-node" data-node-index="${e._idx}" role="button" tabindex="0" aria-label="${title} — completed, tap to replay">
        <g transform="translate(${pt.x},${pt.y})">
          <circle r="18" fill="#F0DFB4" stroke="#C9AA74" stroke-width="3.5"/>
          <circle r="11.5" fill="#4ADE80" stroke="#22C55E" stroke-width="2.5"/>
          <text y="4.5" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">✓</text>
        </g>
      </g>`
    } else if (e._idx === currentIdx || e.status === 'available') {
      const isCurrent = e._idx === currentIdx
      s += `<g class="sj-node" data-node-index="${e._idx}" role="button" tabindex="0" aria-label="Play ${title}">
        <g transform="translate(${pt.x},${pt.y})">
          ${isCurrent ? `<circle r="52" fill="url(#sjGlow)" class="sj-halo"/>` : ''}
          <circle r="30" fill="#FBBF24" stroke="#fff" stroke-width="5"/>
          <circle r="30" fill="none" stroke="#F59E0B" stroke-width="3" opacity=".55"/>
          <text y="9" font-size="24" text-anchor="middle">🚧</text>
          <g transform="translate(0,46)"><rect x="-40" y="-11" width="80" height="22" rx="11" fill="rgba(255,255,255,.96)" stroke="#F59E0B" stroke-width="2"/><text y="4" font-family="Fredoka" font-size="11.5" font-weight="700" fill="#B45309" text-anchor="middle">Tap to build!</text></g>
        </g>
      </g>`
    } else {
      // Future site: quiet, numbered
      s += `<g class="sj-node${e.canUnlock ? '' : ' sj-locked'}" data-node-index="${e._idx}" ${e.canUnlock ? 'role="button" tabindex="0"' : ''} aria-label="${title} — coming up">
        <g transform="translate(${pt.x},${pt.y})" opacity=".8">
          <circle r="21" fill="#E4D5AE" stroke="#C9AA74" stroke-width="3" stroke-dasharray="6 6"/>
          <text y="6" font-size="14" text-anchor="middle" fill="#8A5B36" font-family="Fredoka" font-weight="700">${ordinal}</text>
        </g>
      </g>`
    }
  })

  // ── Characters at the frontier ──
  if (currentIdx >= 0) {
    const cp = nodePt(currentIdx)
    const prev = currentIdx === 0 ? pts[0] : nodePt(currentIdx - 1)
    const dx = (prev.x + cp.x) / 2 - 42
    const dy = (prev.y + cp.y) / 2 - 78
    const bubbleN = entries.slice(0, currentIdx + 1).filter(e => !e.isRoadBuilder).length
    const isGate = entries[currentIdx].isRoadBuilder
    // At a gate the guide waits on the NEAR side (the road is blocked);
    // at a build site they welcome the child from the far side
    const gx = isGate ? cp.x - 176 : cp.x + 34
    const bx2 = gx + 64
    s += `<image id="sjDaniel" href="/images/characters/DanielTheDog.webp" x="${dx}" y="${dy}" width="84" height="84"/>`
    s += `<g>
      <image href="${esc(guide.img)}" x="${gx}" y="${cp.y - 96}" width="74" height="74"/>
      <g transform="translate(${bx2},${cp.y - 148})">
        <rect x="-70" y="-20" width="140" height="44" rx="14" fill="#fff" stroke="#f2c94c" stroke-width="2.5"/>
        <path d="M-38 24 L-30 38 L-24 24Z" fill="#fff" stroke="#f2c94c" stroke-width="2.5"/>
        <text y="-3" font-family="Fredoka" font-size="12.5" font-weight="700" fill="#16324f" text-anchor="middle">${isGate ? 'A gate game blocks' : `Adventure ${bubbleN} is`}</text>
        <text y="13" font-family="Fredoka" font-size="12.5" font-weight="700" fill="#16324f" text-anchor="middle">${isGate ? 'the road — help us!' : 'ready to build!'}</text>
      </g>
    </g>`
  } else if (total > 0 && completed >= total) {
    // Everything built — celebrate at the city
    s += `<image href="/images/characters/Daniel_Celebrating.webp" x="${cityX - 150}" y="${HORIZON + 40}" width="104" height="104"/>`
    s += `<g><image href="${esc(guide.img)}" x="${cityX - 44}" y="${HORIZON + 52}" width="84" height="84"/></g>`
    s += `<g transform="translate(${cityX - 40},${HORIZON - 4})">
      <rect x="-108" y="-22" width="216" height="44" rx="14" fill="#fff" stroke="#f2c94c" stroke-width="2.5"/>
      <text y="-2" font-family="Fredoka" font-size="13" font-weight="700" fill="#16324f" text-anchor="middle">You built the whole road to Brain City!</text>
      <text y="15" font-family="Fredoka" font-size="12" fill="#405878" text-anchor="middle">Every path makes your brain stronger 🎉</text>
    </g>`
  }

  const sceneSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(theme.name)} journey map">${s}</svg>`

  /* ── HUD ── */
  const availableCycles = map.getAvailableCyclesForCategory()
  if (!map.currentCycleId && availableCycles.length > 0) map.syncCycleSelection(availableCycles)
  const cycleOptions = availableCycles.map(cycle => {
    const cycleNumber = cycle.cycle_number ? 'Cycle ' + cycle.cycle_number : 'Cycle'
    const label = cycle.name ? cycleNumber + ': ' + cycle.name : cycleNumber
    const selected = String(cycle.id) === String(map.currentCycleId) ? ' selected' : ''
    const done = map.isCycleCompletedWithWeekCheck(map.currentCategory, cycle.id) ? ' ✅' : ''
    return `<option value="${esc(cycle.id)}"${selected}>${esc(label)}${done}</option>`
  }).join('')

  const nextStage = stages[Math.min(stageIndex + 1, stages.length - 1)]
  const milestone = stages[stageIndex].milestone
  const left = milestone ? Math.max(0, milestone - completed) : 0
  const nextStop = !milestone
    ? 'You reached Brain City!'
    : left > 0
      ? `Next stop: ${nextStage.emoji} ${nextStage.label} — ${left} adventure${left === 1 ? '' : 's'} away`
      : `Play the gate game to enter ${nextStage.emoji} ${nextStage.label}!`
  const pct = total > 0 ? Math.round(completed / total * 100) : 0

  container.innerHTML = `
    <div class="sj-hud">
      <div class="sj-skill" id="openSkillPicker" title="Choose a different Super Skill">
        <img src="${esc(guide.img)}" alt=""><span style="color:${theme.color}">${esc(theme.name)}</span><span class="sj-change">Change</span>
      </div>
      ${availableCycles.length > 0 ? `<select class="sj-cycle" id="cycleFilter">${cycleOptions}</select>` : ''}
      <div class="sj-progress">
        <span class="sj-plabel">🛠️ ${completed} of ${total} roads paved</span>
        <div class="sj-track"><div class="sj-fill" style="width:${pct}%;background:linear-gradient(90deg,#f2c94c,#e6a800)"></div></div>
        <span class="sj-plabel">${nextStop}</span>
      </div>
      <button class="sj-back" id="sjBackToTown">🗺️ Back to Brain Town</button>
    </div>
    <div class="sj-viewport" id="sjViewport">
      <div class="sj-world" id="sjWorld">${sceneSvg}</div>
      <div class="sj-controls">
        <button class="sj-cb" id="sjCenter" title="Find Daniel">📍</button>
        <button class="sj-cb" id="sjHome" title="Back to the depot">⬅️</button>
      </div>
      <div class="sj-hint" id="sjHint">👆 Drag to explore your road</div>
    </div>`

  /* ── Pan (horizontal, clamped, centred on the action) ── */
  const viewport = container.querySelector('#sjViewport')
  const world = container.querySelector('#sjWorld')
  let tx = 0
  const scale = () => viewport.clientHeight / H
  const worldW = () => W * scale()
  const clamp = () => { tx = Math.min(0, Math.max(viewport.clientWidth - worldW(), tx)) }
  const apply = (smooth) => {
    if (smooth) {
      world.style.transition = 'transform .45s ease-out'
      setTimeout(() => { world.style.transition = '' }, 480)
    }
    world.style.transform = `translateX(${tx}px)`
  }
  const centerOn = (wx, smooth) => { tx = viewport.clientWidth / 2 - wx * scale(); clamp(); apply(smooth) }

  let down = false, lastX = 0, moved = 0
  viewport.addEventListener('pointerdown', e => { down = true; lastX = e.clientX; moved = 0; viewport.classList.add('dragging') })
  viewport.addEventListener('pointermove', e => {
    if (!down) return
    const dx = e.clientX - lastX
    tx += dx; moved += Math.abs(dx); lastX = e.clientX
    if (moved > 8) viewport.setPointerCapture?.(e.pointerId)
    clamp(); apply()
  })
  const up = () => { down = false; viewport.classList.remove('dragging') }
  viewport.addEventListener('pointerup', up)
  viewport.addEventListener('pointercancel', up)
  viewport.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); tx -= e.deltaX }
    else if (e.shiftKey) { e.preventDefault(); tx -= e.deltaY }
    else return
    clamp(); apply()
  }, { passive: false })

  const focusX = currentIdx >= 0 ? nodePt(currentIdx).x : (completed >= total && total > 0 ? cityX - 60 : START_X)

  // Frontier memory: when the child returns having progressed, Daniel
  // walks the new road (camera following) instead of teleporting.
  const frontKey = `sj_front_${child?.id || 'x'}_${map.currentCategory}`
  const targetPtIdx = currentIdx >= 0 ? currentIdx + 1 : (total > 0 && completed >= total ? pts.length - 1 : -1)
  let prevPtIdx = -1
  try {
    prevPtIdx = parseInt(localStorage.getItem(frontKey) ?? '-1', 10)
    if (targetPtIdx >= 0) localStorage.setItem(frontKey, String(targetPtIdx))
  } catch (_) { /* private mode */ }
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const shouldWalk = !noMotion && prevPtIdx >= 1 && targetPtIdx > prevPtIdx

  if (shouldWalk) {
    requestAnimationFrame(() => {
      centerOn(pts[prevPtIdx].x, false)
      walkDaniel(world.querySelector('svg'), pts, prevPtIdx, targetPtIdx, (x) => {
        tx = viewport.clientWidth / 2 - x * scale()
        clamp(); apply(false)
      })
    })
  } else {
    requestAnimationFrame(() => centerOn(focusX, false))
  }
  container.querySelector('#sjCenter')?.addEventListener('click', () => centerOn(focusX, true))
  container.querySelector('#sjHome')?.addEventListener('click', () => { tx = 0; apply(true) })
  setTimeout(() => { const h = container.querySelector('#sjHint'); if (h) h.style.opacity = '0' }, 4500)

  /* ── Interactions (same behaviour contract as the classic map) ── */
  container.querySelector('#sjBackToTown')?.addEventListener('click', () => {
    if (window.showDashboardTab) window.showDashboardTab('dashboard')
  })

  const activate = (el) => {
    if (moved > 8) return // it was a drag, not a tap
    const entry = entries[parseInt(el.dataset.nodeIndex, 10)]
    if (!entry) return
    if (entry.isRoadBuilder) {
      if (entry.status === 'locked' || entry.status === 'completed') return
      openRoadBuilderGame(entry.zoneTransition, () => map.render())
      return
    }
    if (entry.status === 'locked') {
      if (entry.canUnlock && typeof window.autoUnlockAndStart === 'function') {
        window.autoUnlockAndStart(entry.module || entry)
      } else if (typeof window.showUnlockResultModal === 'function') {
        window.showUnlockResultModal({
          title: 'Almost there!',
          message: "Let's build this road one step at a time. Tap the glowing spot!",
          type: 'error'
        })
      }
      return
    }
    if (entry.status === 'available' && !map.arePreviousModulesComplete(entry._idx)) {
      window.showUnlockResultModal?.({
        title: 'Not quite yet!',
        message: 'Finish the earlier adventures first — every road needs its start.',
        type: 'error'
      })
      return
    }
    map.onNodeClick(entry, el)
  }
  world.addEventListener('click', e => {
    const el = e.target.closest('.sj-node')
    if (el) { e.stopPropagation(); activate(el) }
  })
  world.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const el = e.target.closest('.sj-node')
    if (el) { e.preventDefault(); activate(el) }
  })

  // Skill picker + cycle select keep their legacy ids; the map instance
  // binds them in setupEventListeners()
  map.viewport = null
  map.canvas = null
  map.setupEventListeners()
}
