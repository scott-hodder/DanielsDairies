/**
 * Calm Crossing — Crossy Road-style lane-based forest trail crossing.
 *
 * Daniel crosses a busy forest trail by pausing, noticing, and moving only
 * when it is safe. Grid/lane-based movement with friendly woodland animals.
 * Calm breath zones (wildflower patches) reinforce pausing before acting.
 * 3 sections of gentle increasing animal traffic. 3 lives, forgiving collision.
 *
 * SEL skill: patience, self-control, calm decision-making.
 */
import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';
import { GameCanvas, InputManager, ParticleEmitter, HUD, TweenManager, showIntroScreen, DANIEL_IMAGES } from '../../engine/index.js';
import DanielPlayer from '../../engine/DanielPlayer.js';

// ── Lane configuration ──────────────────────────────────────────────
const LANE_H = 40;
const DANIEL_SIZE = 34;

// Lane types
const GRASS     = 'grass';
const TRAIL     = 'trail';      // dirt path with animals crossing
const WILDFLOWER = 'wildflower'; // safe calm zone
const CALM_ZONE = 'calm';       // explicit calm breath zone
const CLEARING  = 'clearing';   // pond/clearing destination at top

/**
 * Build the full lane map from bottom (index 0) to top.
 * Each entry: { type, speed?, dir?, label? }
 * speed is in px/s for animals on trail lanes.
 */
function buildLanes(diff) {
  const slow = 28 * diff.speedMultiplier;
  const med  = 42 * diff.speedMultiplier;
  const fast = 52 * diff.speedMultiplier;
  const lanes = [];

  // Start: 2 grass lanes (safe start area)
  lanes.push({ type: GRASS });
  lanes.push({ type: GRASS });

  // Section 1: gentle animal traffic
  lanes.push({ type: GRASS });
  lanes.push({ type: TRAIL, speed: slow, dir: 1 });
  lanes.push({ type: TRAIL, speed: slow, dir: -1 });
  lanes.push({ type: WILDFLOWER });
  lanes.push({ type: TRAIL, speed: slow, dir: 1 });
  lanes.push({ type: CALM_ZONE });
  lanes.push({ type: GRASS });

  // Section 2: moderate animal traffic
  lanes.push({ type: GRASS });
  lanes.push({ type: TRAIL, speed: med, dir: -1 });
  lanes.push({ type: TRAIL, speed: med, dir: 1 });
  lanes.push({ type: WILDFLOWER });
  lanes.push({ type: TRAIL, speed: med, dir: -1 });
  lanes.push({ type: TRAIL, speed: med, dir: 1 });
  lanes.push({ type: CALM_ZONE });
  lanes.push({ type: GRASS });

  // Section 3: busier animal traffic
  lanes.push({ type: GRASS });
  lanes.push({ type: TRAIL, speed: fast, dir: 1 });
  lanes.push({ type: TRAIL, speed: med, dir: -1 });
  lanes.push({ type: TRAIL, speed: fast, dir: 1 });
  lanes.push({ type: WILDFLOWER });
  lanes.push({ type: TRAIL, speed: med, dir: -1 });
  lanes.push({ type: GRASS });

  // End: 2 clearing lanes (pond/destination)
  lanes.push({ type: CLEARING });
  lanes.push({ type: CLEARING });

  return lanes;
}

// ── Animal types ─────────────────────────────────────────────────────
const ANIMAL_TYPES = [
  { kind: 'chicken', color: '#F5F5DC', accent: '#E53935', w: 18, h: 16 },
  { kind: 'deer',    color: '#A0724A', accent: '#FFF8E1', w: 26, h: 22 },
  { kind: 'rabbit',  color: '#D4A574', accent: '#FFF0E6', w: 16, h: 16 },
  { kind: 'hedgehog',color: '#8B6914', accent: '#5C4033', w: 20, h: 14 },
  { kind: 'duck',    color: '#F6B700', accent: '#FB8C00', w: 18, h: 14 },
];

/**
 * Spawn animals for a trail lane.
 * Returns an array of animal objects.
 */
