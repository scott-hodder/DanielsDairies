// Emotion Match Trail — Memory card flip game
// A grid of face-down cards. Each card is either an emoji or a label.
// Flip two at a time — match the emoji to its label to clear the pair.
// Fewer flips = more stars.

import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';

const PAIRS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Angry' },
  { emoji: '😨', label: 'Scared' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😲', label: 'Surprised' },
  { emoji: '😴', label: 'Tired' },
];

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class EmotionMatchGame extends IMiniGame {
  constructor(ctx) {
    super(ctx);
    const tier = DIFFICULTY[ctx.difficulty] || DIFFICULTY.easy;
    // Easy=4 pairs, Medium=5, Hard=6
    this.pairCount = tier === DIFFICULTY.hard ? 6 : tier === DIFFICULTY.medium ? 5 : 4;
    this.flips = 0;
    this.matched = 0;
    this.flipped = [];
    this.locked = false;
    this.cards = [];
    this.startTime = 0;
  }

  mount() {
    const { container } = this.ctx;
    container.innerHTML = '';

    // Pick random pairs
    const chosen = shuffle(PAIRS).slice(0, this.pairCount);

    // Create cards: one emoji card + one label card per pair
    this.cards = [];
    chosen.forEach((p, i) => {
      this.cards.push({ id: i, type: 'emoji', display: p.emoji, pairId: i, matched: false });
      this.cards.push({ id: i, type: 'label', display: p.label, pairId: i, matched: false });
    });
    this.cards = shuffle(this.cards);

    const cols = this.pairCount <= 4 ? 4 : this.pairCount <= 5 ? 5 : 4;

    container.innerHTML = `
      <div class="mg-em-game">
        <div class="mg-em-hud">
          <span>🃏 Flips: <strong id="mgEmFlips">0</strong></span>
          <span>✅ <span id="mgEmMatched">0</span>/${this.pairCount}</span>
        </div>
        <div class="mg-em-grid" id="mgEmGrid" style="grid-template-columns:repeat(${cols},1fr)">
          ${this.cards.map((c, i) => `
            <button type="button" class="mg-em-card" data-idx="${i}">
              <div class="mg-em-card-inner">
                <div class="mg-em-card-front">?</div>
                <div class="mg-em-card-back ${c.type}">${c.display}</div>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.grid = container.querySelector('#mgEmGrid');
    this.flipsEl = container.querySelector('#mgEmFlips');
    this.matchedEl = container.querySelector('#mgEmMatched');
  }

  start() {
    this.startTime = performance.now();
    this.grid.addEventListener('click', (e) => {
      const card = e.target.closest('.mg-em-card');
      if (!card || this.locked) return;
      const idx = Number(card.dataset.idx);
      this._flipCard(idx, card);
    });
  }

  _flipCard(idx, el) {
    const card = this.cards[idx];
    if (card.matched || this.flipped.some(f => f.idx === idx)) return;

    el.classList.add('flipped');
    this.flipped.push({ idx, el, card });
    this.flips += 1;
    this.flipsEl.textContent = this.flips;
    this.ctx.audio.play('pop');

    if (this.flipped.length === 2) {
      this.locked = true;
      const [a, b] = this.flipped;

      if (a.card.pairId === b.card.pairId && a.idx !== b.idx) {
        // Match! Keep both cards visible and highlighted
        a.card.matched = true;
        b.card.matched = true;
        this.matched += 1;
        this.matchedEl.textContent = this.matched;
        // Short delay so player can see the second card before marking matched
        setTimeout(() => {
          a.el.classList.add('matched');
          b.el.classList.add('matched');
        }, 400);
        this.ctx.audio.play('correct');
        this.flipped = [];
        this.locked = false;

        if (this.matched >= this.pairCount) {
          setTimeout(() => this._win(), 900);
        }
      } else {
        // No match — flip back
        this.ctx.audio.play('wrong');
        setTimeout(() => {
          a.el.classList.remove('flipped');
          b.el.classList.remove('flipped');
          this.flipped = [];
          this.locked = false;
        }, 700);
      }
    }
  }

  _win() {
    const perfectFlips = this.pairCount * 2;
    const ratio = perfectFlips / Math.max(this.flips, perfectFlips);
    this._complete({
      score: ratio,
      success: true,
      skillTags: ['emotion-literacy', 'memory'],
    });
  }
}

register({
  id: 'emotion-match-trail',
  displayName: 'Emotion Match',
  skillTags: ['emotion-literacy'],
  factory: (ctx) => new EmotionMatchGame(ctx),
  defaultConfig: {},
});

export default {};
