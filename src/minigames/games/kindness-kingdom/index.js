/**
 * Kindness Kingdom — Top-down village quest.
 *
 * Daniel explores a small village. NPCs have problems (visible indicators).
 * Walk to an NPC → dialogue + kind/unkind choice.
 * Kind acts: flowers grow, lights appear, village happiness increases.
 * Unkind acts: weeds, broken windows, happiness drops.
 * Non-linear: 4-5 NPCs, player chooses order.
 * Village has a "happiness meter" that visually transforms the scene.
 *
 * SEL skill: empathy, prosocial behavior, kindness.
 */
import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';
import { GameCanvas, InputManager, ParticleEmitter, HUD, DialogueBox, TweenManager, showIntroScreen } from '../../engine/index.js';
import DanielPlayer from '../../engine/DanielPlayer.js';

// The villagers are Aussie animals — same bush world Daniel and the
// Super Skill characters live in, so the village feels like home.
const NPC_ENCOUNTERS = [
  {
    emoji: '🐨', name: 'Millie the Koala',
    problem: 'Millie lost her favourite toy and is crying.',
    kind: 'Help her search for it together',
    unkind: 'Tell her it was just a silly toy',
    effect: 'You found the toy behind the bench!',
  },
  {
    emoji: '🦜', name: 'Banjo the Cockatoo',
    problem: 'Banjo dropped his books in a puddle.',
    kind: 'Pick up the books and dry them off',
    unkind: 'Laugh and walk past',
    effect: 'The books are saved!',
  },
  {
    emoji: '🦘', name: 'Joey the Kangaroo',
    problem: 'Joey is sitting alone at lunch, looking lonely.',
    kind: 'Sit down and eat lunch with Joey',
    unkind: 'Ignore Joey and walk away',
    effect: 'Joey smiled so big!',
  },
  {
    emoji: '🦔', name: 'Ted the Echidna',
    problem: 'Ted is struggling to carry heavy groceries.',
    kind: 'Offer to carry some bags',
    unkind: "It's not your problem",
    effect: 'Ted made it home safe!',
  },
  {
    emoji: '🐧', name: 'Pip the Penguin',
    problem: 'Pip is nervous about her first day at school.',
    kind: 'Walk with Pip and show her around',
    unkind: 'Tell Pip school is scary',
    effect: 'Pip feels brave now!',
  },
  {
    emoji: '🦉', name: 'Olive the Owl',
    problem: "Olive accidentally broke a neighbour's flower pot.",
    kind: 'Help Olive apologise and fix the pot',
    unkind: "Tell Olive to pretend it wasn't her",
    effect: 'The neighbour forgave Olive!',
  },
];

