// ================================================
// CHILD AVATARS
// Avatars are stored on children.avatar as a short string. Two kinds:
//   * 'dd:<name>'  — a Brain Town character image (real commissioned art)
//   * anything else — a legacy emoji (rendered by Twemoji site-wide)
//
// Always render through childAvatarHTML() so both kinds work everywhere
// (dashboard, profile, practitioner hub, pickers). The <img> is sized in
// em units, so it scales with the font-size of wherever it's placed —
// exactly like the emoji it replaces.
// ================================================

import { escapeHtml } from './sanitize.js'

const CREW_DIR = '/images/characters/superskill-characters'

export const DD_AVATARS = {
  'dd:daniel': { src: '/images/characters/DanielTheDog.webp', name: 'Daniel' },
  'dd:coco':   { src: `${CREW_DIR}/Coco.webp`,   name: 'Coco' },
  'dd:kip':    { src: `${CREW_DIR}/Kip.webp`,    name: 'Kip' },
  'dd:lenny':  { src: `${CREW_DIR}/Lenny.webp`,  name: 'Lenny' },
  'dd:pepper': { src: `${CREW_DIR}/Pepper.webp`, name: 'Pepper' },
  'dd:eddie':  { src: `${CREW_DIR}/Eddie.webp`,  name: 'Eddie' },
  'dd:kai':    { src: `${CREW_DIR}/Kai.webp`,    name: 'Kai' },
  'dd:billie': { src: `${CREW_DIR}/Billie.webp`, name: 'Billie' }
}

export function isCrewAvatar(value) {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DD_AVATARS, value)
}

/**
 * HTML for a child's avatar. Safe to drop into innerHTML anywhere.
 * Character avatars render as an image scaled to the local font size;
 * emoji avatars render as escaped text (Twemoji picks them up).
 */
export function childAvatarHTML(value, fallback = '🦊') {
  const v = value || fallback
  const crew = DD_AVATARS[v]
  if (crew) {
    return `<img src="${crew.src}" alt="${escapeHtml(crew.name)}" class="dd-avatar-img" ` +
      `style="width:1.15em;height:1.15em;object-fit:contain;vertical-align:-0.18em;" ` +
      `loading="lazy" decoding="async" draggable="false">`
  }
  return escapeHtml(v)
}
