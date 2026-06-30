// ================================================
// ROAD BUILDER TAB - Interactive road-building activity
// Daniel presents situations. The child chooses a thought, feeling,
// and action. Each choice visually builds (or cracks) a road segment.
// Daniel walks along the road as it's built.
// ================================================

import { escapeHtml } from '../../lib/sanitize.js'

const SCENARIOS = [
  {
    situation: "Your block tower just got knocked over and your alarm is ringing!",
    icon: '\u{1F9F1}',
    thought: {
      helpful: { text: "Accidents happen. I can rebuild it.", short: "I can rebuild" },
      unhelpful: { text: "They did that on purpose! It's ruined!", short: "It's ruined!" }
    },
    feeling: {
      helpful: { text: "Frustrated, but I can handle it.", short: "I can handle it" },
      unhelpful: { text: "So angry I want to scream!", short: "Want to scream" }
    },
    action: {
      helpful: { text: "Take 3 dragon breaths and ask for help.", short: "Dragon breaths" },
      unhelpful: { text: "Yell and knock the rest down too.", short: "Knock it down" }
    },
    feedback: {
      calm: "You cooled the alarm and your hands felt steady again. The tower can be rebuilt!",
      storm: "The alarm stayed loud and the yucky feeling stuck around. Next time, try the calm road!"
    }
  },
  {
    situation: "Someone got the last blue cup, and you really wanted it.",
    icon: '\u{1F964}',
    thought: {
      helpful: { text: "I can use green today, blue tomorrow.", short: "Pick another" },
      unhelpful: { text: "That's not fair! I always miss out!", short: "Not fair!" }
    },
    feeling: {
      helpful: { text: "A little disappointed, that's okay.", short: "A bit sad, OK" },
      unhelpful: { text: "Burning hot anger!", short: "Burning anger" }
    },
    action: {
      helpful: { text: "Tell myself it's a small thing and pick another cup.", short: "Let it go" },
      unhelpful: { text: "Grab the cup off them.", short: "Grab it" }
    },
    feedback: {
      calm: "Your thinking part stayed switched on. Small wobble, quick recovery!",
      storm: "Now there's a cup problem AND a friend problem. The calm road avoids both!"
    }
  },
  {
    situation: "Your worry says: don't go to the party, it'll be too scary.",
    icon: '\u{1F389}',
    thought: {
      helpful: { text: "I can try for 20 minutes and find one friend.", short: "Try 20 minutes" },
      unhelpful: { text: "Everyone will stare at me. I can't do it.", short: "Can't do it" }
    },
    feeling: {
      helpful: { text: "Nervous, but a little bit brave too.", short: "Nervous + brave" },
      unhelpful: { text: "Totally panicked, I need to hide!", short: "Must hide" }
    },
    action: {
      helpful: { text: "Make a plan: stay 20 minutes, find one friend.", short: "Make a plan" },
      unhelpful: { text: "Hide in my room and skip it.", short: "Skip it" }
    },
    feedback: {
      calm: "Brave step, small dose. The worry got quieter once you had a plan!",
      storm: "The worry felt better for now, but it got a little bigger for next time."
    }
  },
  {
    situation: "Your little brother knocked over the model you worked hard on.",
    icon: '\u{1F3D7}\uFE0F',
    thought: {
      helpful: { text: "He didn't mean to. I can fix it.", short: "Can fix it" },
      unhelpful: { text: "He always ruins everything!", short: "Ruins everything" }
    },
    feeling: {
      helpful: { text: "Upset, but I know it'll pass.", short: "Upset, will pass" },
      unhelpful: { text: "Furious! I want revenge!", short: "Want revenge" }
    },
    action: {
      helpful: { text: "Walk away for a minute and tell a grown-up how you feel.", short: "Walk away" },
      unhelpful: { text: "Knock over his toys to get him back.", short: "Get him back" }
    },
    feedback: {
      calm: "You let the alarm cool before you acted. The model can be fixed, and you stayed kind.",
      storm: "Now there are two broken things and two upset kids."
    }
  },
  {
    situation: "You made a mistake on your work and feel like giving up.",
    icon: '\u270D\uFE0F',
    thought: {
      helpful: { text: "Mistakes help my brain grow. Try one more time.", short: "Brain grows" },
      unhelpful: { text: "I'm stupid. I can never do anything right.", short: "I'm no good" }
    },
    feeling: {
      helpful: { text: "A bit deflated, but curious to try again.", short: "Curious to retry" },
      unhelpful: { text: "So frustrated I want to throw it!", short: "Want to throw it" }
    },
    action: {
      helpful: { text: "Take a breath, look at what went wrong, and have another go.", short: "Try again" },
      unhelpful: { text: "Scrunch it up and throw it on the floor.", short: "Throw it away" }
    },
    feedback: {
      calm: "Every retry makes the road stronger. That's a Brain Builder move!",
      storm: "The work is still there to do, and the grumpy feeling is bigger now."
    }
  },
  {
    situation: "It's bedtime, you're not tired, and everything feels annoying.",
    icon: '\u{1F319}',
    thought: {
      helpful: { text: "My body needs rest even if my brain is busy.", short: "Body needs rest" },
      unhelpful: { text: "Bed is stupid and so is everything!", short: "Everything's stupid" }
    },
    feeling: {
      helpful: { text: "Restless, but I can settle.", short: "Can settle" },
      unhelpful: { text: "Cranky and ready to fight about it!", short: "Ready to fight" }
    },
    action: {
      helpful: { text: "Do some slow dragon breaths and listen to a story.", short: "Dragon breaths" },
      unhelpful: { text: "Yell that bed is stupid and refuse to go.", short: "Refuse" }
    },
    feedback: {
      calm: "Slow breaths told your body it was safe to wind down. Tricky moment, handled!",
      storm: "The cranky feeling got bigger, and bedtime got harder for everyone."
    }
  }
]

