/**
 * Emotion Town Square — Side-scroller with emotion identification.
 *
 * Daniel walks through a scrolling town square scene.
 * Emotion-characters drift by (happy, angry, sad blobs, etc.).
 * A prompt asks: "Find the character feeling ___."
 * Navigate to the correct character and collide. Wrong = confused cloud.
 * Correct = character joins the group following Daniel.
 * 5 rounds with more characters and faster movement.
 *
 * SEL skill: emotion literacy, identification.
 */
import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';
import { GameCanvas, InputManager, ParticleEmitter, HUD, TweenManager, showIntroScreen } from '../../engine/index.js';
import DanielPlayer from '../../engine/DanielPlayer.js';

const EMOTION_TIPS = {
  Happy: 'Smiling and laughing show happiness!',
  Sad: 'When sad, it helps to talk to someone.',
  Angry: 'Take a deep breath when you feel angry.',
  Scared: 'Being brave means trying even when scared.',
  Excited: 'Excitement gives you energy to try new things!',
  Calm: 'Deep breathing helps you feel calm.',
  Frustrated: 'Break hard tasks into small steps.',
  Surprised: 'Surprises can be good or bad — notice how you feel!',
};

const EMOTIONS = [
  { name: 'Happy', color: '#FFD54F', bodyColor: '#FFF176', shape: 'jellyfish', emoji: '\u{1F600}' },
  { name: 'Sad', color: '#64B5F6', bodyColor: '#90CAF9', shape: 'whale', emoji: '\u{1F622}' },
  { name: 'Angry', color: '#EF5350', bodyColor: '#FF8A80', shape: 'pufferfish', emoji: '\u{1F620}' },
  { name: 'Scared', color: '#CE93D8', bodyColor: '#E1BEE7', shape: 'octopus', emoji: '\u{1F628}' },
  { name: 'Excited', color: '#FF8A65', bodyColor: '#FFAB91', shape: 'starfish', emoji: '\u{1F929}' },
  { name: 'Calm', color: '#80CBC4', bodyColor: '#B2DFDB', shape: 'turtle', emoji: '\u{1F60C}' },
  { name: 'Frustrated', color: '#FFB74D', bodyColor: '#FFE0B2', shape: 'crab', emoji: '\u{1F624}' },
  { name: 'Surprised', color: '#AED581', bodyColor: '#C5E1A5', shape: 'seahorse', emoji: '\u{1F632}' },
];

class EmotionOcean extends IMiniGame {
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

    const diff = DIFFICULTY[this.ctx.difficulty] || DIFFICULTY.medium;
    const w = this._gc.width;
    const h = this._gc.height;

    // Daniel (walker) — position/speed tracking object
    this._daniel = { x: w * 0.2, y: h / 2, w: 32, h: 36, speed: 110 * diff.speedMultiplier };
    this._animTime = 0;

    // DanielPlayer for rendering
    this._danielPlayer = new DanielPlayer({ x: w * 0.2, y: h / 2, size: 32, facing: 'right' });

    // Rounds
    this._roundCount = Math.round(5 * (diff.targetCountMultiplier || 1));
    this._currentRound = 0;
    this._phase = 'playing'; // playing | choosing | inkBlind | ending
    this._creatures = [];
    this._school = []; // characters following Daniel
    this._targetEmotion = null;
    this._inkTimer = 0;
    this._lives = 3;
    this._maxLives = 3;
    this._correct = 0;

