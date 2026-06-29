/**
 * Breathing Bridge — Calm breathing builds a bridge piece by piece.
 *
 * Daniel stands at a broken road/bridge. The child breathes calmly to
 * rebuild it section by section. Each proper breath (hold to inhale into
 * the calm zone, then release) adds one bridge plank. After 4 calm breaths
 * the bridge is complete and Daniel crosses.
 *
 * SEL skill: breathing regulation, calm focus, self-regulation.
 */
import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { GameCanvas, InputManager, ParticleEmitter, HUD, TweenManager, showIntroScreen } from '../../engine/index.js';
import DanielPlayer from '../../engine/DanielPlayer.js';

// ── Constants ────────────────────────────────────────────────────────────────

const TOTAL_PIECES    = 4;
const INHALE_DURATION = 3.5;   // seconds to fill from 0 -> 100%
const EXHALE_DURATION = 2.0;   // seconds to drain on release
const CALM_LO         = 0.60;  // 60% fill — minimum for success
const CALM_HI         = 0.85;  // 85% fill — maximum for success
const TOO_TENSE_LVL   = 0.92;  // above this -> gentle reset

// ── Layout zone ratios ──────────────────────────────────────────────────────
// Zone 1: top 15%    — progress text
// Zone 2: next 40%   — breathing circle + instruction text
// Zone 3: bottom 45% — bridge scene (road, gap, water, Daniel)

const ZONE1_RATIO = 0.15;
const ZONE2_RATIO = 0.40;
// Zone 3 is the remaining 0.45

// ── Colours ──────────────────────────────────────────────────────────────────

const ROAD_COLOR      = '#4a4a4a';
const ROAD_EDGE_COLOR = '#e0c080';
const ROAD_LINE_COLOR = '#ffffff';
const PLANK_COLOR     = '#8B6914';
const PLANK_DARK      = '#5a4008';
const PLANK_RAIL      = '#c49a20';

// ── Game class ───────────────────────────────────────────────────────────────

class BreathingBridge extends IMiniGame {

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  mount() {
    const c = this.ctx.container;
    c.innerHTML = '';
    c.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:#6ec6f5;';

    this._gc       = new GameCanvas(c);
    this._input    = new InputManager(this._gc.canvas);
    this._particles = new ParticleEmitter();
    this._tweens   = new TweenManager();
    this._hud      = new HUD(c);

    const w = this._gc.width;
    const h = this._gc.height;
    this._w = w;
    this._h = h;

    // ── Zone boundaries ───────────────────────────────────────────────
    this._zone1Bottom = Math.round(h * ZONE1_RATIO);                       // end of progress text zone
    this._zone2Top    = this._zone1Bottom;                                  // start of breathing circle zone
    this._zone2Bottom = Math.round(h * (ZONE1_RATIO + ZONE2_RATIO));       // end of breathing circle zone
    this._zone3Top    = this._zone2Bottom;                                  // start of bridge scene zone

    // ── Breathing circle (centred in Zone 2) ──────────────────────────
    const zone2H      = this._zone2Bottom - this._zone2Top;
    this._circleR     = Math.min(Math.round(zone2H * 0.34), 80);
    this._circleX     = Math.round(w / 2);
    this._circleY     = Math.round(this._zone2Top + zone2H * 0.42);

    // ── Bridge scene layout (Zone 3) ──────────────────────────────────
    const zone3H      = h - this._zone3Top;
    this._groundY     = Math.round(this._zone3Top + zone3H * 0.28);        // top of road surface
    this._roadH       = Math.round(zone3H * 0.22);                        // road strip height
    this._waterBottom  = h;                                                 // water fills below road

    // Bridge gap centred horizontally
    const gapTotalW   = Math.round(w * 0.38);
    this._gapLeft     = Math.round((w - gapTotalW) / 2);
    this._gapRight    = this._gapLeft + gapTotalW;
    this._pieceW      = Math.round(gapTotalW / TOTAL_PIECES);

    // ── Daniel ────────────────────────────────────────────────────────
    const danielSize  = Math.round(zone3H * 0.30);
    this._daniel = new DanielPlayer({
      x: this._gapLeft - danielSize - 10,
      y: this._groundY - danielSize,
      size: danielSize,
      facing: 'right',
    });

    // ── Game state ────────────────────────────────────────────────────
    this._phase         = 'idle';   // idle | inhaling | exhaling | success_breath | crossing | complete
    this._fillLevel     = 0;        // 0-1
    this._piecesBuilt   = 0;
    this._animTime      = 0;
    this._statusText    = 'Hold to breathe in...';
    this._statusColor   = '#ffffff';
    this._feedbackTimer = 0;
    this._feedbackText  = '';
    this._brightness    = 0;        // 0-1 background brightness boost
    this._disposed      = false;
    this._timeouts      = [];

    // ── Input ─────────────────────────────────────────────────────────
    this._holding    = false;
    this._cleanupFns = [];
    this._bindInput();

    this._hud.setObjective('Take 4 calm breaths to build the bridge!');
  }

