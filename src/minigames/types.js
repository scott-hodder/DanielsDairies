// Shared typedefs for the mini-game framework.
// Pure JSDoc — no runtime exports needed, but we export an empty object
// so tooling treats this as a module.

/**
 * @typedef {Object} MiniGameContext
 * @property {string} gameId                 Stable id, e.g. "balloon-breathing"
 * @property {HTMLElement} container         Where the game mounts its DOM
 * @property {Object} config                 Per-instance config from roadblock.content_json
 * @property {"easy"|"medium"|"hard"} difficulty
 * @property {Object} child                  { id, name, age, ... } snapshot
 * @property {Object} a11y                   A11yConfig snapshot
 * @property {(eventName: string, data?: any) => void} emit  Telemetry emit
 * @property {Object} i18n                   { t: (key, vars?) => string }
 * @property {Object} audio                  AudioManager instance
 * @property {AbortSignal} signal            Aborted when user closes modal
 */

/**
 * @typedef {Object} MiniGameResult
 * @property {string} gameId
 * @property {boolean} completed             true = finished, false = gave up / failed
 * @property {boolean} success               Met the "win" threshold
 * @property {number} score                  Raw score
 * @property {number} starsEarned            0..3
 * @property {number} durationMs
 * @property {number} attempts
 * @property {string[]} skillTags            e.g. ["breathing","emotion-regulation"]
 * @property {Array<{t:number,name:string,data?:any}>} events  Telemetry
 */

/**
 * @typedef {Object} MiniGameDefinition
 * @property {string} id
 * @property {string} displayName
 * @property {string[]} skillTags
 * @property {(ctx: MiniGameContext) => import('./IMiniGame.js').default} factory
 * @property {Object} defaultConfig
 */

export {};
