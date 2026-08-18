// ================================================
// BRAIN TOWN SVG MAP — Magical Kids' World
//
// Structure:
//   1. Config (world, districts, roads, hub)
//   2. Defs (gradients, filters, reusable symbols)
//   3. Themed prop renderers (per-district props)
//   4. Landmark renderers (one hero building per district)
//   5. District renderer (organic ground zone + props + landmark)
//   6. Town Square renderer (magical hub)
//   7. World decorations (nature, lakes, bridges)
//   8. Sky layer (clouds, balloon, birds)
//   9. Road renderer (tiered, with selection glow)
//  10. District markers (bobbing pins + name pills)
//  11. SVG content builder
//  12. Pan/Zoom (bounds-clamped)
//  13. Daniel character (idle + walk-toward)
//  14. Skill popup (fixed overlay — screen coordinates)
//  15. Injected styles
//  16. Public API (initSvgMap)
// ================================================

import { getSuperSkills } from '../../services/databaseService.js'
import { KID_FRIENDLY_COPY } from '../../adventure-map-themes.js'
import { computeSkillStates, getUnlockRequirement, isPractitionerSession, applyPractitionerOverride } from './superSkillGate.js'

/* ─────────────────────────────────────────────
   1. CONFIG
   ───────────────────────────────────────────── */

const W = 2400, H = 1800
const CX = 1200, CY = 900 // Town Square centre

// Lite mode: SVG filters and always-on idle animations force the browser
// to re-rasterise the whole 2400×1800 map every frame, which makes panning
// crawl on weak hardware. In lite mode the scenery is rasterised once to a
// bitmap and filters/ambient animation are stripped.
//
// Triggers: touch devices, small screens, low-end desktops (few cores /
// little RAM), or a previous visit where the FPS probe measured the full
// map running slowly on this machine (persisted flag).
const LITE_FLAG_KEY = 'dd_bt_lite'
const LITE_MODE = (() => {
  try {
    if (localStorage.getItem(LITE_FLAG_KEY) === '1') return true
    if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820) return true
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return true
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) return true
    return false
  } catch (_) { return false }
})()

// Exactly 7 Super Skill districts. Do not add more.
// Placement follows the DD Town Map Build Brief compass, spread on an even
// ring around the Town Square so no two districts crowd each other:
// Coco north (lookout, high ground), Kip west (calm green quarter),
// Eddie south (dug into low ground), Billie east (the "future" edge),
// Lenny south-west, Kai south-east, Pepper on the raised NE paths.
const DISTRICTS = {
  'brain-builder': {
    x: 560, y: 1400, label: 'Brain Builder', color: '#6366F1', accent: '#4338CA',
    district: "Lenny's Works Depot", emoji: '\u{1F9E0}',
    zoneColor: '#D6E4F7', zoneRx: 250, zoneRy: 215, seed: 11,
    desc: 'Master your mind through understanding how your brain works!',
  },
  'thought-driver': {
    x: 1200, y: 470, label: 'Thought Driver', color: '#8B5CF6', accent: '#6D28D9',
    district: "Coco's Lookout", emoji: '\u{1F9E9}',
    zoneColor: '#FBF3D0', zoneRx: 310, zoneRy: 250, seed: 23,
    desc: 'Take control of your thoughts and steer them in positive directions!',
  },
  'emotion-navigator': {
    x: 260, y: 920, label: 'Emotion Navigator', color: '#EC4899', accent: '#BE185D',
    district: "Kip's Resting Groves", emoji: '\u{1F49B}',
    zoneColor: '#DFF0DA', zoneRx: 300, zoneRy: 260, seed: 37,
    desc: 'Navigate through all emotions with confidence and skill!',
  },
  'behaviour-engineer': {
    x: 1930, y: 460, label: 'Behaviour Engineer', color: '#F59E0B', accent: '#D97706',
    district: "Pepper's Night Pathways", emoji: '⚡',
    zoneColor: '#E4D9F7', zoneRx: 310, zoneRy: 260, seed: 41,
    desc: 'Build powerful habits and take charge of your actions!',
  },
  'resilience-architect': {
    x: 1200, y: 1500, label: 'Resilience Architect', color: '#40916c', accent: '#2D6A4F',
    district: "Eddie's Shelter & Dig Site", emoji: '\u{1F6E1}️',
    zoneColor: '#EBDCC2', zoneRx: 280, zoneRy: 240, seed: 53,
    desc: 'Build inner strength and bounce back from challenges!',
  },
  'social-mapper': {
    x: 1790, y: 1430, label: 'Social Mapper', color: '#E05297', accent: '#BE185D',
    district: "Kai's Town Square", emoji: '\u{1F91D}',
    zoneColor: '#FBEECB', zoneRx: 260, zoneRy: 225, seed: 67,
    desc: 'Map your social world and build stronger connections!',
  },
  'future-designer': {
    x: 2090, y: 910, label: 'Future Designer', color: '#0EA5E9', accent: '#0284C7',
    district: "Billie's Blueprint Burrows", emoji: '\u{1F52E}',
    zoneColor: '#D8EDFA', zoneRx: 310, zoneRy: 260, seed: 79,
    desc: 'Design your future with imagination and planning!',
  },
}

const ROAD_PATHS = {
  'brain-builder':        `M${CX},${CY} C1030,1010 800,1200 660,1320 Q605,1362 560,1400`,
  'thought-driver':       `M${CX},${CY} C1200,790 1205,650 1205,570 Q1202,515 1200,470`,
  'emotion-navigator':    `M${CX},${CY} C1000,920 680,930 460,925 Q350,920 260,920`,
  'behaviour-engineer':   `M${CX},${CY} C1380,790 1580,640 1750,550 Q1845,500 1930,460`,
  'resilience-architect': `M${CX},${CY} C1195,1080 1198,1240 1199,1360 Q1200,1440 1200,1500`,
  'social-mapper':        `M${CX},${CY} C1330,1000 1550,1200 1690,1320 Q1745,1378 1790,1430`,
  'future-designer':      `M${CX},${CY} C1420,865 1700,855 1890,880 Q1995,895 2090,910`,
}

// The central hub — clickable, opens its own welcome popup.
const HUB = {
  slug: 'brain-town',
  label: 'Brain Town',
  color: '#F2B33D', accent: '#D98E1B',
  emoji: '\u{1F3F0}',
  district: 'Town Square',
  desc: "Welcome to Brain Town — your brain's home base! Your journey starts at Brain Builder, and each Super Skill you finish unlocks the next one. Every module builds a stronger road back to town.",
}

/* ─────────────────────────────────────────────
   2. DEFS — gradients, filters, reusable symbols
   ───────────────────────────────────────────── */

function renderDefs() {
  return `<defs>
    <!-- Roadworks barrier stripes (locked Super Skill roads) -->
    <pattern id="btWorksStripe" width="26" height="26" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <rect width="26" height="26" fill="#F6C445"/><rect width="13" height="26" fill="#3F4652"/>
    </pattern>
    <!-- World gradients -->
    <radialGradient id="btMeadowG" cx="50%" cy="46%" r="75%">
      <stop offset="0%" stop-color="#BCE49E"/><stop offset="48%" stop-color="#98CF74"/>
      <stop offset="82%" stop-color="#77B45C"/><stop offset="100%" stop-color="#5D9A49"/>
    </radialGradient>
    <radialGradient id="btVignetteG" cx="50%" cy="50%" r="72%">
      <stop offset="0%" stop-color="#1E4526" stop-opacity="0"/><stop offset="78%" stop-color="#1E4526" stop-opacity="0"/>
      <stop offset="100%" stop-color="#1E4526" stop-opacity="0.16"/>
    </radialGradient>
    <linearGradient id="btSkyWashG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#AEE3F5" stop-opacity="0.4"/><stop offset="100%" stop-color="#AEE3F5" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="btHubGlowG" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFE9A8" stop-opacity="0.5"/><stop offset="60%" stop-color="#FFE9A8" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#FFE9A8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="btWaterG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#A8DFF2"/><stop offset="100%" stop-color="#5FB6DF"/>
    </linearGradient>
    <!-- Material gradients -->
    <linearGradient id="btWoodG" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#C99263"/><stop offset="1" stop-color="#8A5B36"/></linearGradient>
    <linearGradient id="btStoneG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#C4CFC6"/><stop offset="1" stop-color="#8FA396"/></linearGradient>
    <linearGradient id="btCreamWallG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFF8E7"/><stop offset="1" stop-color="#EBD9B4"/></linearGradient>
    <linearGradient id="btLabWallG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#F2F6FC"/><stop offset="1" stop-color="#C9D6EA"/></linearGradient>
    <linearGradient id="btLeafG" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="#A9DB80"/><stop offset=".55" stop-color="#6FB05E"/><stop offset="1" stop-color="#487F4B"/></linearGradient>
    <linearGradient id="btLeafDarkG" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="#7CB86A"/><stop offset="1" stop-color="#3C6E44"/></linearGradient>
    <linearGradient id="btBlossomG" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="#FBD3E0"/><stop offset="1" stop-color="#EE9BBB"/></linearGradient>
    <linearGradient id="btWindowG" x1="0" y1="0" x2="0.6" y2="1"><stop stop-color="#EAF7FF"/><stop offset="1" stop-color="#A9CFE3"/></linearGradient>
    <radialGradient id="btLitWinG" cx="50%" cy="45%" r="70%"><stop stop-color="#FFF3C2"/><stop offset="1" stop-color="#F5C64B"/></radialGradient>
    <radialGradient id="btBulbG" cx="45%" cy="38%" r="72%"><stop stop-color="#FFFBE3"/><stop offset="1" stop-color="#FFD34D"/></radialGradient>
    <linearGradient id="btDomeGlassG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#E7F6FF" stop-opacity=".95"/><stop offset="1" stop-color="#9CC8E0" stop-opacity=".9"/></linearGradient>
    <!-- Per-district roof gradients -->
    <linearGradient id="btRoofIndigoG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8B8DF5"/><stop offset="1" stop-color="#5457D6"/></linearGradient>
    <linearGradient id="btRoofVioletG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#B79BF7"/><stop offset="1" stop-color="#7C4DDB"/></linearGradient>
    <linearGradient id="btRoofPinkG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#F8A8CB"/><stop offset="1" stop-color="#E0619B"/></linearGradient>
    <linearGradient id="btRoofAmberG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FBC968"/><stop offset="1" stop-color="#DE8F1F"/></linearGradient>
    <linearGradient id="btRoofGreenG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#77BD93"/><stop offset="1" stop-color="#3D8563"/></linearGradient>
    <linearGradient id="btRoofBerryG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#EC8BBB"/><stop offset="1" stop-color="#C74C8B"/></linearGradient>
    <linearGradient id="btRoofSkyG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#7FCBF0"/><stop offset="1" stop-color="#2E93C9"/></linearGradient>
    <linearGradient id="btRocketG" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#FFF4F0"/><stop offset="1" stop-color="#F0B9AD"/></linearGradient>
    <radialGradient id="btBalloonG" cx="42%" cy="35%" r="75%"><stop stop-color="#FFD9E4"/><stop offset="1" stop-color="#F27DA0"/></radialGradient>
    <radialGradient id="btOrbG" cx="45%" cy="40%" r="70%"><stop stop-color="#FFF8DE"/><stop offset=".6" stop-color="#FFDD7A"/><stop offset="1" stop-color="#F0AE33"/></radialGradient>
    <linearGradient id="btPlazaG" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#F8EDD2"/><stop offset="1" stop-color="#E8D4A8"/></linearGradient>
    <!-- Grass texture -->
    <pattern id="btGrassP" width="46" height="46" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="8" r="1.1" fill="#4E7F3E" opacity="0.2"/><circle cx="30" cy="16" r="0.9" fill="#CBE8A4" opacity="0.3"/>
      <circle cx="16" cy="34" r="1" fill="#4E7F3E" opacity="0.18"/><circle cx="38" cy="38" r="0.8" fill="#E0F2BE" opacity="0.25"/>
      <path d="M22 26 q1 -4 3 -5 M23 26 q0 -4 -1 -6" stroke="#5F9448" stroke-width="1" fill="none" opacity="0.25"/>
    </pattern>
    <!-- Filters -->
    <filter id="btSoftShadow" x="-15%" y="-15%" width="130%" height="140%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="#1E3A28" flood-opacity="0.16"/>
    </filter>
    <filter id="btLandmarkShadow" x="-30%" y="-35%" width="160%" height="180%">
      <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#26432f" flood-opacity=".26"/>
      <feDropShadow dx="0" dy="-2" stdDeviation="2" flood-color="#fff8dc" flood-opacity=".22"/>
    </filter>
    <filter id="btPinShadow" x="-20%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="1" dy="3" stdDeviation="3.5" flood-color="#12263A" flood-opacity="0.22"/>
    </filter>
    <filter id="btRoadGlow">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- Reusable nature symbols -->
    <g id="btTreeRound">
      <ellipse cy="14" rx="19" ry="7" fill="#2F5B38" opacity=".18"/>
      <path d="M-4 -6 Q-5 8 -6 14 H6 Q5 8 4 -6Z" fill="url(#btWoodG)"/>
      <circle cy="-20" r="23" fill="url(#btLeafG)"/>
      <circle cx="-9" cy="-27" r="9" fill="#C4E8A0" opacity=".6"/>
      <circle cx="10" cy="-13" r="7" fill="#3C6E44" opacity=".35"/>
    </g>
    <g id="btTreePine">
      <ellipse cy="12" rx="15" ry="6" fill="#2F5B38" opacity=".18"/>
      <rect x="-3" y="-6" width="6" height="19" rx="2" fill="#7A5439"/>
      <path d="M0 -46 L-17 -18 H-9 L-20 4 H20 L9 -18 H17Z" fill="url(#btLeafDarkG)"/>
      <path d="M0 -46 L-9 -31 L-2 -32Z" fill="#B9E093" opacity=".55"/>
    </g>
    <g id="btTreeBlossom">
      <ellipse cy="14" rx="18" ry="7" fill="#2F5B38" opacity=".16"/>
      <path d="M-3 -4 Q-4 8 -5 14 H5 Q4 8 3 -4Z" fill="url(#btWoodG)"/>
      <circle cy="-17" r="20" fill="url(#btBlossomG)"/>
      <circle cx="-8" cy="-23" r="8" fill="#FDE7EF" opacity=".75"/>
      <circle cx="6" cy="-12" r="2" fill="#fff" opacity=".7"/><circle cx="-2" cy="-25" r="1.8" fill="#fff" opacity=".7"/><circle cx="12" cy="-20" r="1.6" fill="#fff" opacity=".6"/>
    </g>
    <g id="btBush">
      <ellipse cy="4" rx="17" ry="6" fill="#2F5B38" opacity=".14"/>
      <ellipse rx="16" ry="11" fill="url(#btLeafG)"/><circle cx="-8" cy="-5" r="8" fill="#8CC470"/><circle cx="8" cy="-4" r="9" fill="#6FAE5C"/>
      <circle cx="-3" cy="-9" r="3" fill="#C4E8A0" opacity=".7"/>
    </g>
    <g id="btFlowerPink"><path d="M0 2 V12" stroke="#4E8F45" stroke-width="2"/><circle cx="-4" cy="-1" r="3.6" fill="#F7A8C4"/><circle cx="4" cy="-1" r="3.6" fill="#F7A8C4"/><circle cy="-5" r="3.6" fill="#F7A8C4"/><circle cy="4" r="3.4" fill="#F7A8C4"/><circle r="3" fill="#FFE08B"/></g>
    <g id="btFlowerYellow"><path d="M0 2 V12" stroke="#4E8F45" stroke-width="2"/><circle cx="-4" cy="-1" r="3.6" fill="#FFD66B"/><circle cx="4" cy="-1" r="3.6" fill="#FFD66B"/><circle cy="-5" r="3.6" fill="#FFD66B"/><circle cy="4" r="3.4" fill="#FFD66B"/><circle r="3" fill="#F78D5C"/></g>
    <g id="btFlowerPurple"><path d="M0 2 V12" stroke="#4E8F45" stroke-width="2"/><circle cx="-4" cy="-1" r="3.6" fill="#C3A9EE"/><circle cx="4" cy="-1" r="3.6" fill="#C3A9EE"/><circle cy="-5" r="3.6" fill="#C3A9EE"/><circle cy="4" r="3.4" fill="#C3A9EE"/><circle r="3" fill="#FFF3C2"/></g>
    <g id="btMushroom">
      <ellipse cy="8" rx="9" ry="3.5" fill="#2F5B38" opacity=".16"/>
      <path d="M-4 8 Q-5 0 -4 -2 H4 Q5 0 4 8Z" fill="#FFF3DD" stroke="#D9B98C" stroke-width="1.5"/>
      <path d="M-11 -2 Q0 -18 11 -2Z" fill="#F26D6D" stroke="#D14B4B" stroke-width="1.5"/>
      <circle cx="-4" cy="-7" r="2" fill="#FFE9E0"/><circle cx="4" cy="-5" r="1.6" fill="#FFE9E0"/>
    </g>
    <g id="btRock"><ellipse rx="14" ry="9" fill="url(#btStoneG)" stroke="#6E8478" stroke-width="2"/><path d="M-7 -3 Q0 -9 8 -3" fill="none" stroke="#E4EDE6" stroke-width="2" opacity=".7"/><ellipse cx="-5" cy="6" rx="5" ry="2" fill="#5F9448" opacity=".5"/></g>
    <g id="btFence"><path d="M-28 0 H28 M-28 10 H28" stroke="#B07D4B" stroke-width="4"/><path d="M-24 -8 V16 M0 -8 V16 M24 -8 V16" stroke="#96683C" stroke-width="5" stroke-linecap="round"/></g>
    <g id="btLantern"><path d="M0 12 V-20" stroke="#6B5847" stroke-width="4"/><rect x="-7" y="-31" width="14" height="14" rx="4" fill="#FFE58B" stroke="#8A6D38" stroke-width="2.5" class="bt-glow"/><circle cy="-24" r="9" fill="#FFE9A8" opacity=".3" class="bt-glow"/></g>
    <g id="btSparkle"><path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8Z" fill="#FFEFB0"/></g>
    <g id="btGrassTuft"><path d="M0 4 Q-2 -8 -8 -12 M0 4 Q2 -10 8 -13 M0 4 V-13" fill="none" stroke="#55904A" stroke-width="2.5" stroke-linecap="round"/></g>
    <g id="btPebbles"><circle cx="-13" r="3" fill="#C9B388"/><circle cx="0" cy="3" r="2.6" fill="#D5C398"/><circle cx="13" cy="-2" r="3" fill="#BCA87E"/></g>
    <g id="btButterfly">
      <ellipse cx="-4" cy="-2" rx="5" ry="7" fill="#F9AECB" transform="rotate(-24)"/>
      <ellipse cx="4" cy="-2" rx="5" ry="7" fill="#C3A9EE" transform="rotate(24)"/>
      <rect x="-1.2" y="-5" width="2.4" height="10" rx="1.2" fill="#5A4636"/>
    </g>
  </defs>`
}

