// ================================================
// ROAD BUILDER - Brain Pathway Mini-Games
// Appears on the adventure map between zone transitions (every 3 modules).
// 10 psychologically-informed mini-games that rotate randomly.
// Each game builds emotional skills while fitting the road/journey metaphor.
// ================================================

import { getSupabaseClient } from '../../supabaseClient.js';
import { escapeHtml } from '../../lib/sanitize.js';

// Eagerly pull in the mini-game framework so games are registered and
// the feature flag is resolved before a user clicks a road-builder stop.
import { isMiniGamesEnabled, listGames } from '../../minigames/index.js';
import { createI18n } from '../../minigames/shared/i18n.js';
import { getA11yConfig } from '../../minigames/shared/A11yConfig.js';
import AudioManager from '../../minigames/shared/AudioManager.js';
import Scorer from '../../minigames/core/Scorer.js';
import { difficultyForAge } from '../../minigames/content/difficulty.js';

window.__miniGamesEnabledSync = false;
isMiniGamesEnabled()
  .then(function (v) { window.__miniGamesEnabledSync = v === true; })
  .catch(function () { window.__miniGamesEnabledSync = false; });

// Runs a random registered mini-game inside the given road-builder modal
// and calls `done(stars)` with 0-3 stars when the game completes.
// If anything goes wrong, falls back to awarding 1 star so the player
// isn't left stuck.
function runMiniGameInModal(modal, done, isAborted) {
  try {
    var games = listGames();
    if (!games || games.length === 0) { done(1); return; }

    var def = games[Math.floor(Math.random() * games.length)];

    // Build a container inside the modal that the game can own.
    var host = document.createElement('div');
    host.className = 'rb-minigame-host';
    host.style.padding = '16px';
    host.style.minHeight = '360px';
    modal.appendChild(host);

    var child = window.selectedChild || (window.state && window.state.selectedChild) || {};
    var difficulty = difficultyForAge(child.age);
    var a11y = getA11yConfig();
    var audio = new AudioManager({ a11y: a11y });
    var i18n = createI18n('en');

    var ctx = {
      gameId: def.id,
      container: host,
      config: Object.assign({}, def.defaultConfig || {}),
      difficulty: difficulty,
      child: { id: child.id, name: child.name, age: child.age },
      a11y: a11y,
      emit: function () {},
      i18n: i18n,
      audio: audio,
      signal: null,
    };

    var game = def.factory(ctx);
    game.run().then(function (result) {
      if (typeof isAborted === 'function' && isAborted()) {
        try { game.dispose(); } catch (e) {}
        audio.dispose();
        return;
      }
      var stars = result.starsEarned;
      if (stars == null) {
        var scorer = new Scorer(difficulty);
        stars = scorer.stars(result.score || 0);
      }
      if (!result.success) stars = Math.max(1, stars); // Always at least 1 for finishing.
      try { game.dispose(); } catch (e) {}
      audio.dispose();
      done(Math.max(1, Math.min(3, stars)));
    }).catch(function (err) {
      console.error('[minigame-in-modal] run failed', err);
      try { game.dispose(); } catch (e) {}
      done(1);
    });
  } catch (err) {
    console.error('[minigame-in-modal] setup failed', err);
    done(1);
  }
}

var STYLES_INJECTED = false;

// ================================================
// GAME CONTENT BANKS
// ================================================

var HELPFUL_THOUGHTS = [
  "I can try my best",
  "Mistakes help me learn",
  "I can ask for help",
  "One step at a time",
  "I'm getting better every day",
  "It's okay to feel nervous",
  "I can do hard things",
  "Every expert was once a beginner",
  "I don't have to be perfect",
  "I can try again tomorrow"
];

var UNHELPFUL_THOUGHTS = [
  "I can't do anything right",
  "Everyone will laugh at me",
  "I'll never be good enough",
  "What's the point of trying",
  "I always mess everything up",
  "Nobody likes me",
  "I'm the worst at this",
  "It's too hard, I give up",
  "I should just stay quiet",
  "Something bad will definitely happen"
];

var GOOD_COPING = [
  { text: "Take a deep breath", icon: "🌬️" },
  { text: "Ask for help", icon: "🤝" },
  { text: "Kind self-talk", icon: "💬" },
  { text: "Take a break", icon: "☕" },
  { text: "Talk to someone", icon: "🗣️" },
  { text: "Go for a walk", icon: "🚶" },
  { text: "Count to ten", icon: "🔢" },
  { text: "Draw how I feel", icon: "🎨" }
];

var BAD_COPING = [
  { text: "Yell at everyone", icon: "😤" },
  { text: "Throw things", icon: "💥" },
  { text: "Blame someone else", icon: "👉" },
  { text: "Bottle it all up", icon: "🫙" },
  { text: "Say mean things", icon: "😠" },
  { text: "Give up completely", icon: "🚫" }
];

var EMOTIONS_AND_TOOLS = [
  { emotion: "Nervous", emoji: "😰", tools: ["deep breathing", "talk to someone"], wrong: ["ignore it", "stay alone"] },
  { emotion: "Angry", emoji: "😡", tools: ["count to ten", "take a break"], wrong: ["yell louder", "break things"] },
  { emotion: "Sad", emoji: "😢", tools: ["talk to a friend", "do something kind for yourself"], wrong: ["pretend you're fine", "push people away"] },
  { emotion: "Frustrated", emoji: "😤", tools: ["take a deep breath", "try a different way"], wrong: ["give up", "blame others"] },
  { emotion: "Worried", emoji: "😟", tools: ["write it down", "ask for help"], wrong: ["keep it secret", "think about it all night"] },
  { emotion: "Overwhelmed", emoji: "🥺", tools: ["one thing at a time", "quiet break"], wrong: ["do nothing at all", "rush through everything"] }
];

var BRAVE_SCENARIOS = [
  {
    situation: "Daniel feels shy at a new club",
    steps: [
      { text: "Smile at someone nearby", correct: true },
      { text: "Run away and hide", correct: false },
      { text: "Stand near a friendly group", correct: true },
      { text: "Never go back again", correct: false }
    ]
  },
  {
    situation: "Daniel is nervous about a test",
    steps: [
      { text: "Study a little bit each day", correct: true },
      { text: "Pretend the test doesn't exist", correct: false },
      { text: "Ask a friend to study together", correct: true },
      { text: "Tell yourself you'll definitely fail", correct: false }
    ]
  },
  {
    situation: "Daniel wants to try something new but feels scared",
    steps: [
      { text: "Watch someone else try it first", correct: true },
      { text: "Never try anything new", correct: false },
      { text: "Take one small step", correct: true },
      { text: "Wait until fear goes away completely", correct: false }
    ]
  },
  {
    situation: "Daniel has to speak in front of the class",
    steps: [
      { text: "Practise with a friend first", correct: true },
      { text: "Pretend to be sick", correct: false },
      { text: "Take three deep breaths before starting", correct: true },
      { text: "Rush through it as fast as possible", correct: false }
    ]
  }
];

