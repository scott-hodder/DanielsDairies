/**
 * Coping Workshop — Build a cozy den by collecting materials.
 *
 * Daniel walks around the woods to pick up building materials.
 * Each round, 3 materials are scattered on the ground — one is a helpful
 * coping tool, the others are unhelpful. Walk Daniel to a material to
 * pick it up, then walk him to the den to place it. Correct materials
 * build the den; wrong ones crumble and cost a life.
 * 4 rounds, 3 lives.
 *
 * SEL skill: coping strategies, emotional regulation.
 */
import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { GameCanvas, InputManager, ParticleEmitter, HUD, TweenManager, showIntroScreen } from '../../engine/index.js';
import DanielPlayer from '../../engine/DanielPlayer.js';

const ROUNDS = [
  {
    piece: 'Walls',
    situation: 'Daniel feels worried — what helps?',
    correct: { name: 'Take slow breaths', icon: 'logs', color: '#8B6914' },
    decoys: [
      { name: 'Hide forever', icon: 'rocks', color: '#888' },
      { name: 'Get angry', icon: 'thorns', color: '#c0392b' },
    ],
  },
  {
    piece: 'Roof',
    situation: 'Daniel feels sad — what helps?',
    correct: { name: 'Talk to someone', icon: 'thatch', color: '#5C4033' },
    decoys: [
      { name: 'Keep it inside', icon: 'rocks', color: '#888' },
      { name: 'Blame others', icon: 'thorns', color: '#c0392b' },
    ],
  },
  {
    piece: 'Door',
    situation: 'Daniel feels frustrated — what helps?',
    correct: { name: 'Try one small step', icon: 'planks', color: '#A0724A' },
    decoys: [
      { name: 'Give up and run', icon: 'rocks', color: '#888' },
      { name: 'Yell at someone', icon: 'thorns', color: '#c0392b' },
    ],
  },
  {
    piece: 'Cozy items',
    situation: 'Daniel feels left out — what helps?',
    correct: { name: 'Ask to join in', icon: 'blanket', color: '#E57373' },
    decoys: [
      { name: 'Sit alone and cry', icon: 'rocks', color: '#888' },
      { name: 'Be mean to others', icon: 'thorns', color: '#c0392b' },
    ],
  },
];

class CopingCave extends IMiniGame {
  mount() {
    const c = this.ctx.container;
    c.innerHTML = '';
    c.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:#5a8a40;';

    this._disposed = false;
    this._timeouts = [];

    this._gc = new GameCanvas(c);
    this._input = new InputManager(this._gc.canvas);
    this._particles = new ParticleEmitter();
    this._tweens = new TweenManager();
    this._hud = new HUD(c);

    const w = this._gc.width;
    const h = this._gc.height;

    // Ground line
    this._groundY = h * 0.68;

    // Daniel — starts left of center
    this._danielPlayer = new DanielPlayer({ x: w * 0.3, y: this._groundY - 32, size: 32, facing: 'right' });
    this._animTime = 0;

    // Den position (right side of screen)
    this._denX = w * 0.7;
    this._denY = h * 0.28;
    this._denW = w * 0.25;
    this._denH = h * 0.4;

    // Game state
    this._currentRound = 0;
    this._lives = 3;
    this._maxLives = 3;
    this._phase = 'playing'; // playing | carrying | ending
    this._builtPieces = 0;

    // Materials on the ground
    this._materials = []; // [{x, y, name, icon, color, correct, pickedUp}]
    this._carrying = null; // the material Daniel is carrying

    // Tap-to-move target (2D)
    this._moveTargetX = null;
    this._moveTargetY = null;

    // Feedback overlay
    this._feedbackText = '';
    this._feedbackColor = '#fff';
    this._feedbackTimer = 0;

    this._hud.setLives(this._lives, this._maxLives);
    this._hud.setObjective('Build a cozy den!');
    this._hud.setScore(`Den: 0/${ROUNDS.length} pieces`);
  }

