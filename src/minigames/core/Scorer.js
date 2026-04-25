// Standardised scoring → stars conversion.
// Every game produces a 0..1 "performance" number; Scorer turns it into 0..3 stars
// using difficulty-aware thresholds.

import { DIFFICULTY } from '../content/difficulty.js';

export default class Scorer {
  /** @param {"easy"|"medium"|"hard"} difficulty */
  constructor(difficulty = 'easy') {
    this.difficulty = difficulty;
    this.thresholds = DIFFICULTY[difficulty].starThresholds; // e.g. [0.4, 0.7, 0.9]
  }

  /** @param {number} performance 0..1 */
  stars(performance) {
    const p = Math.max(0, Math.min(1, performance));
    let stars = 0;
    for (const t of this.thresholds) if (p >= t) stars += 1;
    return stars;
  }

  /** Convenience: ratio of correct actions. */
  ratio(correct, total) {
    if (!total) return 0;
    return correct / total;
  }
}
