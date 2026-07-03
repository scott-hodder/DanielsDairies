/**
 * Light the Road — Focus vs Distraction collection game.
 *
 * Dark town road at night. Daniel walks carrying a lantern glow.
 * Collect golden "focus lights" (positive attention items) to brighten the road.
 * Avoid grey/purple "distraction clouds" that dim the road.
 * Collect 6 focus lights to win. 3 distraction hits = lose.
 *
 * SEL skill: focus, selective attention, impulse control.
 */
import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';
import { GameCanvas, InputManager, ParticleEmitter, HUD, TweenManager, showIntroScreen } from '../../engine/index.js';
import DanielPlayer from '../../engine/DanielPlayer.js';

const FOCUS_LABELS = ['Kind words', 'Deep breaths', 'Trying hard', 'Good friends', 'Being brave'];
const DISTRACTION_LABELS = ['Loud noises', 'Worrying', 'Giving up', 'Being mean', 'Rushing'];

class FocusFireflyForest extends IMiniGame {
  mount() {
    const c = this.ctx.container;
    c.innerHTML = '';
    c.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:#0D1B2A;';

    this._gc = new GameCanvas(c);
    this._input = new InputManager(this._gc.canvas);
    this._particles = new ParticleEmitter();
    this._tweens = new TweenManager();
    this._hud = new HUD(c);

    const w = this._gc.width;
    const h = this._gc.height;

    // Daniel — starts centre-bottom of the road area
    const danielSize = 30;
    this._daniel = {
      x: w / 2 - danielSize / 2,
      y: h * 0.65,
      w: danielSize,
      h: danielSize,
      speed: 120,
    };
    this._danielPlayer = new DanielPlayer({
      x: this._daniel.x,
      y: this._daniel.y,
      size: danielSize,
      facing: 'right',
    });
    this._animTime = 0;

    // Road area: Daniel restricted to bottom 70% of screen (top 30% is sky/buildings)
    this._roadTop = Math.round(h * 0.3);

    // Focus lights (golden orbs)
    this._focusLights = [];
    this._focusTarget = 6;
    this._focusCaught = 0;
    this._streak = 0; // consecutive focus lights without a distraction — grows the lantern

    // Distraction clouds
    this._distractions = [];
    this._distractionHits = 0;
    this._maxDistractionHits = 3;

    // Spawn timers
    this._focusSpawnTimer = 1.5;
    this._distractionSpawnTimer = 3;
    this._maxActiveFocus = 3;
    this._maxActiveDistractions = 3;
    this._usedFocusLabels = [];
    this._usedDistractionLabels = [];

    // Screen shake
    this._shakeTimer = 0;
    this._shakeIntensity = 0;

    // "Distracted!" flash
    this._distractedFlash = 0;

    // Win flash
    this._winFlash = 0;

    // Streetlights that appear as focus lights are collected
    this._streetlights = [];
    this._buildStreetlightPositions(w, h);

    this._timeouts = [];
    this._disposed = false;
    this._phase = 'playing';

    this._hud.setObjective('Collect 6 focus lights!');
    this._hud.setScore(`Focus: 0/${this._focusTarget}  |  Oops: 0/${this._maxDistractionHits}`);
  }