var TRAFFIC_LIGHT_ITEMS = [
  { text: "My heart is racing", color: "yellow", reason: "Check in with how you feel" },
  { text: "Take one deep breath", color: "green", reason: "A safe, helpful step" },
  { text: "Yell at everyone around me", color: "red", reason: "Pause - this could hurt others" },
  { text: "I feel a bit nervous", color: "yellow", reason: "Notice the feeling first" },
  { text: "Ask a grown-up for help", color: "green", reason: "A safe, helpful step" },
  { text: "Throw my things on the ground", color: "red", reason: "Pause - take a moment" },
  { text: "My hands feel shaky", color: "yellow", reason: "Your body is telling you something" },
  { text: "Talk to a friend about it", color: "green", reason: "Connection helps" },
  { text: "Say something mean to someone", color: "red", reason: "Pause - words can hurt" },
  { text: "Count slowly to five", color: "green", reason: "A calm, helpful step" },
  { text: "I want to run away", color: "yellow", reason: "Check in - what do you need?" },
  { text: "Slam the door really hard", color: "red", reason: "Pause - find a calmer way" }
];

var GRATITUDE_PROMPTS = [
  "Something fun that happened today",
  "A person who makes you smile",
  "Something you're good at",
  "A place that makes you feel safe",
  "Something kind someone did for you",
  "A food you really enjoy",
  "Something in nature you like",
  "A memory that makes you happy",
  "Something new you learned",
  "Someone who believes in you"
];

var SPOTLIGHT_ITEMS = [
  { text: "Lantern", emoji: "🏮", helpful: true },
  { text: "Friend", emoji: "👋", helpful: true },
  { text: "Breathing balloon", emoji: "🎈", helpful: true },
  { text: "Map", emoji: "🗺️", helpful: true },
  { text: "Cosy blanket", emoji: "🧸", helpful: true },
  { text: "Calm music", emoji: "🎵", helpful: true },
  { text: "Worry cloud", emoji: "🌧️", helpful: false },
  { text: "Scary shadow", emoji: "👻", helpful: false },
  { text: "Loud alarm", emoji: "🔔", helpful: false }
];

// ================================================
// STYLES
// ================================================

function injectStyles() {
  if (STYLES_INJECTED) return;
  STYLES_INJECTED = true;

  var css = [];

  // Overlay & modal
  css.push('.rb-overlay { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); animation: rbFadeIn 0.3s ease; }');
  css.push('@keyframes rbFadeIn { from { opacity: 0; } to { opacity: 1; } }');
  css.push('.rb-modal { position: relative; width: 94vw; max-width: 500px; max-height: 92vh; overflow-y: auto; border-radius: 24px; padding: 28px 22px 24px; color: #fff; font-family: "Fredoka", "League Spartan", sans-serif; animation: rbSlideUp 0.4s ease; box-shadow: 0 20px 60px rgba(0,0,0,0.6); }');
  css.push('@keyframes rbSlideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }');
  css.push('.rb-modal::-webkit-scrollbar { width: 0; }');

  // Header
  css.push('.rb-header { text-align: center; margin-bottom: 16px; }');
  css.push('.rb-daniel { width: 155px; height: 155px; object-fit: contain; margin-bottom: 8px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4)); animation: rbFloat 3s ease-in-out infinite; }');
  css.push('@keyframes rbFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }');
  css.push('.rb-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; }');
  css.push('.rb-subtitle { font-size: 16px; opacity: 0.75; margin: 0 0 6px; line-height: 1.4; }');

  // Game area
  css.push('.rb-game-area { background: rgba(0,0,0,0.25); border-radius: 18px; padding: 18px 16px; margin-bottom: 14px; min-height: 180px; }');

  // Choice buttons (used by many games)
  css.push('.rb-choices { display: flex; flex-direction: column; gap: 10px; }');
  css.push('.rb-choice { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 14px; border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); cursor: pointer; transition: all 0.2s ease; font-family: "Fredoka", sans-serif; font-size: 14px; color: #fff; text-align: left; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }');
  css.push('.rb-choice:hover, .rb-choice:active { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.4); }');
  css.push('.rb-choice.correct { background: rgba(74, 222, 128, 0.25); border-color: #4ade80; animation: rbPop 0.3s ease; }');
  css.push('.rb-choice.wrong { background: rgba(248, 113, 113, 0.25); border-color: #f87171; animation: rbShake 0.4s ease; }');
  css.push('.rb-choice.disabled { pointer-events: none; opacity: 0.5; }');
  css.push('.rb-choice-icon { font-size: 20px; flex-shrink: 0; }');
  css.push('@keyframes rbPop { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }');
  css.push('@keyframes rbShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }');

  // Scenario / prompt text
  css.push('.rb-prompt { text-align: center; font-size: 15px; font-weight: 600; margin-bottom: 14px; padding: 10px; background: rgba(255,255,255,0.08); border-radius: 12px; line-height: 1.4; }');
  css.push('.rb-instruction { text-align: center; font-size: 12px; opacity: 0.6; margin-bottom: 10px; }');

  // Progress
  css.push('.rb-progress-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-bottom: 10px; overflow: hidden; }');
  css.push('.rb-progress-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; width: 0%; }');
  css.push('.rb-progress-label { text-align: center; font-size: 12px; opacity: 0.6; margin-bottom: 4px; }');
  css.push('.rb-score { text-align: center; font-size: 13px; font-weight: 600; margin-bottom: 8px; }');

  // Feedback toast
  css.push('.rb-feedback { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 16px; font-weight: 700; padding: 10px 20px; border-radius: 14px; pointer-events: none; animation: rbFeedbackPop 1s ease forwards; z-index: 5; text-align: center; }');
  css.push('@keyframes rbFeedbackPop { 0% { transform: translate(-50%,-50%) scale(0.7); opacity: 0; } 15% { transform: translate(-50%,-50%) scale(1.05); opacity: 1; } 70% { opacity: 1; } 100% { transform: translate(-50%,-60%) scale(1); opacity: 0; } }');

  // Traffic light buttons
  css.push('.rb-tl-buttons { display: flex; gap: 10px; justify-content: center; margin-top: 14px; }');
  css.push('.rb-tl-btn { width: 70px; height: 70px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.3); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-family: "Fredoka",sans-serif; font-size: 11px; font-weight: 700; color: #fff; gap: 2px; }');
  css.push('.rb-tl-btn:hover { transform: scale(1.08); }');
  css.push('.rb-tl-btn.red { background: #ef4444; }');
  css.push('.rb-tl-btn.yellow { background: #f59e0b; }');
  css.push('.rb-tl-btn.green { background: #22c55e; }');

  // Breathing circle
  css.push('.rb-breath-circle { width: 140px; height: 140px; border-radius: 50%; margin: 20px auto; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; transition: all 0.3s; }');
  css.push('.rb-breath-instruction { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 10px; min-height: 28px; }');
  css.push('.rb-breath-count { text-align: center; font-size: 13px; opacity: 0.7; }');

  // Spotlight
  css.push('.rb-spotlight-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }');
  css.push('.rb-spot-cell { aspect-ratio: 1; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; transition: all 0.3s; font-size: 12px; font-weight: 600; text-align: center; user-select: none; -webkit-user-select: none; }');
  css.push('.rb-spot-cell.dark { background: rgba(0,0,0,0.6); color: rgba(255,255,255,0.3); }');
  css.push('.rb-spot-cell.revealed { background: rgba(255,255,255,0.15); color: #fff; }');
  css.push('.rb-spot-cell.found { background: rgba(74,222,128,0.25); border: 2px solid #4ade80; color: #fff; }');
  css.push('.rb-spot-cell.avoid { background: rgba(248,113,113,0.25); border: 2px solid #f87171; color: #fff; }');
  css.push('.rb-spot-emoji { font-size: 28px; }');

  // Gratitude flowers
  css.push('.rb-garden { display: flex; gap: 12px; justify-content: center; margin: 14px 0; min-height: 60px; }');
  css.push('.rb-flower { font-size: 36px; animation: rbGrow 0.5s cubic-bezier(0.34,1.56,0.64,1); }');
  css.push('@keyframes rbGrow { from { transform: scale(0); } to { transform: scale(1); } }');
  css.push('.rb-gratitude-input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color: #fff; font-family: "Fredoka",sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; }');
  css.push('.rb-gratitude-input:focus { border-color: rgba(255,255,255,0.5); }');
  css.push('.rb-gratitude-input::placeholder { color: rgba(255,255,255,0.4); }');
  css.push('.rb-plant-btn { display: block; margin: 10px auto 0; padding: 10px 28px; border-radius: 12px; border: none; font-family: "Fredoka",sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }');

  // Celebration
  css.push('.rb-celebration { text-align: center; animation: rbSlideUp 0.5s ease; }');
  css.push('.rb-celeb-daniel { width: 155px; height: 155px; object-fit: contain; margin-bottom: 12px; animation: rbFloat 2.5s ease-in-out infinite; filter: drop-shadow(0 6px 20px rgba(0,0,0,0.3)); }');
  css.push('.rb-celeb-title { font-size: 26px; font-weight: 700; margin: 0 0 10px; }');
  css.push('.rb-celeb-sub { font-size: 16px; opacity: 0.9; margin: 0 0 16px; line-height: 1.5; }');
  css.push('.rb-stars-badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-size: 18px; font-weight: 700; padding: 10px 24px; border-radius: 30px; box-shadow: 0 4px 16px rgba(245,158,11,0.4); margin-bottom: 16px; animation: rbPopIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; }');
  css.push('@keyframes rbPopIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }');
  css.push('.rb-continue-btn { display: inline-block; background: #405878; color: #fff; border: none; padding: 14px 36px; border-radius: 14px; font-family: "Fredoka",sans-serif; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(64,88,120,0.3); }');
  css.push('.rb-continue-btn:hover { background: #2d4060; transform: translateY(-2px); }');

  // Close
  css.push('.rb-close { position: absolute; top: 12px; right: 14px; background: rgba(255,255,255,0.15); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 2; }');
  css.push('.rb-close:hover { background: rgba(255,255,255,0.25); }');

  // Confetti
  css.push('.rb-confetti-wrap { position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: 24px; }');
  css.push('.rb-confetti { position: absolute; width: 8px; height: 8px; border-radius: 2px; animation: rbConfetti 2.5s ease-in forwards; }');
  css.push('@keyframes rbConfetti { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(600px) rotate(720deg); opacity: 0; } }');

  // Map node
  css.push('.adventure-node.road-builder { position: absolute; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(145deg, #fff 0%, #f0f0f0 100%); border: 3px solid #f59e0b; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 8; box-shadow: 0 4px 15px rgba(0,0,0,0.15), 0 0 0 4px rgba(245,158,11,0.2); animation: rbNodePulse 2s ease-in-out infinite; }');
  css.push('.adventure-node.road-builder:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0,0,0,0.2), 0 0 0 6px rgba(245,158,11,0.3); }');
  css.push('.adventure-node.road-builder .node-emoji { font-size: 24px; }');
  css.push('.adventure-node.road-builder .node-badge { position: absolute; bottom: -6px; right: -6px; }');
  css.push('.adventure-node.road-builder .rb-reward-badge { position: absolute; bottom: -8px; right: -8px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 700; color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2); white-space: nowrap; font-family: "Fredoka",sans-serif; }');
  css.push('.adventure-node.road-builder.completed { background: linear-gradient(145deg, #d4edda 0%, #c3e6cb 100%); border-color: #28a745; animation: none; opacity: 0.8; cursor: default; }');
  css.push('.adventure-node.road-builder.completed .rb-checkmark { position: absolute; bottom: -6px; right: -6px; width: 22px; height: 22px; background: #28a745; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }');
  css.push('.adventure-node.road-builder.locked { opacity: 0.5; animation: none; cursor: default; border-color: #9ca3af; }');
  css.push('@keyframes rbNodePulse { 0%,100% { box-shadow: 0 4px 15px rgba(0,0,0,0.15), 0 0 0 4px rgba(245,158,11,0.2); } 50% { box-shadow: 0 4px 20px rgba(0,0,0,0.2), 0 0 0 8px rgba(245,158,11,0.15); } }');

  // Responsive
  css.push('@media (max-width: 480px) { .rb-modal { padding: 20px 14px 18px; } .rb-title { font-size: 17px; } .rb-daniel { width: 120px; height: 120px; } .rb-tl-btn { width: 58px; height: 58px; font-size: 10px; } .rb-breath-circle { width: 110px; height: 110px; } }');

  var el = document.createElement('style');
  el.id = 'road-builder-styles';
  el.textContent = css.join('\n');
  document.head.appendChild(el);
}

