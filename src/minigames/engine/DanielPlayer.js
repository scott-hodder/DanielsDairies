/**
 * DanielPlayer — Fully canvas-drawn animated dog character for all games.
 *
 * Draws a friendly cartoon dog (golden yellow with cream belly, floppy ears, wagging tail).
 * No image dependencies — pure canvas rendering with rich animation states.
 * Provides consistent character across all 10 roadblock games.
 */

const DANIEL_IMAGES = {
  main: '/images/characters/DanielTheDog.webp',
  celebrating: '/images/characters/Daniel_Celebrating.webp',
  thinking: '/images/characters/Daniel_Thinking.webp',
  thumbsUp: '/images/characters/DanielTheDogThumbsUp.webp',
  building: '/images/characters/Daniel_Building.webp',
};

// Body colours — golden/yellow to match Daniel the Dog's approved design
const FUR       = '#F0C040';   // bright golden yellow
const FUR_DARK  = '#D4A020';   // darker golden (ears, tail tip, shading)
const BELLY     = '#FFF8E1';   // warm cream belly
const NOSE      = '#2C1810';
const EYE_WHITE = '#FFFFFF';
const EYE_PUPIL = '#2C1810';
const TONGUE    = '#E8888A';
const COLLAR    = '#14b8a6'; // teal — matches app brand