/* ─────────────────────────────────────────────
   3. THEMED PROP RENDERERS
   Small items scattered inside each district zone.
   ───────────────────────────────────────────── */

const prop = {
  // ── Brain Builder ──
  bookStack(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse cy="7" rx="20" ry="5" fill="#2F5B38" opacity=".14"/>
      <rect x="-15" y="-4" width="30" height="8" rx="2" fill="#5457D6"/><rect x="-13" y="-3" width="26" height="2.5" rx="1" fill="#8B8DF5"/>
      <rect x="-17" y="-12" width="34" height="8" rx="2" fill="#F5A93F"/><rect x="-15" y="-11" width="30" height="2.5" rx="1" fill="#FBC968"/>
      <rect x="-13" y="-19" width="26" height="7" rx="2" fill="#E0619B"/>
      <rect x="-15" y="-26" width="30" height="7" rx="2" fill="#4E9E6F"/><rect x="-13" y="-25" width="26" height="2" rx="1" fill="#77BD93"/>
    </g>`
  },
  ideaBulb(x, y) {
    return `<g transform="translate(${x},${y})">
      <rect x="-4" y="-4" width="8" height="16" rx="2" fill="#8A94A8"/>
      <circle cy="-16" r="11" fill="url(#btBulbG)" stroke="#D9A520" stroke-width="2.5" class="bt-glow"/>
      <path d="M-3 -6 h6" stroke="#B8862B" stroke-width="2"/>
      <use href="#btSparkle" x="14" y="-26" class="bt-twinkle" transform="scale(.8)" transform-origin="14 -26"/>
      <use href="#btSparkle" x="-15" y="-22" class="bt-twinkle-d" transform="scale(.6)" transform-origin="-15 -22"/>
    </g>`
  },
  blueprintBoard(x, y) {
    return `<g transform="translate(${x},${y})">
      <path d="M-14 6 L-18 20 M14 6 L18 20" stroke="#96683C" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="-22" y="-24" width="44" height="32" rx="3" fill="#3F6FA8" stroke="#2C5079" stroke-width="2.5"/>
      <path d="M-14 -14 h20 M-14 -7 h26 M-14 0 h14" stroke="#CFE6FA" stroke-width="2" opacity=".85"/>
      <circle cx="10" cy="-2" r="4" fill="none" stroke="#CFE6FA" stroke-width="1.6" opacity=".85"/>
    </g>`
  },
  gearSolo(x, y) {
    return `<g transform="translate(${x},${y})">
      <g class="bt-spin"><circle r="11" fill="none" stroke="#8A94A8" stroke-width="6" stroke-dasharray="5 4.6"/><circle r="7" fill="#C6CEDC" stroke="#8A94A8" stroke-width="2"/></g>
      <circle r="3" fill="#6E7889"/>
    </g>`
  },

  // ── Thought Driver ──
  signpost(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse cy="14" rx="14" ry="4.5" fill="#2F5B38" opacity=".14"/>
      <rect x="-3" y="-42" width="6" height="56" rx="2" fill="url(#btWoodG)" stroke="#75512F" stroke-width="1.5"/>
      <path d="M-30 -40 H26 L34 -33 L26 -26 H-30Z" fill="#C3A9EE" stroke="#8B6BC9" stroke-width="2"/>
      <text y="-30" text-anchor="middle" font-size="8" fill="#4A2F84" font-weight="700" font-family="Fredoka,sans-serif">THINK</text>
      <path d="M30 -22 H-26 L-34 -15 L-26 -8 H30Z" fill="#B9DCF5" stroke="#5F94BD" stroke-width="2"/>
      <text y="-12" text-anchor="middle" font-size="8" fill="#1E4B6B" font-weight="700" font-family="Fredoka,sans-serif">PLAN</text>
    </g>`
  },
  compassDial(x, y) {
    return `<g transform="translate(${x},${y})">
      <circle r="16" fill="#FFF7E0" stroke="#8B5CF6" stroke-width="3"/>
      <circle r="12" fill="none" stroke="#C3A9EE" stroke-width="1.5" stroke-dasharray="2 4"/>
      <g class="bt-spin-slow"><path d="M0 -9 L3 0 L0 9 L-3 0Z" fill="#8B5CF6"/><path d="M0 -9 L3 0 H-3Z" fill="#EF6A6A"/></g>
      <circle r="2.2" fill="#4A2F84"/>
    </g>`
  },
  thoughtBubble(x, y) {
    return `<g transform="translate(${x},${y})" class="bt-bob-slow">
      <ellipse cy="-14" rx="22" ry="14" fill="#fff" stroke="#8B5CF6" stroke-width="2" opacity=".92"/>
      <circle cx="-9" cy="3" r="4" fill="#fff" stroke="#8B5CF6" stroke-width="1.5" opacity=".75"/>
      <circle cx="-13" cy="10" r="2.5" fill="#fff" stroke="#8B5CF6" stroke-width="1.2" opacity=".55"/>
      <text y="-9" text-anchor="middle" font-size="11" fill="#8B5CF6" font-weight="700">?!</text>
    </g>`
  },

  // ── Emotion Navigator ──
  emotionStone(x, y, face, color) {
    return `<g transform="translate(${x},${y})">
      <ellipse cy="9" rx="15" ry="4.5" fill="#2F5B38" opacity=".14"/>
      <ellipse rx="15" ry="12" fill="${color}" stroke="#00000022" stroke-width="1.5"/>
      <ellipse cx="-4" cy="-5" rx="6" ry="3.5" fill="#fff" opacity=".35"/>
      <text y="5" text-anchor="middle" font-size="14">${face}</text>
    </g>`
  },
  heartTopiary(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse cy="16" rx="12" ry="4" fill="#2F5B38" opacity=".16"/>
      <rect x="-3" y="-2" width="6" height="18" rx="2" fill="url(#btWoodG)"/>
      <path d="M0 -6 C-12 -22 -30 -8 -14 6 L0 16 L14 6 C30 -8 12 -22 0 -6Z" fill="url(#btLeafG)" stroke="#487F4B" stroke-width="2"/>
      <circle cx="-9" cy="-8" r="3" fill="#F7A8C4"/><circle cx="9" cy="-8" r="3" fill="#F7A8C4"/><circle cy="2" r="2.6" fill="#FFE08B"/>
    </g>`
  },
  lilyPond(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse rx="34" ry="15" fill="url(#btWaterG)" stroke="#7FBFDD" stroke-width="3"/>
      <ellipse cx="-8" cy="2" rx="12" ry="4" fill="#fff" opacity=".2"><animate attributeName="opacity" values=".2;.35;.2" dur="3.4s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="12" cy="-4" rx="8" ry="4" fill="#6FAE5C"/><circle cx="12" cy="-6" r="3" fill="#F7A8C4"/>
    </g>`
  },

  // ── Behaviour Engineer ──
  workbench(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse cy="17" rx="26" ry="5" fill="#2F5B38" opacity=".14"/>
      <rect x="-25" y="-4" width="50" height="7" rx="2" fill="url(#btWoodG)" stroke="#75512F" stroke-width="1.5"/>
      <rect x="-21" y="3" width="5" height="14" fill="#8A5B36"/><rect x="16" y="3" width="5" height="14" fill="#8A5B36"/>
      <rect x="-14" y="-9" width="9" height="5" rx="1" fill="#8A94A8"/>
      <rect x="3" y="-11" width="4" height="7" rx="1" fill="#F5A93F"/>
      <circle cx="15" cy="-7" r="3.4" fill="none" stroke="#8A94A8" stroke-width="2"/>
    </g>`
  },
  gearPair(x, y) {
    return `<g transform="translate(${x},${y})">
      <g class="bt-spin"><circle cx="-8" r="12" fill="none" stroke="#E9A23B" stroke-width="6" stroke-dasharray="5.5 4.8"/><circle cx="-8" r="7" fill="#FBEECB" stroke="#E9A23B" stroke-width="2"/></g>
      <g class="bt-spin-rev"><circle cx="11" cy="5" r="9" fill="none" stroke="#C97F16" stroke-width="5" stroke-dasharray="4.5 4"/><circle cx="11" cy="5" r="5" fill="#FBEECB" stroke="#C97F16" stroke-width="2"/></g>
    </g>`
  },
  toolCrate(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse cy="12" rx="18" ry="4.5" fill="#2F5B38" opacity=".14"/>
      <rect x="-16" y="-10" width="32" height="21" rx="3" fill="url(#btWoodG)" stroke="#75512F" stroke-width="2"/>
      <path d="M-16 -3 H16 M-5 -10 V11" stroke="#75512F" stroke-width="1.6" opacity=".7"/>
      <path d="M-8 -14 q8 -7 16 0" fill="none" stroke="#8A94A8" stroke-width="3"/>
      <rect x="4" y="-19" width="4" height="8" rx="1" fill="#F26D6D"/>
    </g>`
  },

  // ── Resilience Architect ──
  brickPile(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse cy="9" rx="20" ry="4.5" fill="#2F5B38" opacity=".14"/>
      <rect x="-17" y="-2" width="15" height="8" rx="1.5" fill="#C86048" stroke="#A34632" stroke-width="1.2"/>
      <rect x="2" y="-2" width="15" height="8" rx="1.5" fill="#DA7259" stroke="#A34632" stroke-width="1.2"/>
      <rect x="-10" y="-10" width="15" height="8" rx="1.5" fill="#C86048" stroke="#A34632" stroke-width="1.2"/>
      <rect x="7" y="-10" width="10" height="8" rx="1.5" fill="#DA7259" stroke="#A34632" stroke-width="1.2"/>
      <rect x="-4" y="-17" width="12" height="7" rx="1.5" fill="#C86048" stroke="#A34632" stroke-width="1.2"/>
    </g>`
  },
  shieldStand(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse cy="16" rx="14" ry="4" fill="#2F5B38" opacity=".16"/>
      <rect x="-2.5" y="-8" width="5" height="24" rx="2" fill="url(#btWoodG)"/>
      <path d="M0 -28 L-13 -19 V-6 Q0 9 0 9 Q0 9 13 -6 V-19Z" fill="url(#btRoofGreenG)" stroke="#2D6A4F" stroke-width="2.5"/>
      <path d="M0 -24 L-9 -18 V-8 Q0 3 0 3Z" fill="#fff" opacity=".22"/>
      <circle cy="-13" r="4.5" fill="#FFE08B" stroke="#C9971F" stroke-width="1.6"/>
    </g>`
  },
  climbingRope(x, y) {
    return `<g transform="translate(${x},${y})">
      <path d="M-14 -34 H14" stroke="#96683C" stroke-width="4" stroke-linecap="round"/>
      <path d="M0 -34 q3 12 -1 22 q-2 8 1 16" fill="none" stroke="#D9B98C" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M-3 -22 h6 M-3 -10 h6 M-3 1 h6" stroke="#B08A54" stroke-width="2.5"/>
      <path d="M-14 -34 V4 M14 -34 V4" stroke="#96683C" stroke-width="4" stroke-linecap="round"/>
    </g>`
  },

  // ── Social Mapper ──
  picnicRug(x, y) {
    return `<g transform="translate(${x},${y})">
      <path d="M-30 0 L0 -14 L30 0 L0 14Z" fill="#F9C8D9" stroke="#E27FA6" stroke-width="2"/>
      <path d="M-15 -7 L15 7 M15 -7 L-15 7" stroke="#fff" stroke-width="2" opacity=".6"/>
      <circle cx="-6" cy="-1" r="4" fill="#FFE08B" stroke="#C9971F" stroke-width="1.4"/>
      <circle cx="7" cy="3" r="3" fill="#F26D6D"/>
    </g>`
  },
  chatSign(x, y) {
    return `<g transform="translate(${x},${y})" class="bt-bob-slow">
      <path d="M-20 -26 H20 Q26 -26 26 -20 V-6 Q26 0 20 0 H2 L-4 8 L-4 0 H-20 Q-26 0 -26 -6 V-20 Q-26 -26 -20 -26Z" fill="#fff" stroke="#E05297" stroke-width="2.5"/>
      <circle cx="-10" cy="-13" r="2.6" fill="#E05297"/><circle cy="-13" r="2.6" fill="#E05297"/><circle cx="10" cy="-13" r="2.6" fill="#E05297"/>
    </g>`
  },
  swingSet(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse cy="8" rx="30" ry="5" fill="#2F5B38" opacity=".14"/>
      <path d="M-20 -36 L-27 4 M20 -36 L27 4 M-20 -36 H20" stroke="#8FA3B8" stroke-width="3.5" stroke-linecap="round"/>
      <g class="bt-sway-s" transform-origin="-7 -36"><path d="M-6 -36 L-8 -8" stroke="#B7C4D2" stroke-width="2"/><rect x="-13" y="-8" width="10" height="4" rx="2" fill="#E05297"/></g>
      <g class="bt-sway" transform-origin="7 -36"><path d="M6 -36 L8 -10" stroke="#B7C4D2" stroke-width="2"/><rect x="3" y="-10" width="10" height="4" rx="2" fill="#8B5CF6"/></g>
    </g>`
  },

  // ── Future Designer ──
  telescope(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse cy="12" rx="16" ry="4.5" fill="#2F5B38" opacity=".16"/>
      <path d="M-10 10 L0 -10 M10 10 L0 -10" stroke="#6E7889" stroke-width="3" stroke-linecap="round"/>
      <path d="M0 -10 L17 -27" stroke="#3D4A5C" stroke-width="6" stroke-linecap="round"/>
      <circle cx="20" cy="-30" r="5.5" fill="#0C4A6E" stroke="#7FCBF0" stroke-width="2"/>
      <use href="#btSparkle" x="28" y="-40" class="bt-twinkle" transform="scale(.7)" transform-origin="28 -40"/>
    </g>`
  },
  paintPots(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse cy="8" rx="20" ry="4.5" fill="#2F5B38" opacity=".14"/>
      <rect x="-19" y="-6" width="11" height="13" rx="2.5" fill="#F26D6D" stroke="#C94B4B" stroke-width="1.6"/>
      <rect x="-5" y="-9" width="11" height="16" rx="2.5" fill="#5FB6DF" stroke="#3487AC" stroke-width="1.6"/>
      <rect x="9" y="-5" width="11" height="12" rx="2.5" fill="#FFD66B" stroke="#C9971F" stroke-width="1.6"/>
      <rect x="-2" y="-19" width="4" height="12" rx="1.6" fill="#96683C" transform="rotate(24 0 -13)"/>
    </g>`
  },
  miniRocket(x, y) {
    return `<g transform="translate(${x},${y})" class="bt-bob-slow">
      <path d="M0 -26 Q9 -14 9 0 H-9 Q-9 -14 0 -26Z" fill="url(#btRocketG)" stroke="#C97C6C" stroke-width="2"/>
      <circle cy="-8" r="4" fill="url(#btWindowG)" stroke="#3487AC" stroke-width="1.6"/>
      <path d="M-9 -4 L-15 6 L-9 4 M9 -4 L15 6 L9 4" fill="#F26D6D" stroke="#C94B4B" stroke-width="1.4"/>
      <path d="M-3 1 Q0 9 3 1" fill="#FFD66B" class="bt-twinkle"/>
    </g>`
  },
}

// Prop placement per district (dx/dy relative to district centre)
const DISTRICT_PROPS = {
  'brain-builder': [
    { fn: 'bookStack', dx: -150, dy: 70 },
    { fn: 'ideaBulb', dx: 150, dy: -20 },
    { fn: 'blueprintBoard', dx: -120, dy: -100 },
    { fn: 'gearSolo', dx: 170, dy: 80 },
    { fn: 'bookStack', dx: 90, dy: 120 },
  ],
  'thought-driver': [
    { fn: 'signpost', dx: -130, dy: -50 },
    { fn: 'compassDial', dx: 140, dy: 60 },
    { fn: 'thoughtBubble', dx: 90, dy: -110 },
    { fn: 'signpost', dx: 160, dy: -50 },
  ],
  'emotion-navigator': [
    { fn: 'emotionStone', dx: -140, dy: 80, args: ['\u{1F60A}', '#FFE082'] },
    { fn: 'emotionStone', dx: -95, dy: 110, args: ['\u{1F622}', '#90CAF9'] },
    { fn: 'emotionStone', dx: 130, dy: 100, args: ['\u{1F621}', '#EF9A9A'] },
    { fn: 'heartTopiary', dx: 160, dy: -50 },
    { fn: 'lilyPond', dx: -150, dy: -70 },
  ],
  'behaviour-engineer': [
    { fn: 'workbench', dx: -140, dy: 70 },
    { fn: 'gearPair', dx: 150, dy: -30 },
    { fn: 'toolCrate', dx: -100, dy: -100 },
    { fn: 'workbench', dx: 100, dy: 100 },
  ],
  'resilience-architect': [
    { fn: 'brickPile', dx: -140, dy: 80 },
    { fn: 'shieldStand', dx: 150, dy: -40 },
    { fn: 'climbingRope', dx: 110, dy: 90 },
    { fn: 'brickPile', dx: 70, dy: -110 },
  ],
  'social-mapper': [
    { fn: 'picnicRug', dx: -140, dy: 80 },
    { fn: 'chatSign', dx: 130, dy: -60 },
    { fn: 'swingSet', dx: 70, dy: 110 },
    { fn: 'picnicRug', dx: 90, dy: -100 },
  ],
  'future-designer': [
    { fn: 'telescope', dx: -130, dy: -50 },
    { fn: 'paintPots', dx: 140, dy: 70 },
    { fn: 'miniRocket', dx: -70, dy: 100 },
    { fn: 'telescope', dx: 110, dy: -90 },
  ],
}

/* ─────────────────────────────────────────────
   4. LANDMARK RENDERERS
   One hero building per district, drawn in local
   coordinates (centre 0,0; ground line ~y=70).
   ───────────────────────────────────────────── */

// Soft grassy pad every landmark sits on
function landmarkPad(fill, stroke) {
  return `<ellipse cx="0" cy="86" rx="150" ry="46" fill="#2F5D3A" opacity=".14"/>
    <ellipse cx="0" cy="76" rx="142" ry="42" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
    <path d="M-116 70 Q0 102 116 70" fill="none" stroke="#FFFFFF" stroke-width="5" opacity=".28"/>`
}

// Cool glass window with a shine swoosh
function glassWin(x, y, w, h, rx = 5) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#btWindowG)" stroke="#7FA9C2" stroke-width="3"/>
    <path d="M${x + 3} ${y + h * 0.55} Q${x + w * 0.4} ${y + h * 0.2} ${x + w - 3} ${y + h * 0.45}" stroke="#fff" stroke-width="2.5" opacity=".6" fill="none"/>`
}

// Warm lit window (glows gently)
function litWin(x, y, w, h, rx = 5) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#btLitWinG)" stroke="#C9971F" stroke-width="3" class="bt-glow"/>`
}