const PHASES = ['thought', 'feeling', 'action']
const PHASE_CONFIG = {
  thought: { label: 'Think', emoji: '\u{1F4AD}', question: 'What should I think?' },
  feeling: { label: 'Feel', emoji: '\u2764\uFE0F', question: 'How do I feel?' },
  action:  { label: 'Act', emoji: '\u{1F3C3}', question: 'What should I do?' }
}

let _container = null
let _scenarioIndex = 0
let _strength = 1
let _phase = 'intro'
let _choices = { thought: null, feeling: null, action: null }
let _phaseIndex = 0

export function initRoadBuilderTab(containerEl) {
  _container = containerEl
  _scenarioIndex = 0
  _strength = 1
  renderLayout()
}

function renderLayout() {
  if (!_container) return

  _container.innerHTML = `
    <div class="rb-journey">
      <div class="rb-road-scene" id="rbRoadScene">
        <svg class="rb-road-svg" viewBox="0 0 700 160" preserveAspectRatio="xMidYMid meet">
          <!-- Sky + ground -->
          <defs>
            <linearGradient id="rbSkyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#87CEEB"/>
              <stop offset="100%" stop-color="#b8e4f9"/>
            </linearGradient>
            <linearGradient id="rbGrassGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#7bc67e"/>
              <stop offset="100%" stop-color="#5aad5e"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="700" height="100" fill="url(#rbSkyGrad)"/>
          <rect x="0" y="100" width="700" height="60" fill="url(#rbGrassGrad)"/>

          <!-- Decorative clouds -->
          <ellipse cx="120" cy="30" rx="40" ry="16" fill="rgba(255,255,255,0.7)"/>
          <ellipse cx="100" cy="35" rx="30" ry="12" fill="rgba(255,255,255,0.5)"/>
          <ellipse cx="500" cy="22" rx="35" ry="14" fill="rgba(255,255,255,0.6)"/>

          <!-- Storm road (background, faded) -->
          <path id="rbStormRoad" d="M50,120 C180,125 280,135 400,130 C480,126 560,138 650,128" fill="none" stroke="#a08868" stroke-width="10" stroke-linecap="round" opacity="0.2" stroke-dasharray="8 6"/>

          <!-- Calm road segments (3 segments) -->
          <path id="rbSeg0" d="M50,120 C110,118 150,115 250,118" fill="none" stroke="#d0d8c0" stroke-width="14" stroke-linecap="round"/>
          <path id="rbSeg1" d="M250,118 C320,120 370,112 440,116" fill="none" stroke="#d0d8c0" stroke-width="14" stroke-linecap="round"/>
          <path id="rbSeg2" d="M440,116 C510,119 570,110 640,114" fill="none" stroke="#d0d8c0" stroke-width="14" stroke-linecap="round"/>

          <!-- Checkpoint markers -->
          <circle id="rbCheck0" cx="250" cy="118" r="12" fill="#e8ecf0" stroke="#c0c8d0" stroke-width="2"/>
          <text x="250" y="122" font-size="13" text-anchor="middle">\u{1F4AD}</text>
          <circle id="rbCheck1" cx="440" cy="116" r="12" fill="#e8ecf0" stroke="#c0c8d0" stroke-width="2"/>
          <text x="440" y="120" font-size="13" text-anchor="middle">\u2764\uFE0F</text>
          <circle id="rbCheck2" cx="640" cy="114" r="12" fill="#e8ecf0" stroke="#c0c8d0" stroke-width="2"/>
          <text x="640" y="118" font-size="13" text-anchor="middle">\u{1F3C3}</text>

          <!-- Start marker -->
          <text x="40" y="108" font-size="10" fill="#405878" font-weight="700" font-family="Fredoka,sans-serif" text-anchor="middle">START</text>

          <!-- Destinations -->
          <text x="660" y="76" font-size="22">\u{1F3D6}\uFE0F</text>
          <text x="660" y="93" font-size="8" fill="#1f6f43" font-weight="700" font-family="Fredoka,sans-serif" text-anchor="middle">Calm Cove</text>

          <!-- Daniel character on the road -->
          <g id="rbDaniel" transform="translate(30, 106)">
            <circle cx="0" cy="0" r="14" fill="#fef3c7" stroke="#f2c94c" stroke-width="2"/>
            <text x="0" y="5" font-size="16" text-anchor="middle">\u{1F436}</text>
          </g>
        </svg>
      </div>

      <div class="rb-strength-bar">
        <div class="rb-strength-info">
          <span class="rb-strength-label">Road strength</span>
          <span class="rb-strength-level" id="rbStrengthLevel">A new path</span>
        </div>
        <div class="rb-strength-track">
          <div class="rb-strength-fill" id="rbStrengthFill"></div>
        </div>
      </div>

      <div class="rb-activity" id="rbActivity"></div>
    </div>
  `

  updateStrengthBar()
  renderIntro()
}

