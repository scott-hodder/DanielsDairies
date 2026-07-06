// ================================================
// DANIEL EXPLAINER - Brain Town Introduction
// A Daniel-led walkthrough teaching the app's core idea.
// Replayable from the dashboard at any time.
// ================================================

const TRIANGLE_SVG = `<svg viewBox="0 0 280 212" width="100%" style="max-width:280px;display:block;margin:0 auto">
  <defs><marker id="exArrow" markerWidth="9" markerHeight="9" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#e6a800"/></marker></defs>
  <path d="M112,76 Q80,102 80,130" fill="none" stroke="#e6a800" stroke-width="3" marker-end="url(#exArrow)"/>
  <path d="M90,176 Q140,198 190,176" fill="none" stroke="#e6a800" stroke-width="3" marker-end="url(#exArrow)"/>
  <path d="M200,130 Q208,102 170,78" fill="none" stroke="#e6a800" stroke-width="3" marker-end="url(#exArrow)"/>
  <g><circle cx="140" cy="48" r="33" fill="#eef0fb" stroke="#6366F1" stroke-width="2.5"/>
    <text x="140" y="46" text-anchor="middle" font-size="24" font-family="sans-serif">&#x1F4AD;</text>
    <text x="140" y="66" text-anchor="middle" font-size="11" font-weight="700" fill="#16324f" font-family="Fredoka,sans-serif">Thoughts</text></g>
  <g><circle cx="54" cy="164" r="33" fill="#fdecec" stroke="#f46b6b" stroke-width="2.5"/>
    <text x="54" y="162" text-anchor="middle" font-size="24" font-family="sans-serif">&#x2764;&#xFE0F;</text>
    <text x="54" y="182" text-anchor="middle" font-size="11" font-weight="700" fill="#16324f" font-family="Fredoka,sans-serif">Feelings</text></g>
  <g><circle cx="226" cy="164" r="33" fill="#e9f4ee" stroke="#40916c" stroke-width="2.5"/>
    <text x="226" y="162" text-anchor="middle" font-size="24" font-family="sans-serif">&#x1F9B6;</text>
    <text x="226" y="182" text-anchor="middle" font-size="11" font-weight="700" fill="#16324f" font-family="Fredoka,sans-serif">Actions</text></g>
</svg>`

const PLANNER_HTML = `<div style="display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;margin:12px 0">
  <div style="text-align:center"><div style="font-size:38px">&#x1F9E0;</div><div style="font-size:12px;font-weight:600;color:#16324f;margin-top:3px">Your brain</div></div>
  <div style="font-size:24px;color:#e6a800;font-weight:700">&#x2192;</div>
  <div style="text-align:center"><div style="font-size:38px">&#x1F477;</div><div style="font-size:12px;font-weight:600;color:#16324f;margin-top:3px">You, the planner</div></div>
  <div style="font-size:24px;color:#e6a800;font-weight:700">&#x2192;</div>
  <div style="text-align:center"><div style="font-size:38px">&#x1F3D9;&#xFE0F;</div><div style="font-size:12px;font-weight:600;color:#16324f;margin-top:3px">Your town</div></div>
</div>`

const ROAD_HTML = `<div style="display:flex;gap:7px;justify-content:center;align-items:center;flex-wrap:wrap;margin:12px 0">
  <span style="background:#16324f;color:#fff;border-radius:11px;padding:9px 14px;font-weight:600;font-size:13.5px">Think</span>
  <span style="color:#e6a800;font-size:16px;font-weight:700">&#x2192;</span>
  <span style="background:#16324f;color:#fff;border-radius:11px;padding:9px 14px;font-weight:600;font-size:13.5px">Feel</span>
  <span style="color:#e6a800;font-size:16px;font-weight:700">&#x2192;</span>
  <span style="background:#16324f;color:#fff;border-radius:11px;padding:9px 14px;font-weight:600;font-size:13.5px">Act</span>
  <span style="color:#e6a800;font-size:16px;font-weight:700">&#x21BB;</span>
  <span style="background:#f2c94c;color:#16324f;border-radius:11px;padding:9px 14px;font-weight:600;font-size:13.5px">Road grows</span>
</div>`

