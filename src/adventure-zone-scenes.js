// ================================================
// ADVENTURE ZONE SCENES — per-Super-Skill SVG district backgrounds
//
// Each Super Skill's adventure map gets a scene that belongs to its
// Brain Town district (same art language: layered hills, soft meadow,
// chunky friendly buildings). The scene grows in TWO ways:
//
//   1. Every completed module adds a small visible prop to the scene
//      (flowers, bushes, trees, rocks) — every module leaves a mark.
//   2. At each town stage the scene transforms:
//        stage 0 — Trailhead:   wild surveyed land, trailhead sign, tent,
//                               survey flags. No buildings at all.
//        stage 1 — Village:     first cottages, fences, the landmark begins.
//        stage 2 — Town Centre: shops with awnings, clock tower, lamps,
//                               paved plaza, landmark complete.
//        stage 3 — City:        full skyline on the horizon, tall buildings,
//                               lit windows, bunting, sparkles.
//
// Layout rules:
//   - The horizon sits HIGH (~18%) so the child's road never runs into sky.
//   - A hill pass + soft verge track make the road read as winding down
//     from the hills into the district.
//   - The city skyline rises from BEHIND the near hill band, so building
//     bases are occluded by the hill crest (grounded, never floating).
//   - The centre column stays open meadow for the road, nodes, and Daniel.
//
// Feature-flagged (adventure_svg_scenes) so the classic image map
// can be switched back on from Admin Centre → Features.
// ================================================

// ── Feature flag (cached once per page load) ──────────────────────

let _flagCache = null;

export async function isSvgScenesEnabled() {
  if (_flagCache !== null) return _flagCache;
  try {
    const { getSettings } = await import('./services/databaseService.js');
    const settings = await getSettings();
    _flagCache = settings?.feature_flags?.adventure_svg_scenes === true;
  } catch (err) {
    console.warn('[zone-scenes] feature flag lookup failed, defaulting OFF', err);
    _flagCache = false;
  }
  return _flagCache;
}

// ── Canvas geometry ───────────────────────────────────────────────

const W = 1200, H = 800;
const HORIZON = 150;       // meadow starts here — high, so the road stays on grass
const ROAD_X = 600;        // where the hill pass sits (the road "arrives" here)

// ── Shared drawing helpers (all return SVG strings) ───────────────

function cloud(x, y, s, o = 0.85) {
  return `<g fill="#FFFFFF" opacity="${o}">
    <ellipse cx="${x}" cy="${y}" rx="${40 * s}" ry="${16 * s}"/>
    <ellipse cx="${x - 24 * s}" cy="${y + 5 * s}" rx="${24 * s}" ry="${12 * s}"/>
    <ellipse cx="${x + 26 * s}" cy="${y + 4 * s}" rx="${26 * s}" ry="${13 * s}"/>
  </g>`;
}

function star(x, y, s, c = '#FFF8D0') {
  return `<path d="M${x} ${y - 5 * s} L${x + 1.6 * s} ${y - 1.6 * s} L${x + 5 * s} ${y} L${x + 1.6 * s} ${y + 1.6 * s} L${x} ${y + 5 * s} L${x - 1.6 * s} ${y + 1.6 * s} L${x - 5 * s} ${y} L${x - 1.6 * s} ${y - 1.6 * s} Z" fill="${c}"/>`;
}

function tree(x, y, s, leaf1, leaf2, trunk = '#7A5230') {
  return `<g>
    <ellipse cx="${x}" cy="${y + 2}" rx="${18 * s}" ry="${6 * s}" fill="#2F5D3A" opacity="0.12"/>
    <rect x="${x - 4 * s}" y="${y - 26 * s}" width="${8 * s}" height="${28 * s}" rx="${3 * s}" fill="${trunk}"/>
    <circle cx="${x}" cy="${y - 36 * s}" r="${20 * s}" fill="${leaf1}"/>
    <circle cx="${x - 12 * s}" cy="${y - 26 * s}" r="${13 * s}" fill="${leaf2}"/>
    <circle cx="${x + 12 * s}" cy="${y - 27 * s}" r="${14 * s}" fill="${leaf2}"/>
  </g>`;
}

function bush(x, y, s, c1, c2) {
  return `<g>
    <ellipse cx="${x}" cy="${y}" rx="${22 * s}" ry="${13 * s}" fill="${c1}"/>
    <ellipse cx="${x + 14 * s}" cy="${y + 2 * s}" rx="${14 * s}" ry="${9 * s}" fill="${c2}"/>
  </g>`;
}

function rock(x, y, s) {
  return `<g>
    <ellipse cx="${x}" cy="${y}" rx="${16 * s}" ry="${10 * s}" fill="#A8A29A"/>
    <ellipse cx="${x + 10 * s}" cy="${y + 3 * s}" rx="${9 * s}" ry="${6 * s}" fill="#948E86"/>
  </g>`;
}

function flowerPatch(x, y, s, c) {
  const f = (fx, fy, fs) => `<g>
    <rect x="${fx - 1.2 * fs}" y="${fy - 8 * fs}" width="${2.4 * fs}" height="${9 * fs}" rx="1" fill="#4E8A44"/>
    <circle cx="${fx - 3.6 * fs}" cy="${fy - 10 * fs}" r="${2.8 * fs}" fill="${c}"/>
    <circle cx="${fx + 3.6 * fs}" cy="${fy - 10 * fs}" r="${2.8 * fs}" fill="${c}"/>
    <circle cx="${fx}" cy="${fy - 13 * fs}" r="${2.8 * fs}" fill="${c}"/>
    <circle cx="${fx}" cy="${fy - 7 * fs}" r="${2.8 * fs}" fill="${c}"/>
    <circle cx="${fx}" cy="${fy - 10 * fs}" r="${2.2 * fs}" fill="#FFE9A8"/>
  </g>`;
  return f(x, y, s) + f(x - 14 * s, y + 6 * s, s * 0.8) + f(x + 13 * s, y + 5 * s, s * 0.85);
}

// A chunky friendly cottage in the Brain Town style.
function house(x, y, s, wall, roof, lit = false) {
  const w = 96 * s, h = 64 * s;
  return `<g>
    <ellipse cx="${x}" cy="${y + 4}" rx="${w * 0.62}" ry="${10 * s}" fill="#2F5D3A" opacity="0.14"/>
    <rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="${8 * s}" fill="${wall}" stroke="#5F4126" stroke-width="${2.5 * s}"/>
    <path d="M${x - w * 0.62} ${y - h + 6 * s} L${x} ${y - h - 32 * s} L${x + w * 0.62} ${y - h + 6 * s} Z" fill="${roof}" stroke="#5F4126" stroke-width="${2.5 * s}" stroke-linejoin="round"/>
    <rect x="${x - 11 * s}" y="${y - 32 * s}" width="${22 * s}" height="${32 * s}" rx="${9 * s}" fill="#8A5A2B"/>
    <rect x="${x - w * 0.34}" y="${y - h * 0.7}" width="${18 * s}" height="${15 * s}" rx="${4 * s}" fill="${lit ? '#FFD66B' : '#CDE6F5'}" stroke="#5F4126" stroke-width="${2 * s}"/>
    <rect x="${x + w * 0.34 - 18 * s}" y="${y - h * 0.7}" width="${18 * s}" height="${15 * s}" rx="${4 * s}" fill="${lit ? '#FFD66B' : '#CDE6F5'}" stroke="#5F4126" stroke-width="${2 * s}"/>
  </g>`;
}

// A shop with a striped awning — the unmistakable "town centre" cue.
function shop(x, y, s, wall, awn1, awn2 = '#FFFFFF') {
  const w = 104 * s, h = 70 * s;
  let stripes = '';
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const sx = x - w * 0.56 + (i * w * 1.12) / segs;
    stripes += `<path d="M${sx} ${y - h * 0.62} h${(w * 1.12) / segs} v${14 * s} q-${(w * 0.56) / segs} ${8 * s} -${(w * 1.12) / segs} 0 Z" fill="${i % 2 ? awn2 : awn1}"/>`;
  }
  return `<g>
    <ellipse cx="${x}" cy="${y + 4}" rx="${w * 0.62}" ry="${10 * s}" fill="#2F5D3A" opacity="0.14"/>
    <rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="${7 * s}" fill="${wall}" stroke="#5F4126" stroke-width="${2.5 * s}"/>
    <rect x="${x - w / 2 - 4 * s}" y="${y - h - 10 * s}" width="${w + 8 * s}" height="${14 * s}" rx="${6 * s}" fill="${awn1}" stroke="#5F4126" stroke-width="${2 * s}"/>
    <g stroke="#5F4126" stroke-width="${1.6 * s}">${stripes}</g>
    <rect x="${x - w * 0.36}" y="${y - h * 0.42}" width="${w * 0.44}" height="${h * 0.38}" rx="${4 * s}" fill="#CDE6F5" stroke="#5F4126" stroke-width="${2 * s}"/>
    <rect x="${x + w * 0.14}" y="${y - h * 0.44}" width="${20 * s}" height="${h * 0.44}" rx="${8 * s}" fill="#8A5A2B"/>
  </g>`;
}