// ================================================
// STORAGE
// ================================================

function storageKey(childId, zone) {
  return 'roadBuilder_' + childId + '_zone_' + zone;
}

export function isRoadBuilderComplete(childId, zone) {
  try { return localStorage.getItem(storageKey(childId, zone)) === 'true'; }
  catch (e) { return false; }
}

function markComplete(childId, zone) {
  try { localStorage.setItem(storageKey(childId, zone), 'true'); }
  catch (e) { /* silent */ }
}

// ================================================
// INJECT ROAD BUILDER STOPS INTO MODULE LIST
// ================================================

export function injectRoadBuilderStops(modules) {
  if (!modules || modules.length < 3) return modules;
  var child = window.selectedChild || (window.state && window.state.selectedChild) || null;
  var childId = child ? child.id : 'unknown';
  var insertPositions = [3, 6, 9];
  var result = [];
  var moduleIndex = 0;
  var insertIndex = 0;

  for (var i = 0; i < modules.length; i++) {
    result.push(modules[i]);
    moduleIndex++;
    if (insertIndex < insertPositions.length && moduleIndex === insertPositions[insertIndex]) {
      var zoneTransition = insertIndex + 1;
      var completed = isRoadBuilderComplete(childId, zoneTransition);
      var allPrevComplete = true;
      for (var j = 0; j <= i; j++) {
        if (modules[j].status !== 'completed') { allPrevComplete = false; break; }
      }
      var status = completed ? 'completed' : (allPrevComplete ? 'available' : 'locked');
      result.push({
        isRoadBuilder: true,
        id: 'road-builder-' + zoneTransition,
        name: 'Road Builder',
        status: status,
        completed: completed,
        zoneTransition: zoneTransition,
        locked: status === 'locked',
        canUnlock: false
      });
      insertIndex++;
    }
  }
  return result;
}

// ================================================
// GAME BACKGROUNDS
// ================================================

var GAME_BG = 'linear-gradient(135deg, #405878 0%, #344a64 50%, #2d4060 100%)';

// ================================================
// MAIN ENTRY - Opens a random game
// ================================================

