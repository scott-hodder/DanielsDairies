/**
 * Playable Daniel the Dog sprite — procedurally drawn (no image assets).
 * States: idle, walk, jump, swim, hurt.
 * Drawn as a cute cartoon dog: round head, oval body, floppy ears, dot eyes, wagging tail.
 */
import Sprite from '../engine/Sprite.js';

const COLORS = {
  body: '#D4A574',      // warm tan
  bodyDark: '#C4956A',  // shadow
  belly: '#F5E6D3',     // light belly
  nose: '#3D2B1F',      // dark brown
  eye: '#2D1B0E',       // near black
  eyeWhite: '#FFFFFF',
  tongue: '#FF8B8B',
  collar: '#6366F1',    // indigo (matches app brand)
  collarTag: '#FFD700',
};

export default class Daniel extends Sprite {
  constructor(opts = {}) {
    super({
      w: opts.size || 40,
      h: opts.size || 44,
      ...opts,
    });
    this.state = 'idle';     // idle | walk | jump | swim | hurt
    this.facing = 1;         // 1 = right, -1 = left
    this._animTime = 0;
    this._hurtTimer = 0;
    this.grounded = true;
    this.speed = opts.speed || 120;
    this.jumpPower = opts.jumpPower || -280;
    this.gravity = opts.gravity ?? 600;
    this._tailWag = 0;

    // Shield effect (for Shield Sprint)
    this.shielded = false;
    this._shieldTimer = 0;
  }

  update(dt) {
    this._animTime += dt;
    this._tailWag += dt * 8;

    // Hurt flash timer
    if (this._hurtTimer > 0) {
      this._hurtTimer -= dt;
      if (this._hurtTimer <= 0) this.state = 'idle';
    }

    // Shield timer
    if (this._shieldTimer > 0) {
      this._shieldTimer -= dt;
      if (this._shieldTimer <= 0) this.shielded = false;
    }

    // State detection from velocity
    if (this.state !== 'hurt' && this.state !== 'swim') {
      if (!this.grounded) {
        this.state = 'jump';
      } else if (Math.abs(this.vx) > 5) {
        this.state = 'walk';
        this.facing = this.vx > 0 ? 1 : -1;
      } else {
        this.state = 'idle';
      }
    }

    super.update(dt);
  }

  hurt() {
    this.state = 'hurt';
    this._hurtTimer = 0.4;
  }

  activateShield(duration = 0.8) {
    this.shielded = true;
    this._shieldTimer = duration;
  }

  render(ctx) {
    if (!this.visible) return;
    if (this.state === 'hurt' && Math.floor(this._animTime * 10) % 2 === 0) return; // blink

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const s = this.w / 40; // scale factor

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing, 1);

    // Idle bobbing
    let bobY = 0;
    if (this.state === 'idle') {
      bobY = Math.sin(this._animTime * 3) * 2 * s;
    }
    // Walk bounce
    let walkBob = 0;
    if (this.state === 'walk') {
      walkBob = Math.abs(Math.sin(this._animTime * 10)) * 3 * s;
    }

    ctx.translate(0, bobY - walkBob);

    // Shield glow
    if (this.shielded) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(this._animTime * 8) * 0.15;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, 0, 26 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Tail
    const tailWag = Math.sin(this._tailWag) * 0.4;
    ctx.save();
    ctx.translate(-14 * s, -2 * s);
    ctx.rotate(tailWag - 0.3);
    ctx.fillStyle = COLORS.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body (oval)
    ctx.fillStyle = COLORS.body;
    ctx.beginPath();
    ctx.ellipse(0, 4 * s, 14 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = COLORS.belly;
    ctx.beginPath();
    ctx.ellipse(2 * s, 6 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    const legPhase = this.state === 'walk' ? this._animTime * 10 : 0;
    ctx.fillStyle = COLORS.body;
    // Back legs
    _drawLeg(ctx, -8 * s, 14 * s, Math.sin(legPhase) * 0.3, s);
    _drawLeg(ctx, -3 * s, 14 * s, Math.sin(legPhase + Math.PI) * 0.3, s);
    // Front legs
    _drawLeg(ctx, 5 * s, 14 * s, Math.sin(legPhase + Math.PI) * 0.3, s);
    _drawLeg(ctx, 10 * s, 14 * s, Math.sin(legPhase) * 0.3, s);

    // Head
    ctx.fillStyle = COLORS.body;
    ctx.beginPath();
    ctx.arc(8 * s, -8 * s, 11 * s, 0, Math.PI * 2);
    ctx.fill();

    // Ears (floppy)
    ctx.fillStyle = COLORS.bodyDark;
    ctx.save();
    ctx.translate(2 * s, -16 * s);
    ctx.rotate(-0.3 + Math.sin(this._animTime * 2) * 0.1);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5 * s, 8 * s, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(14 * s, -14 * s);
    ctx.rotate(0.3 + Math.sin(this._animTime * 2 + 1) * 0.1);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5 * s, 7 * s, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Snout
    ctx.fillStyle = COLORS.belly;
    ctx.beginPath();
    ctx.ellipse(13 * s, -5 * s, 6 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = COLORS.nose;
    ctx.beginPath();
    ctx.ellipse(17 * s, -7 * s, 3 * s, 2.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = COLORS.eyeWhite;
    ctx.beginPath();
    ctx.arc(6 * s, -11 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(13 * s, -10 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = COLORS.eye;
    const lookX = this.facing > 0 ? 1 : -1;
    ctx.beginPath();
    ctx.arc(6 * s + lookX * s, -11 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(13 * s + lookX * s, -10 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = COLORS.eyeWhite;
    ctx.beginPath();
    ctx.arc(5 * s, -12 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12 * s, -11 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();

    // Mouth / smile
    ctx.strokeStyle = COLORS.nose;
    ctx.lineWidth = 1.2 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(14 * s, -4 * s, 3 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Tongue (when idle/happy)
    if (this.state === 'idle' || this.shielded) {
      ctx.fillStyle = COLORS.tongue;
      ctx.beginPath();
      const tongueExt = Math.sin(this._animTime * 2) * 1.5 * s;
      ctx.ellipse(15 * s, -1 * s + tongueExt, 2 * s, (3 + tongueExt) * s, 0, 0, Math.PI);
      ctx.fill();
    }

    // Collar
    ctx.strokeStyle = COLORS.collar;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.arc(6 * s, 0, 10 * s, -0.3, Math.PI + 0.3);
    ctx.stroke();

    // Collar tag
    ctx.fillStyle = COLORS.collarTag;
    ctx.beginPath();
    ctx.arc(6 * s, 9 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function _drawLeg(ctx, x, y, angle, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = COLORS.body;
  ctx.beginPath();
  ctx.roundRect(-2.5 * s, 0, 5 * s, 10 * s, 2 * s);
  ctx.fill();
  // Paw
  ctx.fillStyle = COLORS.belly;
  ctx.beginPath();
  ctx.ellipse(0, 10 * s, 3.5 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
