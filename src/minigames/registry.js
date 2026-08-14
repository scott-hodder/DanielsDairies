// Central registry. Games register themselves here so the controller can
// look them up by id without the framework importing every game.

/** @type {Map<string, import('./types.js').MiniGameDefinition>} */
const registry = new Map();

/** @param {import('./types.js').MiniGameDefinition} def */
export function register(def) {
  if (!def?.id) throw new Error('Mini-game definition missing id');
  if (registry.has(def.id)) {
    console.warn(`[minigames] re-registering ${def.id}`);
  }
  registry.set(def.id, def);
}

export function getGame(id) { return registry.get(id); }
export function listGames() { return [...registry.values()]; }
export function hasGame(id) { return registry.has(id); }