export function openRoadBuilderGame(zoneTransition, onComplete) {
  injectStyles();
  var legacyGames = [
    gameCalmTraffic,
    gameFixThoughtRoad,
    gameFeelingsFuelSort,
    gameSpotlightSearch,
    gameBridgeBuilder,
    gameWorryCloudPop,
    gameMoodMatchGarage,
    gameBraveSteps,
    gameGratitudeGarden,
    gameTrafficLight
  ];
  var bg = GAME_BG;
  var gameFn = legacyGames[Math.floor(Math.random() * legacyGames.length)];

  // When the mini-games flag is on, swap the legacy game for a random
  // mini-game from the new framework. Fallback to legacy if the flag is
  // off, the framework fails to load, or no games are registered.
  var useMiniGame = false;
  try {
    useMiniGame = window.__miniGamesEnabledSync === true;
  } catch (e) { useMiniGame = false; }
  var aborted = false;
  if (useMiniGame) {
    gameFn = function (modal, done) {
      runMiniGameInModal(modal, done, function() { return aborted; });
    };
  }

  // Build modal shell
  var overlay = document.createElement('div');
  overlay.className = 'rb-overlay';

  var modal = document.createElement('div');
  modal.className = 'rb-modal';
  modal.style.background = bg;

  var closeBtn = document.createElement('button');
  closeBtn.className = 'rb-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', function() { cleanup(); });
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) cleanup();
  });

  function cleanup() {
    aborted = true;
    overlay.remove();
    document.body.style.overflow = '';
  }

  function onGameComplete(stars) {
    var child = window.selectedChild || (window.state && window.state.selectedChild) || null;
    var childId = child ? child.id : 'unknown';
    markComplete(childId, zoneTransition);
    awardStars(child, stars);
    showCelebration(modal, stars, bg, zoneTransition, function() {
      cleanup();
      if (typeof onComplete === 'function') onComplete();
    });
  }

  // Run the selected game
  gameFn(modal, onGameComplete);
}

// ================================================
// SHARED HELPERS
// ================================================

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function makeHeader(modal, title, subtitle, danielSrc) {
  var header = document.createElement('div');
  header.className = 'rb-header';
  var img = document.createElement('img');
  img.className = 'rb-daniel';
  img.src = danielSrc || '/images/characters/DanielTheDog.webp';
  img.alt = 'Daniel';
  header.appendChild(img);
  var h = document.createElement('h2');
  h.className = 'rb-title';
  h.textContent = title;
  header.appendChild(h);
  if (subtitle) {
    var p = document.createElement('p');
    p.className = 'rb-subtitle';
    p.textContent = subtitle;
    header.appendChild(p);
  }
  modal.appendChild(header);
  return header;
}

function makeProgressBar(modal, color) {
  var bar = document.createElement('div');
  bar.className = 'rb-progress-bar';
  var fill = document.createElement('div');
  fill.className = 'rb-progress-fill';
  fill.style.background = color || '#4ade80';
  bar.appendChild(fill);
  modal.appendChild(bar);
  return fill;
}

function showFeedback(container, text, isGood) {
  var fb = document.createElement('div');
  fb.className = 'rb-feedback';
  fb.textContent = text;
  fb.style.background = isGood ? 'rgba(74,222,128,0.9)' : 'rgba(248,113,113,0.9)';
  fb.style.color = '#fff';
  container.appendChild(fb);
  setTimeout(function() { if (fb.parentNode) fb.remove(); }, 1000);
}

// ================================================
// CELEBRATION SCREEN
// ================================================

function showCelebration(modal, stars, bg, zoneTransition, onContinue) {
  modal.innerHTML = '';
  modal.style.background = bg;

  var ZONE_MESSAGES = [
    "With your help, the trailhead has grown into a little village! Your brain pathways are building new connections.",
    "Amazing - the village has grown into a busy town! Your brain connections are getting stronger and faster.",
    "Incredible - the town has become a whole city! Your brain network is powerful and well-connected."
  ];
  var zoneMsg = ZONE_MESSAGES[Math.min(zoneTransition - 1, ZONE_MESSAGES.length - 1)];

  // Confetti
  var cWrap = document.createElement('div');
  cWrap.className = 'rb-confetti-wrap';
  var colors = ['#fbbf24','#4ade80','#60a5fa','#f472b6','#a78bfa','#fb923c'];
  for (var i = 0; i < 30; i++) {
    var c = document.createElement('div');
    c.className = 'rb-confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDelay = Math.random() * 1.5 + 's';
    cWrap.appendChild(c);
  }
  modal.appendChild(cWrap);

  var cel = document.createElement('div');
  cel.className = 'rb-celebration';

  var img = document.createElement('img');
  img.className = 'rb-celeb-daniel';
  img.src = '/images/characters/DanielTheDogThumbsUp.webp';
  img.alt = 'Daniel celebrating';
  cel.appendChild(img);

  var t = document.createElement('h2');
  t.className = 'rb-celeb-title';
  t.textContent = 'Amazing work!';
  cel.appendChild(t);

  var s = document.createElement('p');
  s.className = 'rb-celeb-sub';
  s.textContent = zoneMsg;
  cel.appendChild(s);

  var badge = document.createElement('div');
  badge.className = 'rb-stars-badge';
  badge.textContent = '+' + stars + ' Stars!';
  cel.appendChild(badge);

  var btn = document.createElement('button');
  btn.className = 'rb-continue-btn';
  btn.textContent = "Let's keep going!";
  btn.addEventListener('click', onContinue);
  cel.appendChild(btn);

  modal.appendChild(cel);
}

// ================================================
// STAR AWARDING (matches daily quest pattern)
// ================================================

async function awardStars(child, starsToAward) {
  if (!child || !child.id || starsToAward < 1) return;
  try {
    var supabase = getSupabaseClient();

    // Try the award_stars_with_spendable RPC first (updates stars + spendable_stars)
    var rpcResult = await supabase.rpc('award_stars_with_spendable', {
      p_child_id: child.id,
      p_stars: starsToAward
    });

    var newStars = 0;
    if (rpcResult.error) {
      console.log('RPC unavailable, falling back to direct update:', rpcResult.error.message);
      // Fallback: read current stars then update directly
      var fetchResult = await supabase
        .from('children')
        .select('stars, spendable_stars')
        .eq('id', child.id)
        .single();

      if (fetchResult.error) {
        console.error('Error fetching child stars:', fetchResult.error);
        return;
      }

      var currentStars = Number(fetchResult.data.stars) || 0;
      var currentSpendable = Number(fetchResult.data.spendable_stars) || 0;
      newStars = currentStars + starsToAward;

      var updateResult = await supabase
        .from('children')
        .update({ stars: newStars, spendable_stars: currentSpendable + starsToAward })
        .eq('id', child.id);

      if (updateResult.error) {
        console.error('Error updating child stars:', updateResult.error);
        return;
      }
    } else {
      // RPC succeeded - extract new totals from response
      var rpcData = rpcResult.data;
      newStars = (rpcData && rpcData.total_stars) ? rpcData.total_stars : ((Number(child.stars) || 0) + starsToAward);
    }

    console.log('Road Builder: Awarded ' + starsToAward + ' stars. Now has ' + newStars + ' stars.');

    // Update local state
    child.stars = newStars;

    // Update all star display elements on the page
    var starsEls = document.querySelectorAll('#totalStars, #childStars, .stars-count, [data-stars]');
    starsEls.forEach(function(el) { el.textContent = newStars; });

    // First star celebration
    if (typeof window.maybeCelebrateFirstStar === 'function') {
      window.maybeCelebrateFirstStar({ id: child.id, name: child.name || 'Explorer', stars: newStars });
    }

    // Refresh dashboard data if available
    if (typeof window.loadChildData === 'function') {
      await window.loadChildData(child.id);
    }
    if (typeof window.updateStatsDisplay === 'function') {
      window.updateStatsDisplay();
    }
  } catch (error) {
    console.error('Could not award road builder stars:', error);
  }
}

