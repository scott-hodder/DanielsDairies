// Balloon Breathing Rescue — Press-and-hold arcade game
// Hold the screen/button to inflate a balloon. Release at the right size
// (green zone) to rescue it. Too small = it doesn't fly. Too big = it pops!
// Rescue enough balloons to win.

import IMiniGame from '../../IMiniGame.js';
import { register } from '../../registry.js';
import { DIFFICULTY } from '../../content/difficulty.js';

const COLORS = ['#ef4444','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#10b981','#f97316','#06b6d4'];

class BalloonBreathingGame extends IMiniGame {
  constructor(ctx) {
    super(ctx);
    const tier = DIFFICULTY[ctx.difficulty] || DIFFICULTY.easy;
    this.balloonsNeeded = Math.max(3, Math.round(5 * tier.targetCountMultiplier));
    this.rescued = 0;
    this.popped = 0;
    this.inflation = 0;       // 0..1
    this.inflating = false;
    this._raf = null;
    this._lastFrame = 0;
    this.greenZone = [0.45, 0.75]; // sweet spot
    this.inflateSpeed = 0.35 * tier.speedMultiplier; // per second
    this.balloonColor = COLORS[0];
  }

  mount() {
    const { container } = this.ctx;
    container.innerHTML = '';

    container.innerHTML = `
      <div class="mg-balloon-game">
        <div class="mg-balloon-sky">
          <div class="mg-balloon-rescued-row" id="mgRescuedRow"></div>
          <div class="mg-balloon-active">
            <div class="mg-balloon-v2" id="mgBalloon">
              <div class="mg-balloon-body-v2" id="mgBalloonBody"></div>
              <div class="mg-balloon-string-v2"></div>
            </div>
            <div class="mg-balloon-breathe" id="mgBreatheGuide">BREATHE IN 🌬️</div>
            <div class="mg-balloon-status" id="mgBalloonStatus">Hold to inflate!</div>
          </div>
          <div class="mg-balloon-meter-wrap">
            <div class="mg-balloon-meter">
              <div class="mg-balloon-meter-green" style="bottom:${this.greenZone[0]*100}%;height:${(this.greenZone[1]-this.greenZone[0])*100}%"></div>
              <div class="mg-balloon-meter-fill" id="mgMeterFill"></div>
              <div class="mg-balloon-meter-needle" id="mgNeedle"></div>
            </div>
          </div>
        </div>
        <div class="mg-balloon-hud">
          <span class="mg-hud-item">🎈 <span id="mgRescued">0</span> / ${this.balloonsNeeded}</span>
          <span class="mg-hud-item">💥 <span id="mgPopped">0</span> popped</span>
        </div>
        <button type="button" class="mg-balloon-hold-btn" id="mgHoldBtn">
          🎈 HOLD TO INFLATE
        </button>
      </div>
    `;

    this.balloon = container.querySelector('#mgBalloon');
    this.balloonBody = container.querySelector('#mgBalloonBody');
    this.meterFill = container.querySelector('#mgMeterFill');
    this.needle = container.querySelector('#mgNeedle');
    this.statusEl = container.querySelector('#mgBalloonStatus');
    this.rescuedEl = container.querySelector('#mgRescued');
    this.poppedEl = container.querySelector('#mgPopped');
    this.rescuedRow = container.querySelector('#mgRescuedRow');
    this.holdBtn = container.querySelector('#mgHoldBtn');
    this.breatheGuide = container.querySelector('#mgBreatheGuide');
  }

  start() {
    this._nextBalloon();

    const start = (e) => {
      e.preventDefault();
      this.inflating = true;
      this.breatheGuide.textContent = 'BREATHE IN... 🌬️';
      this.breatheGuide.className = 'mg-balloon-breathe inhale';
    };
    const stop = (e) => {
      e.preventDefault();
      this.breatheGuide.textContent = 'BREATHE OUT... 😌';
      this.breatheGuide.className = 'mg-balloon-breathe exhale';
      this._release();
    };

    this.holdBtn.addEventListener('mousedown', start);
    this.holdBtn.addEventListener('touchstart', start);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    this._cleanup = () => {
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
    };

    this._lastFrame = performance.now();
    this._loop();
  }

