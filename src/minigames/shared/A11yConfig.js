// Snapshot of accessibility preferences. Games read these once at start.
// Later we can wire this to a per-child profile setting.

export function getA11yConfig() {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const highContrast = window.matchMedia?.('(prefers-contrast: more)').matches === true;

  return {
    reducedMotion,
    highContrast,
    bigText: false,      // future: per-child toggle
    silent: false,       // future: per-child mute
    holdToConfirm: false // future: requires 250ms press before an action counts
  };
}