function renderIntro() {
  _phase = 'intro'
  _phaseIndex = 0
  _choices = { thought: null, feeling: null, action: null }
  resetRoadVisuals()

  const scn = SCENARIOS[_scenarioIndex]
  const activity = _container.querySelector('#rbActivity')
  activity.innerHTML = `
    <div class="rb-daniel-block">
      <div class="rb-daniel-avatar">
        <img src="/images/characters/Daniel_Thinking.webp" alt="Daniel" />
      </div>
      <div class="rb-daniel-speech">
        <div class="rb-daniel-name">Daniel says...</div>
        <p>Uh oh! A tricky situation ahead. Can you help me choose the right thought, feeling, and action to build a strong road?</p>
      </div>
    </div>

    <div class="rb-situation-card">
      <span class="rb-situation-icon">${scn.icon}</span>
      <p>${escapeHtml(scn.situation)}</p>
    </div>

    <div class="rb-checkpoint-preview">
      <div class="rb-cp-item"><span class="rb-cp-dot">\u{1F4AD}</span> Think</div>
      <div class="rb-cp-arrow">\u2192</div>
      <div class="rb-cp-item"><span class="rb-cp-dot">\u2764\uFE0F</span> Feel</div>
      <div class="rb-cp-arrow">\u2192</div>
      <div class="rb-cp-item"><span class="rb-cp-dot">\u{1F3C3}</span> Act</div>
      <div class="rb-cp-arrow">\u2192</div>
      <div class="rb-cp-item"><span class="rb-cp-dot">\u{1F3D6}\uFE0F</span> Arrive!</div>
    </div>

    <button class="rb-go-btn" id="rbGoBtn">Help Daniel choose!</button>
  `

  activity.querySelector('#rbGoBtn').addEventListener('click', () => {
    _phaseIndex = 0
    _phase = PHASES[0]
    renderChoicePhase()
  })
}

