// Test harness: call window.__testMiniGame('shield-sprint') etc.
// from the browser console to test any game in isolation.
// Or call window.__testAllMiniGames() to get a picker.

import { listGames } from './registry.js';
import { createI18n } from './shared/i18n.js';
import { getA11yConfig } from './shared/A11yConfig.js';
import AudioManager from './shared/AudioManager.js';
import Scorer from './core/Scorer.js';
import rewardBurst from './shared/RewardBurst.js';

function createTestModal(gameId) {
  // Remove existing
  const old = document.getElementById('mgTestOverlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'mgTestOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:linear-gradient(180deg,#fffff5 0%,#f2f5fb 100%);border-radius:24px;width:96vw;max-width:560px;height:90vh;max-height:720px;overflow:hidden;padding:0;position:relative;border:2px solid rgba(64,88,120,0.15);box-shadow:0 20px 60px rgba(43,58,85,0.3);display:flex;flex-direction:column;';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'position:absolute;top:8px;right:12px;background:rgba(0,0,0,0.15);border:none;font-size:18px;cursor:pointer;z-index:55;width:30px;height:30px;border-radius:50%;color:#fff;line-height:30px;text-align:center;';
  closeBtn.addEventListener('click', () => overlay.remove());
  modal.appendChild(closeBtn);

  const host = document.createElement('div');
  host.style.cssText = 'position:relative;flex:1;overflow:hidden;';
  modal.appendChild(host);

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  return { overlay, host };
}

window.__testMiniGame = async function (gameId) {
  const games = listGames();
  const def = games.find(g => g.id === gameId);
  if (!def) {
    console.error('Unknown game:', gameId, '— available:', games.map(g => g.id));
    return;
  }

  const { overlay, host } = createTestModal(gameId);
  const a11y = getA11yConfig();
  const audio = new AudioManager({ a11y });
  const i18n = createI18n('en');

  const ctx = {
    gameId: def.id,
    container: host,
    config: { ...def.defaultConfig },
    difficulty: 'easy',
    child: { id: 'test', name: 'Test Child', age: 7 },
    a11y,
    emit: (n, d) => console.log('[telemetry]', n, d),
    i18n,
    audio,
    signal: null,
  };

  const game = def.factory(ctx);
  try {
    const result = await game.run();
    // Stars are now auto-calculated in IMiniGame._finish, no manual override needed
    console.log('[test] Result:', result);
    await rewardBurst(host, { stars: result.starsEarned, message: result.success ? 'Well done!' : 'Nice try!' });
    setTimeout(() => overlay.remove(), 1800);
  } catch (err) {
    console.error('[test] Game error:', err);
  } finally {
    try { game.dispose(); } catch (e) {}
    audio.dispose();
  }
};

window.__testAllMiniGames = function () {
  const old = document.getElementById('mgTestOverlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'mgTestOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';

  const panel = document.createElement('div');
  panel.style.cssText = 'background:linear-gradient(180deg,#fffff5,#f2f5fb);border-radius:20px;padding:24px;width:90%;max-width:360px;border:2px solid rgba(64,88,120,0.15);box-shadow:0 20px 60px rgba(43,58,85,0.3);';
  panel.innerHTML = '<h3 style="margin:0 0 16px;font-size:18px;color:#405878;font-family:League Spartan,system-ui,sans-serif;font-weight:700;">Test Mini-Games</h3>';

  const games = listGames();
  games.forEach(g => {
    const btn = document.createElement('button');
    btn.textContent = g.displayName;
    btn.style.cssText = 'display:block;width:100%;padding:12px;margin-bottom:8px;border-radius:12px;border:2px solid rgba(64,88,120,0.15);background:#fff;font-weight:600;font-size:14px;cursor:pointer;text-align:left;color:#405878;font-family:League Spartan,system-ui,sans-serif;transition:all 0.15s;';
    btn.addEventListener('click', () => { overlay.remove(); window.__testMiniGame(g.id); });
    panel.appendChild(btn);
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = 'display:block;width:100%;padding:10px;border-radius:12px;border:none;background:linear-gradient(135deg,#405878,#4c6c96);color:#fff;font-weight:600;cursor:pointer;margin-top:4px;font-family:League Spartan,system-ui,sans-serif;';
  closeBtn.addEventListener('click', () => overlay.remove());
  panel.appendChild(closeBtn);

  overlay.appendChild(panel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
};
