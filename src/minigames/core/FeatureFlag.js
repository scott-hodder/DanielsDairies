// Feature flag check for the whole mini-game system.
// Reads from the settings table via the shared settings cache used elsewhere.

import { getSettings } from '../../services/databaseService.js';

let cache = null;

export async function isMiniGamesEnabled() {
  if (cache !== null) return cache;
  try {
    // Use the shared database service which is available on every page.
    const settings = await getSettings();
    cache = settings?.feature_flags?.mini_games_enabled === true;
  } catch (err) {
    console.warn('[minigames] feature flag lookup failed, defaulting OFF', err);
    cache = false;
  }
  return cache;
}

export function __resetFlagCacheForTests() { cache = null; }