function renderChoicePhase() {
  const phase = PHASES[_phaseIndex]
  const cfg = PHASE_CONFIG[phase]
  const scn = SCENARIOS[_scenarioIndex]
  const activity = _container.querySelector('#rbActivity')

  // Animate Daniel to this checkpoint position
  moveDanielTo(_phaseIndex)

  activity.innerHTML = `
    <div class="rb-phase-badge" style="--phase-color: ${phase === 'thought' ? '#6366F1' : phase === 'feeling' ? '#EC4899' : '#10B981'}">
      <span>${cfg.emoji}</span>
      <span>Step ${_phaseIndex + 1}: ${cfg.label}</span>
    </div>

    <div class="rb-situation-reminder">
      <span>${scn.icon}</span>
      <span>${escapeHtml(scn.situation)}</span>
    </div>

    <div class="rb-daniel-block rb-daniel-small">
      <div class="rb-daniel-avatar rb-daniel-avatar-sm">
        <img src="/images/characters/Daniel_Thinking.webp" alt="Daniel" />
      </div>
      <div class="rb-daniel-speech">
        <p>${cfg.question}</p>
      </div>
    </div>

    <div class="rb-choices">
      <button class="rb-choice-card rb-choice-calm" data-value="helpful">
        <div class="rb-choice-indicator" style="background:#e9f6ea;border-color:#2e8b57">
          <span>\u2600\uFE0F</span>
        </div>
        <div class="rb-choice-body">
          <div class="rb-choice-tag" style="color:#2e8b57">Calm road</div>
          <div class="rb-choice-text">${escapeHtml(scn[phase].helpful.text)}</div>
        </div>
      </button>

      <button class="rb-choice-card rb-choice-bumpy" data-value="unhelpful">
        <div class="rb-choice-indicator" style="background:#f6efe2;border-color:#a08868">
          <span>\u26C8\uFE0F</span>
        </div>
        <div class="rb-choice-body">
          <div class="rb-choice-tag" style="color:#8a6d3b">Bumpy road</div>
          <div class="rb-choice-text">${escapeHtml(scn[phase].unhelpful.text)}</div>
        </div>
      </button>
    </div>
  `

  activity.querySelectorAll('.rb-choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value
      _choices[phase] = value

      // Visual feedback on the choice
      activity.querySelectorAll('.rb-choice-card').forEach(b => {
        b.style.pointerEvents = 'none'
        if (b.dataset.value !== value) {
          b.style.opacity = '0.3'
          b.style.transform = 'scale(0.96)'
        } else {
          b.classList.add('rb-choice-selected')
        }
      })

      // Animate the road segment
      animateRoadSegment(_phaseIndex, value === 'helpful')

      // Move to next phase
      setTimeout(() => {
        _phaseIndex++
        if (_phaseIndex < PHASES.length) {
          _phase = PHASES[_phaseIndex]
          renderChoicePhase()
        } else {
          _phase = 'result'
          renderResult()
        }
      }, 900)
    })
  })
}

