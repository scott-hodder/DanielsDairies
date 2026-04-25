// Public entry for the mini-game framework.
// Importing this file is enough to make the controller available and
// register all known games (games self-register on import).

import './games/balloon-breathing/index.js';
import './games/thought-catcher/index.js';
import './games/emotion-match-trail/index.js';
import './games/calm-path/index.js';
import './games/coping-kit/index.js';
import './games/kindness-quest/index.js';
import './games/focus-fireflies/index.js';
import './games/self-talk-sprint/index.js';
import './ui/styles/minigame.css';
import './testAllGames.js';

export { tryRunMiniGame } from './MiniGameController.js';
export { isMiniGamesEnabled } from './core/FeatureFlag.js';
export { register, getGame, listGames, hasGame } from './registry.js';
export { default as IMiniGame } from './IMiniGame.js';