function spawnAnimals(laneData, screenW) {
  const animals = [];
  const gap = 110 + Math.random() * 70;
  const count = Math.ceil((screenW + 200) / gap);
  for (let i = 0; i < count; i++) {
    const aType = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
    animals.push({
      x: i * gap + Math.random() * 40 - 100,
      kind: aType.kind,
      color: aType.color,
      accent: aType.accent,
      w: aType.w,
      h: aType.h,
      speed: laneData.speed,
      dir: laneData.dir,
      phase: Math.random() * Math.PI * 2, // animation phase offset
    });
  }
  return animals;
}

// ── Decorations for grass lanes ─────────────────────────────────────
function makeGrassDecorations(screenW) {
  const decos = [];
  const count = 3 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    decos.push({
      x: Math.random() * screenW,
      type: ['flower', 'daisy', 'mushroom', 'bush'][Math.floor(Math.random() * 4)],
      color: ['#FF6B6B', '#FFD93D', '#6BCB77', '#FF8C94', '#C9B1FF'][Math.floor(Math.random() * 5)],
    });
  }
  return decos;
}

// ── Main game class ─────────────────────────────────────────────────

class CalmRiverRapids extends IMiniGame {
  mount() {
    const c = this.ctx.container;
    c.innerHTML = '';
    c.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:#3a6e3a;';

    this._disposed = false;
    this._timeouts = [];

    this._gc = new GameCanvas(c);
    this._input = new InputManager(this._gc.canvas);
    this._particles = new ParticleEmitter();
    this._tweens = new TweenManager();
    this._hud = new HUD(c);

    const diff = DIFFICULTY[this.ctx.difficulty] || DIFFICULTY.medium;
    const w = this._gc.width;
    const h = this._gc.height;

    // Build lane map
    this._lanes = buildLanes(diff);
    this._totalLanes = this._lanes.length;

    // How many columns (grid cells) across
    this._cols = Math.floor(w / LANE_H);
    this._cellW = w / this._cols;

    // Daniel grid position: lane index (row) from bottom, column
    this._playerLane = 0;
    this._playerCol = Math.floor(this._cols / 2);

    // Smooth movement animation
    this._moveAnim = null;
    this._moveCooldown = 0;

    // Animals per trail lane
    this._animals = [];
    for (let i = 0; i < this._totalLanes; i++) {
      const lane = this._lanes[i];
      if (lane.type === TRAIL) {
        this._animals.push({ laneIdx: i, items: spawnAnimals(lane, w) });
      }
    }

    // Grass decorations
    this._grassDecos = [];
    for (let i = 0; i < this._totalLanes; i++) {
      if (this._lanes[i].type === GRASS || this._lanes[i].type === CLEARING) {
        this._grassDecos.push({ laneIdx: i, items: makeGrassDecorations(w) });
      }
    }

    // Camera scroll offset — start at bottom of world so lane 0 is visible
    const totalH = this._totalLanes * LANE_H;
    this._cameraY = Math.max(0, totalH - this._gc.height);

    // Game state
    this._lives = 3;
    this._maxLives = 3;
    this._phase = 'playing';
    this._hurtTimer = 0;
    this._calmBreathActive = false;
    this._calmBreathTimer = 0;
    this._calmZonesVisited = 0;
    this._totalCalmZones = this._lanes.filter(l => l.type === CALM_ZONE).length;
    this._glowTimer = 0;
    this._time = 0;

    // Track previous safe lane for pushback
    this._lastSafeLane = 0;

    // Daniel (canvas-drawn, clearly visible size)
    this._daniel = new DanielPlayer({ size: DANIEL_SIZE, facing: 'right' });

    this._hud.setLives(this._lives, this._maxLives);
    this._hud.setObjective('Cross the forest trail!');
    this._hud.setScore('');

    // Input: detect discrete key presses
    this._keyStates = { up: false, down: false, left: false, right: false, action: false };
  }