// ================================================
// GAME 1: CALM THE TRAFFIC (Breathing Rhythm)
// ================================================

function gameCalmTraffic(modal, onComplete) {
  makeHeader(modal, 'Calm the Traffic', "The road is busy and chaotic! Help Daniel slow everything down with calm breathing. Follow the rhythm - breathe in, hold, breathe out.");

  var area = document.createElement('div');
  area.className = 'rb-game-area';
  area.style.textAlign = 'center';
  area.style.position = 'relative';

  var instruction = document.createElement('div');
  instruction.className = 'rb-breath-instruction';
  instruction.textContent = 'Tap Start to begin';
  area.appendChild(instruction);

  var circle = document.createElement('div');
  circle.className = 'rb-breath-circle';
  circle.style.background = 'rgba(96,165,250,0.3)';
  circle.style.border = '3px solid #60a5fa';
  circle.textContent = '🌬️';
  area.appendChild(circle);

  var countText = document.createElement('div');
  countText.className = 'rb-breath-count';
  countText.textContent = '0 / 3 breaths';
  area.appendChild(countText);

  // Traffic emojis that slow down
  var traffic = document.createElement('div');
  traffic.style.cssText = 'display:flex;justify-content:center;gap:8px;margin-top:14px;font-size:24px;transition:all 1s ease;';
  traffic.innerHTML = '<span style="animation:rbShake 0.3s infinite">🚗</span><span style="animation:rbShake 0.4s infinite">🚕</span><span style="animation:rbShake 0.35s infinite">🚙</span><span style="animation:rbShake 0.45s infinite">🚌</span>';
  area.appendChild(traffic);

  var startBtn = document.createElement('button');
  startBtn.className = 'rb-plant-btn';
  startBtn.style.background = '#3b82f6';
  startBtn.style.color = '#fff';
  startBtn.textContent = 'Start Breathing';
  area.appendChild(startBtn);

  modal.appendChild(area);

  var breaths = 0;
  var target = 3;
  var rhythmScore = 0;
  var breathing = false;
  var phase = 0; // 0=inhale, 1=hold, 2=exhale
  var timer = null;

  startBtn.addEventListener('click', function() {
    if (breathing) return;
    breathing = true;
    startBtn.style.display = 'none';
    doBreathCycle();
  });

  function doBreathCycle() {
    if (breaths >= target) return;
    phase = 0;
    // Inhale 4s
    instruction.textContent = 'Breathe in slowly...';
    circle.style.transform = 'scale(1.3)';
    circle.style.background = 'rgba(96,165,250,0.5)';
    circle.textContent = '😮‍💨';

    timer = setTimeout(function() {
      // Hold 4s
      phase = 1;
      instruction.textContent = 'Hold it...';
      circle.style.background = 'rgba(167,139,250,0.5)';
      circle.textContent = '😊';

      timer = setTimeout(function() {
        // Exhale 4s
        phase = 2;
        instruction.textContent = 'Breathe out slowly...';
        circle.style.transform = 'scale(1)';
        circle.style.background = 'rgba(74,222,128,0.4)';
        circle.textContent = '😌';

        timer = setTimeout(function() {
          breaths++;
          rhythmScore++;
          countText.textContent = breaths + ' / ' + target + ' breaths';

          // Calm traffic progressively
          var cars = traffic.querySelectorAll('span');
          cars.forEach(function(car) {
            car.style.animationDuration = (1 + breaths * 2) + 's';
          });
          if (breaths >= target) {
            // Done!
            instruction.textContent = 'The road is calm!';
            circle.textContent = '✨';
            circle.style.background = 'rgba(74,222,128,0.5)';
            traffic.innerHTML = '🚗 🚕 🚙 🚌';
            traffic.style.opacity = '0.6';
            var stars = Math.max(1, Math.min(3, rhythmScore));
            setTimeout(function() { onComplete(stars); }, 800);
          } else {
            doBreathCycle();
          }
        }, 4000);
      }, 4000);
    }, 4000);
  }
}

// ================================================
// GAME 2: FIX THE THOUGHT ROAD
// ================================================

function gameFixThoughtRoad(modal, onComplete) {
  makeHeader(modal, 'Fix the Thought Road', "The road ahead has cracks from unhelpful thoughts! Tap the helpful thoughts to repair the path.");

  var area = document.createElement('div');
  area.className = 'rb-game-area';
  area.style.position = 'relative';

  var progressFill = makeProgressBar(modal, '#4ade80');

  var helpful = shuffle(HELPFUL_THOUGHTS).slice(0, 3);
  var unhelpful = shuffle(UNHELPFUL_THOUGHTS).slice(0, 3);
  var all = shuffle(helpful.map(function(t) { return { text: t, helpful: true }; }).concat(unhelpful.map(function(t) { return { text: t, helpful: false }; })));

  var score = 0;
  var answered = 0;
  var total = all.length;

  var inst = document.createElement('div');
  inst.className = 'rb-instruction';
  inst.textContent = 'Tap thoughts that help build the road';
  area.appendChild(inst);

  var choices = document.createElement('div');
  choices.className = 'rb-choices';

  all.forEach(function(item) {
    var btn = document.createElement('button');
    btn.className = 'rb-choice';
    btn.innerHTML = '<span class="rb-choice-icon">' + (item.helpful ? '🔧' : '💭') + '</span>' + item.text;
    btn.addEventListener('click', function() {
      if (btn.classList.contains('disabled')) return;
      if (item.helpful) {
        btn.classList.add('correct', 'disabled');
        score++;
        answered++;
        showFeedback(area, 'Road repaired!', true);
        progressFill.style.width = (score / helpful.length * 100) + '%';
        if (score >= helpful.length) {
          setTimeout(function() { onComplete(3); }, 800);
        }
      } else {
        btn.classList.add('wrong');
        showFeedback(area, 'That one cracks the road - try another!', false);
        setTimeout(function() { btn.classList.remove('wrong'); }, 500);
      }
    });
    choices.appendChild(btn);
  });

  area.appendChild(choices);
  modal.appendChild(area);
}

// ================================================
// GAME 3: FEELINGS FUEL SORT
// ================================================