// Rounded door with knob
function door(x, y, w, h, fill = 'url(#btWoodG)') {
  return `<path d="M${x} ${y + h} V${y + h * 0.35} Q${x + w / 2} ${y - h * 0.25} ${x + w} ${y + h * 0.35} V${y + h}Z" fill="${fill}" stroke="#5F4126" stroke-width="3"/>
    <circle cx="${x + w * 0.76}" cy="${y + h * 0.55}" r="2.6" fill="#FFD66B"/>`
}

// Waving pennant flag on a pole
function flag(x, y, color, len = 20) {
  return `<g transform="translate(${x},${y})">
    <path d="M0 0 V-26" stroke="#8A94A8" stroke-width="3" stroke-linecap="round"/>
    <path d="M0 -26 L${len} -19 L0 -12Z" fill="${color}">
      <animateTransform attributeName="transform" type="rotate" values="0 0 -26;6 0 -26;0 0 -26;-4 0 -26;0 0 -26" dur="3.4s" repeatCount="indefinite"/>
    </path>
  </g>`
}

// String of bunting triangles between two points
function bunting(x1, y1, x2, y2, colors) {
  const n = colors.length
  let s = `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.max(y1, y2) + 14} ${x2} ${y2}" fill="none" stroke="#8A6D38" stroke-width="2"/>`
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const bx = x1 + (x2 - x1) * t
    const by = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * 13
    s += `<path d="M${bx - 6} ${by} L${bx + 6} ${by} L${bx} ${by + 11}Z" fill="${colors[i]}"/>`
  }
  return s
}

const LANDMARKS = {
  // Brain Builder — Invention Lab with glass dome + glowing idea bulb
  'brain-builder': () => `
    ${landmarkPad('#DCE8F5', '#9FB6CC')}
    <rect x="-92" y="-18" width="184" height="94" rx="10" fill="url(#btLabWallG)" stroke="#5B679E" stroke-width="4"/>
    <path d="M-92 8 H92" stroke="#B4C3DD" stroke-width="2.5" opacity=".7"/>
    <rect x="-102" y="-34" width="204" height="20" rx="9" fill="url(#btRoofIndigoG)" stroke="#4338CA" stroke-width="3.5"/>
    <path d="M-88 -28 H30" stroke="#C7C9FA" stroke-width="4" opacity=".55" stroke-linecap="round"/>
    <path d="M-56 -34 Q0 -106 56 -34Z" fill="url(#btDomeGlassG)" stroke="#5B8FB0" stroke-width="4"/>
    <path d="M0 -34 V-88 M-30 -34 Q-18 -70 -6 -86 M30 -34 Q18 -70 6 -86" fill="none" stroke="#5B8FB0" stroke-width="2.5" opacity=".55"/>
    <path d="M-38 -46 Q0 -92 38 -46" fill="none" stroke="#fff" stroke-width="4" opacity=".55"/>
    <path d="M0 -88 V-102" stroke="#8A94A8" stroke-width="4"/>
    <circle cy="-114" r="12" fill="url(#btBulbG)" stroke="#D9A520" stroke-width="3" class="bt-glow"/>
    <path d="M-4 -102 h8" stroke="#B8862B" stroke-width="3"/>
    <use href="#btSparkle" x="20" y="-124" class="bt-twinkle"/>
    <use href="#btSparkle" x="-19" y="-118" class="bt-twinkle-d" transform="scale(.7)" transform-origin="-19 -118"/>
    <circle cx="-58" cy="10" r="17" fill="url(#btWindowG)" stroke="#7FA9C2" stroke-width="3.5"/>
    <path d="M-58 -7 V27 M-75 10 H-41" stroke="#7FA9C2" stroke-width="2"/>
    ${glassWin(38, -4, 40, 30, 6)}
    ${litWin(38, 40, 40, 26, 6)}
    ${door(-20, 26, 40, 50)}
    <g transform="translate(84,-52)"><g class="bt-spin"><circle r="15" fill="none" stroke="#8B8DF5" stroke-width="7" stroke-dasharray="6.5 5.6"/><circle r="9" fill="#EEF0FE" stroke="#5457D6" stroke-width="2.5"/></g><circle r="3.4" fill="#4338CA"/></g>
    ${flag(-96, -36, '#8B8DF5')}
    <g transform="translate(-118,52)"><rect x="-14" y="-22" width="28" height="20" rx="3" fill="#3F6FA8" stroke="#2C5079" stroke-width="2.5"/><path d="M-8 -16 h14 M-8 -10 h10" stroke="#CFE6FA" stroke-width="1.8"/><path d="M-9 -2 L-12 10 M9 -2 L12 10" stroke="#96683C" stroke-width="3" stroke-linecap="round"/></g>`,

  // Thought Driver — Wayfinder Rotunda with compass court + signal tower
  'thought-driver': () => `
    ${landmarkPad('#E6DFF4', '#AF9CCB')}
    <ellipse cx="8" cy="62" rx="88" ry="24" fill="#F3ECFA" stroke="#B49BD6" stroke-width="3"/>
    <g transform="translate(8,62)"><path d="M0 -16 L4 0 L0 16 L-4 0Z" fill="#B49BD6" opacity=".8"/><path d="M-24 0 L0 -4 L24 0 L0 4Z" fill="#CDBBE8" opacity=".8"/><circle r="3" fill="#8B5CF6"/></g>
    <rect x="-64" y="-14" width="144" height="76" rx="12" fill="url(#btCreamWallG)" stroke="#8878B0" stroke-width="4"/>
    <path d="M-74 -14 Q8 -84 90 -14Z" fill="url(#btRoofVioletG)" stroke="#6D28D9" stroke-width="4"/>
    <path d="M-52 -26 Q8 -70 68 -26" fill="none" stroke="#E0D2FB" stroke-width="5" opacity=".65"/>
    <circle cx="8" cy="6" r="21" fill="#FFF7E0" stroke="#8B5CF6" stroke-width="3.5"/>
    <circle cx="8" cy="6" r="15" fill="none" stroke="#C3A9EE" stroke-width="1.6" stroke-dasharray="2.5 4.5"/>
    <g class="bt-spin-slow" transform-origin="8 6"><path d="M8 -6 L11.5 6 L8 18 L4.5 6Z" fill="#8B5CF6"/><path d="M8 -6 L11.5 6 H4.5Z" fill="#EF6A6A"/></g>
    <circle cx="8" cy="6" r="2.6" fill="#4A2F84"/>
    ${glassWin(-52, -2, 26, 32, 12)}
    ${glassWin(52, -2, 24, 32, 12)}
    ${door(-10, 32, 36, 44)}
    <g transform="translate(8,-72)"><path d="M0 12 V-8" stroke="#6E7889" stroke-width="4"/><g class="bt-sway-s" transform-origin="0 -8"><path d="M0 -8 L20 -14 L20 -4 L0 -2Z" fill="#FFD66B" stroke="#C9971F" stroke-width="2"/></g><circle cy="14" r="4" fill="#6D28D9"/></g>
    <g transform="translate(-104,6)">
      <rect x="-3.5" y="-52" width="7" height="72" rx="3" fill="url(#btWoodG)" stroke="#75512F" stroke-width="1.6"/>
      <path d="M-3 -50 H-30 L-37 -43 L-30 -36 H-3Z" fill="#C3A9EE" stroke="#8B6BC9" stroke-width="2"/>
      <path d="M3 -32 H30 L37 -25 L30 -18 H3Z" fill="#B9DCF5" stroke="#5F94BD" stroke-width="2"/>
      <path d="M-3 -14 H-26 L-33 -7 L-26 0 H-3Z" fill="#F9C8D9" stroke="#E27FA6" stroke-width="2"/>
    </g>
    <path d="M8 76 Q42 92 86 84" fill="none" stroke="#8B5CF6" stroke-width="4" stroke-dasharray="8 10" opacity=".5" stroke-linecap="round"/>
    ${flag(88, -10, '#C3A9EE')}`,

  // Emotion Navigator — Garden Sanctuary: gazebo, willow, koi pond, sun-moon gate
  'emotion-navigator': () => `
    ${landmarkPad('#DFF0D8', '#9CC49A')}
    <g transform="translate(-96,-14)">
      <path d="M-5 42 Q-7 58 -9 70 H11 Q8 58 6 42Z" fill="url(#btWoodG)"/>
      <circle cy="4" r="36" fill="url(#btLeafG)"/>
      <circle cx="-13" cy="-6" r="14" fill="#C4E8A0" opacity=".6"/>
      <path d="M-32 22 q-4 22 1 36 M-13 32 q-2 18 2 32 M11 32 q2 18 -2 32 M30 22 q4 22 0 36" fill="none" stroke="#6FAE5C" stroke-width="4" stroke-linecap="round" opacity=".85" class="bt-sway-s"/>
    </g>
    <ellipse cx="88" cy="52" rx="54" ry="21" fill="url(#btWaterG)" stroke="#7FBFDD" stroke-width="4"/>
    <ellipse cx="74" cy="47" rx="16" ry="5.5" fill="#fff" opacity=".25"><animate attributeName="opacity" values=".25;.42;.25" dur="3.6s" repeatCount="indefinite"/></ellipse>
    <ellipse cx="106" cy="58" rx="10" ry="4.5" fill="#6FAE5C"/><circle cx="106" cy="55" r="3.4" fill="#F7A8C4"/>
    <path d="M-6 0 q6 -5 12 0 q-6 4 -12 0" fill="#F59E0B" opacity=".9"><animateMotion dur="8s" repeatCount="indefinite" path="M66,52 q18,-6 34,2 q-16,8 -34,-2"/></path>
    <g transform="translate(-14,2)">
      <rect x="-48" y="-6" width="96" height="70" rx="11" fill="url(#btCreamWallG)" stroke="#B58098" stroke-width="4"/>
      <path d="M-58 -6 Q0 -66 58 -6Z" fill="url(#btRoofPinkG)" stroke="#C74C8B" stroke-width="4"/>
      <path d="M-38 -18 Q0 -52 38 -18" fill="none" stroke="#FDDCE9" stroke-width="5" opacity=".7"/>
      <path d="M0 -52 C-8 -64 -22 -54 -11 -44 L0 -36 L11 -44 C22 -54 8 -64 0 -52Z" fill="#F7A8C4" stroke="#C74C8B" stroke-width="2.5" class="bt-bob-slow"/>
      <circle cx="-28" cy="16" r="11" fill="url(#btWindowG)" stroke="#7FA9C2" stroke-width="3"/>
      <circle cx="28" cy="16" r="11" fill="url(#btWindowG)" stroke="#7FA9C2" stroke-width="3"/>
      <path d="M-13 64 V36 Q0 22 13 36 V64Z" fill="url(#btLitWinG)" stroke="#B58098" stroke-width="3.5" class="bt-glow"/>
      <use href="#btLantern" x="-58" y="36" transform="scale(.9)" transform-origin="-58 36"/>
      <use href="#btLantern" x="58" y="36" transform="scale(.9)" transform-origin="58 36"/>
    </g>
    <g transform="translate(44,90)">
      <path d="M-20 12 V2 Q-20 -20 0 -20 Q20 -20 20 2 V12" fill="none" stroke="#F7C873" stroke-width="6" stroke-linecap="round"/>
      <circle cx="-20" cy="-6" r="7" fill="#FFD66B" stroke="#C9971F" stroke-width="2"/>
      <path d="M20 -14 A8 8 0 1 0 20 2 A6 6 0 1 1 20 -14Z" fill="#EFE6C8" stroke="#C9B26A" stroke-width="1.6"/>
    </g>
    <use href="#btSparkle" x="-58" y="-56" class="bt-twinkle" transform="scale(.8)" transform-origin="-58 -56"/>
    <use href="#btSparkle" x="102" y="6" class="bt-twinkle-d" transform="scale(.7)" transform-origin="102 6"/>`,

  // Behaviour Engineer — Tinker Works: sawtooth roof, big gear, crane
  'behaviour-engineer': () => `
    ${landmarkPad('#F2E3C4', '#C9A96E')}
    <rect x="-98" y="-16" width="196" height="88" rx="9" fill="url(#btCreamWallG)" stroke="#B07B33" stroke-width="4"/>
    <path d="M-102 -16 L-68 -58 L-34 -16 L0 -58 L34 -16 L68 -58 L102 -16Z" fill="url(#btRoofAmberG)" stroke="#B45309" stroke-width="4"/>
    <path d="M-68 -50 L-46 -24 M0 -50 L22 -24 M68 -50 L90 -24" stroke="#FCE1AC" stroke-width="4" opacity=".7"/>
    <rect x="-74" y="-44" width="13" height="11" rx="2" fill="url(#btWindowG)" opacity=".9"/>
    <rect x="-6" y="-44" width="13" height="11" rx="2" fill="url(#btWindowG)" opacity=".9"/>
    <g transform="translate(-52,16)"><g class="bt-spin" transform-origin="0 0"><circle r="24" fill="none" stroke="#E9A23B" stroke-width="10" stroke-dasharray="9.5 8"/><circle r="14" fill="#FBEECB" stroke="#C97F16" stroke-width="3"/></g><circle r="5" fill="#B45309"/></g>
    <rect x="6" y="6" width="52" height="66" rx="5" fill="url(#btWoodG)" stroke="#75512F" stroke-width="3"/>
    <path d="M6 22 H58 M6 38 H58 M6 54 H58" stroke="#75512F" stroke-width="2" opacity=".6"/>
    ${litWin(68, 2, 26, 24, 5)}
    ${glassWin(68, 38, 26, 24, 5)}
    <g transform="translate(118,-38)">
      <path d="M0 108 V-24" stroke="#8FA3B8" stroke-width="7"/>
      <path d="M0 -24 L-46 -12" stroke="#8FA3B8" stroke-width="6" stroke-linecap="round"/>
      <path d="M-40 -13 V12" stroke="#6E7889" stroke-width="2.5"/>
      <g class="bt-sway-s" transform-origin="-40 12"><rect x="-48" y="12" width="16" height="14" rx="3" fill="#F26D6D" stroke="#C94B4B" stroke-width="2"/></g>
      <circle cy="-24" r="4" fill="#F5A93F"/>
    </g>
    ${flag(-100, -18, '#FBC968')}
    <use href="#btSparkle" x="-30" y="-72" class="bt-twinkle-d" transform="scale(.7)" transform-origin="-30 -72"/>`,

  // Resilience Architect — Boulder Fort: stone keep, towers, shield, scaffold
  'resilience-architect': () => `
    ${landmarkPad('#E3D2B4', '#B29472')}
    <rect x="-56" y="-28" width="112" height="98" rx="6" fill="url(#btStoneG)" stroke="#57746B" stroke-width="4"/>
    <path d="M-56 -4 H56 M-56 22 H56 M-56 46 H56 M-20 -28 V-4 M22 -4 V22 M-14 22 V46 M28 46 V70" stroke="#7B9184" stroke-width="2" opacity=".55"/>
    <rect x="-92" y="-46" width="38" height="116" rx="5" fill="#A6BAAD" stroke="#57746B" stroke-width="4"/>
    <path d="M-94 -46 H-52 M-92 -46 V-58 H-84 V-46 M-77 -46 V-58 H-69 V-46 M-62 -46 V-58 H-54 V-46" fill="#7B9184" stroke="#57746B" stroke-width="3"/>
    <rect x="54" y="-46" width="38" height="116" rx="5" fill="#A6BAAD" stroke="#57746B" stroke-width="4"/>
    <path d="M56 -46 V-58 H64 V-46 M71 -46 V-58 H79 V-46 M86 -46 V-58 H94 V-46" fill="#7B9184" stroke="#57746B" stroke-width="3"/>
    <path d="M-30 -28 V-40 H-18 V-28 M-6 -28 V-40 H6 V-28 M18 -28 V-40 H30 V-28" fill="#7B9184" stroke="#57746B" stroke-width="3"/>
    ${door(-22, 18, 44, 52, 'url(#btWoodG)')}
    <path d="M0 -22 L-14 -13 V0 Q0 15 0 15 Q0 15 14 0 V-13Z" fill="url(#btRoofGreenG)" stroke="#2D6A4F" stroke-width="3"/>
    <circle cy="-8" r="4.6" fill="#FFE08B" stroke="#C9971F" stroke-width="1.8"/>
    ${glassWin(-84, -20, 22, 22, 10)}
    ${litWin(62, -20, 22, 22, 10)}
    ${flag(-73, -60, '#77BD93')}
    ${flag(75, -60, '#40916c')}
    <g transform="translate(112,20)"><path d="M-12 50 V-30 M12 50 V-30 M-12 -8 H12 M-12 22 H12" stroke="#E9A23B" stroke-width="4.5" stroke-linecap="round"/><rect x="-11" y="-10" width="22" height="5" rx="1.5" fill="url(#btWoodG)"/></g>
    <use href="#btRock" x="-120" y="58" transform="scale(1.4)" transform-origin="-120 58"/>
    <use href="#btRock" x="-98" y="66" transform="scale(.9)" transform-origin="-98 66"/>`,

  // Social Mapper — Friendship Treetops: two treehouses + rope bridge + campfire
  'social-mapper': () => `
    ${landmarkPad('#E7DFF4', '#AC9ED0')}
    <g transform="translate(-70,10)">
      <path d="M-6 24 Q-8 44 -10 60 H12 Q9 44 7 24Z" fill="url(#btWoodG)"/>
      <circle cy="-32" r="34" fill="url(#btLeafDarkG)"/><circle cx="-12" cy="-42" r="12" fill="#A9DB80" opacity=".6"/>
      <rect x="-32" y="-12" width="64" height="40" rx="6" fill="url(#btCreamWallG)" stroke="#8878B0" stroke-width="3.5"/>
      <path d="M-38 -12 Q0 -40 38 -12Z" fill="url(#btRoofBerryG)" stroke="#A93D75" stroke-width="3.5"/>
      ${glassWin(-20, -4, 18, 18, 8)}
      ${door(4, 8, 20, 20)}
      <rect x="-36" y="28" width="72" height="7" rx="3.5" fill="url(#btWoodG)"/>
    </g>
    <g transform="translate(72,-14)">
      <path d="M-5 34 Q-7 56 -9 74 H11 Q8 56 6 34Z" fill="url(#btWoodG)"/>
      <circle cy="-34" r="30" fill="url(#btLeafG)"/><circle cx="10" cy="-44" r="10" fill="#C4E8A0" opacity=".6"/>
      <rect x="-28" y="-14" width="56" height="38" rx="6" fill="url(#btCreamWallG)" stroke="#8878B0" stroke-width="3.5"/>
      <path d="M-34 -14 Q0 -40 34 -14Z" fill="url(#btRoofVioletG)" stroke="#6D28D9" stroke-width="3.5"/>
      ${litWin(-16, -6, 16, 16, 7)}
      ${door(2, 6, 18, 18)}
      <rect x="-32" y="24" width="64" height="7" rx="3.5" fill="url(#btWoodG)"/>
      <g class="bt-bob-slow"><path d="M-4 -66 H24 Q30 -66 30 -60 V-50 Q30 -44 24 -44 H10 L4 -37 V-44 H-4 Q-10 -44 -10 -50 V-60 Q-10 -66 -4 -66Z" fill="#fff" stroke="#E05297" stroke-width="2.5"/><text x="10" y="-50" text-anchor="middle" font-size="11" font-weight="700" fill="#E05297" font-family="Fredoka,sans-serif">HI!</text></g>
    </g>
    <path d="M-34 40 Q4 58 40 12" fill="none" stroke="#96683C" stroke-width="4"/>
    <path d="M-34 30 Q4 48 40 2" fill="none" stroke="#96683C" stroke-width="3"/>
    <path d="M-28 32 V42 M-14 37 V47 M0 40 V50 M14 34 V44 M28 24 V34" stroke="#B07D4B" stroke-width="4" stroke-linecap="round"/>
    <circle cx="-21" cy="33" r="2.6" fill="#FFE08B" class="bt-twinkle"/><circle cx="-7" cy="38" r="2.6" fill="#F7A8C4" class="bt-twinkle-d"/><circle cx="7" cy="38" r="2.6" fill="#A9DB80" class="bt-twinkle"/><circle cx="21" cy="30" r="2.6" fill="#7FCBF0" class="bt-twinkle-d"/>
    ${bunting(-46, -38, 48, -46, ['#F7A8C4', '#FFD66B', '#A9DB80', '#7FCBF0', '#C3A9EE'])}
    <g transform="translate(6,72)">
      <ellipse cy="6" rx="16" ry="5" fill="#2F5B38" opacity=".18"/>
      <path d="M-12 4 L12 -2 M-12 -2 L12 4" stroke="#96683C" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M0 -4 Q-7 -12 -2 -20 Q0 -14 3 -18 Q7 -10 0 -4Z" fill="#F59E0B" class="bt-flicker"/>
      <path d="M0 -6 Q-3 -11 0 -15 Q3 -11 0 -6Z" fill="#FFD66B" class="bt-flicker"/>
    </g>`,

  // Future Designer — Star Observatory: dome + telescope, rocket pad, easel
  'future-designer': () => `
    ${landmarkPad('#D8E6F0', '#93AFC7')}
    <rect x="-66" y="-6" width="132" height="78" rx="10" fill="url(#btCreamWallG)" stroke="#4E7A96" stroke-width="4"/>
    <path d="M-66 18 H66" stroke="#D9C9A2" stroke-width="2.5" opacity=".8"/>
    <path d="M-62 -6 A62 60 0 0 1 62 -6Z" fill="url(#btRoofSkyG)" stroke="#0369A1" stroke-width="4"/>
    <path d="M-44 -22 A48 44 0 0 1 8 -60" fill="none" stroke="#BDE6F8" stroke-width="5" opacity=".7"/>
    <rect x="-9" y="-64" width="18" height="34" rx="4" fill="#0C4A6E"/>
    <g class="bt-scan" transform-origin="0 -34">
      <path d="M0 -34 L26 -74" stroke="#3D4A5C" stroke-width="7" stroke-linecap="round"/>
      <circle cx="29" cy="-78" r="7" fill="#0C4A6E" stroke="#7FCBF0" stroke-width="2.5"/>
    </g>
    ${glassWin(-52, 10, 26, 26, 13)}
    ${litWin(28, 10, 26, 26, 13)}
    ${door(-14, 30, 32, 42)}
    <g transform="translate(108,28)">
      <ellipse cy="44" rx="30" ry="9" fill="#B7C4D2" stroke="#8FA3B8" stroke-width="2.5"/>
      <path d="M0 -34 Q13 -16 13 6 H-13 Q-13 -16 0 -34Z" fill="url(#btRocketG)" stroke="#C97C6C" stroke-width="3"/>
      <circle cy="-10" r="6" fill="url(#btWindowG)" stroke="#3487AC" stroke-width="2"/>
      <path d="M-13 -2 L-23 14 L-13 10 M13 -2 L23 14 L13 10" fill="#F26D6D" stroke="#C94B4B" stroke-width="2"/>
      <path d="M-5 8 Q0 22 5 8" fill="#FFD66B" class="bt-flicker"/>
      <path d="M0 6 V38" stroke="#8FA3B8" stroke-width="3" opacity=".6"/>
    </g>
    <g transform="translate(-108,30)">
      <path d="M-12 42 L0 8 L12 42 M0 8 V42" stroke="#96683C" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="-17" y="-16" width="34" height="28" rx="3" fill="#FFFDF4" stroke="#B8A888" stroke-width="2.5"/>
      <circle cx="-7" cy="-7" r="3.4" fill="#F26D6D"/><circle cx="3" cy="-4" r="3.4" fill="#5FB6DF"/><circle cx="8" cy="-10" r="3" fill="#FFD66B"/>
      <path d="M-10 4 q8 4 20 -2" fill="none" stroke="#A9DB80" stroke-width="2.5"/>
    </g>
    <use href="#btSparkle" x="-40" y="-76" class="bt-twinkle"/>
    <use href="#btSparkle" x="52" y="-64" class="bt-twinkle-d" transform="scale(.75)" transform-origin="52 -64"/>
    <use href="#btSparkle" x="86" y="-30" class="bt-twinkle" transform="scale(.6)" transform-origin="86 -30"/>
    ${flag(66, -8, '#7FCBF0')}`,
}