  async start() {
    await showIntroScreen(this.ctx.container, {
      title: 'Calm Crossing',
      story: "Help Daniel cross the busy forest trail! Wait for the animals to pass, then move forward. In real life, always cross roads with a grown-up!",
      controls: 'Arrow keys to move one step at a time',
      mobileControls: 'Swipe or tap to move',
      goal: 'Cross safely by waiting for gaps. Stay in a calm zone for a whole breath to win back a heart!',
    });
    this._gc.run(
      (dt) => this._update(dt),
      (ctx) => this._render(ctx),
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  /** Convert lane index to screen Y (top edge of lane). */
  _laneScreenY(laneIdx) {
    const totalH = this._totalLanes * LANE_H;
    return totalH - (laneIdx + 1) * LANE_H - this._cameraY;
  }

  /** Get the center position of Daniel in pixel space. */
  _danielPixelPos() {
    const lx = this._playerCol * this._cellW + this._cellW / 2;
    const ly = this._laneScreenY(this._playerLane) + LANE_H / 2;
    return { x: lx, y: ly };
  }

  _isSafeLane(laneIdx) {
    if (laneIdx < 0 || laneIdx >= this._totalLanes) return false;
    const t = this._lanes[laneIdx].type;
    return t === GRASS || t === WILDFLOWER || t === CALM_ZONE || t === CLEARING;
  }

  _findPreviousSafeLane(fromLane) {
    for (let i = fromLane; i >= 0; i--) {
      if (this._isSafeLane(i)) return i;
    }
    return 0;
  }

  // ── Update ──────────────────────────────────────────────────────────

  _update(dt) {
    if (this._disposed) return;
    if (this._phase === 'ending') return;

    this._time += dt;
    this._tweens.update(dt);
    this._particles.update(dt);

    if (this._hurtTimer > 0) this._hurtTimer -= dt;
    if (this._glowTimer > 0) this._glowTimer -= dt;
    if (this._calmBreathTimer > 0) {
      this._calmBreathTimer -= dt;
      if (this._calmBreathTimer <= 0) {
        this._calmBreathActive = false;
        // Staying for the whole breath is rewarded — pausing has real power
        if (this._lanes[this._playerLane]?.type === CALM_ZONE) {
          if (this._lives < this._maxLives) {
            this._lives++;
            this._hud.setLives(this._lives, this._maxLives);
            this._hud.flash('That breath made you stronger! ❤ restored', '#14b8a6');
          } else {
            this._hud.flash('Lovely, steady breathing. Ready when you are!', '#14b8a6');
          }
          this.ctx.audio.play('collect');
          const pos = this._danielPixelPos();
          this._particles.emit({
            x: pos.x, y: pos.y, count: 14,
            color: '#80CBC4', spread: 55, life: 0.9, shape: 'star',
          });
        }
      }
    }
    if (this._moveCooldown > 0) this._moveCooldown -= dt;

    // Update smooth movement animation
    if (this._moveAnim) {
      this._moveAnim.t += dt;
      if (this._moveAnim.t >= this._moveAnim.duration) {
        this._moveAnim = null;
      }
    }

    const w = this._gc.width;
    const h = this._gc.height;

    // Handle input
    this._handleInput();

    // Update animals
    for (const group of this._animals) {
      for (const a of group.items) {
        a.x += a.speed * a.dir * dt;
        if (a.dir > 0 && a.x > w + 50) a.x = -a.w - 30;
        if (a.dir < 0 && a.x < -a.w - 30) a.x = w + 50;
      }
    }

    // Collision detection (only if not hurt / animating pushback)
    if (this._hurtTimer <= 0 && !this._moveAnim) {
      const lane = this._lanes[this._playerLane];
      if (lane.type === TRAIL) {
        const pos = this._danielPixelPos();
        const danielHalfW = DANIEL_SIZE * 0.35;

        const group = this._animals.find(g => g.laneIdx === this._playerLane);
        if (group) {
          for (const a of group.items) {
            const aLeft = a.x - a.w / 2;
            const aRight = a.x + a.w / 2;
            if (pos.x + danielHalfW > aLeft + 4 && pos.x - danielHalfW < aRight - 4) {
              // Hit!
              this._lives--;
              this._hurtTimer = 0.6;
              this._daniel.hurt();
              this._hud.setLives(this._lives, this._maxLives);
              this._gc.shake(4, 200);
              this.ctx.audio.play('hit');
              this._particles.emit({
                x: pos.x, y: pos.y, count: 6,
                color: '#EF4444', spread: 35, life: 0.4,
              });

              if (this._lives <= 0) {
                this._onLose();
                return;
              }

              const safeLane = this._findPreviousSafeLane(this._playerLane - 1);
              this._startMoveAnim(this._playerLane, this._playerCol, safeLane, this._playerCol, 0.3);
              this._playerLane = safeLane;
              this._lastSafeLane = safeLane;
              break;
            }
          }
        }
      }
    }

    // Track last safe lane
    if (this._isSafeLane(this._playerLane) && this._hurtTimer <= 0) {
      this._lastSafeLane = this._playerLane;
    }

    // Calm breath zone detection
    const curLane = this._lanes[this._playerLane];
    if (curLane.type === CALM_ZONE && !this._calmBreathActive && this._hurtTimer <= 0) {
      if (!curLane._visited) {
        curLane._visited = true;
        this._calmZonesVisited++;
        this._calmBreathActive = true;
        this._calmBreathTimer = 2.5;
        this._glowTimer = 2.5;
        this._hud.flash('Take a calm breath...', '#14b8a6');
        this.ctx.audio.play('collect');
        const pos = this._danielPixelPos();
        this._particles.emit({
          x: pos.x, y: pos.y, count: 12,
          color: '#14b8a6', spread: 50, life: 0.8,
        });
      }
    }

    // Camera: scroll to keep Daniel in view (world Y 0 = top, totalH = bottom)
    const totalH = this._totalLanes * LANE_H;
    const maxCamY = Math.max(0, totalH - h);
    // Place Daniel at 60% from top of screen
    const targetCamY = Math.max(0, Math.min(maxCamY, totalH - (this._playerLane + 1) * LANE_H - h * 0.6));
    this._cameraY += (targetCamY - this._cameraY) * 0.12;

    // Update Daniel sprite position
    let drawPos;
    if (this._moveAnim) {
      const progress = Math.min(1, this._moveAnim.t / this._moveAnim.duration);
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      drawPos = {
        x: this._moveAnim.fromX + (this._moveAnim.toX - this._moveAnim.fromX) * ease,
        y: this._moveAnim.fromY + (this._moveAnim.toY - this._moveAnim.fromY) * ease,
      };
    } else {
      drawPos = this._danielPixelPos();
    }
    this._daniel.x = drawPos.x - DANIEL_SIZE / 2;
    this._daniel.y = drawPos.y - DANIEL_SIZE / 2 - 2;
    this._daniel.update(dt);

    // HUD progress
    const progress = Math.min(1, this._playerLane / (this._totalLanes - 1));
    this._hud.setObjective(`${Math.round(progress * 100)}% crossed`);

    // Win condition
    if (this._playerLane >= this._totalLanes - 1) {
      this._onWin();
    }

    this._input.endFrame();
  }

  _handleInput() {
    if (this._moveCooldown > 0) return;
    if (this._moveAnim) return;
    if (this._hurtTimer > 0) return;

    const keys = this._input.keys;
    const swipe = this._input.swipe;

    let dLane = 0;
    let dCol = 0;

    if (keys.up && !this._keyStates.up) dLane = 1;
    if (keys.down && !this._keyStates.down) dLane = -1;
    if (keys.left && !this._keyStates.left) dCol = -1;
    if (keys.right && !this._keyStates.right) dCol = 1;

    if (swipe) {
      if (swipe.dir === 'up') dLane = 1;
      else if (swipe.dir === 'down') dLane = -1;
      else if (swipe.dir === 'left') dCol = -1;
      else if (swipe.dir === 'right') dCol = 1;
    }

    if (keys.action && !this._keyStates.action) dLane = 1;

    this._keyStates.up = keys.up;
    this._keyStates.down = keys.down;
    this._keyStates.left = keys.left;
    this._keyStates.right = keys.right;
    this._keyStates.action = keys.action;

    if (dLane !== 0 || dCol !== 0) {
      const newLane = Math.max(0, Math.min(this._totalLanes - 1, this._playerLane + dLane));
      const newCol = Math.max(0, Math.min(this._cols - 1, this._playerCol + dCol));

      if (newLane !== this._playerLane || newCol !== this._playerCol) {
        // Update facing direction
        if (dCol > 0) this._daniel.facing = 'right';
        else if (dCol < 0) this._daniel.facing = 'left';

        this._startMoveAnim(this._playerLane, this._playerCol, newLane, newCol, 0.12);
        this._playerLane = newLane;
        this._playerCol = newCol;
        this._moveCooldown = 0.13;
        this._daniel._state = 'walking';
        this.ctx.audio.play('collect');
      }
    }
  }

  _startMoveAnim(fromLane, fromCol, toLane, toCol, duration) {
    const fromX = fromCol * this._cellW + this._cellW / 2;
    const fromY = this._laneScreenY(fromLane) + LANE_H / 2;
    const toX = toCol * this._cellW + this._cellW / 2;
    const toY = this._laneScreenY(toLane) + LANE_H / 2;
    this._moveAnim = { fromX, fromY, toX, toY, t: 0, duration };
  }

  // ── Win / Lose ────────────────────────────────────────────────────

  _onWin() {
    this._phase = 'ending';
    const lifeRatio = this._lives / this._maxLives;
    const calmRatio = this._totalCalmZones > 0 ? this._calmZonesVisited / this._totalCalmZones : 0;
    const score = Math.min(1, lifeRatio * 0.6 + calmRatio * 0.4);
    this._daniel.celebrate();
    this._hud.flash('You made it to the clearing!', '#4CAF50');
    this._particles.emit({
      x: this._gc.width / 2, y: this._gc.height / 2, count: 20,
      color: '#FFD700', spread: 100, life: 1, shape: 'star',
    });
    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._complete({
        score,
        skillTags: ['patience', 'self-control', 'calm'],
      });
    }, 1500);
    this._timeouts.push(tid);
  }

