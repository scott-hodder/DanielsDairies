// ================================================
// DAILY TOWN EVENTS
// One tiny character moment per day on the Brain Town map. Deterministic
// (date + childId) so no server scheduling; completion is per-day in
// localStorage; the only write is the star reward. Part of the town_play
// layer (see townPlayFlag.js).
// ================================================

import { supabase } from '../../supabaseClient.js'
import { escapeHtml } from '../../lib/sanitize.js'
import { isTownPlayEnabled } from './townPlayFlag.js'
import { trackEvent } from '../../lib/telemetry.js'

// The real Brain Town crew (native Australian animals — matched to the
// characters table; images load from the DB at init, emoji are fallbacks).
const CHARS = {
  lenny: { name: 'Lenny', species: 'Border Collie', emoji: '🐶', skill: 'Brain Builder', slug: 'brain-builder' },
  coco: { name: 'Coco', species: 'Cockatoo', emoji: '🦜', skill: 'Thought Driver', slug: 'thought-driver' },
  kip: { name: 'Kip', species: 'Koala', emoji: '🐨', skill: 'Emotion Navigator', slug: 'emotion-navigator' },
  pepper: { name: 'Pepper', species: 'Possum', emoji: '🐾', skill: 'Behaviour Engineer', slug: 'behaviour-engineer' },
  eddie: { name: 'Eddie', species: 'Echidna', emoji: '🦔', skill: 'Resilience Architect', slug: 'resilience-architect' },
  kai: { name: 'Kai', species: 'Kookaburra', emoji: '🐦', skill: 'Social Mapper', slug: 'social-mapper' },
  billie: { name: 'Billie', species: 'Bilby', emoji: '🐰', skill: 'Future Designer', slug: 'future-designer' },
  daniel: { name: 'Daniel', species: 'Golden Retriever', emoji: '🐕', skill: 'Brain Town', slug: null }
}