// Clock tower — town centre landmark cue.
function clockTower(x, y, s, wall, roof) {
  const w = 46 * s, h = 130 * s;
  return `<g>
    <ellipse cx="${x}" cy="${y + 4}" rx="${w}" ry="${9 * s}" fill="#2F5D3A" opacity="0.14"/>
    <rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="${6 * s}" fill="${wall}" stroke="#5F4126" stroke-width="${2.5 * s}"/>
    <path d="M${x - w * 0.72} ${y - h + 4 * s} L${x} ${y - h - 30 * s} L${x + w * 0.72} ${y - h + 4 * s} Z" fill="${roof}" stroke="#5F4126" stroke-width="${2.5 * s}" stroke-linejoin="round"/>
    <circle cx="${x}" cy="${y - h + 30 * s}" r="${15 * s}" fill="#FFF9E8" stroke="#5F4126" stroke-width="${2.5 * s}"/>
    <path d="M${x} ${y - h + 30 * s} V${y - h + 21 * s} M${x} ${y - h + 30 * s} H${x + 8 * s}" stroke="#5F4126" stroke-width="${2 * s}" stroke-linecap="round"/>
    <rect x="${x - 9 * s}" y="${y - 30 * s}" width="${18 * s}" height="${30 * s}" rx="${7 * s}" fill="#8A5A2B"/>
  </g>`;
}

// Tall city building. Bases get planted low; windows always lit.
function tallBuilding(x, y, s, wall, roof, floors = 4) {
  const w = 72 * s, h = (46 + floors * 26) * s;
  let wins = '';
  for (let r = 0; r < floors; r++) {
    for (let c = 0; c < 2; c++) {
      wins += `<rect x="${x - w * 0.32 + c * w * 0.4}" y="${y - h + 16 * s + r * 26 * s}" width="${15 * s}" height="${16 * s}" rx="${3 * s}" fill="#FFD66B"/>`;
    }
  }
  return `<g>
    <ellipse cx="${x}" cy="${y + 4}" rx="${w * 0.66}" ry="${9 * s}" fill="#2F5D3A" opacity="0.14"/>
    <rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="${7 * s}" fill="${wall}" stroke="#4A3A5A" stroke-width="${2.5 * s}"/>
    <rect x="${x - w / 2 - 5 * s}" y="${y - h - 11 * s}" width="${w + 10 * s}" height="${15 * s}" rx="${7 * s}" fill="${roof}" stroke="#4A3A5A" stroke-width="${2 * s}"/>
    ${wins}
  </g>`;
}

function fence(x, y, w, c = '#B08650') {
  let s = `<rect x="${x}" y="${y - 4}" width="${w}" height="5" rx="2.5" fill="${c}"/>`;
  for (let px = x; px <= x + w; px += 26) {
    s += `<rect x="${px - 3}" y="${y - 18}" width="6" height="22" rx="3" fill="${c}"/>`;
  }
  return s;
}

function lamp(x, y, on = true) {
  return `<g>
    <rect x="${x - 3}" y="${y - 58}" width="6" height="58" rx="3" fill="#6B7280"/>
    <circle cx="${x}" cy="${y - 64}" r="8" fill="${on ? '#FFE9A8' : '#C9CED6'}" stroke="#6B7280" stroke-width="2.5"/>
    ${on ? `<circle cx="${x}" cy="${y - 64}" r="15" fill="#FFE9A8" opacity="0.22"/>` : ''}
  </g>`;
}

// Cartoon pavement: a soft checkerboard of big panels with joint lines.
// Used for the City stage ground in both the scene and the filler tile.
function pavement(base, dusk, y0, y1) {
  const joint = mixHex(base, dusk ? '#141227' : '#39414E', 0.3);
  const panelL = mixHex(base, '#FFFFFF', 0.12);
  const s = [];
  const cw = 210, rh = 175;
  let r = 0;
  for (let py = y0; py < y1; py += rh, r++) {
    for (let c = 0; c < Math.ceil(W / cw); c++) {
      if ((c + r) % 2 === 0) continue;
      s.push(`<rect x="${c * cw}" y="${py}" width="${cw}" height="${Math.min(rh, y1 - py)}" fill="${panelL}" opacity="0.5"/>`);
    }
  }
  let joints = '';
  for (let jy = y0 + rh; jy < y1; jy += rh) joints += `M0 ${jy} H${W} `;
  for (let jx = cw; jx < W; jx += cw) joints += `M${jx} ${y0} V${y1} `;
  s.push(`<path d="${joints}" stroke="${joint}" stroke-width="2.5" opacity="0.3" fill="none"/>`);
  return s.join('');
}

// A street tree in a square planter — greenery that belongs in a city.
function planterTree(x, y, leaf1, leaf2) {
  return `<g>
    <rect x="${x - 20}" y="${y - 18}" width="40" height="18" rx="4" fill="#9BA0A8" stroke="#5F6570" stroke-width="2.5"/>
    <rect x="${x - 3.5}" y="${y - 46}" width="7" height="30" rx="3" fill="#7A5230"/>
    <circle cx="${x}" cy="${y - 56}" r="18" fill="${leaf1}"/>
    <circle cx="${x - 11}" cy="${y - 47}" r="11" fill="${leaf2}"/>
    <circle cx="${x + 11}" cy="${y - 48}" r="11" fill="${leaf2}"/>
  </g>`;
}

// ── City streetscape props ────────────────────────────────────────

// Rooftop water tank on legs — instant "big city" silhouette.
function waterTower(x, y, s = 1) {
  return `<g>
    <path d="M${x - 11 * s} ${y} V${y - 13 * s} M${x + 11 * s} ${y} V${y - 13 * s}" stroke="#6B7280" stroke-width="${4 * s}"/>
    <rect x="${x - 15 * s}" y="${y - 38 * s}" width="${30 * s}" height="${26 * s}" rx="${6 * s}" fill="#B08650" stroke="#7A5230" stroke-width="${2.5 * s}"/>
    <path d="M${x - 17 * s} ${y - 38 * s} L${x} ${y - 49 * s} L${x + 17 * s} ${y - 38 * s} Z" fill="#8A5A2B"/>
  </g>`;
}

// Rooftop aerial with a blinking-red tip.
function antenna(x, y, s = 1) {
  return `<g>
    <path d="M${x} ${y} V${y - 32 * s}" stroke="#6B7280" stroke-width="${3.5 * s}"/>
    <path d="M${x - 9 * s} ${y - 20 * s} H${x + 9 * s}" stroke="#6B7280" stroke-width="${2.5 * s}"/>
    <circle cx="${x}" cy="${y - 36 * s}" r="${4.5 * s}" fill="#E05252"/>
  </g>`;
}

// A chunky cartoon car, parked kerbside. Baseline y = wheel contact.
function car(x, y, c, flip = false) {
  return `<g transform="translate(${x} ${y})${flip ? ' scale(-1,1)' : ''}">
    <ellipse cx="0" cy="1" rx="38" ry="6" fill="#1E2530" opacity="0.18"/>
    <path d="M-16 -24 Q-12 -38 2 -38 Q17 -38 21 -24 Z" fill="${c}" stroke="#3A4150" stroke-width="2.5"/>
    <rect x="-34" y="-25" width="68" height="20" rx="10" fill="${c}" stroke="#3A4150" stroke-width="2.5"/>
    <rect x="-11" y="-36" width="21" height="10" rx="4" fill="#CDE6F5"/>
    <circle cx="-19" cy="-4" r="7.5" fill="#2A3340"/><circle cx="19" cy="-4" r="7.5" fill="#2A3340"/>
    <circle cx="-19" cy="-4" r="3" fill="#9AA4B2"/><circle cx="19" cy="-4" r="3" fill="#9AA4B2"/>
  </g>`;
}