// ── Road Builder finale (ported from the dashboard mockup) ──
// The child faces tricky moments, picks the calm or bumpy road, and watches
// Daniel travel it. Calm choices visibly widen the road — the big idea made
// touchable.
const RB_SCENARIOS = [
  { q: 'Your block tower just got knocked over. Your alarm starts ringing!',
    a: 'Take 3 dragon breaths and ask for help rebuilding.',
    b: 'Yell and knock the rest down too.',
    ca: 'You cooled the alarm and your hands felt steady again. The tower can be rebuilt.',
    cb: "It felt big for a second, but now the tower's gone and the yucky feeling stuck around." },
  { q: 'Someone got the last blue cup, and you really wanted it.',
    a: "Tell yourself: I'll use green today, blue tomorrow.",
    b: 'Grab the cup off them.',
    ca: 'Your thinking part stayed switched on. Small wobble, quick recovery.',
    cb: "Now there's a cup problem and a friend problem to fix." },
  { q: "Your worry says: don't go to the party, it's too much.",
    a: 'Make a plan: stay 20 minutes and find one friend.',
    b: 'Hide in your room and skip it.',
    ca: 'Brave step, small dose. The worry got quieter once you had a plan.',
    cb: 'The worry felt better for now, but it got a little bigger for next time.' },
  { q: 'Your little brother knocked over the model you worked hard on.',
    a: 'Walk away for a minute and tell a grown up how you feel.',
    b: 'Knock over his toys to get him back.',
    ca: 'You let the alarm cool before you acted. The model can be fixed, and you stayed the kind of kid you want to be.',
    cb: 'Now there are two broken things and two upset kids to sort out.' },
  { q: 'You made a mistake on your work and feel like giving up.',
    a: 'Tell yourself: mistakes help my brain grow. Try one more time.',
    b: 'Scrunch it up and throw it on the floor.',
    ca: "That's a Brain Builder road. Every retry makes the road a little stronger.",
    cb: 'The work is still there to do, and now the grumpy feeling is too.' },
  { q: "It's bedtime, you're not tired, and everything feels annoying.",
    a: 'Do some slow dragon breaths and listen to a story.',
    b: 'Yell that bed is stupid and refuse to go.',
    ca: 'Slow breaths told your body it was safe to wind down. Tricky moment, handled.',
    cb: 'The cranky feeling got bigger, and bedtime got harder for everyone.' }
]

const RB_STRENGTH_LABELS = ['A new path', 'A little track', 'A worn path', 'A proper road', 'A wide road', 'A smooth street', 'A calm motorway!']

const RB_HTML = `<div class="de-rb">
  <svg id="deRbSvg" viewBox="0 0 360 220" width="100%" style="max-width:360px;display:block;margin:0 auto;background:linear-gradient(180deg,#eaf6ff,#f2fbef);border-radius:14px">
    <text x="330" y="34" font-size="26" text-anchor="middle">🏖️</text>
    <text x="330" y="50" font-size="9" text-anchor="middle" fill="#1f6f43" font-weight="700" font-family="Fredoka,sans-serif">Calm Cove</text>
    <text x="330" y="196" font-size="26" text-anchor="middle">⛈️</text>
    <text x="330" y="212" font-size="9" text-anchor="middle" fill="#6b552a" font-weight="700" font-family="Fredoka,sans-serif">Grumpy Gulch</text>
    <path id="deRbRoadStorm" d="M30,120 C120,140 200,180 300,185" fill="none" stroke="#b59a6a" stroke-width="6" stroke-linecap="round" opacity=".5"/>
    <path id="deRbRoadCalm" d="M30,120 C120,100 200,55 300,45" fill="none" stroke="#2e8b57" stroke-width="8" stroke-linecap="round"/>
    <path d="M30,120 C120,100 200,55 300,45" fill="none" stroke="#bfe3c2" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round"/>
    <circle cx="30" cy="120" r="9" fill="#16324f"/>
    <image id="deRbTraveller" href="/images/characters/DanielTheDog.webp" x="16" y="92" width="28" height="28"/>
  </svg>
  <div class="de-rb-meter">
    <div class="de-rb-ml"><span>Your calm road</span><span id="deRbStrength">A new path</span></div>
    <div class="de-rb-track"><div class="de-rb-fill" id="deRbFill"></div></div>
  </div>
  <div class="de-rb-sit">🧩 <span id="deRbQ"></span></div>
  <button type="button" class="de-rb-choice calm" id="deRbA"><span class="de-rb-ct">Calm road</span><span id="deRbAText"></span></button>
  <button type="button" class="de-rb-choice bumpy" id="deRbB"><span class="de-rb-ct">Bumpy road</span><span id="deRbBText"></span></button>
  <div class="de-rb-result" id="deRbResult" style="display:none"></div>
  <button type="button" class="de-btn de-btn-ghost" id="deRbNext" style="display:none;margin:10px auto 0">Try another moment →</button>
</div>`