/* ─────────────────────────────────────────────
   5. DISTRICT RENDERER
   Organic ground zone + props + landmark
   ───────────────────────────────────────────── */

// Seeded PRNG so the map is stable between renders
function seededRand(seed) {
  let v = seed * 2654435761 % 2147483647
  if (v <= 0) v += 2147483646
  return () => { v = (v * 16807) % 2147483647; return (v - 1) / 2147483646 }
}

// Smooth organic blob path (wobbly ellipse) for district grounds
function blobPath(cx, cy, rx, ry, seed) {
  const rand = seededRand(seed)
  const n = 10, pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const wob = 0.86 + rand() * 0.22
    pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob])
  }
  let d = `M${((pts[0][0] + pts[n - 1][0]) / 2).toFixed(1)},${((pts[0][1] + pts[n - 1][1]) / 2).toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n]
    d += ` Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2).toFixed(1)}`
  }
  return d + ' Z'
}

// Trees/bushes framing the zone edge, plus flowers near the front
function renderDistrictFraming(d, seed) {
  const rand = seededRand(seed + 7)
  let s = `<g class="district-framing" pointer-events="none">`
  s += `<use href="#btTreeRound" x="${d.x - d.zoneRx + 105}" y="${d.y - d.zoneRy + 130}" transform="scale(1.35)" transform-origin="${d.x - d.zoneRx + 105} ${d.y - d.zoneRy + 130}"/>`
  s += `<use href="#btTreePine" x="${d.x + d.zoneRx - 100}" y="${d.y - d.zoneRy + 145}" transform="scale(1.3)" transform-origin="${d.x + d.zoneRx - 100} ${d.y - d.zoneRy + 145}"/>`
  s += `<use href="#btTreeBlossom" x="${d.x + d.zoneRx - 135}" y="${d.y + d.zoneRy - 105}" transform="scale(1.2)" transform-origin="${d.x + d.zoneRx - 135} ${d.y + d.zoneRy - 105}"/>`
  s += `<use href="#btBush" x="${d.x - d.zoneRx + 120}" y="${d.y + d.zoneRy - 90}" transform="scale(1.35)" transform-origin="${d.x - d.zoneRx + 120} ${d.y + d.zoneRy - 90}"/>`
  s += `<use href="#btMushroom" x="${d.x - d.zoneRx + 165}" y="${d.y + d.zoneRy - 70}"/>`
  const flowers = ['#btFlowerPink', '#btFlowerYellow', '#btFlowerPurple']
  for (let i = 0; i < 6; i++) {
    const fx = d.x - 130 + i * 52 + rand() * 20
    const fy = d.y + d.zoneRy - 62 + rand() * 24
    s += `<use href="${flowers[i % 3]}" x="${fx.toFixed(0)}" y="${fy.toFixed(0)}"/>`
  }
  s += `<use href="#btFence" x="${d.x - 165}" y="${d.y + d.zoneRy - 118}" transform="rotate(-8 ${d.x - 165} ${d.y + d.zoneRy - 118})"/>`
  s += `<use href="#btFence" x="${d.x + 165}" y="${d.y + d.zoneRy - 120}" transform="rotate(8 ${d.x + 165} ${d.y + d.zoneRy - 120})"/>`
  s += `</g>`
  return s
}

function renderDistrict(slug, d, locked = false) {
  // Locked districts are simply muted — colours washed toward pastel so the
  // active district clearly glows as the place to be. No overlays: the small
  // road gate and the pin's lock badge do the storytelling.
  const lockedStyle = locked ? ' style="filter:saturate(.4) opacity(.82)"' : ''
  let s = `<g id="district-${slug}" class="district${locked ? ' district-locked' : ''}" data-zone="${slug}"${lockedStyle}>`

  // Ground zone — organic pastel blob with soft gradient + scalloped border
  s += `<defs><radialGradient id="zoneG-${slug}">
    <stop offset="0%" stop-color="${d.zoneColor}" stop-opacity="0.75"/>
    <stop offset="55%" stop-color="${d.zoneColor}" stop-opacity="0.5"/>
    <stop offset="85%" stop-color="${d.zoneColor}" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="${d.zoneColor}" stop-opacity="0"/>
  </radialGradient></defs>`
  s += `<path d="${blobPath(d.x, d.y, d.zoneRx, d.zoneRy, d.seed)}" fill="url(#zoneG-${slug})"/>`
  s += `<path d="${blobPath(d.x, d.y, d.zoneRx - 26, d.zoneRy - 24, d.seed + 3)}" fill="none" stroke="${d.color}" stroke-width="2.5" stroke-dasharray="3 16" stroke-linecap="round" opacity="0.3"/>`

  // Cobble path from the road mouth to the landmark door
  s += `<ellipse cx="${d.x}" cy="${d.y + 96}" rx="54" ry="14" fill="#E8D9B2" opacity="0.6"/>`
  s += `<ellipse cx="${d.x + 10}" cy="${d.y + 120}" rx="38" ry="11" fill="#DFCFA6" opacity="0.5"/>`
  s += `<use href="#btPebbles" x="${d.x - 34}" y="${d.y + 112}"/><use href="#btPebbles" x="${d.x + 40}" y="${d.y + 132}" transform="scale(.8)" transform-origin="${d.x + 40} ${d.y + 132}"/>`

  // Framing greenery behind, then props, then hero landmark on top
  s += renderDistrictFraming(d, d.seed)
  const dp = DISTRICT_PROPS[slug] || []
  dp.forEach(p => {
    const fn = prop[p.fn]
    if (!fn) return
    s += p.args ? fn(d.x + p.dx, d.y + p.dy, ...p.args) : fn(d.x + p.dx, d.y + p.dy)
  })

  s += `<g class="svg-building" data-slug="${slug}" filter="url(#btLandmarkShadow)" role="button" tabindex="0" aria-label="${esc(d.label)}">`
  s += `<g transform="translate(${d.x},${d.y}) scale(1.35)">${LANDMARKS[slug]()}</g>`
  s += `</g>`

  s += `</g>`
  return s
}

/* ─────────────────────────────────────────────
   6. TOWN SQUARE — the magical hub
   ───────────────────────────────────────────── */

function renderTownSquare(includeHitArea = true) {
  const cx = CX, cy = CY
  let s = `<g id="townSquare">`

  // Golden ambient glow beneath the whole hub
  s += `<ellipse cx="${cx}" cy="${cy}" rx="330" ry="300" fill="url(#btHubGlowG)" class="bt-hub-glow"/>`

  // Concentric plaza rings
  s += `<circle cx="${cx}" cy="${cy}" r="215" fill="url(#btPlazaG)" stroke="#CBAE79" stroke-width="5"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="178" fill="#F2E4C2" stroke="#D9C293" stroke-width="2.5"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="138" fill="#F7EDD4" stroke="#DFC99B" stroke-width="2"/>`
  // Mosaic dot ring
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const mc = ['#F7A8C4', '#FFD66B', '#A9DB80', '#7FCBF0', '#C3A9EE', '#F5A93F', '#8B8DF5', '#77BD93'][i % 8]
    s += `<circle cx="${(cx + Math.cos(a) * 158).toFixed(1)}" cy="${(cy + Math.sin(a) * 158).toFixed(1)}" r="7" fill="${mc}" opacity="0.75"/>`
  }
  // Paving spokes
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13
    s += `<line x1="${(cx + Math.cos(a) * 70).toFixed(1)}" y1="${(cy + Math.sin(a) * 70).toFixed(1)}" x2="${(cx + Math.cos(a) * 212).toFixed(1)}" y2="${(cy + Math.sin(a) * 212).toFixed(1)}" stroke="#D9C293" stroke-width="1.4" opacity="0.4"/>`
  }
  // Compass points
  s += `<polygon points="${cx},${cy - 128} ${cx - 8},${cy - 108} ${cx + 8},${cy - 108}" fill="#CBAE79" opacity="0.7"/>`
  s += `<text x="${cx}" y="${cy - 136}" text-anchor="middle" font-size="13" fill="#A8895B" font-weight="700" font-family="Fredoka,sans-serif">N</text>`

  // Grand fountain — tiered bowls + glowing orb + animated jets
  s += `<ellipse cx="${cx}" cy="${cy + 14}" rx="72" ry="20" fill="#2F5D3A" opacity=".12"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="62" fill="url(#btWaterG)" stroke="#5FA8CC" stroke-width="4.5"/>`
  s += `<ellipse cx="${cx - 18}" cy="${cy - 8}" rx="24" ry="8" fill="#fff" opacity=".25"><animate attributeName="opacity" values=".25;.45;.25" dur="3.2s" repeatCount="indefinite"/></ellipse>`
  s += `<circle cx="${cx}" cy="${cy}" r="34" fill="#EDF6FB" stroke="#9CC8E0" stroke-width="3.5"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="26" fill="url(#btWaterG)" opacity=".8"/>`
  s += `<path d="M${cx - 14} ${cy} q14 -10 28 0 l-4 -14 q-10 -7 -20 0Z" fill="#C7D5DE" stroke="#9BAEB9" stroke-width="2"/>`
  s += `<path d="M${cx - 6} ${cy - 14} V${cy - 34}" stroke="#9BAEB9" stroke-width="5"/><path d="M${cx + 6} ${cy - 14} V${cy - 34}" stroke="#9BAEB9" stroke-width="5"/>`
  s += `<circle cx="${cx}" cy="${cy - 46}" r="14" fill="url(#btOrbG)" stroke="#D9A520" stroke-width="3" class="bt-glow"/>`
  s += `<use href="#btSparkle" x="${cx + 22}" y="${cy - 62}" class="bt-twinkle"/>`
  s += `<use href="#btSparkle" x="${cx - 24}" y="${cy - 56}" class="bt-twinkle-d" transform="scale(.7)" transform-origin="${cx - 24} ${cy - 56}"/>`
  s += `<use href="#btSparkle" x="${cx + 2}" y="${cy - 76}" class="bt-twinkle" transform="scale(.55)" transform-origin="${cx + 2} ${cy - 76}"/>`
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const jx = cx + Math.cos(a) * 12
    const dur = 1.7 + (i % 4) * 0.3
    s += `<circle cx="${jx.toFixed(1)}" cy="${cy - 38}" r="2.6" fill="#D6EEFA" opacity="0.5">
      <animate attributeName="cy" values="${cy - 38};${cy - 60 - (i % 3) * 5};${cy - 38}" dur="${dur}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.5;0.12;0.5" dur="${dur}s" repeatCount="indefinite"/>
    </circle>`
  }

  // Welcome gateway arch (south side) with bunting + balloons
  s += `<g transform="translate(${cx},${cy + 186})">
    <path d="M-84 26 V-38 M84 26 V-38" stroke="url(#btWoodG)" stroke-width="12" stroke-linecap="round"/>
    <path d="M-92 -34 Q0 -78 92 -34" fill="none" stroke="#B07D4B" stroke-width="11" stroke-linecap="round"/>
    <rect x="-72" y="-70" width="144" height="34" rx="12" fill="#FFF8E7" stroke="#CBAE79" stroke-width="3.5"/>
    <text y="-46" text-anchor="middle" font-size="21" fill="#8A5B36" font-weight="700" font-family="Fredoka,sans-serif">BRAIN TOWN</text>
    ${bunting(-84, -26, 84, -26, ['#F7A8C4', '#FFD66B', '#A9DB80', '#7FCBF0', '#C3A9EE', '#F5A93F', '#F26D6D'])}
    <g class="bt-bob-slow"><path d="M-96 -40 q-2 14 0 22" stroke="#8A6D38" stroke-width="1.6" fill="none"/><ellipse cx="-97" cy="-52" rx="10" ry="13" fill="url(#btBalloonG)"/><path d="M-100 -57 q3 -4 6 -1" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/></g>
    <g class="bt-bob"><path d="M97 -42 q2 14 0 24" stroke="#8A6D38" stroke-width="1.6" fill="none"/><ellipse cx="98" cy="-54" rx="10" ry="13" fill="#8FD3F2"/><path d="M95 -59 q3 -4 6 -1" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/></g>
  </g>`

  // Market stalls (striped canopies) NE + NW
  const stall = (sx, sy, c1) => `<g transform="translate(${sx},${sy})">
    <ellipse cy="26" rx="34" ry="8" fill="#2F5D3A" opacity=".12"/>
    <path d="M-26 24 V-2 M26 24 V-2" stroke="url(#btWoodG)" stroke-width="5"/>
    <rect x="-22" y="4" width="44" height="12" rx="3" fill="url(#btWoodG)" stroke="#75512F" stroke-width="2"/>
    <circle cx="-10" cy="2" r="4.5" fill="#F26D6D"/><circle cy="1" r="4.5" fill="#FFD66B"/><circle cx="10" cy="2" r="4.5" fill="#A9DB80"/>
    <path d="M-32 -4 Q0 -26 32 -4 L26 6 Q0 -12 -26 6Z" fill="${c1}" stroke="#00000022" stroke-width="2"/>
    <path d="M-20 -9 q4 8 0 13 M0 -14 q4 9 0 15 M20 -9 q4 8 0 13" stroke="#fff" stroke-width="4" opacity=".55" fill="none"/>
  </g>`
  s += stall(cx - 148, cy - 118, '#F7A8C4')
  s += stall(cx + 150, cy - 112, '#8FD3F2')

  // Lamp posts + benches + flower beds around the plaza
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5
    s += svgLampPost(cx + Math.cos(a) * 190, cy + Math.sin(a) * 186)
  }
  s += svgBench(cx - 96, cy + 86, 14); s += svgBench(cx + 98, cy + 84, -14)
  s += svgBench(cx - 104, cy - 66, -22); s += svgBench(cx + 104, cy - 62, 22)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.18
    const gx = cx + Math.cos(a) * 232, gy = cy + Math.sin(a) * 226
    s += `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="20" ry="11" fill="#8CC470" opacity="0.75"/>`
    s += `<use href="${['#btFlowerPink', '#btFlowerYellow', '#btFlowerPurple'][i % 3]}" x="${gx.toFixed(1)}" y="${(gy - 4).toFixed(1)}"/>`
  }

  // Fluttering butterflies
  s += `<g><use href="#btButterfly"/><animateMotion dur="16s" repeatCount="indefinite" path="M${cx - 120},${cy - 150} q80,-40 170,10 q60,40 -30,80 q-110,30 -140,-90"/></g>`

  // Hub hit area (clickable — opens the Brain Town welcome popup).
  // Skipped in static mode: on mobile it lives in the interactive overlay.
  if (includeHitArea) {
    s += `<circle id="hubHitArea" class="hub-hit-area" cx="${cx}" cy="${cy}" r="235" fill="transparent" pointer-events="all" role="button" tabindex="0" aria-label="Visit Brain Town square"/>`
  }

  s += `</g>`
  return s
}

/* ─────────────────────────────────────────────
   Shared decoration helpers
   ───────────────────────────────────────────── */

function svgLampPost(x, y) {
  return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
    <ellipse cy="4" rx="8" ry="3" fill="#2F5D3A" opacity=".16"/>
    <path d="M0 0 V-40" stroke="#5C6470" stroke-width="3.5"/>
    <rect x="-8" y="-48" width="16" height="12" rx="4" fill="#FFE58B" stroke="#B8912E" stroke-width="2" class="bt-glow"/>
    <circle cy="-42" r="10" fill="#FFE9A8" opacity=".28" class="bt-glow"/>
    <path d="M-6 0 H6" stroke="#5C6470" stroke-width="4" stroke-linecap="round"/>
  </g>`
}