  _onLose() {
    this._phase = 'ending';
    this._hud.flash('Keep trying!', '#EF4444');
    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._fail({
        score: 0,
        skillTags: ['patience', 'self-control'],
      });
    }, 800);
    this._timeouts.push(tid);
  }

  // ── Render ────────────────────────────────────────────────────────

  _render(ctx) {
    const w = this._gc.width;
    const h = this._gc.height;
    this._gc.clear('#3a6e3a');

    // Draw lanes from bottom to top
    for (let i = 0; i < this._totalLanes; i++) {
      const lane = this._lanes[i];
      const y = this._laneScreenY(i);

      if (y > h + LANE_H || y < -LANE_H * 2) continue;

      switch (lane.type) {
        case GRASS:
          this._renderGrassLane(ctx, y, w, i);
          break;
        case TRAIL:
          this._renderTrailLane(ctx, y, w, i);
          break;
        case WILDFLOWER:
          this._renderWildflowerLane(ctx, y, w);
          break;
        case CALM_ZONE:
          this._renderCalmLane(ctx, y, w, lane);
          break;
        case CLEARING:
          this._renderClearingLane(ctx, y, w, i);
          break;
      }
    }

    // Draw animals on top of trail lanes
    for (const group of this._animals) {
      const y = this._laneScreenY(group.laneIdx);
      if (y > h + LANE_H || y < -LANE_H * 2) continue;
      for (const a of group.items) {
        this._renderAnimal(ctx, a, y + LANE_H / 2);
      }
    }

    // Calm breath glow around Daniel
    if (this._glowTimer > 0) {
      const pos = this._danielPixelPos();
      const glowAlpha = Math.min(1, this._glowTimer / 1.5) * 0.3;
      ctx.save();
      ctx.globalAlpha = glowAlpha + Math.sin(this._time * 6) * 0.08;
      ctx.fillStyle = '#14b8a6';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 2, DANIEL_SIZE * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Daniel — always render with hurt flash
    const hurtFlash = this._hurtTimer > 0 && Math.floor(this._hurtTimer * 10) % 2 === 0;
    if (!hurtFlash) {
      this._daniel.render(ctx);
    }

    // Calm breath message overlay
    if (this._calmBreathActive) {
      const msgAlpha = Math.min(1, this._calmBreathTimer / 1.5);
      ctx.save();
      ctx.globalAlpha = msgAlpha;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(w / 2 - 120, h / 2 - 55, 240, 55, 12);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px "League Spartan", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Take a calm breath...', w / 2, h / 2 - 32);
      // Breathing circle
      const breathScale = 1 + Math.sin(this._time * 3) * 0.3;
      ctx.fillStyle = '#14b8a6';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 - 10, 6 * breathScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Particles on top
    this._particles.render(ctx);
  }

  // ── Lane renderers ────────────────────────────────────────────────

  _renderGrassLane(ctx, y, w, laneIdx) {
    ctx.fillStyle = laneIdx % 2 === 0 ? '#5da84a' : '#4e9640';
    ctx.fillRect(0, y, w, LANE_H);

    // Small grass blade details
    ctx.strokeStyle = 'rgba(80,140,50,0.4)';
    ctx.lineWidth = 1;
    for (let gx = 8; gx < w; gx += 18 + Math.sin(laneIdx + gx) * 6) {
      ctx.beginPath();
      ctx.moveTo(gx, y + LANE_H);
      ctx.lineTo(gx - 2, y + LANE_H - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gx + 4, y + LANE_H);
      ctx.lineTo(gx + 6, y + LANE_H - 6);
      ctx.stroke();
    }

    // Decorations
    const decoGroup = this._grassDecos.find(g => g.laneIdx === laneIdx);
    if (decoGroup) {
      for (const d of decoGroup.items) {
        if (d.type === 'flower') {
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, y + LANE_H / 2, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFE082';
          ctx.beginPath();
          ctx.arc(d.x, y + LANE_H / 2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (d.type === 'daisy') {
          ctx.fillStyle = '#FFF';
          for (let p = 0; p < 5; p++) {
            const angle = (p / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(d.x + Math.cos(angle) * 3, y + LANE_H / 2 + Math.sin(angle) * 3, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(d.x, y + LANE_H / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (d.type === 'mushroom') {
          // Stem
          ctx.fillStyle = '#FFF8E1';
          ctx.fillRect(d.x - 2, y + LANE_H / 2, 4, 6);
          // Cap
          ctx.fillStyle = '#E53935';
          ctx.beginPath();
          ctx.arc(d.x, y + LANE_H / 2, 5, Math.PI, 0);
          ctx.fill();
          // White dots
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(d.x - 2, y + LANE_H / 2 - 2, 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(d.x + 2, y + LANE_H / 2 - 3, 1, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Bush
          ctx.fillStyle = '#2E7D32';
          ctx.beginPath();
          ctx.arc(d.x, y + LANE_H / 2 + 2, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#388E3C';
          ctx.beginPath();
          ctx.arc(d.x + 4, y + LANE_H / 2 + 1, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  _renderTrailLane(ctx, y, w, laneIdx) {
    // Dirt path
    ctx.fillStyle = laneIdx % 2 === 0 ? '#9B7B4A' : '#8B6D3F';
    ctx.fillRect(0, y, w, LANE_H);

    // Dirt texture — small pebbles/dots
    ctx.fillStyle = 'rgba(120,90,50,0.3)';
    for (let px = 10; px < w; px += 20 + Math.sin(laneIdx * 3 + px) * 8) {
      ctx.beginPath();
      ctx.arc(px, y + LANE_H / 2 + (Math.sin(px * 0.3) * 4), 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grass edge at top and bottom of trail
    ctx.fillStyle = 'rgba(90,160,70,0.35)';
    ctx.fillRect(0, y, w, 3);
    ctx.fillRect(0, y + LANE_H - 3, w, 3);
  }

  _renderWildflowerLane(ctx, y, w) {
    // Light green base with wildflowers — safe crossing zone
    ctx.fillStyle = '#6db85a';
    ctx.fillRect(0, y, w, LANE_H);

    // Scattered wildflowers
    const colors = ['#FF6B6B', '#FFD93D', '#C9B1FF', '#FF8C94', '#FFF'];
    for (let fx = 12; fx < w; fx += 18) {
      const fc = colors[Math.floor(Math.sin(fx * 0.7) * 2.5 + 2.5)];
      ctx.fillStyle = fc;
      ctx.beginPath();
      ctx.arc(fx + Math.sin(fx) * 4, y + LANE_H / 2 + Math.cos(fx * 0.5) * 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // SAFE label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SAFE', w / 2, y + LANE_H / 2);
  }

  _renderCalmLane(ctx, y, w, lane) {
    const visited = lane._visited;
    ctx.fillStyle = visited ? '#0d9488' : '#14b8a6';
    ctx.fillRect(0, y, w, LANE_H);

    // Breathing circle pattern
    const pulse = 1 + Math.sin(this._time * 2.5) * 0.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    for (let bx = 30; bx < w; bx += 60) {
      ctx.beginPath();
      ctx.arc(bx, y + LANE_H / 2, 6 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Tiny leaf decorations
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (let lx = 15; lx < w; lx += 40) {
      ctx.beginPath();
      ctx.ellipse(lx, y + LANE_H / 2, 4, 2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CALM ZONE', w / 2, y + LANE_H / 2);
  }

  _renderClearingLane(ctx, y, w, laneIdx) {
    // Pond/clearing destination — light blue-green
    const isTop = laneIdx === this._totalLanes - 1;
    ctx.fillStyle = isTop ? '#5ba8a0' : '#4a9890';
    ctx.fillRect(0, y, w, LANE_H);

    // Water ripples
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    const rippleOffset = this._time * 15;
    for (let rx = 20; rx < w; rx += 50) {
      ctx.beginPath();
      ctx.arc(rx + Math.sin(rippleOffset * 0.03 + rx) * 5, y + LANE_H / 2, 8 + Math.sin(this._time * 2 + rx) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Trees around clearing
    const treePositions = [w * 0.1, w * 0.3, w * 0.55, w * 0.75, w * 0.92];
    for (const tx of treePositions) {
      // Trunk
      ctx.fillStyle = '#6B4226';
      ctx.fillRect(tx - 2, y + LANE_H / 2 + 2, 4, LANE_H / 2 - 4);
      // Crown
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath();
      ctx.arc(tx, y + LANE_H / 2 - 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.arc(tx + 3, y + LANE_H / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label on top lane
    if (isTop) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 14px "League Spartan", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CLEARING', w / 2, y + LANE_H / 2);
    }
  }

  // ── Animal rendering ──────────────────────────────────────────────

  _renderAnimal(ctx, a, centerY) {
    const x = a.x;
    ctx.save();
    ctx.translate(x, centerY);
    if (a.dir < 0) ctx.scale(-1, 1);

    // Bobbing animation
    const bob = Math.sin(this._time * 5 + a.phase) * 1.5;

    switch (a.kind) {
      case 'chicken':
        this._drawChicken(ctx, bob, a);
        break;
      case 'deer':
        this._drawDeer(ctx, bob, a);
        break;
      case 'rabbit':
        this._drawRabbit(ctx, bob, a);
        break;
      case 'hedgehog':
        this._drawHedgehog(ctx, bob, a);
        break;
      case 'duck':
        this._drawDuck(ctx, bob, a);
        break;
    }

    ctx.restore();
  }

  _drawChicken(ctx, bob, a) {
    // Body (white/cream oval)
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.ellipse(0, bob, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = '#E8E0D0';
    ctx.beginPath();
    ctx.ellipse(-2, bob + 1, 5, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.arc(7, bob - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    // Comb (red)
    ctx.fillStyle = a.accent;
    ctx.beginPath();
    ctx.arc(8, bob - 9, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, bob - 10, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#FB8C00';
    ctx.beginPath();
    ctx.moveTo(11, bob - 4);
    ctx.lineTo(14, bob - 3);
    ctx.lineTo(11, bob - 2);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(9, bob - 5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = '#FB8C00';
    ctx.lineWidth = 1.5;
    const legBob = Math.sin(this._time * 8 + a.phase) * 2;
    ctx.beginPath();
    ctx.moveTo(-2, bob + 6);
    ctx.lineTo(-2 + legBob, bob + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, bob + 6);
    ctx.lineTo(2 - legBob, bob + 10);
    ctx.stroke();
  }

  _drawDeer(ctx, bob, a) {
    // Body (brown oval)
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.ellipse(0, bob, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly patch
    ctx.fillStyle = a.accent;
    ctx.beginPath();
    ctx.ellipse(0, bob + 3, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head/neck
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.ellipse(10, bob - 6, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.fillRect(6, bob - 8, 6, 6);

    // Antlers
    ctx.strokeStyle = '#6B4226';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, bob - 11);
    ctx.lineTo(8, bob - 17);
    ctx.lineTo(6, bob - 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, bob - 11);
    ctx.lineTo(14, bob - 17);
    ctx.lineTo(16, bob - 15);
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(13, bob - 7, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(15, bob - 5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#7A5C3A';
    const legAnim = Math.sin(this._time * 6 + a.phase) * 1.5;
    ctx.fillRect(-6 + legAnim, bob + 6, 2.5, 8);
    ctx.fillRect(-1 - legAnim, bob + 6, 2.5, 8);
    ctx.fillRect(4 + legAnim, bob + 6, 2.5, 8);
    ctx.fillRect(8 - legAnim, bob + 6, 2.5, 8);

    // Tail
    ctx.fillStyle = a.accent;
    ctx.beginPath();
    ctx.arc(-12, bob - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawRabbit(ctx, bob, a) {
    // Hop animation (more bounce)
    const hop = Math.abs(Math.sin(this._time * 6 + a.phase)) * 3;

    // Body
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.ellipse(0, bob - hop, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.arc(6, bob - hop - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.ellipse(4, bob - hop - 14, 2, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, bob - hop - 14, 2, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Inner ear
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(4, bob - hop - 14, 1, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, bob - hop - 14, 1, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(8, bob - hop - 6, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.arc(10, bob - hop - 4, 1, 0, Math.PI * 2);
    ctx.fill();

    // Tail (fluffy white ball)
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(-7, bob - hop, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawHedgehog(ctx, bob, a) {
    // Spines (brown/dark semi-circle on top)
    ctx.fillStyle = a.accent;
    ctx.beginPath();
    ctx.ellipse(0, bob, 10, 7, 0, Math.PI, 0);
    ctx.fill();

    // Spine texture
    ctx.strokeStyle = '#3D2B1F';
    ctx.lineWidth = 1;
    for (let s = -8; s <= 8; s += 3) {
      ctx.beginPath();
      ctx.moveTo(s, bob - 3);
      ctx.lineTo(s + 1, bob - 8);
      ctx.stroke();
    }

    // Body/belly (lighter)
    ctx.fillStyle = '#C4A265';
    ctx.beginPath();
    ctx.ellipse(0, bob + 2, 9, 5, 0, 0, Math.PI);
    ctx.fill();

    // Face
    ctx.fillStyle = '#C4A265';
    ctx.beginPath();
    ctx.arc(8, bob, 4, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(11, bob, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(9, bob - 2, 1, 0, Math.PI * 2);
    ctx.fill();

    // Tiny legs
    ctx.fillStyle = '#8B6914';
    const legAnim = Math.sin(this._time * 5 + a.phase) * 1;
    ctx.fillRect(-5 + legAnim, bob + 5, 2, 3);
    ctx.fillRect(0 - legAnim, bob + 5, 2, 3);
    ctx.fillRect(5 + legAnim, bob + 5, 2, 3);
  }

  _drawDuck(ctx, bob, a) {
    // Waddle animation
    const waddle = Math.sin(this._time * 7 + a.phase) * 1.5;

    // Body (yellow oval)
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.ellipse(0, bob + waddle * 0.3, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = '#E5A100';
    ctx.beginPath();
    ctx.ellipse(-2, bob + waddle * 0.3 + 1, 5, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#43A047';
    ctx.beginPath();
    ctx.arc(7, bob - 4 + waddle * 0.3, 5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = a.accent;
    ctx.beginPath();
    ctx.moveTo(11, bob - 3 + waddle * 0.3);
    ctx.lineTo(15, bob - 2 + waddle * 0.3);
    ctx.lineTo(11, bob - 1 + waddle * 0.3);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(9, bob - 5 + waddle * 0.3, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Feet
    ctx.fillStyle = a.accent;
    const legAnim = Math.sin(this._time * 7 + a.phase) * 2;
    ctx.beginPath();
    ctx.ellipse(-2 + legAnim, bob + 7, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(3 - legAnim, bob + 7, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Dispose ─────────────────────────────────────────────────────────

  dispose() {
    this._disposed = true;
    for (const tid of this._timeouts) clearTimeout(tid);
    this._timeouts = [];
    this._gc?.dispose();
    this._input?.dispose();
    this._hud?.dispose();
    super.dispose();
  }
}

register({
  id: 'calm-river-rapids',
  name: 'Calm River Rapids',
  displayName: 'Calm Crossing',
  description: 'Cross the busy forest trail safely by pausing and choosing safe moments!',
  skillTags: ['patience', 'self-control', 'calm'],
  defaultConfig: {},
  factory: (ctx) => new CalmRiverRapids(ctx),
});

export default CalmRiverRapids;