function gameFeelingsFuelSort(modal, onComplete) {
  makeHeader(modal, 'Feelings Fuel Sort', "Daniel's vehicle needs the right fuel to keep going! Sort the coping tools - good ones power Daniel up, bad ones slow him down.");

  var area = document.createElement('div');
  area.className = 'rb-game-area';
  area.style.position = 'relative';

  var progressFill = makeProgressBar(modal, '#f59e0b');

  var good = shuffle(GOOD_COPING).slice(0, 3);
  var bad = shuffle(BAD_COPING).slice(0, 2);
  var items = shuffle(good.map(function(g) { return { text: g.text, icon: g.icon, good: true }; }).concat(bad.map(function(b) { return { text: b.text, icon: b.icon, good: false }; })));

  var answered = 0;
  var total = items.length;
  var score = 0;

  var inst = document.createElement('div');
  inst.className = 'rb-instruction';
  inst.textContent = 'Does this help Daniel? Tap the right answer!';
  area.appendChild(inst);

  var currentIndex = 0;
  var prompt = document.createElement('div');
  prompt.className = 'rb-prompt';
  area.appendChild(prompt);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:14px;';

  var fuelBtn = document.createElement('button');
  fuelBtn.className = 'rb-choice';
  fuelBtn.style.cssText = 'flex:1;justify-content:center;';
  fuelBtn.innerHTML = '<span class="rb-choice-icon">⛽</span> Good Fuel!';

  var junkBtn = document.createElement('button');
  junkBtn.className = 'rb-choice';
  junkBtn.style.cssText = 'flex:1;justify-content:center;';
  junkBtn.innerHTML = '<span class="rb-choice-icon">🚫</span> Not Helpful';

  btnRow.appendChild(fuelBtn);
  btnRow.appendChild(junkBtn);
  area.appendChild(btnRow);
  modal.appendChild(area);

  function showItem() {
    if (currentIndex >= items.length) {
      setTimeout(function() { onComplete(Math.max(1, Math.min(3, score))); }, 600);
      return;
    }
    var item = items[currentIndex];
    prompt.textContent = item.icon + ' ' + item.text;
    fuelBtn.classList.remove('correct', 'wrong', 'disabled');
    junkBtn.classList.remove('correct', 'wrong', 'disabled');
  }

  function answer(choseGood) {
    var item = items[currentIndex];
    var correct = (choseGood && item.good) || (!choseGood && !item.good);
    if (correct) {
      score++;
      (choseGood ? fuelBtn : junkBtn).classList.add('correct');
      showFeedback(area, item.good ? 'Great fuel!' : 'Good catch!', true);
      currentIndex++;
      answered++;
      progressFill.style.width = (answered / total * 100) + '%';
      fuelBtn.classList.add('disabled');
      junkBtn.classList.add('disabled');
      setTimeout(showItem, 900);
    } else {
      (choseGood ? fuelBtn : junkBtn).classList.add('wrong');
      showFeedback(area, item.good ? "Hmm, that one actually helps! Try again" : "That's not great fuel - try again!", false);
      setTimeout(function() {
        fuelBtn.classList.remove('wrong');
        junkBtn.classList.remove('wrong');
      }, 500);
    }
  }

  fuelBtn.addEventListener('click', function() { if (!fuelBtn.classList.contains('disabled')) answer(true); });
  junkBtn.addEventListener('click', function() { if (!junkBtn.classList.contains('disabled')) answer(false); });

  showItem();
}

// ================================================
// GAME 4: SPOTLIGHT SEARCH
// ================================================

function gameSpotlightSearch(modal, onComplete) {
  makeHeader(modal, 'Spotlight Search', "The road got dark and scary! Help Daniel find the safe, helpful things hiding in the scene. Tap to reveal each spot!");

  var area = document.createElement('div');
  area.className = 'rb-game-area';
  area.style.position = 'relative';

  var progressFill = makeProgressBar(modal, '#fbbf24');

  var items = shuffle(SPOTLIGHT_ITEMS).slice(0, 9);
  var helpfulCount = items.filter(function(i) { return i.helpful; }).length;
  var found = 0;
  var totalRevealed = 0;

  var grid = document.createElement('div');
  grid.className = 'rb-spotlight-grid';

  items.forEach(function(item) {
    var cell = document.createElement('div');
    cell.className = 'rb-spot-cell dark';
    cell.innerHTML = '<span class="rb-spot-emoji">?</span><span>' + (item.helpful ? '???' : '???') + '</span>';

    cell.addEventListener('click', function() {
      if (cell.classList.contains('found') || cell.classList.contains('avoid') || cell.classList.contains('revealed')) return;
      cell.classList.remove('dark');
      cell.innerHTML = '<span class="rb-spot-emoji">' + item.emoji + '</span><span>' + item.text + '</span>';
      totalRevealed++;

      if (item.helpful) {
        cell.classList.add('found');
        found++;
        showFeedback(area, 'Safe item found!', true);
      } else {
        cell.classList.add('avoid');
        showFeedback(area, 'Careful, avoid that one!', false);
      }

      progressFill.style.width = (found / helpfulCount * 100) + '%';

      if (found >= helpfulCount) {
        setTimeout(function() { onComplete(3); }, 700);
      }
    });

    grid.appendChild(cell);
  });

  area.appendChild(grid);
  modal.appendChild(area);
}

// ================================================
// GAME 5: BRIDGE BUILDER (Multi-skill challenges)
// ================================================

function gameBridgeBuilder(modal, onComplete) {
  makeHeader(modal, 'Bridge Builder', "Daniel needs to cross a gap! Earn bridge pieces by completing tiny emotional skill challenges.");

  var area = document.createElement('div');
  area.className = 'rb-game-area';
  area.style.position = 'relative';

  var progressFill = makeProgressBar(modal, '#8b5cf6');

  // Bridge visual
  var bridgeRow = document.createElement('div');
  bridgeRow.style.cssText = 'display:flex;gap:4px;justify-content:center;margin-bottom:14px;';
  var planks = [];
  for (var p = 0; p < 4; p++) {
    var plank = document.createElement('div');
    plank.style.cssText = 'width:50px;height:20px;border-radius:4px;background:rgba(255,255,255,0.1);border:1px dashed rgba(255,255,255,0.3);transition:all 0.4s;';
    bridgeRow.appendChild(plank);
    planks.push(plank);
  }
  area.appendChild(bridgeRow);

  var challengeArea = document.createElement('div');
  area.appendChild(challengeArea);
  modal.appendChild(area);

  var challenges = [
    {
      q: "What might Daniel be feeling if his tummy hurts before school?",
      options: [
        { text: "Nervous or worried", correct: true },
        { text: "Hungry for lunch", correct: false },
        { text: "Excited to play", correct: false }
      ]
    },
    {
      q: "Which is the calm choice when someone is annoying you?",
      options: [
        { text: "Take a deep breath and walk away", correct: true },
        { text: "Push them away", correct: false },
        { text: "Scream really loud", correct: false }
      ]
    },
    {
      q: "Which is a brave thought?",
      options: [
        { text: "I can try, even if it's hard", correct: true },
        { text: "I'll definitely fail", correct: false },
        { text: "I shouldn't even bother", correct: false }
      ]
    },
    {
      q: "What helps when you feel overwhelmed?",
      options: [
        { text: "Focus on one small thing at a time", correct: true },
        { text: "Try to do everything at once", correct: false },
        { text: "Pretend nothing is wrong", correct: false }
      ]
    }
  ];

  var current = 0;
  var score = 0;

  function showChallenge() {
    if (current >= challenges.length) {
      setTimeout(function() { onComplete(Math.max(1, Math.min(3, score))); }, 600);
      return;
    }
    challengeArea.innerHTML = '';
    var ch = challenges[current];

    var q = document.createElement('div');
    q.className = 'rb-prompt';
    q.textContent = ch.q;
    challengeArea.appendChild(q);

    var choices = document.createElement('div');
    choices.className = 'rb-choices';

    shuffle(ch.options).forEach(function(opt) {
      var btn = document.createElement('button');
      btn.className = 'rb-choice';
      btn.textContent = opt.text;
      btn.addEventListener('click', function() {
        if (btn.classList.contains('disabled')) return;
        if (opt.correct) {
          choices.querySelectorAll('.rb-choice').forEach(function(b) { b.classList.add('disabled'); });
          btn.classList.add('correct');
          score++;
          planks[current].style.background = '#8b5cf6';
          planks[current].style.borderStyle = 'solid';
          planks[current].style.borderColor = '#a78bfa';
          showFeedback(area, 'Plank earned!', true);
          current++;
          progressFill.style.width = (current / challenges.length * 100) + '%';
          setTimeout(showChallenge, 900);
        } else {
          btn.classList.add('wrong', 'disabled');
          showFeedback(area, 'Not quite - try another!', false);
        }
      });
      choices.appendChild(btn);
    });

    challengeArea.appendChild(choices);
  }

  showChallenge();
}

