/**
 * Courage Canyon -- Side-scrolling platformer bridge crossing.
 *
 * Daniel crosses a canyon by jumping between stone ledge platforms that form
 * a broken bridge. A Worry Monster lurks in the mist below. Hold the jump
 * button longer for a "courage breath" super-jump. Collect courage stars.
 *
 * SEL skill: self-regulation, breathing control, courage.
 */
import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';
import { GameCanvas, InputManager, ParticleEmitter, HUD, TweenManager, showIntroScreen, DANIEL_IMAGES } from '../../engine/index.js';
import DanielPlayer from '../../engine/DanielPlayer.js';

/* ── constants ─────────────────────────────────────────────── */
const GRAVITY           = 900;
const JUMP_VELOCITY     = -340;
const SUPER_JUMP_VEL    = -500;
const HOLD_THRESHOLD    = 0.5;          // seconds to trigger courage breath
const AUTO_RUN_SPEED    = 90;           // px / s
const BRIDGE_Y_RATIO    = 0.68;        // bridge sits at 68% screen height
const SECTIONS          = 3;
const MONSTER_BASE_Y    = 0.82;        // fraction of screen height

const WORRY_PHRASES = [
  "You can't do it!",
  "It's too scary!",
  "You'll fall!",
  "Give up now!",
  "You're not brave enough!",
];

class CourageCanyon extends IMiniGame {

  /* ================================================================
   *  MOUNT
   * ================================================================ */
  mount() {
    const c = this.ctx.container;
    c.innerHTML = '';
    c.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:#5B8DBE;';

    this._gc        = new GameCanvas(c);
    this._input     = new InputManager(this._gc.canvas);
    this._particles = new ParticleEmitter();
    this._tweens    = new TweenManager();
    this._hud       = new HUD(c);

    const diff = DIFFICULTY[this.ctx.difficulty] || DIFFICULTY.medium;
    const w = this._gc.width;
    const h = this._gc.height;

    /* ── Daniel ─────────────────────────────────────────────── */
    this._daniel = new DanielPlayer({ x: 60, y: h * BRIDGE_Y_RATIO - 36, size: 34, facing: 'right' });
    this._daniel.vy = 0;
    this._daniel.grounded = true;

    /* ── Game state ─────────────────────────────────────────── */
    this._disposed      = false;
    this._timeouts      = [];
    this._phase         = 'playing';       // playing | ending
    this._scrollX       = 0;
    this._autoSpeed     = AUTO_RUN_SPEED * diff.speedMultiplier;
    this._lives         = 3;
    this._maxLives      = 3;
    this._starsCollected = 0;
    this._section       = 0;              // 0-based current section index
    this._animTime      = 0;

    /* ── Hold / jump detection state ───────────────────────── */
    this._holding       = false;
    this._holdStart     = 0;              // timestamp when hold began
    this._jumpConsumed  = false;          // prevents double-jump per press
    this._canJump       = true;

    /* ── Level generation ──────────────────────────────────── */
    this._platforms = [];
    this._stars     = [];
    this._windGusts = [];
    this._generateLevel(w, h, diff);

    this._totalStars = this._stars.length;

    /* ── Worry Monster ─────────────────────────────────────── */
    this._monsterX      = w * 0.45;
    this._monsterBaseY  = h * MONSTER_BASE_Y;
    this._monsterPhase  = 0;
    this._monsterBobAmp = 20;
    this._worryPhraseIdx = 0;
    this._worryPhraseTimer = 0;

    /* ── Breath meter (DOM overlay) ────────────────────────── */
    this._breathMeter = document.createElement('div');
    this._breathMeter.style.cssText = `
      position:absolute;left:12px;top:50%;transform:translateY(-50%);
      width:16px;height:120px;background:rgba(0,0,0,0.3);border-radius:10px;
      overflow:hidden;z-index:15;border:2px solid rgba(255,255,255,0.3);
    `;
    const fill = document.createElement('div');
    fill.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,#81D4FA,#4FC3F7);border-radius:8px;transition:height 0.15s;';
    this._breathMeter.appendChild(fill);
    this._breathFill = fill;
    c.appendChild(this._breathMeter);

    /* ── Breath indicator label ────────────────────────────── */
    this._breathEl = document.createElement('div');
    this._breathEl.style.cssText = `
      position:absolute;bottom:14px;left:50%;transform:translateX(-50%);
      padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;
      pointer-events:none;z-index:15;transition:all 0.2s;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    `;
    c.appendChild(this._breathEl);
    this._updateBreathUI(false);

    /* ── HUD ───────────────────────────────────────────────── */
    this._hud.setLives(this._lives, this._maxLives);
    this._hud.setObjective('0% crossed');
    this._hud.setScore('0');

    /* ── Input listeners ───────────────────────────────────── */
    this._holdCleanup = [];

    const onDown = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      this._holding    = true;
      this._holdStart  = performance.now();
      this._jumpConsumed = false;
      this._updateBreathUI(true);
    };
    const onUp = () => {
      if (this._holding && !this._jumpConsumed) {
        this._tryJump();
      }
      this._holding = false;
      this._updateBreathUI(false);
    };

