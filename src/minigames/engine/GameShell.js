/**
 * GameShell — Polished intro / completion / failure screens for roadblock games.
 *
 * Design matches the main app: Navy #405878, Teal #14b8a6, Cream #fffff5, Gold #f6b700
 * Child-friendly, large text, rounded corners, clear CTAs.
 */

const DANIEL_IMAGES = {
  main: '/images/characters/DanielTheDog.webp',
  celebrating: '/images/characters/Daniel_Celebrating.webp',
  thinking: '/images/characters/Daniel_Thinking.webp',
  thumbsUp: '/images/characters/DanielTheDogThumbsUp.webp',
  building: '/images/characters/Daniel_Building.webp',
};

/**
 * Show a polished intro screen before the game starts.
 * @param {HTMLElement} container
 * @param {Object} opts - { title, story, controls, mobileControls, goal, danielImage }
 * @returns {Promise<void>} resolves when player clicks Start
 */
export function showIntroScreen(container, opts) {
  return new Promise((resolve) => {
    const { title, story, controls, goal, danielImage } = opts;
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const controlText = isMobile ? (opts.mobileControls || 'Tap and swipe') : (controls || 'Arrow keys + Space');

    const intro = document.createElement('div');
    intro.className = 'mg-intro-screen';
    intro.innerHTML = `
      <div class="mg-intro-card">
        <div class="mg-intro-badge">ROADBLOCK</div>
        <img src="${danielImage || DANIEL_IMAGES.main}" alt="Daniel" class="mg-intro-daniel" />
        <h2 class="mg-intro-title">${title}</h2>
        <p class="mg-intro-story">${story}</p>
        <div class="mg-intro-info">
          <div class="mg-intro-row">
            <span class="mg-intro-icon">🎮</span>
            <div>
              <span class="mg-intro-label">Controls</span>
              <span class="mg-intro-value">${controlText}</span>
            </div>
          </div>
          <div class="mg-intro-row">
            <span class="mg-intro-icon">🎯</span>
            <div>
              <span class="mg-intro-label">Goal</span>
              <span class="mg-intro-value">${goal}</span>
            </div>
          </div>
        </div>
        <button class="mg-intro-start">Let's Go!</button>
      </div>
    `;

    container.appendChild(intro);
    intro.querySelector('.mg-intro-start').addEventListener('click', () => {
      intro.remove();
      resolve();
    });
  });
}

/**
 * Show a completion screen (success or fail).
 * @returns {Promise<'retry'|'continue'>}
 */
export function showCompletionScreen(container, opts) {
  return new Promise((resolve) => {
    const { success, title, message, score, stars } = opts;

    const screen = document.createElement('div');
    screen.className = 'mg-completion-screen';

    const danielSrc = success ? DANIEL_IMAGES.celebrating : DANIEL_IMAGES.thinking;
    const heading = title || (success ? 'Roadblock Cleared!' : 'Not Quite!');
    const subtext = message || (success
      ? 'Great job helping Daniel! The path is now clear.'
      : "Don't worry — try again and you'll get it!");

    screen.innerHTML = `
      <div class="mg-completion-card">
        ${success ? '<div class="mg-completion-confetti"></div>' : ''}
        <img src="${danielSrc}" alt="Daniel" class="mg-completion-daniel ${success ? 'celebrating' : 'thinking'}" />
        <h2 class="mg-completion-title ${success ? 'success' : 'fail'}">${heading}</h2>
        <p class="mg-completion-message">${subtext}</p>
        ${stars != null && success ? `
          <div class="mg-completion-stars">
            ${[0, 1, 2].map(i => `<span class="mg-comp-star ${i < stars ? 'earned' : ''}" style="animation-delay:${i * 0.15}s">${i < stars ? '⭐' : '☆'}</span>`).join('')}
          </div>
        ` : ''}
        ${!success ? `
          <div class="mg-completion-encourage">
            <span class="mg-encourage-icon">💪</span>
            <span>Every try makes you stronger!</span>
          </div>
        ` : ''}
        <div class="mg-completion-buttons">
          ${!success ? '<button class="mg-completion-retry">Try Again</button>' : ''}
          <button class="mg-completion-continue">${success ? 'Continue' : 'Continue Anyway'}</button>
        </div>
      </div>
    `;

    container.appendChild(screen);

    const retryBtn = screen.querySelector('.mg-completion-retry');
    const continueBtn = screen.querySelector('.mg-completion-continue');

    if (retryBtn) {
      retryBtn.addEventListener('click', () => { screen.remove(); resolve('retry'); });
    }
    continueBtn.addEventListener('click', () => { screen.remove(); resolve('continue'); });
  });
}

export { DANIEL_IMAGES };