  _buildStreetlightPositions(w, h) {
    // Pre-define streetlight positions along the road edges
    this._streetlightPositions = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 0.12 : 0.88;
      const yFrac = 0.32 + (i / count) * 0.6;
      this._streetlightPositions.push({
        x: Math.round(w * side),
        y: Math.round(h * yFrac),
        lit: false,
      });
    }
  }

  async start() {
    await showIntroScreen(this.ctx.container, {
      title: 'Light the Road',
      story: "It's getting dark and Daniel is walking home through town. His lantern grows brighter each time he focuses on what helps — and distractions shrink it back down!",
      controls: 'Arrow keys to move',
      mobileControls: 'Drag to move',
      goal: 'Collect 6 focus lights in a row to grow a giant lantern glow — dodge the distraction clouds!',
    });
    this._gc.run(
      (dt) => this._update(dt),
      (ctx) => this._render(ctx),
    );
  }

  _update(dt) {
    if (this._phase === 'ending') return;
    this._animTime += dt;
    this._tweens.update(dt);
    this._particles.update(dt);

    // Timers
    if (this._shakeTimer > 0) this._shakeTimer -= dt;
    if (this._distractedFlash > 0) this._distractedFlash -= dt;
    if (this._winFlash > 0) this._winFlash -= dt;

    const d = this._daniel;
    const dir = this._input.direction;
    const w = this._gc.width;
    const h = this._gc.height;

    // Move Daniel
    d.x += dir.x * d.speed * dt;
    d.y += dir.y * d.speed * dt;

    // Restrict to road area (bottom 70%)
    d.x = Math.max(10, Math.min(w - d.w - 10, d.x));
    d.y = Math.max(this._roadTop, Math.min(h - d.h - 10, d.y));

    // Sync DanielPlayer
    this._danielPlayer.x = d.x;
    this._danielPlayer.y = d.y;
    if (dir.x !== 0 || dir.y !== 0) {
      this._danielPlayer._state = 'walking';
      if (dir.x < 0) this._danielPlayer.facing = 'left';
      else if (dir.x > 0) this._danielPlayer.facing = 'right';
    } else {
      this._danielPlayer._state = 'idle';
    }
    this._danielPlayer.update(dt);

    const dcx = d.x + d.w / 2;
    const dcy = d.y + d.h / 2;

    // Spawn focus lights
    this._focusSpawnTimer -= dt;
    if (this._focusSpawnTimer <= 0 && this._focusLights.length < this._maxActiveFocus && this._focusCaught < this._focusTarget) {
      this._spawnFocusLight(w, h);
      this._focusSpawnTimer = 2.5 + Math.random() * 1.5;
    }

    // Spawn distractions
    this._distractionSpawnTimer -= dt;
    if (this._distractionSpawnTimer <= 0 && this._distractions.length < this._maxActiveDistractions) {
      this._spawnDistraction(w, h);
      this._distractionSpawnTimer = 3 + Math.random() * 2;
    }

    // Update focus lights — gentle drift
    for (const fl of this._focusLights) {
      fl.x += fl.dx * dt;
      fl.y += fl.dy * dt;

      // Bounce off edges
      if (fl.x < 30 || fl.x > w - 30) fl.dx *= -1;
      if (fl.y < this._roadTop + 10 || fl.y > h - 30) fl.dy *= -1;
      fl.x = Math.max(30, Math.min(w - 30, fl.x));
      fl.y = Math.max(this._roadTop + 10, Math.min(h - 30, fl.y));

      // Sparkle trail
      if (Math.random() < 0.1) {
        this._particles.emit({
          x: fl.x, y: fl.y,
          count: 1, color: '#FFE082', spread: 6, life: 0.4, size: 2,
        });
      }

      // Collision with Daniel
      const dx = dcx - fl.x;
      const dy = dcy - fl.y;
      if (Math.sqrt(dx * dx + dy * dy) < 28) {
        fl.collected = true;
        this._focusCaught++;
        this._streak++;
        this._hud.setScore(`Focus: ${this._focusCaught}/${this._focusTarget}  |  Oops: ${this._distractionHits}/${this._maxDistractionHits}`);
        this._hud.flash(this._streak >= 2 ? `${fl.label}! Focus streak ×${this._streak} — your light is growing!` : fl.label + '!', '#FFD700');

        // Light up a streetlight
        if (this._focusCaught <= this._streetlightPositions.length) {
          this._streetlightPositions[this._focusCaught - 1].lit = true;
        }

        // Positive particle burst
        this._particles.emit({
          x: fl.x, y: fl.y,
          count: 14, color: '#FFD700', spread: 40, life: 0.7, shape: 'star',
        });
        this.ctx.audio.play('collect');

        const pct = Math.min(100, Math.round((this._focusCaught / this._focusTarget) * 100));
        this._hud.setObjective(`Road lit: ${pct}%`);

        if (this._focusCaught >= this._focusTarget) {
          this._onWin();
          return;
        }
      }
    }
    this._focusLights = this._focusLights.filter(f => !f.collected);

    // Update distractions — erratic movement
    for (const dc of this._distractions) {
      // Erratic direction changes
      dc.dirChangeTimer -= dt;
      if (dc.dirChangeTimer <= 0) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 40;
        dc.dx = Math.cos(angle) * speed;
        dc.dy = Math.sin(angle) * speed;
        dc.dirChangeTimer = 0.6 + Math.random() * 1.0;
      }

      dc.x += dc.dx * dt;
      dc.y += dc.dy * dt;

      // Bounce off edges
      if (dc.x < 30 || dc.x > w - 30) dc.dx *= -1;
      if (dc.y < this._roadTop + 10 || dc.y > h - 30) dc.dy *= -1;
      dc.x = Math.max(30, Math.min(w - 30, dc.x));
      dc.y = Math.max(this._roadTop + 10, Math.min(h - 30, dc.y));

      // Lifetime
      dc.age += dt;
      if (dc.age > 10) {
        dc.dead = true;
        continue;
      }

      // Collision with Daniel
      if (dc.cooldown > 0) {
        dc.cooldown -= dt;
        continue;
      }
      const dx2 = dcx - dc.x;
      const dy2 = dcy - dc.y;
      if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < 26) {
        dc.dead = true;
        this._distractionHits++;
        this._streak = 0; // distraction breaks the focus streak — the lantern shrinks back
        this._hud.setScore(`Focus: ${this._focusCaught}/${this._focusTarget}  |  Oops: ${this._distractionHits}/${this._maxDistractionHits}`);

        // Screen shake + "Distracted!" flash
        this._shakeTimer = 0.35;
        this._shakeIntensity = 6;
        this._distractedFlash = 0.8;

        this._hud.flash(`"${dc.label}" pulled you away — take a breath and refocus!`, '#9E9E9E');
        this.ctx.audio.play('hit');

        this._particles.emit({
          x: dc.x, y: dc.y,
          count: 8, color: '#7E57C2', spread: 30, life: 0.5,
        });

        if (this._distractionHits >= this._maxDistractionHits) {
          this._onFail();
          return;
        }
      }
    }
    this._distractions = this._distractions.filter(d => !d.dead);

    this._input.endFrame();
  }

  _spawnFocusLight(w, h) {
    // Pick an unused label, or cycle if all used
    let available = FOCUS_LABELS.filter(l => !this._usedFocusLabels.includes(l));
    if (available.length === 0) {
      this._usedFocusLabels = [];
      available = [...FOCUS_LABELS];
    }
    const label = available[Math.floor(Math.random() * available.length)];
    this._usedFocusLabels.push(label);

    const angle = Math.random() * Math.PI * 2;
    const speed = 15 + Math.random() * 20;

    this._focusLights.push({
      x: 60 + Math.random() * (w - 120),
      y: this._roadTop + 20 + Math.random() * (h - this._roadTop - 60),
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      label,
      collected: false,
    });
  }

  _spawnDistraction(w, h) {
    let available = DISTRACTION_LABELS.filter(l => !this._usedDistractionLabels.includes(l));
    if (available.length === 0) {
      this._usedDistractionLabels = [];
      available = [...DISTRACTION_LABELS];
    }
    const label = available[Math.floor(Math.random() * available.length)];
    this._usedDistractionLabels.push(label);

    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 30;

    this._distractions.push({
      x: 60 + Math.random() * (w - 120),
      y: this._roadTop + 20 + Math.random() * (h - this._roadTop - 60),
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      dirChangeTimer: 0.5 + Math.random() * 1.0,
      label,
      age: 0,
      dead: false,
      cooldown: 0.8, // brief immunity after spawn so player isn't ambushed
    });
  }

  _onWin() {
    if (this._disposed) return;
    this._phase = 'ending';
    this._winFlash = 0.7;
    // Light all streetlights
    for (const sl of this._streetlightPositions) sl.lit = true;
    // Force full reveal — set focus caught to max so darkness overlay drops to 0
    this._focusCaught = this._focusTarget;
    this._revealScene = true;
    this._hud.flash('The road is clear!', '#4CAF50');
    this._danielPlayer.celebrate(2);
    this._particles.emit({
      x: this._gc.width / 2, y: this._gc.height / 2,
      count: 30, color: '#FFD700', spread: 130, life: 1.2, shape: 'star',
    });
    const t = setTimeout(() => {
      if (this._disposed) return;
      this._complete({
        score: 1,
        message: "Great focus! Daniel noticed what mattered and the road became clear. Remember: you can choose what to pay attention to!",
        skillTags: ['focus', 'attention', 'impulse-control'],
      });
    }, 2000);
    this._timeouts.push(t);
  }

  _onFail() {
    if (this._disposed) return;
    this._phase = 'ending';
    this._hud.flash('Too many distractions!', '#EF4444');
    const t = setTimeout(() => {
      if (this._disposed) return;
      this._fail({
        score: 0,
        message: "Too many distractions! Try again -- focus on collecting the golden lights.",
        skillTags: ['focus', 'attention', 'impulse-control'],
      });
    }, 1200);
    this._timeouts.push(t);
  }

  _render(ctx) {
    const w = this._gc.width;
    const h = this._gc.height;
    const d = this._daniel;
    const dcx = d.x + d.w / 2;
    const dcy = d.y + d.h / 2;
    const t = this._animTime;

    // Screen shake offset
    let shakeX = 0, shakeY = 0;
    if (this._shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * this._shakeIntensity * 2;
      shakeY = (Math.random() - 0.5) * this._shakeIntensity * 2;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // -- Sky / buildings background (top 30%) --
    this._gc.clear('#0D1B2A');

    // Sky gradient — brightens when scene is revealed
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this._roadTop);
    if (this._revealScene) {
      skyGrad.addColorStop(0, '#1A2A44');
      skyGrad.addColorStop(1, '#2A3D5C');
    } else {
      skyGrad.addColorStop(0, '#070E1A');
      skyGrad.addColorStop(1, '#121D33');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, this._roadTop);

    // Stars in sky
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    const starSeed = [0.1, 0.25, 0.4, 0.55, 0.7, 0.82, 0.93, 0.15, 0.6, 0.35];
    for (let i = 0; i < starSeed.length; i++) {
      const sx = starSeed[i] * w;
      const sy = 8 + (i * 17 + 5) % (this._roadTop - 16);
      const twinkle = 0.3 + Math.sin(t * 2 + i * 1.7) * 0.3;
      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Building silhouettes along the top
    ctx.fillStyle = this._revealScene ? '#1A2840' : '#0A1220';
    const bldgs = [
      { x: 0, bw: 60, bh: 55 },
      { x: 55, bw: 40, bh: 70 },
      { x: 90, bw: 50, bh: 45 },
      { x: 145, bw: 35, bh: 80 },
      { x: 175, bw: 55, bh: 50 },
      { x: 225, bw: 45, bh: 65 },
      { x: 265, bw: 60, bh: 40 },
      { x: 320, bw: 40, bh: 75 },
      { x: 355, bw: 55, bh: 55 },
      { x: 405, bw: 50, bh: 60 },
    ];
    for (const b of bldgs) {
      const bx = (b.x / 450) * w;
      const bWidth = (b.bw / 450) * w;
      ctx.fillRect(bx, this._roadTop - b.bh, bWidth, b.bh);
      // Tiny windows — glow warmly when scene is revealed
      ctx.fillStyle = this._revealScene ? 'rgba(255,230,150,0.7)' : 'rgba(255,230,150,0.08)';
      for (let wy = this._roadTop - b.bh + 8; wy < this._roadTop - 6; wy += 12) {
        for (let wx = bx + 5; wx < bx + bWidth - 5; wx += 10) {
          ctx.fillRect(wx, wy, 5, 6);
        }
      }
      ctx.fillStyle = '#0A1220';
    }

    // -- Road surface --
    const roadGrad = ctx.createLinearGradient(0, this._roadTop, 0, h);
    if (this._revealScene) {
      roadGrad.addColorStop(0, '#3A3A5E');
      roadGrad.addColorStop(1, '#2E2E4A');
    } else {
      roadGrad.addColorStop(0, '#1A1A2E');
      roadGrad.addColorStop(1, '#141425');
    }
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, this._roadTop, w, h - this._roadTop);

    // Sidewalk edges
    ctx.fillStyle = '#252540';
    ctx.fillRect(0, this._roadTop, w, 6);

    // Road lane markings — dashed centre line
    ctx.strokeStyle = 'rgba(220,220,100,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 16]);
    ctx.beginPath();
    ctx.moveTo(w / 2, this._roadTop + 10);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Road edge lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.08, this._roadTop + 6);
    ctx.lineTo(w * 0.08, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.92, this._roadTop + 6);
    ctx.lineTo(w * 0.92, h);
    ctx.stroke();

    // Crosswalk
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    const crossY = this._roadTop + (h - this._roadTop) * 0.5;
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(w * 0.1 + i * (w * 0.1), crossY, w * 0.06, 8);
    }

    // -- Streetlights (lit ones glow warmly) --
    for (const sl of this._streetlightPositions) {
      this._drawStreetlight(ctx, sl.x, sl.y, sl.lit);
    }

    // -- Focus lights (golden orbs with labels) --
    for (const fl of this._focusLights) {
      if (fl.collected) continue;
      const pulse = 0.7 + Math.sin(t * 4 + fl.x * 0.1) * 0.3;

      ctx.save();
      // Outer glow halo
      ctx.globalAlpha = pulse * 0.3;
      const glowGrad = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, 28);
      glowGrad.addColorStop(0, '#FFD700');
      glowGrad.addColorStop(0.6, '#FFB300');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(fl.x, fl.y, 28, 0, Math.PI * 2);
      ctx.fill();

      // Main orb
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#FFE082';
      ctx.beginPath();
      ctx.arc(fl.x, fl.y, 12, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFFDE7';
      ctx.beginPath();
      ctx.arc(fl.x, fl.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Label below
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#FFD54F';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fl.label, fl.x, fl.y + 22);
      ctx.restore();
    }

    // -- Distraction clouds (grey-purple fuzzy clouds with labels) --
    for (const dc of this._distractions) {
      if (dc.dead) continue;
      this._drawDistractionCloud(ctx, dc, t);
    }

    // -- Daniel --
    this._danielPlayer.render(ctx, { x: 0, y: 0 });

    // -- Darkness overlay with lantern cutout --
    const brightnessProgress = this._focusCaught / this._focusTarget;

    if (!this._revealScene) {
      const darknessAlpha = Math.max(0.05, 0.75 - brightnessProgress * 0.7);
      // Focus streak literally grows Daniel's lantern — focus = more light
      const lanternR = 80 + brightnessProgress * 60 + Math.min(55, this._streak * 13);

      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${darknessAlpha})`;
      ctx.fillRect(0, 0, w, h);

      // Cut out light around Daniel (lantern glow)
      ctx.globalCompositeOperation = 'destination-out';
      const lanternGrad = ctx.createRadialGradient(dcx, dcy, 0, dcx, dcy, lanternR);
      lanternGrad.addColorStop(0, 'rgba(0,0,0,1)');
      lanternGrad.addColorStop(0.6, 'rgba(0,0,0,0.7)');
      lanternGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lanternGrad;
      ctx.beginPath();
      ctx.arc(dcx, dcy, lanternR, 0, Math.PI * 2);
      ctx.fill();

      // Cut out light halos around focus lights
      for (const fl of this._focusLights) {
        if (fl.collected) continue;
        const flGrad = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, 32);
        flGrad.addColorStop(0, 'rgba(0,0,0,0.8)');
        flGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = flGrad;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, 32, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cut out light around lit streetlights
      for (const sl of this._streetlightPositions) {
        if (!sl.lit) continue;
        const slGrad = ctx.createRadialGradient(sl.x, sl.y - 10, 0, sl.x, sl.y - 10, 55);
        slGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
        slGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = slGrad;
        ctx.beginPath();
        ctx.arc(sl.x, sl.y - 10, 55, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Warm lantern tint over Daniel
      ctx.save();
      ctx.globalAlpha = 0.12;
      const warmGrad = ctx.createRadialGradient(dcx, dcy, 0, dcx, dcy, lanternR);
      warmGrad.addColorStop(0, '#FFD54F');
      warmGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = warmGrad;
      ctx.beginPath();
      ctx.arc(dcx, dcy, lanternR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // -- "Distracted!" flash overlay --
    if (this._distractedFlash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.35, this._distractedFlash * 0.8);
      ctx.fillStyle = '#7E57C2';
      ctx.fillRect(0, 0, w, h);

      // Text
      ctx.globalAlpha = Math.min(1, this._distractedFlash * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Distracted!', w / 2, h / 2 - 20);
      ctx.restore();
    }

    // -- Win flash --
    if (this._winFlash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this._winFlash * 2.5) * 0.7;
      ctx.fillStyle = '#FFFDE7';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Particles on top
    this._particles.render(ctx);

    // End shake transform
    ctx.restore();

    // -- Distraction hit counter (hearts-style) --
    const hitY = 18;
    for (let i = 0; i < this._maxDistractionHits; i++) {
      const hx = 12 + i * 18;
      ctx.fillStyle = i < this._distractionHits ? '#7E57C2' : 'rgba(255,255,255,0.25)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('X', hx, hitY);
    }

    // Focus counter
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${this._focusCaught}/${this._focusTarget}`, w - 10, hitY);
    ctx.textAlign = 'left';
  }

  _drawStreetlight(ctx, x, y, lit) {
    ctx.save();
    // Pole
    ctx.fillStyle = '#2A2A3A';
    ctx.fillRect(x - 2, y - 30, 4, 35);

    // Lamp head
    ctx.fillStyle = lit ? '#FFE082' : '#1A1A2E';
    ctx.fillRect(x - 8, y - 34, 16, 6);

    if (lit) {
      // Warm glow cone
      ctx.globalAlpha = 0.2;
      const coneGrad = ctx.createRadialGradient(x, y - 28, 2, x, y - 28, 45);
      coneGrad.addColorStop(0, '#FFD54F');
      coneGrad.addColorStop(0.5, '#FFB300');
      coneGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.arc(x, y - 28, 45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawDistractionCloud(ctx, dc, t) {
    ctx.save();

    // Erratic wobble
    const wobble = Math.sin(t * 6 + dc.x * 0.05) * 3;

    // Fuzzy grey-purple cloud body (multiple overlapping circles for jagged effect)
    ctx.globalAlpha = 0.7;
    const cloudColor = '#5C4680';
    const offsets = [
      { ox: 0, oy: 0, r: 14 },
      { ox: -8, oy: -4, r: 10 },
      { ox: 9, oy: -3, r: 11 },
      { ox: -5, oy: 6, r: 9 },
      { ox: 7, oy: 5, r: 9 },
      { ox: -10, oy: 2, r: 8 },
      { ox: 11, oy: 1, r: 8 },
    ];
    for (const o of offsets) {
      const grad = ctx.createRadialGradient(
        dc.x + o.ox + wobble, dc.y + o.oy, 0,
        dc.x + o.ox + wobble, dc.y + o.oy, o.r
      );
      grad.addColorStop(0, cloudColor);
      grad.addColorStop(0.6, '#3D2E5C');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(dc.x + o.ox + wobble, dc.y + o.oy, o.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Jagged edge spikes
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#4A3570';
    for (let i = 0; i < 6; i++) {
      const sAngle = (i / 6) * Math.PI * 2 + t * 2;
      const sr = 16 + Math.sin(t * 5 + i * 1.3) * 4;
      const sx = dc.x + wobble + Math.cos(sAngle) * sr;
      const sy = dc.y + Math.sin(sAngle) * sr;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label below
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#B0A0CC';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(dc.label, dc.x + wobble, dc.y + 24);
    ctx.restore();
  }

  dispose() {
    this._disposed = true;
    for (const t of this._timeouts) clearTimeout(t);
    this._timeouts = [];
    this._gc?.dispose();
    this._input?.dispose();
    this._hud?.dispose();
    super.dispose();
  }
}

register({
  id: 'focus-firefly-forest',
  name: 'Focus Firefly Forest',
  displayName: 'Light the Road',
  description: "Help Daniel collect focus lights and avoid distractions to light up the dark road!",
  skillTags: ['focus', 'attention', 'impulse-control'],
  defaultConfig: {},
  factory: (ctx) => new FocusFireflyForest(ctx),
});

export default FocusFireflyForest;
