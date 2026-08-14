# Adventure Map Improvement Checklist

Based on deep audit of the Adventure Map feature (June 2025).

## Quick Wins (High Impact, Low Effort)

- [x] **1. Compress zone images to WebP** — 9.1MB PNGs down to 666KB WebP (93% reduction). Updated all references.
- [x] **2. Add Daniel bobbing animation at current node** — Already implemented via characterBounce animation (1.2s infinite bounce).
- [x] **3. Make locked nodes visually distinct** — Added lock badge icon, reduced opacity to 0.55, desaturated with filter, greyed emoji.
- [x] **4. Add glow/pulse on current node** — Already implemented via nextNodePulse, nextNodeGlow, and currentRing animations.
- [x] **5. Simplify header UI** — Collapsed entire header into single compact row: skill badge + cycle select + progress badge + zone dots.

## Visual Overhaul

- [x] **10. Replace zone background images** — Removed landscape PNGs (which were horizontal scenes used on a vertical scroll, causing road-into-sky issue). Replaced with vertically-tiling gradient backgrounds per zone that work naturally with vertical scrolling.
- [x] **11. Remove "Brain Pathways = Town Pathways" section** — Replaced verbose 4-step timeline with compact inline stage dots in the header row.
- [x] **12. Remove redundant skill banner** — Was duplicating info already shown in the skill badge.
- [x] **13. Tighten map layout** — Reduced topPadding, nodeSpacingY, pathAmplitude so road snakes more naturally and map is less sprawling.
- [x] **14. Slow down emoji shake** — Current node emoji wobble changed from 0.5s (jittery) to 2s (gentle).

## Medium Effort

- [x] **6. Add return-to-map celebration** — Module completion now navigates with ?completed=1, dashboard shows confetti + celebration popup on return.
- [x] **7. Improve node tooltip/preview** — Tooltips now show module title in bold + status text (was just status text before).
- [x] **8. Add prefetch for next module** — Module page URL is prefetched via `<link rel="prefetch">` when preview panel opens.

## Performance

- [x] **15. Speed up module unlock** — Removed redundant selectChild() call (3+ extra DB queries) after unlock. Local state is already updated, so map re-renders immediately.

## Larger Tasks (Skip Gold Tier)

- [x] **9. Split dashboard-enhanced.js** — Split from 3,715 lines into 4 files: `dashboard-enhanced.js` (2,433 — AdventureMapV4), `adventure-map-themes.js` (327 — theme configs), `adventure-map-styles.js` (373 — CSS), `enhanced-dashboard.js` (567 — EnhancedDashboard + init)
