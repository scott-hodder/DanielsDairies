/**
 * Gratitude Garden — Interactive gardening with gratitude prompts.
 *
 * An empty garden plot. Daniel has seeds.
 * Prompts appear: "Plant something you're grateful for."
 * Player selects from categories (family, friends, health, nature, etc.)
 * Each planted gratitude grows as a unique procedural flower.
 * Walk Daniel with a watering can to water each flower.
 * Weeds (worries) occasionally sprout — walk over them to pull them.
 * Garden fills with butterflies as it grows.
 * 4-5 planting rounds.
 *
 * SEL skill: gratitude, positive thinking, mindfulness.
 */
import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';
import { GameCanvas, InputManager, ParticleEmitter, HUD, DialogueBox, TweenManager, showIntroScreen } from '../../engine/index.js';
import DanielPlayer from '../../engine/DanielPlayer.js';

const GRATITUDE_CATEGORIES = [
  { label: 'Family', emoji: '👨‍👩‍👧', color: '#EF5350', petalColor: '#FFCDD2' },
  { label: 'Friends', emoji: '🤝', color: '#FFB300', petalColor: '#FFE082' },
  { label: 'Health', emoji: '💪', color: '#66BB6A', petalColor: '#C8E6C9' },
  { label: 'Nature', emoji: '🌿', color: '#26A69A', petalColor: '#B2DFDB' },
  { label: 'Pets', emoji: '🐕', color: '#8D6E63', petalColor: '#D7CCC8' },
  { label: 'Learning', emoji: '📚', color: '#5C6BC0', petalColor: '#C5CAE9' },
  { label: 'Fun things', emoji: '🎮', color: '#AB47BC', petalColor: '#E1BEE7' },
  { label: 'Food', emoji: '🍎', color: '#FF7043', petalColor: '#FFCCBC' },
];

class GratitudeGarden extends IMiniGame {
  mount() {
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

    this._roundCount = Math.round(4 * (diff.targetCountMultiplier || 1));
    this._currentRound = 0;
    this._phase = 'prompting'; // prompting | watering | ending
    this._animTime = 0;
    this._disposed = false;

    // Flowers planted
    this._flowers = [];
    this._weeds = [];
    this._butterflies = [];

    // Garden plot dimensions
    this._gardenY = h * 0.5;
    this._gardenH = h * 0.45;

    // Sunshine
    this._sunX = w * 0.85;
    this._sunY = h * 0.1;

    // Daniel — starts on the left side, will walk during watering phase
    this._danielPlayer = new DanielPlayer({
      x: 30,
      y: this._gardenY - 36,
      size: 36,
      facing: 'right',
    });

    // Watering can state
    this._hasWateringCan = false;
    this._wateringTimer = 0; // visual water pour timer
    this._waterParticleTimer = 0;

    // Touch-to-move target
    this._moveTargetX = null;

    // setTimeout IDs for cleanup
    this._timeouts = [];

    this._hud.setObjective('Plant your gratitudes!');
    this._hud.setScore(`🌱 0/${this._roundCount}`);

    const t0 = setTimeout(() => {
      if (!this._disposed) this._promptPlanting();
    }, 500);
    this._timeouts.push(t0);
  }

  async start() {
    await showIntroScreen(this.ctx.container, {
      title: 'Gratitude Town Square',
      story: 'The town square looks dull! Help Daniel plant gratitude flowers and water them to brighten the road.',
      controls: 'Click choices, then walk Daniel to water flowers',
      mobileControls: 'Tap choices, then tap to walk Daniel to each flower',
      goal: 'Plant and water all the flowers to brighten the square!',
    });
    this._gc.run(
      (dt) => this._update(dt),
      (ctx) => this._render(ctx),
    );
  }

