// Kindness Quest — Side-scroll adventure
// Daniel walks along a path. Characters appear with problems.
// Pick the kind action to help them — Daniel powers up, flowers bloom.
// Pick the unkind one — rain and slowdown.
// Reach the village at the end.

import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';

const ENCOUNTERS = [
  { who: '🐱', problem: 'A kitten is stuck in the rain.',
    kind: { text: 'Give it shelter', effect: '☀️' },
    unkind: { text: 'Walk past it', effect: '🌧️' } },
  { who: '👦', problem: 'A boy dropped his books.',
    kind: { text: 'Help pick them up', effect: '📚' },
    unkind: { text: 'Step over them', effect: '🌧️' } },
  { who: '👧', problem: 'A girl is sitting alone at lunch.',
    kind: { text: 'Invite her to sit with you', effect: '🌻' },
    unkind: { text: 'Ignore her', effect: '🌧️' } },
  { who: '🧓', problem: 'An old man can\'t reach the shelf.',
    kind: { text: 'Help him reach it', effect: '⭐' },
    unkind: { text: 'Keep walking', effect: '🌧️' } },
  { who: '🐶', problem: 'A puppy looks lost and scared.',
    kind: { text: 'Help find its owner', effect: '🏠' },
    unkind: { text: 'Shoo it away', effect: '🌧️' } },
  { who: '👶', problem: 'A little kid is crying.',
    kind: { text: 'Ask if they\'re okay', effect: '💛' },
    unkind: { text: 'Tell them to stop', effect: '🌧️' } },
  { who: '🧑‍🦽', problem: 'Someone\'s wheelchair is stuck.',
    kind: { text: 'Push them free', effect: '💪' },
    unkind: { text: 'Pretend you didn\'t see', effect: '🌧️' } },
];

function shuffle(a) { return a.slice().sort(() => Math.random() - 0.5); }

class KindnessQuestGame extends IMiniGame {
  constructor(ctx) {
    super(ctx);
    const tier = DIFFICULTY[ctx.difficulty] || DIFFICULTY.easy;
    this.encounterCount = Math.max(4, Math.round(5 * tier.targetCountMultiplier));
    this.encounters = shuffle(ENCOUNTERS).slice(0, this.encounterCount);
    this.current = 0;
    this.kindChoices = 0;
    this.danielX = 0;       // 0..100 (percentage progress)
    this.walking = false;
    this._raf = null;
    this._lastFrame = 0;
  }

  mount() {
    const { container } = this.ctx;
    container.innerHTML = `
      <div class="mg-kq-game">
        <div class="mg-kq-sky" id="mgKqSky">
          <div class="mg-kq-ground"></div>
          <div class="mg-kq-daniel" id="mgKqDaniel"><img src="/images/characters/DanielTheDog.webp" alt="Daniel" class="mg-daniel-sprite"></div>
          <div class="mg-kq-village">🏘️</div>
          <div class="mg-kq-flowers" id="mgKqFlowers"></div>
          <div class="mg-kq-weather" id="mgKqWeather"></div>
        </div>
        <div class="mg-kq-progress-bar">
          <div class="mg-kq-progress-fill" id="mgKqBar"></div>
        </div>
        <div class="mg-kq-encounter" id="mgKqEncounter"></div>
      </div>
    `;
    this.daniel = container.querySelector('#mgKqDaniel');
    this.bar = container.querySelector('#mgKqBar');
    this.encounterEl = container.querySelector('#mgKqEncounter');
    this.sky = container.querySelector('#mgKqSky');
    this.flowersEl = container.querySelector('#mgKqFlowers');
    this.weatherEl = container.querySelector('#mgKqWeather');
  }

  start() {
    this._walk(15, () => this._showEncounter());
    this._lastFrame = performance.now();
    this._loop();
  }

  _loop() {
    const now = performance.now();
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;

    if (this.walking) {
      this.danielX = Math.min(this._walkTarget, this.danielX + 25 * dt);
      this.daniel.style.left = this.danielX + '%';
      this.bar.style.width = this.danielX + '%';
      if (this.danielX >= this._walkTarget) {
        this.walking = false;
        if (this._walkCallback) this._walkCallback();
      }
    }

    if (this.state.is('playing')) {
      this._raf = requestAnimationFrame(() => this._loop());
    }
  }

  _walk(targetPct, cb) {
    this._walkTarget = targetPct;
    this._walkCallback = cb;
    this.walking = true;
  }

  _showEncounter() {
    if (this.current >= this.encounters.length) {
      this._walk(98, () => this._win());
      return;
    }
    const enc = this.encounters[this.current];
    const shuffled = Math.random() < 0.5
      ? [{ ...enc.kind, isKind: true }, { ...enc.unkind, isKind: false }]
      : [{ ...enc.unkind, isKind: false }, { ...enc.kind, isKind: true }];

    this.encounterEl.innerHTML = `
      <div class="mg-kq-card">
        <div class="mg-kq-who">${enc.who}</div>
        <p class="mg-kq-problem">${enc.problem}</p>
        <div class="mg-kq-choices">
          ${shuffled.map((c, i) => `<button type="button" class="mg-kq-choice" data-i="${i}">${c.text}</button>`).join('')}
        </div>
      </div>
    `;
    this.encounterEl.querySelectorAll('.mg-kq-choice').forEach((btn, i) => {
      btn.addEventListener('click', () => this._choose(shuffled[i], btn));
    });
  }

  _choose(choice, btn) {
    this.encounterEl.querySelectorAll('.mg-kq-choice').forEach(b => { b.disabled = true; });
    btn.classList.add(choice.isKind ? 'kind' : 'unkind');
    this.current += 1;

    if (choice.isKind) {
      this.kindChoices += 1;
      this.ctx.audio.play('correct');
      // Bloom flowers
      const flower = document.createElement('span');
      flower.className = 'mg-kq-flower';
      flower.textContent = ['🌻', '🌸', '🌺', '🌼'][Math.floor(Math.random() * 4)];
      flower.style.left = this.danielX + '%';
      this.flowersEl.appendChild(flower);
      this.weatherEl.textContent = choice.effect;
      this.weatherEl.className = 'mg-kq-weather sunny';
    } else {
      this.ctx.audio.play('wrong');
      this.weatherEl.textContent = '🌧️';
      this.weatherEl.className = 'mg-kq-weather rainy';
    }

    const nextStop = 15 + ((this.current) / this.encounterCount) * 80;
    setTimeout(() => {
      this.encounterEl.innerHTML = '';
      this.weatherEl.className = 'mg-kq-weather';
      this._walk(nextStop, () => this._showEncounter());
    }, 900);
  }

  _win() {
    this._complete({
      score: this.kindChoices / this.encounterCount,
      success: this.kindChoices / this.encounterCount >= 0.5,
      skillTags: ['empathy', 'kindness'],
    });
  }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    super.dispose();
  }
}

register({
  id: 'kindness-quest',
  displayName: 'Kindness Quest',
  skillTags: ['empathy', 'kindness'],
  factory: (ctx) => new KindnessQuestGame(ctx),
  defaultConfig: {},
});

export default {};