class KindnessKingdom extends IMiniGame {
  mount() {
    this._disposed = false;
    this._timeouts = [];

    const c = this.ctx.container;
    c.innerHTML = '';
    c.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:#87CEEB;';

    this._gc = new GameCanvas(c);
    this._input = new InputManager(this._gc.canvas);
    this._particles = new ParticleEmitter();
    this._tweens = new TweenManager();
    this._hud = new HUD(c);
    this._dialogue = new DialogueBox(c);

    const diff = DIFFICULTY[this.ctx.difficulty] || DIFFICULTY.medium;
    const w = this._gc.width;
    const h = this._gc.height;

    this._worldW = w * 2.5;
    this._worldH = h * 2;
    this._camX = 0;
    this._camY = 0;

    // Daniel — replaced entirely by DanielPlayer (has .x, .y, .w, .h, .speed)
    // Start at the road intersection (center of village) so the player must explore outward
    this._danielPlayer = new DanielPlayer({
      x: this._worldW * 0.5,
      y: this._worldH * 0.5,
      size: 28,
      facing: 'right',
      speed: 90,
    });

    this._animTime = 0;
    this._phase = 'playing'; // playing | talking | ending

    // NPCs
    const shuffled = [...NPC_ENCOUNTERS].sort(() => Math.random() - 0.5);
    const npcCount = Math.round(4 * (diff.targetCountMultiplier || 1));
    // Fixed spread-out positions along the village roads so the player must explore
    const npcPositions = [
      { x: this._worldW * 0.15, y: this._worldH * 0.3 },
      { x: this._worldW * 0.85, y: this._worldH * 0.35 },
      { x: this._worldW * 0.25, y: this._worldH * 0.7 },
      { x: this._worldW * 0.75, y: this._worldH * 0.75 },
      { x: this._worldW * 0.5,  y: this._worldH * 0.15 },
      { x: this._worldW * 0.5,  y: this._worldH * 0.85 },
    ];
    this._npcs = shuffled.slice(0, Math.min(npcCount, shuffled.length)).map((enc, i) => {
      const pos = npcPositions[i % npcPositions.length];
      return {
        ...enc,
        x: pos.x + (Math.random() - 0.5) * 60,
        y: pos.y + (Math.random() - 0.5) * 60,
        w: 40, h: 40,
        helped: false,
        kindChoice: false,
      };
    });

    // Village state
    this._happiness = 0; // -1 to 1
    this._kindCount = 0;
    this._totalNpcs = this._npcs.length;
    this._interacted = 0;

    // Buildings (decoration)
    this._buildings = [
      { x: this._worldW * 0.2, y: this._worldH * 0.25, w: 60, h: 50, color: '#FFCC80' },
      { x: this._worldW * 0.5, y: this._worldH * 0.2, w: 70, h: 55, color: '#EF9A9A' },
      { x: this._worldW * 0.75, y: this._worldH * 0.3, w: 55, h: 45, color: '#90CAF9' },
      { x: this._worldW * 0.35, y: this._worldH * 0.5, w: 65, h: 50, color: '#A5D6A7' },
      { x: this._worldW * 0.65, y: this._worldH * 0.55, w: 50, h: 40, color: '#CE93D8' },
    ];

    // Flowers (grow with kindness) — capped at 100 entries
    this._flowers = [];

    this._hud.setObjective(`Help the villagers! (0/${this._totalNpcs})`);
    this._hud.setScore('Village: Neutral');
  }

  _trackTimeout(fn, delay) {
    const id = setTimeout(() => {
      fn();
    }, delay);
    this._timeouts.push(id);
    return id;
  }

  async start() {
    await showIntroScreen(this.ctx.container, {
      title: 'Kindness Kingdom',
      story: 'The village animals need help! Walk up to them and make kind choices to spread happiness.',
      controls: 'Arrow keys to move, click choices',
      mobileControls: 'Drag to move, tap choices',
      goal: 'Help all the villagers by being kind!',
    });
    this._gc.run(
      (dt) => this._update(dt),
      (ctx) => this._render(ctx),
    );
  }

