// Adapter between RoadblockSystem and an individual mini-game.
//
// RoadblockSystem.openRoadblock() builds a modal and gives us:
//   - roadblock (DB row, content_json carries { game_id, difficulty, config })
//   - container (the .roadblock-modal-content element)
//   - spawn (passed back to completeRoadblock on success)
//
// We look up the game in the registry, construct it with a MiniGameContext,
// await its run() promise, and then tell the roadblock system how it went.

import { getGame } from './registry.js';
import { isMiniGamesEnabled } from './core/FeatureFlag.js';
import Telemetry from './core/Telemetry.js';
import Scorer from './core/Scorer.js';
import AudioManager from './shared/AudioManager.js';
import { createI18n } from './shared/i18n.js';
import { getA11yConfig } from './shared/A11yConfig.js';
import { difficultyForAge } from './content/difficulty.js';
import rewardBurst from './shared/RewardBurst.js';

/**
 * Attempt to run a mini-game for the given roadblock.
 * Returns true if handled, false if the caller should fall back to the legacy
 * roadblock handler (e.g. flag off or unknown game id).
 *
 * @param {Object} params
 * @param {Object} params.roadblock
 * @param {HTMLElement} params.container
 * @param {Object} params.spawn
 * @param {Object} params.child
 * @param {(spawn:any, success:boolean)=>Promise<void>} params.onComplete
 */
export async function tryRunMiniGame({ roadblock, container, spawn, child, onComplete }) {
  const enabled = await isMiniGamesEnabled();
  if (!enabled) return false;

  const cfg = roadblock?.content_json || {};
  const gameId = cfg.game_id;
  if (!gameId) return false;

  const def = getGame(gameId);
  if (!def) {
    console.warn(`[minigames] unknown game id: ${gameId}`);
    return false;
  }

  const difficulty = cfg.difficulty || difficultyForAge(child?.age);
  const a11y = getA11yConfig();
  const telemetry = new Telemetry();
  const audio = new AudioManager({ a11y });
  const i18n = createI18n('en');
  const abort = new AbortController();

  // Skill tools earned from completed adventures (town_play layer). The
  // dashboard shelf mirrors ids into localStorage; games read ctx.tools.
  let tools = [];
  try { tools = JSON.parse(localStorage.getItem('dd_tools_' + (child?.id || '')) || '[]'); } catch { /* ignore */ }

  const ctx = {
    gameId,
    container,
    config: { ...def.defaultConfig, ...(cfg.config || {}) },
    difficulty,
    child: child ? { id: child.id, name: child.name, age: child.age } : {},
    tools,
    a11y,
    emit: (name, data) => telemetry.emit(name, data),
    i18n,
    audio,
    signal: abort.signal,
  };

  // If the modal closes before the game finishes, signal abort so the game
  // can bail out of timers/animations cleanly.
  const overlay = document.getElementById('roadblockModal');
  const abortOnClose = () => abort.abort();
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) abortOnClose();
  });

  // Build the game.
  const game = def.factory(ctx);

  // Mercy path: a gate must never hard-block a child who can't win the game.
  // After 3 failed tries Daniel opens the gate for them (no stars).
  const mercyKey = `dd_gate_fails_${child?.id || 'guest'}_${roadblock?.id || gameId}`;
  const readFails = () => { try { return Number(localStorage.getItem(mercyKey) || 0); } catch { return 0; } };
  const writeFails = (n) => { try { localStorage.setItem(mercyKey, String(n)); } catch { /* ignore */ } };
  const clearFails = () => { try { localStorage.removeItem(mercyKey); } catch { /* ignore */ } };

  try {
    const result = await game.run();
    // Stars only on success. Failure = 0 stars always.
    if (!result.success) {
      result.starsEarned = 0;
    } else if (result.starsEarned == null) {
      const scorer = new Scorer(difficulty);
      result.starsEarned = scorer.stars(result.score || 0);
    }
    result.events = telemetry.snapshot();

    let mercyPass = false;
    if (result.success) {
      clearFails();
    } else {
      const fails = readFails() + 1;
      writeFails(fails);
      if (fails >= 3) {
        mercyPass = true;
        clearFails();
      }
    }

    await rewardBurst(container, {
      stars: result.starsEarned,
      message: result.success
        ? i18n.t('shared.wellDone')
        : (mercyPass ? 'You tried so hard — Daniel opens the gate for you! 🐾' : i18n.t('shared.tryAgain')),
    });

    await onComplete(spawn, !!result.success || mercyPass);
  } catch (err) {
    console.error('[minigames] game run failed', err);
    // Fail soft: let roadblock close without a reward.
    await onComplete(spawn, false);
  } finally {
    try { game.dispose(); } catch (e) { /* ignore */ }
    audio.dispose();
  }

  return true;
}
