// Public entry for the mini-game framework.
// Importing this file is enough to make the controller available and
// register all known games (games self-register on import).

import './games/shield-sprint/index.js';
import './games/calm-river-rapids/index.js';
import './games/courage-canyon/index.js';
import './games/thought-forest/index.js';
import './games/emotion-ocean/index.js';
import './games/kindness-kingdom/index.js';
import './games/focus-firefly-forest/index.js';
import './games/coping-cave/index.js';
import './games/gratitude-garden/index.js';
import './games/breathing-bridge/index.js';

import './ui/styles/minigame.css';

// Dev-only test harness (window.__testMiniGame) — never shipped to production
if (import.meta.env?.DEV) {
  import('./testAllGames.js');
}

export { tryRunMiniGame } from './MiniGameController.js';
export { isMiniGamesEnabled } from './core/FeatureFlag.js';
export { register, getGame, listGames, hasGame } from './registry.js';
export { default as IMiniGame } from './IMiniGame.js';
