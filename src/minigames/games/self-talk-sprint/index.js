// Self-Talk Sprint — Timed Reflex Shield Game
// Negative thought clouds fly at Daniel from the right.
// A countdown timer ticks down for each one. Pick the correct
// positive reframe before time runs out to raise a shield and
// blast the cloud. Wrong answer or timeout = Daniel gets hit.
// Build up a combo streak for bonus points. Reach the end to win.

import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';

const OBSTACLES = [
  { negative: "I'm so bad at this.", positive: "I can keep practising.", wrong: "I should just stop." },
  { negative: "Nobody wants me.", positive: "I can say hi first.", wrong: "I'll stay alone forever." },
  { negative: "I'll never get it.", positive: "One step at a time.", wrong: "Why even try?" },
  { negative: "I messed up again.", positive: "Mistakes help me learn.", wrong: "I always ruin things." },
  { negative: "Everyone is better.", positive: "I'm on my own path.", wrong: "I'm the worst." },
  { negative: "I can't do this.", positive: "I'll try a different way.", wrong: "It's too hard." },
  { negative: "I'm scared to try.", positive: "Brave means trying anyway.", wrong: "I'll just hide." },
  { negative: "They'll laugh at me.", positive: "Real friends support me.", wrong: "I should stay quiet." },
];

function shuffle(a) { return a.slice().sort(() => Math.random() - 0.5); }

class SelfTalkSprintGame extends IMiniGame {
  constructor(ctx) {
    super(ctx);
    const tier = DIFFICULTY[ctx.difficulty] || DIFFICULTY.easy;
    this.obstacleCount = Math.max(5, Math.round(6 * tier.targetCountMultiplier));
    this.timePerCloud = tier === DIFFICULTY.hard ? 3500 : tier === DIFFICULTY.medium ? 4500 : 5500;
    this.queue = shuffle(OBSTACLES).slice(0, this.obstacleCount);
    this.current = 0;
    this.correct = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hits = 0;
    this._raf = null;
    this._timerHandle = null;
    this._lastFrame = 0;
    this._cloudTime = 0;
    this._cloudActive = false;
    this._cloudX = 100; // percentage from left
  }

  mount() {
    const { container } = this.ctx;
    container.innerHTML = `
      <div class="mg-ss-game mg-ss-v2">
        <div class="mg-ss-hud">
          <span>🛡️ <span id="mgSsCorrect">0</span>/${this.obstacleCount}</span>
          <span class="mg-ss-combo" id="mgSsCombo"></span>
          <span>⚡ <span id="mgSsHits">0</span> hits</span>
        </div>
        <div class="mg-ss-scene" id="mgSsScene">
          <div class="mg-ss-bg" id="mgSsBg">
            <div class="mg-ss-ground"></div>
            <div class="mg-ss-clouds-bg">☁️ ☁️ ☁️</div>
          </div>
          <div class="mg-ss-daniel" id="mgSsDaniel">
            <img src="/images/characters/DanielTheDog.webp" alt="Daniel" class="mg-daniel-sprite">
          </div>
          <div class="mg-ss-shield" id="mgSsShield">🛡️</div>
          <div class="mg-ss-cloud" id="mgSsCloud"></div>
        </div>
        <div class="mg-ss-timer-bar">
          <div class="mg-ss-timer-fill" id="mgSsTimer"></div>
        </div>
        <div class="mg-ss-prompt" id="mgSsPrompt"></div>
        <div class="mg-ss-choices" id="mgSsChoices"></div>
      </div>
    `;
    this.danielEl = container.querySelector('#mgSsDaniel');
    this.shieldEl = container.querySelector('#mgSsShield');
    this.cloudEl = container.querySelector('#mgSsCloud');
    this.timerFill = container.querySelector('#mgSsTimer');
    this.promptEl = container.querySelector('#mgSsPrompt');
    this.choicesEl = container.querySelector('#mgSsChoices');
    this.correctEl = container.querySelector('#mgSsCorrect');
    this.hitsEl = container.querySelector('#mgSsHits');
    this.comboEl = container.querySelector('#mgSsCombo');
    this.bgEl = container.querySelector('#mgSsBg');
  }

  start() {
    this._lastFrame = performance.now();
    this._launchCloud();
    this._loop();
  }

  _launchCloud() {
    if (this.current >= this.queue.length) {
      setTimeout(() => this._win(), 400);
      return;
    }
    const obs = this.queue[this.current];
    this._cloudActive = true;
    this._cloudTime = 0;
    this._cloudX = 95;

    // Show the approaching negative thought
    this.cloudEl.textContent = '💭 ' + obs.negative;
    this.cloudEl.classList.add('visible');
    this.cloudEl.style.right = '5%';

    // Show prompt
    this.promptEl.textContent = 'Pick the positive reframe!';

    // Show choices
    const opts = Math.random() < 0.5
      ? [{ text: obs.positive, ok: true }, { text: obs.wrong, ok: false }]
      : [{ text: obs.wrong, ok: false }, { text: obs.positive, ok: true }];

    this.choicesEl.innerHTML = opts.map((o, i) =>
      `<button type="button" class="mg-ss-choice" data-i="${i}">${o.text}</button>`
    ).join('');

    this.choicesEl.querySelectorAll('.mg-ss-choice').forEach((btn, i) => {
      btn.addEventListener('click', () => this._pick(opts[i], btn));
    });

    // Reset timer bar
    this.timerFill.style.width = '100%';
    this.timerFill.className = 'mg-ss-timer-fill';
  }