function svgBench(x, y, a = 0) {
  return `<g transform="translate(${x},${y}) rotate(${a})">
    <ellipse cy="8" rx="18" ry="4" fill="#2F5D3A" opacity=".14"/>
    <rect x="-17" y="-4" width="34" height="5" rx="2" fill="#A8785A"/>
    <rect x="-17" y="-11" width="34" height="5" rx="2" fill="#BC8A68"/>
    <path d="M-13 1 V8 M13 1 V8" stroke="#7A5439" stroke-width="3.5"/>
  </g>`
}

function svgLake(x, y, rx, ry) {
  return `<g transform="translate(${x},${y})">
    <ellipse rx="${rx + 14}" ry="${ry + 10}" fill="#E8D9B2" opacity=".8"/>
    <ellipse rx="${rx}" ry="${ry}" fill="url(#btWaterG)" stroke="#5FA8CC" stroke-width="4"/>
    <ellipse cx="${-rx * 0.25}" cy="${-ry * 0.15}" rx="${rx * 0.35}" ry="${ry * 0.22}" fill="#fff" opacity=".18"><animate attributeName="opacity" values=".18;.32;.18" dur="4s" repeatCount="indefinite"/></ellipse>
    <ellipse cx="${rx * 0.35}" cy="${ry * 0.3}" rx="14" ry="6" fill="#6FAE5C"/><circle cx="${rx * 0.35}" cy="${ry * 0.3 - 3}" r="4" fill="#F7A8C4"/>
    <ellipse cx="${-rx * 0.45}" cy="${ry * 0.35}" rx="11" ry="5" fill="#8CC470"/>
    <g><path d="M-6 0 q6 -6 12 0 q-6 4 -12 0" fill="#FFF8E7" stroke="#D9A520" stroke-width="1.4"/><circle cx="7" cy="-3" r="3" fill="#FFF8E7"/><path d="M9 -3 l4 -1" stroke="#F5A93F" stroke-width="2"/>
      <animateMotion dur="18s" repeatCount="indefinite" path="M${-rx * 0.3},0 q${rx * 0.4},${-ry * 0.3} ${rx * 0.6},0 q${-rx * 0.2},${ry * 0.35} ${-rx * 0.6},0"/></g>
  </g>`
}

function svgBridge(x, y, a = 0) {
  return `<g transform="translate(${x},${y}) rotate(${a})">
    <path d="M-32 6 Q0 -8 32 6 L32 14 Q0 0 -32 14Z" fill="url(#btWoodG)" stroke="#75512F" stroke-width="2.5"/>
    <path d="M-26 4 V-10 M0 -1 V-15 M26 4 V-10" stroke="#8A5B36" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M-26 -10 Q0 -22 26 -10" fill="none" stroke="#8A5B36" stroke-width="3"/>
  </g>`
}

/* ─────────────────────────────────────────────
   7. WORLD DECORATIONS
   ───────────────────────────────────────────── */

function renderDecorations() {
  let s = ''
  const rand = seededRand(42)
  const trees = [
    // Frame the world edges
    [60, 90], [180, 60], [320, 80], [470, 55], [620, 70], [780, 45], [940, 65], [1420, 50], [1560, 70], [1720, 52], [2060, 60], [2210, 75], [2340, 58],
    [45, 220], [52, 420], [48, 600], [55, 760], [50, 1080], [56, 1240], [48, 1600], [52, 1740],
    [2350, 240], [2342, 460], [2352, 640], [2344, 1120], [2350, 1280], [2340, 1460], [2348, 1640],
    [140, 1750], [340, 1735], [560, 1748], [780, 1730], [1000, 1750], [1220, 1738], [1900, 1745], [2120, 1730],
    // Interior clusters between districts
    [660, 500], [700, 470], [640, 540],
    [1560, 590], [1600, 560],
    [770, 1130], [810, 1100],
    [1700, 1110], [1660, 1080],
    [900, 340], [860, 370],
    [1590, 240], [1630, 270],
    [1080, 1220], [1120, 1190],
    [590, 1260],
    [350, 630],
    [1680, 740],
    [960, 560], [1420, 570],
    [220, 1390], [2110, 1390],
  ]
  const kinds = ['#btTreeRound', '#btTreePine', '#btTreeBlossom']
  trees.forEach(([tx, ty], i) => {
    const kind = kinds[i % 7 === 3 ? 2 : (rand() > 0.4 ? 0 : 1)]
    const sc = (0.9 + rand() * 0.7).toFixed(2)
    s += `<use href="${kind}" x="${tx}" y="${ty}" transform="scale(${sc})" transform-origin="${tx} ${ty}"/>`
  })

  ;[
    [520, 240], [660, 380], [1420, 420], [2030, 690], [290, 1060], [1530, 1300], [910, 650],
    [1440, 750], [490, 750], [1980, 550], [350, 1210], [1830, 1210], [710, 1500], [1320, 500],
    [170, 460], [2210, 490], [820, 210], [1620, 190], [460, 1590], [1910, 1560], [1110, 370],
    [930, 1410], [1760, 1510], [310, 760], [2110, 760], [660, 910], [1360, 1110], [180, 930], [2240, 930],
  ].forEach(([bx, by]) => { s += `<use href="#btBush" x="${bx}" y="${by}" transform="scale(${(0.85 + rand() * 0.5).toFixed(2)})" transform-origin="${bx} ${by}"/>` })

  const flowers = ['#btFlowerPink', '#btFlowerYellow', '#btFlowerPurple']
  ;[
    [150, 200], [2200, 180], [110, 1150], [2210, 1080], [610, 560], [1520, 520], [300, 400],
    [2110, 920], [860, 130], [1320, 1620], [750, 1350], [1920, 1300], [1070, 450], [1700, 650],
    [260, 610], [2110, 610], [760, 760], [1460, 860], [410, 1360], [1810, 1360],
    [960, 210], [1560, 140], [360, 1610], [2010, 1610], [1160, 1460], [610, 210],
    [1860, 210], [190, 710], [2250, 710], [1060, 710], [510, 1110], [1610, 1060],
  ].forEach(([fx, fy], i) => { s += `<use href="${flowers[i % 3]}" x="${fx}" y="${fy}"/>` })

  ;[
    [670, 150], [1460, 170], [210, 1350], [1810, 1500], [910, 1600], [2070, 400],
    [140, 810], [2280, 810], [860, 510], [1560, 490], [410, 1660], [1960, 1660],
  ].forEach(([rx, ry]) => { s += `<use href="#btRock" x="${rx}" y="${ry}" transform="scale(${(0.8 + rand() * 0.6).toFixed(2)})" transform-origin="${rx} ${ry}"/>` })

  ;[
    [700, 250], [1500, 300], [880, 1480], [1650, 1550], [250, 520], [2150, 1180], [480, 1180], [1350, 380],
  ].forEach(([mx, my]) => { s += `<use href="#btMushroom" x="${mx}" y="${my}" transform="scale(${(0.9 + rand() * 0.5).toFixed(2)})" transform-origin="${mx} ${my}"/>` })

  ;[
    [560, 640], [1780, 620], [640, 1330], [1400, 1250], [980, 260], [1900, 1080], [280, 1170],
  ].forEach(([gx, gy]) => { s += `<use href="#btGrassTuft" x="${gx}" y="${gy}"/>` })

  // Lakes with ducks + bridges
  s += svgLake(2110, 1210, 105, 62)
  s += svgBridge(2020, 1160, -14)
  s += svgLake(170, 1620, 90, 52)
  s += svgBridge(245, 1575, 16)
  // NW corner lake — fills the quiet quarter between Kip and Coco
  s += svgLake(500, 450, 95, 55)
  s += svgBridge(578, 500, 14)

  // Stepping-stone trails between areas
  ;[
    [690, 690], [722, 710], [754, 730], [786, 748],
    [1500, 1150], [1532, 1170], [1564, 1190],
    [860, 1350], [892, 1370], [924, 1390],
  ].forEach(([sx, sy]) => { s += `<ellipse cx="${sx}" cy="${sy}" rx="9" ry="5.5" fill="#D5C398" opacity="0.55"/>` })

  // Wandering butterflies
  s += `<g><use href="#btButterfly"/><animateMotion dur="22s" repeatCount="indefinite" path="M700,600 q120,-80 260,-10 q120,60 -20,140 q-160,70 -240,-130"/></g>`
  s += `<g><use href="#btButterfly" transform="scale(.8)"/><animateMotion dur="26s" repeatCount="indefinite" path="M1700,1200 q-140,-60 -240,30 q-80,80 60,120 q160,30 180,-150"/></g>`

  return s
}

/* ─────────────────────────────────────────────
   8. SKY LAYER
   ───────────────────────────────────────────── */

function renderSky() {
  let s = ''
  // Rainbow arc, top-right corner
  s += `<g opacity="0.4" pointer-events="none">
    <path d="M2080 180 A190 190 0 0 1 2400 100" fill="none" stroke="#F26D6D" stroke-width="13"/>
    <path d="M2086 192 A178 178 0 0 1 2400 114" fill="none" stroke="#FFD66B" stroke-width="13"/>
    <path d="M2092 204 A166 166 0 0 1 2400 128" fill="none" stroke="#A9DB80" stroke-width="13"/>
    <path d="M2098 216 A154 154 0 0 1 2400 142" fill="none" stroke="#7FCBF0" stroke-width="13"/>
  </g>`
  // Soft drifting clouds
  ;[
    { x: 100, y: 55, sc: 1.3, d: 130 }, { x: 560, y: 30, sc: 1.0, d: 160 },
    { x: 1010, y: 60, sc: 1.5, d: 110 }, { x: 1520, y: 40, sc: 1.1, d: 140 },
    { x: 1960, y: 55, sc: 0.9, d: 170 }, { x: 360, y: 90, sc: 0.7, d: 190 },
    { x: 1260, y: 95, sc: 0.8, d: 150 },
  ].forEach(c => {
    s += `<g opacity="0.4"><g transform="scale(${c.sc})">
      <ellipse rx="50" ry="18" fill="#fff"/><ellipse cx="-27" cy="6" rx="30" ry="14" fill="#fff"/>
      <ellipse cx="27" cy="5" rx="35" ry="16" fill="#fff"/><ellipse cy="9" rx="42" ry="12" fill="#fff"/>
      <ellipse cy="14" rx="44" ry="9" fill="#D8ECF6" opacity=".7"/>
      </g><animateTransform attributeName="transform" type="translate" values="${c.x},${c.y};${c.x + 260},${c.y};${c.x},${c.y}" dur="${c.d}s" repeatCount="indefinite"/>
    </g>`
  })
  // Hot air balloon drifting across the world
  s += `<g>
    <g class="bt-bob-slow">
      <circle cy="-48" r="30" fill="url(#btBalloonG)" stroke="#C95E82" stroke-width="3"/>
      <path d="M-11 -75 Q-17 -48 -9 -22 M11 -75 Q17 -48 9 -22 M0 -78 V-19" stroke="#fff" stroke-width="2.5" opacity=".6" fill="none"/>
      <path d="M-12 -22 L-7 2 M12 -22 L7 2" stroke="#8A6D38" stroke-width="2"/>
      <rect x="-8" y="2" width="16" height="13" rx="3" fill="url(#btWoodG)" stroke="#75512F" stroke-width="2"/>
    </g>
    <animateMotion dur="90s" repeatCount="indefinite" path="M300,260 Q800,150 1300,240 Q1900,330 2200,200 Q1600,120 900,220 Q500,280 300,260"/>
  </g>`
  // Birds
  ;[{ x: 300, y: 120, d: 24 }, { x: 1100, y: 80, d: 30 }].forEach(b => {
    s += `<g opacity="0.4"><path d="M-6 0 Q-3 -5 0 0 Q3 -5 6 0" fill="none" stroke="#4A5A6A" stroke-width="2" stroke-linecap="round"/>
      <animateMotion dur="${b.d}s" repeatCount="indefinite" path="M${b.x},${b.y} Q${b.x + 400},${b.y - 50} ${b.x + 800},${b.y + 30} Q${b.x + 1200},${b.y - 40} ${b.x + 1600},${b.y} Q${b.x + 800},${b.y + 60} ${b.x},${b.y}"/>
    </g>`
  })
  return s
}

/* ─────────────────────────────────────────────
   9. ROAD RENDERER
   ───────────────────────────────────────────── */

// Just the selection/completion glow paths — used standalone on mobile,
// where they live in the interactive overlay instead of the base image.
function renderRoadGlows(progressBySlug = {}) {
  let glows = ''
  Object.entries(DISTRICTS).forEach(([slug, d]) => {
    const p = ROAD_PATHS[slug]
    if (!p) return
    const complete = (progressBySlug[slug]?.pct ?? 0) >= 100
    glows += `<path d="${p}" fill="none" stroke="${complete ? '#FFD345' : d.color}" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" opacity="${complete ? '0.24' : '0'}" class="svg-road-glow" data-slug="${slug}" filter="url(#btRoadGlow)"/>`
  })
  return glows
}