  _update(dt) {
    if (this._disposed) return;
    if (this._phase === 'ending') return;
    this._animTime += dt;
    this._tweens.update(dt);
    this._particles.update(dt);

    if (this._phase !== 'playing') return;

    const dp = this._danielPlayer;
    const dir = this._input.direction;

    dp.x += dir.x * dp.speed * dt;
    dp.y += dir.y * dp.speed * dt;
    dp.x = Math.max(10, Math.min(this._worldW - dp.w - 10, dp.x));
    dp.y = Math.max(10, Math.min(this._worldH - dp.h - 10, dp.y));

    // Walking state and facing direction
    if (dir.x !== 0 || dir.y !== 0) {
      dp._state = 'walking';
      if (dir.x > 0) dp.facing = 'right';
      else if (dir.x < 0) dp.facing = 'left';
    } else if (dp._state === 'walking') {
      dp._state = 'idle';
    }
    dp.update(dt);

    // Building collision
    for (const b of this._buildings) {
      if (dp.x + dp.w > b.x && dp.x < b.x + b.w && dp.y + dp.h > b.y && dp.y < b.y + b.h) {
        // Push out
        const overlapLeft = dp.x + dp.w - b.x;
        const overlapRight = b.x + b.w - dp.x;
        const overlapTop = dp.y + dp.h - b.y;
        const overlapBottom = b.y + b.h - dp.y;
        const min = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        if (min === overlapLeft) dp.x = b.x - dp.w;
        else if (min === overlapRight) dp.x = b.x + b.w;
        else if (min === overlapTop) dp.y = b.y - dp.h;
        else dp.y = b.y + b.h;
      }
    }

    // Camera
    const w = this._gc.width;
    const h = this._gc.height;
    this._camX += ((dp.x + dp.w / 2 - w / 2) - this._camX) * 4 * dt;
    this._camY += ((dp.y + dp.h / 2 - h / 2) - this._camY) * 4 * dt;
    this._camX = Math.max(0, Math.min(this._worldW - w, this._camX));
    this._camY = Math.max(0, Math.min(this._worldH - h, this._camY));

    // NPC interaction
    for (const npc of this._npcs) {
      if (npc.helped) continue;
      const dx = (dp.x + dp.w / 2) - (npc.x + npc.w / 2);
      const dy = (dp.y + dp.h / 2) - (npc.y + npc.h / 2);
      if (Math.sqrt(dx * dx + dy * dy) < 50) {
        this._talkToNpc(npc);
        break;
      }
    }

    // Grow flowers over time based on happiness — cap at 100
    if (this._happiness > 0 && Math.random() < this._happiness * 0.02) {
      if (this._flowers.length < 100) {
        this._flowers.push({
          x: dp.x + (Math.random() - 0.5) * 200,
          y: dp.y + (Math.random() - 0.5) * 200,
          size: 3 + Math.random() * 4,
          color: ['#F48FB1', '#FFD54F', '#CE93D8', '#81C784'][Math.floor(Math.random() * 4)],
        });
      }
    }

    this._input.endFrame();
  }

  async _talkToNpc(npc) {
    this._phase = 'talking';

    // Randomize choice order
    const choices = Math.random() > 0.5
      ? [npc.kind, npc.unkind]
      : [npc.unkind, npc.kind];
    const kindIdx = choices.indexOf(npc.kind);

    const chosen = await this._dialogue.show({
      speaker: `${npc.emoji} ${npc.name}`,
      text: npc.problem,
      choices,
    });

    if (this._disposed) return;

    npc.helped = true;
    this._interacted++;

    if (chosen === kindIdx) {
      npc.kindChoice = true;
      this._kindCount++;
      this._happiness = Math.min(1, this._happiness + 0.25);
      this._dialogue.showResult(chosen, true);
      this._hud.flash(npc.effect, '#4CAF50');
      const screenX = npc.x - this._camX;
      const screenY = npc.y - this._camY;
      this._particles.emit({
        x: screenX + npc.w / 2, y: screenY,
        count: 10, color: '#FFD700', spread: 40, life: 0.8, shape: 'star',
      });
      // Spawn flowers around NPC — cap at 100
      for (let i = 0; i < 5; i++) {
        if (this._flowers.length < 100) {
          this._flowers.push({
            x: npc.x + (Math.random() - 0.5) * 60,
            y: npc.y + 20 + Math.random() * 30,
            size: 3 + Math.random() * 4,
            color: ['#F48FB1', '#FFD54F', '#CE93D8'][Math.floor(Math.random() * 3)],
          });
        }
      }
      this.ctx.audio.play('collect');
    } else {
      npc.kindChoice = false;
      this._happiness = Math.max(-1, this._happiness - 0.15);
      this._dialogue.showResult(chosen, false);
      this._dialogue.showResult(kindIdx, true);
      this._hud.flash('That wasn\'t kind...', '#EF4444');
      this._gc.shake(3, 200);
      this.ctx.audio.play('hit');
    }

    if (this._disposed) return;

    // Update HUD
    const moodText = this._happiness > 0.5 ? 'Joyful!' : this._happiness > 0 ? 'Happy' : this._happiness > -0.3 ? 'Neutral' : 'Sad';
    this._hud.setScore(`Village: ${moodText}`);
    this._hud.setObjective(`Help the villagers! (${this._interacted}/${this._totalNpcs})`);

    this._trackTimeout(() => {
      if (this._disposed) return;
      this._dialogue.hide();
      if (this._interacted >= this._totalNpcs) {
        this._onEnd();
      } else {
        this._phase = 'playing';
      }
    }, 800);
  }

