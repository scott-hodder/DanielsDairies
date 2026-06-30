// ================================================
// BRAIN TOWN SVG MAP — Immersive World
//
// Structure:
//   1. Config (world, districts, roads, props)
//   2. SVG Prop Renderers (themed district props)
//   3. SVG Building Renderers (landmark per district)
//   4. District Renderer (ground zone + building + props)
//   5. Town Square Renderer
//   6. World Decorations (trees, bushes, flowers, etc.)
//   7. Sky Layer (clouds, birds)
//   8. Road Renderer (with glow states)
//   9. SVG Content Builder (assembles everything)
//  10. Pan/Zoom (with bounds clamping)
//  11. Daniel Character (idle + walk-toward)
//  12. Detail Drawer (side drawer / bottom sheet)
//  13. Injected Styles
//  14. Public API (initSvgMap)
// ================================================

import { getSuperSkills } from '../../services/databaseService.js'

/* ─────────────────────────────────────────────
   1. CONFIG
   ───────────────────────────────────────────── */

const W = 2400, H = 1800
const CX = 1200, CY = 900 // Town Square centre

const DISTRICTS = {
  'brain-builder': {
    x: 380, y: 320, label: 'Brain Builder', color: '#6366F1', accent: '#4338CA',
    district: 'Knowledge Quarter', emoji: '\u{1F9E0}',
    zoneColor: '#DAD0F2', zoneRx: 310, zoneRy: 260,
    desc: 'Master your mind through understanding how your brain works!',
  },
  'thought-driver': {
    x: 260, y: 920, label: 'Thought Driver', color: '#8B5CF6', accent: '#6D28D9',
    district: 'Thinking Lane', emoji: '\u{1F9E9}',
    zoneColor: '#E0D4F5', zoneRx: 300, zoneRy: 260,
    desc: 'Take control of your thoughts and steer them in positive directions!',
  },
  'emotion-navigator': {
    x: 2000, y: 920, label: 'Emotion Navigator', color: '#EC4899', accent: '#BE185D',
    district: 'Feelings Garden', emoji: '\u{1F49B}',
    zoneColor: '#FCE4EC', zoneRx: 310, zoneRy: 270,
    desc: 'Navigate through all emotions with confidence and skill!',
  },
  'behaviour-engineer': {
    x: 1200, y: 240, label: 'Behaviour Engineer', color: '#F59E0B', accent: '#D97706',
    district: 'Action Alley', emoji: '\u26A1',
    zoneColor: '#FFF3D0', zoneRx: 310, zoneRy: 250,
    desc: 'Build powerful habits and take charge of your actions!',
  },
  'resilience-architect': {
    x: 440, y: 1440, label: 'Resilience Architect', color: '#40916c', accent: '#2D6A4F',
    district: 'Strength Summit', emoji: '\u{1F6E1}\uFE0F',
    zoneColor: '#D5ECD8', zoneRx: 310, zoneRy: 260,
    desc: 'Build inner strength and bounce back from challenges!',
  },
  'social-mapper': {
    x: 1960, y: 350, label: 'Social Mapper', color: '#E05297', accent: '#BE185D',
    district: 'Friendship Park', emoji: '\u{1F91D}',
    zoneColor: '#FCE4EC', zoneRx: 310, zoneRy: 260,
    desc: 'Map your social world and build stronger connections!',
  },
  'future-designer': {
    x: 1580, y: 1460, label: 'Future Designer', color: '#0EA5E9', accent: '#0284C7',
    district: 'Dream Harbour', emoji: '\u{1F52E}',
    zoneColor: '#D6EEFB', zoneRx: 310, zoneRy: 260,
    desc: 'Design your future with imagination and planning!',
  },
}

const ROAD_PATHS = {
  'brain-builder':        `M${CX},${CY} C1050,820 720,560 520,420 Q450,360 380,320`,
  'thought-driver':       `M${CX},${CY} C1000,920 680,930 460,925 Q350,920 260,920`,
  'emotion-navigator':    `M${CX},${CY} C1450,905 1680,910 1840,915 Q1920,918 2000,920`,
  'behaviour-engineer':   `M${CX},${CY} C1200,740 1205,530 1205,380 Q1202,300 1200,240`,
  'resilience-architect': `M${CX},${CY} C1030,1030 780,1200 610,1320 Q520,1380 440,1440`,
  'social-mapper':        `M${CX},${CY} C1400,770 1600,560 1770,440 Q1870,390 1960,350`,
  'future-designer':      `M${CX},${CY} C1280,1060 1380,1220 1470,1350 Q1530,1410 1580,1460`,
}

/* ─────────────────────────────────────────────
   2. SVG PROP RENDERERS
   Small themed items placed around each district.
   ───────────────────────────────────────────── */

