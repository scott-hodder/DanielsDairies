# Roadblock Games Overhaul Checklist

Complete rebuild of the roadblock mini-games into proper lightweight games with playable characters, environments, movement, and obstacles.

## Phase 1: Shared Game Engine

- [x] **1.1 GameCanvas.js** — Canvas setup, resize handling, device pixel ratio, render loop (30fps cap), camera system (pan, shake, zoom)
- [x] **1.2 Sprite.js** — Base sprite class: position, velocity, size, rotation, draw, AABB collision rect, visibility, update/render cycle
- [ ] **1.3 SpriteSheet.js** — Procedural sprite generation using canvas drawing (circles, rects, arcs, paths). No image assets needed — DEFERRED (Daniel.js handles procedural drawing directly)
- [x] **1.4 ScrollingScene.js** — Parallax background with 3 layers (far, mid, near). Supports horizontal and vertical scroll. Procedural scenery (trees, rocks, clouds, waves)
- [x] **1.5 InputManager.js** — Unified touch/mouse/keyboard input. Virtual joystick for mobile. Arrow keys + spacebar for desktop. Swipe detection
- [x] **1.6 ParticleEmitter.js** — Lightweight particle system for atmosphere (sparkles, leaves, bubbles, rain, snow). Object pooling. Max 50 particles
- [ ] **1.7 CollisionGrid.js** — Spatial hash grid for efficient AABB collision detection between sprites — DEFERRED (inline collision used for now)
- [x] **1.8 HUD.js** — DOM overlay for game UI: health hearts, objective text, score, timer, progress bar
- [x] **1.9 DialogueBox.js** — DOM overlay for NPC dialogue and choice prompts. Speech bubble style. Supports 2-3 choice buttons
- [x] **1.10 Tween.js** — Simple easing/interpolation utility for camera moves, transitions, sprite animations
- [x] **1.11 Daniel.js** — Playable Daniel sprite with procedural drawing. States: idle (bobbing), walk (leg cycle), jump (arc), swim (paddle). Directional facing. Tail wag

## Phase 2: First 3 Games

- [x] **2.1 Shield Sprint** — Auto-runner. Daniel runs right through scrolling scene. Jump over small obstacles (swipe up / spacebar / tap). Dialogue prompt for reframe choices on large thought-clouds. Combo streak = rainbow trail. 3 sections with increasing speed. 290 lines
- [x] **2.2 Calm River Rapids** — Vertical scroller. Daniel on leaf-boat steered left/right. Dodge rocks, collect flowers. Calm zones (stay centered for bonus). Rapids sections speed up. Whirlpools pull sideways. 3 river sections. 310 lines
- [x] **2.3 Courage Canyon** — Side-scroll platformer. Hold to breathe in (Daniel floats up), release to descend. Navigate between stone pillars. Collect calm-orbs. Avoid storm clouds. Wind currents push. 3 canyon sections. 340 lines

## Phase 3: Next 3 Games

- [x] **3.1 Thought Forest** — Top-down adventure. Daniel walks through dark forest with lantern glow. Thorn barriers with negative thoughts. Find matching positive reframe orbs and bring to barriers. Shadow creatures patrol. Decoy orbs. Camera follows Daniel. 330 lines
- [x] **3.2 Emotion Ocean** — Underwater scene. Daniel swims with goggles + snorkel. 8 unique sea creatures (jellyfish, whale, pufferfish, octopus, starfish, turtle, crab, seahorse). Find prompted emotion. Correct = joins school following Daniel. Wrong = ink cloud blindness. 5 rounds. 340 lines
- [x] **3.3 Kindness Kingdom** — Top-down village quest. Scrollable village with buildings, roads, flowers. NPCs with emoji avatars + problems. Dialogue choices. Kind acts grow flowers + light windows. Village happiness meter. Non-linear exploration. 380 lines

## Phase 4: Final 4 Games

- [x] **4.1 Focus Firefly Forest** — Top-down stealth/tracking. Dark forest with lantern light mask (radial darkness). Fireflies peek/hide cycle. Sparkle trails. Owl hazards dim lantern. Jar fill display. 310 lines
- [x] **4.2 Coping Cave** — Dungeon explorer. 3 rooms with corridors, crystal decorations, vignette. Coping tools on glowing pedestals. Obstacles need matching tool. Backpack UI (3 slots). Daniel wears mining helmet. 370 lines
- [x] **4.3 Gratitude Garden** — Gardening screen. Dialogue prompts for gratitude categories. Procedural flowers with stems/petals/leaves. Drag rain cloud to water. Worry-weeds to tap. Butterflies arrive. Sun with rays. Fence. 340 lines
- [x] **4.4 Breathing Bridge** — Precision platformer. Hold = bridge extends, release = lock. Target zone indicator. Wind gusts on later bridges. Coins above gaps. Bridge collapse on overshoot. Platform grass tufts. 5 bridges. 320 lines

## Phase 5: Integration & Polish

- [ ] **5.1 Registry updates** — Register all new games, map to roadblock types, remove old game registrations
- [ ] **5.2 Enable feature flag** — Turn on mini_games_enabled by default (or remove flag entirely)
- [ ] **5.3 Roadblock type mapping** — Map each roadblock type (breathing, emotion_check, etc.) to the best-fit new game
- [ ] **5.4 Difficulty scaling** — Verify age-based difficulty from difficultyForAge() works with new games
- [ ] **5.5 Mobile testing** — Virtual joystick feel, touch targets, performance on low-end devices
- [ ] **5.6 Sound integration** — Wire up ctx.audio.play() calls for key game events
- [ ] **5.7 Accessibility** — Reduced motion support, sufficient contrast, screen reader announcements for key events
- [ ] **5.8 Remove legacy games** — Delete old 8 mini-game files once replacements are verified working

## Phase 6: Gold Tier (Future)

- [ ] **6.1 Daniel costume skins** — Unlock explorer hat, scuba gear, knight armor per game theme
- [ ] **6.2 Collectible sticker book** — Hidden bonus items in each game fill a dashboard sticker book
- [ ] **6.3 Challenge modes** — Harder variants with modifiers (fog, speed, fewer lives)
- [ ] **6.4 Game Arcade** — Replay completed roadblock games from dashboard section
- [ ] **6.5 Extended Gold games** — 3-minute versions with bonus stage

## Architecture Notes

- All games extend existing `IMiniGame` base class
- All games register via existing `register()` in registry
- Shared engine lives in `src/minigames/engine/`
- Daniel character in `src/minigames/characters/`
- New games replace old files in `src/minigames/games/`
- No external dependencies — pure DOM + Canvas 2D
- Procedural art only — no image assets to load
- Target: 30fps, max 50 active sprites, object pooling for particles