export default class DanielPlayer {
  constructor(opts = {}) {
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.size = opts.size ?? 48;
    this.w = this.size;
    this.h = this.size;
    this.facing = opts.facing ?? 'right';

    // Physics
    this.vx = 0;
    this.vy = 0;
    this.speed = opts.speed ?? 100;
    this.grounded = true;

    // Animation state
    this._state = 'idle';
    this._animTime = 0;
    this._hurtTimer = 0;
    this._hurtDuration = 0.4;
    this._celebrateTimer = 0;
    this._shieldTimer = 0;
    this._shielded = false;
    this._invulnTimer = 0;

    // Walk cycle phase
    this._walkPhase = 0;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get invulnerable() { return this._hurtTimer > 0 || this._invulnTimer > 0; }
  get shielded() { return this._shielded; }

  // ── State Methods ──────────────────────────────────────────────

  hurt() {
    if (this.invulnerable) return false;
    this._hurtTimer = this._hurtDuration;
    this._state = 'hurt';
    return true;
  }

  activateShield(duration = 1) {
    this._shielded = true;
    this._shieldTimer = duration;
    this._state = 'shielded';
  }

  setInvulnerable(duration = 1.5) {
    this._invulnTimer = duration;
  }

  celebrate(duration = 1.5) {
    this._celebrateTimer = duration;
    this._state = 'celebrating';
  }

  reset() {
    this._state = 'idle';
    this._hurtTimer = 0;
    this._shieldTimer = 0;
    this._shielded = false;
    this._celebrateTimer = 0;
    this._invulnTimer = 0;
    this.vx = 0;
    this.vy = 0;
  }

  // ── Update ──────────────────────────────────────────────────────

  update(dt) {
    this._animTime += dt;

    if (this._state === 'walking') {
      this._walkPhase += dt * 10;
    }

    if (this._hurtTimer > 0) {
      this._hurtTimer -= dt;
      if (this._hurtTimer <= 0) this._state = 'idle';
    }
    if (this._invulnTimer > 0) {
      this._invulnTimer -= dt;
    }
    if (this._shieldTimer > 0) {
      this._shieldTimer -= dt;
      if (this._shieldTimer <= 0) {
        this._shielded = false;
        if (this._state === 'shielded') this._state = 'idle';
      }
    }
    if (this._celebrateTimer > 0) {
      this._celebrateTimer -= dt;
      if (this._celebrateTimer <= 0) this._state = 'idle';
    }
  }

  // ── Render ──────────────────────────────────────────────────────

  render(ctx, camera) {
    const sx = this.x - (camera?.x ?? 0);
    const sy = this.y - (camera?.y ?? 0);

    // Hurt flash
    if (this._hurtTimer > 0 && Math.floor(this._hurtTimer * 10) % 2 === 0) return;

    // Invuln shimmer
    const wasAlpha = ctx.globalAlpha;
    if (this._invulnTimer > 0 && Math.floor(this._invulnTimer * 8) % 3 === 0) {
      ctx.globalAlpha = 0.5;
    }

    ctx.save();
    const cx = sx + this.w / 2;
    const cy = sy + this.h / 2;
    const s = this.size / 48; // scale factor relative to reference size 48

    ctx.translate(cx, cy);
    if (this.facing === 'left') ctx.scale(-1, 1);

    // Animation transforms
    let bobY = 0, rot = 0, scX = 1, scY = 1;
    const t = this._animTime;

    switch (this._state) {
      case 'idle':
        bobY = Math.sin(t * 2.5) * 2 * s;
        break;
      case 'walking':
        bobY = Math.abs(Math.sin(this._walkPhase)) * 3 * s;
        break;
      case 'jumping':
        rot = -0.15;
        break;
      case 'hurt':
        rot = Math.sin(t * 20) * 0.2;
        scX = 0.9;
        break;
      case 'celebrating':
        bobY = -Math.abs(Math.sin(t * 6)) * 6 * s;
        scX = 1 + Math.sin(t * 4) * 0.08;
        scY = 1 + Math.sin(t * 4) * 0.08;
        break;
      case 'shielded':
        bobY = Math.sin(t * 3) * 1.5 * s;
        break;
    }

    ctx.rotate(rot);
    ctx.scale(scX, scY);
    ctx.translate(0, bobY);

    // Shield glow
    if (this._shielded) {
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(t * 6) * 0.1;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, 0, 28 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this._drawDog(ctx, s, t);

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(0, 20 * s, 14 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = wasAlpha;
  }

  _drawDog(ctx, s, t) {
    const walk = this._state === 'walking' ? this._walkPhase : 0;
    const celebrating = this._state === 'celebrating';

    // ── Tail (behind body) ──
    ctx.save();
    const tailWag = celebrating
      ? Math.sin(t * 12) * 0.6
      : Math.sin(t * 4) * 0.3;
    ctx.translate(-12 * s, -2 * s);
    ctx.rotate(-0.5 + tailWag);
    ctx.fillStyle = FUR;
    ctx.beginPath();
    ctx.ellipse(0, -8 * s, 4 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = FUR_DARK;
    ctx.beginPath();
    ctx.arc(0, -16 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Back legs ──
    const legSwing = this._state === 'walking' ? Math.sin(walk) * 6 * s : 0;
    ctx.fillStyle = FUR_DARK;
    // Left back leg
    ctx.save();
    ctx.translate(-6 * s, 14 * s);
    ctx.fillRect(-3 * s, legSwing, 6 * s, 8 * s);
    ctx.fillStyle = BELLY;
    ctx.fillRect(-2 * s, legSwing + 6 * s, 5 * s, 3 * s); // paw
    ctx.restore();

    // ── Body ──
    ctx.fillStyle = FUR;
    ctx.beginPath();
    ctx.ellipse(0, 2 * s, 16 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = BELLY;
    ctx.beginPath();
    ctx.ellipse(4 * s, 6 * s, 10 * s, 9 * s, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Collar
    ctx.strokeStyle = COLLAR;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(4 * s, -6 * s, 10 * s, 0.3, Math.PI - 0.3);
    ctx.stroke();
    // Collar tag
    ctx.fillStyle = '#f6b700';
    ctx.beginPath();
    ctx.arc(4 * s, 4 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();

    // ── Front legs ──
    const frontSwing = this._state === 'walking' ? Math.sin(walk + Math.PI) * 6 * s : 0;
    ctx.fillStyle = FUR;
    // Right front leg
    ctx.save();
    ctx.translate(8 * s, 12 * s);
    ctx.fillRect(-3 * s, frontSwing, 6 * s, 10 * s);
    ctx.fillStyle = BELLY;
    ctx.fillRect(-2.5 * s, frontSwing + 7.5 * s, 5 * s, 3 * s); // paw
    ctx.restore();

    // ── Head ──
    ctx.save();
    const headBob = celebrating ? Math.sin(t * 8) * 2 * s : 0;
    ctx.translate(12 * s, -10 * s + headBob);

    // Head shape
    ctx.fillStyle = FUR;
    ctx.beginPath();
    ctx.arc(0, 0, 12 * s, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle
    ctx.fillStyle = BELLY;
    ctx.beginPath();
    ctx.ellipse(8 * s, 3 * s, 7 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    const earFlop = Math.sin(t * 3) * 0.1;
    // Left ear (behind head)
    ctx.save();
    ctx.translate(-7 * s, -8 * s);
    ctx.rotate(-0.4 + earFlop);
    ctx.fillStyle = FUR_DARK;
    ctx.beginPath();
    ctx.ellipse(0, -4 * s, 5 * s, 8 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Right ear
    ctx.save();
    ctx.translate(3 * s, -10 * s);
    ctx.rotate(0.3 - earFlop);
    ctx.fillStyle = FUR_DARK;
    ctx.beginPath();
    ctx.ellipse(0, -4 * s, 5 * s, 8 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eyes
    const blink = Math.sin(t * 0.7) > 0.97;
    // Left eye
    ctx.fillStyle = EYE_WHITE;
    ctx.beginPath();
    ctx.ellipse(-3 * s, -2 * s, 4 * s, blink ? 0.5 * s : 3.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!blink) {
      ctx.fillStyle = EYE_PUPIL;
      ctx.beginPath();
      ctx.arc(-2 * s, -1.5 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(-1 * s, -2.5 * s, 0.8 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // Right eye
    ctx.fillStyle = EYE_WHITE;
    ctx.beginPath();
    ctx.ellipse(6 * s, -3 * s, 3.5 * s, blink ? 0.5 * s : 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!blink) {
      ctx.fillStyle = EYE_PUPIL;
      ctx.beginPath();
      ctx.arc(7 * s, -2.5 * s, 1.8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(7.5 * s, -3.5 * s, 0.7 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyebrows (expressive)
    ctx.strokeStyle = FUR_DARK;
    ctx.lineWidth = 1.5 * s;
    if (this._state === 'hurt') {
      // Worried brows
      ctx.beginPath();
      ctx.moveTo(-6 * s, -6 * s); ctx.lineTo(-1 * s, -7 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4 * s, -7 * s); ctx.lineTo(9 * s, -6 * s);
      ctx.stroke();
    } else if (celebrating) {
      // Happy raised brows
      ctx.beginPath();
      ctx.moveTo(-6 * s, -7 * s); ctx.lineTo(-1 * s, -6 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4 * s, -6 * s); ctx.lineTo(9 * s, -7 * s);
      ctx.stroke();
    }

    // Nose
    ctx.fillStyle = NOSE;
    ctx.beginPath();
    ctx.ellipse(13 * s, 1 * s, 3 * s, 2.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = FUR_DARK;
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(13 * s, 3.5 * s);
    ctx.quadraticCurveTo(10 * s, 7 * s, 6 * s, 5 * s);
    ctx.stroke();

    // Tongue (on celebrating or idle)
    if (celebrating || (this._state === 'idle' && Math.sin(t * 1.5) > 0.3)) {
      ctx.fillStyle = TONGUE;
      ctx.beginPath();
      ctx.ellipse(11 * s, 6 * s + Math.sin(t * 3) * s, 2.5 * s, 4 * s, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // head transform

    // ── Celebrate sparkles ──
    if (celebrating) {
      for (let i = 0; i < 3; i++) {
        const angle = t * 3 + i * 2.1;
        const dist = 20 * s + Math.sin(t * 5 + i) * 5 * s;
        const sx2 = Math.cos(angle) * dist;
        const sy2 = Math.sin(angle) * dist - 8 * s;
        ctx.fillStyle = i === 0 ? '#FFD700' : i === 1 ? '#14b8a6' : '#FF6B6B';
        ctx.beginPath();
        ctx.arc(sx2, sy2, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export { DANIEL_IMAGES };
