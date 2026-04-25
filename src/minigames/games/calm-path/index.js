// Calm Path — Trace the winding river
// A curvy path is drawn on screen with collectible stars along it.
// Hold and drag your finger/mouse along the path. Stay inside the
// boundaries. Collect stars. Reach the end to win.

import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';

class CalmPathGame extends IMiniGame {
  constructor(ctx) {
    super(ctx);
    const tier = DIFFICULTY[ctx.difficulty] || DIFFICULTY.easy;
    this.pathWidth = tier === DIFFICULTY.hard ? 22 : tier === DIFFICULTY.medium ? 28 : 34;
    this.points = [];      // path control points
    this.stars = [];       // collectible positions
    this.collected = 0;
    this.totalStars = 0;
    this.outsideCount = 0;
    this.progress = 0;     // 0..1
    this.drawing = false;
    this.trailPoints = [];
    this.finished = false;
  }

  mount() {
    const { container } = this.ctx;
    container.innerHTML = `
      <div class="mg-cp-game">
        <div class="mg-cp-hud">
          <span>⭐ <span id="mgCpStars">0</span></span>
          <span>📏 <span id="mgCpProgress">0</span>%</span>
        </div>
        <canvas class="mg-cp-canvas" id="mgCpCanvas"></canvas>
        <div class="mg-cp-hint" id="mgCpHint">Drag along the river to the end!</div>
      </div>
    `;
    this.canvas = container.querySelector('#mgCpCanvas');
    this.cctx = this.canvas.getContext('2d');
    this.starsEl = container.querySelector('#mgCpStars');
    this.progressEl = container.querySelector('#mgCpProgress');
    this.hintEl = container.querySelector('#mgCpHint');
  }

  start() {
    const c = this.canvas;
    const rect = c.parentElement.getBoundingClientRect();
    c.width = Math.floor(rect.width);
    c.height = Math.floor(Math.min(rect.height - 60, 340));

    this._generatePath();
    this._generateStars();
    this._draw();

    const getPos = (e) => {
      const r = c.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - r.left, y: touch.clientY - r.top };
    };

    const onStart = (e) => { e.preventDefault(); this.drawing = true; this.hintEl.style.display = 'none'; this._onMove(getPos(e)); };
    const onMove = (e) => { e.preventDefault(); if (this.drawing) this._onMove(getPos(e)); };
    const onEnd = () => { this.drawing = false; };

    c.addEventListener('mousedown', onStart);
    c.addEventListener('mousemove', onMove);
    c.addEventListener('mouseup', onEnd);
    c.addEventListener('touchstart', onStart, { passive: false });
    c.addEventListener('touchmove', onMove, { passive: false });
    c.addEventListener('touchend', onEnd);
  }

  _generatePath() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const segments = 14;
    this.points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = 30 + (w - 60) * t;
      // More wiggly with combined sine waves
      const y = h / 2
        + Math.sin(t * Math.PI * 3.5) * (h * 0.28)
        + Math.sin(t * Math.PI * 7) * (h * 0.08);
      this.points.push({ x, y });
    }
  }

  _generateStars() {
    this.stars = [];
    for (let i = 1; i < this.points.length - 1; i++) {
      const p = this.points[i];
      this.stars.push({ x: p.x, y: p.y, collected: false });
    }
    this.totalStars = this.stars.length;
  }

  _onMove(pos) {
    if (this.finished) return;
    this.trailPoints.push(pos);

    // Check distance to nearest path segment
    let minDist = Infinity;
    let closestT = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];
      const t = Math.max(0, Math.min(1, ((pos.x - a.x) * (b.x - a.x) + (pos.y - a.y) * (b.y - a.y)) / ((b.x - a.x) ** 2 + (b.y - a.y) ** 2)));
      const px = a.x + t * (b.x - a.x);
      const py = a.y + t * (b.y - a.y);
      const d = Math.sqrt((pos.x - px) ** 2 + (pos.y - py) ** 2);
      if (d < minDist) {
        minDist = d;
        closestT = (i + t) / (this.points.length - 1);
      }
    }

    this.progress = Math.max(this.progress, closestT);
    this.progressEl.textContent = Math.round(this.progress * 100);

    if (minDist > this.pathWidth) {
      this.outsideCount += 1;
    }

    // Check star collection
    for (const s of this.stars) {
      if (s.collected) continue;
      const d = Math.sqrt((pos.x - s.x) ** 2 + (pos.y - s.y) ** 2);
      if (d < 20) {
        s.collected = true;
        this.collected += 1;
        this.starsEl.textContent = this.collected;
        this.ctx.audio.play('chime');
      }
    }

    this._draw();

    if (this.progress >= 0.92) {
      this.finished = true;
      this._win();
    }
  }

  _draw() {
    const ctx = this.cctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw path (river)
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.lineWidth = this.pathWidth * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Inner river
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
    ctx.lineWidth = this.pathWidth;
    ctx.stroke();

    // Draw user trail
    if (this.trailPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trailPoints[0].x, this.trailPoints[0].y);
      for (const p of this.trailPoints) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Draw stars
    for (const s of this.stars) {
      ctx.font = s.collected ? '16px serif' : '22px serif';
      ctx.globalAlpha = s.collected ? 0.3 : 1;
      ctx.fillText(s.collected ? '✓' : '⭐', s.x - 10, s.y + 6);
    }
    ctx.globalAlpha = 1;

    // Start & end markers
    ctx.font = '20px serif';
    ctx.fillText('🏁', this.points[0].x - 12, this.points[0].y - 20);
    ctx.fillText('🏠', this.points[this.points.length - 1].x - 12, this.points[this.points.length - 1].y - 20);
  }

  _win() {
    const accuracy = 1 - Math.min(0.5, this.outsideCount * 0.005);
    const starBonus = this.totalStars ? this.collected / this.totalStars * 0.5 : 0;
    this._complete({
      score: Math.min(1, accuracy + starBonus),
      success: true,
      skillTags: ['focus', 'mindfulness'],
    });
  }
}

register({
  id: 'calm-path',
  displayName: 'Calm Path',
  skillTags: ['focus', 'mindfulness'],
  factory: (ctx) => new CalmPathGame(ctx),
  defaultConfig: {},
});

export default {};