// ================================================
// GAME 6: WORRY CLOUD POP
// ================================================

function gameWorryCloudPop(modal, onComplete) {
  makeHeader(modal, 'Worry Cloud Pop', "Worry clouds are blocking the road! Pop the unhelpful worries but keep the helpful reminders.");

  var area = document.createElement('div');
  area.className = 'rb-game-area';
  area.style.position = 'relative';

  var progressFill = makeProgressBar(modal, '#60a5fa');

  var helpful = shuffle(HELPFUL_THOUGHTS).slice(0, 3).map(function(t) { return { text: t, pop: false }; });
  var unhelpful = shuffle(UNHELPFUL_THOUGHTS).slice(0, 3).map(function(t) { return { text: t, pop: true }; });
  var clouds = shuffle(helpful.concat(unhelpful));

  var score = 0;
  var answered = 0;
  var total = clouds.length;

  var inst = document.createElement('div');
  inst.className = 'rb-instruction';
  inst.textContent = 'Pop the unhelpful worries! Keep the good thoughts.';
  area.appendChild(inst);

  var choices = document.createElement('div');
  choices.className = 'rb-choices';

  clouds.forEach(function(cloud) {
    var btn = document.createElement('button');
    btn.className = 'rb-choice';
    btn.innerHTML = '<span class="rb-choice-icon">' + (cloud.pop ? '☁️' : '☁️') + '</span>' + cloud.text;

    var popBtn = document.createElement('span');
    popBtn.style.cssText = 'margin-left:auto;font-size:18px;flex-shrink:0;';
    popBtn.textContent = '💥';
    popBtn.title = 'Pop it!';
    btn.appendChild(popBtn);

    var keepBtn = document.createElement('span');
    keepBtn.style.cssText = 'margin-left:6px;font-size:18px;flex-shrink:0;';
    keepBtn.textContent = '💚';
    keepBtn.title = 'Keep it!';
    btn.appendChild(keepBtn);

    function handleChoice(chosePop) {
      if (btn.classList.contains('disabled')) return;
      var correct = chosePop === cloud.pop;
      if (correct) {
        btn.classList.add('disabled', 'correct');
        score++;
        answered++;
        showFeedback(area, chosePop ? 'Worry popped!' : 'Good thought saved!', true);
        progressFill.style.width = (answered / total * 100) + '%';
        if (answered >= total) {
          setTimeout(function() { onComplete(3); }, 800);
        }
      } else {
        btn.classList.add('wrong');
        showFeedback(area, chosePop ? "That one's helpful - keep it!" : "That's a worry - pop it!", false);
        setTimeout(function() { btn.classList.remove('wrong'); }, 500);
      }
    }

    popBtn.addEventListener('click', function(e) { e.stopPropagation(); handleChoice(true); });
    keepBtn.addEventListener('click', function(e) { e.stopPropagation(); handleChoice(false); });
    btn.addEventListener('click', function() { /* Do nothing on main btn - use pop/keep */ });

    choices.appendChild(btn);
  });

  area.appendChild(choices);
  modal.appendChild(area);
}

// ================================================
// GAME 7: MOOD MATCH GARAGE
// ================================================

function gameMoodMatchGarage(modal, onComplete) {
  makeHeader(modal, 'Mood Match Garage', "Daniel stopped at a garage to get road-ready! Match the right support tool to how he's feeling.");

  var area = document.createElement('div');
  area.className = 'rb-game-area';
  area.style.position = 'relative';

  var progressFill = makeProgressBar(modal, '#ec4899');

  var emotions = shuffle(EMOTIONS_AND_TOOLS).slice(0, 3);
  var current = 0;
  var score = 0;

  var prompt = document.createElement('div');
  prompt.className = 'rb-prompt';
  area.appendChild(prompt);

  var choicesDiv = document.createElement('div');
  choicesDiv.className = 'rb-choices';
  area.appendChild(choicesDiv);
  modal.appendChild(area);

  function showEmotion() {
    if (current >= emotions.length) {
      setTimeout(function() { onComplete(Math.max(1, Math.min(3, score))); }, 600);
      return;
    }
    choicesDiv.innerHTML = '';
    var em = emotions[current];
    prompt.textContent = em.emoji + ' Daniel is feeling ' + em.emotion.toLowerCase();

    var correctTool = em.tools[Math.floor(Math.random() * em.tools.length)];
    var wrongTool = em.wrong[Math.floor(Math.random() * em.wrong.length)];
    var options = shuffle([
      { text: correctTool, correct: true },
      { text: wrongTool, correct: false }
    ]);

    // Add one more option if available
    if (em.tools.length > 1) {
      var extraCorrect = em.tools.find(function(t) { return t !== correctTool; });
      if (extraCorrect) options.push({ text: extraCorrect, correct: true });
      options = shuffle(options);
    }

    options.forEach(function(opt) {
      var btn = document.createElement('button');
      btn.className = 'rb-choice';
      btn.innerHTML = '<span class="rb-choice-icon">' + (opt.correct ? '🔧' : '❌') + '</span>' + opt.text;
      // Hide the icon hint - show neutral
      btn.querySelector('.rb-choice-icon').textContent = '🛠️';

      btn.addEventListener('click', function() {
        if (btn.classList.contains('disabled')) return;
        if (opt.correct) {
          choicesDiv.querySelectorAll('.rb-choice').forEach(function(b) { b.classList.add('disabled'); });
          btn.classList.add('correct');
          score++;
          showFeedback(area, 'Great match!', true);
          current++;
          progressFill.style.width = (current / emotions.length * 100) + '%';
          setTimeout(showEmotion, 900);
        } else {
          btn.classList.add('wrong', 'disabled');
          showFeedback(area, 'Not quite - try another tool!', false);
        }
      });
      choicesDiv.appendChild(btn);
    });
  }

  showEmotion();
}

// ================================================
// GAME 8: BRAVE STEPS
// ================================================