    // Trees / bushes decoration at the bottom
    this._seaweed = [];
    for (let i = 0; i < 15; i++) {
      this._seaweed.push({
        x: Math.random() * w,
        h: 30 + Math.random() * 50,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Floating leaves (replaces bubbles)
    this._bubbles = [];

    this._invulnTimer = 1.5;
    this._recentEmotions = []; // track last 2 to prevent repeats

    this._hud.setLives(this._lives, this._maxLives);
    this._startRound();
  }

  _trackTimeout(fn, delay) {
    const id = setTimeout(() => {
      fn();
    }, delay);
    this._timeouts.push(id);
    return id;
  }

  _startRound() {
    if (this._disposed) return;
    if (this._currentRound >= this._roundCount) {
      this._onWin();
      return;
    }

    const w = this._gc.width;
    const h = this._gc.height;

    // Pick target emotion — exclude recent picks to prevent repeats
    const available = EMOTIONS.filter(e => !this._recentEmotions.includes(e.name));
    const shuffled = [...(available.length >= 3 ? available : EMOTIONS)].sort(() => Math.random() - 0.5);
    this._targetEmotion = shuffled[0];
    this._recentEmotions.push(this._targetEmotion.name);
    if (this._recentEmotions.length > 2) this._recentEmotions.shift();

    // Spawn characters: 1 correct + 2-4 distractors
    const distractorCount = 2 + Math.min(this._currentRound, 2);
    this._creatures = [];

    // Correct character
    this._creatures.push(this._makeCreature(shuffled[0], w, h, true));

    // Distractors (different emotions)
    for (let i = 1; i <= distractorCount; i++) {
      this._creatures.push(this._makeCreature(shuffled[i % shuffled.length], w, h, false));
    }

    this._invulnTimer = 1.5;
    this._phase = 'choosing';
    this._hud.setObjective(`Find: ${this._targetEmotion.name} \u{1F50D}`);
    this._hud.setScore(`${this._correct}/${this._roundCount}`);
    this._hud.flash(`Who looks ${this._targetEmotion.name}? Watch their faces!`, this._targetEmotion.color);
  }

  _makeCreature(emotion, w, h, isTarget) {
    let x, y, attempts = 0;
    do {
      x = w * 0.15 + Math.random() * w * 0.7;
      y = h * 0.55 + Math.random() * h * 0.32;
      attempts++;
    } while (attempts < 20 && this._daniel &&
      Math.sqrt((x - this._daniel.x) ** 2 + (y - this._daniel.y) ** 2) < 80);

    // Scale character speed based on current round
    const speedScale = 1 + this._currentRound * 0.15;
    return {
      x, y,
      w: 56, h: 56,
      emotion,
      isTarget,
      vx: (Math.random() - 0.5) * 20 * speedScale,
      vy: (Math.random() - 0.5) * 15 * speedScale,
      phase: Math.random() * Math.PI * 2,
      found: false,
    };
  }

  async start() {
    await showIntroScreen(this.ctx.container, {
      title: 'Emotion Town Square',
      story: 'Daniel is in the town square! Help him find the characters who are feeling different emotions.',
      controls: 'Arrow keys to move',
      mobileControls: 'Drag to move',
      goal: 'Find the character matching the emotion shown!',
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

    const d = this._daniel;
    const w = this._gc.width;
    const h = this._gc.height;

    // Move Daniel
    const dir = this._input.direction;
    d.x += dir.x * d.speed * dt;
    d.y += dir.y * d.speed * dt;
    d.x = Math.max(10, Math.min(w - d.w - 10, d.x));
    // Restrict Daniel to the ground area (below sky/trees, roughly bottom 45%)
    const groundMinY = h * 0.55;
    d.y = Math.max(groundMinY, Math.min(h - d.h - 10, d.y));

    // Sync DanielPlayer position and update
    this._danielPlayer.x = d.x;
    this._danielPlayer.y = d.y;
    if (dir.x !== 0 || dir.y !== 0) {
      this._danielPlayer._state = 'walking';
      if (dir.x > 0) this._danielPlayer.facing = 'right';
      else if (dir.x < 0) this._danielPlayer.facing = 'left';
    } else if (this._danielPlayer._state === 'walking') {
      this._danielPlayer._state = 'idle';
    }
    this._danielPlayer.update(dt);

    // Invulnerability timer
    if (this._invulnTimer > 0) {
      this._invulnTimer -= dt;
    }

    // Confused cloud timer
    if (this._inkTimer > 0) {
      this._inkTimer -= dt;
      if (this._inkTimer <= 0) this._phase = 'choosing';
    }

    // Character movement (gentle drift + wobble)
    for (const cr of this._creatures) {
      if (cr.found) continue;
      cr.phase += dt;
      cr.x += cr.vx * dt + Math.sin(cr.phase * 2) * 0.5;
      cr.y += cr.vy * dt + Math.cos(cr.phase * 1.5) * 0.3;
      // Bounce off edges
      const crGroundMin = h * 0.52;
      if (cr.x < 20 || cr.x > w - cr.w - 20) cr.vx *= -1;
      if (cr.y < crGroundMin || cr.y > h - cr.h - 20) cr.vy *= -1;
      cr.x = Math.max(20, Math.min(w - cr.w - 20, cr.x));
      cr.y = Math.max(crGroundMin, Math.min(h - cr.h - 20, cr.y));
    }

    // Group following Daniel
    for (let i = 0; i < this._school.length; i++) {
      const follower = this._school[i];
      const targetX = d.x - 20 - i * 22;
      const targetY = d.y + 5 + Math.sin(this._animTime * 2 + i) * 8;
      follower.x += (targetX - follower.x) * 3 * dt;
      follower.y += (targetY - follower.y) * 3 * dt;
    }

    // Collision with characters
    if (this._phase === 'choosing' && this._invulnTimer <= 0) {
      for (const cr of this._creatures) {
        if (cr.found) continue;
        const dx = (d.x + d.w / 2) - (cr.x + cr.w / 2);
        const dy = (d.y + d.h / 2) - (cr.y + cr.h / 2);
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
          this._handleCreatureTouch(cr);
          break;
        }
      }
    }

    // Floating leaves — cap at 30 entries
    if (this._bubbles.length < 30 && Math.random() < 0.15) {
      this._bubbles.push({
        x: Math.random() * w,
        y: -10,
        r: 3 + Math.random() * 4,
        speed: 20 + Math.random() * 30,
        drift: (Math.random() - 0.5) * 40,
        rot: Math.random() * Math.PI * 2,
      });
    }
    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const leaf = this._bubbles[i];
      leaf.y += leaf.speed * dt;
      leaf.x += Math.sin(this._animTime * 2 + i) * 0.5 + leaf.drift * dt * 0.1;
      leaf.rot += dt * 1.5;
      if (leaf.y > h + 10) this._bubbles.splice(i, 1);
    }

    // Daniel walk dust particles
    if (Math.abs(dir.x) + Math.abs(dir.y) > 0 && Math.random() < 0.2) {
      this._particles.emit({
        x: d.x + d.w / 2, y: d.y + d.h,
        count: 1, color: 'rgba(180,140,80,0.5)',
        spread: 6, life: 0.35, size: 3, gravity: 20,
      });
    }

    this._input.endFrame();
  }

  _handleCreatureTouch(cr) {
    cr.found = true;
    if (cr.isTarget) {
      // Correct!
      this._correct++;
      this._school.push({ ...cr, x: cr.x, y: cr.y });
      const tip = EMOTION_TIPS[cr.emotion.name] || '';
      this._hud.flash(tip ? `${cr.emotion.name}! ${tip}` : `Yes! ${cr.emotion.name}!`, '#4CAF50');
      this._particles.emit({
        x: cr.x + cr.w / 2, y: cr.y + cr.h / 2,
        count: 10, color: cr.emotion.color, spread: 50, life: 0.6, shape: 'star',
      });
      this.ctx.audio.play('collect');
      this._currentRound++;

      // Next round after delay
      this._trackTimeout(() => {
        if (this._disposed) return;
        if (this._phase !== 'ending') this._startRound();
      }, 800);
    } else {
      // Wrong — confused cloud
      this._lives--;
      this._hud.setLives(this._lives, this._maxLives);
      this._hud.flash(`That's ${cr.emotion.name}, not ${this._targetEmotion.name}`, '#EF4444');
      this._gc.shake(4, 200);
      this.ctx.audio.play('hit');
      this._danielPlayer.hurt();
      this._phase = 'inkBlind';
      this._inkTimer = 1.2;
      cr.found = false; // put it back

      if (this._lives <= 0) {
        this._onLose();
      }
    }
  }

  _onWin() {
    this._phase = 'ending';
    const score = Math.min(1, (this._correct / this._roundCount) * 0.7 + (this._lives / this._maxLives) * 0.3);
    this._hud.flash('Town square explored!', '#4CAF50');
    this._particles.emit({
      x: this._gc.width / 2, y: this._gc.height / 2,
      count: 20, color: '#FFD700', spread: 100, life: 1, shape: 'star',
    });
    this._trackTimeout(() => {
      if (this._disposed) return;
      this._complete({ score, skillTags: ['emotion-literacy', 'identification'] });
    }, 1200);
  }

  _onLose() {
    this._phase = 'ending';
    this._hud.flash('Keep exploring!', '#EF4444');
    this._trackTimeout(() => {
      if (this._disposed) return;
      this._fail({ score: 0, skillTags: ['emotion-literacy'] });
    }, 800);
  }

  _render(ctx) {
    const w = this._gc.width;
    const h = this._gc.height;
    this._gc.clear();

    // Sky gradient (top) → grass/pavement (bottom)
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.55, '#B0E0FF');
    grad.addColorStop(0.56, '#90C06A');
    grad.addColorStop(0.72, '#78A855');
    grad.addColorStop(0.73, '#C8B878');
    grad.addColorStop(1, '#B8A868');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Sun rays from top
    ctx.save();
    ctx.globalAlpha = 0.10;
    for (let i = 0; i < 5; i++) {
      const rx = w * 0.1 + i * w * 0.2 + Math.sin(this._animTime * 0.3 + i) * 15;
      ctx.fillStyle = '#FFFDE7';
      ctx.beginPath();
      ctx.moveTo(rx - 10, 0);
      ctx.lineTo(rx + 10, 0);
      ctx.lineTo(rx + 35 + i * 8, h * 0.55);
      ctx.lineTo(rx - 35 - i * 8, h * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Sun
    ctx.save();
    ctx.fillStyle = '#FFE135';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.09, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Trees / bushes at the bottom strip
    for (const sw of this._seaweed) {
      const groundY = h * 0.56;
      const sway = Math.sin(this._animTime * 1.2 + sw.phase) * 4;

      // Trunk
      ctx.strokeStyle = '#795548';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sw.x, groundY);
      ctx.lineTo(sw.x + sway * 0.3, groundY - sw.h * 0.5);
      ctx.stroke();

      // Foliage (stacked circles)
      const foliageX = sw.x + sway * 0.3;
      const foliageY = groundY - sw.h * 0.5;
      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.arc(foliageX, foliageY, sw.h * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#43A047';
      ctx.beginPath();
      ctx.arc(foliageX + sway * 0.2, foliageY - sw.h * 0.25, sw.h * 0.27, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#66BB6A';
      ctx.beginPath();
      ctx.arc(foliageX + sway * 0.1, foliageY - sw.h * 0.46, sw.h * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floating leaves
    ctx.save();
    for (const leaf of this._bubbles) {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rot);
      ctx.fillStyle = 'rgba(100,160,60,0.65)';
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.r, leaf.r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // Characters
    for (const cr of this._creatures) {
      if (cr.found) continue;
      this._drawCreature(ctx, cr);
    }

    // Group following Daniel — labelled, to reinforce the word once learned
    for (const cr of this._school) {
      this._drawCreature(ctx, cr, 0.7, true);
    }

    // Daniel (walker) — rendered via DanielPlayer (screen-space, no camera)
    this._danielPlayer.render(ctx);

    // Confused cloud overlay (replaces ink cloud)
    if (this._inkTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, this._inkTimer * 0.42);
      ctx.fillStyle = '#D0D0D0';
      ctx.fillRect(0, 0, w, h);

      // Draw puffy thought-cloud shape in centre
      ctx.globalAlpha = Math.min(0.75, this._inkTimer * 0.65);
      ctx.fillStyle = '#F5F5F5';
      const cx = w / 2;
      const cy = h / 2;
      const puffs = [
        [cx, cy, 38],
        [cx - 30, cy + 12, 26],
        [cx + 32, cy + 10, 28],
        [cx - 14, cy + 24, 22],
        [cx + 14, cy + 24, 22],
      ];
      ctx.beginPath();
      for (const [px, py, pr] of puffs) {
        ctx.moveTo(px + pr, py);
        ctx.arc(px, py, pr, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#555';
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Confused!', cx, cy + 8);
      ctx.restore();
    }

    // Particles
    this._particles.render(ctx);
  }

  _drawCreature(ctx, cr, alpha = 1, showLabel = false) {
    const cx = cr.x + cr.w / 2;
    const cy = cr.y + cr.h / 2;
    const e = cr.emotion;
    const radius = 22; // ~44px diameter circle
    const t = this._animTime;

    // Body language per emotion — the movement itself is a readable cue,
    // so the child learns faces AND posture, not just labels.
    let bob = Math.sin(t * 2 + cr.phase) * 4;
    let jitterX = 0;
    let squash = 1;
    switch (e.name) {
      case 'Happy':      bob = Math.abs(Math.sin(t * 3 + cr.phase)) * -7; break;           // light springy hops
      case 'Excited':    bob = Math.abs(Math.sin(t * 5 + cr.phase)) * -11; break;          // big fast bounces
      case 'Sad':        bob = 5 + Math.sin(t * 0.9 + cr.phase) * 1.5; squash = 0.93; break; // drooped and slow
      case 'Angry':      jitterX = Math.sin(t * 18 + cr.phase) * 2.2; break;               // fuming shake
      case 'Scared':     jitterX = Math.sin(t * 26 + cr.phase) * 1.2; squash = 0.9; break; // small tremble, shrunk
      case 'Frustrated': bob = Math.sin(t * 2 + cr.phase) * 2; jitterX = Math.sin(t * 9 + cr.phase) * 1.4; break;
      case 'Calm':       bob = Math.sin(t * 1.1 + cr.phase) * 2.5; break;                  // slow, easy sway
      case 'Surprised':  bob = (Math.sin(t * 1.5 + cr.phase) > 0.85 ? -9 : 0); break;      // sudden little jumps
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx + jitterX, cy + bob);
    ctx.scale(1, squash);

    // Colored glow / shadow
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 14;

    // Circle body
    ctx.fillStyle = e.bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Colored ring
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Reset shadow before text
    ctx.shadowBlur = 0;

    // Large emoji face in centre
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.emoji, 0, 0);

    // Name label only AFTER the emotion has been identified (followers) —
    // roaming characters must be read from face and body language.
    if (showLabel) {
      ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 13px sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(e.name, 0, radius + 15);
      ctx.fillStyle = '#fff';
      ctx.fillText(e.name, 0, radius + 15);
    }

    ctx.restore();
  }

  dispose() {
    this._disposed = true;
    for (const id of this._timeouts) clearTimeout(id);
    this._timeouts = [];
    this._gc?.dispose();
    this._input?.dispose();
    this._hud?.dispose();
    super.dispose();
  }
}

register({
  id: 'emotion-ocean',
  name: 'Emotion Town Square',
  displayName: 'Emotion Town Square',
  description: 'Find emotions in the town square!',
  skillTags: ['emotion-literacy', 'identification'],
  defaultConfig: {},
  factory: (ctx) => new EmotionOcean(ctx),
});

export default EmotionOcean;
