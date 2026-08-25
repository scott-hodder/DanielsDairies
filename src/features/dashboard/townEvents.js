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

const CHARS = {
  lenny: { name: 'Lenny', emoji: '🧠', skill: 'Brain Builder' },
  coco: { name: 'Coco', emoji: '🚗', skill: 'Thought Driver' },
  kip: { name: 'Kip', emoji: '🧭', skill: 'Emotion Navigator' },
  pepper: { name: 'Pepper', emoji: '🔧', skill: 'Behaviour Engineer' },
  eddie: { name: 'Eddie', emoji: '🏰', skill: 'Resilience Architect' },
  kai: { name: 'Kai', emoji: '🗺️', skill: 'Social Mapper' },
  billie: { name: 'Billie', emoji: '🔮', skill: 'Future Designer' },
  daniel: { name: 'Daniel', emoji: '🐕', skill: 'Brain Town' }
}

// type 'choice': pick the helpful idea. type 'feeling': name a feeling.
// type 'breath': three slow breaths together. Every option is safe — "good"
// just picks which warm reply the character gives.
const EVENTS = [
  { c: 'kip', t: 'choice', line: "My tummy feels fluttery about the school concert. What could I try?", opts: ["Take three slow belly breaths", "Pretend it isn't happening", "Tell someone how I feel"], good: [0, 2], yes: "That really helps! Naming it and breathing slow makes the flutters smaller.", hmm: "Hiding a feeling makes it sneaky. Naming it or breathing slow works better!" },
  { c: 'kip', t: 'feeling', line: "I'm doing my feelings check! Which feeling visited YOU today?", yes: "Thanks for telling me! Every feeling is okay — even the wobbly ones." },
  { c: 'kip', t: 'choice', line: "Daniel looks grumpy today. What's a kind first step?", opts: ["Ask him what's up", "Tell him to cheer up", "Give him some space, then check in"], good: [0, 2], yes: "Yes! Asking or gently waiting shows you care about his feelings.", hmm: "'Cheer up' can feel like nobody's listening. Asking what's up works better!" },
  { c: 'kip', t: 'breath', line: "The wind knocked over my feelings flags! Breathe with me while we hang them back up?", yes: "Ahh, much calmer. Breathing together is my favourite repair kit." },
  { c: 'lenny', t: 'choice', line: "I keep forgetting my new trick. What makes a memory road stronger?", opts: ["Practising it again today", "Doing it once and hoping", "Waiting until next month"], good: [0], yes: "Exactly! Every practice walk makes the road wider and clearer.", hmm: "One walk makes a faint path. Practising again is what builds the road!" },
  { c: 'lenny', t: 'choice', line: "My brain feels tired from learning. What would help it grow best now?", opts: ["A little rest and water", "Pushing through for hours", "Giving up on learning"], good: [0], yes: "Smart! Brains build their best roads when they get breaks too.", hmm: "Tired brains build wobbly roads. A rest helps the building crew!" },
  { c: 'lenny', t: 'breath', line: "Construction day in Brain Town! Let's do slow builder-breaths before we start.", yes: "Perfect. A calm brain is a brilliant builder." },
  { c: 'coco', t: 'choice', line: "A thought keeps saying 'I always mess up.' Which road should I steer to?", opts: ["'Everyone practises to get better'", "'The thought must be true'", "'I messed up once, not always'"], good: [0, 2], yes: "Nice steering! Swapping 'always' for the true story changes the whole trip.", hmm: "Thoughts aren't always true! Check the facts and steer to a fairer one." },
  { c: 'coco', t: 'choice', line: "I'm stuck in a thought traffic jam! What un-jams a busy mind?", opts: ["Noticing the thought and letting it pass", "Honking at every thought", "Following every thought at once"], good: [0], yes: "Beep beep — clear road! Watching thoughts drive past is a real skill.", hmm: "Chasing every thought jams the roads. Just watch them pass — like traffic!" },
  { c: 'coco', t: 'breath', line: "Pit stop! Even race cars need to refuel. Three slow breaths with me?", yes: "Vroom! Refuelled and ready to steer somewhere helpful." },
  { c: 'pepper', t: 'choice', line: "I want to remember to pack my bag every day. What's the best trick?", opts: ["Do it right after breakfast, every day", "Hope I remember", "Only pack when I feel like it"], good: [0], yes: "That's habit-building! Same time, same trigger — soon it packs itself.", hmm: "Hoping is wobbly. Hooking it to breakfast makes it automatic!" },
  { c: 'pepper', t: 'choice', line: "Oops — I broke my tidy-up habit yesterday. What now?", opts: ["Start again today, no big deal", "Give up forever", "Feel bad about it all week"], good: [0], yes: "Exactly! Missing one day doesn't break the machine — restarting is the skill.", hmm: "One missed day is just a pothole. Restart today and the road continues!" },
  { c: 'pepper', t: 'breath', line: "New habit under construction! Let's lay the first brick with three calm breaths.", yes: "Brick laid! Small steps, every day — that's how big things get built." },
  { c: 'eddie', t: 'choice', line: "My tower fell down AGAIN. What would a resilience architect do?", opts: ["Look at what happened and try a new design", "Never build again", "Blame the bricks"], good: [0], yes: "Yes! Every fallen tower teaches the next one how to stand.", hmm: "The bricks are fine — and quitting means no towers ever. Redesign and rebuild!" },
  { c: 'eddie', t: 'choice', line: "Today feels hard and prickly. What's one brave, tiny step?", opts: ["Do the smallest first bit", "Wait for it to feel easy", "Decide the day is ruined"], good: [0], yes: "That's it. Brave isn't big — brave is starting small anyway.", hmm: "Hard days shrink when you start tiny. One small bit is enough!" },
  { c: 'eddie', t: 'breath', line: "Storm's passing over my castle. Breathe with me while it goes by?", yes: "See? Storms pass. And you're still standing — that's resilience." },
  { c: 'kai', t: 'choice', line: "A new kid is sitting alone at lunch. What's a friendly move?", opts: ["Say hi and ask their name", "Stare from far away", "Wait for them to come to me"], good: [0], yes: "That hello could make their whole week. Map-maker level: expert!", hmm: "New kids usually can't make the first move. A simple hi opens the map!" },
  { c: 'kai', t: 'choice', line: "My friend seems quiet today. What does their face-map probably mean?", opts: ["Something might be bothering them", "They're being boring on purpose", "Nothing — faces mean nothing"], good: [0], yes: "Good reading! Quiet often means 'something's up' — a gentle check-in helps.", hmm: "Faces and moods are clues! Quiet usually means something's going on inside." },
  { c: 'kai', t: 'feeling', line: "I'm mapping feelings around town today. What's showing on YOUR map?", yes: "Added to the map! Knowing your own weather helps you read everyone else's." },
  { c: 'billie', t: 'choice', line: "I want to be a great swimmer some day. What's the best next step?", opts: ["One small practice this week", "Just imagine it forever", "Wait until I'm older"], good: [0], yes: "Dream + tiny step = future magic. That's the whole recipe!", hmm: "Dreams need legs! One small practice starts walking towards it." },
  { c: 'billie', t: 'choice', line: "My crystal ball shows TWO tomorrows: one where I practised, one where I didn't. Which feels better?", opts: ["The practised one", "The didn't one", "Can't tell"], good: [0], yes: "Right? Future-you is built by today-you. Sneaky, but wonderful.", hmm: "Peek again — future-you is always happier when today-you did one small thing!" },
  { c: 'billie', t: 'feeling', line: "Designing tomorrow starts with today. How are you arriving at the design desk?", yes: "Noted, designer! Knowing how you feel is step one of every good plan." },
  { c: 'daniel', t: 'breath', line: "Woof! I missed you! Quick — three happy belly breaths before we play?", yes: "Wag wag wag. You always make Brain Town feel calmer." },
  { c: 'daniel', t: 'feeling', line: "Woof! Before we explore — how's your inside weather right now?", yes: "Thanks for telling me. Whatever the weather, we explore together!" },
  { c: 'daniel', t: 'choice', line: "I found a muddy puddle of grumpy feelings on Main Street! What should we do with it?", opts: ["Name it, then splash right through", "Pretend it isn't there", "Build a house in it and stay"], good: [0], yes: "SPLASH! Feelings you name are way less muddy. Onwards!", hmm: "Ignoring puddles makes them deeper, and living in one is soggy. Name it and splash through!" }
]

const FEELINGS = ['😄 Happy', '😌 Calm', '😐 Okay', '😟 Worried', '😢 Sad', '😠 Cross']

function todayKey() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
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
    card.innerHTML = `
      <button class="te-x" aria-label="Close">✕</button>
      <div class="te-who">${char.emoji}</div>
      <p class="te-name">${escapeHtml(char.name)} says</p>
      <p class="te-reply">${escapeHtml(reply)}</p>
      <div class="te-star">⭐</div>
      <p class="te-reply" style="color:#b45309">+1 star for helping!</p>
      <button class="te-close-btn">Back to Brain Town</button>`
    card.querySelector('.te-close-btn').addEventListener('click', close)
    card.querySelector('.te-x').addEventListener('click', close)
    awardStar(childId)
  }

  const header = `
    <button class="te-x" aria-label="Close">✕</button>
    <div class="te-who">${char.emoji}</div>
    <p class="te-name">${escapeHtml(char.name)} · ${escapeHtml(char.skill)}</p>
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
    if (!done) openEvent(ev, childId, chip)
  })
}