// type 'choice': pick the helpful idea. type 'feeling': name a feeling.
// type 'breath': three slow breaths together. Every option is safe — "good"
// just picks which warm reply the character gives.
const EVENTS = [
  // Kip the Koala — Emotion Navigator
  { c: 'kip', t: 'choice', line: "My tummy feels fluttery about climbing a new tree. What could I try?", opts: ["Take three slow koala breaths", "Pretend the flutters aren't there", "Tell a friend how I feel"], good: [0, 2], yes: "That really helps! Naming a feeling and breathing slow makes the flutters smaller.", hmm: "Hiding a feeling makes it sneaky. Naming it or breathing slow works better!" },
  { c: 'kip', t: 'feeling', line: "I'm doing my feelings check from my gum tree! Which feeling visited YOU today?", yes: "Thanks for telling me! Every feeling is okay — even the wobbly ones." },
  { c: 'kip', t: 'choice', line: "Daniel looks grumpy today. What's a kind first step?", opts: ["Ask him what's up", "Tell him to cheer up", "Give him space, then check in"], good: [0, 2], yes: "Yes! Asking, or gently waiting, shows you care about his feelings.", hmm: "'Cheer up' can feel like nobody's listening. Asking what's up works better!" },
  { c: 'kip', t: 'breath', line: "Koalas are the best slow breathers in the whole bush. Three slow ones with me?", yes: "Ahh, much calmer. Slow like a koala — that's the trick." },
  // Lenny the Border Collie — Brain Builder
  { c: 'lenny', t: 'choice', line: "I'm learning to round up the sheep a new way, but I keep forgetting it. What makes a memory road stronger?", opts: ["Practising it again today", "Doing it once and hoping", "Waiting until next month"], good: [0], yes: "Exactly! Every practice run makes the road in my brain wider and clearer.", hmm: "One run makes a faint path. Practising again is what builds the road!" },
  { c: 'lenny', t: 'choice', line: "I've been fetching and learning all morning and my brain feels tired. What helps it grow best now?", opts: ["A rest and a big drink of water", "Pushing through for hours more", "Giving up on learning"], good: [0], yes: "Smart! Brains build their best roads when they get breaks too.", hmm: "Tired brains build wobbly roads. A rest helps the building crew!" },
  { c: 'lenny', t: 'breath', line: "Big construction day in Brain Town! Sit and stay… and breathe slow with me first?", yes: "Perfect. A calm brain is a brilliant builder. Now — let's build!" },
  // Coco the Cockatoo — Thought Driver
  { c: 'coco', t: 'choice', line: "SQUAWK! A thought keeps repeating in my head: 'I always mess up!' Cockatoos are great at repeating things… but which thought SHOULD I repeat?", opts: ["'Everyone practises to get better'", "'The squawky thought must be true'", "'I messed up once, not always'"], good: [0, 2], yes: "Nice steering! I'll repeat THAT one instead. What you repeat is what you believe!", hmm: "Squawky thoughts aren't always true! Check the facts and repeat a fairer one." },
  { c: 'coco', t: 'choice', line: "My head feels like a whole flock of thoughts flapping at once! What un-crowds a busy mind?", opts: ["Notice each thought and let it fly past", "Squawk at every thought", "Chase every thought at once"], good: [0], yes: "Lovely flying! Watching thoughts glide past without chasing them is a real skill.", hmm: "Chasing every thought wears your wings out. Just watch them fly past!" },
  { c: 'coco', t: 'breath', line: "Even loud cockatoos go quiet to preen their feathers. Three slow, quiet breaths with me?", yes: "Feathers smooth, mind smooth. Now I can pick my thoughts instead of them picking me!" },
  // Pepper the Possum — Behaviour Engineer
  { c: 'pepper', t: 'choice', line: "I want to remember to stash my snacks every night before bed. What's the best possum trick?", opts: ["Stash them right after sunset, every night", "Hope I remember", "Only stash when I feel like it"], good: [0], yes: "That's habit-building! Same time, same trigger — soon it happens all by itself.", hmm: "Hoping is wobbly. Hooking a habit to sunset makes it automatic!" },
  { c: 'pepper', t: 'choice', line: "Oops — I skipped my tidy-branch habit last night. What now?", opts: ["Start again tonight, no big deal", "Give up forever", "Feel bad about it all week"], good: [0], yes: "Exactly! Missing one night doesn't break the habit — restarting is the skill.", hmm: "One missed night is just a wobbly branch. Restart tonight and keep climbing!" },
  { c: 'pepper', t: 'breath', line: "New habit under construction! Possums start the night calm — three slow breaths before we build?", yes: "Lovely. Small steps, every night — that's how big things get built." },
  // Eddie the Echidna — Resilience Architect
  { c: 'eddie', t: 'choice', line: "When things get scary I curl into a spiky ball. Sometimes that's smart! But when the scary bit passes, what should I do?", opts: ["Uncurl and try again", "Stay curled up forever", "Decide the world is too spiky"], good: [0], yes: "Yes! Curling up is okay for a moment — uncurling and trying again is resilience.", hmm: "Staying curled forever means missing all the good bits. Uncurl and try again!" },
  { c: 'eddie', t: 'choice', line: "My burrow collapsed AGAIN. What would a resilience architect do?", opts: ["Look at what happened and dig a better one", "Never dig again", "Blame the dirt"], good: [0], yes: "Every collapsed burrow teaches the next one how to hold. Dig on!", hmm: "The dirt's just dirt — and quitting means no burrows ever. Learn and re-dig!" },
  { c: 'eddie', t: 'breath', line: "A storm's rumbling over my burrow. Breathe slow with me while it passes?", yes: "See? Storms pass. And you're still standing — spikes and all. That's resilience." },
  // Kai the Kookaburra — Social Mapper
  { c: 'kai', t: 'choice', line: "From my high branch I can see a new kid sitting alone at lunch. What's a friendly move?", opts: ["Fly down, say hi and ask their name", "Stare from the branch", "Wait for them to come to me"], good: [0], yes: "That hello could make their whole week! Best view in the bush is up close.", hmm: "New kids usually can't make the first move. A simple hi opens everything!" },
  { c: 'kai', t: 'choice', line: "Kookaburras love a big laugh — but my friend went quiet when everyone laughed at their stumble. What happened?", opts: ["Laughing AT someone can hurt", "They're no fun", "Nothing, laughs are always fine"], good: [0], yes: "Spot on. Laughing WITH friends is joy; laughing AT them stings. Big difference!", hmm: "Look closer — laughing AT someone stings. Laughing WITH them is where the fun is." },
  { c: 'kai', t: 'feeling', line: "I'm doing my morning fly-over, checking how everyone in town is feeling. What's YOUR weather today?", yes: "Added to my map! Knowing your own weather helps you read everyone else's." },
  // Billie the Bilby — Future Designer
  { c: 'billie', t: 'choice', line: "I dream of digging the greatest burrow in Brain Town. What's the best next step?", opts: ["One small dig this week", "Just imagine it forever", "Wait until I'm older"], good: [0], yes: "Dream + tiny dig = future magic. That's the whole recipe!", hmm: "Dreams need paws! One small dig starts the whole burrow." },
  { c: 'billie', t: 'choice', line: "My big bilby ears can hear TWO tomorrows: one where I practised today, one where I didn't. Which sounds better?", opts: ["The practised one", "The didn't one", "Can't tell"], good: [0], yes: "Right? Future-you is built by today-you. Sneaky, but wonderful.", hmm: "Listen again — future-you always sounds happier when today-you did one small thing!" },
  { c: 'billie', t: 'feeling', line: "Designing tomorrow starts with today. How are you feeling as we start planning?", yes: "Noted, designer! Knowing how you feel is step one of every good plan." },
  // Daniel the Golden Retriever — the guide
  { c: 'daniel', t: 'breath', line: "Woof! I missed you! Quick — three happy belly breaths before we play?", yes: "Wag wag wag. You always make Brain Town feel calmer." },
  { c: 'daniel', t: 'feeling', line: "Woof! Before we explore — how's your inside weather right now?", yes: "Thanks for telling me. Whatever the weather, we explore together!" },
  { c: 'daniel', t: 'choice', line: "I found a muddy puddle of grumpy feelings on Main Street! What should we do with it?", opts: ["Name it, then splash right through", "Pretend it isn't there", "Build a house in it and stay"], good: [0], yes: "SPLASH! Feelings you name are way less muddy. Onwards!", hmm: "Ignoring puddles makes them deeper, and living in one is soggy. Name it and splash through!" }
]