  async _promptPlanting() {
    if (this._disposed) return;
    if (this._currentRound >= this._roundCount) {
      // Check if all flowers watered
      if (this._flowers.every(f => f.watered) && this._weeds.every(w2 => !w2.growing)) {
        this._onWin();
      }
      return;
    }

    this._phase = 'prompting';
    this._hasWateringCan = false;
    const shuffled = [...GRATITUDE_CATEGORIES].sort(() => Math.random() - 0.5);
    const options = shuffled.slice(0, 3);

    const choice = await this._dialogue.show({
      speaker: 'Daniel',
      text: "What are you grateful for today? Pick a seed to plant!",
      choices: options.map(o => `${o.emoji} ${o.label}`),
    });

    if (this._disposed) return;

    const selected = options[choice >= 0 ? choice : 0];
    this._dialogue.hide();

    // Plant the flower
    const w = this._gc.width;
    const spacing = (w - 80) / (this._roundCount);
    const fx = 40 + spacing * this._currentRound + spacing / 2;
    const fy = this._gardenY + 30 + (this._currentRound % 2) * 40 + 20;

    this._flowers.push({
      x: fx, y: fy,
      category: selected,
      growth: 0,
      watered: false,
      petalCount: 5 + Math.floor(Math.random() * 3),
      stemHeight: 30 + Math.random() * 25,
      leafSide: Math.random() > 0.5 ? 1 : -1,
    });

    this._currentRound++;
    this._hud.setScore(`🌱 ${this._currentRound}/${this._roundCount}`);
    this._hud.flash(`Planted: ${selected.emoji} ${selected.label}!`, selected.color);
    this.ctx.audio.play('collect');

    this._particles.emit({
      x: fx, y: fy,
      count: 6, color: selected.color, spread: 20, life: 0.5,
    });

    this._danielPlayer.celebrate(0.8);

    // Start watering phase — Daniel gets a watering can
    this._phase = 'watering';
    this._hasWateringCan = true;
    this._hud.setObjective('Walk Daniel to water the flowers!');

    // Spawn a weed occasionally
    if (Math.random() < 0.4 && this._currentRound > 1) {
      const tw = setTimeout(() => {
        if (!this._disposed) this._spawnWeed();
      }, 1500);
      this._timeouts.push(tw);
    }
  }

  _spawnWeed() {
    if (this._phase === 'ending') return;
    const w = this._gc.width;
    this._weeds.push({
      x: 30 + Math.random() * (w - 60),
      y: this._gardenY + 30 + Math.random() * (this._gardenH - 50),
      size: 0,
      growing: true,
    });
    this._hud.flash('A worry-weed appeared! Walk over it!', '#EF4444');
  }