function renderResult() {
  const scn = SCENARIOS[_scenarioIndex]
  const helpfulCount = Object.values(_choices).filter(v => v === 'helpful').length
  const isCalm = helpfulCount >= 2

  if (isCalm && _strength < 7) {
    _strength++
    updateStrengthBar()
  }

  // Move Daniel to the end
  moveDanielTo(3)

  const danielImg = isCalm ? '/images/characters/Daniel_Celebrating.webp' : '/images/characters/Daniel_Thinking.webp'
  const activity = _container.querySelector('#rbActivity')

  activity.innerHTML = `
    <div class="rb-result-card ${isCalm ? 'rb-result-calm' : 'rb-result-storm'}">
      <div class="rb-result-header">
        <img src="${danielImg}" alt="Daniel" class="rb-result-daniel" />
        <div>
          <div class="rb-result-title">${isCalm ? '\u{1F3D6}\uFE0F Daniel arrived at Calm Cove!' : '\u26C8\uFE0F That road got a bit bumpy!'}</div>
          <p class="rb-result-msg">${escapeHtml(isCalm ? scn.feedback.calm : scn.feedback.storm)}</p>
        </div>
      </div>
      ${isCalm ? '<div class="rb-result-road-grow">Your calm road just got stronger!</div>' : '<div class="rb-result-road-try">The calm road is always there when you\'re ready.</div>'}
    </div>

    <div class="rb-result-summary">
      <div class="rb-summary-row">
        <span class="rb-summary-emoji">\u{1F4AD}</span>
        <span class="rb-summary-label">Thought:</span>
        <span class="rb-summary-text">${escapeHtml(scn.thought[_choices.thought].short)}</span>
        <span class="rb-summary-check">${_choices.thought === 'helpful' ? '\u2705' : '\u274C'}</span>
      </div>
      <div class="rb-summary-row">
        <span class="rb-summary-emoji">\u2764\uFE0F</span>
        <span class="rb-summary-label">Feeling:</span>
        <span class="rb-summary-text">${escapeHtml(scn.feeling[_choices.feeling].short)}</span>
        <span class="rb-summary-check">${_choices.feeling === 'helpful' ? '\u2705' : '\u274C'}</span>
      </div>
      <div class="rb-summary-row">
        <span class="rb-summary-emoji">\u{1F3C3}</span>
        <span class="rb-summary-label">Action:</span>
        <span class="rb-summary-text">${escapeHtml(scn.action[_choices.action].short)}</span>
        <span class="rb-summary-check">${_choices.action === 'helpful' ? '\u2705' : '\u274C'}</span>
      </div>
    </div>

    <div class="rb-result-btns">
      <button class="rb-btn rb-btn-primary" id="rbNextBtn">Next situation</button>
      <button class="rb-btn rb-btn-ghost" id="rbRetryBtn">Try this one again</button>
    </div>
  `

  activity.querySelector('#rbNextBtn').addEventListener('click', () => {
    _scenarioIndex = (_scenarioIndex + 1) % SCENARIOS.length
    renderIntro()
  })
  activity.querySelector('#rbRetryBtn').addEventListener('click', () => {
    renderIntro()
  })
}

// ── Road visual helpers ──

function resetRoadVisuals() {
  for (let i = 0; i < 3; i++) {
    const seg = _container?.querySelector('#rbSeg' + i)
    const chk = _container?.querySelector('#rbCheck' + i)
    if (seg) {
      seg.setAttribute('stroke', '#d0d8c0')
      seg.setAttribute('stroke-width', '14')
      seg.setAttribute('stroke-dasharray', 'none')
      seg.style.opacity = '1'
    }
    if (chk) {
      chk.setAttribute('fill', '#e8ecf0')
      chk.setAttribute('stroke', '#c0c8d0')
    }
  }
  // Reset Daniel position
  const daniel = _container?.querySelector('#rbDaniel')
  if (daniel) daniel.style.transform = 'translate(30px, 106px)'
}

function animateRoadSegment(index, isHelpful) {
  const seg = _container?.querySelector('#rbSeg' + index)
  const chk = _container?.querySelector('#rbCheck' + index)
  if (!seg) return

  if (isHelpful) {
    seg.setAttribute('stroke', '#2e8b57')
    seg.setAttribute('stroke-width', '16')
    seg.style.transition = 'all 0.6s ease'
    if (chk) {
      chk.setAttribute('fill', '#e9f6ea')
      chk.setAttribute('stroke', '#2e8b57')
    }
  } else {
    seg.setAttribute('stroke', '#b59a6a')
    seg.setAttribute('stroke-width', '12')
    seg.setAttribute('stroke-dasharray', '12 5')
    if (chk) {
      chk.setAttribute('fill', '#f6efe2')
      chk.setAttribute('stroke', '#a08868')
    }
  }
}

function moveDanielTo(checkpointIndex) {
  const daniel = _container?.querySelector('#rbDaniel')
  if (!daniel) return
  const positions = [
    { x: 130, y: 104 },
    { x: 330, y: 102 },
    { x: 520, y: 100 },
    { x: 640, y: 100 }
  ]
  const pos = positions[checkpointIndex] || positions[0]
  daniel.style.transition = 'transform 0.7s ease-in-out'
  daniel.style.transform = `translate(${pos.x}px, ${pos.y}px)`
}

function updateStrengthBar() {
  const fill = _container?.querySelector('#rbStrengthFill')
  const label = _container?.querySelector('#rbStrengthLevel')
  if (fill) fill.style.width = Math.min(100, (_strength / 7) * 100) + '%'
  const labels = ['A new path', 'A little track', 'A worn path', 'A proper road', 'A wide road', 'A smooth street', 'A calm highway', 'A calm motorway!']
  if (label) label.textContent = labels[Math.min(_strength, 7)]
}