// ── Inject Styles ───────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('mg-shell-styles')) {
  const style = document.createElement('style');
  style.id = 'mg-shell-styles';
  style.textContent = `
    /* ── Intro Screen ────────────────────────── */
    .mg-intro-screen, .mg-completion-screen {
      position: absolute; inset: 0; z-index: 50;
      display: flex; align-items: center; justify-content: center;
      font-family: 'League Spartan', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .mg-intro-screen {
      background: linear-gradient(160deg, #fffff5 0%, #f2f5fb 50%, #e8ecf4 100%);
      overflow-y: auto;
    }
    .mg-intro-card {
      text-align: center; padding: 20px 20px 16px; max-width: 360px; width: 92%;
    }
    .mg-intro-badge {
      display: inline-block;
      background: linear-gradient(135deg, #405878, #4c6c96);
      color: #fff; font-size: 10px; font-weight: 800;
      letter-spacing: 1.5px; padding: 4px 14px;
      border-radius: 20px; margin-bottom: 12px;
    }
    .mg-intro-daniel {
      width: 80px; height: 80px; object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(64,88,120,0.2));
      animation: mg-intro-bounce 2s ease-in-out infinite;
      margin-bottom: 8px;
    }
    @keyframes mg-intro-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    .mg-intro-title {
      color: #405878; font-size: 22px; font-weight: 800; margin: 0 0 6px;
    }
    .mg-intro-story {
      color: #5a6e85; font-size: 14px; line-height: 1.5;
      margin: 0 0 16px; font-weight: 500;
    }
    .mg-intro-info {
      background: #fff; border-radius: 14px;
      border: 2px solid rgba(64,88,120,0.08);
      padding: 12px 16px; margin-bottom: 18px;
      text-align: left; display: flex; flex-direction: column; gap: 10px;
      box-shadow: 0 2px 8px rgba(64,88,120,0.06);
    }
    .mg-intro-row {
      display: flex; align-items: flex-start; gap: 10px;
    }
    .mg-intro-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
    .mg-intro-label {
      display: block; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
      color: #14b8a6; margin-bottom: 1px;
    }
    .mg-intro-value {
      display: block; font-size: 13px; color: #405878; font-weight: 600;
    }
    .mg-intro-start {
      background: linear-gradient(135deg, #14b8a6, #0d9488);
      color: #fff; border: none; border-radius: 14px;
      padding: 14px 40px; font-size: 18px; font-weight: 700;
      cursor: pointer; letter-spacing: 0.3px;
      box-shadow: 0 4px 16px rgba(20,184,166,0.35);
      transition: transform 0.15s, box-shadow 0.15s;
      font-family: inherit;
      min-height: 48px; /* touch-friendly minimum */
    }
    .mg-intro-start:hover { transform: scale(1.04); box-shadow: 0 6px 20px rgba(20,184,166,0.45); }
    .mg-intro-start:active { transform: scale(0.97); }

    /* ── Completion Screen ────────────────────── */
    .mg-completion-screen {
      background: linear-gradient(160deg, #fffff5 0%, #f2f5fb 50%, #e8ecf4 100%);
    }
    .mg-completion-card {
      text-align: center; padding: 28px 24px 20px;
      max-width: 340px; width: 92%; position: relative;
    }
    .mg-completion-confetti {
      position: absolute; inset: -20px; pointer-events: none; overflow: hidden;
    }
    .mg-completion-daniel {
      width: 80px; height: 80px; object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(64,88,120,0.2));
      margin-bottom: 10px;
    }
    .mg-completion-daniel.celebrating {
      animation: mg-celebrate-bounce 0.6s ease-out;
    }
    @keyframes mg-celebrate-bounce {
      0% { transform: scale(0) rotate(-10deg); }
      60% { transform: scale(1.15) rotate(5deg); }
      100% { transform: scale(1) rotate(0); }
    }
    .mg-completion-daniel.thinking {
      animation: mg-think-appear 0.4s ease-out;
    }
    @keyframes mg-think-appear {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .mg-completion-title {
      font-size: 22px; font-weight: 800; margin: 0 0 6px;
    }
    .mg-completion-title.success { color: #14b8a6; }
    .mg-completion-title.fail { color: #405878; }
    .mg-completion-message {
      color: #5a6e85; font-size: 14px; line-height: 1.5;
      margin: 0 0 16px; font-weight: 500;
    }
    .mg-completion-stars {
      margin: 8px 0 16px; display: flex; justify-content: center; gap: 6px;
    }
    .mg-comp-star {
      font-size: 32px; opacity: 0.25;
      display: inline-block;
    }
    .mg-comp-star.earned {
      opacity: 1;
      animation: mg-star-pop 0.4s ease-out forwards;
    }
    @keyframes mg-star-pop {
      0% { transform: scale(0); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }
    .mg-completion-encourage {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      background: rgba(99,102,241,0.08); border-radius: 12px;
      padding: 10px 16px; margin-bottom: 16px;
      font-size: 13px; font-weight: 600; color: #405878;
    }
    .mg-encourage-icon { font-size: 18px; }
    .mg-completion-buttons {
      display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
    }
    .mg-completion-retry {
      background: #fff; color: #405878;
      border: 2px solid rgba(64,88,120,0.2);
      border-radius: 12px; padding: 12px 24px;
      font-size: 15px; font-weight: 700; cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }
    .mg-completion-retry:hover { border-color: #405878; background: #f8f9fc; }
    .mg-completion-continue {
      background: linear-gradient(135deg, #14b8a6, #0d9488);
      color: #fff; border: none; border-radius: 12px;
      padding: 12px 24px; font-size: 15px; font-weight: 700;
      cursor: pointer; font-family: inherit;
      box-shadow: 0 4px 14px rgba(20,184,166,0.3);
      transition: all 0.15s;
    }
    .mg-completion-continue:hover { transform: scale(1.03); }
  `;
  document.head.appendChild(style);
}