  _nextBalloon() {
    this.inflation = 0;
    this.inflating = false;
    this.balloonColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.balloonBody.style.background = `radial-gradient(circle at 35% 30%, ${this.balloonColor}99, ${this.balloonColor})`;
    this.balloon.className = 'mg-balloon-v2';
    this._updateVisuals();
    this.statusEl.textContent = 'Hold to inflate!';
    this.breatheGuide.textContent = 'BREATHE IN 🌬️';
    this.breatheGuide.className = 'mg-balloon-breathe';
  }

  _release() {
    if (!this.inflating) return;
    this.inflating = false;

    if (this.inflation >= this.greenZone[0] && this.inflation <= this.greenZone[1]) {
      // Perfect release — rescued!
      this.rescued += 1;
      this.rescuedEl.textContent = this.rescued;
      this.statusEl.textContent = '🎉 Rescued!';
      this.balloon.classList.add('rescued');
      this.ctx.audio.play('pop');
      // Add tiny balloon to rescued row
      const mini = document.createElement('span');
      mini.className = 'mg-mini-balloon';
      mini.style.color = this.balloonColor;
      mini.textContent = '🎈';
      this.rescuedRow.appendChild(mini);

      if (this.rescued >= this.balloonsNeeded) {
        setTimeout(() => this._win(), 600);
        return;
      }
    } else if (this.inflation > this.greenZone[1]) {
      // Popped!
      this.popped += 1;
      this.poppedEl.textContent = this.popped;
      this.statusEl.textContent = '💥 Too big! It popped!';
      this.balloon.classList.add('popped');
      this.ctx.audio.play('wrong');
    } else {
      // Too small
      this.statusEl.textContent = '↑ Too small! Try again.';
      this.ctx.audio.play('wrong');
    }
    setTimeout(() => this._nextBalloon(), 800);
  }

  _loop() {
    const now = performance.now();
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;

    if (this.inflating && this.state.is('playing')) {
      this.inflation = Math.min(1.05, this.inflation + this.inflateSpeed * dt);
      if (this.inflation >= 1.02) {
        // Auto-pop
        this.inflating = false;
        this.popped += 1;
        this.poppedEl.textContent = this.popped;
        this.statusEl.textContent = '💥 POP! Too much air!';
        this.balloon.classList.add('popped');
        this.ctx.audio.play('wrong');
        setTimeout(() => this._nextBalloon(), 800);
      }
    }
    this._updateVisuals();

    if (this.state.is('playing')) {
      this._raf = requestAnimationFrame(() => this._loop());
    }
  }

  _updateVisuals() {
    const s = 0.3 + this.inflation * 0.9; // scale 0.3..1.2
    this.balloon.style.transform = `scale(${s})`;
    this.meterFill.style.height = Math.min(100, this.inflation * 100) + '%';
    this.needle.style.bottom = Math.min(100, this.inflation * 100) + '%';

    // Color the meter fill based on zone
    if (this.inflation >= this.greenZone[0] && this.inflation <= this.greenZone[1]) {
      this.meterFill.style.background = '#10b981';
    } else if (this.inflation > this.greenZone[1]) {
      this.meterFill.style.background = '#ef4444';
    } else {
      this.meterFill.style.background = '#60a5fa';
    }
  }

  _win() {
    const penalty = Math.min(0.4, this.popped * 0.12);
    this._complete({
      score: Math.max(0, 1 - penalty),
      success: true,
      skillTags: ['breathing', 'self-regulation'],
    });
  }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._cleanup) this._cleanup();
    super.dispose();
  }
}

register({
  id: 'balloon-breathing',
  displayName: 'Balloon Breathing Rescue',
  skillTags: ['breathing', 'self-regulation'],
  factory: (ctx) => new BalloonBreathingGame(ctx),
  defaultConfig: { cyclesRequired: 5 },
});

export default {};
