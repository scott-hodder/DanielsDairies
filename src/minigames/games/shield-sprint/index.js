/**
 * Shield Sprint — Duck under unhelpful thoughts, jump to collect helpful ones.
 *
 * Daniel auto-runs rightward through a bright scrolling meadow.
 * THREE types of things approach from the right:
 *   - Helpful thought stars (golden stars, up high) — jump to collect
 *   - Unhelpful thought clouds (dark purple, head height) — duck to avoid
 *   - Road cones (orange triangles, ground level) — jump over them
 *
 * Controls:
 *   Keyboard: ArrowUp / W = jump, ArrowDown / S = duck
 *   Touch: tap top half / swipe up = jump, tap bottom half / swipe down = duck
 *
 * If Daniel stands still (idle), clouds hit him and stars fly past uncollected.
 *
 * SEL skill: noticing and avoiding unhelpful thoughts, reaching for helpful ones.
 */
import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';
import {
  GameCanvas, ScrollingScene, createSkyLayer, createHillsLayer, createObjectsLayer,
  InputManager, ParticleEmitter, HUD, DialogueBox, TweenManager, showIntroScreen, DANIEL_IMAGES,
} from '../../engine/index.js';
import DanielPlayer from '../../engine/DanielPlayer.js';

// ─── Content ───────────────────────────────────────────────────────────────────

const HELPFUL_THOUGHTS = [
  'I can try my best',
  'Mistakes help me learn',
  'I am brave',
  'I can ask for help',
  'Tomorrow is a new day',
  'I am enough',
];

const UNHELPFUL_THOUGHTS = [
  "I can't do anything right",
  'Nobody likes me',
  "I'll never get better",
  'Everything is ruined',
  "I'm not good enough",
  'I always fail',
];

// Daniel talks back when the child ducks an unhelpful thought —
// the duck is a refusal, and refusals deserve words.
const DUCK_RESPONSES = [
  'Not today, cloud!',
  "I don't believe you!",
  'Nice duck! That thought missed!',
  'Nope, not listening!',
  'That one flew right past!',
];

// ─── Helper: draw a 5-point star path ──────────────────────────────────────────
function starPath(ctx, cx, cy, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const aOuter = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const aInner = aOuter + Math.PI / 5;
    if (i === 0) ctx.moveTo(cx + Math.cos(aOuter) * outerR, cy + Math.sin(aOuter) * outerR);
    else ctx.lineTo(cx + Math.cos(aOuter) * outerR, cy + Math.sin(aOuter) * outerR);
    ctx.lineTo(cx + Math.cos(aInner) * innerR, cy + Math.sin(aInner) * innerR);
  }
  ctx.closePath();
}

