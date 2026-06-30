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
    text: "Each Super Skill is like a road in your brain town. The more you practise, the wider and easier the road gets. That's how your brain grows stronger!",
    visual: 'road'
  },
  {
    title: 'Have a go!',
    text: "The best way to learn is to try. Pick a Super Skill road to explore, or head to the Road Builder to practise building your calm road. You can come back here any time.",
    visual: 'road'
  }
]

let _overlay = null
let _stepIndex = 0
let _onFinish = null

function getVisualHTML(type) {
  if (type === 'planner') return PLANNER_HTML
  if (type === 'triangle') return TRIANGLE_SVG
  if (type === 'road') return ROAD_HTML
  return ''
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
 * Renders the "Daniel explains the big idea" card for the dashboard.
 * Returns an HTML string.
 */
export function renderExplainerCard() {
  return `
    <div class="de-card" id="danielExplainerCard">
      <div class="de-card-icon">
        <img src="/images/characters/DanielTheDog.webp" alt="Daniel" style="width:48px;height:48px;object-fit:contain" />
      </div>
      <div class="de-card-text">
        <h3 style="font-size:15px;font-weight:700;color:#16324f;margin:0">Daniel explains the big idea</h3>
        <p style="font-size:12.5px;color:#6b7e95;margin:2px 0 0">Your brain is a town, and you are the planner. Tap to watch again any time.</p>
      </div>
      <button class="de-card-play" id="danielExplainerPlayBtn">&#x25B6; Watch</button>
    </div>
  `
}