// Zebra crossing stripes on a side street.
function zebra(x, y, streetH) {
  let z = '';
  for (let i = 0; i < 5; i++) {
    z += `<rect x="${x + i * 15}" y="${y + 9}" width="9" height="${streetH - 18}" rx="3.5" fill="#FFFFFF" opacity="0.75"/>`;
  }
  return z;
}

// A cross street running the full tile width. The child's winding road
// is drawn over the top by the map, so these read as intersections.
function sideStreet(y, dusk) {
  const SH = 92;
  const asphalt = dusk ? '#3E3A66' : '#55606E';
  const edge = dusk ? '#2E2B4F' : '#39434F';
  const kerb = dusk ? '#8B87AC' : '#E9E6DE';
  return `<g>
    <rect y="${y - 10}" width="${W}" height="10" fill="${kerb}" opacity="0.45"/>
    <rect y="${y + SH}" width="${W}" height="10" fill="${kerb}" opacity="0.45"/>
    <rect y="${y}" width="${W}" height="${SH}" fill="${asphalt}"/>
    <rect y="${y}" width="${W}" height="6" fill="${edge}" opacity="0.7"/>
    <rect y="${y + SH - 6}" width="${W}" height="6" fill="${edge}" opacity="0.7"/>
    <path d="M0 ${y + SH / 2} H${W}" stroke="#FFF8E0" stroke-width="4" stroke-dasharray="26 22" opacity="0.85"/>
    ${zebra(330, y, SH)}${zebra(795, y, SH)}
  </g>`;
}

// A city tower with deterministic wall/roof variation (so blocks don't
// look photocopied) and an optional rooftop water tower or antenna.
function cityTower(cfg, x, y, s, floors, deco) {
  const walls = [cfg.wall, '#F6EFE3', mixHex(cfg.wall, cfg.tint, 0.45)];
  const roofs = [cfg.roof, cfg.accent, mixHex(cfg.roof, '#16324F', 0.35)];
  const v = Math.abs(Math.round(x * 0.37 + floors * 7));
  const h = (46 + floors * 26) * s;
  const top = y - h - 11 * s;
  let out = tallBuilding(x, y, s, walls[v % 3], roofs[(v + 1) % 3], floors);
  if (deco === 'wt') out += waterTower(x, top, 0.8 * s + 0.2);
  else if (deco === 'ant') out += antenna(x + 14 * s, top, 0.9);
  return out;
}

// A kerbed pocket lawn — deliberate city greenery.
function lawn(x, y, w, h, cfg, leaf1, leaf2) {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${cfg.dusk ? '#5F8A5A' : '#8FC66A'}" stroke="${cfg.dusk ? '#42663F' : '#5D9A49'}" stroke-width="3.5"/>
    ${tree(x + 42, y + h - 10, 0.85, leaf1, leaf2)}
    ${flowerPatch(x + w - 48, y + h - 14, 0.8, cfg.accent)}
  </g>`;
}

function buntingLine(x1, y1, x2, y2, colors) {
  const midY = Math.max(y1, y2) + 16;
  let s = `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${midY} ${x2} ${y2}" fill="none" stroke="#8A6D38" stroke-width="2.5"/>`;
  const n = colors.length;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const bx = x1 + (x2 - x1) * t;
    const by = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * 15;
    s += `<path d="M${bx - 7} ${by} L${bx + 7} ${by} L${bx} ${by + 13} Z" fill="${colors[i]}"/>`;
  }
  return s;
}

// ── Trailhead props — the land is surveyed, waiting to be built ──

function surveyFlag(x, y, c) {
  return `<g>
    <rect x="${x - 2}" y="${y - 34}" width="4" height="34" rx="2" fill="#8A5A2B"/>
    <path d="M${x + 2} ${y - 34} L${x + 24} ${y - 27} L${x + 2} ${y - 20} Z" fill="${c}"/>
  </g>`;
}

function plotOutline(x, y, rx, ry, c) {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-width="3" stroke-dasharray="10 12" stroke-linecap="round" opacity="0.5"/>`;
}

function tent(x, y, s, c1, c2) {
  return `<g>
    <ellipse cx="${x}" cy="${y + 3}" rx="${44 * s}" ry="${8 * s}" fill="#2F5D3A" opacity="0.13"/>
    <path d="M${x - 40 * s} ${y} L${x} ${y - 52 * s} L${x + 40 * s} ${y} Z" fill="${c1}" stroke="#5F4126" stroke-width="${2.5 * s}" stroke-linejoin="round"/>
    <path d="M${x - 12 * s} ${y} L${x} ${y - 30 * s} L${x + 12 * s} ${y} Z" fill="${c2}"/>
  </g>`;
}

// Big wooden trailhead sign — unmistakably "the start of the trail".
function trailSign(x, y, s) {
  return `<g>
    <ellipse cx="${x}" cy="${y + 4}" rx="${50 * s}" ry="${9 * s}" fill="#2F5D3A" opacity="0.13"/>
    <rect x="${x - 34 * s}" y="${y - 78 * s}" width="${9 * s}" height="${78 * s}" rx="${4 * s}" fill="#8A5A2B"/>
    <rect x="${x + 25 * s}" y="${y - 78 * s}" width="${9 * s}" height="${78 * s}" rx="${4 * s}" fill="#8A5A2B"/>
    <rect x="${x - 46 * s}" y="${y - 76 * s}" width="${92 * s}" height="${30 * s}" rx="${7 * s}" fill="#C9975A" stroke="#7A5230" stroke-width="${3 * s}"/>
    <path d="M${x - 32 * s} ${y - 61 * s} H${x + 20 * s} M${x - 32 * s} ${y - 53 * s} H${x + 32 * s}" stroke="#7A5230" stroke-width="${3.5 * s}" stroke-linecap="round"/>
    <path d="M${x - 46 * s} ${y - 36 * s} h${58 * s} l${14 * s} ${8 * s} l-${14 * s} ${8 * s} h-${58 * s} Z" fill="#C9975A" stroke="#7A5230" stroke-width="${3 * s}"/>
  </g>`;
}

function dirtPatch(x, y, rx, ry) {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#C9A876" opacity="0.45"/>`;
}

function sparkles(pts, c) {
  return pts.map(([x, y, s]) => star(x, y, s, c)).join('');
}

// ── District definitions ──────────────────────────────────────────
// Palette + landmark builder per Super Skill. Landmarks sit in the
// upper meadow (below the hills) and grow through the stages.