function gameBraveSteps(modal, onComplete) {
  makeHeader(modal, 'Brave Steps', "Daniel is nervous about the road ahead! Help him by choosing the smallest brave step he can take.");

  var area = document.createElement('div');
  area.className = 'rb-game-area';
  area.style.position = 'relative';

  var progressFill = makeProgressBar(modal, '#f59e0b');

  var scenario = BRAVE_SCENARIOS[Math.floor(Math.random() * BRAVE_SCENARIOS.length)];
  var steps = shuffle(scenario.steps);
  var correctCount = steps.filter(function(s) { return s.correct; }).length;
  var score = 0;

  var prompt = document.createElement('div');
  prompt.className = 'rb-prompt';
  prompt.textContent = scenario.situation;
  area.appendChild(prompt);

  var inst = document.createElement('div');
  inst.className = 'rb-instruction';
  inst.textContent = 'Which steps would help Daniel?';
  area.appendChild(inst);

  var choices = document.createElement('div');
  choices.className = 'rb-choices';

  steps.forEach(function(step) {
    var btn = document.createElement('button');
    btn.className = 'rb-choice';
    btn.innerHTML = '<span class="rb-choice-icon">👣</span>' + step.text;
    btn.addEventListener('click', function() {
      if (btn.classList.contains('disabled')) return;
      if (step.correct) {
        btn.classList.add('correct', 'disabled');
        score++;
        showFeedback(area, 'Brave step!', true);
        progressFill.style.width = (score / correctCount * 100) + '%';
        if (score >= correctCount) {
          setTimeout(function() { onComplete(3); }, 800);
        }
      } else {
        btn.classList.add('wrong');
        showFeedback(area, 'That might not help - try another!', false);
        setTimeout(function() { btn.classList.remove('wrong'); }, 500);
      }
    });
    choices.appendChild(btn);
  });

  area.appendChild(choices);
  modal.appendChild(area);
}

// ================================================
// GAME 9: GRATITUDE GARDEN
// ================================================

function gameGratitudeGarden(modal, onComplete) {
  makeHeader(modal, 'Gratitude Garden', "Daniel stopped at a roadside garden! Help beautiful flowers grow by thinking of things you're grateful for.");

  var area = document.createElement('div');
  area.className = 'rb-game-area';
  area.style.position = 'relative';

  var garden = document.createElement('div');
  garden.className = 'rb-garden';
  area.appendChild(garden);

  var prompts = shuffle(GRATITUDE_PROMPTS).slice(0, 3);
  var current = 0;
  var flowers = ['🌸', '🌻', '🌷'];

  var promptText = document.createElement('div');
  promptText.className = 'rb-prompt';
  area.appendChild(promptText);

  var input = document.createElement('input');
  input.className = 'rb-gratitude-input';
  input.type = 'text';
  input.maxLength = 60;
  area.appendChild(input);

  var plantBtn = document.createElement('button');
  plantBtn.className = 'rb-plant-btn';
  plantBtn.style.background = '#22c55e';
  plantBtn.style.color = '#fff';
  plantBtn.textContent = 'Plant a flower!';
  area.appendChild(plantBtn);

  modal.appendChild(area);

  function showPrompt() {
    if (current >= prompts.length) {
      setTimeout(function() { onComplete(3); }, 600);
      return;
    }
    promptText.textContent = 'Think of: ' + prompts[current];
    input.value = '';
    input.placeholder = 'Type something here...';
    input.focus();
  }

  plantBtn.addEventListener('click', function() {
    var val = input.value.trim();
    if (val.length < 2) {
      input.placeholder = 'Type at least a couple of words!';
      return;
    }
    // Grow a flower
    var flower = document.createElement('span');
    flower.className = 'rb-flower';
    flower.textContent = flowers[current] || '🌺';
    garden.appendChild(flower);

    showFeedback(area, 'Beautiful!', true);
    current++;
    setTimeout(showPrompt, 600);
  });

  // Also allow Enter key
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); plantBtn.click(); }
  });

  showPrompt();
}

// ================================================
// GAME 10: RED LIGHT, YELLOW LIGHT, GREEN LIGHT
// ================================================

function gameTrafficLight(modal, onComplete) {
  makeHeader(modal, 'Red, Yellow, Green', "Daniel reached a road signal! Help him sort each situation - should he stop, check in, or go?");

  var area = document.createElement('div');
  area.className = 'rb-game-area';
  area.style.position = 'relative';

  var progressFill = makeProgressBar(modal, '#22c55e');

  var items = shuffle(TRAFFIC_LIGHT_ITEMS).slice(0, 6);
  var current = 0;
  var score = 0;

  var prompt = document.createElement('div');
  prompt.className = 'rb-prompt';
  area.appendChild(prompt);

  var buttons = document.createElement('div');
  buttons.className = 'rb-tl-buttons';

  var redBtn = document.createElement('button');
  redBtn.className = 'rb-tl-btn red';
  redBtn.innerHTML = '🛑<br>Stop';

  var yellowBtn = document.createElement('button');
  yellowBtn.className = 'rb-tl-btn yellow';
  yellowBtn.innerHTML = '⚠️<br>Check';

  var greenBtn = document.createElement('button');
  greenBtn.className = 'rb-tl-btn green';
  greenBtn.innerHTML = '✅<br>Go';

  buttons.appendChild(redBtn);
  buttons.appendChild(yellowBtn);
  buttons.appendChild(greenBtn);
  area.appendChild(buttons);

  var reasonText = document.createElement('div');
  reasonText.style.cssText = 'text-align:center;font-size:12px;margin-top:10px;min-height:18px;opacity:0.7;';
  area.appendChild(reasonText);

  modal.appendChild(area);

  function showItem() {
    if (current >= items.length) {
      setTimeout(function() { onComplete(Math.max(1, Math.min(3, score))); }, 600);
      return;
    }
    prompt.textContent = '"' + items[current].text + '"';
    reasonText.textContent = '';
    [redBtn, yellowBtn, greenBtn].forEach(function(b) {
      b.style.opacity = '1';
      b.style.pointerEvents = 'auto';
      b.style.transform = '';
    });
  }

  function answer(chosenColor) {
    var item = items[current];
    var correct = chosenColor === item.color;

    if (correct) {
      [redBtn, yellowBtn, greenBtn].forEach(function(b) { b.style.pointerEvents = 'none'; });
      score++;
      showFeedback(area, 'Correct!', true);
      reasonText.textContent = item.reason;
      current++;
      progressFill.style.width = (current / items.length * 100) + '%';
      if (current >= items.length) {
        setTimeout(function() { onComplete(3); }, 800);
      } else {
        setTimeout(showItem, 1200);
      }
    } else {
      showFeedback(area, 'Not quite - try again!', false);
      reasonText.textContent = '';
      // Disable wrong button briefly so they pick a different one
      var wrongBtn = chosenColor === 'red' ? redBtn : chosenColor === 'yellow' ? yellowBtn : greenBtn;
      wrongBtn.style.opacity = '0.4';
      wrongBtn.style.pointerEvents = 'none';
      setTimeout(function() {
        wrongBtn.style.opacity = '1';
        wrongBtn.style.pointerEvents = 'auto';
      }, 600);
    }
  }

  redBtn.addEventListener('click', function() { answer('red'); });
  yellowBtn.addEventListener('click', function() { answer('yellow'); });
  greenBtn.addEventListener('click', function() { answer('green'); });

  showItem();
}