  _pick(opt, btn) {
    if (!this._cloudActive) return;
    this._cloudActive = false;
    this.choicesEl.querySelectorAll('.mg-ss-choice').forEach(b => { b.disabled = true; });
    this.current += 1;

    if (opt.ok) {
      btn.classList.add('correct');
      this.correct += 1;
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.correctEl.textContent = this.correct;
      this.comboEl.textContent = this.combo > 1 ? `🔥 ${this.combo}x combo!` : '';
      this.ctx.audio.play('correct');

      // Shield animation
      this.shieldEl.classList.add('active');
      this.cloudEl.classList.add('blasted');
      this.promptEl.textContent = '✨ Great reframe!';

      setTimeout(() => {
        this.shieldEl.classList.remove('active');
        this.cloudEl.classList.remove('visible', 'blasted');
        this.choicesEl.innerHTML = '';
        this.promptEl.textContent = '';
        setTimeout(() => this._launchCloud(), 600);
      }, 700);
    } else {
      btn.classList.add('wrong');
      this.combo = 0;
      this.hits += 1;
      this.hitsEl.textContent = this.hits;
      this.comboEl.textContent = '';
      this.ctx.audio.play('wrong');

      this.danielEl.classList.add('hit');
      this.cloudEl.classList.add('impact');
      this.promptEl.textContent = '💥 Ouch! That wasn\'t quite right.';

      setTimeout(() => {
        this.danielEl.classList.remove('hit');
        this.cloudEl.classList.remove('visible', 'impact');
        this.choicesEl.innerHTML = '';
        this.promptEl.textContent = '';
        setTimeout(() => this._launchCloud(), 600);
      }, 800);
    }
  }

  _timeout() {
    if (!this._cloudActive) return;
    this._cloudActive = false;
    this.current += 1;
    this.combo = 0;
    this.hits += 1;
    this.hitsEl.textContent = this.hits;
    this.comboEl.textContent = '';
    this.ctx.audio.play('wrong');

    this.choicesEl.querySelectorAll('.mg-ss-choice').forEach(b => { b.disabled = true; });
    this.danielEl.classList.add('hit');
    this.cloudEl.classList.add('impact');
    this.promptEl.textContent = '⏰ Too slow! The cloud got you!';

    setTimeout(() => {
      this.danielEl.classList.remove('hit');
      this.cloudEl.classList.remove('visible', 'impact');
      this.choicesEl.innerHTML = '';
      this.promptEl.textContent = '';
      setTimeout(() => this._launchCloud(), 600);
    }, 800);
  }

  _loop() {
    const now = performance.now();
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;

    if (!this.state.is('playing')) return;

    if (this._cloudActive) {
      this._cloudTime += dt * 1000;
      const ratio = 1 - this._cloudTime / this.timePerCloud;
      this.timerFill.style.width = Math.max(0, ratio * 100) + '%';

      // Color the timer bar
      if (ratio < 0.25) {
        this.timerFill.className = 'mg-ss-timer-fill danger';
      } else if (ratio < 0.5) {
        this.timerFill.className = 'mg-ss-timer-fill warning';
      }

      // Move cloud toward Daniel
      this._cloudX = 95 - (this._cloudTime / this.timePerCloud) * 70;
      this.cloudEl.style.right = (100 - this._cloudX) + '%';

      // Timeout
      if (this._cloudTime >= this.timePerCloud) {
        this._timeout();
      }
    }

    // Daniel idle bobbing
    if (!this.danielEl.classList.contains('hit')) {
      this.danielEl.style.transform = `translateY(${Math.sin(performance.now() / 400) * 3}px)`;
    }

    this._raf = requestAnimationFrame(() => this._loop());
  }

  _win() {
    const score = this.correct / this.obstacleCount;
    const comboBonus = Math.min(0.15, this.maxCombo * 0.03);
    this._complete({
      score: Math.min(1, score + comboBonus),
      success: score >= 0.5,
      skillTags: ['cognitive-reframing', 'self-compassion'],
    });
  }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    super.dispose();
  }
}

register({
  id: 'self-talk-sprint',
  displayName: 'Self-Talk Sprint',
  skillTags: ['cognitive-reframing'],
  factory: (ctx) => new SelfTalkSprintGame(ctx),
  defaultConfig: {},
});

export default {};