function renderRoads(progressBySlug = {}, includeGlows = true) {
  let shadows = '', edges = '', fills = '', dashes = '', glows = ''
  Object.entries(DISTRICTS).forEach(([slug, d]) => {
    const p = ROAD_PATHS[slug]
    if (!p) return
    const pct = progressBySlug[slug]?.pct ?? 0
    const unbuilt = pct === 0
    const complete = pct >= 100
    if (unbuilt) {
      // Faint, unpaved track — the road is still waiting to be built
      edges += `<path d="${p}" fill="none" stroke="#C9AA74" stroke-width="68" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>`
      fills += `<path d="${p}" fill="none" stroke="#E4D5AE" stroke-width="52" stroke-dasharray="40 34" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" class="svg-road" data-slug="${slug}"/>`
    } else {
      shadows += `<path d="${p}" fill="none" stroke="#37583B" stroke-width="76" stroke-linecap="round" stroke-linejoin="round" opacity="0.15" transform="translate(0 9)"/>`
      edges += `<path d="${p}" fill="none" stroke="#C9AA74" stroke-width="68" stroke-linecap="round" stroke-linejoin="round"/>`
      fills += `<path d="${p}" fill="none" stroke="#F0DFB4" stroke-width="56" stroke-linecap="round" stroke-linejoin="round" class="svg-road" data-slug="${slug}"/>`
      dashes += `<path d="${p}" fill="none" stroke="#FFF8E0" stroke-width="4.5" stroke-dasharray="20 30" stroke-linecap="round" opacity="0.7"/>`
    }
    // Completed roads keep a permanent warm glow; selection raises it further
    if (includeGlows) {
      glows += `<path d="${p}" fill="none" stroke="${complete ? '#FFD345' : d.color}" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" opacity="${complete ? '0.24' : '0'}" class="svg-road-glow" data-slug="${slug}" filter="url(#btRoadGlow)"/>`
    }
  })
  return `<g id="roadShadows">${shadows}</g><g id="roadEdges">${edges}</g><g id="roadFills">${fills}</g><g id="roadDashes">${dashes}</g>${includeGlows ? `<g id="roadGlows">${glows}</g>` : ''}`
}

// Point along a district's road (its cubic segment) at parameter t — used
// to place the roadworks barrier without needing a live DOM path.
function roadPointAt(slug, t) {
  const nums = (ROAD_PATHS[slug] || '').match(/-?\d+(?:\.\d+)?/g)?.map(Number)
  if (!nums || nums.length < 8) return null
  const [x0, y0, c1x, c1y, c2x, c2y, x3, y3] = nums
  const u = 1 - t
  return {
    x: u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x3,
    y: u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y3
  }
}

// A single small wooden gate across each locked district's road, placed
// near the district entrance so the hub never gets crowded. Pure scenery —
// never intercepts clicks, so tapping the district still opens the
// explanation popup.
function renderRoadworks(gate) {
  if (!gate) return ''
  let s = ''
  Object.keys(DISTRICTS).forEach(slug => {
    if (gate.bySlug[slug]?.state !== 'locked') return
    const pt = roadPointAt(slug, 0.9)
    if (!pt) return
    s += `<g class="svg-roadworks" data-slug="${slug}" pointer-events="none" transform="translate(${Math.round(pt.x)},${Math.round(pt.y)})">
      <ellipse cy="30" rx="62" ry="11" fill="#1E4526" opacity="0.14"/>
      <rect x="-52" y="-8" width="9" height="40" rx="3" fill="#A98B52"/>
      <rect x="43" y="-8" width="9" height="40" rx="3" fill="#A98B52"/>
      <rect x="-58" y="-16" width="116" height="17" rx="8" fill="url(#btWorksStripe)" stroke="#7A6234" stroke-width="2.5" opacity="0.92"/>
      <text x="0" y="-26" text-anchor="middle" font-size="24">🚧</text>
    </g>`
  })
  return s
}

/* ─────────────────────────────────────────────
   10. DISTRICT MARKERS — bobbing pins + name pills
   ───────────────────────────────────────────── */

function renderMarkers(skills, progressBySlug = {}, nextSlug = null, gate = null) {
  const skillMap = {}
  skills.forEach(sk => { skillMap[sk.slug || (sk.name || '').toLowerCase().replace(/\s+/g, '-')] = sk })

  let s = ''
  Object.entries(DISTRICTS).forEach(([slug, d], idx) => {
    const sk = skillMap[slug]
    const name = sk?.name || d.label
    const img = sk?.character_image_url
    const pinY = d.y - 225
    const progress = progressBySlug[slug]
    const locked = gate?.bySlug[slug]?.state === 'locked'
    const pinColor = locked ? '#AEB9C4' : d.color
    const ariaLabel = locked ? `${name} — opens later on your journey` : `Select ${name}`

    s += `<g class="svg-pin${locked ? ' svg-pin-locked' : ''}" data-slug="${slug}" role="button" tabindex="0" aria-label="${esc(ariaLabel)}">`
    s += `<g class="svg-pin-bob" style="animation-delay:${(idx * 0.45).toFixed(2)}s">`

    // Golden halo on the active skill — the one place to go next
    if (gate?.activeSlug === slug) {
      s += `<circle cx="${d.x}" cy="${pinY}" r="58" fill="none" stroke="#F2C94C" stroke-width="7" opacity="0.9"/>`
      s += `<circle cx="${d.x}" cy="${pinY}" r="66" fill="none" stroke="#F2C94C" stroke-width="3" opacity="0.45"/>`
    }

    // Pulse ring (visible when selected)
    s += `<circle cx="${d.x}" cy="${pinY}" r="50" fill="none" stroke="${pinColor}" stroke-width="5" class="svg-pin-ring"/>`
    // Drop pointer
    s += `<polygon points="${d.x},${pinY + 60} ${d.x - 13},${pinY + 42} ${d.x + 13},${pinY + 42}" fill="#fff" stroke="${pinColor}" stroke-width="3"/>`
    // Pin disc
    s += `<circle cx="${d.x}" cy="${pinY}" r="46" fill="#fff" stroke="${pinColor}" stroke-width="5" filter="url(#btPinShadow)" class="svg-pin-circle"/>`
    s += `<circle cx="${d.x}" cy="${pinY}" r="39" fill="${locked ? '#EDF1F6' : d.zoneColor}" opacity=".55"/>`
    if (img) {
      s += `<image href="${img}" x="${d.x - 36}" y="${pinY - 36}" width="72" height="72" preserveAspectRatio="xMidYMid meet"${locked ? ' style="filter:saturate(.35);opacity:.9"' : ''}/>`
    } else {
      s += `<text x="${d.x}" y="${pinY + 12}" text-anchor="middle" font-size="38">${d.emoji}</text>`
    }

    // Compact lock badge on the pin disc — the popup tells the full story
    if (locked) {
      s += `<circle cx="${d.x + 34}" cy="${pinY + 32}" r="17" fill="#fff" stroke="#AEB9C4" stroke-width="3" filter="url(#btPinShadow)"/>`
      s += `<text x="${d.x + 34}" y="${pinY + 38}" text-anchor="middle" font-size="17">🔒</text>`
    }

    // Name pill
    const tw = name.length * 9.5 + 36
    const ly = pinY - 66
    s += `<rect x="${d.x - tw / 2}" y="${ly}" width="${tw}" height="36" rx="18" fill="rgba(255,255,255,0.97)" stroke="${pinColor}" stroke-width="2" filter="url(#btPinShadow)"/>`
    s += `<text x="${d.x}" y="${ly + 24}" text-anchor="middle" font-size="18" font-weight="700" fill="${locked ? '#64748B' : d.color}" font-family="Fredoka,sans-serif">${esc(name)}</text>`

    // Progress pill — only for open districts
    if (!locked && progress && progress.total > 0) {
      const ptext = progress.pct >= 100 ? `✓ ${progress.done}/${progress.total}` : `${progress.done}/${progress.total}`
      const pw = ptext.length * 11 + 26
      const py = pinY + 66
      s += `<rect x="${d.x - pw / 2}" y="${py}" width="${pw}" height="30" rx="15" fill="${progress.pct >= 100 ? '#2E8B57' : d.color}" filter="url(#btPinShadow)"/>`
      s += `<text x="${d.x}" y="${py + 21}" text-anchor="middle" font-size="17" font-weight="700" fill="#fff" font-family="Fredoka,sans-serif">${esc(ptext)}</text>`
    }

    s += `</g>`

    s += `</g>`
  })
  return s
}

/* ─────────────────────────────────────────────
   11. SVG CONTENT BUILDER
   ───────────────────────────────────────────── */

function renderDistrictHitAreas() {
  return Object.entries(DISTRICTS).map(([slug, d]) =>
    `<ellipse class="district-hit-area" data-slug="${slug}" cx="${d.x}" cy="${d.y}" rx="${d.zoneRx - 20}" ry="${d.zoneRy - 10}" fill="transparent" pointer-events="all" role="button" tabindex="0" aria-label="Explore ${esc(d.label)}"/>`
  ).join('')
}