  async start() {
    await showIntroScreen(this.ctx.container, {
      title:          'Breathing Bridge',
      story:          "Daniel's bridge is broken! Take four calm breaths to build it one piece at a time. Hold to breathe in slowly, then let go when you're in the calm zone.",
      controls:       'Hold Space to breathe in, release to breathe out',
      mobileControls: 'Hold the screen to breathe in, release to breathe out',
      goal:           'Take 4 calm breaths to build the bridge!',
    });

    this._gc.run(
      (dt) => this._update(dt),
      (ctx) => this._render(ctx),
    );
  }

  dispose() {
    this._disposed = true;
    for (const id of (this._timeouts || [])) clearTimeout(id);
    this._timeouts = [];
    this._gc?.dispose();
    this._input?.dispose();
    this._hud?.dispose();
    for (const fn of this._cleanupFns) fn();
    super.dispose();
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  _bindInput() {
    const onDown = () => this._onHoldStart();
    const onUp   = () => this._onHoldEnd();

    this._gc.canvas.addEventListener('pointerdown', onDown);
    this._gc.canvas.addEventListener('pointerup',   onUp);
    this._gc.canvas.addEventListener('pointerleave', onUp);

    const onKeyDown = (e) => { if (e.code === 'Space') { e.preventDefault(); onDown(); } };
    const onKeyUp   = (e) => { if (e.code === 'Space') onUp(); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    this._cleanupFns = [
      () => this._gc.canvas.removeEventListener('pointerdown',  onDown),
      () => this._gc.canvas.removeEventListener('pointerup',    onUp),
      () => this._gc.canvas.removeEventListener('pointerleave', onUp),
      () => window.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('keyup',   onKeyUp),
    ];
  }

  _onHoldStart() {
    if (this._phase !== 'idle') return;
    this._phase      = 'inhaling';
    this._holding    = true;
    this._statusText = 'Breathe in slowly...';
    this._statusColor = '#a7f3d0';
  }

  _onHoldEnd() {
    if (this._phase !== 'inhaling') return;
    this._holding = false;
    this._phase   = 'exhaling';
    this._evaluateBreath();
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  _update(dt) {
    if (this._disposed) return;
    this._animTime += dt;
    this._tweens.update(dt);
    this._particles.update(dt);
    this._daniel.update(dt);

    if (this._feedbackTimer > 0) this._feedbackTimer -= dt;

    switch (this._phase) {
      case 'inhaling':
        this._fillLevel = Math.min(1, this._fillLevel + dt / INHALE_DURATION);
        if (this._fillLevel > TOO_TENSE_LVL) {
          this._holding = false;
          this._phase   = 'exhaling';
          this._evaluateBreath();
        }
        break;

      case 'exhaling':
        this._fillLevel = Math.max(0, this._fillLevel - dt / EXHALE_DURATION);
        if (this._fillLevel <= 0) {
          this._phase = 'idle';
        }
        break;

      case 'crossing':
        this._daniel.x += 90 * dt;
        this._daniel._state = 'walking';
        if (this._daniel.x >= this._gapRight + 20) {
          this._phase = 'complete';
          this._daniel.celebrate();
          this._hud.flash('You built the bridge with calm breathing!', '#4ade80');
          this._particles.emit({
            x: this._w / 2, y: this._groundY - 30,
            count: 30, color: '#FFD700', spread: 120, life: 1.2, shape: 'star',
          });
          const tc = setTimeout(() => {
            if (!this._disposed) {
              this._complete({ score: 1, skillTags: ['breathing', 'calm', 'self-regulation'] });
            }
          }, 1800);
          this._timeouts.push(tc);
        }
        break;
    }

    // Background brightens as bridge builds
    const targetBrightness = this._piecesBuilt / TOTAL_PIECES;
    this._brightness += (targetBrightness - this._brightness) * 2 * dt;
  }

  _evaluateBreath() {
    const fill = this._fillLevel;

    if (fill > TOO_TENSE_LVL) {
      this._statusText    = 'Too tense! Try a gentler breath';
      this._statusColor   = '#fde68a';
      this._feedbackText  = 'Try gentler';
      this._feedbackTimer = 1.8;
      this._hud.flash('Try a gentler breath next time', '#fb923c');
    } else if (fill < CALM_LO) {
      this._statusText    = 'Try a slower breath...';
      this._statusColor   = '#fde68a';
      this._feedbackText  = 'Try a slower breath!';
      this._feedbackTimer = 1.8;
      this._hud.flash('Hold a little longer next time!', '#fb923c');
    } else {
      // Success — calm zone
      this._piecesBuilt++;
      this._statusText    = 'Perfect breath!';
      this._statusColor   = '#4ade80';
      this._feedbackText  = 'Perfect!';
      this._feedbackTimer = 1.5;
      this._hud.flash(`Bridge piece ${this._piecesBuilt} of ${TOTAL_PIECES} added!`, '#4ade80');

      // Particle burst at the new piece
      const pieceScreenX = this._gapLeft + (this._piecesBuilt - 1) * this._pieceW + this._pieceW / 2;
      this._particles.emit({
        x: pieceScreenX, y: this._groundY - 4,
        count: 14, color: '#fbbf24', spread: 40, life: 0.7,
      });

      if (this._piecesBuilt >= TOTAL_PIECES) {
        // Bridge complete — start crossing after a short pause
        const tx = setTimeout(() => {
          if (!this._disposed) {
            this._phase = 'crossing';
            this._daniel._state = 'walking';
          }
        }, 600);
        this._timeouts.push(tx);
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  _render(ctx) {
    const w = this._w;
    const h = this._h;
    this._gc.clear();

    // Draw in layer order: background -> bridge scene -> breathing UI -> Daniel -> particles
    this._drawSky(ctx, w, h);
    this._drawBridgeScene(ctx, w, h);
    this._drawBreathingCircle(ctx, w, h);
    this._drawProgressText(ctx, w);
    this._drawInstructionText(ctx, w, h);
    this._daniel.render(ctx);
    this._particles.render(ctx);
  }

  // ── Zone 1: Sky & background ──────────────────────────────────────────────

  _drawSky(ctx, w, h) {
    const b = this._brightness;

    // Full sky gradient from top to bridge scene
    const topColor    = _lerpColor('#5ba8d9', '#87CEEB', b);
    const bottomColor = _lerpColor('#9fd9f0', '#d4f1ff', b);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this._zone3Top);
    skyGrad.addColorStop(0, topColor);
    skyGrad.addColorStop(1, bottomColor);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, this._zone3Top);

    // Clouds (slow drift)
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const clouds = [
      { bx: 0.10, by: 0.20, r: 22 },
      { bx: 0.35, by: 0.12, r: 18 },
      { bx: 0.62, by: 0.22, r: 26 },
      { bx: 0.85, by: 0.14, r: 16 },
    ];
    for (const cloud of clouds) {
      const cx = (cloud.bx * w + this._animTime * 5) % (w + 80) - 40;
      const cy = cloud.by * this._zone1Bottom;
      const r  = cloud.r;
      ctx.beginPath();
      ctx.arc(cx,           cy,           r,        0, Math.PI * 2);
      ctx.arc(cx + r * 0.9, cy - r * 0.3, r * 0.7, 0, Math.PI * 2);
      ctx.arc(cx - r * 0.8, cy - r * 0.2, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Zone 3: Bridge scene (road + gap + water + hills) ─────────────────────

  _drawBridgeScene(ctx, w, h) {
    const b  = this._brightness;
    const gY = this._groundY;
    const rH = this._roadH;

    // Sky fill behind the bridge zone
    const zoneTopColor = _lerpColor('#9fd9f0', '#d4f1ff', b);
    ctx.fillStyle = zoneTopColor;
    ctx.fillRect(0, this._zone3Top, w, h - this._zone3Top);

    // Distant hills behind road
    const hillBaseY = gY;
    ctx.fillStyle = _lerpColor('#4a9e4a', '#68c468', b);
    ctx.beginPath();
    ctx.moveTo(0, hillBaseY);
    for (let x = 0; x <= w; x += 4) {
      const y = hillBaseY - 20 - Math.sin(x * 0.013 + 1.2) * 16 - Math.sin(x * 0.025) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, hillBaseY);
    ctx.closePath();
    ctx.fill();

    // Closer hills
    ctx.fillStyle = _lerpColor('#3a8a3a', '#52b052', b);
    ctx.beginPath();
    ctx.moveTo(0, hillBaseY);
    for (let x = 0; x <= w; x += 4) {
      const y = hillBaseY - 8 - Math.sin(x * 0.019 + 2.5) * 8 - Math.sin(x * 0.035 + 1) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, hillBaseY);
    ctx.closePath();
    ctx.fill();

    // Water/mist beneath the bridge gap (gentle blue, not scary)
    const gl = this._gapLeft;
    const gr = this._gapRight;
    const waterTop = gY + rH;
    const waterGrad = ctx.createLinearGradient(0, gY, 0, h);
    waterGrad.addColorStop(0, '#6db8e0');
    waterGrad.addColorStop(0.3, '#5aa8d4');
    waterGrad.addColorStop(0.7, '#4a90c0');
    waterGrad.addColorStop(1, '#3a7aaa');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(gl, gY, gr - gl, h - gY);

    // Gentle water shimmer highlights
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const wy = waterTop + 6 + i * 10;
      const wx = gl + 12 + ((this._animTime * 14 + i * 30) % (gr - gl - 24));
      ctx.beginPath();
      ctx.ellipse(wx, wy, 16, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Left road section
    this._drawRoadSection(ctx, 0, gY, gl, rH);

    // Right road section
    this._drawRoadSection(ctx, gr, gY, w - gr, rH);

    // Ground/grass below roads (left and right)
    ctx.fillStyle = '#5db85d';
    ctx.fillRect(0, gY + rH, gl, h - gY - rH);
    ctx.fillRect(gr, gY + rH, w - gr, h - gY - rH);

    // Bridge pieces
    this._drawBridgePieces(ctx);
  }

  _drawRoadSection(ctx, x, gY, sectionW, rH) {
    if (sectionW <= 0) return;

    // Road surface
    ctx.fillStyle = ROAD_COLOR;
    ctx.fillRect(x, gY, sectionW, rH);

    // Top edge stripe (yellow)
    ctx.fillStyle = ROAD_EDGE_COLOR;
    ctx.fillRect(x, gY, sectionW, 3);

    // Bottom edge stripe
    ctx.fillStyle = ROAD_EDGE_COLOR;
    ctx.fillRect(x, gY + rH - 3, sectionW, 3);

    // Centre dashed white line
    ctx.fillStyle = ROAD_LINE_COLOR;
    const lineY = gY + rH / 2 - 1.5;
    const dashW = 18, gapW = 10, dashH = 3;
    const period = dashW + gapW;
    const offset = (this._animTime * 20) % period;
    for (let dx = -period + offset; dx < sectionW + period; dx += period) {
      const lx = x + dx;
      if (lx + dashW < x || lx > x + sectionW) continue;
      const clampedX = Math.max(x, lx);
      const clampedW = Math.min(x + sectionW, lx + dashW) - clampedX;
      if (clampedW > 0) ctx.fillRect(clampedX, lineY, clampedW, dashH);
    }
  }

  _drawBridgePieces(ctx) {
    const gl    = this._gapLeft;
    const gY    = this._groundY;
    const rH    = this._roadH;
    const pW    = this._pieceW;
    const built = this._piecesBuilt;

    for (let i = 0; i < TOTAL_PIECES; i++) {
      const px = gl + i * pW;

      if (i < built) {
        this._drawPlank(ctx, px, gY, pW, rH);
      } else {
        this._drawPlankOutline(ctx, px, gY, pW, rH, i === built);
      }
    }
  }

  _drawPlank(ctx, x, y, pw, rH) {
    // Main plank body
    ctx.fillStyle = PLANK_COLOR;
    ctx.fillRect(x, y, pw, rH);

    // Wood grain lines
    ctx.fillStyle = PLANK_DARK;
    const grainSpacing = Math.max(6, Math.floor(pw / 4));
    for (let gx = x + grainSpacing; gx < x + pw; gx += grainSpacing) {
      ctx.fillRect(gx, y, 2, rH);
    }

    // Top edge stripe (matches road)
    ctx.fillStyle = ROAD_EDGE_COLOR;
    ctx.fillRect(x, y, pw, 3);

    // Bottom edge stripe
    ctx.fillStyle = ROAD_EDGE_COLOR;
    ctx.fillRect(x, y + rH - 3, pw, 3);

    // Railings — posts and top rail
    ctx.fillStyle = PLANK_RAIL;
    const postH = Math.round(rH * 0.5);
    const postW = 3;
    // Left post
    ctx.fillRect(x + 1, y - postH, postW, postH);
    // Right post
    ctx.fillRect(x + pw - postW - 1, y - postH, postW, postH);
    // Top rail connecting posts
    ctx.fillRect(x, y - postH, pw, 3);
  }

  _drawPlankOutline(ctx, x, y, pw, rH, isNext) {
    ctx.save();

    // Dashed outline — brighter for the next piece to build
    ctx.strokeStyle = isNext ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = isNext ? 2.5 : 1.5;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -(this._animTime * 12 % 14);
    ctx.strokeRect(x + 3, y + 3, pw - 6, rH - 6);
    ctx.setLineDash([]);

    // Subtle fill for the next piece
    if (isNext) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + 3, y + 3, pw - 6, rH - 6);
    }

    ctx.restore();
  }

  // ── Zone 2: Breathing circle ──────────────────────────────────────────────

  _drawBreathingCircle(ctx, w, h) {
    if (this._phase === 'crossing' || this._phase === 'complete') return;

    const cx   = this._circleX;
    const cy   = this._circleY;
    const R    = this._circleR;
    const fill = this._fillLevel;

    ctx.save();

    // Soft drop shadow behind circle
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur  = 14;

    // Background track ring
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = R * 0.16;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Calm zone arc (green band) — drawn on the track at the 60-85% range
    const startAngle = -Math.PI / 2;
    const calmStart  = startAngle + CALM_LO * Math.PI * 2;
    const calmEnd    = startAngle + CALM_HI * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, calmStart, calmEnd);
    ctx.strokeStyle = 'rgba(74,222,128,0.5)';
    ctx.lineWidth   = R * 0.16 + 2;
    ctx.stroke();

    // "calm zone" label along the green arc
    const labelAngle = startAngle + (CALM_LO + (CALM_HI - CALM_LO) / 2) * Math.PI * 2;
    const labelR     = R + R * 0.32;
    const lx = cx + Math.cos(labelAngle) * labelR;
    const ly = cy + Math.sin(labelAngle) * labelR;
    ctx.fillStyle    = 'rgba(74,222,128,0.85)';
    ctx.font         = `bold ${Math.max(10, Math.round(R * 0.2))}px system-ui,sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('calm zone', lx, ly);

    // Fill arc — grows clockwise as the player holds
    if (fill > 0) {
      const fillEnd    = startAngle + fill * Math.PI * 2;
      const inCalmZone = fill >= CALM_LO && fill <= CALM_HI;
      const tooTense   = fill > TOO_TENSE_LVL;
      const arcColor   = tooTense   ? '#f97316'
                       : inCalmZone ? '#4ade80'
                       : '#14b8a6';

      ctx.beginPath();
      ctx.arc(cx, cy, R, startAngle, fillEnd);
      ctx.strokeStyle = arcColor;
      ctx.lineWidth   = R * 0.16;
      ctx.stroke();

      // Glow dot at the fill tip
      const tipX = cx + Math.cos(fillEnd) * R;
      const tipY = cy + Math.sin(fillEnd) * R;
      const tipGlow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, R * 0.22);
      tipGlow.addColorStop(0, arcColor);
      tipGlow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = tipGlow;
      ctx.beginPath();
      ctx.arc(tipX, tipY, R * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner circle — frosted glass centre
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.58, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();

    // Piece count in circle centre
    ctx.fillStyle    = '#ffffff';
    ctx.font         = `bold ${Math.round(R * 0.5)}px system-ui,sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur   = 4;
    ctx.fillText(`${this._piecesBuilt}/${TOTAL_PIECES}`, cx, cy);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // ── Zone 1: Progress text ─────────────────────────────────────────────────

  _drawProgressText(ctx, w) {
    if (this._phase === 'crossing' || this._phase === 'complete') return;

    const textY    = Math.round(this._zone1Bottom * 0.6);
    const fontSize = Math.max(14, Math.round(this._zone1Bottom * 0.3));

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = `${fontSize}px system-ui,sans-serif`;
    ctx.shadowColor  = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur   = 4;
    ctx.fillStyle    = 'rgba(255,255,255,0.9)';
    ctx.fillText(`Breaths: ${this._piecesBuilt}/${TOTAL_PIECES} pieces built`, w / 2, textY);
    ctx.restore();
  }

  // ── Instruction text (below breathing circle, still in Zone 2) ────────────

  _drawInstructionText(ctx, w, h) {
    const phase = this._phase;

    // Main instruction text
    let mainText = '';
    if (phase === 'idle') {
      mainText = 'Hold to breathe in...';
    } else if (phase === 'inhaling') {
      const fill = this._fillLevel;
      if (fill < CALM_LO) {
        mainText = 'Keep breathing in...';
      } else if (fill <= CALM_HI) {
        mainText = "You're in the calm zone!";
      } else {
        mainText = 'Slowly now - almost too much!';
      }
    } else if (phase === 'exhaling') {
      mainText = 'Breathe out gently...';
    } else if (phase === 'crossing') {
      mainText = 'Daniel is crossing!';
    } else if (phase === 'complete') {
      mainText = 'You built the bridge with calm breathing!';
    }

    // Position below the breathing circle, within Zone 2
    const textY    = this._circleY + this._circleR + Math.round((this._zone2Bottom - (this._circleY + this._circleR)) * 0.5);
    const fontSize = Math.max(15, Math.round(this._h * 0.032));

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = `bold ${fontSize}px system-ui,sans-serif`;
    ctx.shadowColor  = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur   = 5;
    ctx.fillStyle    = this._statusColor;
    ctx.fillText(mainText, w / 2, textY);

    // Feedback flash text (smaller, below main text)
    if (this._feedbackTimer > 0 && this._feedbackText) {
      const alpha  = Math.min(1, this._feedbackTimer / 0.4);
      const fbSize = Math.max(13, Math.round(this._h * 0.026));
      ctx.globalAlpha = alpha;
      ctx.font        = `${fbSize}px system-ui,sans-serif`;
      ctx.fillStyle   = '#fde68a';
      ctx.fillText(this._feedbackText, w / 2, textY + fontSize + 6);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}

// ── Colour interpolation helper ──────────────────────────────────────────────

function _hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function _lerpColor(hexA, hexB, t) {
  const a  = _hexToRgb(hexA);
  const b  = _hexToRgb(hexB);
  const r  = Math.round(a[0] + (b[0] - a[0]) * t);
  const g  = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

// ── Registration ─────────────────────────────────────────────────────────────

register({
  id:          'breathing-bridge',
  name:        'Breathing Bridge',
  displayName: 'Breathing Bridge',
  description: 'Use calm breathing to rebuild a broken bridge!',
  skillTags:   ['breathing', 'calm', 'self-regulation'],
  defaultConfig: {},
  factory: (ctx) => new BreathingBridge(ctx),
});

export default BreathingBridge;