class ShieldSprint extends IMiniGame {
  mount() {
    const c = this.ctx.container;
    c.innerHTML = '';
    c.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:#87CEEB;';

    this._disposed = false;
    this._timeouts = [];

    // Canvas + engine
    this._gc = new GameCanvas(c);
    this._input = new InputManager(this._gc.canvas);
    this._particles = new ParticleEmitter();
    this._tweens = new TweenManager();
    this._hud = new HUD(c);

    // Scene
    const gh = this._gc.height;
    this._groundY = gh * 0.82;

    this._scene = new ScrollingScene({
      direction: 'horizontal',
      speed: 110,
      layers: [
        createSkyLayer(['#87CEEB', '#B4E4FF', '#E8F8FF'], 0),
        // Decorative floating stars in sky
        createObjectsLayer((ctx, x, y, seed) => {
          const r = 5 + seed * 6;
          const starY = y - seed * 25;
          const pulse = 0.4 + Math.sin(Date.now() * 0.002 + seed * 10) * 0.15;
          ctx.save();
          ctx.globalAlpha = pulse;
          ctx.fillStyle = seed > 0.5 ? '#FFD700' : '#FFC107';
          starPath(ctx, x, starY, r, r * 0.4);
          ctx.fill();
          ctx.restore();
        }, 220, 55, 0.12),
        // Far hills
        createHillsLayer('rgba(76,175,80,0.25)', gh * 0.55, 20, 0.008, 0.25),
        // Near hills
        createHillsLayer('rgba(56,142,60,0.4)', gh * 0.65, 12, 0.015, 0.5),
        // Trees
        createObjectsLayer((ctx, x, y, seed) => {
          const h = 30 + seed * 40;
          ctx.fillStyle = '#8B6914';
          ctx.fillRect(x - 3, y - h, 6, h);
          ctx.fillStyle = seed > 0.5 ? '#4CAF50' : '#66BB6A';
          ctx.beginPath();
          ctx.arc(x, y - h, 14 + seed * 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = seed > 0.5 ? '#66BB6A' : '#81C784';
          ctx.beginPath();
          ctx.arc(x + 6, y - h + 5, 10 + seed * 6, 0, Math.PI * 2);
          ctx.fill();
        }, 120, gh * 0.82, 0.7),
        // Ground
        createHillsLayer('#4CAF50', gh * 0.88, 4, 0.03, 1),
      ],
    });

    // Daniel (canvas-drawn player)
    this._daniel = new DanielPlayer({ x: 60, y: this._groundY - 52, size: 52, facing: 'right' });
    this._daniel.vx = 0;
    this._daniel.vy = 0;
    this._daniel.grounded = true;
    this._daniel.jumpPower = -280;
    this._daniel.gravity = 650;

    // Game state
    const diff = DIFFICULTY[this.ctx.difficulty] || DIFFICULTY.medium;
    this._lives = 3;
    this._maxLives = 3;
    this._score = 0;
    this._phase = 'running'; // running | ending
    this._speedMult = diff.speedMultiplier;
    // Gentle warm-up start so young players learn the controls in play
    this._currentSpeed = 88 * this._speedMult;
    this._distanceTraveled = 0;

    // Duck state
    this._ducking = false;
    this._duckHitboxShrink = 28; // how many px shorter Daniel's hitbox is when ducking

    // Build obstacle queue
    this._queue = this._buildQueue(diff);
    this._activeObstacles = [];
    this._nextSpawnDist = 280;
    this._totalThings = this._queue.length;
    this._starsCollected = 0;
    this._cloudsDucked = 0;

    // HUD
    this._hud.setLives(this._lives, this._maxLives);
    this._hud.setObjective('Duck under clouds, jump for stars!');
    this._hud.setScore('0');

    // ── Input ──
    this._jumpRequested = false;
    this._duckRequested = false;

    // Touch: tap top half = jump, tap bottom half = duck
    this._input.onAction(() => {
      if (this._disposed || this._phase !== 'running') return;

      if (this._input.touch.startY > 0) {
        const canvasH = this._gc.height;
        if (this._input.touch.startY < canvasH * 0.45) {
          this._jumpRequested = true;
        } else {
          this._duckRequested = true;
        }
      } else {
        // Space/Enter from keyboard = jump
        this._jumpRequested = true;
      }
    });

    // Keyboard: ArrowUp/W = jump, ArrowDown/S = duck
    this._onKeyDown = (e) => {
      if (this._phase !== 'running') return;
      if (e.key === 'ArrowUp' || e.key === 'w') {
        this._jumpRequested = true;
      }
      if (e.key === 'ArrowDown' || e.key === 's') {
        this._duckRequested = true;
      }
    };
    window.addEventListener('keydown', this._onKeyDown);

    // Track key release for duck
    this._onKeyUp = (e) => {
      if (e.key === 'ArrowDown' || e.key === 's') {
        this._ducking = false;
      }
    };
    window.addEventListener('keyup', this._onKeyUp);
  }

  _buildQueue(diff) {
    const count = Math.round(8 * (diff.targetCountMultiplier || 1));

    const helpfulPool = [...HELPFUL_THOUGHTS].sort(() => Math.random() - 0.5);
    const unhelpfulPool = [...UNHELPFUL_THOUGHTS].sort(() => Math.random() - 0.5);

    const queue = [];
    let hi = 0, ui = 0;

    const starCount = Math.max(3, Math.round(count * 0.35));
    const cloudCount = Math.max(3, Math.round(count * 0.35));
    const coneCount = Math.max(2, count - starCount - cloudCount);

    for (let i = 0; i < starCount; i++) {
      queue.push({ type: 'star', text: helpfulPool[hi % helpfulPool.length] });
      hi++;
    }
    for (let i = 0; i < cloudCount; i++) {
      queue.push({ type: 'cloud', text: unhelpfulPool[ui % unhelpfulPool.length] });
      ui++;
    }
    for (let i = 0; i < coneCount; i++) {
      queue.push({ type: 'cone' });
    }

    // Shuffle
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    return queue;
  }

  async start() {
    await showIntroScreen(this.ctx.container, {
      title: 'Shield Sprint',
      story: 'Unhelpful thoughts are flying at Daniel! Duck under the dark clouds, jump over obstacles, and leap up to grab helpful thought stars!',
      controls: 'Up / W = Jump, Down / S = Duck',
      mobileControls: 'Tap top = Jump, Tap bottom = Duck',
      goal: 'Duck under unhelpful thoughts and jump to collect helpful ones!',
    });
    this._gc.run(
      (dt) => this._update(dt),
      (ctx) => this._render(ctx),
    );
  }

  _update(dt) {
    if (this._disposed) return;
    if (this._phase === 'ending') return;

    this._daniel.update(dt);
    this._tweens.update(dt);
    this._particles.update(dt);

    if (this._phase === 'running') {
      this._scene.speed = this._currentSpeed;
      this._scene.update(dt);
      this._distanceTraveled += this._currentSpeed * dt;

      // ── Process input requests ──
      if (this._jumpRequested) {
        this._tryJump();
        this._jumpRequested = false;
      }
      if (this._duckRequested) {
        this._startDuck();
        this._duckRequested = false;
      }

      // Swipe up = jump, swipe down = duck
      if (this._input.swipe?.dir === 'up') {
        this._tryJump();
      }
      if (this._input.swipe?.dir === 'down') {
        this._startDuck();
      }

      // Auto-end duck after a short duration (for tap-based duck)
      if (this._ducking && this._duckTimer > 0) {
        this._duckTimer -= dt;
        if (this._duckTimer <= 0) {
          this._ducking = false;
        }
      }

      // ── Spawn obstacles from queue ──
      if (this._queue.length > 0 && this._distanceTraveled >= this._nextSpawnDist) {
        this._spawnNext();
        this._nextSpawnDist = this._distanceTraveled + 220 + Math.random() * 130;
      }

      // ── Update active obstacles ──
      for (let i = this._activeObstacles.length - 1; i >= 0; i--) {
        const obs = this._activeObstacles[i];
        obs.x -= this._currentSpeed * dt;

        // Animate stars with a gentle float
        if (obs.type === 'star') {
          obs.floatPhase = (obs.floatPhase || 0) + dt * 3;
          obs.renderY = obs.baseY + Math.sin(obs.floatPhase) * 6;
        }

        // Off screen left
        if (obs.x < -100) {
          if (!obs.hit) {
            if (obs.type === 'cloud') {
              // Cloud passed — Daniel successfully avoided or it went by
              // Only penalize if it wasn't ducked (it would have hit during overlap)
              // If it passed without collision, Daniel dodged it — no penalty
            }
            // Missed a star = just gone, no penalty
          }
          this._activeObstacles.splice(i, 1);
          continue;
        }

        if (obs.hit) continue;

        // ── Collision detection ──
        const dHitL = this._daniel.x + 10;
        const dHitR = this._daniel.x + this._daniel.w - 10;
        // When ducking, Daniel's top hitbox is lower (he's crouching)
        const dHitT = this._ducking
          ? this._daniel.y + this._duckHitboxShrink
          : this._daniel.y + 6;
        const dHitB = this._daniel.y + this._daniel.h;

        const oHitL = obs.x + 4;
        const oHitR = obs.x + obs.w - 4;
        const oY = obs.type === 'star' ? obs.renderY : obs.y;
        const oHitT = oY + 4;
        const oHitB = oY + obs.h - 4;

        const overlapsX = oHitL < dHitR && oHitR > dHitL;
        const overlapsY = oHitT < dHitB && oHitB > dHitT;

        if (overlapsX && overlapsY) {
          if (obs.type === 'star') {
            // Collect helpful thought!
            obs.hit = true;
            this._starsCollected++;
            this._score++;
            this._hud.setScore(String(this._score));
            this._hud.flash(obs.text, '#FFD700');
            this._particles.emit({
              x: obs.x + obs.w / 2, y: oY + obs.h / 2, count: 10,
              color: '#FFD700', spread: 50, life: 0.7, shape: 'star',
            });
            this.ctx.audio.play('collect');
          } else if (obs.type === 'cloud') {
            // Hit by unhelpful thought! (wasn't ducking low enough)
            this._onHit(obs, i);
          } else if (obs.type === 'cone') {
            // Check if Daniel jumped over
            if (this._daniel.y + this._daniel.h > this._groundY - 18) {
              // Tripped!
              this._onHit(obs, i);
            } else {
              // Cleared!
              obs.hit = true;
              this._hud.flash('Nice jump!', '#14b8a6');
              this._particles.emit({
                x: obs.x + obs.w / 2, y: obs.y - 5, count: 8,
                color: '#FF9800', spread: 40, life: 0.5,
              });
              this.ctx.audio.play('collect');
            }
          }
        } else if (obs.type === 'cloud' && overlapsX && !overlapsY && this._ducking) {
          // Cloud passed over Daniel while ducking — successfully ducked!
          if (!obs.ducked) {
            obs.ducked = true;
            this._cloudsDucked++;
            this._score++;
            this._hud.setScore(String(this._score));
            this._hud.flash(DUCK_RESPONSES[this._cloudsDucked % DUCK_RESPONSES.length], '#14b8a6');
            this._particles.emit({
              x: this._daniel.cx, y: this._daniel.y, count: 6,
              color: '#14b8a6', spread: 30, life: 0.4,
            });
            this.ctx.audio.play('collect');
          }
        }
      }

      // ── Daniel physics ──
      this._daniel.vy += this._daniel.gravity * dt;
      this._daniel.y += this._daniel.vy * dt;
      if (this._daniel.y + this._daniel.h >= this._groundY) {
        this._daniel.y = this._groundY - this._daniel.h;
        this._daniel.vy = 0;
        this._daniel.grounded = true;
      } else {
        this._daniel.grounded = false;
      }
      this._daniel.x = 60;

      // ── Speed sections ──
      const progress = 1 - (this._queue.length / this._totalThings);
      if (progress > 0.66) {
        this._currentSpeed = 155 * this._speedMult;
      } else if (progress > 0.33) {
        this._currentSpeed = 122 * this._speedMult;
      }

      // ── Check win ──
      if (this._queue.length === 0 && this._activeObstacles.length === 0) {
        this._onWin();
      }
    }

    this._input.endFrame();
  }

  _spawnNext() {
    const obs = this._queue.shift();
    const w = this._gc.width;
    if (obs.type === 'star') {
      // Stars are up high — need to jump to reach them
      obs.x = w + 20;
      obs.baseY = this._groundY - 100 - Math.random() * 20;
      obs.renderY = obs.baseY;
      obs.y = obs.baseY;
      obs.w = 36;
      obs.h = 36;
      obs.hit = false;
      obs.floatPhase = Math.random() * Math.PI * 2;
    } else if (obs.type === 'cloud') {
      // Clouds at head/body height — must duck under them
      obs.x = w + 20;
      obs.y = this._groundY - 80;
      obs.w = 90;
      obs.h = 40;
      obs.hit = false;
      obs.ducked = false;
    } else {
      // cone — ground level
      obs.x = w + 20;
      obs.y = this._groundY - 26;
      obs.w = 28;
      obs.h = 26;
      obs.hit = false;
    }
    this._activeObstacles.push(obs);
  }

  _tryJump() {
    if (this._daniel.grounded && this._phase === 'running') {
      this._ducking = false; // cancel duck if jumping
      this._daniel.vy = this._daniel.jumpPower;
      this._daniel.grounded = false;
      this.ctx.audio.play('jump');
    }
  }

  _startDuck() {
    if (this._daniel.grounded && this._phase === 'running') {
      this._ducking = true;
      this._duckTimer = 0.95; // forgiving window for tap-based input
    }
  }

  _onHit(obs, idx) {
    obs.hit = true;
    this._lives--;
    this._hud.setLives(this._lives, this._maxLives);
    this._daniel.hurt();
    this._ducking = false;
    this._gc.shake(5, 250);
    this.ctx.audio.play('hit');
    this._particles.emit({
      x: this._daniel.cx, y: this._daniel.cy, count: 6,
      color: '#EF4444', spread: 50, life: 0.4,
    });
    if (obs.type === 'cloud') {
      this._hud.flash(obs.text, '#EF4444');
    } else {
      this._hud.flash('Tripped!', '#EF4444');
    }
    if (this._lives <= 0) {
      const tid = setTimeout(() => {
        if (this._disposed) return;
        this._onLose();
      }, 400);
      this._timeouts.push(tid);
    }
  }

  _onWin() {
    this._phase = 'ending';
    this._scene.speed = 0;
    const lostLives = this._maxLives - this._lives;
    const ratio = this._totalThings > 0
      ? Math.max(0, (this._score - lostLives * 0.5)) / this._totalThings
      : 1;
    const score = Math.min(1, Math.max(0, ratio));
    this._hud.flash('Amazing! You dodged the unhelpful thoughts!', '#22C55E');
    this._particles.emit({
      x: this._gc.width / 2, y: this._gc.height / 2, count: 30,
      color: '#FFD700', spread: 120, life: 1.2, shape: 'star',
    });
    this._daniel.celebrate(2);
    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._complete({
        score,
        skillTags: ['self-talk', 'cognitive-reframing', 'resilience'],
      });
    }, 1200);
    this._timeouts.push(tid);
  }

  _onLose() {
    this._phase = 'ending';
    this._scene.speed = 0;
    this._hud.flash('Keep trying! You can learn to dodge unhelpful thoughts.', '#EF4444');
    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._fail({
        score: 0,
        skillTags: ['self-talk', 'cognitive-reframing'],
      });
    }, 800);
    this._timeouts.push(tid);
  }

  _render(ctx) {
    const w = this._gc.width;
    const h = this._gc.height;

    // Clear + scene
    this._gc.clear();
    this._scene.render(ctx, w, h);

    // Road surface
    ctx.fillStyle = '#666';
    ctx.fillRect(0, this._groundY, w, h - this._groundY);
    ctx.fillStyle = '#888';
    ctx.fillRect(0, this._groundY, w, 3);
    // Dashed center line
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(0, this._groundY + (h - this._groundY) / 2);
    ctx.lineTo(w, this._groundY + (h - this._groundY) / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, this._groundY - 3, w, 3);

    // ── Render active obstacles ──
    for (const obs of this._activeObstacles) {
      if (obs.hit) continue;
      ctx.save();

      if (obs.type === 'star') {
        // Golden helpful thought star (up high)
        const cx = obs.x + obs.w / 2;
        const cy = obs.renderY + obs.h / 2;
        const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.1;
        const outerR = 14 * pulse;
        const innerR = 6 * pulse;

        // Warm glow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Star shape
        ctx.fillStyle = '#FFD700';
        starPath(ctx, cx, cy, outerR, innerR);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = '#FFF8E1';
        starPath(ctx, cx, cy, outerR * 0.5, innerR * 0.5);
        ctx.fill();

        // "Jump!" hint arrow
        ctx.fillStyle = 'rgba(255,215,0,0.5)';
        ctx.beginPath();
        ctx.moveTo(cx, cy + 20);
        ctx.lineTo(cx - 5, cy + 28);
        ctx.lineTo(cx + 5, cy + 28);
        ctx.closePath();
        ctx.fill();

        // Text label
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.strokeText(obs.text, cx, cy - 24);
        ctx.fillStyle = '#FFF8E1';
        ctx.fillText(obs.text, cx, cy - 24);
      } else if (obs.type === 'cloud') {
        // Dark purple unhelpful thought cloud (head height)
        const cx = obs.x + obs.w / 2;
        const cy = obs.y + obs.h / 2;

        // Cloud shape
        ctx.fillStyle = 'rgba(75, 40, 100, 0.85)';
        ctx.beginPath();
        ctx.arc(cx, cy, obs.w * 0.25, 0, Math.PI * 2);
        ctx.arc(cx - 16, cy + 2, obs.w * 0.18, 0, Math.PI * 2);
        ctx.arc(cx + 16, cy - 2, obs.w * 0.2, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy - 10, obs.w * 0.15, 0, Math.PI * 2);
        ctx.arc(cx - 8, cy - 8, obs.w * 0.16, 0, Math.PI * 2);
        ctx.fill();

        // Outline glow
        ctx.strokeStyle = 'rgba(100, 30, 120, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, obs.w * 0.27, 0, Math.PI * 2);
        ctx.stroke();

        // "Duck!" hint arrow (pointing down)
        if (!obs.ducked) {
          ctx.fillStyle = 'rgba(200, 100, 200, 0.5)';
          ctx.beginPath();
          ctx.moveTo(cx, cy + obs.h / 2 + 4);
          ctx.lineTo(cx - 5, cy + obs.h / 2 - 4);
          ctx.lineTo(cx + 5, cy + obs.h / 2 - 4);
          ctx.closePath();
          ctx.fill();
        }

        // Text
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        const words = obs.text.split(' ');
        if (words.length > 3) {
          const mid = Math.ceil(words.length / 2);
          ctx.strokeText(words.slice(0, mid).join(' '), cx, cy - 5);
          ctx.strokeText(words.slice(mid).join(' '), cx, cy + 13);
          ctx.fillStyle = '#FFB0B0';
          ctx.fillText(words.slice(0, mid).join(' '), cx, cy - 5);
          ctx.fillText(words.slice(mid).join(' '), cx, cy + 13);
        } else {
          ctx.strokeText(obs.text, cx, cy + 4);
          ctx.fillStyle = '#FFB0B0';
          ctx.fillText(obs.text, cx, cy + 4);
        }
      } else if (obs.type === 'cone') {
        // Orange road cone
        ctx.fillStyle = '#FF6B00';
        ctx.beginPath();
        ctx.moveTo(obs.x + 2, obs.y + obs.h);
        ctx.lineTo(obs.x + obs.w / 2, obs.y);
        ctx.lineTo(obs.x + obs.w - 2, obs.y + obs.h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.fillRect(obs.x + obs.w * 0.2, obs.y + obs.h * 0.4, obs.w * 0.6, 3);
        ctx.fillStyle = '#E65100';
        ctx.fillRect(obs.x - 2, obs.y + obs.h - 4, obs.w + 4, 4);
      }

      ctx.restore();
    }

    // ── Daniel ──
    // When ducking, squash Daniel visually
    if (this._ducking && this._daniel.grounded) {
      ctx.save();
      const dx = this._daniel.x + this._daniel.w / 2;
      const dy = this._daniel.y + this._daniel.h;
      ctx.translate(dx, dy);
      ctx.scale(1.2, 0.55); // wider and shorter
      ctx.translate(-dx, -dy);
      this._daniel.render(ctx);
      ctx.restore();

      // "Ducking" label
      ctx.save();
      ctx.fillStyle = 'rgba(20, 184, 166, 0.7)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DUCK', this._daniel.cx, this._daniel.y - 8);
      ctx.restore();
    } else {
      this._daniel.render(ctx);
    }

    // Particles
    this._particles.render(ctx);
  }

  dispose() {
    this._disposed = true;
    for (const tid of this._timeouts) clearTimeout(tid);
    this._timeouts = [];
    if (this._onKeyDown) {
      window.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
    if (this._onKeyUp) {
      window.removeEventListener('keyup', this._onKeyUp);
      this._onKeyUp = null;
    }
    this._gc?.dispose();
    this._input?.dispose();
    this._hud?.dispose();
    super.dispose();
  }
}

// Register
register({
  id: 'shield-sprint',
  name: 'Shield Sprint',
  displayName: 'Shield Sprint',
  description: 'Duck under unhelpful thoughts and jump to collect helpful ones!',
  skillTags: ['self-talk', 'cognitive-reframing', 'resilience'],
  defaultConfig: {},
  factory: (ctx) => new ShieldSprint(ctx),
});

export default ShieldSprint;