const DISTRICTS = {

  // Coco — Lookout District: high ground, sulphur yellow and sky.
  'thought-driver': {
    sky: ['#A8DEF5', '#EDF9FF'],
    hillFar: '#EFE2A2', hillNear: '#E3CF7E',
    tint: '#F5E9B8', accent: '#F2C230',
    wall: '#FFF6E3', roof: '#F2C230',
    dusk: false, landmarkSide: 'right',
    landmark(stage) {
      const x = 990, y = 330;
      if (stage === 0) {
        return `${plotOutline(x, y - 8, 110, 38, '#C9A83D')}
          ${surveyFlag(x - 40, y, '#F2C230')}${surveyFlag(x + 46, y - 6, '#F2C230')}`;
      }
      const towerH = 74 + stage * 28;
      return `<g>
        <ellipse cx="${x}" cy="${y}" rx="118" ry="38" fill="#E3CF7E"/>
        <rect x="${x - 30}" y="${y - towerH}" width="60" height="${towerH}" rx="9" fill="#F7E9C2" stroke="#8A6D38" stroke-width="3"/>
        <path d="M${x - 40} ${y - towerH} L${x} ${y - towerH - 36} L${x + 40} ${y - towerH} Z" fill="#F2C230" stroke="#8A6D38" stroke-width="3" stroke-linejoin="round"/>
        <rect x="${x - 13}" y="${y - towerH + 14}" width="26" height="20" rx="6" fill="#7FB6D9"/>
        ${stage >= 2 ? `<rect x="${x - 42}" y="${y - towerH + 46}" width="84" height="9" rx="4.5" fill="#B08650"/>` : ''}
        ${stage >= 3 ? `<circle cx="${x}" cy="${y - towerH - 46}" r="9" fill="#FFE9A8"/><circle cx="${x}" cy="${y - towerH - 46}" r="18" fill="#FFE9A8" opacity="0.3"/>` : ''}
      </g>`;
    },
  },

  // Kip — Resting Groves: the calm green quarter, one great home tree.
  'emotion-navigator': {
    sky: ['#BFE8DC', '#F0FAF4'],
    hillFar: '#A8D69A', hillNear: '#8FC282',
    tint: '#C2E3B0', accent: '#55A868',
    wall: '#F0F7E8', roof: '#7FB069',
    dusk: false, landmarkSide: 'left',
    landmark(stage) {
      const x = 220, y = 335;
      if (stage === 0) {
        return `${plotOutline(x, y - 8, 116, 40, '#55A868')}
          ${surveyFlag(x - 50, y, '#55A868')}${bush(x + 30, y - 8, 1.1, '#8FC282', '#A8D69A')}`;
      }
      const r = 50 + stage * 18;
      return `<g>
        <ellipse cx="${x}" cy="${y + 2}" rx="${r + 30}" ry="14" fill="#2F5D3A" opacity="0.13"/>
        <rect x="${x - 13}" y="${y - 62}" width="26" height="64" rx="9" fill="#7A5230"/>
        <circle cx="${x}" cy="${y - 62 - r * 0.6}" r="${r}" fill="#66A85C"/>
        <circle cx="${x - r * 0.7}" cy="${y - 54 - r * 0.35}" r="${r * 0.55}" fill="#7FB56F"/>
        <circle cx="${x + r * 0.7}" cy="${y - 56 - r * 0.35}" r="${r * 0.58}" fill="#7FB56F"/>
        <path d="M${x - 10} ${y} V${y - 27} Q${x} ${y - 40} ${x + 10} ${y - 27} V${y} Z" fill="#4A3420"/>
        ${stage >= 2 ? `<path d="M${x + 36} ${y - 22} Q${x + 60} ${y - 6} ${x + 84} ${y - 22}" stroke="#B08650" stroke-width="4" fill="none"/><rect x="${x + 32}" y="${y - 26}" width="6" height="28" rx="3" fill="#8A5A2B"/><rect x="${x + 82}" y="${y - 26}" width="6" height="28" rx="3" fill="#8A5A2B"/>` : ''}
        ${stage >= 3 ? `<circle cx="${x - 26}" cy="${y - 86}" r="5" fill="#FFE9A8"/><circle cx="${x + 22}" cy="${y - 104}" r="5" fill="#FFE9A8"/><circle cx="${x - 2}" cy="${y - 124}" r="5" fill="#FFE9A8"/>` : ''}
      </g>`;
    },
  },

  // Pepper — Night Pathways: dusk world, raised walkways, drey workshop.
  'behaviour-engineer': {
    sky: ['#2E2A5C', '#6C5FA8'],
    hillFar: '#4A4380', hillNear: '#5C5494',
    tint: '#6C5FA8', accent: '#C9B8F0',
    wall: '#8578BD', roof: '#4A3E85',
    dusk: true, landmarkSide: 'right',
    landmark(stage) {
      const x = 950, y = 320;
      if (stage === 0) {
        return `${plotOutline(x, y - 6, 130, 36, '#C9B8F0')}
          ${surveyFlag(x - 56, y, '#C9B8F0')}${surveyFlag(x + 60, y - 6, '#C9B8F0')}`;
      }
      const spanW = 90 + stage * 50;
      let posts = '';
      for (let px = x - spanW; px <= x + spanW; px += 62) {
        posts += `<rect x="${px - 5}" y="${y - 56}" width="10" height="56" rx="4" fill="#3E3670"/>`;
      }
      return `<g>
        ${posts}
        <rect x="${x - spanW - 12}" y="${y - 68}" width="${spanW * 2 + 24}" height="13" rx="6.5" fill="#7A6BB5" stroke="#3E3670" stroke-width="3"/>
        <path d="M${x - spanW - 12} ${y - 73} H${x + spanW + 12}" stroke="#C9B8F0" stroke-width="3" stroke-dasharray="13 11" opacity="0.7"/>
        <circle cx="${x + spanW - 8}" cy="${y - 102}" r="${22 + stage * 4}" fill="#5C4E96" stroke="#C9B8F0" stroke-width="3"/>
        <circle cx="${x + spanW - 8}" cy="${y - 102}" r="9" fill="#2E2A5C"/>
        ${stage >= 2 ? `<circle cx="${x - spanW + 18}" cy="${y - 84}" r="6" fill="#FFE9A8"/><circle cx="${x}" cy="${y - 84}" r="6" fill="#FFE9A8"/>` : ''}
        ${stage >= 3 ? sparkles([[x - 52, y - 132, 1.1], [x + 34, y - 148, 1], [x - 116, y - 116, 0.9]], '#FFF8D0') : ''}
      </g>`;
    },
  },

  // Eddie — Shelter & Dig Site: warm earth, a burrow with a way back out.
  'resilience-architect': {
    sky: ['#BFE0F0', '#F4EFDD'],
    hillFar: '#CCAB7C', hillNear: '#B08F5E',
    tint: '#D9BE8C', accent: '#8F5D45',
    wall: '#F2E3C2', roof: '#B0714A',
    dusk: false, landmarkSide: 'right',
    landmark(stage) {
      const x = 970, y = 340;
      if (stage === 0) {
        return `${plotOutline(x, y - 8, 122, 40, '#8F5D45')}
          ${surveyFlag(x - 52, y, '#B0714A')}
          <ellipse cx="${x}" cy="${y - 4}" rx="32" ry="11" fill="#8A6844" opacity="0.5"/>`;
      }
      const domeR = 54 + stage * 15;
      return `<g>
        <ellipse cx="${x}" cy="${y}" rx="${domeR + 52}" ry="38" fill="#B08F5E"/>
        <path d="M${x - domeR} ${y} A${domeR} ${domeR * 0.82} 0 0 1 ${x + domeR} ${y} Z" fill="#C9A06B" stroke="#7A5230" stroke-width="3.5"/>
        <path d="M${x - 21} ${y} V${y - 30} Q${x} ${y - 46} ${x + 21} ${y - 30} V${y} Z" fill="#4A3420" stroke="#7A5230" stroke-width="3"/>
        <path d="M${x + domeR - 6} ${y} Q${x + domeR + 38} ${y - 26} ${x + domeR + 66} ${y - 56}" stroke="#E8D5A8" stroke-width="9" fill="none" stroke-linecap="round" stroke-dasharray="${stage >= 2 ? 'none' : '13 11'}"/>
        ${stage >= 2 ? `<rect x="${x - 52}" y="${y - domeR - 4}" width="104" height="8" rx="4" fill="#8A5A2B"/>` : ''}
        ${stage >= 3 ? `<path d="M${x - 3} ${y - domeR - 36} V${y - domeR - 4}" stroke="#8A5A2B" stroke-width="5"/><path d="M${x} ${y - domeR - 36} L${x + 27} ${y - domeR - 28} L${x} ${y - domeR - 20} Z" fill="#E0743D"/>` : ''}
      </g>`;
    },
  },

  // Kai — Town Square: the warm heart, fountain and gathering space.
  'social-mapper': {
    sky: ['#AEE0F5', '#FFF4DC'],
    hillFar: '#F2CE8C', hillNear: '#E3B369',
    tint: '#F2DFA8', accent: '#E0743D',
    wall: '#FFF3DC', roof: '#E0743D',
    dusk: false, landmarkSide: 'left',
    landmark(stage) {
      const x = 230, y = 340;
      if (stage === 0) {
        return `${plotOutline(x, y - 8, 122, 40, '#E0743D')}
          ${surveyFlag(x - 50, y, '#E0743D')}${surveyFlag(x + 54, y - 6, '#F2C230')}`;
      }
      return `<g>
        <ellipse cx="${x}" cy="${y}" rx="${96 + stage * 14}" ry="32" fill="#F2DFA8" stroke="#D9B978" stroke-width="3"/>
        <ellipse cx="${x}" cy="${y - 3}" rx="40" ry="15" fill="#7FB6D9" stroke="#5B8FB0" stroke-width="3"/>
        <rect x="${x - 7}" y="${y - 40}" width="14" height="36" rx="6" fill="#D9CBA8" stroke="#8A6D38" stroke-width="2.5"/>
        <ellipse cx="${x}" cy="${y - 42}" rx="23" ry="8" fill="#7FB6D9" stroke="#5B8FB0" stroke-width="2.5"/>
        ${stage >= 2 ? `<path d="M${x - 4} ${y - 54} Q${x} ${y - 66} ${x + 4} ${y - 54}" stroke="#AEDCF2" stroke-width="5" fill="none" stroke-linecap="round"/>` : ''}
        ${stage >= 3 ? buntingLine(x - 96, y - 52, x + 96, y - 52, ['#F2C230', '#E0743D', '#55A868', '#7FB6D9', '#C9B8F0']) : ''}
      </g>`;
    },
  },

  // Billie — Blueprint Burrows: cool forward blues, spiral mounds, plans.
  'future-designer': {
    sky: ['#B8E0F7', '#EAF6FF'],
    hillFar: '#A4CCE8', hillNear: '#88B4D9',
    tint: '#BDD9EE', accent: '#2F86C9',
    wall: '#EAF4FC', roof: '#2F86C9',
    dusk: false, landmarkSide: 'right',
    landmark(stage) {
      const x = 950, y = 335;
      if (stage === 0) {
        return `${plotOutline(x, y - 8, 122, 40, '#2F86C9')}
          <rect x="${x - 36}" y="${y - 62}" width="72" height="46" rx="6" fill="#3E6FA8" stroke="#2A4E78" stroke-width="3" transform="rotate(-4 ${x} ${y - 39})"/>
          <path d="M${x - 24} ${y - 50} H${x + 22} M${x - 24} ${y - 40} H${x + 8} M${x - 24} ${y - 30} H${x + 18}" stroke="#BFE0F5" stroke-width="3" transform="rotate(-4 ${x} ${y - 39})"/>`;
      }
      let mounds = '';
      const count = 1 + stage;
      for (let i = 0; i < count; i++) {
        const mx = x - 80 + i * 60, mr = 28 + (i % 2) * 9;
        mounds += `<path d="M${mx - mr} ${y} A${mr} ${mr * 0.8} 0 0 1 ${mx + mr} ${y} Z" fill="#A4C4E0" stroke="#5B8FB0" stroke-width="3"/>
          <path d="M${mx} ${y - mr * 0.34} m-${mr * 0.4} 0 a${mr * 0.4} ${mr * 0.32} 0 1 1 ${mr * 0.62} ${mr * 0.2}" fill="none" stroke="#2F86C9" stroke-width="3" stroke-linecap="round"/>`;
      }
      return `<g>
        ${mounds}
        <rect x="${x + 36}" y="${y - 80}" width="86" height="56" rx="7" fill="#3E6FA8" stroke="#2A4E78" stroke-width="3.5"/>
        <path d="M${x + 50} ${y - 64} H${x + 106} M${x + 50} ${y - 52} H${x + 86} M${x + 50} ${y - 40} H${x + 98}" stroke="#BFE0F5" stroke-width="3.5"/>
        ${stage >= 3 ? sparkles([[x - 36, y - 112, 1.1], [x + 80, y - 112, 1], [x + 16, y - 136, 0.9]], '#7FB6D9') : ''}
      </g>`;
    },
  },

  // Lenny — Works Depot: the build never stops; shed, crane, crates.
  'brain-builder': {
    sky: ['#B8D4F7', '#EDF4FF'],
    hillFar: '#A8BCD9', hillNear: '#8FA6C9',
    tint: '#C2D2E8', accent: '#6366F1',
    wall: '#EDF2FA', roof: '#6366F1',
    dusk: false, landmarkSide: 'left',
    landmark(stage) {
      const x = 240, y = 335;
      if (stage === 0) {
        return `${plotOutline(x, y - 8, 130, 42, '#6366F1')}
          ${surveyFlag(x - 56, y, '#6366F1')}${surveyFlag(x + 60, y - 6, '#F2953D')}
          <rect x="${x - 20}" y="${y - 22}" width="40" height="22" rx="4" fill="#B08650" stroke="#7A5230" stroke-width="2.5"/>`;
      }
      const shedW = 108 + stage * 20;
      return `<g>
        <ellipse cx="${x}" cy="${y + 3}" rx="${shedW * 0.7}" ry="13" fill="#2F5D3A" opacity="0.13"/>
        <rect x="${x - shedW / 2}" y="${y - 60}" width="${shedW}" height="60" rx="8" fill="#C9D4EE" stroke="#4A4E9E" stroke-width="3.5"/>
        <path d="M${x - shedW / 2 - 9} ${y - 60} L${x - shedW / 4} ${y - 86} L${x} ${y - 60} L${x + shedW / 4} ${y - 86} L${x + shedW / 2 + 9} ${y - 60} Z" fill="#6366F1" stroke="#4A4E9E" stroke-width="3" stroke-linejoin="round"/>
        <rect x="${x - 17}" y="${y - 38}" width="34" height="38" rx="5" fill="#4A4E9E"/>
        ${stage >= 2 ? `
          <rect x="${x + shedW / 2 + 22}" y="${y - 128}" width="9" height="128" fill="#F2953D" stroke="#B06A1E" stroke-width="2.5"/>
          <rect x="${x + shedW / 2 - 34}" y="${y - 128}" width="112" height="9" rx="4.5" fill="#F2953D" stroke="#B06A1E" stroke-width="2.5"/>
          <path d="M${x + shedW / 2 - 26} ${y - 119} V${y - 82}" stroke="#5A5A5A" stroke-width="3"/>
          <rect x="${x + shedW / 2 - 38}" y="${y - 82}" width="24" height="17" rx="4" fill="#B08650" stroke="#7A5230" stroke-width="2.5"/>` : ''}
        ${stage >= 3 ? `<circle cx="${x - shedW / 2 + 18}" cy="${y - 72}" r="12" fill="none" stroke="#F2C230" stroke-width="4.5"/><circle cx="${x - shedW / 2 + 40}" cy="${y - 67}" r="8" fill="none" stroke="#F2C230" stroke-width="3.5"/>` : ''}
      </g>`;
    },
  },
};

