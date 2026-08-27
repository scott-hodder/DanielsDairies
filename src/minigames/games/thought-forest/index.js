/**
 * Thought Garden — Quiz-based garden transformation game.
 *
 * Daniel's garden is overgrown with thorny "unhelpful thoughts."
 * The child answers 4 cognitive reframing rounds. Each correct answer
 * clears a section of weeds and plants a beautiful flower/tree.
 * The garden transforms from dark/overgrown to bright and blooming.
 *
 * SEL skill: cognitive reframing.
 */
import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';
import { GameCanvas, ParticleEmitter, HUD, TweenManager, showIntroScreen } from '../../engine/index.js';
import DanielPlayer from '../../engine/DanielPlayer.js';

const ROUNDS = [
  {
    situation: "Daniel thinks: 'I can't do this'",
    helpful: 'I can try one step at a time',
    decoys: ['I should just give up', "I'll never be able to do it"],
    flower: { color: '#FF6B6B', accent: '#FF8A80', type: 'tulip' },
  },
  {
    situation: "Daniel thinks: 'Nobody likes me'",
    helpful: 'Some people care about me',
    decoys: ['I should stop trying to make friends', 'Everyone hates me'],
    flower: { color: '#FFD54F', accent: '#FFE082', type: 'sunflower' },
  },
  {
    situation: "Daniel thinks: 'I always mess up'",
    helpful: 'Mistakes help me learn',
    decoys: ["I'm the worst at everything", "I shouldn't even try"],
    flower: { color: '#CE93D8', accent: '#E1BEE7', type: 'lavender' },
  },
  {
    situation: "Daniel thinks: 'It's too hard'",
    helpful: 'I can ask for help',
    decoys: ["I'll just hide", 'Hard things are impossible'],
    flower: { color: '#4FC3F7', accent: '#81D4FA', type: 'bluebell' },
  },
];

// Garden section positions (4 quadrants around Daniel)
const SECTIONS = [
  { x: 0.18, y: 0.45 },  // left
  { x: 0.82, y: 0.45 },  // right
  { x: 0.35, y: 0.25 },  // top-left
  { x: 0.65, y: 0.25 },  // top-right
];

class ThoughtForest extends IMiniGame {
  mount() {
    const c = this.ctx.container;
    c.innerHTML = '';
    c.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:#4a7a3a;';

    this._disposed = false;
    this._timeouts = [];

    this._gc = new GameCanvas(c);
    this._particles = new ParticleEmitter();
    this._tweens = new TweenManager();
    this._hud = new HUD(c);

    const w = this._gc.width;
    const h = this._gc.height;

    // Daniel in center of garden
    this._danielPlayer = new DanielPlayer({ x: w / 2 - 17, y: h * 0.5 - 10, size: 34, facing: 'right' });
    this._animTime = 0;

    // Game state
    this._currentRound = 0;
    this._lives = 3;
    this._maxLives = 3;
    // Thought Filter (earned by finishing a Thought Driver adventure)
    // grants one extra heart — a visible reward for real learning.
    if (this.ctx?.tools?.includes('thought-filter')) {
      this._lives = 4;
      this._maxLives = 4;
    }
    this._phase = 'playing';
    this._clearedSections = [false, false, false, false];
    this._pulledSections = [false, false, false, false];
    this._correctCount = 0;
    this._streak = 0;
    this._holdRaf = 0;

    // DOM overlay elements
    this._overlay = document.createElement('div');
    this._overlay.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;pointer-events:none;z-index:10;';
    c.appendChild(this._overlay);

    this._hud.setLives(this._lives, this._maxLives);
    this._hud.setObjective('Clear the weeds!');
    this._hud.setScore(`0/${ROUNDS.length} planted`);
  }

  async start() {
    await showIntroScreen(this.ctx.container, {
      title: 'Thought Garden',
      story: "Daniel's garden is overgrown with thorny unhelpful thoughts! Grab each weed and PULL it right out, then plant a stronger thought in its place.",
      controls: 'Press and hold to pull weeds, click to plant',
      mobileControls: 'Press and hold to pull, tap to plant',
      goal: 'Pull all 4 weeds and make the garden bloom!',
    });
    this._gc.run(
      (dt) => this._update(dt),
      (ctx) => this._render(ctx),
    );
    this._showRound();
  }