  _onEnd() {
    this._phase = 'ending';
    const kindRatio = this._kindCount / this._totalNpcs;
    const score = Math.min(1, kindRatio);
    const success = kindRatio >= 0.5;
    this._hud.flash(success ? 'Village is happy!' : 'Try to be kinder next time', success ? '#4CAF50' : '#FF9800');
    this._particles.emit({
      x: this._gc.width / 2, y: this._gc.height / 2,
      count: success ? 20 : 5, color: '#FFD700', spread: 100, life: 1, shape: 'star',
    });
    this._trackTimeout(() => {
      if (this._disposed) return;
      if (success) {
        this._complete({ score, skillTags: ['empathy', 'kindness', 'prosocial'] });
      } else {
        this._fail({ score: 0, skillTags: ['empathy', 'kindness'] });
      }
    }, 1200);
  }

  _render(ctx) {
    const w = this._gc.width;
    const h = this._gc.height;
    const cx = this._camX;
    const cy = this._camY;
    this._gc.clear();

    // Sky (changes with happiness)
    const skyHue = this._happiness > 0 ? 200 : this._happiness > -0.3 ? 210 : 220;
    const skyLight = this._happiness > 0 ? 75 : this._happiness > -0.3 ? 65 : 50;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, `hsl(${skyHue}, 60%, ${skyLight}%)`);
    skyGrad.addColorStop(1, `hsl(${skyHue - 10}, 40%, ${skyLight + 10}%)`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Ground
    const groundColor = this._happiness > 0.3 ? '#4CAF50' : this._happiness > 0 ? '#66BB6A' : '#8BC34A';
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, 0, w, h);

    // Paths (dirt roads)
    ctx.fillStyle = '#D7CCC8';
    ctx.fillRect(this._worldW / 2 - 20 - cx, 0 - cy, 40, this._worldH);
    ctx.fillRect(0 - cx, this._worldH / 2 - 15 - cy, this._worldW, 30);