// Generic meadow fallback (unknown category / "all").
const DEFAULT_DISTRICT = {
  sky: ['#AEE3F5', '#F0FAFF'],
  hillFar: '#A8D69A', hillNear: '#8FC282',
  tint: '#BCE49E', accent: '#55A868',
  wall: '#FFF6E3', roof: '#E0743D',
  dusk: false, landmarkSide: 'right',
  landmark(stage) {
    const x = 970, y = 330;
    if (stage === 0) return plotOutline(x, y - 8, 116, 38, '#55A868');
    return tree(x, y, 2 + stage * 0.35, '#66A85C', '#7FB56F');
  },
};

// ── Per-module growth props ───────────────────────────────────────
// Twelve fixed anchor spots around the meadow edges (the centre column
// is kept clear for the road). Completing module N reveals prop N.

const GROWTH_SPOTS = [
  { x: 150, y: 470, kind: 'flower' },
  { x: 1055, y: 455, kind: 'flower' },
  { x: 92, y: 545, kind: 'bush' },
  { x: 1120, y: 565, kind: 'flower' },
  { x: 255, y: 605, kind: 'tree', s: 0.9 },
  { x: 962, y: 645, kind: 'bush' },
  { x: 182, y: 725, kind: 'flower' },
  { x: 1024, y: 735, kind: 'tree', s: 0.8 },
  { x: 342, y: 520, kind: 'rock' },
  { x: 860, y: 505, kind: 'flower' },
  { x: 300, y: 745, kind: 'bush' },
  { x: 884, y: 768, kind: 'flower' },
];

function renderGrowth(cfg, count, paved = false) {
  const leaf1 = cfg.dusk ? '#4A6B52' : '#66A85C';
  const leaf2 = cfg.dusk ? '#5C7D63' : '#7FB56F';
  const n = Math.max(0, Math.min(GROWTH_SPOTS.length, count));
  let s = '';
  for (let i = 0; i < n; i++) {
    const g = GROWTH_SPOTS[i];
    if (paved) {
      // A round garden bed so the prop sits in soil, not on pavement
      const bedFill = cfg.dusk ? '#5F8A5A' : '#8FC66A';
      const bedEdge = cfg.dusk ? '#42663F' : '#5D9A49';
      s += `<ellipse cx="${g.x}" cy="${g.y + 2}" rx="36" ry="14" fill="${bedFill}" stroke="${bedEdge}" stroke-width="2.5"/>`;
    }
    if (g.kind === 'flower') s += flowerPatch(g.x, g.y, 1.1, cfg.accent);
    else if (g.kind === 'bush') s += bush(g.x, g.y, 1.1, leaf1, leaf2);
    else if (g.kind === 'tree') s += tree(g.x, g.y, g.s || 1, leaf1, leaf2);
    else if (g.kind === 'rock') s += rock(g.x, g.y, 1);
  }
  return s;
}

// ── Scene assembly ────────────────────────────────────────────────