  _showRound() {
    if (this._disposed) return;
    if (this._currentRound >= ROUNDS.length) {
      this._onWin();
      return;
    }
    this._showPullPhase();
  }

  _makeBanner(text, sub) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      margin:8px auto 0;padding:10px 18px;max-width:90%;border-radius:14px;
      background:rgba(64,88,120,0.92);color:#fff;font-size:15px;font-weight:700;
      text-align:center;font-family:'League Spartan',sans-serif;pointer-events:none;
    `;
    banner.textContent = text;
    if (sub) {
      const s = document.createElement('div');
      s.style.cssText = 'font-size:12.5px;font-weight:600;color:#ffe082;margin-top:3px;';
      s.textContent = sub;
      banner.appendChild(s);
    }
    return banner;
  }

  // ── Phase 1: grab the weed and PULL it out (hold to pull) ──
  _showPullPhase() {
    const round = ROUNDS[this._currentRound];
    const sec = SECTIONS[this._currentRound];
    this._overlay.innerHTML = '';
    this._overlay.style.pointerEvents = 'auto';
    this._hud.setObjective('Pull that weed out!');

    this._overlay.appendChild(this._makeBanner(round.situation, 'Press and HOLD the weed to pull that thought out!'));

    // Spacer keeps the banner pinned to the top (overlay is bottom-justified)
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    this._overlay.appendChild(spacer);

    const HOLD_TIME = 1.1; // seconds of pulling
    const CIRC = 264; // ring circumference (r=42)

    const target = document.createElement('div');
    target.style.cssText = `
      position:absolute;left:${sec.x * 100}%;top:${sec.y * 100}%;
      transform:translate(-50%,-50%);width:104px;height:104px;
      pointer-events:auto;cursor:grab;touch-action:none;user-select:none;
      display:flex;align-items:center;justify-content:center;
    `;
    target.innerHTML = `
      <svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%">
        <circle cx="50" cy="50" r="42" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.55)" stroke-width="4" stroke-dasharray="6 8"/>
        <circle class="tg-ring" cx="50" cy="50" r="42" fill="none" stroke="#FFD54F" stroke-width="6" stroke-linecap="round"
          stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}" transform="rotate(-90 50 50)"/>
      </svg>
      <span class="tg-hand" style="font-size:34px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4))">✊</span>
    `;
    this._overlay.appendChild(target);

    const ring = target.querySelector('.tg-ring');
    const hand = target.querySelector('.tg-hand');
    let holdStart = 0;

    const stopHold = () => {
      if (this._holdRaf) cancelAnimationFrame(this._holdRaf);
      this._holdRaf = 0;
      holdStart = 0;
      ring.style.strokeDashoffset = CIRC;
      hand.style.transform = '';
      target.style.cursor = 'grab';
    };

    const tick = (now) => {
      if (this._disposed || !holdStart) return;
      const p = Math.min(1, (now - holdStart) / (HOLD_TIME * 1000));
      ring.style.strokeDashoffset = CIRC * (1 - p);
      // Wobble harder as the weed resists
      const wob = Math.sin(now * 0.04) * (3 + p * 7);
      hand.style.transform = `rotate(${wob}deg) scale(${1 + p * 0.25})`;
      if (p >= 1) {
        this._onWeedPulled(target);
        return;
      }
      this._holdRaf = requestAnimationFrame(tick);
    };

    target.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { target.setPointerCapture(e.pointerId); } catch (_) {}
      target.style.cursor = 'grabbing';
      holdStart = performance.now();
      this.ctx.audio.play('jump');
      this._holdRaf = requestAnimationFrame(tick);
    });
    target.addEventListener('pointerup', stopHold);
    target.addEventListener('pointercancel', stopHold);
  }

  _onWeedPulled(target) {
    if (this._holdRaf) cancelAnimationFrame(this._holdRaf);
    this._holdRaf = 0;
    const idx = this._currentRound;
    this._pulledSections[idx] = true;
    target.remove();

    // POP! — dirt and thorn bits fly
    const w = this._gc.width;
    const h = this._gc.height;
    const sec = SECTIONS[idx];
    this._particles.emit({
      x: sec.x * w, y: sec.y * h, count: 18,
      color: '#6B4A2E', spread: 70, life: 0.7,
    });
    this._particles.emit({
      x: sec.x * w, y: sec.y * h, count: 8,
      color: '#4A2060', spread: 50, life: 0.5,
    });
    this._gc.shake(3, 160);
    this.ctx.audio.play('collect');
    this._hud.flash('POP! You pulled it out!', '#8BC34A');
    this._danielPlayer.celebrate(0.8);

    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._showChoicePhase();
    }, 650);
    this._timeouts.push(tid);
  }

  // ── Phase 2: plant a stronger thought in the cleared soil ──
  _showChoicePhase() {
    const round = ROUNDS[this._currentRound];
    this._overlay.innerHTML = '';
    this._overlay.style.pointerEvents = 'auto';
    this._hud.setObjective('Plant a stronger thought!');

    this._overlay.appendChild(this._makeBanner(round.situation, 'The soil is clear — which thought should Daniel plant?'));

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    this._overlay.appendChild(spacer);

    // Cards container at bottom
    const cardsBox = document.createElement('div');
    cardsBox.style.cssText = 'padding:6px 12px 12px;display:flex;flex-direction:column;gap:6px;';

    // Shuffle options
    const options = [
      { text: round.helpful, correct: true },
      ...round.decoys.map(t => ({ text: t, correct: false })),
    ].sort(() => Math.random() - 0.5);

    for (const opt of options) {
      const btn = document.createElement('button');
      btn.style.cssText = `
        width:100%;padding:14px 16px;border:none;border-radius:12px;
        background:#fff;color:#333;font-size:14px;font-weight:600;
        font-family:'League Spartan',sans-serif;cursor:pointer;
        text-align:left;transition:all 0.2s;box-shadow:0 2px 6px rgba(0,0,0,0.15);
        pointer-events:auto;min-height:48px;
      `;
      btn.textContent = opt.text;

      btn.addEventListener('click', () => {
        if (btn.dataset.used) return;
        btn.dataset.used = '1';

        if (opt.correct) {
          btn.style.background = '#C8E6C9';
          btn.style.borderLeft = '4px solid #4CAF50';
          this._onCorrect();
        } else {
          btn.style.background = '#FFCDD2';
          btn.style.borderLeft = '4px solid #EF5350';
          btn.style.opacity = '0.6';
          btn.style.pointerEvents = 'none';
          this._onWrong();
        }
      });

      cardsBox.appendChild(btn);
    }

    this._overlay.appendChild(cardsBox);
  }

  _onCorrect() {
    const sectionIdx = this._currentRound;
    this._clearedSections[sectionIdx] = true;
    this._correctCount++;
    this._streak++;
    this._hud.setScore(`${this._correctCount}/${ROUNDS.length} planted`);

    const round = ROUNDS[this._currentRound];
    this._hud.flash(this._streak >= 2 ? `🌟 Garden streak ×${this._streak}! ${round.helpful}` : `Beautiful! ${round.helpful}`, '#4CAF50');
    this.ctx.audio.play('collect');

    // Celebration particles at the cleared section — bigger with a streak
    const w = this._gc.width;
    const h = this._gc.height;
    const sec = SECTIONS[sectionIdx];
    this._particles.emit({
      x: sec.x * w, y: sec.y * h, count: 16 + this._streak * 6,
      color: round.flower.color, spread: 50 + this._streak * 12, life: 0.8, shape: 'star',
    });
    this._danielPlayer.celebrate(1.5);

    this._currentRound++;
    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._showRound();
    }, 1200);
    this._timeouts.push(tid);
  }

  _onWrong() {
    this._lives--;
    this._streak = 0;
    this._hud.setLives(this._lives, this._maxLives);
    this._hud.flash('That thought would grow more weeds — try again!', '#EF4444');
    this._gc.shake(4, 200);
    this.ctx.audio.play('hit');

    if (this._lives <= 0) {
      this._onLose();
    }
  }

  _onWin() {
    this._phase = 'ending';
    this._overlay.innerHTML = '';
    this._overlay.style.pointerEvents = 'none';
    this._hud.flash('The garden is blooming!', '#4CAF50');
    this._danielPlayer.celebrate(2);
    this._particles.emit({
      x: this._gc.width / 2, y: this._gc.height / 2, count: 30,
      color: '#FFD700', spread: 120, life: 1.2, shape: 'star',
    });
    const score = Math.min(1, (this._lives / this._maxLives) * 0.4 + 0.6);
    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._complete({ score, skillTags: ['cognitive-reframing'] });
    }, 1800);
    this._timeouts.push(tid);
  }

  _onLose() {
    this._phase = 'ending';
    this._overlay.innerHTML = '';
    this._overlay.style.pointerEvents = 'none';
    this._hud.flash('Keep trying — helpful thoughts take practice!', '#EF4444');
    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._fail({ score: this._correctCount / ROUNDS.length * 0.4, skillTags: ['cognitive-reframing'] });
    }, 900);
    this._timeouts.push(tid);
  }

  _update(dt) {
    if (this._disposed) return;
    this._animTime += dt;
    this._tweens.update(dt);
    this._particles.update(dt);
    this._danielPlayer.update(dt);
  }

  _render(ctx) {
    const w = this._gc.width;
    const h = this._gc.height;
    const t = this._animTime;
    this._gc.clear();

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(1, '#B0E0FF');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.35);

    // Sun
    ctx.save();
    ctx.fillStyle = '#FFE135';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.08, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ground
    const groundGrad = ctx.createLinearGradient(0, h * 0.3, 0, h);
    const allCleared = this._clearedSections.every(c => c);
    if (allCleared) {
      groundGrad.addColorStop(0, '#6db85a');
      groundGrad.addColorStop(1, '#4a9640');
    } else {
      groundGrad.addColorStop(0, '#5a8a40');
      groundGrad.addColorStop(1, '#3a6e2a');
    }
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.3, w, h * 0.7);

    // Garden fence at edges
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.32);
    ctx.lineTo(w, h * 0.32);
    ctx.stroke();
    // Fence posts
    for (let fx = 15; fx < w; fx += 40) {
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(fx - 2, h * 0.28, 4, 14);
    }

    // Draw 4 garden sections
    for (let i = 0; i < 4; i++) {
      const sec = SECTIONS[i];
      const sx = sec.x * w;
      const sy = sec.y * h;

      if (this._clearedSections[i]) {
        // Blooming section — flower patch
        this._drawFlowerSection(ctx, sx, sy, ROUNDS[i].flower, t, i);
      } else if (this._pulledSections[i]) {
        // Weed pulled, waiting for planting — clear soil, ready and hopeful
        this._drawSoilSection(ctx, sx, sy, t);
      } else {
        // Overgrown section — thorny weeds
        this._drawWeedSection(ctx, sx, sy, t, i);
      }
    }

    // Garden path (stone path in center)
    ctx.fillStyle = 'rgba(180,160,120,0.4)';
    for (let py = h * 0.35; py < h * 0.7; py += 18) {
      ctx.beginPath();
      ctx.ellipse(w / 2 + Math.sin(py * 0.1) * 8, py, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Daniel in center
    this._danielPlayer.render(ctx);

    // Particles
    this._particles.render(ctx);
  }

  _drawWeedSection(ctx, cx, cy, t, idx) {
    const radius = 45;

    // Dark soil patch
    ctx.fillStyle = '#3D2E1E';
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thorny vines
    ctx.strokeStyle = '#2D1B30';
    ctx.lineWidth = 2;
    for (let v = 0; v < 6; v++) {
      const angle = (v / 6) * Math.PI * 2 + t * 0.2;
      const len = 20 + Math.sin(t + v * 1.3) * 8;
      const sx = cx + Math.cos(angle) * 8;
      const sy = cy + Math.sin(angle) * 5;
      const ex = cx + Math.cos(angle) * len;
      const ey = cy + Math.sin(angle) * len * 0.6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + Math.cos(angle + 0.5) * len * 0.5,
        sy + Math.sin(angle + 0.5) * len * 0.3,
        ex, ey
      );
      ctx.stroke();

      // Thorns
      ctx.fillStyle = '#4A2060';
      for (let ti = 0.3; ti < 0.9; ti += 0.3) {
        const tx = sx + (ex - sx) * ti;
        const ty = sy + (ey - sy) * ti;
        ctx.beginPath();
        ctx.arc(tx, ty, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Dark cloud over section
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(t * 1.5 + idx) * 0.05;
    ctx.fillStyle = '#3D2E40';
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 25, 0, Math.PI * 2);
    ctx.arc(cx - 15, cy - 5, 18, 0, Math.PI * 2);
    ctx.arc(cx + 15, cy - 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawSoilSection(ctx, cx, cy, t) {
    const radius = 45;
    // Freshly turned soil
    ctx.fillStyle = '#5A4430';
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6B5238';
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 0.7, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Soft sparkle so the cleared patch feels inviting
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.3;
    ctx.fillStyle = '#FFF8E1';
    ctx.beginPath();
    ctx.arc(cx + 12, cy - 8, 2.4, 0, Math.PI * 2);
    ctx.arc(cx - 14, cy + 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawFlowerSection(ctx, cx, cy, flower, t, idx) {
    const radius = 45;

    // Bright green grass patch
    ctx.fillStyle = '#7BC86C';
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lighter inner
    ctx.fillStyle = '#8ED87E';
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 0.7, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw flowers based on type
    const positions = [
      { x: cx - 18, y: cy - 8 },
      { x: cx + 15, y: cy - 5 },
      { x: cx - 5, y: cy + 8 },
      { x: cx + 20, y: cy + 5 },
      { x: cx - 22, y: cy + 10 },
    ];

    for (let f = 0; f < positions.length; f++) {
      const fx = positions[f].x;
      const fy = positions[f].y;
      const sway = Math.sin(t * 2 + f * 1.5 + idx) * 2;

      // Stem
      ctx.strokeStyle = '#2E7D32';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 12);
      ctx.lineTo(fx + sway, fy);
      ctx.stroke();

      // Flower petals
      ctx.fillStyle = flower.color;
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2 + t * 0.5;
        ctx.beginPath();
        ctx.ellipse(
          fx + sway + Math.cos(pa) * 5,
          fy + Math.sin(pa) * 5,
          4, 3, pa, 0, Math.PI * 2
        );
        ctx.fill();
      }

      // Center
      ctx.fillStyle = flower.accent;
      ctx.beginPath();
      ctx.arc(fx + sway, fy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Small butterflies near blooming sections
    const bx = cx + Math.sin(t * 2 + idx * 2) * 30;
    const by = cy - 20 + Math.cos(t * 3 + idx) * 10;
    ctx.fillStyle = flower.color;
    ctx.save();
    ctx.translate(bx, by);
    const wingFlap = Math.sin(t * 10) * 0.4;
    // Left wing
    ctx.beginPath();
    ctx.ellipse(-3, 0, 4, 3, wingFlap, 0, Math.PI * 2);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.ellipse(3, 0, 4, 3, -wingFlap, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = '#333';
    ctx.fillRect(-0.5, -3, 1, 6);
    ctx.restore();
  }

  dispose() {
    this._disposed = true;
    if (this._holdRaf) cancelAnimationFrame(this._holdRaf);
    for (const tid of this._timeouts) clearTimeout(tid);
    this._timeouts = [];
    this._overlay?.remove();
    this._gc?.dispose();
    this._hud?.dispose();
    super.dispose();
  }
}

register({
  id: 'thought-forest',
  name: 'Thought Garden',
  displayName: 'Thought Garden',
  description: 'Pull out thorny thoughts and plant stronger ones!',
  skillTags: ['cognitive-reframing'],
  defaultConfig: {},
  factory: (ctx) => new ThoughtForest(ctx),
});

export default ThoughtForest;