const FEELINGS = ['😄 Happy', '😌 Calm', '😐 Okay', '😟 Worried', '😢 Sad', '😠 Cross']

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function todayKey() { return dateKey(new Date()) }

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Who needs the child tomorrow? (Same deterministic pick the event system
 * itself will make.) Used by "come back tomorrow" hooks across the app.
 */
export function tomorrowEventChar(childId) {
  const t = new Date()
  t.setDate(t.getDate() + 1)
  const ev = EVENTS[hashStr(dateKey(t) + '|' + childId) % EVENTS.length]
  const ch = CHARS[ev.c]
  return { name: ch.name, emoji: ch.emoji }
}

async function awardStar(childId) {
  try {
    const { data } = await supabase.from('children').select('stars').eq('id', childId).maybeSingle()
    const next = (data?.stars || 0) + 1
    await supabase.from('children').update({ stars: next }).eq('id', childId)
    document.querySelectorAll('#totalStars, #childStars, .stars-count, [data-stars]').forEach(el => { el.textContent = next })
    return next
  } catch (e) {
    console.error('Town event star award failed:', e)
    return null
  }
}

function injectStyles() {
  if (document.getElementById('townEventStyles')) return
  const st = document.createElement('style')
  st.id = 'townEventStyles'
  st.textContent = `
.te-chip{position:absolute;left:14px;top:14px;z-index:60;display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.97);border:2px solid #8b5cf6;border-radius:999px;padding:8px 14px;font-family:'Fredoka',system-ui,sans-serif;font-size:14px;font-weight:700;color:#16324f;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.15);animation:teBob 2.4s ease-in-out infinite}
@keyframes teBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.te-chip.done{border-color:#c9d4e2;animation:none;opacity:.85}
.te-overlay{position:fixed;inset:0;z-index:11000;background:rgba(22,50,79,.78);display:flex;align-items:center;justify-content:center;padding:16px}
.te-card{background:#fffdf7;border-radius:24px;max-width:420px;width:100%;padding:26px 22px;text-align:center;font-family:'Nunito',system-ui,sans-serif;box-shadow:0 24px 60px rgba(0,0,0,.4)}
.te-who{font-size:44px;line-height:1;margin-bottom:4px}
.te-name{font-family:'Fredoka',sans-serif;font-size:13px;font-weight:700;color:#8b5cf6;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px}
.te-line{font-size:16.5px;color:#16324f;font-weight:600;line-height:1.5;margin:0 0 18px}
.te-opt{display:block;width:100%;padding:13px;margin-bottom:9px;border:2px solid #e3e9f2;border-radius:14px;background:#fff;font-family:inherit;font-size:14.5px;font-weight:700;color:#405878;cursor:pointer;text-align:center}
.te-opt:hover{border-color:#8b5cf6}
.te-reply{font-size:15px;color:#0d9488;font-weight:700;line-height:1.5;margin:6px 0 14px;min-height:20px}
.te-star{font-size:34px;animation:teStar .5s ease-out}
@keyframes teStar{from{transform:scale(.2)}to{transform:scale(1)}}
.te-close-btn{width:100%;padding:13px;border:none;border-radius:14px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer}
.te-breath-circle{width:110px;height:110px;border-radius:50%;background:linear-gradient(135deg,#81D4FA,#4FC3F7);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:15px;cursor:pointer;transition:transform 3.5s ease-in-out;font-family:'Fredoka',sans-serif}
.te-breath-circle.in{transform:scale(1.35)}
.te-x{position:absolute;top:10px;right:14px;background:#eef2f7;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:#405878}
`
  document.head.appendChild(st)
}