  async start() {
    await showIntroScreen(this.ctx.container, {
      title: 'Coping Workshop',
      story: "Daniel wants to build a cozy den in the woods! Walk him to pick up the right coping tools, then bring them to the den to build it.",
      controls: 'Arrow keys / WASD to walk, or click to move',
      mobileControls: 'Tap to walk Daniel',
      goal: 'Build all 4 pieces by collecting helpful coping tools!',
    });
    this._gc.run(
      (dt) => this._update(dt),
      (ctx) => this._render(ctx),
    );
    this._spawnMaterials();
  }

  _spawnMaterials() {
    if (this._disposed || this._currentRound >= ROUNDS.length) {
      if (this._currentRound >= ROUNDS.length) this._onWin();
      return;
    }

    const round = ROUNDS[this._currentRound];
    const w = this._gc.width;

    const allOpts = [
      { ...round.correct, correct: true },
      ...round.decoys.map(d => ({ ...d, correct: false })),
    ].sort(() => Math.random() - 0.5);

    const h = this._gc.height;
    // Scatter materials across the left/center area in 2D
    // X: spread across left 60% of screen, Y: spread across the walkable ground area
    const positions = [
      { x: w * 0.08 + Math.random() * w * 0.12, y: h * 0.45 + Math.random() * h * 0.12 },
      { x: w * 0.28 + Math.random() * w * 0.1,  y: h * 0.62 + Math.random() * h * 0.1 },
      { x: w * 0.48 + Math.random() * w * 0.08, y: h * 0.5  + Math.random() * h * 0.15 },
    ];
    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    this._materials = allOpts.map((opt, i) => ({
      x: positions[i].x,
      y: positions[i].y,
      name: opt.name,
      icon: opt.icon,
      color: opt.color,
      correct: opt.correct,
      pickedUp: false,
    }));

    this._carrying = null;
    this._phase = 'playing';

    this._feedbackText = round.situation;
    this._feedbackColor = '#fff';
    this._feedbackTimer = 99999;
  }

  _update(dt) {
    if (this._disposed) return;
    this._animTime += dt;
    this._tweens.update(dt);
    this._particles.update(dt);
    this._danielPlayer.update(dt);

    if (this._feedbackTimer > 0 && this._feedbackTimer < 99999) {
      this._feedbackTimer -= dt;
    }

    if (this._phase === 'ending') return;

    const w = this._gc.width;
    const h = this._gc.height;
    const dir = this._input.direction;
    let moveX = 0;
    let moveY = 0;

    // Keyboard movement (2D)
    if (dir.x !== 0 || dir.y !== 0) {
      moveX = dir.x;
      moveY = dir.y;
      this._moveTargetX = null;
      this._moveTargetY = null;
    }

    // Tap-to-move (2D)
    if (this._input.touch.active && !this._input.keys.left && !this._input.keys.right
        && !this._input.keys.up && !this._input.keys.down) {
      this._moveTargetX = this._input.touch.x;
      this._moveTargetY = this._input.touch.y;
    }

    // Move towards tap target (2D)
    if (this._moveTargetX !== null && moveX === 0 && moveY === 0) {
      const dcx = this._danielPlayer.x + this._danielPlayer.w / 2;
      const dcy = this._danielPlayer.y + this._danielPlayer.h / 2;
      const tdx = this._moveTargetX - dcx;
      const tdy = this._moveTargetY - dcy;
      const dist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (dist > 5) {
        moveX = tdx / dist;
        moveY = tdy / dist;
      } else {
        this._moveTargetX = null;
        this._moveTargetY = null;
      }
    }

    // Apply movement (2D)
    const isMoving = moveX !== 0 || moveY !== 0;
    if (isMoving) {
      const speed = 120;
      // Normalize diagonal movement
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      const nx = moveX / len;
      const ny = moveY / len;
      this._danielPlayer.x += nx * speed * dt;
      this._danielPlayer.y += ny * speed * dt;
      // Clamp to walkable area
      this._danielPlayer.x = Math.max(5, Math.min(w - this._danielPlayer.w - 5, this._danielPlayer.x));
      this._danielPlayer.y = Math.max(h * 0.35, Math.min(h * 0.78 - this._danielPlayer.h, this._danielPlayer.y));
      if (moveX !== 0) this._danielPlayer.facing = moveX > 0 ? 'right' : 'left';
      this._danielPlayer._state = 'walking';
    } else if (this._danielPlayer._state === 'walking') {
      this._danielPlayer._state = 'idle';
    }

    const danielCX = this._danielPlayer.x + this._danielPlayer.w / 2;
    const danielCY = this._danielPlayer.y + this._danielPlayer.h / 2;
    const pickupRange = 28;

    if (this._phase === 'playing' && !this._carrying) {
      // Check 2D distance to materials
      for (const mat of this._materials) {
        if (mat.pickedUp) continue;
        const dx = mat.x - danielCX;
        const dy = mat.y - danielCY;
        if (Math.sqrt(dx * dx + dy * dy) < pickupRange) {
          mat.pickedUp = true;
          this._carrying = mat;
          this._phase = 'carrying';
          this.ctx.audio.play('collect');
          this._hud.setObjective(`Bring "${mat.name}" to the den!`);
          this._feedbackText = `Carrying: ${mat.name}`;
          this._feedbackColor = '#FFD700';
          this._feedbackTimer = 99999;
          break;
        }
      }
    } else if (this._phase === 'carrying' && this._carrying) {
      // Check 2D distance to den center
      const denCX = this._denX + this._denW / 2;
      const denCY = this._denY + this._denH / 2;
      const dx = danielCX - denCX;
      const dy = danielCY - denCY;
      if (Math.sqrt(dx * dx + dy * dy) < this._denW * 0.6) {
        const mat = this._carrying;
        this._carrying = null;

        if (mat.correct) {
          this._onCorrectPlace(mat);
        } else {
          this._onWrongPlace(mat);
        }
      }
    }

    this._input.endFrame();
  }

