// Difficulty tier multipliers and star thresholds.
// Games read from here so tuning is centralised.

export const DIFFICULTY = {
  easy: {
    timeMultiplier: 1.5,   // 50% more time
    speedMultiplier: 0.8,
    targetCountMultiplier: 0.8,
    starThresholds: [0.3, 0.6, 0.85],
  },
  medium: {
    timeMultiplier: 1.0,
    speedMultiplier: 1.0,
    targetCountMultiplier: 1.0,
    starThresholds: [0.4, 0.7, 0.9],
  },
  hard: {
    timeMultiplier: 0.8,
    speedMultiplier: 1.25,
    targetCountMultiplier: 1.2,
    starThresholds: [0.5, 0.75, 0.95],
  },
};

/** Pick difficulty from child age with sane defaults. */
export function difficultyForAge(age) {
  if (!age || age <= 6) return 'easy';
  if (age <= 9) return 'medium';
  return 'hard';
}