function pickEvent(childId) {
  return EVENTS[hashStr(todayKey() + '|' + childId) % EVENTS.length]
}

function seenKey(childId) { return 'dd_event_' + childId + '_' + todayKey() }

function openEvent(ev, childId, chip) {
  const char = CHARS[ev.c]
  const ov = document.createElement('div')
  ov.className = 'te-overlay'
  const card = document.createElement('div')
  card.className = 'te-card'
  card.style.position = 'relative'
  ov.appendChild(card)
  document.body.appendChild(ov)
  const close = () => ov.remove()
  ov.addEventListener('click', e => { if (e.target === ov) close() })

  let done = false
  const finish = async (reply) => {
    if (done) return
    done = true
    try { localStorage.setItem(seenKey(childId), '1') } catch { /* ignore */ }
    chip.classList.add('done')
    chip.innerHTML = '✅ Helped ' + escapeHtml(char.name) + ' today'
    const donePortrait = char.img
      ? `<img src="${escapeHtml(char.img)}" alt="" style="width:72px;height:72px;object-fit:contain" onerror="this.outerHTML='${char.emoji}'">`
      : char.emoji
    const tomorrow = tomorrowEventChar(childId)
    card.innerHTML = `
      <button class="te-x" aria-label="Close">✕</button>
      <div class="te-who">${donePortrait}</div>
      <p class="te-name">${escapeHtml(char.name)} says</p>
      <p class="te-reply">${escapeHtml(reply)}</p>
      <div class="te-star">⭐</div>
      <p class="te-reply" style="color:#b45309">+1 star for helping!</p>
      <p class="te-reply" style="color:#6b7c8f;font-weight:600">${tomorrow.emoji} ${escapeHtml(tomorrow.name)} has a job for you tomorrow!</p>
      <button class="te-close-btn">Back to Brain Town</button>`
    trackEvent('town_event_completed', { char: ev.c, type: ev.t })
    card.querySelector('.te-close-btn').addEventListener('click', close)
    card.querySelector('.te-x').addEventListener('click', close)
    awardStar(childId)
  }

  const portrait = char.img
    ? `<img src="${escapeHtml(char.img)}" alt="" style="width:72px;height:72px;object-fit:contain" onerror="this.outerHTML='${char.emoji}'">`
    : char.emoji
  const header = `
    <button class="te-x" aria-label="Close">✕</button>
    <div class="te-who">${portrait}</div>
    <p class="te-name">${escapeHtml(char.name)} the ${escapeHtml(char.species)} · ${escapeHtml(char.skill)}</p>
    <p class="te-line">${escapeHtml(ev.line)}</p>`

  if (ev.t === 'choice') {
    card.innerHTML = header + ev.opts.map((o, i) => `<button class="te-opt" data-i="${i}">${escapeHtml(o)}</button>`).join('')
    card.querySelectorAll('.te-opt').forEach(btn => btn.addEventListener('click', () => {
      const i = Number(btn.dataset.i)
      finish(ev.good.includes(i) ? ev.yes : ev.hmm)
    }))
  } else if (ev.t === 'feeling') {
    card.innerHTML = header + FEELINGS.map((f, i) => `<button class="te-opt" data-i="${i}">${f}</button>`).join('')
    card.querySelectorAll('.te-opt').forEach(btn => btn.addEventListener('click', () => finish(ev.yes)))
  } else { // breath
    card.innerHTML = header + `
      <div class="te-breath-circle" id="teBreath">Tap to breathe</div>
      <p class="te-reply" id="teBreathCount" style="color:#405878">0 / 3 breaths</p>`
    let count = 0, busy = false
    const circle = card.querySelector('#teBreath')
    const label = card.querySelector('#teBreathCount')
    circle.addEventListener('click', () => {
      if (busy || done) return
      busy = true
      circle.classList.add('in')
      circle.textContent = 'Breathe in…'
      setTimeout(() => {
        circle.classList.remove('in')
        circle.textContent = 'Breathe out…'
        setTimeout(() => {
          count++
          label.textContent = count + ' / 3 breaths'
          circle.textContent = count >= 3 ? 'Lovely!' : 'Tap to breathe'
          busy = false
          if (count >= 3) finish(ev.yes)
        }, 3500)
      }, 3500)
    })
  }
  card.querySelector('.te-x')?.addEventListener('click', close)
}