const prop = {
  // ── Brain Builder props ──
  bookStack(x, y) {
    return `<g transform="translate(${x},${y})">
      <rect x="-14" y="-4" width="28" height="7" rx="1" fill="#4338CA"/>
      <rect x="-16" y="-12" width="32" height="7" rx="1" fill="#F59E0B"/>
      <rect x="-12" y="-18" width="24" height="6" rx="1" fill="#EC4899"/>
      <rect x="-15" y="-25" width="30" height="6" rx="1" fill="#40916c"/>
    </g>`
  },
  globe(x, y) {
    return `<g transform="translate(${x},${y})">
      <rect x="-3" y="0" width="6" height="14" rx="1" fill="#888"/>
      <rect x="-8" y="12" width="16" height="4" rx="2" fill="#666"/>
      <circle cx="0" cy="-8" r="14" fill="#5BB8E8" stroke="#3A9BD5" stroke-width="1.5"/>
      <ellipse cx="0" cy="-8" rx="14" ry="6" fill="none" stroke="#3A9BD5" stroke-width="0.8" opacity="0.5"/>
      <path d="M-4,-22 Q0,-18 4,-22 Q6,-14 4,6 Q0,2 -4,6 Q-6,-14 -4,-22" fill="#4CAF50" opacity="0.4"/>
    </g>`
  },
  chalkboard(x, y) {
    return `<g transform="translate(${x},${y})">
      <rect x="-20" y="-24" width="40" height="30" rx="2" fill="#2D5016" stroke="#1B3A0E" stroke-width="1.5"/>
      <text x="0" y="-8" text-anchor="middle" font-size="8" fill="#C8E6C9" font-weight="700" font-family="sans-serif">ABC</text>
      <text x="0" y="1" text-anchor="middle" font-size="7" fill="#A5D6A7" font-family="sans-serif">1+2=3</text>
      <rect x="-3" y="6" width="6" height="18" rx="1" fill="#8B6914"/>
    </g>`
  },
  magnifier(x, y) {
    return `<g transform="translate(${x},${y})">
      <circle cx="0" cy="-6" r="10" fill="none" stroke="#6366F1" stroke-width="2.5"/>
      <circle cx="0" cy="-6" r="7" fill="#E8F4FD" opacity="0.4"/>
      <line x1="7" y1="1" x2="14" y2="10" stroke="#6366F1" stroke-width="2.5" stroke-linecap="round"/>
    </g>`
  },

  // ── Thought Driver props ──
  signpost(x, y) {
    return `<g transform="translate(${x},${y})">
      <rect x="-3" y="-40" width="6" height="52" rx="1" fill="#8B6914" stroke="#6B4D10" stroke-width="1"/>
      <polygon points="-30,-38 30,-38 30,-26 36,-32 30,-26 -30,-26" fill="#F5E6C8" stroke="#C9A96E" stroke-width="1"/>
      <text x="0" y="-29" text-anchor="middle" font-size="7" fill="#16324f" font-weight="700">THINK</text>
      <polygon points="-28,-22 28,-22 28,-10 -34,-16 28,-10 -28,-10" fill="#D4E8FF" stroke="#7BA7C2" stroke-width="1"/>
      <text x="0" y="-13" text-anchor="middle" font-size="7" fill="#16324f" font-weight="700">PLAN</text>
    </g>`
  },
  trafficLight(x, y) {
    return `<g transform="translate(${x},${y})">
      <rect x="-3" y="-2" width="6" height="30" rx="1" fill="#555"/>
      <rect x="-8" y="-36" width="16" height="36" rx="3" fill="#333" stroke="#222" stroke-width="1"/>
      <circle cx="0" cy="-27" r="4.5" fill="#EF4444"/>
      <circle cx="0" cy="-17" r="4.5" fill="#F59E0B"/>
      <circle cx="0" cy="-7" r="4.5" fill="#22C55E"/>
    </g>`
  },
  thoughtBubble(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse cx="0" cy="-14" rx="22" ry="14" fill="#fff" stroke="#8B5CF6" stroke-width="1.5" opacity="0.85"/>
      <circle cx="-8" cy="3" r="4" fill="#fff" stroke="#8B5CF6" stroke-width="1" opacity="0.7"/>
      <circle cx="-12" cy="10" r="2.5" fill="#fff" stroke="#8B5CF6" stroke-width="1" opacity="0.5"/>
      <text x="0" y="-10" text-anchor="middle" font-size="9" fill="#8B5CF6" font-weight="700">?!</text>
    </g>`
  },

  // ── Emotion Navigator props ──
  emotionStone(x, y, face, color) {
    return `<g transform="translate(${x},${y})">
      <ellipse cx="0" cy="0" rx="14" ry="12" fill="${color}" stroke="${color}" stroke-width="1" opacity="0.8"/>
      <text x="0" y="5" text-anchor="middle" font-size="14">${face}</text>
    </g>`
  },
  feelingMeter(x, y) {
    return `<g transform="translate(${x},${y})">
      <rect x="-6" y="-30" width="12" height="40" rx="4" fill="#fff" stroke="#EC4899" stroke-width="1.5"/>
      <rect x="-4" y="-10" width="8" height="18" rx="2" fill="linear-gradient(#EF4444,#22C55E)"/>
      <rect x="-4" y="-10" width="8" height="6" rx="2" fill="#EF4444" opacity="0.7"/>
      <rect x="-4" y="-4" width="8" height="6" rx="0" fill="#F59E0B" opacity="0.7"/>
      <rect x="-4" y="2" width="8" height="6" rx="2" fill="#22C55E" opacity="0.7"/>
      <circle cx="0" cy="-24" r="4" fill="#EC4899"/>
    </g>`
  },
  heartFlower(x, y) {
    return `<g transform="translate(${x},${y})">
      <line x1="0" y1="0" x2="0" y2="12" stroke="#4CAF50" stroke-width="1.5"/>
      <path d="M0,-5 C-6,-12 -14,-6 -8,0 Z" fill="#EC4899"/>
      <path d="M0,-5 C6,-12 14,-6 8,0 Z" fill="#EC4899"/>
    </g>`
  },

  // ── Behaviour Engineer props ──
  workbench(x, y) {
    return `<g transform="translate(${x},${y})">
      <rect x="-24" y="-4" width="48" height="6" rx="1" fill="#A0764E" stroke="#8B6914" stroke-width="1"/>
      <rect x="-20" y="2" width="4" height="14" fill="#8B6914"/>
      <rect x="16" y="2" width="4" height="14" fill="#8B6914"/>
      <rect x="-14" y="-8" width="8" height="4" rx="1" fill="#78909C"/>
      <rect x="2" y="-10" width="4" height="6" rx="0.5" fill="#F59E0B"/>
      <circle cx="14" cy="-6" r="3" fill="none" stroke="#78909C" stroke-width="1.5"/>
    </g>`
  },
  gearPair(x, y) {
    return `<g transform="translate(${x},${y})">
      <circle cx="-8" cy="0" r="12" fill="none" stroke="#F59E0B" stroke-width="2.5" stroke-dasharray="6 4" opacity="0.7">
        <animateTransform attributeName="transform" type="rotate" values="0 -8 0;360 -8 0" dur="15s" repeatCount="indefinite"/>
      </circle>
      <circle cx="10" cy="4" r="9" fill="none" stroke="#D97706" stroke-width="2" stroke-dasharray="5 3.5" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" values="360 10 4;0 10 4" dur="12s" repeatCount="indefinite"/>
      </circle>
      <circle cx="-8" cy="0" r="3" fill="#F59E0B" opacity="0.5"/>
      <circle cx="10" cy="4" r="2.5" fill="#D97706" opacity="0.5"/>
    </g>`
  },
  hardHat(x, y) {
    return `<g transform="translate(${x},${y})">
      <rect x="-5" y="2" width="10" height="14" rx="1" fill="#8B6914"/>
      <ellipse cx="0" cy="0" rx="14" ry="8" fill="#F59E0B"/>
      <ellipse cx="0" cy="-2" rx="12" ry="6" fill="#FBBF24"/>
      <rect x="-16" y="-1" width="32" height="3" rx="1" fill="#D97706"/>
    </g>`
  },

  // ── Resilience Architect props ──
  brickPile(x, y) {
    return `<g transform="translate(${x},${y})">
      <rect x="-16" y="-2" width="14" height="8" rx="1" fill="#C0392B"/>
      <rect x="2" y="-2" width="14" height="8" rx="1" fill="#E74C3C"/>
      <rect x="-10" y="-10" width="14" height="8" rx="1" fill="#C0392B"/>
      <rect x="6" y="-10" width="10" height="8" rx="1" fill="#E74C3C" opacity="0.8"/>
      <rect x="-4" y="-16" width="12" height="6" rx="1" fill="#C0392B" opacity="0.9"/>
    </g>`
  },
  shieldStand(x, y) {
    return `<g transform="translate(${x},${y})">
      <line x1="-8" y1="14" x2="8" y2="14" stroke="#8B6914" stroke-width="2"/>
      <rect x="-2" y="-10" width="4" height="24" rx="1" fill="#8B6914"/>
      <path d="M0,-26 L-12,-16 L-12,-4 Q0,8 0,8 Q0,8 12,-4 L12,-16 Z" fill="#40916c" stroke="#2D6A4F" stroke-width="1.5"/>
      <text x="0" y="-6" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">R</text>
    </g>`
  },
  scaffolding(x, y) {
    return `<g transform="translate(${x},${y})">
      <line x1="-14" y1="10" x2="-14" y2="-30" stroke="#F59E0B" stroke-width="2.5"/>
      <line x1="14" y1="10" x2="14" y2="-30" stroke="#F59E0B" stroke-width="2.5"/>
      <line x1="-14" y1="-8" x2="14" y2="-8" stroke="#D97706" stroke-width="2"/>
      <line x1="-14" y1="-20" x2="14" y2="-20" stroke="#D97706" stroke-width="2"/>
      <rect x="-12" y="-8" width="24" height="4" rx="0.5" fill="#A0764E" opacity="0.6"/>
    </g>`
  },

  // ── Social Mapper props ──
  picnicTable(x, y) {
    return `<g transform="translate(${x},${y})">
      <rect x="-22" y="-4" width="44" height="5" rx="1" fill="#A0764E" stroke="#8B6914" stroke-width="1"/>
      <line x1="-18" y1="1" x2="-24" y2="14" stroke="#8B6914" stroke-width="2.5"/>
      <line x1="18" y1="1" x2="24" y2="14" stroke="#8B6914" stroke-width="2.5"/>
      <rect x="-28" y="5" width="14" height="4" rx="1" fill="#8B6914"/>
      <rect x="14" y="5" width="14" height="4" rx="1" fill="#8B6914"/>
    </g>`
  },
  friendshipBanner(x, y) {
    return `<g transform="translate(${x},${y})">
      <line x1="-20" y1="-30" x2="-20" y2="4" stroke="#8B6914" stroke-width="2"/>
      <line x1="20" y1="-30" x2="20" y2="4" stroke="#8B6914" stroke-width="2"/>
      <rect x="-18" y="-28" width="36" height="16" rx="2" fill="#FCE4EC" stroke="#EC4899" stroke-width="1"/>
      <text x="0" y="-17" text-anchor="middle" font-size="7" fill="#BE185D" font-weight="700">FRIENDS</text>
      <path d="M-18,-12 L-14,-8 L-10,-12 L-6,-8 L-2,-12 L2,-8 L6,-12 L10,-8 L14,-12 L18,-8" fill="none" stroke="#EC4899" stroke-width="1.2" opacity="0.5"/>
    </g>`
  },
  swingSet(x, y) {
    return `<g transform="translate(${x},${y})">
      <line x1="-20" y1="-36" x2="-26" y2="4" stroke="#78909C" stroke-width="2.5"/>
      <line x1="20" y1="-36" x2="26" y2="4" stroke="#78909C" stroke-width="2.5"/>
      <line x1="-20" y1="-36" x2="20" y2="-36" stroke="#78909C" stroke-width="3"/>
      <line x1="-6" y1="-36" x2="-8" y2="-6" stroke="#999" stroke-width="1.5"/>
      <line x1="6" y1="-36" x2="8" y2="-6" stroke="#999" stroke-width="1.5"/>
      <rect x="-12" y="-6" width="8" height="3" rx="1" fill="#EC4899"/>
      <rect x="4" y="-8" width="8" height="3" rx="1" fill="#8B5CF6"/>
    </g>`
  },

  // ── Future Designer props ──
  telescope(x, y) {
    return `<g transform="translate(${x},${y})">
      <line x1="-10" y1="8" x2="0" y2="-12" stroke="#666" stroke-width="2"/>
      <line x1="10" y1="8" x2="0" y2="-12" stroke="#666" stroke-width="2"/>
      <line x1="0" y1="-12" x2="16" y2="-26" stroke="#444" stroke-width="3" stroke-linecap="round"/>
      <circle cx="18" cy="-28" r="5" fill="#0C4A6E" stroke="#0EA5E9" stroke-width="1.5"/>
    </g>`
  },
  starMap(x, y) {
    return `<g transform="translate(${x},${y})">
      <rect x="-18" y="-14" width="36" height="28" rx="3" fill="#0C2340" stroke="#0EA5E9" stroke-width="1.5"/>
      <circle cx="-6" cy="-5" r="1.5" fill="#FFD700" class="bt-twinkle"/>
      <circle cx="8" cy="-8" r="1" fill="#FFD700" class="bt-twinkle-d"/>
      <circle cx="3" cy="2" r="1.5" fill="#FFD700" class="bt-twinkle"/>
      <circle cx="-10" cy="5" r="1" fill="#FFD700" class="bt-twinkle-d"/>
      <circle cx="12" cy="4" r="1.5" fill="#FFD700" class="bt-twinkle"/>
      <line x1="-6" y1="-5" x2="3" y2="2" stroke="#4FC3F7" stroke-width="0.5" opacity="0.4"/>
      <line x1="3" y1="2" x2="8" y2="-8" stroke="#4FC3F7" stroke-width="0.5" opacity="0.4"/>
    </g>`
  },
  crystalBall(x, y) {
    return `<g transform="translate(${x},${y})">
      <ellipse cx="0" cy="6" rx="12" ry="4" fill="#8B6914"/>
      <circle cx="0" cy="-6" r="12" fill="#E3F2FD" stroke="#90CAF9" stroke-width="1.5" opacity="0.8"/>
      <circle cx="0" cy="-6" r="8" fill="#BBDEFB" opacity="0.3"/>
      <circle cx="-3" cy="-10" r="3" fill="#fff" opacity="0.3"/>
    </g>`
  },
}

// Which props to place in each district (dx/dy relative to district centre)
const DISTRICT_PROPS = {
  'brain-builder': [
    { fn: 'bookStack', dx: -130, dy: 50 },
    { fn: 'globe', dx: 120, dy: -30 },
    { fn: 'chalkboard', dx: -100, dy: -100 },
    { fn: 'magnifier', dx: 140, dy: 80 },
    { fn: 'bookStack', dx: 80, dy: 110 },
    { fn: 'magnifier', dx: -150, dy: -30 },
  ],
  'thought-driver': [
    { fn: 'signpost', dx: -120, dy: -40 },
    { fn: 'trafficLight', dx: 120, dy: 50 },
    { fn: 'thoughtBubble', dx: 70, dy: -100 },
    { fn: 'signpost', dx: 140, dy: -60 },
    { fn: 'trafficLight', dx: -80, dy: 90 },
  ],
  'emotion-navigator': [
    { fn: 'emotionStone', dx: -130, dy: 70, args: ['\u{1F60A}', '#FFE082'] },
    { fn: 'emotionStone', dx: -90, dy: 100, args: ['\u{1F622}', '#90CAF9'] },
    { fn: 'emotionStone', dx: 120, dy: 90, args: ['\u{1F621}', '#EF9A9A'] },
    { fn: 'emotionStone', dx: 80, dy: -90, args: ['\u{1F60D}', '#C8E6C9'] },
    { fn: 'feelingMeter', dx: 150, dy: -40 },
    { fn: 'heartFlower', dx: -70, dy: 110 },
    { fn: 'heartFlower', dx: -45, dy: 118 },
    { fn: 'heartFlower', dx: -20, dy: 112 },
    { fn: 'heartFlower', dx: 40, dy: 115 },
  ],
  'behaviour-engineer': [
    { fn: 'workbench', dx: -120, dy: 60 },
    { fn: 'gearPair', dx: 130, dy: -30 },
    { fn: 'hardHat', dx: -70, dy: -90 },
    { fn: 'gearPair', dx: -140, dy: -20 },
    { fn: 'workbench', dx: 90, dy: 90 },
  ],
  'resilience-architect': [
    { fn: 'brickPile', dx: -130, dy: 70 },
    { fn: 'shieldStand', dx: 140, dy: -40 },
    { fn: 'scaffolding', dx: 100, dy: 80 },
    { fn: 'brickPile', dx: 60, dy: -100 },
    { fn: 'shieldStand', dx: -100, dy: -60 },
  ],
  'social-mapper': [
    { fn: 'picnicTable', dx: -130, dy: 70 },
    { fn: 'friendshipBanner', dx: 120, dy: -50 },
    { fn: 'swingSet', dx: 60, dy: 100 },
    { fn: 'picnicTable', dx: 80, dy: -90 },
    { fn: 'swingSet', dx: -80, dy: 110 },
  ],
  'future-designer': [
    { fn: 'telescope', dx: -120, dy: -40 },
    { fn: 'starMap', dx: 130, dy: 60 },
    { fn: 'crystalBall', dx: -60, dy: 90 },
    { fn: 'telescope', dx: 100, dy: -80 },
    { fn: 'crystalBall', dx: -130, dy: 30 },
  ],
}

/* ─────────────────────────────────────────────
   3. BUILDING RENDERERS
   Each district's main landmark. Drawn larger.
   ───────────────────────────────────────────── */

function bldSchool(x, y, c) {
  return `<g transform="translate(${x-85},${y-80})">
    <rect x="5" y="55" width="160" height="90" rx="5" fill="#F5E6C8" stroke="#C9A96E" stroke-width="2.5"/>
    <polygon points="85,0 175,60 -5,60" fill="${c}" stroke="#4338CA" stroke-width="2"/>
    <rect x="70" y="-20" width="30" height="25" rx="3" fill="#E8D5B0" stroke="#C9A96E" stroke-width="1.5"/>
    <polygon points="85,-32 100,-18 70,-18" fill="${c}"/>
    <circle cx="85" cy="-8" r="6" fill="#FFD700" stroke="#DAA520" stroke-width="1"/>
    <rect x="18" y="75" width="26" height="32" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1.5"/>
    <line x1="31" y1="75" x2="31" y2="107" stroke="#7BA7C2" stroke-width="1"/>
    <line x1="18" y1="91" x2="44" y2="91" stroke="#7BA7C2" stroke-width="1"/>
    <rect x="120" y="75" width="26" height="32" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1.5"/>
    <line x1="133" y1="75" x2="133" y2="107" stroke="#7BA7C2" stroke-width="1"/>
    <line x1="120" y1="91" x2="146" y2="91" stroke="#7BA7C2" stroke-width="1"/>
    <rect x="62" y="92" width="42" height="53" rx="3" fill="#8B5E3C" stroke="#6B4226" stroke-width="1.5"/>
    <rect x="64" y="94" width="18" height="22" rx="1" fill="#A0724E"/>
    <rect x="84" y="94" width="18" height="22" rx="1" fill="#A0724E"/>
    <circle cx="80" cy="118" r="3" fill="#DAA520"/>
    <rect x="54" y="143" width="58" height="6" rx="2" fill="#D4C4A8"/>
    <rect x="48" y="147" width="70" height="6" rx="2" fill="#C4B498"/>
    <line x1="85" y1="-32" x2="85" y2="-50" stroke="#888" stroke-width="2"/>
    <polygon points="85,-50 104,-43 85,-36" fill="#FF6B6B" opacity="0.8">
      <animateTransform attributeName="transform" type="rotate" values="0 85 -43;4 85 -43;0 85 -43;-3 85 -43;0 85 -43" dur="3s" repeatCount="indefinite"/>
    </polygon>
  </g>`
}

function bldLibrary(x, y, c) {
  return `<g transform="translate(${x-80},${y-70})">
    <rect x="0" y="42" width="160" height="85" rx="4" fill="#D4C4A8" stroke="#A89070" stroke-width="2.5"/>
    <rect x="14" y="42" width="10" height="85" rx="2" fill="#E8D5B0"/>
    <rect x="42" y="42" width="10" height="85" rx="2" fill="#E8D5B0"/>
    <rect x="108" y="42" width="10" height="85" rx="2" fill="#E8D5B0"/>
    <rect x="136" y="42" width="10" height="85" rx="2" fill="#E8D5B0"/>
    <rect x="-8" y="34" width="176" height="14" rx="2" fill="${c}" stroke="#5B21B6" stroke-width="1.5"/>
    <polygon points="80,0 172,38 -12,38" fill="#C4A882" stroke="#A89070" stroke-width="2"/>
    <circle cx="80" cy="18" r="10" fill="${c}" opacity="0.4"/>
    <text x="80" y="22" text-anchor="middle" font-size="12" fill="#fff" font-weight="700" font-family="Fredoka,sans-serif">T</text>
    <rect x="22" y="60" width="18" height="26" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1"/>
    <rect x="58" y="60" width="18" height="26" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1"/>
    <rect x="84" y="60" width="18" height="26" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1"/>
    <rect x="120" y="60" width="18" height="26" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1"/>
    <rect x="55" y="90" width="50" height="37" rx="4" fill="#6B4226" stroke="#4A2C17" stroke-width="1.5"/>
    <rect x="55" y="90" width="50" height="12" rx="4" fill="#7B5236"/>
  </g>`
}

function bldCottage(x, y, c) {
  return `<g transform="translate(${x-70},${y-70})">
    <rect x="10" y="50" width="120" height="72" rx="5" fill="#F0E0C8" stroke="#C4A882" stroke-width="2.5"/>
    <polygon points="70,4 140,54 0,54" fill="${c}" stroke="#DC2626" stroke-width="2"/>
    <rect x="105" y="14" width="16" height="42" rx="3" fill="#A0522D" stroke="#8B4513" stroke-width="1.5"/>
    <rect x="101" y="11" width="24" height="6" rx="1.5" fill="#8B4513"/>
    <g class="bt-smoke"><circle cx="113" cy="4" r="5" fill="#D0D0D0" opacity="0.35">
      <animate attributeName="cy" values="4;-20;-44" dur="5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.35;0.15;0" dur="5s" repeatCount="indefinite"/>
      <animate attributeName="r" values="5;9;14" dur="5s" repeatCount="indefinite"/>
    </circle></g>
    <rect x="24" y="65" width="26" height="24" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1.5"/>
    <line x1="37" y1="65" x2="37" y2="89" stroke="#7BA7C2" stroke-width="1"/>
    <line x1="24" y1="77" x2="50" y2="77" stroke="#7BA7C2" stroke-width="1"/>
    <rect x="90" y="65" width="26" height="24" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1.5"/>
    <line x1="103" y1="65" x2="103" y2="89" stroke="#7BA7C2" stroke-width="1"/>
    <line x1="90" y1="77" x2="116" y2="77" stroke="#7BA7C2" stroke-width="1"/>
    <rect x="54" y="82" width="32" height="40" rx="4" fill="#8B5E3C" stroke="#6B4226" stroke-width="1.5"/>
    <circle cx="78" cy="102" r="3" fill="#DAA520"/>
    <circle cx="70" cy="72" r="7" fill="none" stroke="#4CAF50" stroke-width="1.5"/>
    <text x="70" y="76" text-anchor="middle" font-size="9" fill="#FF6B6B">\u2665</text>
    <rect x="18" y="120" width="36" height="7" rx="2" fill="#8B6914"/>
    <circle cx="28" cy="118" r="4" fill="#FF6B6B"/><circle cx="38" cy="117" r="4" fill="#FFB74D"/><circle cx="48" cy="118" r="4" fill="#BA68C8"/>
  </g>`
}

function bldWorkshop(x, y, c) {
  return `<g transform="translate(${x-80},${y-65})">
    <rect x="0" y="42" width="160" height="85" rx="5" fill="#FFF5E6" stroke="#E8C9A0" stroke-width="2.5"/>
    <polygon points="0,42 55,6 55,42" fill="${c}" stroke="#D97706" stroke-width="1.5"/>
    <polygon points="55,42 110,6 110,42" fill="${c}" stroke="#D97706" stroke-width="1.5" opacity="0.9"/>
    <polygon points="110,42 160,18 160,42" fill="${c}" stroke="#D97706" stroke-width="1.5" opacity="0.8"/>
    <rect x="24" y="18" width="14" height="16" rx="1.5" fill="#B8D4E3" opacity="0.6"/>
    <rect x="76" y="18" width="14" height="16" rx="1.5" fill="#B8D4E3" opacity="0.6"/>
    <rect x="12" y="60" width="60" height="67" rx="4" fill="#D4B888" stroke="#B89860" stroke-width="1.5"/>
    <line x1="12" y1="76" x2="72" y2="76" stroke="#B89860" stroke-width="1"/>
    <line x1="12" y1="92" x2="72" y2="92" stroke="#B89860" stroke-width="1"/>
    <line x1="12" y1="108" x2="72" y2="108" stroke="#B89860" stroke-width="1"/>
    <rect x="96" y="65" width="36" height="28" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1.5"/>
    <line x1="114" y1="65" x2="114" y2="93" stroke="#7BA7C2" stroke-width="1"/>
    <rect x="102" y="100" width="26" height="27" rx="2" fill="#8B5E3C" stroke="#6B4226" stroke-width="1"/>
    <circle cx="42" cy="52" r="8" fill="none" stroke="#D97706" stroke-width="2.5" opacity="0.4">
      <animateTransform attributeName="transform" type="rotate" values="0 42 52;360 42 52" dur="14s" repeatCount="indefinite"/>
    </circle>
  </g>`
}

function bldFortress(x, y, c) {
  return `<g transform="translate(${x-80},${y-80})">
    <rect x="18" y="48" width="124" height="80" rx="3" fill="${c}" stroke="#2D6A4F" stroke-width="2.5"/>
    <rect x="0" y="24" width="36" height="104" rx="3" fill="#358560" stroke="#2D6A4F" stroke-width="2"/>
    <rect x="-3" y="18" width="42" height="10" rx="2" fill="#2D6A4F"/>
    <rect x="0" y="12" width="7" height="10" fill="#2D6A4F"/><rect x="14" y="12" width="7" height="10" fill="#2D6A4F"/><rect x="28" y="12" width="7" height="10" fill="#2D6A4F"/>
    <rect x="124" y="24" width="36" height="104" rx="3" fill="#358560" stroke="#2D6A4F" stroke-width="2"/>
    <rect x="121" y="18" width="42" height="10" rx="2" fill="#2D6A4F"/>
    <rect x="124" y="12" width="7" height="10" fill="#2D6A4F"/><rect x="138" y="12" width="7" height="10" fill="#2D6A4F"/><rect x="152" y="12" width="7" height="10" fill="#2D6A4F"/>
    <rect x="30" y="42" width="7" height="10" fill="#2D6A4F"/><rect x="50" y="42" width="7" height="10" fill="#2D6A4F"/><rect x="70" y="42" width="7" height="10" fill="#2D6A4F"/><rect x="90" y="42" width="7" height="10" fill="#2D6A4F"/><rect x="110" y="42" width="7" height="10" fill="#2D6A4F"/>
    <path d="M55,128 L55,85 Q80,68 105,85 L105,128 Z" fill="#4A2C17" stroke="#3A1F10" stroke-width="1.5"/>
    <line x1="80" y1="85" x2="80" y2="128" stroke="#3A1F10" stroke-width="1.5"/>
    <rect x="10" y="48" width="16" height="18" rx="1.5" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1"/>
    <rect x="134" y="48" width="16" height="18" rx="1.5" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1"/>
    <circle cx="80" cy="70" r="10" fill="#F5E6C8" stroke="#DAA520" stroke-width="1.5"/>
    <text x="80" y="74" text-anchor="middle" font-size="12" fill="#2D6A4F" font-weight="700">R</text>
    <line x1="18" y1="24" x2="18" y2="6" stroke="#888" stroke-width="1.5"/>
    <polygon points="18,6 34,12 18,18" fill="${c}" opacity="0.8">
      <animateTransform attributeName="transform" type="rotate" values="0 18 12;5 18 12;0 18 12;-3 18 12;0 18 12" dur="4s" repeatCount="indefinite"/>
    </polygon>
  </g>`
}

function bldTreehouse(x, y, c) {
  return `<g transform="translate(${x-75},${y-90})">
    <rect x="60" y="60" width="30" height="100" rx="5" fill="#8B6914" stroke="#6B4D10" stroke-width="2"/>
    <rect x="52" y="84" width="46" height="12" rx="4" fill="#7A5C12"/>
    <circle cx="75" cy="20" r="50" fill="#2E7D32" opacity="0.35"/>
    <circle cx="38" cy="35" r="38" fill="#388E3C" opacity="0.35"/>
    <circle cx="112" cy="35" r="38" fill="#388E3C" opacity="0.35"/>
    <rect x="8" y="58" width="134" height="10" rx="3" fill="#A0764E" stroke="#8B6914" stroke-width="1.5"/>
    <rect x="16" y="16" width="118" height="44" rx="4" fill="#FFE4C4" stroke="#D4A87C" stroke-width="2"/>
    <polygon points="75,-10 142,18 8,18" fill="${c}" stroke="#BE185D" stroke-width="1.5"/>
    <rect x="28" y="28" width="20" height="20" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1"/>
    <rect x="102" y="28" width="20" height="20" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1"/>
    <rect x="62" y="34" width="26" height="26" rx="3" fill="#8B5E3C" stroke="#6B4226" stroke-width="1"/>
    <line x1="38" y1="68" x2="26" y2="148" stroke="#A0764E" stroke-width="3"/>
    <line x1="50" y1="68" x2="38" y2="148" stroke="#A0764E" stroke-width="3"/>
    <line x1="39" y1="80" x2="49" y2="80" stroke="#A0764E" stroke-width="2"/>
    <line x1="37" y1="96" x2="47" y2="96" stroke="#A0764E" stroke-width="2"/>
    <line x1="34" y1="112" x2="44" y2="112" stroke="#A0764E" stroke-width="2"/>
    <line x1="32" y1="128" x2="42" y2="128" stroke="#A0764E" stroke-width="2"/>
    <path d="M18,16 Q48,4 75,10 Q102,4 132,16" fill="none" stroke="#FFD700" stroke-width="1.2" opacity="0.5"/>
    <circle cx="38" cy="8" r="3" fill="#FFD700" opacity="0.7" class="bt-twinkle"/><circle cx="70" cy="6" r="3" fill="#FF6B6B" opacity="0.7" class="bt-twinkle-d"/><circle cx="100" cy="8" r="3" fill="#4FC3F7" opacity="0.7" class="bt-twinkle"/>
    <circle cx="75" cy="-8" r="42" fill="#1B5E20"><animate attributeName="r" values="42;43.5;42" dur="6s" repeatCount="indefinite"/></circle>
    <circle cx="38" cy="8" r="32" fill="#2E7D32"><animate attributeName="r" values="32;33;32" dur="7s" repeatCount="indefinite"/></circle>
    <circle cx="112" cy="8" r="32" fill="#2E7D32"><animate attributeName="r" values="32;33.5;32" dur="5s" repeatCount="indefinite"/></circle>
  </g>`
}

function bldObservatory(x, y, c) {
  return `<g transform="translate(${x-70},${y-80})">
    <rect x="12" y="60" width="116" height="68" rx="5" fill="#E8E0F0" stroke="#B8A0D0" stroke-width="2.5"/>
    <ellipse cx="70" cy="60" rx="62" ry="36" fill="${c}" stroke="#0284C7" stroke-width="2"/>
    <ellipse cx="70" cy="60" rx="52" ry="28" fill="#0EA5E9" opacity="0.25"/>
    <rect x="66" y="26" width="8" height="32" rx="1.5" fill="#0C4A6E"/>
    <line x1="70" y1="42" x2="95" y2="18" stroke="#555" stroke-width="3.5" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" values="-6 70 42;6 70 42;-6 70 42" dur="12s" repeatCount="indefinite"/>
    </line>
    <circle cx="95" cy="18" r="6" fill="#0C4A6E" stroke="#555" stroke-width="1.5">
      <animateTransform attributeName="transform" type="rotate" values="-6 70 42;6 70 42;-6 70 42" dur="12s" repeatCount="indefinite"/>
    </circle>
    <rect x="28" y="76" width="22" height="26" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1.5"/>
    <rect x="90" y="76" width="22" height="26" rx="2" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="1.5"/>
    <rect x="54" y="96" width="32" height="32" rx="4" fill="#6B4226" stroke="#4A2C17" stroke-width="1.5"/>
    <circle cx="80" cy="112" r="2.5" fill="#DAA520"/>
    <circle cx="24" cy="34" r="2.5" fill="#FFD700" class="bt-twinkle" opacity="0.6"/>
    <circle cx="116" cy="30" r="2" fill="#FFD700" class="bt-twinkle-d" opacity="0.5"/>
    <circle cx="50" cy="22" r="2" fill="#FFD700" class="bt-twinkle" opacity="0.4"/>
    <circle cx="96" cy="38" r="2.5" fill="#FFD700" class="bt-twinkle-d" opacity="0.6"/>
  </g>`
}

const BLDG = {
  'brain-builder': bldSchool,
  'thought-driver': bldLibrary,
  'emotion-navigator': bldCottage,
  'behaviour-engineer': bldWorkshop,
  'resilience-architect': bldFortress,
  'social-mapper': bldTreehouse,
  'future-designer': bldObservatory,
}

/* ─────────────────────────────────────────────
   4. DISTRICT RENDERER
   Ground zone + building + props
   ───────────────────────────────────────────── */

function renderDistrict(slug, d, skill) {
  let s = ''
  // Ground zone — visible filled area with border
  s += `<defs><radialGradient id="zone-${slug}">
    <stop offset="0%" stop-color="${d.zoneColor}" stop-opacity="0.6"/>
    <stop offset="55%" stop-color="${d.zoneColor}" stop-opacity="0.4"/>
    <stop offset="85%" stop-color="${d.zoneColor}" stop-opacity="0.15"/>
    <stop offset="100%" stop-color="${d.zoneColor}" stop-opacity="0"/>
  </radialGradient></defs>`
  s += `<ellipse cx="${d.x}" cy="${d.y}" rx="${d.zoneRx}" ry="${d.zoneRy}" fill="url(#zone-${slug})"/>`
  // Dashed border around zone
  s += `<ellipse cx="${d.x}" cy="${d.y}" rx="${d.zoneRx - 8}" ry="${d.zoneRy - 8}" fill="none" stroke="${d.color}" stroke-width="1.5" stroke-dasharray="10 14" opacity="0.18"/>`

  // Hedge bush ring around the zone edge (12–16 bushes in an ellipse)
  const hCount = 14
  for (let i = 0; i < hCount; i++) {
    const a = (i / hCount) * Math.PI * 2
    const hx = d.x + Math.cos(a) * (d.zoneRx - 30)
    const hy = d.y + Math.sin(a) * (d.zoneRy - 25)
    s += `<ellipse cx="${hx}" cy="${hy}" rx="${9 + (i%3)*2}" ry="${6 + (i%2)*2}" fill="#4CAF50" opacity="${0.35 + (i%3)*0.08}"/>`
  }

  // Cobblestone path to building entrance
  s += `<ellipse cx="${d.x}" cy="${d.y + 70}" rx="50" ry="12" fill="#D4C4A8" opacity="0.45"/>`
  s += `<ellipse cx="${d.x + 12}" cy="${d.y + 58}" rx="32" ry="9" fill="#CDB89C" opacity="0.35"/>`
  s += `<ellipse cx="${d.x - 8}" cy="${d.y + 80}" rx="28" ry="8" fill="#C4B498" opacity="0.3"/>`

  // Props
  const dp = DISTRICT_PROPS[slug] || []
  dp.forEach(p => {
    const fn = prop[p.fn]
    if (fn) {
      if (p.args) s += fn(d.x + p.dx, d.y + p.dy, ...p.args)
      else s += fn(d.x + p.dx, d.y + p.dy)
    }
  })

  // Building — scaled 1.5x for visual presence
  const renderer = BLDG[slug]
  if (renderer) {
    s += `<g class="svg-building" data-slug="${slug}" filter="url(#softShadow)" style="cursor:pointer" role="button" tabindex="0" aria-label="${esc(d.label)}">`
    s += `<g transform="translate(${d.x},${d.y}) scale(1.4) translate(${-d.x},${-d.y})">`
    s += renderer(d.x, d.y, d.color)
    s += `</g></g>`
  }

  return s
}

/* ─────────────────────────────────────────────
   5. TOWN SQUARE
   ───────────────────────────────────────────── */

function renderTownSquare() {
  let s = ''
  const cx = CX, cy = CY

  // Outer plaza — big and prominent
  s += `<circle cx="${cx}" cy="${cy}" r="210" fill="#D4C4A8" stroke="#B8A888" stroke-width="3"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="185" fill="#E0D4BC" stroke="#C8B898" stroke-width="2"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="155" fill="#D8CCB4" stroke="#C0B09C" stroke-width="1.5"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="125" fill="#DDD0B8" stroke="#C8B898" stroke-width="1" opacity="0.5"/>`

  // Decorative paving pattern (radial lines like a compass)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    s += `<line x1="${cx + Math.cos(a)*50}" y1="${cy + Math.sin(a)*50}" x2="${cx + Math.cos(a)*185}" y2="${cy + Math.sin(a)*185}" stroke="#C0B09C" stroke-width="1" opacity="0.25"/>`
  }

  // Compass rose on ground
  const cr = 65
  s += `<line x1="${cx}" y1="${cy-cr}" x2="${cx}" y2="${cy+cr}" stroke="#B8A888" stroke-width="2" opacity="0.4"/>`
  s += `<line x1="${cx-cr}" y1="${cy}" x2="${cx+cr}" y2="${cy}" stroke="#B8A888" stroke-width="2" opacity="0.4"/>`
  s += `<polygon points="${cx},${cy-cr+5} ${cx-6},${cy-cr+18} ${cx+6},${cy-cr+18}" fill="#B8A888" opacity="0.5"/>`
  s += `<text x="${cx}" y="${cy-cr-4}" text-anchor="middle" font-size="10" fill="#A89070" font-weight="700" font-family="Fredoka,sans-serif">N</text>`

  // Small garden beds around the plaza
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2
    const gx = cx + Math.cos(a) * 165, gy = cy + Math.sin(a) * 165
    s += `<ellipse cx="${gx}" cy="${gy}" rx="18" ry="10" fill="#4CAF50" opacity="0.4"/>`
    s += `<circle cx="${gx-4}" cy="${gy-3}" r="4" fill="${['#FF6B6B','#FFB74D','#BA68C8','#4FC3F7','#FFD54F','#AED581','#FF8A80','#82B1FF'][i]}" opacity="0.7"/>`
    s += `<circle cx="${gx+5}" cy="${gy-2}" r="3" fill="${['#FFB74D','#BA68C8','#4FC3F7','#FFD54F','#AED581','#FF8A80','#82B1FF','#FF6B6B'][i]}" opacity="0.6"/>`
  }

  // Fountain — bigger and more detailed
  s += `<circle cx="${cx}" cy="${cy}" r="50" fill="#5BB8E8" stroke="#3A9BD5" stroke-width="3"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="38" fill="#6DC8F0"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="24" fill="#B8D4E3" stroke="#7BA7C2" stroke-width="2.5"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="12" fill="#8CBCD0" stroke="#6AACCC" stroke-width="1.5"/>`
  s += `<line x1="${cx}" y1="${cy-12}" x2="${cx}" y2="${cy-36}" stroke="#999" stroke-width="3.5"/>`

  // Animated water spray — more jets
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const sx = cx + Math.cos(angle) * 8
    const sy1 = cy - 38
    const sy2 = cy - 52 - (i % 3) * 4
    const dur = 1.6 + (i * 0.25)
    s += `<circle cx="${sx}" cy="${sy1}" r="2.5" fill="#B8D4E3" opacity="0.45">
      <animate attributeName="cy" values="${sy1};${sy2};${sy1}" dur="${dur}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.4;0.15;0.4" dur="${dur}s" repeatCount="indefinite"/>
    </circle>`
  }

  // Lamp posts (8 around plaza at wider radius)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    s += svgLampPost(cx + Math.cos(a) * 145, cy + Math.sin(a) * 145)
  }

  // Benches (8 around)
  s += svgBench(cx - 90, cy + 80, 0)
  s += svgBench(cx + 90, cy + 80, 0)
  s += svgBench(cx, cy - 90, 0)
  s += svgBench(cx - 85, cy - 65, -25)
  s += svgBench(cx + 85, cy - 65, 25)
  s += svgBench(cx - 100, cy, -90)
  s += svgBench(cx + 100, cy, 90)
  s += svgBench(cx, cy + 95, 0)

  // Welcome arch / signboard — bigger
  s += `<g transform="translate(${cx + 120},${cy + 100})">
    <rect x="-5" y="0" width="10" height="30" rx="2" fill="#8B6914"/>
    <rect x="-48" y="-40" width="96" height="42" rx="7" fill="#F5E6C8" stroke="#C9A96E" stroke-width="2"/>
    <text x="0" y="-22" text-anchor="middle" font-size="10" fill="#6b7e95" font-weight="600" font-family="Fredoka,sans-serif">Welcome to</text>
    <text x="0" y="-6" text-anchor="middle" font-size="14" fill="#16324f" font-weight="700" font-family="Fredoka,sans-serif">Brain Town</text>
  </g>`

  // Town Square label — on the ground
  s += `<text x="${cx}" y="${cy + 90}" text-anchor="middle" font-size="18" font-weight="700" fill="#16324f" font-family="Fredoka,sans-serif" opacity="0.7">Town Square</text>`

  return s
}

/* ─────────────────────────────────────────────
   Decoration helpers
   ───────────────────────────────────────────── */

function svgTree(x, y, sz = 1) {
  return `<g transform="translate(${x},${y}) scale(${sz})">
    <rect x="-5" y="0" width="10" height="20" rx="3" fill="#8B6914"/>
    <g class="bt-sway"><circle cx="0" cy="-10" r="20" fill="#3A7D44"/><circle cx="-10" cy="-2" r="15" fill="#2D6A30"/><circle cx="10" cy="-5" r="16" fill="#4A8C54"/></g>
  </g>`
}
function svgPine(x, y, sz = 1) {
  return `<g transform="translate(${x},${y}) scale(${sz})">
    <rect x="-4" y="0" width="8" height="18" rx="2" fill="#6B4226"/>
    <g class="bt-sway-s"><polygon points="0,-35 -18,-2 18,-2" fill="#1B5E20"/><polygon points="0,-28 -14,-5 14,-5" fill="#2E7D32"/><polygon points="0,-20 -10,2 10,2" fill="#388E3C"/></g>
  </g>`
}
function svgBush(x, y) {
  return `<g transform="translate(${x},${y})"><ellipse cx="0" cy="0" rx="14" ry="10" fill="#4CAF50"/><ellipse cx="-7" cy="2" rx="10" ry="7" fill="#388E3C"/><ellipse cx="7" cy="1" rx="11" ry="8" fill="#43A047"/></g>`
}
function svgFlower(x, y, c = '#FF6B6B') {
  return `<g transform="translate(${x},${y})"><line x1="0" y1="0" x2="0" y2="10" stroke="#4CAF50" stroke-width="1.5"/><circle cx="-3" cy="-1" r="3" fill="${c}"/><circle cx="3" cy="-1" r="3" fill="${c}"/><circle cx="0" cy="-4" r="3" fill="${c}"/><circle cx="0" cy="-1" r="2.5" fill="#FFD700"/></g>`
}
function svgRock(x, y, sz = 1) {
  return `<g transform="translate(${x},${y}) scale(${sz})"><ellipse cx="0" cy="0" rx="14" ry="8" fill="#9E9E9E"/><ellipse cx="-4" cy="-2" rx="8" ry="5" fill="#BDBDBD" opacity="0.5"/></g>`
}
function svgLampPost(x, y) {
  return `<g transform="translate(${x},${y})"><line x1="0" y1="0" x2="0" y2="-38" stroke="#555" stroke-width="3"/><rect x="-7" y="-44" width="14" height="10" rx="3" fill="#FFE082" stroke="#FFC107" stroke-width="1.5"/><circle cx="0" cy="-39" r="4" fill="#FFF9C4" opacity="0.5" class="bt-glow"/><rect x="-5" y="0" width="10" height="4" rx="2" fill="#666"/></g>`
}
function svgBench(x, y, a = 0) {
  return `<g transform="translate(${x},${y}) rotate(${a})"><rect x="-16" y="-4" width="32" height="5" rx="1.5" fill="#8D6E63"/><rect x="-16" y="-10" width="32" height="4" rx="1.5" fill="#A1887F"/><rect x="-13" y="-4" width="4" height="10" fill="#6D4C41"/><rect x="9" y="-4" width="4" height="10" fill="#6D4C41"/></g>`
}
function svgFence(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy), n = Math.floor(len / 24)
  let r = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#C4956A" stroke-width="2.5"/><line x1="${x1}" y1="${y1-7}" x2="${x2}" y2="${y2-7}" stroke="#C4956A" stroke-width="2"/>`
  for (let i = 0; i <= n; i++) { const t = i / Math.max(n, 1); r += `<line x1="${x1+dx*t}" y1="${y1+dy*t+5}" x2="${x1+dx*t}" y2="${y1+dy*t-12}" stroke="#A0764E" stroke-width="3.5"/>` }
  return r
}
function svgPond(x, y) {
  return `<g transform="translate(${x},${y})">
    <ellipse cx="0" cy="0" rx="90" ry="55" fill="#5BB8E8" stroke="#3A9BD5" stroke-width="2.5"/>
    <ellipse cx="0" cy="0" rx="72" ry="42" fill="#6DC8F0" opacity="0.5"/>
    <ellipse cx="-20" cy="5" rx="25" ry="8" fill="#fff" opacity="0.1"><animate attributeName="opacity" values="0.1;0.2;0.1" dur="3s" repeatCount="indefinite"/></ellipse>
    <ellipse cx="25" cy="-10" rx="18" ry="6" fill="#fff" opacity="0.08"><animate attributeName="opacity" values="0.08;0.18;0.08" dur="4s" repeatCount="indefinite"/></ellipse>
    <ellipse cx="-35" cy="18" rx="12" ry="6" fill="#4CAF50" opacity="0.6"/><circle cx="-32" cy="16" r="3" fill="#FF69B4" opacity="0.5"/>
    <ellipse cx="40" cy="20" rx="10" ry="5" fill="#66BB6A" opacity="0.5"/>
  </g>`
}
function svgBridge(x, y, a = 0) {
  return `<g transform="translate(${x},${y}) rotate(${a})"><rect x="-28" y="-8" width="56" height="16" rx="3" fill="#A0764E" stroke="#8B6914" stroke-width="2"/><line x1="-24" y1="-8" x2="-24" y2="-16" stroke="#8B6914" stroke-width="2.5"/><line x1="24" y1="-8" x2="24" y2="-16" stroke="#8B6914" stroke-width="2.5"/><line x1="-24" y1="-16" x2="24" y2="-16" stroke="#8B6914" stroke-width="2.5"/></g>`
}

/* ─────────────────────────────────────────────
   6. WORLD DECORATIONS
   ───────────────────────────────────────────── */

function renderDecorations() {
  let s = ''
  const R = (seed) => { let v = seed; return () => { v = (v * 16807) % 2147483647; return (v - 1) / 2147483646 } }
  const rnd = R(42)

  // ── Trees (~85) ──
  const trees = [
    // Top edge
    [60,80],[160,55],[280,70],[420,55],[560,65],[700,40],[840,60],[1000,50],[1150,70],[1350,45],[1500,60],[1680,50],[1850,65],[2050,55],[2200,60],[2340,70],
    // Left edge
    [45,200],[50,380],[55,520],[48,680],[52,850],[58,1020],[50,1180],[55,1350],[48,1520],[55,1680],
    // Right edge
    [2350,220],[2340,400],[2355,560],[2342,730],[2348,900],[2352,1080],[2340,1240],[2345,1400],[2338,1560],[2350,1700],
    // Bottom edge
    [120,1740],[300,1750],[500,1730],[700,1745],[900,1755],[1100,1735],[1300,1745],[1500,1730],[1700,1750],[1900,1740],[2150,1720],
    // Interior clusters — fill the gaps between districts
    [620,490],[650,470],[680,510],  // between brain-builder & town square
    [1530,590],[1560,570],[1590,610],  // between social-mapper & town square
    [750,1120],[780,1140],[810,1100],  // mid-left
    [1700,1100],[1730,1130],[1660,1080],  // mid-right
    [850,320],[880,350],  // near top
    [1580,230],[1610,260],  // near top-right
    [1080,1200],[1110,1170],  // center-bottom
    [580,1260],[610,1240],  // left-bottom
    [340,620],[370,600],  // left gap
    [1660,730],[1690,750],  // right gap
    [950,550],[980,530],  // center-left
    [1400,560],[1430,540],  // center-right
    [200,1400],[230,1380],  // bottom-left
    [2100,1400],[2130,1380],  // bottom-right
  ]
  trees.forEach(([tx, ty]) => { s += (rnd() > 0.35 ? svgTree : svgPine)(tx, ty, 0.8 + rnd() * 0.6) })

  // ── Bushes (~30) ──
  ;[
    [500,230],[640,370],[1400,410],[2020,680],[280,1050],[1520,1300],[900,640],
    [1420,740],[480,740],[1970,540],[340,1200],[1820,1200],[700,1500],[1310,490],
    [160,450],[2200,480],[800,200],[1600,180],[450,1580],[1900,1550],
    [1100,360],[920,1400],[1750,1500],[300,750],[2100,750],[650,900],
    [1350,1100],[170,920],[2240,920],[1050,1550],
  ].forEach(([bx,by]) => s += svgBush(bx, by))

  // ── Flowers (~35) ──
  const fc = ['#FF6B6B','#FFB74D','#BA68C8','#4FC3F7','#FFD54F','#AED581','#FF8A80','#82B1FF']
  ;[
    [140,190],[2200,170],[100,1140],[2210,1070],[600,550],[1510,510],[290,390],
    [2110,910],[850,120],[1310,1610],[740,1340],[1910,1290],[1060,440],[1690,640],
    [250,600],[2100,600],[750,750],[1450,850],[400,1350],[1800,1350],
    [950,200],[1550,130],[350,1600],[2000,1600],[1150,1450],[600,200],
    [1850,200],[180,700],[2250,700],[1050,700],[500,1100],[1600,1050],
    [850,1600],[1400,1600],[700,60],
  ].forEach(([fx,fy],i) => s += svgFlower(fx, fy, fc[i%fc.length]))

  // ── Rocks (~12) ──
  ;[
    [650,140],[1450,160],[200,1340],[1800,1490],[900,1590],[2060,390],
    [130,800],[2280,800],[850,500],[1550,480],[400,1650],[1950,1650],
  ].forEach(([rx,ry]) => s += svgRock(rx, ry, 0.7 + rnd() * 0.6))

  // ── Fences near districts (~10 segments) ──
  s += svgFence(530, 430, 680, 430)
  s += svgFence(400, 820, 400, 980)
  s += svgFence(1710, 490, 1860, 490)
  s += svgFence(580, 1340, 580, 1490)
  s += svgFence(1370, 1360, 1510, 1360)
  s += svgFence(1060, 320, 1060, 180)
  s += svgFence(2120, 530, 2120, 680)
  s += svgFence(180, 600, 180, 750)
  s += svgFence(900, 1650, 1050, 1650)
  s += svgFence(1700, 1650, 1850, 1650)

  // ── Ponds & bridges ──
  s += svgPond(2100, 1060)
  s += svgBridge(2030, 1010, -10)
  s += svgPond(160, 1520)
  s += svgBridge(220, 1470, 15)

  // ── Stepping stone paths between some areas ──
  const stones = [[680,680],[710,700],[740,720],[770,740],  // path fragment
    [1500,1150],[1530,1170],[1560,1190],  // another path
    [850,1350],[880,1370],[910,1390],
  ]
  stones.forEach(([sx,sy]) => { s += `<ellipse cx="${sx}" cy="${sy}" rx="8" ry="5" fill="#C4B498" opacity="0.4"/>` })

  return s
}

/* ─────────────────────────────────────────────
   7. SKY LAYER
   ───────────────────────────────────────────── */

function renderSky() {
  let s = ''
  // Clouds
  ;[
    { x: 100, y: 45, sc: 1.3, d: 130 },
    { x: 550, y: 25, sc: 1.0, d: 160 },
    { x: 1000, y: 55, sc: 1.5, d: 110 },
    { x: 1500, y: 35, sc: 1.1, d: 140 },
    { x: 1950, y: 50, sc: 0.9, d: 170 },
    { x: 350, y: 80, sc: 0.7, d: 190 },
    { x: 1250, y: 90, sc: 0.8, d: 150 },
    { x: 2200, y: 60, sc: 1.2, d: 125 },
  ].forEach(c => {
    s += `<g opacity="0.3"><g>
      <ellipse cx="0" cy="0" rx="50" ry="18" fill="#fff"/><ellipse cx="-25" cy="5" rx="30" ry="14" fill="#fff"/>
      <ellipse cx="25" cy="5" rx="35" ry="16" fill="#fff"/><ellipse cx="0" cy="8" rx="40" ry="12" fill="#fff"/>
      <animateTransform attributeName="transform" type="translate" values="${c.x},${c.y};${c.x+250},${c.y};${c.x},${c.y}" dur="${c.d}s" repeatCount="indefinite"/>
    </g></g>`
  })
  // Birds
  ;[
    { x: 300, y: 110, d: 22 },
    { x: 1100, y: 70, d: 28 },
  ].forEach(b => {
    s += `<g opacity="0.35"><path d="M-5,0 Q0,-5 5,0" fill="none" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>
      <animateMotion dur="${b.d}s" repeatCount="indefinite" path="M${b.x},${b.y} Q${b.x+400},${b.y-50} ${b.x+800},${b.y+30} Q${b.x+1200},${b.y-40} ${b.x+1600},${b.y}"/>
    </g>`
  })
  return s
}

/* ─────────────────────────────────────────────
   8. ROAD RENDERER
   ───────────────────────────────────────────── */

function renderRoads() {
  let s = ''
  Object.entries(DISTRICTS).forEach(([slug, d]) => {
    const p = ROAD_PATHS[slug]
    if (!p) return
    // Shadow
    s += `<path d="${p}" fill="none" stroke="#8B7355" stroke-width="46" stroke-linecap="round" stroke-linejoin="round" opacity="0.15"/>`
    // Edge stones
    s += `<path d="${p}" fill="none" stroke="#A89070" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>`
    // Surface
    s += `<path d="${p}" fill="none" stroke="#D4B88C" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" class="svg-road" data-slug="${slug}"/>`
    // Center dashes
    s += `<path d="${p}" fill="none" stroke="#E8D5B0" stroke-width="3" stroke-dasharray="14 20" stroke-linecap="round" opacity="0.5"/>`
    // Glow layer (hidden, activated on selection)
    s += `<path d="${p}" fill="none" stroke="${d.color}" stroke-width="42" stroke-linecap="round" stroke-linejoin="round" opacity="0" class="svg-road-glow" data-slug="${slug}" filter="url(#roadGlow)"/>`
  })
  return s
}

/* ─────────────────────────────────────────────
   9. DISTRICT MARKERS (compact icon + short name)
   ───────────────────────────────────────────── */

function renderMarkers(skills) {
  const skillMap = {}
  skills.forEach(sk => { skillMap[sk.slug || (sk.name || '').toLowerCase().replace(/\s+/g, '-')] = sk })

  let s = ''
  Object.entries(DISTRICTS).forEach(([slug, d]) => {
    const sk = skillMap[slug]
    const name = sk?.name || d.label
    const img = sk?.character_image_url

    const pinY = d.y - 120
    s += `<g class="svg-pin" data-slug="${slug}" style="cursor:pointer" role="button" tabindex="0" aria-label="Select ${esc(name)}">`

    // Pin circle — smaller, cleaner
    s += `<circle cx="${d.x}" cy="${pinY}" r="22" fill="#fff" stroke="${d.color}" stroke-width="3" filter="url(#pinShadow)" class="svg-pin-circle"/>`
    if (img) {
      s += `<image href="${img}" x="${d.x-16}" y="${pinY-16}" width="32" height="32" preserveAspectRatio="xMidYMid meet" clip-path="circle(16px at 16px 16px)"/>`
    } else {
      s += `<text x="${d.x}" y="${pinY + 5}" text-anchor="middle" font-size="18">${d.emoji}</text>`
    }

    // Small drop pointer (subtle, not debug-like)
    s += `<polygon points="${d.x},${pinY+28} ${d.x-6},${pinY+20} ${d.x+6},${pinY+20}" fill="#fff" stroke="${d.color}" stroke-width="1.5"/>`

    // Compact pill badge — smaller text
    const tw = name.length * 5.5 + 18
    const ly = pinY - 30
    s += `<rect x="${d.x - tw/2}" y="${ly}" width="${tw}" height="20" rx="10" fill="rgba(255,255,255,0.92)" filter="url(#pinShadow)"/>`
    s += `<text x="${d.x}" y="${ly + 14}" text-anchor="middle" font-size="10" font-weight="700" fill="${d.color}" font-family="Fredoka,sans-serif">${esc(name)}</text>`

    s += `</g>`
  })
  return s
}

/* ─────────────────────────────────────────────
   SVG CONTENT BUILDER
   ───────────────────────────────────────────── */

function buildSvg(skills) {
  let s = ''

  // ── Defs ──
  s += `<defs>
    <radialGradient id="grassG" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#7EC850"/><stop offset="50%" stop-color="#6AB840"/><stop offset="100%" stop-color="#5AA030"/>
    </radialGradient>
    <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#87CEEB" stop-opacity="0.35"/><stop offset="100%" stop-color="#87CEEB" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grassP" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="#6AB840"/>
      <circle cx="6" cy="6" r="1" fill="#5AA030" opacity="0.3"/><circle cx="26" cy="14" r="0.8" fill="#7EC850" opacity="0.25"/>
      <circle cx="14" cy="30" r="0.9" fill="#5AA030" opacity="0.3"/><circle cx="34" cy="34" r="0.7" fill="#7EC850" opacity="0.2"/>
    </pattern>
    <filter id="softShadow" x="-15%" y="-15%" width="130%" height="140%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.15"/>
    </filter>
    <filter id="pinShadow" x="-20%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.18"/>
    </filter>
    <filter id="roadGlow">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`

  // ── Background layers ──
  s += `<rect width="${W}" height="${H}" fill="url(#grassG)"/>`
  s += `<rect width="${W}" height="${H}" fill="url(#grassP)" opacity="0.35"/>`
  s += `<rect width="${W}" height="200" fill="url(#skyG)"/>`

  // ── Sky (clouds, birds) ──
  s += renderSky()

  // ── World decorations ──
  s += renderDecorations()

  // ── Roads (below buildings) ──
  s += renderRoads()

  // ── Town Square ──
  s += renderTownSquare()

  // ── Districts (ground zones, props, buildings) ──
  Object.entries(DISTRICTS).forEach(([slug, d]) => {
    const sk = skills.find(ss => (ss.slug || (ss.name || '').toLowerCase().replace(/\s+/g, '-')) === slug)
    s += renderDistrict(slug, d, sk)
  })

  // ── District markers / labels (on top) ──
  s += renderMarkers(skills)

  // ── Daniel's speech prompt at Town Square ──
  s += `<g class="bt-prompt" transform="translate(${CX - 80},${CY - 130})">
    <rect x="0" y="0" width="160" height="34" rx="10" fill="#fff" stroke="#f2c94c" stroke-width="2" filter="url(#pinShadow)"/>
    <text x="80" y="22" text-anchor="middle" font-size="12" fill="#16324f" font-weight="700" font-family="Fredoka,sans-serif">Choose a Super Skill!</text>
    <polygon points="70,34 80,44 90,34" fill="#fff" stroke="#f2c94c" stroke-width="2"/>
    <line x1="71" y1="33" x2="89" y2="33" stroke="#fff" stroke-width="3"/>
  </g>`

  return s
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

/* ─────────────────────────────────────────────
   10. PAN / ZOOM
   Starts zoomed in on Town Square.
   ───────────────────────────────────────────── */

function createPanZoom(viewport, svgEl) {
  let tx = 0, ty = 0, scale = 1
  let down = false, lx = 0, ly = 0, moved = 0
  let pDist = 0, pScale = 1
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const vw = () => viewport.clientWidth
  const vh = () => viewport.clientHeight
  const minS = () => Math.max(vw() / W, vh() / H)

  function clamp() {
    scale = Math.max(minS(), Math.min(4.0, scale))
    tx = Math.max(vw() - W * scale, Math.min(0, tx))
    ty = Math.max(vh() - H * scale, Math.min(0, ty))
  }

  function apply(smooth) {
    if (smooth && !noMotion) { svgEl.style.transition = 'transform 0.35s ease-out'; setTimeout(() => svgEl.style.transition = '', 380) }
    svgEl.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`
  }

  // Start zoomed in around Town Square
  function home() {
    scale = Math.max(minS() * 3.0, 1.1)
    tx = vw() / 2 - CX * scale
    ty = vh() / 2 - CY * scale
    clamp(); apply(true)
  }

  function panTo(wx, wy) {
    tx = vw() / 2 - wx * scale
    ty = vh() / 2 - wy * scale
    clamp(); apply(true)
  }

  function zoomBy(f) {
    const cx = vw() / 2, cy = vh() / 2
    const ns = Math.max(minS(), Math.min(4.0, scale * f))
    tx = cx - (cx - tx) * (ns / scale); ty = cy - (cy - ty) * (ns / scale)
    scale = ns; clamp(); apply(true)
  }

  // Pointer events
  viewport.addEventListener('pointerdown', e => {
    if (e.target.closest('.svg-pin,.svg-building')) return
    down = true; lx = e.clientX; ly = e.clientY; moved = 0
    viewport.setPointerCapture(e.pointerId); viewport.classList.add('grabbing')
  })
  viewport.addEventListener('pointermove', e => {
    if (!down) return
    const dx = e.clientX - lx, dy = e.clientY - ly
    tx += dx; ty += dy; moved += Math.abs(dx) + Math.abs(dy)
    lx = e.clientX; ly = e.clientY; clamp(); apply()
  })
  const up = () => { down = false; viewport.classList.remove('grabbing') }
  viewport.addEventListener('pointerup', up)
  viewport.addEventListener('pointercancel', up)

  viewport.addEventListener('wheel', e => {
    e.preventDefault()
    const r = viewport.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top
    const f = e.deltaY < 0 ? 1.15 : 0.87
    const ns = Math.max(minS(), Math.min(4.0, scale * f))
    tx = mx - (mx - tx) * (ns / scale); ty = my - (my - ty) * (ns / scale)
    scale = ns; clamp(); apply()
  }, { passive: false })

  // Touch pinch
  viewport.addEventListener('touchstart', e => { if (e.touches.length === 2) { pDist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY); pScale = scale } }, { passive: true })
  viewport.addEventListener('touchmove', e => { if (e.touches.length === 2) { e.preventDefault(); const d = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY); scale = pScale * (d / pDist); clamp(); apply() } }, { passive: false })
  viewport.addEventListener('touchmove', e => { if (e.touches.length === 1) e.preventDefault() }, { passive: false })

  home()
  window.addEventListener('resize', home)

  return { home, panTo, zoomBy }
}

/* ─────────────────────────────────────────────
   11. DANIEL CHARACTER
   Idle at Town Square. Short walk toward clicked district.
   ───────────────────────────────────────────── */

const DANIEL_FRAMES = [
  '/images/characters/daniel-walking1.png',
  '/images/characters/daniel-walking2.png',
  '/images/characters/daniel-walking3.png',
  '/images/characters/daniel-walking4.png',
  '/images/characters/daniel-walking5.png',
]

function createDaniel(worldEl) {
  const el = document.createElement('div')
  el.className = 'svg-daniel'
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = 'position:absolute;width:80px;height:80px;z-index:10;pointer-events:none;'

  const shadow = document.createElement('div')
  shadow.style.cssText = 'position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:56px;height:12px;background:rgba(0,0,0,0.14);border-radius:50%;filter:blur(4px);'
  el.appendChild(shadow)

  const img = document.createElement('img')
  img.src = DANIEL_FRAMES[0]; img.alt = ''
  img.style.cssText = 'width:100%;height:100%;object-fit:contain;position:relative;'
  el.appendChild(img)
  worldEl.appendChild(el)

  DANIEL_FRAMES.forEach(src => { const i = new Image(); i.src = src })

  let pos = { x: CX, y: CY }
  let state = 'idle'
  let route = [], rIdx = 0, fIdx = 0, tick = 0, flipped = false
  let onDone = null
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function place(x, y) { pos = { x, y }; el.style.left = (x - 40) + 'px'; el.style.top = (y - 75) + 'px' }

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

  // Walk a SHORT distance toward a district (not the full road)
  function walkToward(slug, cb) {
    onDone = cb || null
    const path = ROAD_PATHS[slug]
    if (!path) { if (onDone) onDone(); return }

    if (noMotion) { if (onDone) onDone(); return }

    // Only walk the first 30% of the road (short walk)
    const full = samplePath(path, 60, false)
    const partial = full.slice(0, 18) // ~30%
    route = partial; rIdx = 0; state = 'walking'
  }

  function walkHome(cb) {
    onDone = () => { state = 'idle'; if (cb) cb() }
    if (noMotion) { place(CX, CY); state = 'idle'; if (cb) cb(); return }
    // Walk back to center from current position
    const dx = CX - pos.x, dy = CY - pos.y
    const steps = Math.max(8, Math.floor(Math.sqrt(dx*dx+dy*dy) / 8))
    route = []
    for (let i = 0; i <= steps; i++) { route.push({ x: pos.x + dx * (i/steps), y: pos.y + dy * (i/steps) }) }
    rIdx = 0; state = 'walking'
  }

  function loop() {
    tick++
    if (state === 'idle') {
      if (tick % 30 === 0) { fIdx = (fIdx + 1) % 2; img.src = DANIEL_FRAMES[fIdx === 0 ? 0 : 2] }
      const bob = Math.sin(tick * 0.03) * 2
      el.style.top = (pos.y - 75 + bob) + 'px'
    }
    if (state === 'walking' && route.length) {
      if (tick % 8 === 0) { fIdx = (fIdx + 1) % DANIEL_FRAMES.length; img.src = DANIEL_FRAMES[fIdx] }
      if (tick % 5 === 0) {
        const prev = rIdx; rIdx++
        if (rIdx >= route.length) {
          state = 'arrived'; img.src = DANIEL_FRAMES[0]
          if (onDone) { onDone(); onDone = null }
        } else {
          const pt = route[rIdx], pp = route[prev]
          place(pt.x, pt.y)
          const ddx = pt.x - pp.x
          if (Math.abs(ddx) > 0.5) { const flip = ddx < 0; if (flip !== flipped) { el.style.transform = flip ? 'scaleX(-1)' : ''; flipped = flip } }
        }
      }
    }
    if (state === 'arrived') { const bob = Math.sin(tick * 0.04) * 1.5; el.style.top = (pos.y - 75 + bob) + 'px' }
    requestAnimationFrame(loop)
  }

  place(CX, CY)
  requestAnimationFrame(loop)

  return { walkToward, walkHome, el }
}

/* ─────────────────────────────────────────────
   12. DETAIL DRAWER
   Desktop: side drawer. Mobile: bottom sheet.
   ───────────────────────────────────────────── */

function createDrawer(container, onNavigate, isMobile) {
  const scrim = document.createElement('div')
  scrim.className = 'bt-svg-scrim'
  const panel = document.createElement('div')
  panel.className = isMobile ? 'bt-svg-sheet' : 'bt-svg-drawer'
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Super Skill details')
  container.appendChild(scrim); container.appendChild(panel)
  let slug = null

  function open(s, skill, d) {
    slug = s
    const name = skill?.name || d.label
    const img = skill?.character_image_url
    const desc = skill?.description || d.desc
    const charName = skill?.character_name

    panel.innerHTML = `
      <div class="bt-svg-dh" style="border-color:${d.color}40">
        <button class="bt-svg-dx" id="svgDClose" aria-label="Close">&times;</button>
        ${img ? `<img src="${img}" alt="${esc(name)}" class="bt-svg-di"/>` : `<div class="bt-svg-de">${d.emoji}</div>`}
        <h3 class="bt-svg-dn">${esc(name)}</h3>
        ${charName ? `<span class="bt-svg-dc">Guide: ${esc(charName)}</span>` : ''}
        <span class="bt-svg-dd" style="color:${d.color}">${esc(d.district)}</span>
      </div>
      <div class="bt-svg-db"><p>${esc(desc)}</p></div>
      <div class="bt-svg-df">
        <button class="bt-svg-cta" id="svgDCta" style="background:linear-gradient(135deg,${d.color},${d.accent})">Start Adventure</button>
      </div>`

    scrim.classList.add('open'); panel.classList.add('open')
    panel.querySelector('#svgDClose').addEventListener('click', close)
    scrim.addEventListener('click', close, { once: true })
    if (onNavigate) panel.querySelector('#svgDCta').addEventListener('click', () => { close(); onNavigate(skill) })
    setTimeout(() => { const b = panel.querySelector('#svgDClose'); if (b) b.focus() }, 120)
  }

  function close() { scrim.classList.remove('open'); panel.classList.remove('open'); slug = null }

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && slug) close() })

  return { open, close, getSlug: () => slug }
}

/* ─────────────────────────────────────────────
   13. INJECT STYLES
   ───────────────────────────────────────────── */

function injectStyles() {
  if (document.getElementById('bt-svg-styles')) return
  const st = document.createElement('style')
  st.id = 'bt-svg-styles'
  st.textContent = `
/* Viewport */
.bt-svg-vp{width:100%;height:78vh;min-height:500px;overflow:hidden;position:relative;border-radius:22px;background:#5AA030;touch-action:none;user-select:none;cursor:grab;border:2px solid #e7ecf3;box-shadow:0 8px 30px rgba(40,60,90,.12)}
.bt-svg-vp.grabbing{cursor:grabbing}
/* Controls */
.bt-svg-ctrls{position:absolute;bottom:14px;right:14px;display:flex;flex-direction:column;gap:6px;z-index:5}
.bt-svg-cb{width:42px;height:42px;border:none;border-radius:12px;background:#fff;color:#16324f;font-size:20px;font-weight:700;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;transition:transform .15s;font-family:Fredoka,sans-serif}
.bt-svg-cb:hover{transform:scale(1.08);background:#f8f9fc}.bt-svg-cb:active{transform:scale(.95)}
.bt-svg-cbw{width:auto;padding:0 14px;font-size:12px}
/* Hint */
.bt-svg-hint{position:absolute;top:12px;left:12px;background:rgba(255,255,255,.92);border-radius:12px;padding:8px 16px;font-size:12px;font-weight:600;color:#16324f;z-index:5;box-shadow:0 2px 8px rgba(0,0,0,.1);pointer-events:none;transition:opacity .5s;font-family:Fredoka,sans-serif}
/* Sway */
@keyframes btSway{0%,100%{transform:rotate(0)}25%{transform:rotate(1.5deg)}75%{transform:rotate(-1.5deg)}}
@keyframes btSwayS{0%,100%{transform:rotate(0)}50%{transform:rotate(1deg)}}
.bt-sway{animation:btSway 4s ease-in-out infinite;transform-origin:0 0}
.bt-sway-s{animation:btSwayS 6s ease-in-out infinite;transform-origin:0 0}
/* Twinkle */
@keyframes btTw{0%,100%{opacity:.8}50%{opacity:.2}}
@keyframes btTwD{0%,100%{opacity:.3}50%{opacity:.9}}
.bt-twinkle{animation:btTw 2s ease-in-out infinite}.bt-twinkle-d{animation:btTwD 3s ease-in-out infinite}
/* Glow */
@keyframes btGl{0%,100%{opacity:.5}50%{opacity:.85}}
.bt-glow{animation:btGl 3s ease-in-out infinite}
/* Pin interaction */
.svg-pin{transition:transform .2s}.svg-pin:hover{transform:translateY(-4px)}
.svg-pin:focus-visible{outline:3px solid #f2c94c;outline-offset:4px;border-radius:8px}
.svg-pin.selected .svg-pin-circle{stroke-width:5}
/* Building interaction */
.svg-building{transition:transform .2s}.svg-building:hover{transform:translateY(-3px) scale(1.02)}
.svg-building:focus-visible{outline:3px solid #f2c94c;outline-offset:4px;border-radius:8px}
/* Road glow */
@keyframes btRP{0%,100%{opacity:.25}50%{opacity:.55}}
.svg-road-glow.active{animation:btRP 2s ease-in-out infinite}
/* Prompt hide */
.bt-prompt.hidden{opacity:0;transition:opacity .4s}
/* ── Drawer ── */
.bt-svg-scrim{position:absolute;inset:0;background:rgba(30,40,70,.2);opacity:0;visibility:hidden;transition:.25s;z-index:20}
.bt-svg-scrim.open{opacity:1;visibility:visible}
.bt-svg-drawer{position:absolute;top:0;right:0;height:100%;width:370px;max-width:86%;background:#fff;box-shadow:-12px 0 40px rgba(40,55,95,.18);transform:translateX(108%);transition:transform .3s cubic-bezier(.3,.8,.3,1);z-index:21;display:flex;flex-direction:column;border-radius:22px 0 0 22px;overflow:hidden}
.bt-svg-drawer.open{transform:translateX(0)}
.bt-svg-sheet{position:absolute;bottom:0;left:0;right:0;background:#fff;box-shadow:0 -12px 40px rgba(40,55,95,.18);transform:translateY(105%);transition:transform .3s cubic-bezier(.3,.8,.3,1);z-index:21;display:flex;flex-direction:column;border-radius:22px 22px 0 0;overflow:hidden;max-height:70vh}
.bt-svg-sheet.open{transform:translateY(0)}
/* Drawer parts */
.bt-svg-dh{padding:24px;background:linear-gradient(160deg,#f4f7fb,#fff);border-bottom:3px solid #e7ecf3;position:relative;text-align:center}
.bt-svg-dx{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;border:0;background:#fff;color:#16324f;font-size:18px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.1);cursor:pointer;display:flex;align-items:center;justify-content:center}
.bt-svg-dx:hover{background:#f4f7fb}
.bt-svg-di{width:72px;height:72px;object-fit:contain;margin:0 auto 10px;display:block}
.bt-svg-de{width:72px;height:72px;border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:32px;background:#f4f7fb}
.bt-svg-dn{font-size:22px;margin:0;color:#16324f;font-weight:700;font-family:Fredoka,sans-serif}
.bt-svg-dc{font-size:13px;color:#6b7e95;display:block;margin-top:2px}
.bt-svg-dd{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:4px;display:block}
.bt-svg-db{padding:20px 24px;overflow:auto;flex:1}
.bt-svg-db p{font-size:14.5px;color:#405878;line-height:1.6;margin:0}
.bt-svg-df{padding:16px 24px;border-top:1px solid #e7ecf3}
.bt-svg-cta{width:100%;color:#fff;border:none;border-radius:14px;padding:14px 20px;font-weight:600;font-size:15px;font-family:Fredoka,sans-serif;cursor:pointer;text-align:center;transition:transform .15s;box-shadow:0 4px 14px rgba(0,0,0,.15)}
.bt-svg-cta:hover{transform:translateY(-2px)}
/* Reduced motion */
@media(prefers-reduced-motion:reduce){
  .bt-sway,.bt-sway-s,.bt-twinkle,.bt-twinkle-d,.bt-glow,.svg-road-glow.active{animation:none!important}
  .bt-smoke circle,.bt-fountain-spray circle{animation:none!important}
}
@media(max-width:768px){.bt-svg-vp{height:65vh;min-height:400px}.bt-svg-hint{font-size:11px;padding:6px 12px}}
`
  document.head.appendChild(st)
}

/* ─────────────────────────────────────────────
   14. PUBLIC API
   ───────────────────────────────────────────── */

export async function initSvgMap(container, { onSelectSkill } = {}) {
  let skills = []
  try { skills = await getSuperSkills() || [] } catch (_) {}

  injectStyles()
  const isMobile = window.innerWidth <= 768

  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:relative;width:100%;'

  const vp = document.createElement('div')
  vp.className = 'bt-svg-vp'

  const world = document.createElement('div')
  world.style.cssText = `position:absolute;top:0;left:0;width:${W}px;height:${H}px;transform-origin:0 0;will-change:transform;`
  world.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block" role="img" aria-label="Brain Town interactive map">${buildSvg(skills)}</svg>`
  vp.appendChild(world)

  // Controls
  const ctrls = document.createElement('div')
  ctrls.className = 'bt-svg-ctrls'
  ctrls.innerHTML = `<button class="bt-svg-cb" id="svgZI" aria-label="Zoom in">+</button><button class="bt-svg-cb" id="svgZO" aria-label="Zoom out">&minus;</button><button class="bt-svg-cb bt-svg-cbw" id="svgHm" aria-label="Centre map">Centre</button>`
  vp.appendChild(ctrls)

  // Hint
  const hint = document.createElement('div')
  hint.className = 'bt-svg-hint'
  hint.textContent = 'Drag to explore \u2022 Tap a building'
  vp.appendChild(hint)
  setTimeout(() => { hint.style.opacity = '0' }, 5000)

  wrap.appendChild(vp)
  container.appendChild(wrap)

  // Pan/Zoom
  const pz = createPanZoom(vp, world)
  ctrls.querySelector('#svgZI').addEventListener('click', () => pz.zoomBy(1.25))
  ctrls.querySelector('#svgZO').addEventListener('click', () => pz.zoomBy(0.8))
  ctrls.querySelector('#svgHm').addEventListener('click', pz.home)

  // Daniel
  const daniel = createDaniel(world)

  // Drawer
  const drawer = createDrawer(vp, skill => { if (onSelectSkill && skill) onSelectSkill(skill) }, isMobile)

  // Selection logic
  let selSlug = null
  const prompt = world.querySelector('.bt-prompt')

  function selectDistrict(sl) {
    const d = DISTRICTS[sl]
    if (!d) return
    const sk = skills.find(s => (s.slug || (s.name || '').toLowerCase().replace(/\s+/g, '-')) === sl)

    // Update pin states
    world.querySelectorAll('.svg-pin').forEach(p => p.classList.remove('selected'))
    const pin = world.querySelector(`.svg-pin[data-slug="${sl}"]`)
    if (pin) pin.classList.add('selected')

    // Road glow
    world.querySelectorAll('.svg-road-glow').forEach(r => { r.classList.remove('active'); r.style.opacity = '0' })
    const glow = world.querySelector(`.svg-road-glow[data-slug="${sl}"]`)
    if (glow) { glow.classList.add('active'); glow.style.opacity = '' }

    // Hide prompt
    if (prompt) prompt.classList.add('hidden')

    // Daniel walks toward district then drawer opens
    if (selSlug && selSlug !== sl) {
      daniel.walkHome(() => daniel.walkToward(sl, () => drawer.open(sl, sk, d)))
    } else {
      daniel.walkToward(sl, () => drawer.open(sl, sk, d))
    }
    selSlug = sl

    // Pan camera toward building
    pz.panTo(d.x, d.y)
  }

  // Click handlers
  world.addEventListener('click', e => {
    const el = e.target.closest('.svg-pin,.svg-building')
    if (!el) return
    const sl = el.dataset.slug
    if (sl) selectDistrict(sl)
  })

  // Keyboard
  world.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const el = e.target.closest('.svg-pin,.svg-building')
      if (!el) return
      e.preventDefault()
      selectDistrict(el.dataset.slug)
    }
  })
}