  _onCorrectPlace(mat) {
    this._builtPieces++;
    this._currentRound++;
    this._hud.setScore(`Den: ${this._builtPieces}/${ROUNDS.length} pieces`);
    this._hud.flash(`${ROUNDS[this._currentRound - 1].piece} added!`, '#4CAF50');
    this.ctx.audio.play('collect');

    this._particles.emit({
      x: this._denX + this._denW / 2, y: this._denY + this._denH / 2, count: 14,
      color: '#FFD700', spread: 50, life: 0.7, shape: 'star',
    });
    this._danielPlayer.celebrate(1.5);

    this._feedbackText = mat.name + '!';
    this._feedbackColor = '#4CAF50';
    this._feedbackTimer = 1.5;

    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._spawnMaterials();
    }, 1500);
    this._timeouts.push(tid);
  }

  _onWrongPlace(mat) {
    this._lives--;
    this._hud.setLives(this._lives, this._maxLives);
    this._hud.flash("That won't help — try another!", '#EF4444');
    this._gc.shake(4, 200);
    this.ctx.audio.play('hit');

    this._particles.emit({
      x: this._denX + this._denW / 2, y: this._denY + this._denH / 2, count: 6,
      color: '#999', spread: 30, life: 0.4,
    });

    this._feedbackText = mat.name + " doesn't help";
    this._feedbackColor = '#EF4444';
    this._feedbackTimer = 1.5;

    if (this._lives <= 0) {
      this._onLose();
      return;
    }

    // Go back to picking — remaining materials still available
    this._phase = 'playing';
    this._hud.setObjective('Pick another material!');
  }

  _onWin() {
    this._phase = 'ending';
    this._materials = [];
    this._hud.flash('The den is cozy and warm!', '#4CAF50');
    this._danielPlayer.celebrate(2);
    this._particles.emit({
      x: this._gc.width / 2, y: this._gc.height / 2, count: 25,
      color: '#FFD700', spread: 120, life: 1.2, shape: 'star',
    });
    this._feedbackText = '';
    const score = Math.min(1, (this._lives / this._maxLives) * 0.4 + 0.6);
    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._complete({ score, skillTags: ['coping-strategies', 'emotional-regulation'] });
    }, 1800);
    this._timeouts.push(tid);
  }

  _onLose() {
    this._phase = 'ending';
    this._materials = [];
    this._hud.flash('Keep trying — you can learn to cope!', '#EF4444');
    this._feedbackText = '';
    const tid = setTimeout(() => {
      if (this._disposed) return;
      this._fail({ score: this._builtPieces / ROUNDS.length * 0.4, skillTags: ['coping-strategies'] });
    }, 900);
    this._timeouts.push(tid);
  }

  _render(ctx) {
    const w = this._gc.width;
    const h = this._gc.height;
    const t = this._animTime;
    this._gc.clear();

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(1, '#B0E0FF');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.4);

    // Sun
    ctx.save();
    ctx.fillStyle = '#FFE135';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(w * 0.15, h * 0.08, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ground
    const groundGrad = ctx.createLinearGradient(0, h * 0.35, 0, h);
    groundGrad.addColorStop(0, '#5da84a');
    groundGrad.addColorStop(1, '#4a8a38');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.35, w, h * 0.65);

    // Background trees
    const treePositions = [
      { x: w * 0.05, s: 1.2 }, { x: w * 0.15, s: 0.8 },
      { x: w * 0.88, s: 1.0 }, { x: w * 0.95, s: 0.7 },
    ];
    for (const tp of treePositions) {
      const treeH = 80 * tp.s;
      const groundLine = h * 0.38;
      ctx.fillStyle = '#6B4226';
      ctx.fillRect(tp.x - 3, groundLine - treeH * 0.4, 6, treeH * 0.5);
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath();
      ctx.moveTo(tp.x - 18 * tp.s, groundLine - treeH * 0.35);
      ctx.lineTo(tp.x, groundLine - treeH);
      ctx.lineTo(tp.x + 18 * tp.s, groundLine - treeH * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.moveTo(tp.x - 22 * tp.s, groundLine - treeH * 0.15);
      ctx.lineTo(tp.x, groundLine - treeH * 0.65);
      ctx.lineTo(tp.x + 22 * tp.s, groundLine - treeH * 0.15);
      ctx.closePath();
      ctx.fill();
    }

    // Draw den
    this._drawDen(ctx, t);

    // Den build zone indicator
    if (this._phase === 'carrying' && this._builtPieces < ROUNDS.length) {
      const pulse = 0.3 + Math.sin(t * 3) * 0.15;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 215, 0, ${pulse + 0.3})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(this._denX - 4, this._denY - 4, this._denW + 8, this._denH + 8);
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255, 255, 255, ${pulse + 0.3})`;
      ctx.font = 'bold 11px "League Spartan", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Bring it here!', this._denX + this._denW / 2, this._denY - 10);
      ctx.restore();
    }

    // Materials on the ground
    for (const mat of this._materials) {
      if (mat.pickedUp) continue;
      this._drawGroundMaterial(ctx, mat);
    }

    // Daniel
    this._danielPlayer.render(ctx);

    // Draw carried material above Daniel's head
    if (this._carrying) {
      this._drawCarriedMaterial(ctx);
    }

    // Small grass tufts
    ctx.fillStyle = '#4CAF50';
    for (let gx = 10; gx < w; gx += 30 + Math.sin(gx) * 10) {
      ctx.beginPath();
      ctx.moveTo(gx, h * 0.82);
      ctx.lineTo(gx - 3, h * 0.82 - 8);
      ctx.lineTo(gx + 1, h * 0.82 - 5);
      ctx.lineTo(gx + 4, h * 0.82 - 10);
      ctx.lineTo(gx + 6, h * 0.82);
      ctx.closePath();
      ctx.fill();
    }

    // Situation / feedback banner
    if (this._feedbackText && this._feedbackTimer > 0) {
      ctx.save();
      const alpha = this._feedbackTimer < 1 ? this._feedbackTimer : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.font = 'bold 13px "League Spartan", sans-serif';
      const tw = ctx.measureText(this._feedbackText).width;
      const bw = Math.max(tw + 30, 180);
      ctx.beginPath();
      ctx.roundRect((w - bw) / 2, h * 0.02, bw, 32, 14);
      ctx.fill();
      ctx.fillStyle = this._feedbackColor;
      ctx.textAlign = 'center';
      ctx.fillText(this._feedbackText, w / 2, h * 0.02 + 21);
      ctx.restore();
    }

    // Particles
    this._particles.render(ctx);
  }

  _drawGroundMaterial(ctx, mat) {
    const x = mat.x;
    const y = mat.y;

    ctx.save();

    // Glow/highlight circle underneath
    const pulse = 0.35 + Math.sin(this._animTime * 2.5 + x) * 0.15;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = mat.correct ? '#FFD700' : '#fff';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Icon
    this._drawMaterialIcon(ctx, mat.icon, x, y - 8, mat.color);

    // Label below
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px "League Spartan", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeText(mat.name, x, y + 18);
    ctx.fillText(mat.name, x, y + 18);

    ctx.restore();
  }

  _drawCarriedMaterial(ctx) {
    const mat = this._carrying;
    const dx = this._danielPlayer.x + this._danielPlayer.w / 2;
    const dy = this._danielPlayer.y - 14;

    ctx.save();
    // Small bounce
    const bob = Math.sin(this._animTime * 5) * 2;

    this._drawMaterialIcon(ctx, mat.icon, dx, dy + bob, mat.color);

    ctx.restore();
  }

  _drawMaterialIcon(ctx, icon, cx, cy, color) {
    ctx.save();
    switch (icon) {
      case 'logs':
        ctx.fillStyle = '#D4A055';
        for (let i = -1; i <= 1; i++) {
          ctx.fillRect(cx - 10 + i * 3, cy - 4 + i * 2, 20, 4);
          ctx.strokeStyle = '#8B6914';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(cx - 10 + i * 3, cy - 4 + i * 2, 20, 4);
        }
        break;
      case 'thatch':
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 1.5;
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * 3, cy + 5);
          ctx.lineTo(cx + i * 2, cy - 6);
          ctx.stroke();
        }
        break;
      case 'planks':
        ctx.fillStyle = '#C4935A';
        ctx.fillRect(cx - 10, cy - 4, 20, 5);
        ctx.fillRect(cx - 8, cy + 2, 16, 4);
        ctx.strokeStyle = '#6B4226';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - 10, cy - 4, 20, 5);
        ctx.strokeRect(cx - 8, cy + 2, 16, 4);
        break;
      case 'blanket':
        ctx.fillStyle = '#E57373';
        ctx.beginPath();
        ctx.roundRect(cx - 10, cy - 4, 20, 10, 3);
        ctx.fill();
        ctx.fillStyle = '#EF9A9A';
        ctx.fillRect(cx - 7, cy - 2, 4, 3);
        ctx.fillRect(cx + 2, cy, 4, 3);
        break;
      case 'rocks':
        ctx.fillStyle = '#999';
        ctx.beginPath();
        ctx.arc(cx - 4, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 4, cy - 1, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy + 3, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'thorns':
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * 5, cy + 4);
          ctx.lineTo(cx + i * 5 + 2, cy - 5);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + i * 5 + 1, cy - 1);
          ctx.lineTo(cx + i * 5 + 4, cy - 3);
          ctx.stroke();
        }
        break;
    }
    ctx.restore();
  }

  _drawDen(ctx, t) {
    const dx = this._denX;
    const dy = this._denY;
    const dw = this._denW;
    const dh = this._denH;
    const pieces = this._builtPieces;

    // Ground clearing
    ctx.fillStyle = '#7B6A4E';
    ctx.beginPath();
    ctx.ellipse(dx + dw / 2, dy + dh, dw * 0.6, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    if (pieces === 0) {
      ctx.strokeStyle = '#6B4226';
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const sx = dx + 10 + i * dw * 0.2;
        ctx.beginPath();
        ctx.moveTo(sx, dy + dh);
        ctx.lineTo(sx + (Math.sin(i * 7) * 8), dy + dh - 8 - Math.abs(Math.sin(i * 3)) * 10);
        ctx.stroke();
      }
      return;
    }

    if (pieces >= 1) {
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(dx + 5, dy + dh * 0.3, dw - 10, dh * 0.7);
      ctx.strokeStyle = '#6B4226';
      ctx.lineWidth = 1;
      for (let ly = dy + dh * 0.35; ly < dy + dh; ly += 8) {
        ctx.beginPath();
        ctx.moveTo(dx + 8, ly);
        ctx.lineTo(dx + dw - 8, ly);
        ctx.stroke();
      }
      ctx.fillStyle = '#7A5C12';
      ctx.fillRect(dx, dy + dh * 0.35, 8, dh * 0.65);
      ctx.fillRect(dx + dw - 8, dy + dh * 0.35, 8, dh * 0.65);
    }

    if (pieces >= 2) {
      ctx.fillStyle = '#5C4033';
      ctx.beginPath();
      ctx.moveTo(dx - 8, dy + dh * 0.35);
      ctx.lineTo(dx + dw / 2, dy - 5);
      ctx.lineTo(dx + dw + 8, dy + dh * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8B7355';
      ctx.lineWidth = 1;
      for (let ry = dy + dh * 0.1; ry < dy + dh * 0.35; ry += 6) {
        const leftX = dx + (dw / 2) - (dw / 2 + 8) * ((ry - dy + 5) / (dh * 0.4));
        const rightX = dx + (dw / 2) + (dw / 2 + 8) * ((ry - dy + 5) / (dh * 0.4));
        ctx.beginPath();
        ctx.moveTo(leftX, ry);
        ctx.lineTo(rightX, ry);
        ctx.stroke();
      }
    }

    if (pieces >= 3) {
      const doorW = dw * 0.28;
      const doorH = dh * 0.45;
      const doorX = dx + dw * 0.36;
      const doorY = dy + dh - doorH;
      ctx.fillStyle = '#A0724A';
      ctx.beginPath();
      ctx.roundRect(doorX, doorY, doorW, doorH, [8, 8, 0, 0]);
      ctx.fill();
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(doorX + doorW * 0.75, doorY + doorH * 0.5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6B4226';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(doorX, doorY, doorW, doorH, [8, 8, 0, 0]);
      ctx.stroke();

      const winX = dx + dw * 0.7;
      const winY = dy + dh * 0.45;
      const winS = dw * 0.16;
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(winX, winY, winS, winS);
      ctx.strokeStyle = '#6B4226';
      ctx.lineWidth = 2;
      ctx.strokeRect(winX, winY, winS, winS);
      ctx.beginPath();
      ctx.moveTo(winX + winS / 2, winY);
      ctx.lineTo(winX + winS / 2, winY + winS);
      ctx.moveTo(winX, winY + winS / 2);
      ctx.lineTo(winX + winS, winY + winS / 2);
      ctx.stroke();
    }

    if (pieces >= 4) {
      ctx.save();
      const doorCX = dx + dw * 0.5;
      const doorCY = dy + dh * 0.8;
      const glowGrad = ctx.createRadialGradient(doorCX, doorCY, 0, doorCX, doorCY, dw * 0.5);
      glowGrad.addColorStop(0, 'rgba(255,180,50,0.35)');
      glowGrad.addColorStop(0.5, 'rgba(255,150,30,0.15)');
      glowGrad.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(doorCX, doorCY, dw * 0.5, 0, Math.PI * 2);
      ctx.fill();

      const winX = dx + dw * 0.7;
      const winY = dy + dh * 0.45;
      const winS = dw * 0.16;
      ctx.fillStyle = 'rgba(255,200,80,0.6)';
      ctx.fillRect(winX + 2, winY + 2, winS - 4, winS - 4);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#D0D0D0';
      for (let s = 0; s < 3; s++) {
        const smokeX = dx + dw * 0.55 + Math.sin(t * 1.5 + s * 2) * 8;
        const smokeY = dy - 15 - s * 14 - Math.sin(t * 2 + s) * 5;
        const smokeR = 5 + s * 3 + Math.sin(t * 3 + s) * 2;
        ctx.beginPath();
        ctx.arc(smokeX, smokeY, smokeR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const doorW2 = dw * 0.28;
      const doorX2 = dx + dw * 0.36;
      const doorY2 = dy + dh * 0.75;
      ctx.fillStyle = '#E57373';
      ctx.beginPath();
      ctx.ellipse(doorX2 + doorW2 / 2, doorY2 + 8, doorW2 * 0.35, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EF9A9A';
      ctx.fillRect(doorX2 + doorW2 * 0.25, doorY2 + 4, 4, 4);
      ctx.fillRect(doorX2 + doorW2 * 0.5, doorY2 + 6, 4, 4);
    }
  }

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
  id: 'coping-cave',
  name: 'Coping Cave',
  displayName: 'Coping Workshop',
  description: 'Build a cozy den by collecting the right coping tools!',
  skillTags: ['coping-strategies', 'emotional-regulation'],
  defaultConfig: {},
  factory: (ctx) => new CopingCave(ctx),
});

export default CopingCave;