/** Mount today's event chip on the Brain Town map. */
export async function initTownEvents(mapContainer, { child } = {}) {
  const childId = child?.id
  if (!mapContainer || !childId) return
  if (!(await isTownPlayEnabled())) return
  if (mapContainer.querySelector('.te-chip')) return
  injectStyles()

  // Real character portraits from the DB (fail soft to emoji).
  try {
    const { data } = await supabase.from('super_skills')
      .select('slug, characters:character_id(image_url)')
    for (const row of (data || [])) {
      const ch = Object.values(CHARS).find(c => c.slug === row.slug)
      if (ch && row.characters?.image_url) ch.img = row.characters.image_url
    }
    CHARS.daniel.img = '/images/characters/DanielTheDog.webp'
  } catch { /* emoji fallbacks */ }

  const ev = pickEvent(childId)
  const char = CHARS[ev.c]
  let seen = false
  try { seen = localStorage.getItem(seenKey(childId)) === '1' } catch { /* ignore */ }

  const chip = document.createElement('button')
  chip.type = 'button'
  chip.className = 'te-chip' + (seen ? ' done' : '')
  chip.innerHTML = seen
    ? '✅ Helped ' + escapeHtml(char.name) + ' today'
    : '❗ ' + char.emoji + ' ' + escapeHtml(char.name) + ' needs you!'
  if (getComputedStyle(mapContainer).position === 'static') mapContainer.style.position = 'relative'
  mapContainer.appendChild(chip)
  // The map re-renders by clearing its container; put the chip back when
  // that happens.
  new MutationObserver(() => {
    if (!mapContainer.contains(chip)) mapContainer.appendChild(chip)
  }).observe(mapContainer, { childList: true })

  chip.addEventListener('click', () => {
    let done = false
    try { done = localStorage.getItem(seenKey(childId)) === '1' } catch { /* ignore */ }
    if (!done) {
      trackEvent('town_event_opened', { char: ev.c, type: ev.t })
      openEvent(ev, childId, chip)
    }
  })
}