    const onKeyDown = (e) => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); if (!e.repeat) onDown(); } };
    const onKeyUp   = (e) => { if (e.key === ' ' || e.key === 'ArrowUp') onUp(); };

    this._gc.canvas.addEventListener('pointerdown', onDown);
    this._gc.canvas.addEventListener('pointerup', onUp);
    this._gc.canvas.addEventListener('pointerleave', onUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this._holdCleanup.push(
      () => this._gc.canvas.removeEventListener('pointerdown', onDown),
      () => this._gc.canvas.removeEventListener('pointerup', onUp),
      () => this._gc.canvas.removeEventListener('pointerleave', onUp),
      () => window.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('keyup', onKeyUp),
    );
  }

  /* ================================================================
   *  LEVEL GENERATION
   * ================================================================ */
  _generateLevel(w, h, diff) {
    const bridgeY = h * BRIDGE_Y_RATIO;
    // Each section: a sequence of stone platforms with gaps
    const sectionWidth  = 900;           // world-px per section
    const platMinW      = [120, 100, 85];
    const platMaxW      = [170, 140, 115];
    const gapMin        = [30, 40, 50];
    const gapMax        = [55, 70, 85];

    // Starting solid ground platform
    this._platforms.push({ x: -20, y: bridgeY, w: 160, h: 18 });

    let cursorX = 140;

    for (let s = 0; s < SECTIONS; s++) {
      const sectionEnd = (s + 1) * sectionWidth + 140;

      while (cursorX < sectionEnd - 80) {
        const gap  = gapMin[s] + Math.random() * (gapMax[s] - gapMin[s]);
        cursorX   += gap;
        const pw   = platMinW[s] + Math.random() * (platMaxW[s] - platMinW[s]);
        const yVar = (Math.random() - 0.5) * 30;   // slight height variation
        const plat = { x: cursorX, y: bridgeY + yVar, w: pw, h: 16 };
        this._platforms.push(plat);

        // Maybe place a star above this platform
        if (Math.random() < 0.45) {
          this._stars.push({
            x: cursorX + pw / 2,
            y: bridgeY + yVar - 50 - Math.random() * 20,
            collected: false,
          });
        }

        cursorX += pw;
      }

      // Wind gusts decoration (no gameplay effect, just visual atmosphere)
      for (let i = 0; i < 2 + s; i++) {
        this._windGusts.push({
          x: s * sectionWidth + 200 + Math.random() * sectionWidth,
          y: h * 0.2 + Math.random() * (h * 0.35),
          w: 60 + Math.random() * 80,
          speed: 40 + Math.random() * 60,
          alpha: 0.08 + Math.random() * 0.06,
        });
      }
    }

    // Finish platform (wide & safe)
    cursorX += 60;
    this._platforms.push({ x: cursorX, y: bridgeY, w: 200, h: 18 });
    this._finishX = cursorX + 100;       // world X where player wins
    this._totalLength = cursorX + 200;
  }

  /* ================================================================
   *  BREATH UI
   * ================================================================ */
  _updateBreathUI(isHolding) {
    if (isHolding) {
      this._breathEl.textContent = 'Breathing in...';
      this._breathEl.style.background = 'rgba(99,102,241,0.85)';
      this._breathEl.style.color = '#fff';
    } else {
      this._breathEl.textContent = 'Tap / hold to jump';
      this._breathEl.style.background = 'rgba(255,255,255,0.7)';
      this._breathEl.style.color = '#475569';
    }
  }

  /* ================================================================
   *  JUMP
   * ================================================================ */
  _tryJump() {
    if (!this._daniel.grounded) return;
    this._jumpConsumed = true;

    const holdTime = (performance.now() - this._holdStart) / 1000;
    const isSuper  = holdTime >= HOLD_THRESHOLD;

    this._daniel.vy = isSuper ? SUPER_JUMP_VEL : JUMP_VELOCITY;
    this._daniel.grounded = false;
    this._daniel._state = 'jumping';

    this.ctx.audio.play('collect');

    // Visual feedback
    const screenX = this._daniel.x - this._scrollX;
    if (isSuper) {
      // Courage breath particles
      this._particles.emit({
        x: screenX + this._daniel.w / 2,
        y: this._daniel.y + this._daniel.h,
        count: 12, color: '#81D4FA', spread: 30, life: 0.6, size: 5, gravity: 40,
      });
      this._breathEl.textContent = 'Courage boost!';
      this._breathEl.style.background = 'rgba(59,130,246,0.9)';
    } else {
      this._particles.emit({
        x: screenX + this._daniel.w / 2,
        y: this._daniel.y + this._daniel.h,
        count: 4, color: 'rgba(180,180,180,0.5)', spread: 15, life: 0.3, size: 3,
      });
    }
  }

  /* ================================================================
   *  START
   * ================================================================ */
  async start() {
    await showIntroScreen(this.ctx.container, {
      title: 'Courage Crossing',
      story: 'A broken bridge stretches across a deep canyon! Take courage breaths to jump further. Watch out for the Worry Monster below!',
      controls: 'Tap to jump. Hold longer for a courage boost!',
      mobileControls: 'Tap to jump. Hold longer for a courage boost!',
      goal: 'Cross all 3 sections of the bridge and collect courage stars!',
    });
    this._gc.run(
      (dt) => this._update(dt),
      (ctx) => this._render(ctx),
    );
  }

  /* ================================================================
   *  UPDATE
   * ================================================================ */
  _update(dt) {
    if (this._disposed) return;
    if (this._phase === 'ending') return;
    this._tweens.update(dt);
    this._particles.update(dt);
    this._animTime += dt;

    const w = this._gc.width;
    const h = this._gc.height;
    const d = this._daniel;

    /* ── Auto-scroll ───────────────────────────────────────── */
    this._scrollX += this._autoSpeed * dt;
    d.x = this._scrollX + 80;            // Daniel stays near left side of screen

    /* ── Gravity ───────────────────────────────────────────── */
    if (!d.grounded) {
      d.vy += GRAVITY * dt;
      if (d.vy > 600) d.vy = 600;        // terminal velocity
    }
    d.y += d.vy * dt;

    /* ── Walking state when grounded ───────────────────────── */
    if (d.grounded && d._state !== 'hurt') {
      d._state = 'walking';
    }

    /* ── Hold breath meter fill ────────────────────────────── */
    if (this._holding) {
      const holdTime = (performance.now() - this._holdStart) / 1000;
      const pct = Math.min(1, holdTime / HOLD_THRESHOLD) * 100;
      this._breathFill.style.height = pct + '%';

      // Auto-jump when fully charged if grounded
      if (holdTime >= HOLD_THRESHOLD && d.grounded && !this._jumpConsumed) {
        this._tryJump();
      }
    } else {
      // Drain meter
      const cur = parseFloat(this._breathFill.style.height) || 0;
      if (cur > 0) this._breathFill.style.height = Math.max(0, cur - 200 * dt) + '%';
    }

    /* ── Platform collision (land on top only) ─────────────── */
    let onPlatform = false;
    if (d.vy >= 0) {
      for (const plat of this._platforms) {
        // Only check platforms near the screen
        const screenPX = plat.x - this._scrollX;
        if (screenPX > w + 100 || screenPX + plat.w < -100) continue;

        if (d.x + d.w > plat.x && d.x < plat.x + plat.w) {
          const feetY      = d.y + d.h;
          const platTop    = plat.y;
          const prevFeetY  = feetY - d.vy * dt;
          if (prevFeetY <= platTop + 4 && feetY >= platTop - 2) {
            d.y = platTop - d.h;
            d.vy = 0;
            d.grounded = true;
            onPlatform = true;
            break;
          }
        }
      }
    }
    if (d.grounded && !onPlatform && d.vy >= 0) {
      // Check if still over a platform
      let stillOn = false;
      for (const plat of this._platforms) {
        if (d.x + d.w > plat.x && d.x < plat.x + plat.w) {
          const feetY = d.y + d.h;
          if (Math.abs(feetY - plat.y) < 6) { stillOn = true; break; }
        }
      }
      if (!stillOn) {
        d.grounded = false;
      }
    }

    /* ── Section tracking ──────────────────────────────────── */
    const sectionWidth = 900;
    this._section = Math.min(SECTIONS - 1, Math.floor((this._scrollX) / sectionWidth));

    /* ── Monster bobbing (gets higher in later sections) ──── */
    this._monsterPhase += dt;
    const bobExtra = this._section * 15;  // bobs higher per section
    this._monsterBobAmp = 20 + bobExtra;
    this._monsterX = (w * 0.45) + Math.sin(this._monsterPhase * 0.7) * (w * 0.2);

    /* ── Cycle worry phrases every 3 seconds ─────────────── */
    this._worryPhraseTimer += dt;
    if (this._worryPhraseTimer >= 3) {
      this._worryPhraseTimer = 0;
      this._worryPhraseIdx = (this._worryPhraseIdx + 1) % WORRY_PHRASES.length;
    }

    /* ── Star collection ───────────────────────────────────── */
    for (const star of this._stars) {
      if (star.collected) continue;
      const dx = (d.x + d.w / 2) - star.x;
      const dy = (d.y + d.h / 2) - star.y;
      if (Math.sqrt(dx * dx + dy * dy) < 28) {
        star.collected = true;
        this._starsCollected++;
        this._hud.setScore(String(this._starsCollected));
        const sx = star.x - this._scrollX;
        this._particles.emit({
          x: sx, y: star.y, count: 10,
          color: '#FFD700', spread: 40, life: 0.7, shape: 'star',
        });
        this.ctx.audio.play('collect');
      }
    }

    /* ── Fell into canyon ───────────────────────────────────── */
    if (d.y > h + 40) {
      this._lives--;
      this._hud.setLives(this._lives, this._maxLives);
      this._gc.shake(6, 300);
      this.ctx.audio.play('hit');

      if (this._lives <= 0) {
        this._onLose();
        return;
      }

      // Reset to the last safe platform behind current scrollX
      this._resetToLastPlatform();
      return;
    }

    /* ── Ceiling clamp ─────────────────────────────────────── */
    if (d.y < 5) { d.y = 5; d.vy = Math.max(0, d.vy); }

    /* ── Update DanielPlayer animation ─────────────────────── */
    d.update(dt);

    /* ── Progress HUD ──────────────────────────────────────── */
    const progress = Math.min(100, Math.round((d.x / this._finishX) * 100));
    this._hud.setObjective(`${progress}% crossed`);

    /* ── Win condition ─────────────────────────────────────── */
    if (d.x >= this._finishX) {
      this._onWin();
    }
  }

  /* ── Reset after falling ─────────────────────────────────── */
  _resetToLastPlatform() {
    const d = this._daniel;
    // Find last platform that is at or before current scroll
    let best = this._platforms[0];
    for (const plat of this._platforms) {
      if (plat.x <= this._scrollX + 100) best = plat;
    }
    this._scrollX = Math.max(0, best.x - 80);
    d.x = best.x + best.w / 2 - d.w / 2;
    d.y = best.y - d.h;
    d.vy = 0;
    d.grounded = true;
    d.reset();
  }

  /* ── Win / Lose ──────────────────────────────────────────── */
  _onWin() {
    this._phase = 'ending';
    const starRatio = this._totalStars > 0 ? this._starsCollected / this._totalStars : 0;
    const lifeRatio = this._lives / this._maxLives;
    const score = Math.min(1, lifeRatio * 0.5 + starRatio * 0.5);
    this._hud.flash('Canyon crossed!', '#4CAF50');
    this._daniel.celebrate(2);
    this._particles.emit({
      x: this._gc.width / 2, y: this._gc.height / 2, count: 25,
      color: '#FFD700', spread: 120, life: 1.5, shape: 'star',
    });
    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._complete({ score, skillTags: ['self-regulation', 'breathing', 'courage'] });
    }, 1400);
    this._timeouts.push(tid);
  }

  _onLose() {
    this._phase = 'ending';
    const progress = this._daniel.x / this._finishX;
    this._hud.flash('Keep breathing, try again!', '#EF4444');
    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._fail({ score: progress * 0.4, skillTags: ['self-regulation', 'breathing', 'courage'] });
    }, 900);
    this._timeouts.push(tid);
  }

  /* ================================================================
   *  RENDER
   * ================================================================ */
  _render(ctx) {
    const w = this._gc.width;
    const h = this._gc.height;
    this._gc.clear();
    const t = this._animTime;

    /* ── Sky gradient ──────────────────────────────────────── */
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#4A90D9');
    skyGrad.addColorStop(0.35, '#6BAED6');
    skyGrad.addColorStop(0.55, '#B4C8DC');
    skyGrad.addColorStop(0.75, '#D4A574');
    skyGrad.addColorStop(1, '#C4956A');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    /* ── Distant canyon walls (left & right) ────────────────── */
    this._drawCanyonWalls(ctx, w, h);

    /* ── Wind gust visuals ─────────────────────────────────── */
    this._drawWindGusts(ctx, w, h, t);

    /* ── Mist layer (behind monster) ───────────────────────── */
    this._drawMist(ctx, w, h, t, 0.15);

    /* ── Worry Monster ─────────────────────────────────────── */
    this._drawWorryMonster(ctx, w, h, t);

    /* ── Mist layer (in front of monster, semi-transparent) ── */
    this._drawMist(ctx, w, h, t + 1.5, 0.12);

    /* ── Stone bridge platforms ─────────────────────────────── */
    for (const plat of this._platforms) {
      const sx = plat.x - this._scrollX;
      if (sx > w + 20 || sx + plat.w < -20) continue;
      this._drawStonePlatform(ctx, sx, plat.y, plat.w, plat.h);
    }

    /* ── Courage stars ─────────────────────────────────────── */
    for (const star of this._stars) {
      if (star.collected) continue;
      const sx = star.x - this._scrollX;
      if (sx < -20 || sx > w + 20) continue;
      const bobY = star.y + Math.sin(t * 3 + star.x * 0.05) * 6;
      this._drawStar(ctx, sx, bobY, t);
    }

    /* ── Daniel ────────────────────────────────────────────── */
    this._daniel.render(ctx, { x: this._scrollX, y: 0 });

    /* ── Particles ─────────────────────────────────────────── */
    this._particles.render(ctx);
  }

  /* ── Canyon Walls ────────────────────────────────────────── */
  _drawCanyonWalls(ctx, w, h) {
    const wallW = 45;
    const topY  = h * 0.35;

    for (let side = 0; side < 2; side++) {
      const baseX = side === 0 ? -5 : w - wallW + 5;
      // Main rock
      const grad = ctx.createLinearGradient(baseX, topY, baseX + wallW, topY);
      grad.addColorStop(0, side === 0 ? '#B8895A' : '#C4956A');
      grad.addColorStop(1, side === 0 ? '#C4956A' : '#B8895A');
      ctx.fillStyle = grad;
      ctx.fillRect(baseX, topY, wallW, h - topY);

      // Rock texture lines
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      for (let y = topY + 15; y < h; y += 18) {
        ctx.beginPath();
        ctx.moveTo(baseX + 3, y + Math.sin(y * 0.3) * 3);
        ctx.lineTo(baseX + wallW - 3, y + Math.cos(y * 0.3) * 2);
        ctx.stroke();
      }

      // Highlight edge
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(side === 0 ? baseX + wallW - 3 : baseX, topY, 3, h - topY);
    }
  }

  /* ── Wind Gusts ──────────────────────────────────────────── */
  _drawWindGusts(ctx, w, h, t) {
    ctx.save();
    for (const gust of this._windGusts) {
      const sx = ((gust.x - this._scrollX * 0.3) % (w + gust.w + 100)) - gust.w;
      ctx.globalAlpha = gust.alpha;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      const y = gust.y + Math.sin(t * 1.2 + gust.x * 0.01) * 8;
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.quadraticCurveTo(sx + gust.w * 0.3, y - 8, sx + gust.w * 0.6, y + 2);
      ctx.quadraticCurveTo(sx + gust.w * 0.8, y + 6, sx + gust.w, y - 3);
      ctx.stroke();
      // Second wisp
      ctx.beginPath();
      ctx.moveTo(sx + 10, y + 12);
      ctx.quadraticCurveTo(sx + gust.w * 0.4, y + 6, sx + gust.w * 0.7, y + 14);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ── Mist ────────────────────────────────────────────────── */
  _drawMist(ctx, w, h, t, alpha) {
    const mistY = h * 0.78;
    ctx.save();
    ctx.globalAlpha = alpha;

    // Mist gradient
    const mistGrad = ctx.createLinearGradient(0, mistY, 0, h);
    mistGrad.addColorStop(0, 'rgba(255,255,255,0)');
    mistGrad.addColorStop(0.3, 'rgba(220,215,230,1)');
    mistGrad.addColorStop(1, 'rgba(200,195,215,1)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, mistY, w, h - mistY);

    // Wispy cloud puffs
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 8; i++) {
      const mx = ((t * 15 + i * 95) % (w + 120)) - 60;
      const my = mistY + 10 + (i % 3) * 12;
      const r  = 30 + (i % 4) * 10;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ── Worry Monster ───────────────────────────────────────── */
  _drawWorryMonster(ctx, w, h, t) {
    const mx = this._monsterX;
    const bobY = Math.sin(this._monsterPhase * 1.8) * this._monsterBobAmp;
    const my = this._monsterBaseY + bobY;
    const s = 1.0; // scale

    ctx.save();
    ctx.translate(mx, my);

    // Tentacle-arms (behind body)
    ctx.strokeStyle = '#6B3FA0';
    ctx.lineWidth = 6 * s;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const angle = -0.8 + i * 0.4;
      const len = 35 + Math.sin(t * 3 + i * 1.3) * 10;
      const wiggX = Math.sin(t * 4 + i * 2) * 12;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo((i - 2) * 14 * s, 20 * s);
      ctx.quadraticCurveTo(
        (i - 2) * 14 * s + wiggX, 20 * s + len * 0.6,
        (i - 2) * 14 * s + wiggX * 1.5, 20 * s + len
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Body blob (large purple blob)
    const blobWobble = Math.sin(t * 2.5) * 3;
    ctx.fillStyle = '#7B42B0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 50 * s + blobWobble, 38 * s - blobWobble * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body highlight
    ctx.fillStyle = 'rgba(160,100,200,0.4)';
    ctx.beginPath();
    ctx.ellipse(-8 * s, -10 * s, 25 * s, 15 * s, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Darker belly area
    ctx.fillStyle = 'rgba(60,20,80,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 12 * s, 35 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (big white circles with small pupils)
    // Left eye
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-18 * s, -8 * s, 14 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Left pupil
    const pupilOff = Math.sin(t * 1.5) * 3;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(-18 * s + pupilOff, -6 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Left pupil highlight
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-16 * s + pupilOff, -9 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(18 * s, -8 * s, 14 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right pupil
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(18 * s + pupilOff, -6 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Right pupil highlight
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(20 * s + pupilOff, -9 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    // Cute mouth (wavy smile)
    ctx.strokeStyle = '#3D1560';
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(-15 * s, 12 * s);
    ctx.quadraticCurveTo(-5 * s, 20 * s + Math.sin(t * 2) * 3, 0, 14 * s);
    ctx.quadraticCurveTo(5 * s, 20 * s + Math.sin(t * 2 + 1) * 3, 15 * s, 12 * s);
    ctx.stroke();

    // Small fangs
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-10 * s, 13 * s);
    ctx.lineTo(-8 * s, 18 * s);
    ctx.lineTo(-6 * s, 13 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6 * s, 13 * s);
    ctx.lineTo(8 * s, 18 * s);
    ctx.lineTo(10 * s, 13 * s);
    ctx.fill();

    // "Worry Monster" label below body
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText('Worry Monster', 0, 32 * s);
    ctx.fillStyle = '#fff';
    ctx.fillText('Worry Monster', 0, 32 * s);

    // Speech bubble with worry phrase above head
    const phrase = WORRY_PHRASES[this._worryPhraseIdx || 0];
    const bubbleY = -52 * s;
    ctx.font = 'bold 10px sans-serif';
    const tw = ctx.measureText(phrase).width;
    const bw = tw + 16;
    const bh = 22;
    // Bubble background
    ctx.fillStyle = 'rgba(90,40,120,0.85)';
    ctx.beginPath();
    ctx.roundRect(-bw / 2, bubbleY - bh / 2, bw, bh, 8);
    ctx.fill();
    // Bubble pointer
    ctx.beginPath();
    ctx.moveTo(-5, bubbleY + bh / 2);
    ctx.lineTo(0, bubbleY + bh / 2 + 8);
    ctx.lineTo(5, bubbleY + bh / 2);
    ctx.closePath();
    ctx.fill();
    // Phrase text
    ctx.fillStyle = '#FFD0FF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(phrase, 0, bubbleY);

    ctx.restore();
  }

  /* ── Stone Platform ──────────────────────────────────────── */
  _drawStonePlatform(ctx, x, y, pw, ph) {
    // Shadow beneath
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.roundRect(x + 3, y + ph, pw - 6, 5, 3);
    ctx.fill();

    // Main stone body
    const stoneGrad = ctx.createLinearGradient(x, y, x, y + ph);
    stoneGrad.addColorStop(0, '#A08060');
    stoneGrad.addColorStop(0.3, '#8D6E63');
    stoneGrad.addColorStop(1, '#6D4C41');
    ctx.fillStyle = stoneGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, pw, ph, 4);
    ctx.fill();

    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + 3, y + 1, pw - 6, 3);

    // Stone texture cracks
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 2; i++) {
      const cx = x + pw * 0.25 + i * pw * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx, y + 3);
      ctx.lineTo(cx + 3, y + ph - 2);
      ctx.stroke();
    }
  }

  /* ── Courage Star ────────────────────────────────────────── */
  _drawStar(ctx, x, y, t) {
    ctx.save();

    // Glow
    ctx.globalAlpha = 0.25 + Math.sin(t * 4 + x * 0.1) * 0.1;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    // Star shape
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    const spikes = 5;
    const outerR = 10;
    const innerR = 4.5;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = '#FFF8DC';
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ================================================================
   *  DISPOSE
   * ================================================================ */
  dispose() {
    this._disposed = true;
    for (const tid of this._timeouts || []) clearTimeout(tid);
    this._gc?.dispose();
    this._input?.dispose();
    this._hud?.dispose();
    this._breathEl?.remove();
    this._breathMeter?.remove();
    for (const fn of this._holdCleanup || []) fn();
    super.dispose();
  }
}

/* ── Registration ──────────────────────────────────────────── */
register({
  id: 'courage-canyon',
  name: 'Courage Canyon',
  displayName: 'Courage Crossing',
  description: 'Jump across the broken bridge and avoid the Worry Monster!',
  skillTags: ['self-regulation', 'breathing', 'courage'],
  defaultConfig: {},
  factory: (ctx) => new CourageCanyon(ctx),
});

export default CourageCanyon;