function buildScene(cfg, stage, growth) {
  const s = [];

  s.push(`<defs>
    <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${cfg.sky[0]}"/><stop offset="100%" stop-color="${cfg.sky[1]}"/>
    </linearGradient>
    <radialGradient id="meadowG" cx="50%" cy="18%" r="100%">
      <stop offset="0%" stop-color="#A8D67E"/><stop offset="55%" stop-color="#8FC66A"/><stop offset="100%" stop-color="#6FA854"/>
    </radialGradient>
  </defs>`);

  // Sky — a thin band; the world is mostly meadow so the road stays grounded
  s.push(`<rect width="${W}" height="${HORIZON + 60}" fill="url(#skyG)"/>`);
  if (cfg.dusk) {
    s.push(`<circle cx="1050" cy="66" r="30" fill="#F5EFD5"/><circle cx="1037" cy="58" r="27" fill="${cfg.sky[0]}"/>`);
    s.push(sparkles([[160, 44, 1.1], [420, 76, 0.9], [660, 36, 1], [880, 84, 0.8], [300, 104, 0.7]], '#FFF8D0'));
  } else {
    s.push(`<circle cx="1070" cy="64" r="34" fill="#FFE9A0"/><circle cx="1070" cy="64" r="50" fill="#FFE9A0" opacity="0.25"/>`);
    s.push(cloud(220, 60, 0.95), cloud(600, 42, 0.75, 0.7), cloud(880, 92, 0.6, 0.6));
  }

  // Far hill band
  s.push(`<path d="M0 ${HORIZON - 26} Q180 ${HORIZON - 62} 400 ${HORIZON - 32} T820 ${HORIZON - 46} T1200 ${HORIZON - 24} V${HORIZON + 40} H0 Z" fill="${cfg.hillFar}" opacity="0.85"/>`);

  // City skyline rises from BEHIND the near hills — bases occluded by the
  // hill crest so the buildings are grounded, never floating.
  if (stage >= 3) {
    const skl = [];
    const towers = [
      [80, 96, 66], [170, 128, 78], [268, 88, 60], [372, 148, 82], [468, 108, 66],
      [700, 138, 76], [800, 96, 62], [896, 156, 84], [1000, 112, 68], [1104, 132, 74],
    ];
    for (let i = 0; i < towers.length; i++) {
      const [tx, th, tw] = towers[i];
      const col = i % 2 ? cfg.roof : cfg.wall;
      skl.push(`<rect x="${tx - tw / 2}" y="${HORIZON + 26 - th}" width="${tw}" height="${th}" rx="7" fill="${col}" stroke="#4A4A6A" stroke-width="2.5" opacity="0.92"/>`);
      for (let r = 0; r < Math.floor(th / 40); r++) {
        skl.push(`<rect x="${tx - 14}" y="${HORIZON + 40 - th + r * 34}" width="11" height="12" rx="2.5" fill="#FFD66B"/><rect x="${tx + 3}" y="${HORIZON + 40 - th + r * 34}" width="11" height="12" rx="2.5" fill="#FFD66B"/>`);
      }
    }
    // A working crane on the skyline — the town is still growing
    skl.push(`<rect x="562" y="${HORIZON - 96}" width="7" height="120" fill="#F2953D"/><rect x="500" y="${HORIZON - 96}" width="120" height="7" rx="3.5" fill="#F2953D"/><path d="M508 ${HORIZON - 89} V${HORIZON - 62}" stroke="#5A5A5A" stroke-width="2.5"/><rect x="498" y="${HORIZON - 62}" width="20" height="14" rx="3" fill="#B08650"/>`);
    s.push(skl.join(''));
  }

  // Near hill band (covers skyline bases)
  s.push(`<path d="M0 ${HORIZON + 8} Q240 ${HORIZON - 34} 520 ${HORIZON - 4} T1200 ${HORIZON - 10} V${HORIZON + 70} H0 Z" fill="${cfg.hillNear}"/>`);

  // Ground plane: meadow until the district becomes a City — then the
  // whole ground is paved (no green-to-cement blending), with the sky,
  // hills and skyline staying as the backdrop.
  const cityMode = stage >= 3;
  if (cityMode) {
    const paveBase = groundColorFor(cfg, 3);
    s.push(`<rect y="${HORIZON + 30}" width="${W}" height="${H - HORIZON - 30}" fill="${paveBase}"/>`);
    s.push(pavement(paveBase, cfg.dusk, HORIZON + 30, H));
  } else {
    s.push(`<rect y="${HORIZON + 30}" width="${W}" height="${H - HORIZON - 30}" fill="url(#meadowG)"/>`);
    s.push(`<path d="M0 ${HORIZON + 44} Q300 ${HORIZON + 10} 640 ${HORIZON + 36} T1200 ${HORIZON + 28} V${HORIZON + 70} H0 Z" fill="url(#meadowG)"/>`);
    s.push(`<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="${cfg.tint}" opacity="${cfg.dusk ? 0.42 : 0.16}"/>`);
  }

  // ── The hill pass: the child's road arrives from over the hills ──
  // A small dark stub crests the pass; the real road (drawn by the map,
  // panning with this scene 1:1) continues down from here.
  const stubCol = cfg.dusk ? '#3A3468' : '#8B8B93';
  s.push(`<path d="M${ROAD_X - 26} ${HORIZON + 6} Q${ROAD_X} ${HORIZON - 26} ${ROAD_X + 26} ${HORIZON + 6} L${ROAD_X + 40} ${HORIZON + 34} H${ROAD_X - 40} Z" fill="${cfg.hillNear}"/>`);
  s.push(`<path d="M${ROAD_X} ${HORIZON - 14} Q${ROAD_X - 4} ${HORIZON + 8} ${ROAD_X} ${HORIZON + 30}" stroke="${stubCol}" stroke-width="34" fill="none" stroke-linecap="round" opacity="0.9"/>`);
  s.push(`<path d="M${ROAD_X} ${HORIZON - 12} Q${ROAD_X - 3} ${HORIZON + 8} ${ROAD_X} ${HORIZON + 28}" stroke="#FFF8E0" stroke-width="3" stroke-dasharray="10 12" fill="none" opacity="0.7"/>`);

  // District landmark (grounded in the upper meadow)
  s.push(cfg.landmark(stage));

  // Framing greenery — wild trees on meadow; planted street trees in a city
  const leaf1 = cfg.dusk ? '#4A6B52' : '#66A85C';
  const leaf2 = cfg.dusk ? '#5C7D63' : '#7FB56F';
  if (cityMode) {
    s.push(planterTree(60, 440, leaf1, leaf2), planterTree(1148, 430, leaf1, leaf2), planterTree(40, 690, leaf1, leaf2), planterTree(1160, 700, leaf1, leaf2));
  } else {
    s.push(tree(60, 440, 1.2, leaf1, leaf2), tree(1148, 430, 1.25, leaf1, leaf2), tree(40, 690, 1.45, leaf1, leaf2), tree(1160, 700, 1.35, leaf1, leaf2));
  }

  // In a city, growth props render BEFORE the buildings so their garden
  // beds sit behind the towers instead of floating on top of them.
  if (cityMode) s.push(renderGrowth(cfg, growth, true));

  // ── Stage dressing — each stage must be readable at a glance ──
  const oppositeX = cfg.landmarkSide === 'left' ? 1 : -1; // put clusters opposite the landmark first

  if (stage === 0) {
    // TRAILHEAD: wild land. Trailhead sign + tent + campsite, dirt patches,
    // survey pegs, dashed plots where the village will grow. Zero buildings.
    s.push(dirtPatch(200, 560, 90, 26), dirtPatch(1010, 600, 100, 30), dirtPatch(320, 700, 70, 22));
    s.push(trailSign(880, 560, 1.15));
    s.push(tent(160, 640, 1.15, cfg.roof, cfg.wall));
    s.push(`<circle cx="250" cy="668" r="12" fill="none" stroke="#8A5A2B" stroke-width="4"/><path d="M244 664 L256 656 M256 664 L244 656" stroke="#B06A1E" stroke-width="4" stroke-linecap="round"/>`);
    s.push(plotOutline(160, 545, 84, 30, cfg.accent), plotOutline(1040, 690, 92, 32, cfg.accent), plotOutline(950, 470, 70, 26, cfg.accent));
    s.push(surveyFlag(260, 520, cfg.accent), surveyFlag(1105, 640, cfg.accent), surveyFlag(1000, 505, cfg.accent));
    s.push(rock(400, 640, 1.1), rock(806, 690, 0.9));
  }

  if (stage >= 1) {
    // VILLAGE: the first cottages and fences appear where the plots were.
    s.push(house(160, 560, 1, cfg.wall, cfg.roof, stage >= 2));
    s.push(house(1046, 700, 1.1, cfg.wall, cfg.roof, stage >= 2));
    s.push(house(956, 480, 0.85, cfg.wall, cfg.roof, stage >= 2));
    if (!cityMode) {
      // Farm fences and dirt belong on grass, not on city pavement
      s.push(fence(66, 632, 200), fence(940, 760, 210));
      s.push(dirtPatch(240, 640, 60, 18));
    }
  }

  if (stage >= 2) {
    // TOWN CENTRE: shops with awnings, a clock tower, lamps, a wide paved
    // plaza, and the first mid-rise blocks — a town on its way to city.
    s.push(shop(190, 700, 1, cfg.wall, cfg.accent));
    s.push(shop(1080, 545, 0.95, cfg.wall, cfg.roof));
    s.push(clockTower(330, 585, 1, cfg.wall, cfg.roof));
    s.push(tallBuilding(80, 470, 0.7, cfg.wall, cfg.roof, 3));
    s.push(tallBuilding(1004, 668, 0.72, cfg.wall, cfg.roof, 3));
    if (!cityMode) s.push(`<ellipse cx="${ROAD_X + 10}" cy="756" rx="280" ry="42" fill="#E3D5B0" opacity="${cfg.dusk ? 0.3 : 0.55}"/>`);
    s.push(lamp(430, 590), lamp(790, 620), lamp(360, 760), lamp(850, 770));
  }

  if (stage >= 3) {
    // CITY: the ground is already paved — varied lit towers with rooftop
    // water tanks and antennas close in on both sides, parked cars,
    // lamps line the road, bunting, celebration.
    s.push(cityTower(cfg, 92, 590, 1.1, 5, 'wt'));
    s.push(cityTower(cfg, 1136, 620, 1.15, 6, 'ant'));
    s.push(cityTower(cfg, 268, 470, 0.9, 4, 'ant'));
    s.push(cityTower(cfg, 930, 630, 1, 5, 'wt'));
    s.push(cityTower(cfg, 210, 712, 0.95, 4));
    s.push(cityTower(cfg, 996, 726, 0.9, 4));
    s.push(car(352, 772, cfg.accent), car(856, 780, '#5B8FB0', true));
    s.push(lamp(430, 440), lamp(790, 470));
    s.push(buntingLine(430, 528, 780, 516, [cfg.accent, cfg.roof, '#F2C230', cfg.accent, cfg.roof]));
    s.push(sparkles([[400, 420, 1.2], [790, 396, 1], [520, 462, 0.8], [720, 700, 0.9]], cfg.dusk ? '#FFF8D0' : '#FFDF7E'));
  }

  // Per-module growth props — every completed module leaves a mark
  // (already rendered earlier in city mode, behind the buildings)
  if (!cityMode) s.push(renderGrowth(cfg, growth));

  // Fade the bottom edge to the flat ground colour so the scene blends
  // seamlessly into the filler that continues beneath it (meadow for the
  // early stages, concrete pavement once the district is a city).
  const ground = groundColorFor(cfg, stage);
  s.push(`<defs><linearGradient id="groundFadeG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${ground}" stop-opacity="0"/>
    <stop offset="100%" stop-color="${ground}" stop-opacity="1"/>
  </linearGradient></defs>`);
  s.push(`<rect y="${H - 120}" width="${W}" height="120" fill="url(#groundFadeG)"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${s.join('')}</svg>`;
}

// ── Ground colour + seamless meadow filler tile ───────────────────
// The adventure canvas is far taller than one scene, so beneath the
// scene a flat meadow (matching the scene's faded bottom edge exactly)
// continues for the rest of the road, with subtle grass details.

function mixHex(a, b, t) {
  const pa = a.match(/\w\w/g).map(h => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map(h => parseInt(h, 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function groundColorFor(cfg, stage = 0) {
  // From the City stage the district is paved: the ground reads as
  // warm concrete (with only a hint of the district palette).
  if (stage >= 3) {
    return cfg.dusk ? mixHex('#6E6B8A', cfg.tint, 0.18) : mixHex('#C9C6BE', cfg.tint, 0.1);
  }
  return mixHex('#6FA854', cfg.tint, cfg.dusk ? 0.42 : 0.16);
}

// ── Repeating scenery tile ────────────────────────────────────────
// Continues the district down the WHOLE road, not just the first
// screen: the filler that repeats under the header scene carries the
// same stage of buildings, so a City stays a city all the way down.
// Top and bottom edges are pure flat ground so vertical tiling is
// seamless; the centre column stays clear for the road.

function buildFillerTile(cfg, stage) {
  const s = [];
  const base = groundColorFor(cfg, stage);
  const dark = mixHex(base, '#1E3D28', 0.16);
  const light = mixHex(base, '#FFFFFF', 0.1);
  const leaf1 = cfg.dusk ? '#4A6B52' : '#66A85C';
  const leaf2 = cfg.dusk ? '#5C7D63' : '#7FB56F';
  const lit = stage >= 2;
  // The city tile is double height: two street sections with different
  // block layouts, so the repeat is half as frequent and far harder to
  // spot than a single copied screen.
  const TH = stage >= 3 ? 1600 : H;

  s.push(`<rect width="${W}" height="${TH}" fill="${base}"/>`);

  if (stage >= 3) {
    // CITY TILE: a real streetscape. Cross streets with zebra crossings
    // and parked cars (the child's winding road passes over them like
    // intersections), blocks of varied towers fronting the streets with
    // rooftop water towers and antennas, kerbed pocket lawns, planter
    // trees, and lamp posts hugging the road corridor.
    const joint = mixHex(base, cfg.dusk ? '#141227' : '#39414E', 0.3);
    const carCols = [cfg.accent, '#5B8FB0', '#E0743D', '#55A868'];

    s.push(pavement(base, cfg.dusk, 0, TH));
    s.push(`<circle cx="390" cy="170" r="14" fill="none" stroke="${joint}" stroke-width="4" opacity="0.45"/>`);
    s.push(`<circle cx="815" cy="580" r="13" fill="none" stroke="${joint}" stroke-width="4" opacity="0.45"/>`);
    s.push(`<circle cx="390" cy="960" r="13" fill="none" stroke="${joint}" stroke-width="4" opacity="0.45"/>`);
    s.push(`<circle cx="815" cy="1390" r="14" fill="none" stroke="${joint}" stroke-width="4" opacity="0.45"/>`);

    // ── Section A (0-800): street with blocks either side ──
    s.push(sideStreet(330, cfg.dusk));
    s.push(cityTower(cfg, 90, 320, 0.95, 5, 'wt'));
    s.push(cityTower(cfg, 205, 320, 0.8, 3));
    s.push(shop(320, 320, 0.85, cfg.wall, cfg.accent));
    s.push(cityTower(cfg, 872, 320, 0.85, 4));
    s.push(cityTower(cfg, 995, 320, 1, 6, 'ant'));
    s.push(cityTower(cfg, 1118, 320, 0.8, 3));
    s.push(car(180, 408, carCols[0]));
    s.push(car(950, 384, carCols[1], true));
    s.push(lawn(64, 470, 205, 96, cfg, leaf1, leaf2));
    s.push(cityTower(cfg, 100, 770, 1, 6, 'ant'));
    s.push(cityTower(cfg, 235, 760, 0.85, 4));
    s.push(shop(345, 770, 0.9, cfg.wall, cfg.roof));
    s.push(cityTower(cfg, 868, 745, 0.8, 3));
    s.push(cityTower(cfg, 990, 775, 0.95, 5, 'wt'));
    s.push(cityTower(cfg, 1112, 765, 0.85, 4));

    // ── Section B (800-1600): same bones, different block mix ──
    s.push(sideStreet(1130, cfg.dusk));
    s.push(cityTower(cfg, 95, 1120, 0.85, 4, 'ant'));
    s.push(cityTower(cfg, 215, 1120, 1, 6));
    s.push(cityTower(cfg, 335, 1120, 0.75, 3));
    s.push(shop(875, 1120, 0.9, cfg.wall, cfg.accent));
    s.push(cityTower(cfg, 990, 1120, 0.85, 4, 'wt'));
    s.push(cityTower(cfg, 1115, 1120, 0.95, 5));
    s.push(car(280, 1208, carCols[2], true));
    s.push(car(1055, 1184, carCols[3]));
    s.push(lawn(936, 1270, 205, 96, cfg, leaf1, leaf2));
    s.push(cityTower(cfg, 105, 1545, 0.9, 5));
    s.push(cityTower(cfg, 240, 1535, 0.8, 3, 'wt'));
    s.push(cityTower(cfg, 355, 1545, 0.85, 4));
    s.push(cityTower(cfg, 875, 1545, 0.95, 5, 'ant'));
    s.push(cityTower(cfg, 1000, 1535, 0.8, 3));
    s.push(cityTower(cfg, 1120, 1545, 0.9, 4));

    // ── Street furniture down the road corridor ──
    s.push(planterTree(352, 486, leaf1, leaf2), planterTree(846, 486, leaf1, leaf2));
    s.push(planterTree(352, 1288, leaf1, leaf2), planterTree(846, 1288, leaf1, leaf2));
    s.push(planterTree(60, 1000, leaf1, leaf2), planterTree(1140, 640, leaf1, leaf2));
    s.push(lamp(436, 240), lamp(776, 200), lamp(436, 600), lamp(776, 650));
    s.push(lamp(436, 1040), lamp(776, 1000), lamp(436, 1400), lamp(776, 1450));

    s.push(buntingLine(880, 1056, 1118, 1042, [cfg.accent, cfg.roof, '#F2C230', cfg.accent]));
    s.push(sparkles([[420, 120, 1], [790, 700, 0.9], [420, 900, 0.9], [780, 1500, 1]], cfg.dusk ? '#FFF8D0' : '#FFDF7E'));
  } else {
    // Soft meadow variation (kept away from the tile edges)
    s.push(`<ellipse cx="300" cy="330" rx="230" ry="80" fill="${light}" opacity="0.28"/>`);
    s.push(`<ellipse cx="920" cy="560" rx="260" ry="90" fill="${dark}" opacity="0.18"/>`);

    const tuft = (x, y) => `<path d="M${x} ${y} q4 -14 8 0 M${x + 8} ${y + 2} q4 -12 8 0 M${x - 7} ${y + 2} q4 -11 7 0" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    s.push(tuft(380, 200), tuft(830, 420), tuft(180, 640), tuft(1010, 160));

    // Framing greenery on every tile
    s.push(tree(90, 200, 1.2, leaf1, leaf2), tree(1116, 260, 1.25, leaf1, leaf2));
    s.push(tree(64, 640, 1.3, leaf1, leaf2), tree(1140, 690, 1.2, leaf1, leaf2));
    s.push(bush(255, 155, 1, leaf1, leaf2), bush(950, 700, 1.1, leaf1, leaf2));

    if (stage === 0) {
      // Wild trail country
      s.push(dirtPatch(190, 420, 84, 26), dirtPatch(1020, 500, 92, 28));
      s.push(rock(346, 300, 1), rock(852, 150, 0.9), rock(240, 560, 0.8));
      s.push(surveyFlag(152, 520, cfg.accent), plotOutline(1048, 330, 84, 30, cfg.accent));
    }
    if (stage >= 1) {
      // Village lanes
      s.push(house(176, 360, 1, cfg.wall, cfg.roof, lit));
      s.push(house(1046, 540, 1.05, cfg.wall, cfg.roof, lit));
      s.push(fence(84, 440, 180), fence(944, 620, 190));
    }
    if (stage >= 2) {
      // Town centre bustle: paved corners, shops, mid-rise blocks,
      // and lamps hugging the road on both sides
      s.push(`<ellipse cx="190" cy="590" rx="230" ry="60" fill="#E3D5B0" opacity="${cfg.dusk ? 0.3 : 0.6}"/>`);
      s.push(`<ellipse cx="1000" cy="290" rx="220" ry="56" fill="#E3D5B0" opacity="${cfg.dusk ? 0.3 : 0.6}"/>`);
      s.push(shop(190, 620, 0.95, cfg.wall, cfg.accent));
      s.push(shop(1064, 250, 0.9, cfg.wall, cfg.roof));
      s.push(tallBuilding(316, 500, 0.78, cfg.wall, cfg.roof, 3));
      s.push(tallBuilding(900, 400, 0.7, cfg.wall, cfg.roof, 3));
      s.push(lamp(430, 330), lamp(790, 300), lamp(430, 690), lamp(790, 640));
    }
  }

  // Fade both edges to flat ground for a seamless vertical repeat
  s.push(`<defs>
    <linearGradient id="tileTopG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${base}" stop-opacity="1"/><stop offset="100%" stop-color="${base}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="tileBotG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${base}" stop-opacity="0"/><stop offset="100%" stop-color="${base}" stop-opacity="1"/>
    </linearGradient>
  </defs>`);
  s.push(`<rect width="${W}" height="46" fill="url(#tileTopG)"/>`);
  s.push(`<rect y="${TH - 46}" width="${W}" height="46" fill="url(#tileBotG)"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${TH}" preserveAspectRatio="xMidYMid slice">${s.join('')}</svg>`;
}

const _fillerCache = new Map();

export function getZoneFillerCss(slug, stage) {
  const st = Math.max(0, Math.min(3, stage | 0));
  const key = `${slug}:${st}`;
  if (!_fillerCache.has(key)) {
    const cfg = DISTRICTS[slug] || DEFAULT_DISTRICT;
    _fillerCache.set(key, `url("data:image/svg+xml,${encodeURIComponent(buildFillerTile(cfg, st))}")`);
  }
  return _fillerCache.get(key);
}

const _groundCache = new Map();

export function getZoneGround(slug, stage = 0) {
  const st = Math.max(0, Math.min(3, stage | 0));
  const key = `${slug}:${st >= 3 ? 'city' : 'meadow'}`;
  if (!_groundCache.has(key)) {
    const cfg = DISTRICTS[slug] || DEFAULT_DISTRICT;
    const base = groundColorFor(cfg, st);
    const dark = mixHex(base, st >= 3 ? '#3A4150' : '#1E3D28', 0.16);
    const light = mixHex(base, '#FFFFFF', 0.1);
    const T = 420;
    // City ground is concrete (panel joints); earlier stages are meadow
    const detail = st >= 3
      ? `<path d="M0 140 H${T} M0 300 H${T} M210 0 V${T}" stroke="${dark}" stroke-width="3" opacity="0.4" fill="none"/>
         <circle cx="110" cy="220" r="12" fill="none" stroke="${dark}" stroke-width="3.5" opacity="0.5"/>`
      : (() => {
          const tuft = (x, y) => `<path d="M${x} ${y} q4 -14 8 0 M${x + 8} ${y + 2} q4 -12 8 0 M${x - 7} ${y + 2} q4 -11 7 0" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
          return `${tuft(64, 252)}${tuft(302, 122)}${tuft(186, 382)}${tuft(360, 30)}`;
        })();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}">
      <rect width="${T}" height="${T}" fill="${base}"/>
      <ellipse cx="84" cy="92" rx="64" ry="24" fill="${light}" opacity="0.4"/>
      <ellipse cx="332" cy="304" rx="76" ry="28" fill="${dark}" opacity="0.25"/>
      ${detail}
      <circle cx="242" cy="62" r="4" fill="${light}"/>
      <circle cx="122" cy="332" r="4" fill="${light}"/>
      <circle cx="398" cy="210" r="3.4" fill="${light}"/>
    </svg>`;
    _groundCache.set(key, {
      color: base,
      tile: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    });
  }
  return _groundCache.get(key);
}

// ── Public API ────────────────────────────────────────────────────

const _sceneCache = new Map();
const CACHE_LIMIT = 16;

/**
 * CSS background-image value for a Super Skill's district scene.
 * @param {string} slug      Super Skill slug (e.g. 'social-mapper')
 * @param {number} stage     Town stage 0-3 (Trailhead → City)
 * @param {number} completed Completed module count — each one adds a prop
 */
export function getZoneSceneCss(slug, stage, completed = 0) {
  const st = Math.max(0, Math.min(3, stage | 0));
  const growth = Math.max(0, Math.min(GROWTH_SPOTS.length, completed | 0));
  const key = `${slug}:${st}:${growth}`;
  if (!_sceneCache.has(key)) {
    if (_sceneCache.size >= CACHE_LIMIT) {
      _sceneCache.delete(_sceneCache.keys().next().value);
    }
    const cfg = DISTRICTS[slug] || DEFAULT_DISTRICT;
    _sceneCache.set(key, `url("data:image/svg+xml,${encodeURIComponent(buildScene(cfg, st, growth))}")`);
  }
  return _sceneCache.get(key);
}