  _update(dt) {
    if (this._disposed) return;
    if (this._phase === 'ending') return;
    this._animTime += dt;
    this._tweens.update(dt);
    this._particles.update(dt);
    this._danielPlayer.update(dt);

    const w = this._gc.width;
    const h = this._gc.height;

    // Grow flowers
    for (const flower of this._flowers) {
      if (flower.watered && flower.growth < 1) {
        flower.growth = Math.min(1, flower.growth + dt * 0.5);
      }
    }

    // Grow weeds
    for (const weed of this._weeds) {
      if (weed.growing) {
        weed.size = Math.min(1, weed.size + dt * 0.3);
      }
    }

    // ── Movement: keyboard or tap-to-move ──
    if (this._phase === 'watering') {
      const dir = this._input.direction;
      let moveX = 0;

      // Keyboard movement
      if (dir.x !== 0) {
        moveX = dir.x;
        this._moveTargetX = null; // cancel tap target when using keyboard
      }

      // Tap-to-move: on tap/click, set a target X position
      if (this._input.touch.active && !this._input.keys.left && !this._input.keys.right) {
        this._moveTargetX = this._input.touch.x;
      }

      // Move towards tap target
      if (this._moveTargetX !== null && moveX === 0) {
        const dx = this._moveTargetX - (this._danielPlayer.x + this._danielPlayer.w / 2);
        if (Math.abs(dx) > 5) {
          moveX = dx > 0 ? 1 : -1;
        } else {
          this._moveTargetX = null;
        }
      }

      // Apply movement
      if (moveX !== 0) {
        const speed = 120;
        this._danielPlayer.x += moveX * speed * dt;
        this._danielPlayer.x = Math.max(5, Math.min(w - this._danielPlayer.w - 5, this._danielPlayer.x));
        this._danielPlayer.facing = moveX > 0 ? 'right' : 'left';
        this._danielPlayer._state = 'walking';
      } else if (this._danielPlayer._state === 'walking') {
        this._danielPlayer._state = 'idle';
      }

      // Keep Daniel at garden level
      this._danielPlayer.y = this._gardenY - 36;

      // ── Check proximity to unwatered flowers ──
      const danielCX = this._danielPlayer.x + this._danielPlayer.w / 2;
      const danielCY = this._danielPlayer.y + this._danielPlayer.h;
      const waterReach = 30;

      this._waterParticleTimer -= dt;

      for (const flower of this._flowers) {
        if (flower.watered) continue;
        const dist = Math.abs(flower.x - danielCX);
        if (dist < waterReach) {
          // Water this flower!
          flower.watered = true;
          this._hud.flash('Watered!', '#64B5F6');
          this.ctx.audio.play('collect');

          // Water splash particles
          this._particles.emit({
            x: flower.x, y: flower.y - 10,
            count: 8, color: '#64B5F6', spread: 18, life: 0.4,
          });

          this._danielPlayer.celebrate(0.5);

          // Check completion
          this._checkWateringComplete();
        }
      }

      // ── Check proximity to weeds — walk over to pull ──
      for (let i = this._weeds.length - 1; i >= 0; i--) {
        const weed = this._weeds[i];
        if (!weed.growing) continue;
        const dist = Math.sqrt(
          (weed.x - danielCX) ** 2 + (weed.y - danielCY) ** 2
        );
        if (dist < 35) {
          weed.growing = false;
          this._particles.emit({
            x: weed.x, y: weed.y,
            count: 5, color: '#795548', spread: 20, life: 0.4,
          });
          this._hud.flash('Weed pulled!', '#4CAF50');
          this.ctx.audio.play('collect');
          this._checkWateringComplete();
          break;
        }
      }

      // Water drip particles from watering can while walking
      if (moveX !== 0 && this._hasWateringCan && this._waterParticleTimer <= 0) {
        this._waterParticleTimer = 0.15;
        const canX = danielCX + (this._danielPlayer.facing === 'right' ? 18 : -18);
        const canY = this._danielPlayer.y + this._danielPlayer.h * 0.5;
        this._particles.emit({
          x: canX, y: canY + 5,
          count: 1, color: '#64B5F6', spread: 3, life: 0.3, size: 2, gravity: 120,
        });
      }
    }

    // Butterflies
    if (this._flowers.filter(f => f.growth > 0.5).length > 0 && this._butterflies.length < 5 && Math.random() < 0.01) {
      this._butterflies.push({
        x: Math.random() * w,
        y: this._gardenY - 20 + Math.random() * 40,
        targetFlower: Math.floor(Math.random() * this._flowers.length),
        phase: Math.random() * Math.PI * 2,
      });
    }
    for (const bf of this._butterflies) {
      const target = this._flowers[bf.targetFlower];
      if (target) {
        bf.x += (target.x + Math.sin(this._animTime * 2 + bf.phase) * 20 - bf.x) * dt;
        bf.y += (target.y - target.stemHeight * target.growth + Math.cos(this._animTime * 3 + bf.phase) * 10 - bf.y) * dt;
      }
      bf.phase += dt * 3;
    }

    this._input.endFrame();
  }

  _checkWateringComplete() {
    const allWatered = this._flowers.every(f => f.watered);
    const allWeedsPulled = this._weeds.every(w2 => !w2.growing);

    if (allWatered) {
      if (this._currentRound >= this._roundCount && allWeedsPulled) {
        const t1 = setTimeout(() => {
          if (!this._disposed) this._onWin();
        }, 1500);
        this._timeouts.push(t1);
      } else if (this._currentRound >= this._roundCount) {
        this._hud.setObjective('Pull the worry-weeds to finish!');
      } else {
        const t2 = setTimeout(() => {
          if (!this._disposed) this._promptPlanting();
        }, 1000);
        this._timeouts.push(t2);
      }
    }
  }

  _onWin() {
    if (this._disposed) return;
    this._phase = 'ending';
    this._hasWateringCan = false;
    this._hud.flash('Beautiful garden!', '#4CAF50');
    this._particles.emit({
      x: this._gc.width / 2, y: this._gc.height / 2,
      count: 25, color: '#FFD700', spread: 100, life: 1.2, shape: 'star',
    });
    this._danielPlayer.celebrate(2);
    const tw = setTimeout(() => {
      if (!this._disposed) {
        const score = Math.min(1, this._flowers.filter(f => f.watered).length / this._roundCount);
        this._complete({ score, skillTags: ['gratitude', 'positive-thinking', 'mindfulness'] });
      }
    }, 1200);
    this._timeouts.push(tw);
  }