// mode: 'full' (desktop, one live SVG) | 'static' (mobile base image —
// scenery only) | 'interactive' (mobile overlay — glows, hit areas, pins)
function buildSvg(skills, progressBySlug = {}, nextSlug = null, mode = 'full', gate = null) {
  let s = ''

  if (mode !== 'interactive') {
    s += renderDefs()

    // Terrain base
    s += `<g id="worldBackground">
      <rect width="${W}" height="${H}" fill="url(#btMeadowG)"/>
      <rect width="${W}" height="${H}" fill="url(#btGrassP)"/>
      <ellipse cx="640" cy="720" rx="540" ry="360" fill="#D7EBA8" opacity=".14"/>
      <ellipse cx="1760" cy="1120" rx="580" ry="420" fill="#31693D" opacity=".08"/>
      <ellipse cx="1300" cy="330" rx="620" ry="260" fill="#C9E698" opacity=".1"/>
      <rect width="${W}" height="230" fill="url(#btSkyWashG)"/>
    </g>`

    // Sky + world nature
    s += `<g id="skyLayer" pointer-events="none">${renderSky()}</g>`
    s += `<g id="worldDecorations" pointer-events="none">${renderDecorations()}</g>`

    // Roads under districts (glows ride the interactive overlay on mobile)
    s += `<g id="roads">${renderRoads(progressBySlug, mode === 'full')}</g>`

    // Hub + 7 districts
    s += `<g id="districts">${renderTownSquare(mode === 'full')}`
    Object.keys(DISTRICTS).forEach(slug => { s += renderDistrict(slug, DISTRICTS[slug], gate?.bySlug[slug]?.state === 'locked') })
    s += `</g>`

    // Roadworks barriers on locked roads (above roads + districts)
    s += `<g id="roadworks" pointer-events="none">${renderRoadworks(gate)}</g>`
  }

  if (mode === 'interactive') {
    s += `<g id="roadGlows">${renderRoadGlows(progressBySlug)}</g>`
    s += `<circle id="hubHitArea" class="hub-hit-area" cx="${CX}" cy="${CY}" r="235" fill="transparent" pointer-events="all" role="button" tabindex="0" aria-label="Visit Brain Town square"/>`
  }

  if (mode !== 'static') {
    // Hit areas over the zones, then markers on the very top so pins
    // receive their own hover/click events
    s += `<g id="interactionOverlays">${renderDistrictHitAreas()}</g>`
    s += `<g id="mapMarkers">${renderMarkers(skills, progressBySlug, nextSlug, gate)}</g>`
  }

  if (mode !== 'interactive') {
    // Vignette for depth (never blocks clicks)
    s += `<rect width="${W}" height="${H}" fill="url(#btVignetteG)" pointer-events="none"/>`
  }

  return s
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

/* ─────────────────────────────────────────────
   12. PAN / ZOOM — bounds-clamped, starts on hub
   ───────────────────────────────────────────── */

function createPanZoom(viewport, svgEl) {
  let tx = 0, ty = 0, scale = 1
  let down = false, lx = 0, ly = 0, moved = 0
  let pDist = 0, pScale = 1
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Lower zoom ceiling on mobile keeps GPU tile rasterisation affordable
  const MAX_S = LITE_MODE ? 2.4 : 4.0

  const vw = () => viewport.clientWidth
  const vh = () => viewport.clientHeight
  const minS = () => Math.max(vw() / W, vh() / H)

  function clamp() {
    scale = Math.max(minS(), Math.min(MAX_S, scale))
    tx = Math.max(vw() - W * scale, Math.min(0, tx))
    ty = Math.max(vh() - H * scale, Math.min(0, ty))
  }

  let raf = 0

  function applyNow() {
    raf = 0
    // translate3d keeps the map on its own GPU layer while panning
    svgEl.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${scale})`
  }

  function apply(smooth) {
    if (smooth && !noMotion) {
      svgEl.style.transition = 'transform 0.35s ease-out'
      setTimeout(() => { svgEl.style.transition = '' }, 380)
      applyNow()
      return
    }
    // Batch rapid pointer/pinch updates to one transform per frame
    if (!raf) raf = requestAnimationFrame(applyNow)
  }

  // fitMode: true while the "whole town" fullscreen view is active, so a
  // window resize re-fits instead of snapping back to the hub.
  let fitMode = false

  function home() {
    fitMode = false
    scale = Math.min(1.05, Math.max(minS() * 1.55, 0.62))
    tx = vw() / 2 - CX * scale
    ty = vh() / 2 - CY * scale
    clamp(); apply(true)
  }

  // Zoom all the way out so the entire world fits the viewport, centred.
  function fit() {
    fitMode = true
    scale = minS()
    tx = (vw() - W * scale) / 2
    ty = (vh() - H * scale) / 2
    clamp(); apply(true)
  }

  function panTo(wx, wy) {
    tx = vw() / 2 - wx * scale
    ty = vh() / 2 - wy * scale
    clamp(); apply(true)
  }

  function zoomBy(f) {
    const cx = vw() / 2, cy = vh() / 2
    const ns = Math.max(minS(), Math.min(MAX_S, scale * f))
    tx = cx - (cx - tx) * (ns / scale); ty = cy - (cy - ty) * (ns / scale)
    scale = ns; clamp(); apply(true)
  }

  viewport.addEventListener('pointerdown', e => {
    down = true; lx = e.clientX; ly = e.clientY; moved = 0
    viewport.dataset.wasDragging = '0'; viewport.classList.add('grabbing')
  })
  viewport.addEventListener('pointermove', e => {
    if (!down) return
    const dx = e.clientX - lx, dy = e.clientY - ly
    tx += dx; ty += dy; moved += Math.abs(dx) + Math.abs(dy)
    if (moved > 8 && !viewport.hasPointerCapture(e.pointerId)) viewport.setPointerCapture(e.pointerId)
    lx = e.clientX; ly = e.clientY; clamp(); apply()
  })
  const up = () => {
    down = false; viewport.classList.remove('grabbing')
    viewport.dataset.wasDragging = moved > 8 ? '1' : '0'
    setTimeout(() => { viewport.dataset.wasDragging = '0' }, 0)
  }
  viewport.addEventListener('pointerup', up)
  viewport.addEventListener('pointercancel', up)

  viewport.addEventListener('wheel', e => {
    e.preventDefault()
    const r = viewport.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top
    const f = e.deltaY < 0 ? 1.15 : 0.87
    const ns = Math.max(minS(), Math.min(MAX_S, scale * f))
    tx = mx - (mx - tx) * (ns / scale); ty = my - (my - ty) * (ns / scale)
    scale = ns; clamp(); apply()
  }, { passive: false })

  viewport.addEventListener('touchstart', e => { if (e.touches.length === 2) { pDist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY); pScale = scale } }, { passive: true })
  viewport.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && pDist) {
      e.preventDefault()
      const d = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY)
      scale = pScale * (d / pDist); clamp(); apply()
    } else if (e.touches.length === 1) {
      e.preventDefault()
    }
  }, { passive: false })

  home()
  window.addEventListener('resize', () => { fitMode ? fit() : home() })

  return { home, fit, panTo, zoomBy }
}

/* ─────────────────────────────────────────────
   13. DANIEL CHARACTER
   Idle at Town Square; short walk toward district.
   ───────────────────────────────────────────── */

const DANIEL_FRAMES = [
  '/images/characters/daniel-walking1.png',
  '/images/characters/daniel-walking2.png',
  '/images/characters/daniel-walking3.png',
  '/images/characters/daniel-walking4.png',
  '/images/characters/daniel-walking5.png',
]
const DANIEL_IDLE = '/images/characters/DanielTheDog.webp'

function createDaniel(worldEl) {
  const el = document.createElement('div')
  el.className = 'svg-daniel'
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = 'position:absolute;width:130px;height:130px;z-index:10;pointer-events:none;'

  const shadow = document.createElement('div')
  shadow.style.cssText = 'position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:78px;height:16px;background:rgba(0,0,0,0.14);border-radius:50%;filter:blur(4px);'
  el.appendChild(shadow)

  const img = document.createElement('img')
  img.src = DANIEL_IDLE; img.alt = ''
  img.style.cssText = 'width:100%;height:100%;object-fit:contain;position:relative;'
  el.appendChild(img)
  worldEl.appendChild(el)

  DANIEL_FRAMES.forEach(src => { const i = new Image(); i.src = src })

  let pos = { x: CX, y: CY }
  let state = 'idle'
  let route = [], rIdx = 0, fIdx = 0, tick = 0, flipped = false
  let onDone = null
  let atSlug = null // the district road Daniel is on (null = home at the square)
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function place(x, y) { pos = { x, y }; el.style.left = (x - 65) + 'px'; el.style.top = (y - 122) + 'px' }

  function samplePath(d, steps, rev) {
    const ns = 'http://www.w3.org/2000/svg'
    const tmp = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path')
    p.setAttribute('d', d); tmp.appendChild(p)
    tmp.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0;'
    document.body.appendChild(tmp)
    const len = p.getTotalLength(), pts = []
    for (let i = 0; i <= steps; i++) { const pt = p.getPointAtLength((i / steps) * len); pts.push({ x: pt.x, y: pt.y }) }
    document.body.removeChild(tmp)
    return rev ? pts.reverse() : pts
  }

  // Route from wherever Daniel is now back to the Town Square: retrace his
  // current road (joining it at the nearest point, in case he's mid-walk),
  // or a short straight line if he's off-road for any reason.
  function routeToHub() {
    const nearHub = Math.hypot(CX - pos.x, CY - pos.y) < 24
    if (nearHub) return []
    if (atSlug && ROAD_PATHS[atSlug]) {
      const back = samplePath(ROAD_PATHS[atSlug], 60, false).reverse() // district → hub
      let nearest = 0, best = Infinity
      back.forEach((pt, i) => {
        const dist = Math.hypot(pt.x - pos.x, pt.y - pos.y)
        if (dist < best) { best = dist; nearest = i }
      })
      return back.slice(nearest)
    }
    const steps = Math.max(8, Math.floor(Math.hypot(CX - pos.x, CY - pos.y) / 8))
    const line = []
    for (let i = 0; i <= steps; i++) line.push({ x: pos.x + (CX - pos.x) * (i / steps), y: pos.y + (CY - pos.y) * (i / steps) })
    return line
  }

  function walkToward(slug, cb) {
    onDone = cb || null
    const path = ROAD_PATHS[slug]
    if (!path) { if (onDone) onDone(); return }

    // Already there — don't restart the walk
    if (atSlug === slug && state === 'arrived') {
      if (onDone) { onDone(); onDone = null }
      return
    }

    const full = samplePath(path, 60, false)
    const outbound = full.slice(0, Math.floor(full.length * .92))

    if (noMotion) {
      const destination = outbound[outbound.length - 1]
      place(destination.x, destination.y); img.src = DANIEL_IDLE; state = 'arrived'; atSlug = slug
      if (onDone) { onDone(); onDone = null }
      return
    }

    // Walk back to the square first (from wherever he is), then out along
    // the new road — never teleport back to the centre.
    route = routeToHub().concat(outbound)
    atSlug = slug
    rIdx = 0; state = 'walking'; img.src = DANIEL_FRAMES[0]
    startLoop()
  }

  function walkHome(cb) {
    onDone = () => { state = 'idle'; if (cb) cb() }
    if (noMotion) { place(CX, CY); state = 'idle'; atSlug = null; if (cb) cb(); return }
    route = routeToHub()
    atSlug = null
    if (route.length === 0) { state = 'idle'; if (cb) cb(); return }
    rIdx = 0; state = 'walking'; img.src = DANIEL_FRAMES[0]
    startLoop()
  }

  // The walk loop only runs WHILE walking. When Daniel is standing still
  // the rAF stops entirely and the bob comes from a compositor-only CSS
  // animation on the sprite — zero per-frame script/layout work at rest.
  let rafId = 0

  function setResting(resting) {
    el.classList.toggle('svg-daniel-rest', resting)
  }

  function loop() {
    tick++
    if (state === 'walking' && route.length) {
      if (tick % 6 === 0) { fIdx = (fIdx + 1) % DANIEL_FRAMES.length; img.src = DANIEL_FRAMES[fIdx] }
      if (tick % 2 === 0) {
        const prev = rIdx; rIdx++
        if (rIdx >= route.length) {
          state = 'arrived'; img.src = DANIEL_IDLE
          rafId = 0; setResting(true)
          if (onDone) { onDone(); onDone = null }
          return
        }
        const pt = route[rIdx], pp = route[prev]
        place(pt.x, pt.y)
        const ddx = pt.x - pp.x
        if (Math.abs(ddx) > 0.5) { const flip = ddx < 0; if (flip !== flipped) { el.style.transform = flip ? 'scaleX(-1)' : ''; flipped = flip } }
      }
      rafId = requestAnimationFrame(loop)
      return
    }
    rafId = 0
    setResting(true)
  }

  function startLoop() {
    setResting(false)
    if (!rafId) rafId = requestAnimationFrame(loop)
  }

  place(CX, CY)
  setResting(true)

  return { walkToward, walkHome, el, startLoop }
}

/* ─────────────────────────────────────────────
   14. SKILL POPUP — fixed overlay layer
   Positioned in SCREEN coordinates (position:fixed),
   never in transformed map/world coordinates, so it is
   always inside the viewport no matter how the map has
   been dragged or zoomed.
   Desktop: docked middle-right. Mobile: bottom sheet.
   (Layout switch is pure CSS media query.)
   ───────────────────────────────────────────── */

function createSkillPopup({ onNavigate, modules = [], childModules = [] }) {
  // Re-init safety: never leave a duplicate overlay behind
  const stale = document.getElementById('btSvgPopupRoot')
  if (stale) stale.remove()

  const root = document.createElement('div')
  root.id = 'btSvgPopupRoot'
  root.innerHTML = `
    <div class="bt-svg-popup-scrim"></div>
    <div class="bt-svg-popup" role="dialog" aria-label="Super Skill details"></div>
  `
  document.body.appendChild(root)
  const scrim = root.querySelector('.bt-svg-popup-scrim')
  const panel = root.querySelector('.bt-svg-popup')

  let openSlug = null
  let onClose = null

  function skillProgress(skill, slug) {
    const skillModules = modules.filter(m => m.super_skill_id === skill?.id || (m.category || '').toLowerCase().replace(/\s+/g, '-') === slug)
    const done = skillModules.filter(m => childModules.some(cm => cm.module_id === m.id && cm.is_completed === true)).length
    return { done, total: skillModules.length, pct: skillModules.length ? Math.round(done / skillModules.length * 100) : 0 }
  }

  function progressBlock(p, label, color) {
    if (!p.total) return ''
    return `<div class="bt-svg-progress">
      <div><span>${esc(label)}</span><b>${p.done} of ${p.total}</b></div>
      <span class="bt-svg-progress-track"><span style="width:${p.pct}%;background:${color}"></span></span>
      <small>Every adventure makes this road stronger.</small>
    </div>`
  }

  function open(slug, skill, d, lock = null) {
    openSlug = slug
    const name = skill?.name || d.label
    const img = skill?.character_image_url
    const desc = skill?.description || d.desc
    const charName = skill?.character_name
    const copy = KID_FRIENDLY_COPY[slug] || { description: desc, pickThisIf: null, youllLearn: null, tag: null }
    const progress = skillProgress(skill, slug)

    // Locked district: tell the child exactly what unlocks it and point
    // them at the skill they should finish first.
    if (lock?.locked) {
      const reqName = lock.requirementName || 'your current Super Skill'
      panel.innerHTML = `
        <div class="bt-svg-ph" style="background:linear-gradient(150deg,${d.color}14,#ffffff 70%);border-color:#B9C4CF66">
          <button class="bt-svg-px" aria-label="Close">&times;</button>
          ${img ? `<img src="${img}" alt="" class="bt-svg-pi" style="filter:saturate(.4);opacity:.9"/>` : `<div class="bt-svg-pe">🔒</div>`}
          <h3 class="bt-svg-pn">${esc(name)}</h3>
          ${charName ? `<span class="bt-svg-pc">Guide: ${esc(charName)}</span>` : ''}
          <span class="bt-svg-pd" style="color:#5B6773">🔒 Next on your journey</span>
        </div>
        <div class="bt-svg-pb">
          <p><strong>${esc(name)}</strong> unlocks when you complete the <strong>${esc(reqName)}</strong> Super Skill.</p>
          ${charName ? `<p>${esc(charName)} will be waiting for you when the road opens!</p>` : ''}
        </div>
        <div class="bt-svg-pf">
          ${lock.activeSkill ? `<button class="bt-svg-cta" style="background:linear-gradient(135deg,${lock.activeColor || '#405878'},${lock.activeAccent || '#2f4562'})">Keep going in ${esc(lock.activeSkill.name || reqName)}</button>` : `<button class="bt-svg-cta" style="background:linear-gradient(135deg,#9AA5B1,#5B6773)">Okay!</button>`}
        </div>`

      panel.querySelector('.bt-svg-cta').addEventListener('click', () => {
        close()
        if (lock.activeSkill && onNavigate) onNavigate(lock.activeSkill)
      })
      show()
      return
    }

    panel.innerHTML = `
      <div class="bt-svg-ph" style="background:linear-gradient(150deg,${d.color}1F,#ffffff 70%);border-color:${d.color}44">
        <button class="bt-svg-px" aria-label="Close">&times;</button>
        <span class="bt-svg-ps bt-svg-ps1">✦</span><span class="bt-svg-ps bt-svg-ps2">✦</span>
        ${img ? `<img src="${img}" alt="" class="bt-svg-pi"/>` : `<div class="bt-svg-pe">${d.emoji}</div>`}
        <h3 class="bt-svg-pn">${esc(name)}</h3>
        ${charName ? `<span class="bt-svg-pc">Guide: ${esc(charName)}</span>` : ''}
        <span class="bt-svg-pd" style="color:${d.color}">${esc(copy.tag || d.district)}</span>
      </div>
      <div class="bt-svg-pb">
        <p>${esc(copy.description || desc)}</p>
        ${copy.pickThisIf ? `<div class="bt-svg-block"><div class="bt-svg-label">Pick this if</div><p>${esc(copy.pickThisIf)}</p></div>` : ''}
        ${copy.youllLearn ? `<div class="bt-svg-block"><div class="bt-svg-label">You'll learn to</div><ul>${copy.youllLearn.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>` : ''}
        ${progressBlock(progress, 'Adventures completed', d.color)}
      </div>
      <div class="bt-svg-pf">
        <button class="bt-svg-cta" style="background:linear-gradient(135deg,${d.color},${d.accent})">${progress.done ? 'Continue Adventure' : 'Start Adventure'}</button>
      </div>`

    panel.querySelector('.bt-svg-cta').addEventListener('click', () => {
      close()
      if (onNavigate && skill) onNavigate(skill)
    })
    show()
  }

  function show() {
    root.classList.add('open')
    const closeBtn = panel.querySelector('.bt-svg-px')
    if (closeBtn) closeBtn.addEventListener('click', close)
    setTimeout(() => { const b = panel.querySelector('.bt-svg-px'); if (b) b.focus() }, 150)
  }

  function close() {
    if (!openSlug) return
    openSlug = null
    root.classList.remove('open')
    if (onClose) onClose()
  }

  scrim.addEventListener('click', close)
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openSlug) close() })

  return { open, close, isOpen: () => !!openSlug, setOnClose: fn => { onClose = fn } }
}

/* ─────────────────────────────────────────────
   15. INJECTED STYLES
   ───────────────────────────────────────────── */

function injectStyles() {
  if (document.getElementById('bt-svg-styles')) return
  const st = document.createElement('style')
  st.id = 'bt-svg-styles'
  st.textContent = `
/* ── Viewport ── */
.bt-svg-vp{width:100%;height:78vh;min-height:500px;overflow:hidden;position:relative;border-radius:22px;background:#5D9A49;touch-action:none;user-select:none;cursor:grab;border:2px solid #e7ecf3;box-shadow:0 8px 30px rgba(40,60,90,.12)}
.bt-svg-vp.grabbing{cursor:grabbing}
/* ── Controls ── */
.bt-svg-ctrls{position:absolute;bottom:14px;right:14px;display:flex;flex-direction:column;gap:6px;z-index:5}
.bt-svg-cb{width:42px;height:42px;border:none;border-radius:12px;background:#fff;color:#16324f;font-size:20px;font-weight:700;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;transition:transform .15s;font-family:Fredoka,sans-serif}
.bt-svg-cb:hover{transform:scale(1.08);background:#f8f9fc}.bt-svg-cb:active{transform:scale(.95)}
.bt-svg-cbw{width:auto;padding:0 14px;font-size:12px}
/* ── Fullscreen toggle (top-right, below the "big idea" chip) ── */
.bt-svg-fsb{position:absolute;top:58px;right:12px;z-index:6;width:42px;height:42px;border:none;border-radius:12px;background:#fff;color:#16324f;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;transition:transform .15s}
.bt-svg-fsb:hover{transform:scale(1.08);background:#f8f9fc}.bt-svg-fsb:active{transform:scale(.95)}
.bt-svg-vp.bt-svg-fs{position:fixed;inset:0;z-index:110;height:auto;min-height:0;border-radius:0;border:none}
.bt-svg-vp.bt-svg-fs .bt-svg-fsb{top:14px;right:14px}
body.bt-fs-lock{overflow:hidden}
/* ── Hint ── */
.bt-svg-hint{position:absolute;top:12px;left:12px;background:rgba(255,255,255,.92);border-radius:12px;padding:8px 16px;font-size:12px;font-weight:600;color:#16324f;z-index:5;box-shadow:0 2px 8px rgba(0,0,0,.1);pointer-events:none;transition:opacity .5s;font-family:Fredoka,sans-serif}
/* ── Ambient animations ── */
@keyframes btSway{0%,100%{transform:rotate(0)}25%{transform:rotate(2deg)}75%{transform:rotate(-2deg)}}
@keyframes btSwayS{0%,100%{transform:rotate(0)}50%{transform:rotate(1.4deg)}}
.bt-sway{animation:btSway 4s ease-in-out infinite}
.bt-sway-s{animation:btSwayS 6s ease-in-out infinite}
@keyframes btTw{0%,100%{opacity:.9}50%{opacity:.15}}
@keyframes btTwD{0%,100%{opacity:.25}50%{opacity:.9}}
.bt-twinkle{animation:btTw 2.2s ease-in-out infinite}.bt-twinkle-d{animation:btTwD 3.1s ease-in-out infinite}
@keyframes btGl{0%,100%{opacity:.55}50%{opacity:1}}
.bt-glow{animation:btGl 3s ease-in-out infinite}
@keyframes btHubGlow{0%,100%{opacity:.7}50%{opacity:1}}
.bt-hub-glow{animation:btHubGlow 5s ease-in-out infinite}
@keyframes btSpin{to{transform:rotate(360deg)}}
@keyframes btSpinRev{to{transform:rotate(-360deg)}}
.bt-spin{animation:btSpin 14s linear infinite;transform-box:fill-box;transform-origin:center}
.bt-spin-rev{animation:btSpinRev 11s linear infinite;transform-box:fill-box;transform-origin:center}
.bt-spin-slow{animation:btSpin 30s linear infinite;transform-box:fill-box;transform-origin:center}
@keyframes btScan{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(10deg)}}
.bt-scan{animation:btScan 12s ease-in-out infinite;transform-box:fill-box;transform-origin:bottom center}
@keyframes btBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.bt-bob{animation:btBob 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.bt-bob-slow{animation:btBob 4.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes btFlick{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.25) scaleX(.9)}}
.bt-flicker{animation:btFlick .7s ease-in-out infinite;transform-box:fill-box;transform-origin:bottom center}
/* Daniel at rest: compositor-only bob, no per-frame script */
@keyframes btDanielBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.svg-daniel-rest img{animation:btDanielBob 2.8s ease-in-out infinite}
/* ── Pins ── */
.svg-pin{cursor:pointer;transition:transform .2s ease;transform-box:fill-box;transform-origin:center}
.svg-pin:hover,.svg-pin.hover,.svg-pin:focus-visible{transform:translateY(-5px) scale(1.05)}
.svg-pin-bob{animation:btBob 3.8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.svg-pin:focus-visible{outline:3px solid #f2c94c;outline-offset:4px;border-radius:8px}
.svg-pin-ring{opacity:0;transform-box:fill-box;transform-origin:center}
.svg-pin.selected .svg-pin-ring{animation:btPinPulse 1.8s ease-out infinite}
@keyframes btPinPulse{0%{opacity:.85;transform:scale(.92)}100%{opacity:0;transform:scale(1.45)}}
/* ── Buildings & hit areas ── */
.svg-building{cursor:pointer;transition:transform .22s ease;transform-box:fill-box;transform-origin:center bottom}
.svg-building:hover,.svg-building.hover,.svg-building:focus-visible{transform:translateY(-5px) scale(1.025)}
.svg-building:focus-visible{outline:3px solid #f2c94c;outline-offset:4px;border-radius:8px}
.district-hit-area,.hub-hit-area{cursor:pointer;outline:none}
.district-hit-area:focus-visible,.hub-hit-area:focus-visible{stroke:#f2c94c;stroke-width:6;stroke-dasharray:12 10}
/* ── Road glow ── */
@keyframes btRoadPulse{0%,100%{opacity:.28}50%{opacity:.55}}
.svg-road-glow.active{animation:btRoadPulse 2s ease-in-out infinite}
/* ── Popup overlay (screen coordinates — never map coordinates) ── */
#btSvgPopupRoot{position:fixed;inset:0;z-index:120;pointer-events:none;visibility:hidden}
#btSvgPopupRoot.open{visibility:visible}
.bt-svg-popup-scrim{position:absolute;inset:0;background:rgba(22,50,79,.22);opacity:0;transition:opacity .28s ease}
#btSvgPopupRoot.open .bt-svg-popup-scrim{opacity:1;pointer-events:auto}
.bt-svg-popup{position:fixed;top:50%;right:24px;transform:translateY(-50%) translateX(46px) scale(.97);opacity:0;width:min(380px,calc(100vw - 48px));max-height:min(660px,calc(100vh - 48px));display:flex;flex-direction:column;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(22,50,79,.3);transition:transform .32s cubic-bezier(.3,.9,.3,1),opacity .25s ease}
#btSvgPopupRoot.open .bt-svg-popup{transform:translateY(-50%) translateX(0) scale(1);opacity:1;pointer-events:auto}
/* Popup header */
.bt-svg-ph{padding:26px 24px 18px;border-bottom:3px solid;position:relative;text-align:center}
.bt-svg-px{position:absolute;top:14px;right:14px;width:40px;height:40px;border-radius:50%;border:0;background:#fff;color:#16324f;font-size:20px;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.15);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s}
.bt-svg-px:hover{transform:scale(1.1) rotate(90deg)}
.bt-svg-ps{position:absolute;color:#f2c94c;font-size:16px;animation:btTw 2.4s ease-in-out infinite;pointer-events:none}
.bt-svg-ps1{top:20px;left:22px}.bt-svg-ps2{bottom:16px;right:56px;font-size:12px;animation-delay:1.1s}
.bt-svg-pi{width:76px;height:76px;object-fit:contain;margin:0 auto 10px;display:block;filter:drop-shadow(0 4px 8px rgba(22,50,79,.18))}
.bt-svg-pe{width:76px;height:76px;border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:36px;background:#fff;box-shadow:0 4px 12px rgba(22,50,79,.12)}
.bt-svg-pn{font-size:23px;margin:0;color:#16324f;font-weight:700;font-family:Fredoka,sans-serif}
.bt-svg-pc{font-size:13px;color:#6b7e95;display:block;margin-top:2px}
.bt-svg-pd{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:4px;display:block}
/* Popup body */
.bt-svg-pb{padding:20px 24px;overflow:auto;flex:1 1 auto;min-height:0}
.bt-svg-pb p{font-size:14.5px;color:#405878;line-height:1.6;margin:0}
.bt-svg-block{margin-top:16px}
.bt-svg-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#6b7e95;margin-bottom:4px}
.bt-svg-block ul{margin:5px 0 0 18px;padding:0;color:#405878;font-size:13px;line-height:1.5}
.bt-svg-progress{background:#f4f7fb;border-radius:12px;padding:12px;margin-top:16px}
.bt-svg-progress>div{display:flex;justify-content:space-between;gap:12px;color:#16324f;font-size:12px}
.bt-svg-progress-track{display:block;height:9px;background:#e3e8ef;border-radius:999px;overflow:hidden;margin-top:7px}
.bt-svg-progress-track>span{display:block;height:100%;border-radius:inherit;transition:width .6s ease}
.bt-svg-progress small{display:block;color:#6b7e95;margin-top:6px;font-size:11px}
/* Popup footer */
.bt-svg-pf{padding:16px 24px;border-top:1px solid #e7ecf3;flex:0 0 auto}
.bt-svg-cta{width:100%;color:#fff;border:none;border-radius:14px;padding:14px 20px;font-weight:600;font-size:15px;font-family:Fredoka,sans-serif;cursor:pointer;text-align:center;transition:transform .15s,box-shadow .15s;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.bt-svg-cta:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.22)}
.bt-svg-cta:active{transform:translateY(0)}
/* Mobile / tablet: bottom sheet, centred */
@media(max-width:768px){
  .bt-svg-vp{height:65vh;min-height:400px}
  .bt-svg-hint{font-size:11px;padding:6px 12px}
  .bt-svg-popup{top:auto;right:0;left:0;bottom:0;margin:0 auto;width:100%;max-width:520px;max-height:min(72vh,calc(100vh - 24px));border-radius:24px 24px 0 0;transform:translateY(105%)}
  #btSvgPopupRoot.open .bt-svg-popup{transform:translateY(0)}
}
/* Reduced motion */
/* Lite mode (touch devices): ambient animation off — a still map pans
   at full speed. */
.bt-svg-lite .bt-sway,.bt-svg-lite .bt-sway-s,.bt-svg-lite .bt-twinkle,.bt-svg-lite .bt-twinkle-d,.bt-svg-lite .bt-glow,.bt-svg-lite .bt-hub-glow,.bt-svg-lite .bt-spin,.bt-svg-lite .bt-spin-rev,.bt-svg-lite .bt-spin-slow,.bt-svg-lite .bt-scan,.bt-svg-lite .bt-bob,.bt-svg-lite .bt-bob-slow,.bt-svg-lite .bt-flicker,.bt-svg-lite .svg-pin-bob,.bt-svg-lite .svg-pin-ring,.bt-svg-lite .bt-svg-ps{animation:none!important}
/* While the finger is down, pause ALL map animation so panning never
   competes with repaints (applies on every device). */
.bt-svg-vp.grabbing *{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){
  .bt-sway,.bt-sway-s,.bt-twinkle,.bt-twinkle-d,.bt-glow,.bt-hub-glow,.bt-spin,.bt-spin-rev,.bt-spin-slow,.bt-scan,.bt-bob,.bt-bob-slow,.bt-flicker,.svg-pin-bob,.svg-pin-ring,.svg-road-glow.active,.bt-svg-ps,.svg-daniel-rest img{animation:none!important}
  .bt-svg-popup{transition:opacity .2s ease}
}
`
  document.head.appendChild(st)
}

/* ─────────────────────────────────────────────
   16. PUBLIC API
   ───────────────────────────────────────────── */

export async function initSvgMap(container, { onSelectSkill, modules = [], childModules = [] } = {}) {
  // Generation guard: init can be triggered from several places (child
  // selected, data refresh, bootstrap poll). Only the newest call may
  // render — older in-flight calls bail out after their await, so two
  // maps can never stack in the same container.
  const gen = `${Date.now()}-${Math.random()}`
  container.dataset.svgMapGen = gen

  let skills = []
  try { skills = await getSuperSkills() || [] } catch (_) {}
  if (container.dataset.svgMapGen !== gen) return

  injectStyles()
  container.innerHTML = ''
  // A re-render replaces any fullscreen map instance — release its scroll lock
  document.body.classList.remove('bt-fs-lock')

  // ── Per-skill progress (drives road build states + marker pills) ──
  const slugOf = sk => sk.slug || (sk.name || '').toLowerCase().replace(/\s+/g, '-')
  const progressBySlug = {}
  skills.forEach(sk => {
    const slug = slugOf(sk)
    const skillModules = modules.filter(m =>
      m.super_skill_id === sk.id ||
      (m.category && m.category.toLowerCase().replace(/\s+/g, '-') === slug)
    )
    const total = skillModules.length
    const done = skillModules.filter(m => childModules.some(cm => cm.module_id === m.id && cm.is_completed === true)).length
    progressBySlug[slug] = { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  })

  // ── Sequential unlock: skills open in sort_order, one at a time.
  // Practitioners tour the whole town — same override getSkillGate applies;
  // this map builds its gate from explicit args, so apply it here too. ──
  let gate = computeSkillStates(skills, modules, childModules)
  if (isPractitionerSession()) gate = applyPractitionerOverride(gate)

  // ── "Next step" flag: the focus skill if set (and not locked), else the
  // gate's active skill — one obvious place to go next. ──
  const focus = window.currentFocusSuperSkill
  let nextSlug = (focus && DISTRICTS[focus] && gate?.bySlug[focus]?.state !== 'locked') ? focus : null
  if (!nextSlug && gate?.activeSlug && DISTRICTS[gate.activeSlug]) nextSlug = gate.activeSlug
  if (!nextSlug) {
    const order = Object.keys(DISTRICTS)
    nextSlug =
      order.find(s => { const p = progressBySlug[s]; return p && p.total > 0 && p.done > 0 && p.pct < 100 }) ||
      order.find(s => { const p = progressBySlug[s]; return p && p.total > 0 && p.pct < 100 }) ||
      null
  }

  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:relative;width:100%;'

  const vp = document.createElement('div')
  vp.className = 'bt-svg-vp' + (LITE_MODE ? ' bt-svg-lite' : '')

  // Drops SVG filter references and SMIL animation — the two things that
  // make mobile panning re-rasterise the whole map.
  const stripHeavy = str => str
    .replace(/ filter="url\(#[^"]+\)"/g, '')
    .replace(/<animate(?:Transform|Motion)?\b[^>]*\/>/g, '')
    .replace(/<animate(?:Transform|Motion)?\b[^>]*>[\s\S]*?<\/animate(?:Transform|Motion)?>/g, '')

  const world = document.createElement('div')
  world.style.cssText = `position:absolute;top:0;left:0;width:${W}px;height:${H}px;transform-origin:0 0;will-change:transform;`

  if (LITE_MODE) {
    // Mobile: the scenery is rasterised ONCE into a bitmap (an <img> with
    // an SVG blob source). Panning then blits a bitmap instead of walking
    // thousands of live vector nodes per tile. Only the interactive bits —
    // road glows, hit areas, pins, the next-step flag — stay as a small
    // live SVG overlay on top.
    const staticSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${stripHeavy(buildSvg(skills, progressBySlug, nextSlug, 'static', gate))}</svg>`
    if (container._btSceneryUrl) { try { URL.revokeObjectURL(container._btSceneryUrl) } catch (_) {} }
    const sceneryUrl = URL.createObjectURL(new Blob([staticSvg], { type: 'image/svg+xml' }))
    container._btSceneryUrl = sceneryUrl

    const ixSvg = stripHeavy(buildSvg(skills, progressBySlug, nextSlug, 'interactive', gate))
    world.innerHTML =
      `<img src="${sceneryUrl}" width="${W}" height="${H}" alt="" draggable="false" style="position:absolute;top:0;left:0;width:${W}px;height:${H}px;display:block;pointer-events:none;user-select:none;"/>` +
      `<svg id="brainTownMap" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;top:0;left:0;display:block" role="img" aria-label="Brain Town interactive map">${ixSvg}</svg>`
  } else {
    world.innerHTML = `<svg id="brainTownMap" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block" role="img" aria-label="Brain Town interactive map">${buildSvg(skills, progressBySlug, nextSlug, 'full', gate)}</svg>`
  }
  vp.appendChild(world)

  // Controls
  const ctrls = document.createElement('div')
  ctrls.className = 'bt-svg-ctrls'
  ctrls.innerHTML = `<button class="bt-svg-cb" id="svgZI" aria-label="Zoom in">+</button><button class="bt-svg-cb" id="svgZO" aria-label="Zoom out">&minus;</button><button class="bt-svg-cb bt-svg-cbw" id="svgHm" aria-label="Centre map">Centre</button>`
  vp.appendChild(ctrls)

  // Fullscreen toggle — fills the browser window and zooms right out so
  // the whole town is visible at once. Sits below the "big idea" chip.
  const FS_ICON_EXPAND = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`
  const FS_ICON_SHRINK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>`
  const fsBtn = document.createElement('button')
  fsBtn.className = 'bt-svg-fsb'
  fsBtn.innerHTML = FS_ICON_EXPAND
  fsBtn.setAttribute('aria-label', 'See the whole town (full screen)')
  vp.appendChild(fsBtn)

  // Hint
  const hint = document.createElement('div')
  hint.className = 'bt-svg-hint'
  hint.textContent = 'Drag to explore • Tap a building'
  vp.appendChild(hint)
  setTimeout(() => { hint.style.opacity = '0' }, 5000)

  wrap.appendChild(vp)
  container.appendChild(wrap)

  // Pan/Zoom — centre once the tab is visible/measurable
  const pz = createPanZoom(vp, world)
  requestAnimationFrame(() => requestAnimationFrame(pz.home))
  ctrls.querySelector('#svgZI').addEventListener('click', () => pz.zoomBy(1.25))
  ctrls.querySelector('#svgZO').addEventListener('click', () => pz.zoomBy(0.8))
  ctrls.querySelector('#svgHm').addEventListener('click', pz.home)

  // ── Fullscreen mode ──
  let fsOn = false
  function setFullscreen(on) {
    fsOn = on
    vp.classList.toggle('bt-svg-fs', on)
    document.body.classList.toggle('bt-fs-lock', on)
    fsBtn.innerHTML = on ? FS_ICON_SHRINK : FS_ICON_EXPAND
    fsBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'See the whole town (full screen)')
    // Wait a frame so the viewport has its new size before measuring
    requestAnimationFrame(() => { on ? pz.fit() : pz.home() })
  }
  fsBtn.addEventListener('click', () => setFullscreen(!fsOn))
  document.addEventListener('keydown', e => {
    // Guard against stale listeners from a previous map init
    if (e.key === 'Escape' && fsOn && document.body.contains(vp)) setFullscreen(false)
  })

  const svgEl = world.querySelector('#brainTownMap')

  if (!LITE_MODE && svgEl) {
    // While the pointer is down, pause SMIL scenery animation too (CSS
    // animations are already paused via the .grabbing rule) so panning
    // never competes with re-rasterisation.
    vp.addEventListener('pointerdown', () => { try { svgEl.pauseAnimations() } catch (_) {} })
    const resumeSmil = () => {
      if (container._btDegraded) return
      try { svgEl.unpauseAnimations() } catch (_) {}
    }
    vp.addEventListener('pointerup', resumeSmil)
    vp.addEventListener('pointercancel', resumeSmil)

    // One-time FPS probe: hardware that passes the static heuristics can
    // still be too weak for the fully animated map (old desktop GPUs).
    // If the measured frame rate is poor, degrade live — strip ambient
    // animation and filters — and remember the verdict for next time so
    // the map starts straight on the fast bitmap path.
    const degrade = () => {
      container._btDegraded = true
      vp.classList.add('bt-svg-lite')
      try { svgEl.pauseAnimations() } catch (_) {}
      svgEl.querySelectorAll('[filter]').forEach(n => n.removeAttribute('filter'))
      try { localStorage.setItem(LITE_FLAG_KEY, '1') } catch (_) {}
    }
    if (!window._btFpsProbed) {
      setTimeout(() => {
        // Only measure a map that is actually visible; otherwise leave the
        // probe armed for a later init.
        if (document.hidden || container.dataset.svgMapGen !== gen || !container.offsetParent) return
        window._btFpsProbed = true
        let frames = 0
        const t0 = performance.now()
        const count = () => {
          frames++
          if (performance.now() - t0 < 1500) { requestAnimationFrame(count); return }
          if (document.hidden || container.dataset.svgMapGen !== gen) return
          const fps = frames / ((performance.now() - t0) / 1000)
          if (fps < 42) degrade()
        }
        requestAnimationFrame(count)
      }, 900)
    }
  }

  // Daniel
  const daniel = createDaniel(world)

  // Popup (fixed overlay, screen coordinates)
  const popup = createSkillPopup({
    onNavigate: skill => { if (onSelectSkill && skill) onSelectSkill(skill) },
    modules, childModules,
  })

  // ── Selection logic ──
  function clearSelection() {
    world.querySelectorAll('.svg-pin.selected').forEach(p => p.classList.remove('selected'))
    // Clear inline opacity so completed roads fall back to their permanent glow
    world.querySelectorAll('.svg-road-glow').forEach(r => { r.classList.remove('active'); r.style.opacity = '' })
  }
  popup.setOnClose(clearSelection)

  function selectDistrict(slug) {
    const d = DISTRICTS[slug]
    if (!d) return
    const slugFor = s => s.slug || (s.name || '').toLowerCase().replace(/\s+/g, '-')
    const sk = skills.find(s => slugFor(s) === slug)

    // Locked skills open an "under construction" popup instead of the
    // adventure CTA — with a shortcut back to the skill they should finish.
    let lock = null
    if (gate?.bySlug[slug]?.state === 'locked') {
      const requirement = getUnlockRequirement(slug, gate)
      const activeSkill = gate.activeSlug ? skills.find(s => slugFor(s) === gate.activeSlug) : null
      const activeDistrict = gate.activeSlug ? DISTRICTS[gate.activeSlug] : null
      lock = {
        locked: true,
        requirementName: requirement?.name || activeSkill?.name || null,
        activeSkill,
        activeColor: activeDistrict?.color,
        activeAccent: activeDistrict?.accent
      }
    }

    clearSelection()
    const pin = world.querySelector(`.svg-pin[data-slug="${slug}"]`)
    if (pin) pin.classList.add('selected')
    if (!lock) {
      const glow = world.querySelector(`.svg-road-glow[data-slug="${slug}"]`)
      if (glow) { glow.classList.add('active'); glow.style.opacity = '' }
    }

    popup.open(slug, sk, d, lock)
    if (!lock) daniel.walkToward(slug)

    // Lets listeners (e.g. the first-time guide) react to a Super Skill tap
    document.dispatchEvent(new CustomEvent('bt:district-selected', { detail: { slug } }))
  }

  // Tapping the Town Square isn't a menu — Daniel just strolls home.
  function selectHub() {
    clearSelection()
    popup.close()
    daniel.walkHome()
  }

  // "Show me a good first stop" from the first-time guide: open the
  // suggested next district. Re-init safe — the previous handler is
  // removed so stale closures never fire.
  if (container._btShowNextHandler) container.removeEventListener('bt:show-next', container._btShowNextHandler)
  container._btShowNextHandler = () => {
    if (nextSlug && DISTRICTS[nextSlug]) selectDistrict(nextSlug)
    else selectHub()
  }
  container.addEventListener('bt:show-next', container._btShowNextHandler)

  // Hovering a district's hit area lights up its building + pin
  function setHover(slug, on) {
    const b = world.querySelector(`.svg-building[data-slug="${slug}"]`)
    const p = world.querySelector(`.svg-pin[data-slug="${slug}"]`)
    if (b) b.classList.toggle('hover', on)
    if (p) p.classList.toggle('hover', on)
  }
  world.addEventListener('pointerover', e => {
    const el = e.target.closest('.district-hit-area')
    if (el && el.dataset.slug) setHover(el.dataset.slug, true)
  })
  world.addEventListener('pointerout', e => {
    const el = e.target.closest('.district-hit-area')
    if (el && el.dataset.slug) setHover(el.dataset.slug, false)
  })

  // Click (skip if the pointer was dragging the map)
  world.addEventListener('click', e => {
    if (vp.dataset.wasDragging === '1') return
    const el = e.target.closest('.svg-pin,.svg-building,.district-hit-area,.hub-hit-area')
    if (!el) return
    if (el.classList.contains('hub-hit-area')) { selectHub(); return }
    const slug = el.dataset.slug
    if (slug) selectDistrict(slug)
  })

  // Keyboard
  world.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const el = e.target.closest('.svg-pin,.svg-building,.district-hit-area,.hub-hit-area')
    if (!el) return
    e.preventDefault()
    if (el.classList.contains('hub-hit-area')) { selectHub(); return }
    if (el.dataset.slug) selectDistrict(el.dataset.slug)
  })
}