    // Flowers
    for (const f of this._flowers) {
      const fx = f.x - cx;
      const fy = f.y - cy;
      if (fx < -10 || fx > w + 10 || fy < -10 || fy > h + 10) continue;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.arc(fx + Math.cos(a) * f.size * 0.6, fy + Math.sin(a) * f.size * 0.6, f.size * 0.5, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.fillStyle = '#FFD54F';
      ctx.beginPath();
      ctx.arc(fx, fy, f.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Buildings
    for (const b of this._buildings) {
      const bx = b.x - cx;
      const by = b.y - cy;
      if (bx < -b.w - 10 || bx > w + 10 || by < -b.h - 20 || by > h + 10) continue;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(bx + 4, by + 4, b.w, b.h);

      // Wall
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(bx, by, b.w, b.h, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Roof
      ctx.fillStyle = '#795548';
      ctx.beginPath();
      ctx.moveTo(bx - 5, by);
      ctx.lineTo(bx + b.w / 2, by - 20);
      ctx.lineTo(bx + b.w + 5, by);
      ctx.closePath();
      ctx.fill();

      // Window
      ctx.fillStyle = this._happiness > 0 ? '#FFF9C4' : '#B0BEC5';
      ctx.fillRect(bx + b.w * 0.2, by + b.h * 0.25, b.w * 0.25, b.h * 0.25);
      ctx.fillRect(bx + b.w * 0.55, by + b.h * 0.25, b.w * 0.25, b.h * 0.25);

      // Door
      ctx.fillStyle = '#5D4037';
      ctx.beginPath();
      ctx.roundRect(bx + b.w * 0.35, by + b.h * 0.55, b.w * 0.3, b.h * 0.45, [4, 4, 0, 0]);
      ctx.fill();
    }

    // NPCs
    for (const npc of this._npcs) {
      const nx = npc.x - cx;
      const ny = npc.y - cy;
      if (nx < -40 || nx > w + 40 || ny < -40 || ny > h + 40) continue;

      ctx.save();
      ctx.translate(nx + npc.w / 2, ny + npc.h / 2);

      if (!npc.helped) {
        // Problem indicator (bouncing exclamation)
        const bounce = Math.sin(this._animTime * 3) * 4;
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', 0, -30 + bounce);

        // NPC body
        ctx.fillStyle = '#FFCC80';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '32px sans-serif';
        ctx.fillText(npc.emoji, 0, 9);
      } else {
        // Helped NPC (happy)
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = npc.kindChoice ? '#C8E6C9' : '#FFCDD2';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.font = '32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(npc.emoji, 0, 9);
        // Checkmark or X
        ctx.font = 'bold 17px sans-serif';
        ctx.fillStyle = npc.kindChoice ? '#4CAF50' : '#EF4444';
        ctx.fillText(npc.kindChoice ? '✓' : '✗', 17, -14);
      }

      ctx.restore();
    }

    // Daniel — rendered via DanielPlayer with camera offset
    this._danielPlayer.render(ctx, { x: this._camX, y: this._camY });

    // Particles
    this._particles.render(ctx);

    // Off-screen NPC indicators — show arrow/emoji at screen edge for unhelped NPCs not visible
    const EDGE_PAD = 24;
    for (const npc of this._npcs) {
      if (npc.helped) continue;
      const nx = npc.x - cx + npc.w / 2;
      const ny = npc.y - cy + npc.h / 2;
      if (nx >= 0 && nx <= w && ny >= 0 && ny <= h) continue; // on-screen, skip

      // Clamp indicator position to screen edge
      const clampedX = Math.max(EDGE_PAD, Math.min(w - EDGE_PAD, nx));
      const clampedY = Math.max(EDGE_PAD, Math.min(h - EDGE_PAD, ny));

      // Arrow angle pointing toward the NPC
      const angle = Math.atan2(ny - h / 2, nx - w / 2);

      ctx.save();
      ctx.translate(clampedX, clampedY);

      // Pulsing background circle
      const pulse = 0.75 + Math.sin(this._animTime * 4) * 0.25;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      // Rotating arrow
      ctx.rotate(angle);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(6, -6);
      ctx.lineTo(6, 6);
      ctx.closePath();
      ctx.fill();
      ctx.rotate(-angle);

      // NPC emoji centered in the circle
      ctx.globalAlpha = pulse;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(npc.emoji, 0, 0);

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Happiness bar
    const barW = 80;
    const barH = 8;
    const barX = w / 2 - barW / 2;
    const barY = h - 20;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();
    const fillW = ((this._happiness + 1) / 2) * barW;
    const barColor = this._happiness > 0.3 ? '#4CAF50' : this._happiness > -0.1 ? '#FFC107' : '#EF4444';
    ctx.fillStyle = barColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.max(4, fillW), barH, 4);
    ctx.fill();
  }

  dispose() {
    this._disposed = true;
    for (const id of this._timeouts) clearTimeout(id);
    this._timeouts = [];
    this._gc?.dispose();
    this._input?.dispose();
    this._hud?.dispose();
    this._dialogue?.dispose();
    super.dispose();
  }
}

register({
  id: 'kindness-kingdom',
  name: 'Kindness Kingdom',
  displayName: 'Kindness Kingdom',
  description: 'Explore the village and help the townsfolk!',
  skillTags: ['empathy', 'kindness', 'prosocial'],
  defaultConfig: {},
  factory: (ctx) => new KindnessKingdom(ctx),
});

export default KindnessKingdom;