const STEPS = [
  {
    title: "Hi, I'm Daniel!",
    text: "Let me show you two big things about your amazing brain. It only takes a minute, and you can come back and watch it again any time.",
    visual: null
  },
  {
    title: 'You are the town planner',
    text: "Your brain is like a whole town, and here is the magic: it is built so that YOU are the town planner. Your brain is wired to learn and grow, so you get to help build it.",
    visual: 'planner'
  },
  {
    title: 'Thoughts, feelings, actions',
    text: "These three are all joined together, like a triangle. What you THINK changes how you FEEL, and that changes what you DO. Then it goes around again.",
    visual: 'triangle'
  },
  {
    title: 'Super Skills build roads',
    text: "Each Super Skill is like a road in your brain town. You start at Brain Builder, and finishing a Super Skill unlocks the next one. The more you practise, the wider and easier each road gets!",
    visual: 'road'
  },
  {
    title: 'Build your first road!',
    text: 'A tricky moment is coming up. Pick a road and watch what happens — every calm choice makes the calm road wider and easier to travel.',
    visual: 'roadBuilder'
  }
]

let _overlay = null
let _stepIndex = 0
let _onFinish = null

// Road builder state — resets each time the explainer opens
let _rbScnIdx = 0
let _rbStrength = 1
let _rbAnswered = false

function getVisualHTML(type) {
  if (type === 'planner') return PLANNER_HTML
  if (type === 'triangle') return TRIANGLE_SVG
  if (type === 'road') return ROAD_HTML
  if (type === 'roadBuilder') return RB_HTML
  return ''
}

// ── Road builder interactions (mockup-faithful) ──
function rbEl(id) { return _overlay ? _overlay.querySelector('#' + id) : null }

function rbUpdateRoad() {
  const road = rbEl('deRbRoadCalm')
  if (road) road.setAttribute('stroke-width', 4 + _rbStrength * 3)
  const fill = rbEl('deRbFill')
  if (fill) fill.style.width = Math.min(100, (_rbStrength / 6) * 100) + '%'
  const label = rbEl('deRbStrength')
  if (label) label.textContent = RB_STRENGTH_LABELS[Math.min(_rbStrength, 6)]
}

function rbResetTraveller() {
  const t = rbEl('deRbTraveller')
  if (t) { t.setAttribute('x', 16); t.setAttribute('y', 92) }
}

// Daniel walks along the chosen road
function rbTravel(pathId, then) {
  const path = rbEl(pathId)
  const t = rbEl('deRbTraveller')
  if (!path || !t) { if (then) then(); return }
  const total = path.getTotalLength()
  let f = 0
  const step = () => {
    if (!_overlay || _overlay.style.display === 'none') return
    f += 0.03
    if (f > 1) f = 1
    const pt = path.getPointAtLength(total * f)
    t.setAttribute('x', pt.x - 14)
    t.setAttribute('y', pt.y - 24)
    if (f < 1) requestAnimationFrame(step)
    else if (then) then()
  }
  requestAnimationFrame(step)
}

function rbRenderScenario() {
  const s = RB_SCENARIOS[_rbScnIdx]
  _rbAnswered = false
  const q = rbEl('deRbQ'); if (q) q.textContent = s.q
  const aText = rbEl('deRbAText'); if (aText) aText.textContent = s.a
  const bText = rbEl('deRbBText'); if (bText) bText.textContent = s.b
  ;['deRbA', 'deRbB'].forEach(id => {
    const btn = rbEl(id)
    if (btn) { btn.disabled = false; btn.style.opacity = '1' }
  })
  const res = rbEl('deRbResult'); if (res) res.style.display = 'none'
  const next = rbEl('deRbNext'); if (next) next.style.display = 'none'
  rbResetTraveller()
  rbUpdateRoad()
}

function rbChoose(opt) {
  if (_rbAnswered) return
  _rbAnswered = true
  const s = RB_SCENARIOS[_rbScnIdx]
  const a = rbEl('deRbA'), b = rbEl('deRbB')
  if (a) a.disabled = true
  if (b) b.disabled = true
  const other = opt === 'a' ? b : a
  if (other) other.style.opacity = '.45'
  const res = rbEl('deRbResult')

  if (opt === 'a') {
    rbTravel('deRbRoadCalm', () => { if (_rbStrength < 6) { _rbStrength++; rbUpdateRoad() } })
    if (res) {
      res.className = 'de-rb-result calm'
      res.style.display = 'block'
      res.innerHTML = '<b>🏖️ You arrived at Calm Cove!</b> ' + s.ca + ' Your calm road just got a little wider — easier to travel next time.'
    }
  } else {
    rbTravel('deRbRoadStorm')
    if (res) {
      res.className = 'de-rb-result storm'
      res.style.display = 'block'
      res.innerHTML = "<b>⛈️ That road led to Grumpy Gulch.</b> " + s.cb + " No worries though — the calm road is always here when you're ready to build it."
    }
  }
  const next = rbEl('deRbNext'); if (next) next.style.display = 'block'
}