  _render(ctx) {
    const w = this._gc.width;
    const h = this._gc.height;
    this._gc.clear();

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this._gardenY);
    skyGrad.addColorStop(0, '#64B5F6');
    skyGrad.addColorStop(1, '#BBDEFB');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, this._gardenY);

    // Sun
    ctx.save();
    ctx.fillStyle = '#FFD54F';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(this._sunX, this._sunY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFC107';
    ctx.beginPath();
    ctx.arc(this._sunX, this._sunY, 22, 0, Math.PI * 2);
    ctx.fill();
    // Rays
    ctx.strokeStyle = '#FFD54F';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this._animTime * 0.3;
      ctx.beginPath();
      ctx.moveTo(this._sunX + Math.cos(a) * 26, this._sunY + Math.sin(a) * 26);
      ctx.lineTo(this._sunX + Math.cos(a) * 35, this._sunY + Math.sin(a) * 35);
      ctx.stroke();
    }
    ctx.restore();

    // Garden soil
    const soilGrad = ctx.createLinearGradient(0, this._gardenY, 0, h);
    soilGrad.addColorStop(0, '#5D4037');
    soilGrad.addColorStop(0.1, '#4E342E');
    soilGrad.addColorStop(1, '#3E2723');
    ctx.fillStyle = soilGrad;
    ctx.fillRect(0, this._gardenY, w, this._gardenH + 20);

    // Grass border
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, this._gardenY - 5, w, 10);

    // Fence
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 3;
    for (let fx = 20; fx < w; fx += 30) {
      ctx.beginPath();
      ctx.moveTo(fx, this._gardenY - 15);
      ctx.lineTo(fx, this._gardenY + 5);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(10, this._gardenY - 8);
    ctx.lineTo(w - 10, this._gardenY - 8);
    ctx.stroke();

    // Weeds
    for (const weed of this._weeds) {
      if (!weed.growing) continue;
      const ws = weed.size * 15;
      ctx.fillStyle = '#795548';
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(weed.x, weed.y);
      ctx.lineTo(weed.x, weed.y - ws);
      ctx.stroke();
      ctx.fillStyle = '#6D4C41';
      for (let i = 0; i < 3; i++) {
        const ly = weed.y - ws * (0.3 + i * 0.25);
        const dir = i % 2 === 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(weed.x, ly);
        ctx.lineTo(weed.x + dir * ws * 0.5, ly - 3);
        ctx.lineTo(weed.x, ly - 5);
        ctx.closePath();
        ctx.fill();
      }
      // Tap indicator
      ctx.fillStyle = 'rgba(239,83,80,0.5)';
      ctx.beginPath();
      ctx.arc(weed.x, weed.y - ws / 2, ws * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flowers
    for (const flower of this._flowers) {
      const g = flower.growth;
      if (g <= 0 && !flower.watered) {
        // Seed
        ctx.fillStyle = '#795548';
        ctx.beginPath();
        ctx.ellipse(flower.x, flower.y, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Unwatered indicator — small water drop icon
        if (this._hasWateringCan) {
          ctx.save();
          ctx.globalAlpha = 0.4 + Math.sin(this._animTime * 3) * 0.2;
          ctx.fillStyle = '#64B5F6';
          ctx.beginPath();
          ctx.moveTo(flower.x, flower.y - 16);
          ctx.quadraticCurveTo(flower.x + 6, flower.y - 8, flower.x, flower.y - 4);
          ctx.quadraticCurveTo(flower.x - 6, flower.y - 8, flower.x, flower.y - 16);
          ctx.fill();
          ctx.restore();
        }
        continue;
      }

      const stemH = flower.stemHeight * g;
      const cat = flower.category;

      // Stem
      ctx.strokeStyle = '#388E3C';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(flower.x, flower.y);
      ctx.quadraticCurveTo(flower.x + flower.leafSide * 8 * g, flower.y - stemH * 0.5, flower.x, flower.y - stemH);
      ctx.stroke();

      // Leaf
      if (g > 0.3) {
        ctx.fillStyle = '#4CAF50';
        const leafY = flower.y - stemH * 0.4;
        ctx.beginPath();
        ctx.ellipse(flower.x + flower.leafSide * 8, leafY, 8 * g, 4 * g, flower.leafSide * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Petals
      if (g > 0.4) {
        const flowerTop = flower.y - stemH;
        const petalR = 6 * g;
        ctx.fillStyle = cat.petalColor;
        for (let p = 0; p < flower.petalCount; p++) {
          const a = (p / flower.petalCount) * Math.PI * 2 + this._animTime * 0.2;
          const px = flower.x + Math.cos(a) * petalR;
          const py = flowerTop + Math.sin(a) * petalR;
          ctx.beginPath();
          ctx.arc(px, py, petalR * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Center
        ctx.fillStyle = cat.color;
        ctx.beginPath();
        ctx.arc(flower.x, flowerTop, petalR * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      // Label
      if (g > 0.6) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${cat.emoji} ${cat.label}`, flower.x, flower.y + 14);
      }
    }

    // Butterflies
    for (const bf of this._butterflies) {
      ctx.save();
      ctx.translate(bf.x, bf.y);
      const wingFlap = Math.sin(bf.phase) * 0.6;
      ctx.fillStyle = '#FFB74D';
      ctx.save();
      ctx.rotate(wingFlap);
      ctx.beginPath();
      ctx.ellipse(-5, 0, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.rotate(-wingFlap);
      ctx.beginPath();
      ctx.ellipse(5, 0, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(-1, -3, 2, 6);
      ctx.restore();
    }

    // Daniel
    this._danielPlayer.render(ctx);

    // Draw watering can on Daniel
    if (this._hasWateringCan && this._phase === 'watering') {
      this._drawWateringCan(ctx);
    }

    // Particles
    this._particles.render(ctx);
  }

  _drawWateringCan(ctx) {
    const dp = this._danielPlayer;
    const facingRight = dp.facing === 'right';
    const cx = dp.x + dp.w / 2 + (facingRight ? 16 : -16);
    const cy = dp.y + dp.h * 0.45;

    ctx.save();
    if (!facingRight) {
      ctx.translate(cx, cy);
      ctx.scale(-1, 1);
      ctx.translate(-cx, -cy);
    }

    // Can body
    ctx.fillStyle = '#78909C';
    ctx.beginPath();
    ctx.roundRect(cx - 6, cy - 4, 12, 10, 2);
    ctx.fill();

    // Spout
    ctx.strokeStyle = '#607D8B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 2);
    ctx.lineTo(cx + 12, cy - 7);
    ctx.stroke();

    // Spout tip
    ctx.fillStyle = '#607D8B';
    ctx.beginPath();
    ctx.arc(cx + 12, cy - 7, 2, 0, Math.PI * 2);
    ctx.fill();

    // Handle
    ctx.strokeStyle = '#546E7A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 7, 5, Math.PI, 0);
    ctx.stroke();

    // Water drops from spout (subtle, when near a flower)
    const danielCX = dp.x + dp.w / 2;
    const nearFlower = this._flowers.some(f => !f.watered && Math.abs(f.x - danielCX) < 40);
    if (nearFlower) {
      ctx.fillStyle = '#64B5F6';
      for (let i = 0; i < 3; i++) {
        const dropY = cy - 5 + ((this._animTime * 60 + i * 15) % 25);
        const dropX = cx + 12 + Math.sin(this._animTime * 4 + i) * 2;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.ellipse(dropX, dropY, 1, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  dispose() {
    this._disposed = true;
    for (const id of (this._timeouts || [])) clearTimeout(id);
    this._timeouts = [];
    this._gc?.dispose();
    this._input?.dispose();
    this._hud?.dispose();
    this._dialogue?.dispose();
    super.dispose();
  }
}

register({
  id: 'gratitude-garden',
  name: 'Gratitude Garden',
  displayName: 'Gratitude Town Square',
  description: 'Plant a garden of things you are grateful for!',
  skillTags: ['gratitude', 'positive-thinking', 'mindfulness'],
  defaultConfig: {},
  factory: (ctx) => new GratitudeGarden(ctx),
});

export default GratitudeGarden;