function rbWire() {
  rbEl('deRbA')?.addEventListener('click', () => rbChoose('a'))
  rbEl('deRbB')?.addEventListener('click', () => rbChoose('b'))
  rbEl('deRbNext')?.addEventListener('click', () => {
    _rbScnIdx = (_rbScnIdx + 1) % RB_SCENARIOS.length
    rbRenderScenario()
  })
  rbRenderScenario()
}

function renderStep() {
  if (!_overlay) return
  const step = STEPS[_stepIndex]

  _overlay.querySelector('.de-title').textContent = step.title
  _overlay.querySelector('.de-text').textContent = step.text

  const vis = _overlay.querySelector('.de-visual')
  if (step.visual) {
    vis.innerHTML = getVisualHTML(step.visual)
    vis.style.display = 'block'
    if (step.visual === 'roadBuilder') rbWire()
  } else {
    vis.innerHTML = ''
    vis.style.display = 'none'
  }

  // Dots
  _overlay.querySelector('.de-dots').innerHTML = STEPS.map((_, i) =>
    `<span style="width:${i === _stepIndex ? '22px' : '9px'};height:9px;border-radius:999px;background:${i === _stepIndex ? '#f2c94c' : '#d7deea'};display:inline-block"></span>`
  ).join('')

  // Buttons
  _overlay.querySelector('.de-back').style.visibility = _stepIndex === 0 ? 'hidden' : 'visible'
  _overlay.querySelector('.de-next').textContent = _stepIndex === STEPS.length - 1 ? "Let's go!" : 'Next'
}

function navigate(dir) {
  _stepIndex += dir
  if (_stepIndex < 0) _stepIndex = 0
  if (_stepIndex >= STEPS.length) {
    closeExplainer()
    if (_onFinish) _onFinish()
    return
  }
  renderStep()
}

export function openExplainer(onFinish) {
  _onFinish = onFinish || null
  _stepIndex = 0
  _rbScnIdx = 0
  _rbStrength = 1
  _rbAnswered = false

  if (_overlay) {
    _overlay.style.display = 'flex'
    renderStep()
    return
  }

  _overlay = document.createElement('div')
  _overlay.className = 'de-overlay'
  _overlay.innerHTML = `
    <div class="de-modal">
      <div class="de-header">
        <div class="de-daniel">
          <img src="/images/characters/DanielTheDog.webp" alt="Daniel" style="width:70px;height:70px;object-fit:contain" />
        </div>
        <h2 class="de-title">Hi, I'm Daniel!</h2>
      </div>
      <div class="de-body">
        <p class="de-text"></p>
        <div class="de-visual"></div>
        <div class="de-dots" style="display:flex;gap:7px;justify-content:center;margin:16px 0"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <button class="de-back de-btn de-btn-ghost">Back</button>
          <button class="de-skip de-btn de-btn-ghost" style="color:#6b7e95;border-color:transparent">Skip</button>
          <button class="de-next de-btn de-btn-gold">Next</button>
        </div>
      </div>
    </div>
  `

  _overlay.querySelector('.de-back').addEventListener('click', () => navigate(-1))
  _overlay.querySelector('.de-next').addEventListener('click', () => navigate(1))
  _overlay.querySelector('.de-skip').addEventListener('click', closeExplainer)
  _overlay.addEventListener('click', (e) => {
    if (e.target === _overlay) closeExplainer()
  })

  document.body.appendChild(_overlay)
  renderStep()
}

export function closeExplainer() {
  if (_overlay) _overlay.style.display = 'none'
}

/**
 * Renders the compact "big idea" replay chip that floats over the
 * Brain Town map corner. Returns an HTML string.
 */
export function renderExplainerChip() {
  return `
    <button type="button" class="de-chip" id="danielExplainerChip" title="Your brain is a town, and you are the planner. Tap to watch again any time." aria-label="Watch Daniel explain the big idea">
      <img src="/images/characters/DanielTheDog.webp" alt="" />
      <span>The big idea</span>
      <span class="de-chip-play">&#x25B6;</span>
    </button>
  `
}
