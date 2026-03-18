// ================================================
// ADVENTURE MAP V4 - Super Skills Themed Interactive Maps
// Enhanced Dashboard Features with Draggable Map & Super Skill Filters
// ================================================

import { getZoneState } from './adventure-map-zones.js';

// Import existing dashboard state and functions
let dashboardModules = [];
let dashboardChildModules = [];
let dashboardSelectedChild = null;
let dashboardChildren = [];

// Function to get data from main dashboard
function getDashboardData() {
  if (typeof window.modules !== 'undefined') dashboardModules = window.modules;
  if (typeof window.childModules !== 'undefined') dashboardChildModules = window.childModules;
  // Check both window.selectedChild and window.state.selectedChild
  var sc = window.selectedChild || (window.state && window.state.selectedChild) || null;
  if (sc) dashboardSelectedChild = sc;
  if (typeof window.children !== 'undefined') dashboardChildren = window.children;
}

// ================================================
// SUPER SKILL THEME CONFIGURATIONS
// ================================================

// Super Skills data loaded from database (will be populated on init)
let superSkillsFromDB = [];
let cyclesFromDB = [];

const SUPER_SKILL_THEMES = {
  all: {
    name: 'All Adventures',
    emoji: '🗺️',
    color: '#405878',
    description: 'View all your skill adventures',
    skyGradientStart: ['#B0C4DE', '#A8B8CC', '#9AACBE', '#8CA0B0', '#7E94A2'],
    skyGradientEnd: ['#87CEEB', '#98D8C8', '#7CCD7C', '#90EE90', '#98FB98'],
    decorationsStart: ['🌲', '🌳', '🍂', '🍃'],
    decorationsEnd: ['🌸', '🌻', '🌼', '🦋', '🐦', '🌈'],
    pathColor: { main: '#A08868', light: '#C4A882', shadow: 'rgba(101, 78, 55, 0.3)' },
    startMarker: '🏠',
    endMarker: '🏁',
    destination: { name: "Adventure's End", emoji: '🏆' },
    nodeEmojis: { incomplete: '📘', complete: '✨' },
    danielExpressions: { start: 'focused', middle: 'happy', end: 'proud' }
  },
  
  'brain-builder': {
    name: 'Brain Builder',
    emoji: '🧠',
    color: '#6366F1',
    description: 'Master your mind through understanding how your brain works',
    skyGradientStart: ['#778899', '#8899AA', '#99AABB', '#AABBCC', '#BBCCDD'],
    skyGradientEnd: ['#00CED1', '#48D1CC', '#40E0D0', '#7FFFD4', '#AFEEEE'],
    decorationsStart: ['💭', '🌫️', '❓', '🤔'],
    decorationsEnd: ['💡', '⭐', '🌟', '✨', '🎯', '🏆'],
    pathColor: { main: '#6366F1', light: '#818CF8', shadow: 'rgba(99, 102, 241, 0.3)' },
    startMarker: '💭',
    endMarker: '💡',
    destination: { name: 'Clarity Peak', emoji: '💡' },
    nodeEmojis: { incomplete: '🤔', complete: '🧠' },
    danielExpressions: { start: 'curious', middle: 'thinking', end: 'enlightened' }
  },
  
  'thought-driver': {
    name: 'Thought Driver',
    emoji: '💭',
    color: '#8B5CF6',
    description: 'Take control of your thoughts and steer them positively',
    skyGradientStart: ['#DDA0DD', '#DA70D6', '#BA55D3', '#9370DB', '#8A2BE2'],
    skyGradientEnd: ['#E0FFFF', '#B0E0E6', '#ADD8E6', '#87CEEB', '#87CEFA'],
    decorationsStart: ['💭', '🌀', '❓', '💫'],
    decorationsEnd: ['💡', '🎯', '⭐', '✨', '🌈', '🦋'],
    pathColor: { main: '#8B5CF6', light: '#A78BFA', shadow: 'rgba(139, 92, 246, 0.3)' },
    startMarker: '💭',
    endMarker: '🎯',
    destination: { name: 'Focus Point', emoji: '🎯' },
    nodeEmojis: { incomplete: '🤔', complete: '💡' },
    danielExpressions: { start: 'confused', middle: 'focused', end: 'clear' }
  },
  
  'emotion-navigator': {
    name: 'Emotion Navigator',
    emoji: '🧭',
    color: '#EC4899',
    description: 'Navigate through all emotions with confidence',
    skyGradientStart: ['#DDA0DD', '#DA70D6', '#BA55D3', '#9370DB', '#8A2BE2'],
    skyGradientEnd: ['#FFB6C1', '#FFC0CB', '#FFE4E1', '#FFF0F5', '#FFFAFA'],
    decorationsStart: ['💭', '❓', '🌀', '💫'],
    decorationsEnd: ['💖', '😊', '🌈', '✨', '🦋', '🌸'],
    pathColor: { main: '#EC4899', light: '#F472B6', shadow: 'rgba(236, 72, 153, 0.3)' },
    startMarker: '🧭',
    endMarker: '💖',
    destination: { name: 'Heart Haven', emoji: '💖' },
    nodeEmojis: { incomplete: '🤔', complete: '😊' },
    danielExpressions: { start: 'curious', middle: 'understanding', end: 'loving' }
  },
  
  'body-boss': {
    name: 'Body Boss',
    emoji: '💪',
    color: '#10B981',
    description: 'Understand and control your body signals',
    skyGradientStart: ['#FF8C00', '#FFA500', '#FFB347', '#FFCC00', '#FFD700'],
    skyGradientEnd: ['#87CEEB', '#B0E0E6', '#ADD8E6', '#E0FFFF', '#F0FFFF'],
    decorationsStart: ['⚡', '💨', '🔥', '💪'],
    decorationsEnd: ['🧘', '🌊', '🍃', '🦋', '🌸', '☀️'],
    pathColor: { main: '#10B981', light: '#34D399', shadow: 'rgba(16, 185, 129, 0.3)' },
    startMarker: '⚡',
    endMarker: '🧘',
    destination: { name: 'Zen Garden', emoji: '🧘' },
    nodeEmojis: { incomplete: '😤', complete: '😌' },
    danielExpressions: { start: 'tense', middle: 'relaxing', end: 'zen' }
  },
  
  'connection-captain': {
    name: 'Connection Captain',
    emoji: '🤝',
    color: '#F59E0B',
    description: 'Build strong relationships and communicate well',
    skyGradientStart: ['#90A4AE', '#A5B5BF', '#B0BEC5', '#CFD8DC', '#ECEFF1'],
    skyGradientEnd: ['#98FB98', '#90EE90', '#7CCD7C', '#66CDAA', '#3CB371'],
    decorationsStart: ['🏠', '🚪', '🌲'],
    decorationsEnd: ['👫', '🤝', '❤️', '🎉', '🎊', '🦋', '🌈'],
    pathColor: { main: '#F59E0B', light: '#FBBF24', shadow: 'rgba(245, 158, 11, 0.3)' },
    startMarker: '🏠',
    endMarker: '🎉',
    destination: { name: 'Friendship Circle', emoji: '🎉' },
    nodeEmojis: { incomplete: '🙂', complete: '😄' },
    danielExpressions: { start: 'shy', middle: 'friendly', end: 'celebrating' }
  },
  
  'calm-controller': {
    name: 'Calm Controller',
    emoji: '🧘',
    color: '#06B6D4',
    description: 'Master techniques to find peace and stay centered',
    skyGradientStart: ['#4A5568', '#5A6578', '#6B7B8C', '#7C8B9C', '#8D9BAC'],
    skyGradientEnd: ['#87CEEB', '#FFE4B5', '#FFFACD', '#FFF8DC', '#FFFFF0'],
    decorationsStart: ['🌧️', '💨', '☁️', '🌫️', '⛈️'],
    decorationsEnd: ['☀️', '🌈', '🌻', '🦋', '🐦', '🌸'],
    pathColor: { main: '#06B6D4', light: '#22D3EE', shadow: 'rgba(6, 182, 212, 0.3)' },
    startMarker: '🌧️',
    endMarker: '☀️',
    destination: { name: 'Sunny Clearing', emoji: '🌅' },
    nodeEmojis: { incomplete: '😰', complete: '😌' },
    danielExpressions: { start: 'worried', middle: 'hopeful', end: 'peaceful' }
  },
  
  'resilience-ranger': {
    name: 'Resilience Ranger',
    emoji: '🏔️',
    color: '#EF4444',
    description: 'Bounce back from challenges and grow stronger',
    skyGradientStart: ['#1a1a2e', '#16213e', '#1f3460', '#2C3E50', '#34495E'],
    skyGradientEnd: ['#87CEEB', '#FFB347', '#FFCC33', '#FFD700', '#FFF8DC'],
    decorationsStart: ['🌙', '✨', '🌑', '💫'],
    decorationsEnd: ['🌻', '🌷', '🌸', '🦋', '🐦', '☀️', '🌈'],
    pathColor: { main: '#EF4444', light: '#F87171', shadow: 'rgba(239, 68, 68, 0.3)' },
    startMarker: '🌙',
    endMarker: '🌻',
    destination: { name: 'Bright Garden', emoji: '🌻' },
    nodeEmojis: { incomplete: '😔', complete: '😊' },
    danielExpressions: { start: 'sad', middle: 'hopeful', end: 'joyful' }
  }
};

// Mapping from old category names to super skill slugs (for backward compatibility)
const CATEGORY_TO_SUPERSKILL = {
  'anger': 'emotion-navigator',
  'anxiety': 'calm-controller', 
  'depression': 'resilience-ranger',
  'emotions': 'emotion-navigator',
  'body': 'body-boss',
  'cognitive': 'brain-builder',
  'social': 'connection-captain',
  'general': 'all'
};

// For backward compatibility, CATEGORY_THEMES points to SUPER_SKILL_THEMES
const CATEGORY_THEMES = SUPER_SKILL_THEMES;

// ================================================
// MAP ZONE PROGRESSION SYSTEM (4-ZONE)
// ================================================
// Zones unlock after completing a set number of modules.
const MAP_ZONE_PROGRESSION = [
  {
    range: '1–3',
    label: 'Zone 1: Foundations',
    unlocksAfterModules: 0,
    conceptualPurpose: 'Introduce the journey, establish routines, and build comfort with the map flow.',
    emotionalShift: 'From uncertainty to cautious curiosity.',
    progressFeelsLike: 'Small wins, steady practice, and growing confidence with the basics.',
    roadChanges: 'The road is narrow and slightly uneven, with a basic path line and minimal structure. Edges are soft and forgiving, with no intersections or traffic guidance yet.',
    townChanges: 'A handful of small, low structures appear at a distance from the road, spaced apart with open gaps. Details are minimal, suggesting a quiet start rather than a fully formed neighborhood.',
    zoneCompletionTransition: 'Freeze input for a beat as the scene holds. The path line brightens and steadies, smoothing out as it widens slightly. The ground around the road subtly aligns into more orderly edges, signaling that thoughts have formed a stronger route. Interaction resumes once the upgraded path settles.',
    visualChangesAllowed: 'Subtle increases in clarity and contrast, gentle emphasis on completed modules, and minimal motion cues.'
  },
  {
    range: '4–6',
    label: 'Zone 2: Momentum',
    unlocksAfterModules: 3,
    conceptualPurpose: 'Reinforce skills through repetition and start connecting ideas across modules.',
    emotionalShift: 'From curiosity to determination.',
    progressFeelsLike: 'A rhythm of achievement, with progress feeling more consistent and predictable.',
    roadChanges: 'The road widens and smooths, with clearer borders and a consistent lane-like structure. The first intersections appear, along with simple directional signs.',
    townChanges: 'More buildings begin to line the road, still simple in form but closer together. A few paths and shared edges hint at connections forming between structures.',
    zoneCompletionTransition: 'Pause interaction briefly as the road surface tightens and becomes more uniform. Lane structure resolves into crisp lines, and a new intersection fades in, underscoring that thoughts now move along a clearer route. Resume interaction as the new junction locks into place.',
    visualChangesAllowed: 'Slightly richer color saturation, clearer path highlighting, and more noticeable progress markers.'
  },
  {
    range: '7–9',
    label: 'Zone 3: Mastery Building',
    unlocksAfterModules: 6,
    conceptualPurpose: 'Deepen understanding and encourage independent application of skills.',
    emotionalShift: 'From determination to self-assurance.',
    progressFeelsLike: 'Confident strides, with progress feeling earned and meaningful.',
    roadChanges: 'The road becomes broader and more structured, with well-defined lanes and smoother transitions. Intersections are more frequent, with clearer signage and the first guidance lights.',
    townChanges: 'Buildings grow taller and denser, with clearer clusters that feel like small blocks. Walkways and shared boundaries make the town feel cohesive rather than scattered.',
    zoneCompletionTransition: 'Hold input as the road expands to a wider, steadier corridor. Guidance lights pulse on in sequence along the path, and intersections clarify into a clean grid, reinforcing that thoughts now travel with strength and direction. Interaction returns after the lights settle.',
    visualChangesAllowed: 'Stronger emphasis on completed sections, increased depth through layering, and more prominent milestone cues.'
  },
  {
    range: '10–12',
    label: 'Zone 4: Celebration',
    unlocksAfterModules: 9,
    conceptualPurpose: 'Celebrate growth and reinforce the child’s sense of accomplishment.',
    emotionalShift: 'From self-assurance to pride.',
    progressFeelsLike: 'A satisfying finish, with a clear sense of achievement and closure.',
    roadChanges: 'The road is at its widest and smoothest, fully structured with clear lanes. Intersections are well organized, with prominent signs and steady guidance lights marking the final stretch.',
    townChanges: 'The town becomes an active center with taller structures, tighter spacing, and connected streets that wrap around the road. The environment feels established and complete, reinforcing a sense of arrival.',
    zoneCompletionTransition: 'Briefly pause interaction as the path locks into its final, strongest form. The surface polishes to a consistent, confident flow, intersections align with clear guidance, and the full route glows subtly to show thoughts becoming their strongest path. Resume control once the glow fades to steady.',
    visualChangesAllowed: 'Highest brightness within the palette, enhanced polish on key elements, and celebratory emphasis on completion.'
  }
];

// Daniel expression images mapping
const DANIEL_EXPRESSIONS = {
  stressed: '/images/characters/DanielTheDog.webp',
  worried: '/images/characters/DanielTheDog.webp',
  sad: '/images/characters/DanielTheDog.webp',
  tense: '/images/characters/DanielTheDog.webp',
  confused: '/images/characters/DanielTheDog.webp',
  shy: '/images/characters/DanielTheDog.webp',
  curious: '/images/characters/DanielTheDog.webp',
  focused: '/images/characters/DanielTheDog.webp',
  hopeful: '/images/characters/DanielTheDog.webp',
  relaxing: '/images/characters/DanielTheDog.webp',
  thinking: '/images/characters/DanielTheDog.webp',
  friendly: '/images/characters/DanielTheDog.webp',
  learning: '/images/characters/DanielTheDog.webp',
  understanding: '/images/characters/DanielTheDog.webp',
  happy: '/images/characters/DanielTheDog.webp',
  calm: '/images/characters/DanielTheDog.webp',
  peaceful: '/images/characters/DanielTheDog.webp',
  joyful: '/images/characters/DanielTheDog.webp',
  loving: '/images/characters/DanielTheDog.webp',
  zen: '/images/characters/DanielTheDog.webp',
  enlightened: '/images/characters/DanielTheDog.webp',
  celebrating: '/images/characters/DanielTheDog.webp',
  proud: '/images/characters/DanielTheDog.webp'
};

// ================================================
// ADVENTURE MAP V4 CLASS
// ================================================

class AdventureMapV4 {
  constructor() {
    this.modules = [];
    this.allModules = [];
    this.viewport = null;
    this.canvas = null;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.translateX = 0;
    this.translateY = 0;
    this.lastTranslateX = 0;
    this.lastTranslateY = 0;
    this.hasUserInteracted = false;
    this.currentCategory = null;
    this.currentCycleId = null;
    this.currentZone = null;
    this.zoneUpgradeTimeout = null;
    this.boundHandlers = {};
    this.cycleModuleTarget = 12;
    this.cycleCompletionPopupObserver = null;
    this.cycleCompletionPopupTimer = null;
    this.activeCycleCompletionPopup = null;
    this.lastCyclePopupShownId = null;
    
    this.updateMobileConfig();
  }

  updateMobileConfig() {
    this.isMobile = window.innerWidth <= 768;
    
    this.config = {
      nodeSize: this.isMobile ? 50 : 72,
      nodeSpacingY: this.isMobile ? 85 : 140,
      pathAmplitude: this.isMobile ? 55 : 140,
      zigzagFrequency: this.isMobile ? 0.8 : 1.2,
      topPadding: this.isMobile ? 250 : 120,
      bottomPadding: this.isMobile ? 80 : 160,
      sidePadding: this.isMobile ? 36 : 100,
      minCanvasHeight: this.isMobile ? 400 : 500
    };
    
    this.decorations = [
      { emoji: '🌲', type: 'tree', scale: 1.2 },
      { emoji: '🌳', type: 'tree', scale: 1.3 },
      { emoji: '🌸', type: 'flower', scale: 0.7 },
      { emoji: '🌻', type: 'flower', scale: 0.9 },
      { emoji: '🌼', type: 'flower', scale: 0.8 },
      { emoji: '🏠', type: 'house', scale: 1.0 },
      { emoji: '⛺', type: 'tent', scale: 0.9 },
      { emoji: '🌈', type: 'rainbow', scale: 1.2 },
      { emoji: '☁️', type: 'cloud', scale: 1.0 },
    ];
  }

  init() {
    var self = this;
    this.injectStyles();

    // Check if there's a focus plan super skill already set
    if (window.currentFocusSuperSkill && SUPER_SKILL_THEMES[window.currentFocusSuperSkill]) {
      this.currentCategory = window.currentFocusSuperSkill;
    }

    // Restore user's explicit category selection (overrides focus plan default)
    var storedCategory = this.getStoredCategory();
    if (storedCategory && SUPER_SKILL_THEMES[storedCategory]) {
      this.currentCategory = storedCategory;
    }

    // If we already loaded super skills/cycles, skip the DB call and render immediately
    if (superSkillsFromDB.length > 0 || cyclesFromDB.length > 0) {
      // Re-check focus plan in case it changed
      if (!self.currentCategory && window.currentFocusSuperSkill && SUPER_SKILL_THEMES[window.currentFocusSuperSkill]) {
        self.currentCategory = window.currentFocusSuperSkill;
      }
      self.render();
      return;
    }

    // Load super skills and cycles from database if supabase is available
    if (window.supabase) {
      Promise.all([
        window.supabase
          .from('super_skills')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        window.supabase
          .from('cycles')
          .select('*')
          .order('cycle_number', { ascending: true })
      ])
        .then(function(results) {
          var superSkillsResult = results[0];
          var cyclesResult = results[1];
          if (superSkillsResult.data) {
            superSkillsFromDB = superSkillsResult.data;
            // Update SUPER_SKILL_THEMES with database values
            superSkillsResult.data.forEach(function(skill) {
              if (!skill.slug) return;
              if (SUPER_SKILL_THEMES[skill.slug]) {
                SUPER_SKILL_THEMES[skill.slug].name = skill.name;
                SUPER_SKILL_THEMES[skill.slug].emoji = skill.emoji || SUPER_SKILL_THEMES[skill.slug].emoji;
                SUPER_SKILL_THEMES[skill.slug].color = skill.theme_color || SUPER_SKILL_THEMES[skill.slug].color;
              } else {
                // Generate a theme for new super skills not hardcoded above
                var c = skill.theme_color || '#405878';
                SUPER_SKILL_THEMES[skill.slug] = {
                  name: skill.name || skill.slug,
                  emoji: skill.emoji || '🗺️',
                  color: c,
                  description: skill.description || '',
                  skyGradientStart: ['#B0C4DE', '#A8B8CC', '#9AACBE', '#8CA0B0', '#7E94A2'],
                  skyGradientEnd: ['#87CEEB', '#98D8C8', '#7CCD7C', '#90EE90', '#98FB98'],
                  decorationsStart: ['🌲', '🌳', '🍂', '🍃'],
                  decorationsEnd: ['🌸', '🌻', '🌼', '🦋', '🐦', '🌈'],
                  pathColor: { main: c, light: c, shadow: 'rgba(0,0,0,0.2)' },
                  startMarker: '🏠',
                  endMarker: '🏁',
                  destination: { name: (skill.name || 'Adventure') + "'s End", emoji: '🏆' },
                  nodeEmojis: { incomplete: '📘', complete: '✨' },
                  danielExpressions: { start: 'focused', middle: 'happy', end: 'proud' }
                };
              }
            });
          }
          if (cyclesResult.data) {
            cyclesFromDB = cyclesResult.data;
          }

          // Check again for focus plan after loading (in case it was set while loading)
          if (!self.currentCategory && window.currentFocusSuperSkill && SUPER_SKILL_THEMES[window.currentFocusSuperSkill]) {
            self.currentCategory = window.currentFocusSuperSkill;
          }

          self.render();
        })
        .catch(function(err) {
          console.log('Could not load super skills/cycles from database:', err);
          self.render();
        });
    } else {
      this.render();
    }
  }

  injectStyles() {
    if (document.getElementById('adventure-map-v4-styles')) return;
    
    var css = [];
    css.push('.adventure-map-section { background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(245,250,255,0.4) 30%, rgba(240,248,255,0.3) 100%); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-radius: 24px; padding: 0; box-shadow: 0 8px 32px rgba(64,88,120,0.08), 0 2px 8px rgba(64,88,120,0.04), inset 0 1px 0 rgba(255,255,255,0.8); border: 2px solid rgba(255,255,255,0.5); margin-top: 0; overflow: hidden; position: relative; }');
    css.push('.adventure-map-header-fixed { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 8px 16px; text-align: center; }');
    css.push('.adventure-header { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 28px 24px 14px; position: relative; text-align: center; background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%); }');
    css.push('.adventure-title { font-family: "Fredoka", "League Spartan", system-ui, sans-serif; font-size: 32px; margin: 0; color: #1E293B; display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: -0.5px; justify-content: center; }');
    css.push('.adventure-subtitle { margin: 2px 0 0; color: #64748B; font-size: 14px; font-weight: 500; }');
    css.push('.category-filter-container { display: flex; align-items: center; gap: 10px; margin: 0 20px 10px; padding: 10px 20px; flex-wrap: wrap; justify-content: center; background: rgba(255,255,255,0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-radius: 16px; border: 1.5px solid rgba(255,255,255,0.6); }');
    css.push('.category-filter-label { font-family: "Fredoka", sans-serif; font-size: 13px; font-weight: 600; color: #64748B; }');
    css.push('.category-filter-select { font-family: "Fredoka", sans-serif; font-size: 14px; font-weight: 600; padding: 10px 36px 10px 16px; border-radius: 14px; border: 1.5px solid rgba(64,88,120,0.12); background: rgba(255,255,255,0.85); color: #1E293B; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2364748B\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; min-width: 180px; transition: all 0.25s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }');
    css.push('.category-filter-select:hover { border-color: rgba(99,102,241,0.35); box-shadow: 0 2px 8px rgba(99,102,241,0.08); }');
    css.push('.category-filter-select:focus { outline: none; border-color: rgba(99,102,241,0.4); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }');
    css.push('.category-badge { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; color: white; box-shadow: 0 2px 6px rgba(0,0,0,0.1); letter-spacing: 0.2px; }');
    css.push('.cycle-badge { background: rgba(255,255,255,0.85); color: #405878; border: 1.5px solid rgba(64,88,120,0.1); box-shadow: 0 1px 4px rgba(0,0,0,0.04); }');
    css.push('.town-progress-cue { margin: 0 20px 12px; border-radius: 18px; border: none; background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(248,250,255,0.5) 100%); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 2px 12px rgba(64,88,120,0.06), inset 0 1px 0 rgba(255,255,255,0.7); border: 1.5px solid rgba(255,255,255,0.55); overflow: hidden; }');
    css.push('.town-progress-cue-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 20px 8px; }');
    css.push('.town-progress-cue-title { font-family: "Fredoka", sans-serif; font-size: 13px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 6px; }');
    css.push('.town-progress-cue-stage { font-family: "Fredoka", sans-serif; font-size: 11px; font-weight: 700; color: #6366F1; background: rgba(99,102,241,0.1); border-radius: 999px; padding: 5px 12px; }');
    css.push('.town-progress-cue-copy { padding: 0 20px 14px; font-size: 12px; line-height: 1.5; color: #64748B; }');
    css.push('.town-progress-cue-strong { color: #1E293B; font-weight: 700; }');
    css.push('.town-progress-cue-timeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 10px; position: relative; }');
    css.push('.town-progress-cue-timeline::before { content: ""; position: absolute; top: 24px; left: 12%; right: 12%; height: 4px; background: #E2E8F0; border-radius: 2px; z-index: 0; }');
    css.push('.town-progress-cue-step { text-align: center; padding: 10px 8px; position: relative; z-index: 1; transition: all 0.3s ease; border-radius: 14px; }');
    css.push('.town-progress-cue-step-dot { width: 28px; height: 28px; border-radius: 50%; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; background: #F1F5F9; border: 3px solid #E2E8F0; transition: all 0.3s ease; }');
    css.push('.town-progress-cue-step strong { display: block; font-family: "Fredoka", sans-serif; color: #94A3B8; font-size: 11px; margin-top: 1px; font-weight: 600; }');
    css.push('.town-progress-cue-step small { font-size: 10px; color: #CBD5E1; font-weight: 500; }');
    css.push('.town-progress-cue-step.active { background: rgba(99,102,241,0.06); }');
    css.push('.town-progress-cue-step.active .town-progress-cue-step-dot { background: linear-gradient(135deg, #6366F1, #818CF8); border-color: #6366F1; box-shadow: 0 0 0 4px rgba(99,102,241,0.15), 0 3px 8px rgba(99,102,241,0.25); }');
    css.push('.town-progress-cue-step.active strong { color: #4338CA; font-weight: 700; }');
    css.push('.town-progress-cue-step.active small { color: #6366F1; font-weight: 600; }');
    css.push('.town-progress-cue-step.done .town-progress-cue-step-dot { background: linear-gradient(135deg, #22C55E, #4ADE80); border-color: #22C55E; box-shadow: 0 2px 6px rgba(34,197,94,0.25); }');
    css.push('.town-progress-cue-step.done strong { color: #16A34A; font-weight: 700; }');
    css.push('.town-progress-cue-step.done small { color: #22C55E; }');
    css.push('.adventure-viewport { position: relative; width: 100%; height: 500px; border-radius: 0 0 22px 22px; overflow: hidden; cursor: grab; border: none; border-top: 1px solid rgba(64,88,120,0.06); box-shadow: inset 0 0 80px rgba(135,206,235,0.15); user-select: none; -webkit-user-select: none; touch-action: none; background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 100%); }');
    css.push('.adventure-viewport[data-zone] { background-color: #e9f2f8; background-position: center; background-size: cover; background-repeat: no-repeat; }');
    css.push('.adventure-viewport[data-zone="1"] { background-image: url("/images/zones/zone1.png"); }');
    css.push('.adventure-viewport[data-zone="2"] { background-image: url("/images/zones/zone2.png"); }');
    css.push('.adventure-viewport[data-zone="3"] { background-image: url("/images/zones/zone3.png"); }');
    css.push('.adventure-viewport[data-zone="4"] { background-image: url("/images/zones/zone4.png"); }');
    css.push('.adventure-viewport[data-zone] .map-bg-stack { opacity: 0; }');
    css.push('.adventure-viewport::after { content: ""; position: absolute; inset: 0; border-radius: 0 0 22px 22px; pointer-events: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2), inset 0 -30px 50px rgba(15, 23, 42, 0.06); }');
    css.push('.adventure-viewport:active, .adventure-viewport.dragging { cursor: grabbing; }');
    css.push('.map-bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }');
    css.push('.map-bg-sky { transition: background 0.8s ease; }');
    css.push('.map-bg-hills { background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 200\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M0,200 Q150,80 300,120 T600,80 T900,110 T1200,70 L1200,200 Z\' fill=\'%2368B868\'/%3E%3Cpath d=\'M0,200 Q200,100 400,130 T800,90 T1200,120 L1200,200 Z\' fill=\'%2358A858\'/%3E%3C/svg%3E"); background-size: 100% 140px; background-repeat: no-repeat; background-position: center 35%; }');
    css.push('.map-bg-grass { background: linear-gradient(180deg, transparent 0%, transparent 50%, #4CAF50 50%, #43A047 100%); }');
    css.push('.map-bg-clouds { background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 500 120\'%3E%3Cellipse cx=\'70\' cy=\'50\' rx=\'40\' ry=\'24\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'100\' cy=\'42\' rx=\'30\' ry=\'20\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'50\' cy=\'48\' rx=\'25\' ry=\'16\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'85\' cy=\'55\' rx=\'28\' ry=\'15\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'350\' cy=\'60\' rx=\'45\' ry=\'26\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'385\' cy=\'52\' rx=\'32\' ry=\'20\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'330\' cy=\'58\' rx=\'28\' ry=\'18\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'365\' cy=\'65\' rx=\'30\' ry=\'16\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3C/svg%3E"); background-size: 600px 120px; background-repeat: repeat-x; background-position: 0 15px; animation: cloudsDrift 90s linear infinite; }');
    css.push('@keyframes cloudsDrift { from { background-position-x: 0; } to { background-position-x: 600px; } }');
    css.push('.map-bg-trees { background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 200 70\'%3E%3Cpath d=\'M10,70 L20,35 L15,40 L25,18 L20,23 L30,0 L40,23 L35,18 L45,40 L40,35 L50,70 Z\' fill=\'%232E7D32\'/%3E%3Cpath d=\'M55,70 L63,42 L59,46 L67,28 L63,32 L71,14 L79,32 L75,28 L83,46 L79,42 L87,70 Z\' fill=\'%231B5E20\'/%3E%3Cpath d=\'M95,70 L107,32 L101,38 L113,10 L125,38 L119,32 L131,70 Z\' fill=\'%232E7D32\'/%3E%3Cpath d=\'M140,70 L148,45 L144,49 L152,32 L148,36 L156,20 L164,36 L160,32 L168,49 L164,45 L172,70 Z\' fill=\'%231B5E20\'/%3E%3C/svg%3E"); background-size: 250px 90px; background-repeat: repeat-x; background-position: 0 bottom; }');
    css.push('.adventure-canvas { position: absolute; top: 0; left: 0; width: 100%; will-change: transform; transition: transform 0.05s linear; z-index: 5; }');
    css.push('.adventure-viewport.dragging .adventure-canvas { transition: none; }');
    css.push('.map-bg-stack { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }');
    css.push('.map-bg-layer { z-index: 0; }');
    css.push('.map-decorations { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }');
    css.push('.map-decoration { position: absolute; font-size: 26px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.18)); opacity: 0.85; }');
    css.push('.map-decoration.animate { animation: decorSway 4s ease-in-out infinite; }');
    css.push('.map-town { position: absolute; display: flex; align-items: flex-end; gap: 6px; z-index: 2; pointer-events: none; }');
    css.push('.map-town-item { font-size: 26px; filter: drop-shadow(0 3px 6px rgba(15, 23, 42, 0.25)); }');
    css.push('.map-town-label { margin-left: 8px; padding: 4px 10px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #1e293b; font-family: "Fredoka", sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; box-shadow: 0 6px 14px rgba(15, 23, 42, 0.18); }');
    css.push('@keyframes decorSway { 0%, 100% { transform: rotate(-3deg) scale(1); } 50% { transform: rotate(3deg) scale(1.05); } }');
    css.push('.adventure-path-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 4; }');
    css.push('.path-shadow { fill: none; stroke-width: 36; stroke-linecap: round; stroke-linejoin: round; }');
    css.push('.path-main { fill: none; stroke-width: 30; stroke-linecap: round; stroke-linejoin: round; }');
    css.push('.path-light { fill: none; stroke-width: 22; stroke-linecap: round; stroke-linejoin: round; }');
    css.push('.path-dashes { fill: none; stroke: rgba(255,255,255,0.5); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 0 18; animation: dashMove 1s linear infinite; }');
    css.push('@keyframes dashMove { to { stroke-dashoffset: -36; } }');
    css.push('@keyframes roadDashFlow0 { to { stroke-dashoffset: -40; } }');
    css.push('@keyframes roadDashFlow1 { to { stroke-dashoffset: -56; } }');
    css.push('@keyframes roadDashFlow2 { to { stroke-dashoffset: -60; } }');
    css.push('@keyframes roadDashFlow3 { to { stroke-dashoffset: -68; } }');
    css.push('.road-dash-s0 { animation: roadDashFlow0 3s linear infinite; }');
    css.push('.road-dash-s1 { animation: roadDashFlow1 2s linear infinite; }');
    css.push('.road-dash-s2 { animation: roadDashFlow2 1.4s linear infinite; }');
    css.push('.road-dash-s3 { animation: roadDashFlow3 1s linear infinite; }');
    css.push('.adventure-nodes { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; }');
    css.push('.adventure-node { position: absolute; width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transform: translate(-50%, -50%); transition: transform 0.2s ease, box-shadow 0.2s ease; z-index: 10; overflow: visible; }');
    css.push('.adventure-node:hover { transform: translate(-50%, -50%) scale(1.15); z-index: 20; }');
    css.push('.adventure-node .node-emoji { font-size: 28px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2)); }');
    css.push('.adventure-node.completed { background: linear-gradient(145deg, #4ADE80 0%, #22C55E 100%); border: 4px solid #fff; box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4), 0 0 0 4px rgba(34, 197, 94, 0.2); }');
    css.push('.adventure-node.available { background: linear-gradient(145deg, #FBBF24 0%, #F59E0B 100%); border: 4px solid #fff; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5), 0 0 0 4px rgba(245, 158, 11, 0.25); animation: availablePulse 2s ease-in-out infinite; }');
    css.push('@keyframes availablePulse { 0%, 100% { box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5), 0 0 0 4px rgba(245, 158, 11, 0.25); } 50% { box-shadow: 0 8px 30px rgba(245, 158, 11, 0.7), 0 0 0 8px rgba(245, 158, 11, 0.15); } }');
    css.push('.adventure-node.locked { background: linear-gradient(145deg, #9CA3AF 0%, #6B7280 100%); border: 4px solid rgba(255,255,255,0.6); box-shadow: 0 4px 12px rgba(0,0,0,0.2); cursor: pointer; opacity: 0.8; }');
    css.push('.adventure-node.locked .node-emoji { filter: grayscale(0.7) drop-shadow(0 2px 3px rgba(0,0,0,0.2)); opacity: 0.6; }');
    css.push('.node-number { position: absolute; top: -6px; right: -6px; width: 26px; height: 26px; border-radius: 50%; background: #fff; border: 2px solid rgba(64,88,120,0.15); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #405878; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-family: "Fredoka", sans-serif; }');
    css.push('.node-badge { position: absolute; bottom: -4px; right: -4px; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }');
    css.push('.node-badge.check { background: linear-gradient(145deg, #10B981 0%, #059669 100%); color: #fff; }');
    css.push('.node-badge.star { background: linear-gradient(145deg, #FBBF24 0%, #F59E0B 100%); color: #fff; font-size: 14px; }');
    css.push('.node-category-dot { position: absolute; top: -4px; left: -4px; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }');
    css.push('.node-tooltip { position: absolute; bottom: calc(100% + 14px); left: 50%; transform: translateX(-50%) translateY(8px); background: rgba(30, 41, 59, 0.95); color: #fff; padding: 12px 16px; border-radius: 12px; font-size: 13px; white-space: nowrap; opacity: 0; pointer-events: none; transition: all 0.2s ease; z-index: 100; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }');
    css.push('.node-tooltip::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 8px solid transparent; border-top-color: rgba(30, 41, 59, 0.95); }');
    css.push('.adventure-node:hover .node-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }');
    css.push('.tooltip-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }');
    css.push('.tooltip-category { font-size: 11px; opacity: 0.7; margin-bottom: 4px; }');
    css.push('.tooltip-status { font-size: 12px; opacity: 0.85; }');
    css.push('.tooltip-status.ready { color: #FBBF24; }');
    css.push('.tooltip-status.done { color: #4ADE80; }');
    css.push('.current-indicator { position: absolute; top: -90px; left: calc(50% + 110px); transform: translateX(-50%); width: 132px; height: 132px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 16px 18px rgba(15, 23, 42, 0.45)); animation: characterBounce 1.2s ease-in-out infinite; z-index: 15; }');
    css.push('.current-indicator img { width: 100%; height: 100%; object-fit: contain; border-radius: 0; pointer-events: none; }');
    css.push('.current-indicator-label { position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); padding: 4px 10px; border-radius: 12px; background: rgba(255, 255, 255, 0.95); color: #1e3a8a; font-family: "Fredoka", sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; box-shadow: 0 6px 14px rgba(30, 64, 175, 0.2); white-space: nowrap; }');
    css.push('.adventure-node.is-current::after { content: ""; position: absolute; inset: -10px; border-radius: 50%; border: 3px dashed rgba(255, 255, 255, 0.9); box-shadow: 0 0 0 6px rgba(96, 165, 250, 0.25), 0 12px 24px rgba(30, 64, 175, 0.25); animation: currentRing 2.2s ease-in-out infinite; }');
    css.push('@keyframes currentRing { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.06); opacity: 0.6; } }');
    css.push('@keyframes characterBounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-8px); } }');
    css.push('.map-progress { position: absolute; top: 12px; left: 12px; background: rgba(255,255,255,0.95); padding: 10px 16px; border-radius: 14px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.12); border: 1px solid rgba(64,88,120,0.1); font-family: "Fredoka", sans-serif; z-index: 50; }');
    css.push('.cycle-complete-popup-overlay { position: fixed; inset: 0; background: rgba(17, 24, 39, 0.45); display: flex; align-items: center; justify-content: center; z-index: 12000; padding: 16px; animation: fadeInOverlay 0.25s ease; }');
    css.push('.cycle-complete-popup-wrap { position: relative; width: min(560px, 96vw); }');
    css.push('.cycle-complete-popup-daniel { position: absolute; top: -112px; left: 50%; transform: translateX(-50%); width: 180px; height: 180px; object-fit: contain; filter: drop-shadow(0 12px 16px rgba(0,0,0,0.28)); pointer-events: none; }');
    css.push('.cycle-complete-popup { margin-top: 56px; width: 100%; background: linear-gradient(180deg, #ffffff 0%, #fef3c7 100%); border-radius: 20px; border: 2px solid rgba(245, 158, 11, 0.35); box-shadow: 0 16px 38px rgba(15, 23, 42, 0.3); padding: 18px; font-family: "Fredoka", sans-serif; color: #7c5c00; }');
    css.push('.cycle-complete-popup-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }');
    css.push('.cycle-complete-popup-title { font-size: 22px; font-weight: 700; margin: 0; color: #9a6500; }');
    css.push('.cycle-complete-popup-text { font-size: 14px; color: #8f6a00; margin: 0 0 14px 0; line-height: 1.5; }');
    css.push('.cycle-complete-popup-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }');
    css.push('.cycle-popup-btn { border: 0; border-radius: 12px; padding: 10px 14px; font-family: "Fredoka", sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }');
    css.push('.cycle-popup-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(124, 92, 0, 0.2); }');
    css.push('.cycle-popup-btn.primary { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; }');
    css.push('.cycle-popup-btn.secondary { background: #fff; color: #8f6a00; border: 2px solid rgba(245, 158, 11, 0.3); }');
    css.push('.cycle-complete-popup-selectors { display: none; gap: 8px; flex-wrap: wrap; align-items: center; }');
    css.push('.cycle-complete-popup-selectors.visible { display: flex; }');
    css.push('@keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }');
    css.push('.progress-icon { font-size: 20px; }');
    css.push('.progress-text { font-size: 14px; font-weight: 600; color: #405878; }');
    css.push('.progress-bar { width: 80px; height: 8px; background: #E5E7EB; border-radius: 4px; overflow: hidden; }');
    css.push('.progress-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }');
    css.push('.scroll-hint { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(30, 41, 59, 0.85); color: #fff; padding: 10px 20px; border-radius: 24px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; z-index: 50; animation: hintFade 3s ease-in-out infinite; }');
    css.push('@keyframes hintFade { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.6; } }');
    css.push('.scroll-hint.hidden { opacity: 0; pointer-events: none; }');
    css.push('.scroll-hint-icon { font-size: 16px; animation: hintBounce 1s ease-in-out infinite; }');
    css.push('@keyframes hintBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }');
    css.push('.map-controls { position: absolute; bottom: 16px; right: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 50; }');
    css.push('.map-btn { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.95); border: 1px solid rgba(64,88,120,0.12); display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }');
    css.push('.map-btn:hover { background: #fff; transform: scale(1.08); }');
    css.push('.map-marker { position: absolute; width: 46px; height: 46px; z-index: 5; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25)); pointer-events: none; background-repeat: no-repeat; background-position: center; background-size: contain; }');
    css.push('.map-marker.start { background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Cpath fill=\'%23ffffff\' d=\'M32 6c-9 0-16 7-16 16 0 12 16 32 16 32s16-20 16-32c0-9-7-16-16-16z\'/%3E%3Cpath fill=\'%234f6b8f\' d=\'M32 10c-6.6 0-12 5.4-12 12 0 8.8 12 26 12 26s12-17.2 12-26c0-6.6-5.4-12-12-12z\'/%3E%3Ccircle cx=\'32\' cy=\'22\' r=\'6\' fill=\'%23f8fafc\'/%3E%3C/svg%3E"); animation: markerPop 0.5s ease-out; }');
    css.push('.map-marker.finish { background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Cpath fill=\'%2340597a\' d=\'M16 10h4v44h-4z\'/%3E%3Cpath fill=\'%23ffffff\' d=\'M20 14l28 6-12 6 12 6-28 6z\'/%3E%3Cpath fill=\'%23e2e8f0\' d=\'M20 14l20 4-10 5 10 5-20 4z\'/%3E%3C/svg%3E"); animation: flagWave 1.5s ease-in-out infinite; }');
    css.push('@keyframes markerPop { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }');
    css.push('@keyframes flagWave { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }');
    css.push('.floating-cloud { position: absolute; font-size: 40px; opacity: 0.6; z-index: 0; animation: cloudFloat 20s linear infinite; pointer-events: none; }');
    css.push('@keyframes cloudFloat { 0% { transform: translateX(-100px); } 100% { transform: translateX(calc(100% + 100px)); } }');
    css.push('.zone-label { position: absolute; font-family: "Fredoka", sans-serif; font-size: 13px; font-weight: 700; color: rgba(255, 255, 255, 0.95); text-transform: uppercase; letter-spacing: 1.3px; pointer-events: none; z-index: 4; text-shadow: 0 2px 6px rgba(0,0,0,0.4); background: rgba(15, 23, 42, 0.35); padding: 6px 14px; border-radius: 16px; }');
    css.push('.map-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; text-align: center; color: #6d86a8; }');
    css.push('.map-empty-emoji { font-size: 64px; margin-bottom: 16px; opacity: 0.6; }');
    css.push('.map-empty-title { font-family: "Fredoka", sans-serif; font-size: 20px; font-weight: 600; color: #405878; margin-bottom: 8px; }');
    css.push('.map-empty-text { font-size: 14px; max-width: 300px; }');
    
    // Enhanced "next" node styles - bigger, pulsing, dramatic
    css.push('.adventure-node.available { width: 82px; height: 82px; background: linear-gradient(145deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%); animation: nextNodePulse 2s ease-in-out infinite, nextNodeGlow 1.5s ease-in-out infinite alternate; }');
    css.push('.adventure-node.available .node-emoji { font-size: 32px; animation: emojiShake 0.5s ease-in-out infinite; }');
    css.push('@keyframes nextNodePulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.08); } }');
    css.push('@keyframes nextNodeGlow { 0% { box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5), 0 0 0 4px rgba(245, 158, 11, 0.25), 0 0 30px rgba(245, 158, 11, 0.3); } 100% { box-shadow: 0 8px 35px rgba(245, 158, 11, 0.8), 0 0 0 8px rgba(245, 158, 11, 0.2), 0 0 50px rgba(245, 158, 11, 0.5); } }');
    css.push('@keyframes emojiShake { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }');
    
    // Daniel companion on path styles
    css.push('.daniel-companion { position: absolute; width: 64px; height: 64px; z-index: 12; pointer-events: none; transition: all 0.5s ease; }');
    css.push('.daniel-companion-inner { width: 100%; height: 100%; border-radius: 50%; background: rgba(255,255,255,0.95); padding: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); animation: danielWalk 1s ease-in-out infinite; }');
    css.push('.daniel-companion img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }');
    css.push('.daniel-expression-label { position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 600; color: #405878; white-space: nowrap; background: rgba(255,255,255,0.9); padding: 2px 8px; border-radius: 10px; font-family: "Fredoka", sans-serif; }');
    css.push('@keyframes danielWalk { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }');
    
    // Destination marker styles
    css.push('.destination-marker { position: absolute; z-index: 6; text-align: center; pointer-events: none; animation: destinationFloat 3s ease-in-out infinite; }');
    css.push('.destination-icon { font-size: 52px; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.3)); }');
    css.push('.destination-label { font-family: "Fredoka", sans-serif; font-size: 14px; font-weight: 700; color: #fff; background: linear-gradient(135deg, rgba(34,197,94,0.9), rgba(22,163,74,0.9)); padding: 6px 14px; border-radius: 20px; margin-top: 8px; display: inline-block; box-shadow: 0 3px 10px rgba(0,0,0,0.2); }');
    css.push('@keyframes destinationFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }');
    
    // Mini-moments on path (signposts, campfires)
    css.push('.path-moment { position: absolute; z-index: 3; pointer-events: none; text-align: center; }');
    css.push('.path-moment-icon { font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }');
    css.push('.path-moment-label { font-family: "Fredoka", sans-serif; font-size: 11px; font-weight: 600; color: #405878; background: rgba(255,255,255,0.9); padding: 3px 8px; border-radius: 8px; margin-top: 4px; display: block; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }');
    css.push('.path-moment.campfire .path-moment-icon { animation: campfireFlicker 0.5s ease-in-out infinite alternate; }');
    css.push('@keyframes campfireFlicker { 0% { transform: scale(1); filter: drop-shadow(0 2px 4px rgba(255,100,0,0.4)); } 100% { transform: scale(1.1); filter: drop-shadow(0 2px 8px rgba(255,150,0,0.6)); } }');
    
    // Environmental feedback elements
    css.push('.env-element { position: absolute; pointer-events: none; z-index: 1; transition: opacity 0.5s ease; }');
    css.push('.env-element.bloom { animation: bloomIn 0.8s ease-out forwards; }');
    css.push('@keyframes bloomIn { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }');
    css.push('.env-butterfly { animation: butterflyFloat 4s ease-in-out infinite; }');
    css.push('@keyframes butterflyFloat { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 25% { transform: translate(10px, -15px) rotate(5deg); } 50% { transform: translate(20px, 0) rotate(0deg); } 75% { transform: translate(10px, 10px) rotate(-5deg); } }');
    css.push('.env-bird { animation: birdFly 6s ease-in-out infinite; }');
    css.push('@keyframes birdFly { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -20px); } }');
    css.push('.env-sparkle { animation: sparkleShine 1.5s ease-in-out infinite; }');
    css.push('@keyframes sparkleShine { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }');
    
    // Progress-reactive grass layer
    css.push('.map-bg-grass-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 50%; pointer-events: none; transition: background 0.8s ease; }');
    
    // Cracked ground effect for start zone
    css.push('.env-crack { position: absolute; font-size: 20px; opacity: 0.6; pointer-events: none; }');
    
    // Zone upgrade celebration styles
    css.push('.zone-upgrade-shimmer { position: absolute; inset: 0; z-index: 60; pointer-events: none; background: linear-gradient(135deg, rgba(255,215,0,0.0) 0%, rgba(255,215,0,0.45) 40%, rgba(255,255,255,0.7) 50%, rgba(255,215,0,0.45) 60%, rgba(255,215,0,0.0) 100%); background-size: 300% 300%; animation: zoneShimmerSweep 1.2s ease-out forwards; border-radius: 20px; }');
    css.push('@keyframes zoneShimmerSweep { 0% { background-position: 150% 150%; opacity: 0; } 30% { opacity: 1; } 100% { background-position: -50% -50%; opacity: 0; } }');
    
    css.push('.zone-upgrade-banner { position: absolute; top: 0; left: 0; right: 0; z-index: 80; display: flex; flex-direction: column; align-items: center; padding: 0; animation: zoneBannerSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; transform: translateY(-100%); pointer-events: auto; }');
    css.push('.zone-upgrade-banner.dismissing { animation: zoneBannerSlideOut 0.5s ease-in forwards; }');
    css.push('@keyframes zoneBannerSlideIn { 0% { transform: translateY(-100%); } 100% { transform: translateY(0); } }');
    css.push('@keyframes zoneBannerSlideOut { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-100%); opacity: 0; } }');
    
    css.push('.zone-upgrade-card { position: relative; width: 92%; max-width: 420px; margin-top: 16px; background: linear-gradient(135deg, #fffbe6 0%, #fff7cc 40%, #fff3b0 100%); border: 3px solid #f59e0b; border-radius: 20px; padding: 20px 20px 18px; box-shadow: 0 8px 32px rgba(245, 158, 11, 0.35), 0 0 0 6px rgba(245, 158, 11, 0.12), inset 0 1px 0 rgba(255,255,255,0.8); text-align: center; overflow: visible; cursor: pointer; }');
    css.push('.zone-upgrade-card::before { content: ""; position: absolute; inset: -3px; border-radius: 22px; background: linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24, #fcd34d); z-index: -1; animation: zoneBorderGlow 2s ease-in-out infinite; }');
    css.push('@keyframes zoneBorderGlow { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }');
    
    css.push('.zone-upgrade-daniel { width: 80px; height: 80px; margin: -56px auto 8px; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.25)); animation: zoneDanielBounce 0.8s ease-in-out 0.4s infinite alternate; }');
    css.push('.zone-upgrade-daniel img { width: 100%; height: 100%; object-fit: contain; }');
    css.push('@keyframes zoneDanielBounce { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-8px) scale(1.05); } }');
    
    css.push('.zone-upgrade-emoji { font-size: 36px; margin-bottom: 4px; animation: zoneEmojiPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both; }');
    css.push('@keyframes zoneEmojiPop { 0% { transform: scale(0); } 100% { transform: scale(1); } }');
    
    css.push('.zone-upgrade-title { font-family: "Fredoka", "League Spartan", system-ui, sans-serif; font-size: 20px; font-weight: 700; color: #92400e; margin: 0 0 4px; line-height: 1.2; }');
    css.push('.zone-upgrade-subtitle { font-family: "Fredoka", sans-serif; font-size: 13px; color: #b45309; margin: 0 0 10px; line-height: 1.4; }');
    
    css.push('.zone-upgrade-new-label { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-family: "Fredoka", sans-serif; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 3px 8px rgba(217, 119, 6, 0.35); }');
    
    css.push('.zone-upgrade-tap-hint { font-family: "Fredoka", sans-serif; font-size: 11px; color: #d97706; margin-top: 8px; opacity: 0.7; }');
    
    css.push('.zone-upgrade-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: 20px; z-index: 79; }');
    css.push('.zone-confetti-piece { position: absolute; width: 8px; height: 8px; border-radius: 2px; animation: zoneConfettiFall 2.5s ease-in forwards; }');
    css.push('@keyframes zoneConfettiFall { 0% { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; } 100% { transform: translateY(500px) rotate(720deg) scale(0.3); opacity: 0; } }');
    
    css.push('@media (max-width: 768px) { .adventure-viewport { height: 420px; } .adventure-node { width: 58px; height: 58px; } .adventure-node .node-emoji { font-size: 24px; } .node-number { width: 20px; height: 20px; font-size: 9px; } .node-badge { width: 22px; height: 22px; font-size: 11px; } .category-filter-container { flex-direction: column; align-items: stretch; } .category-filter-select { width: 100%; } .path-shadow { stroke-width: 24 !important; } .path-main { stroke-width: 20 !important; } .path-light { stroke-width: 14 !important; } .map-decoration { font-size: 20px; } .map-town-item { font-size: 22px; } .map-town-label { font-size: 10px; } .zone-label { font-size: 12px; padding: 4px 10px; } .current-indicator { width: 104px; height: 104px; top: -80px; left: calc(50% + 78px); } .current-indicator-label { font-size: 10px; } .adventure-node.is-current::after { inset: -8px; } .node-tooltip { font-size: 12px; padding: 10px 12px; } .map-progress { padding: 8px 12px; font-size: 12px; } .progress-bar { width: 60px; } .progress-text { font-size: 12px; } .progress-icon { font-size: 16px; } .cycle-complete-popup-title { font-size: 19px; } .cycle-complete-popup-actions, .cycle-complete-popup-selectors { flex-direction: column; } .cycle-popup-btn { width: 100%; } .cycle-complete-popup-daniel { width: 140px; height: 140px; top: -86px; } .zone-upgrade-card { padding: 16px 14px 14px; max-width: 340px; } .zone-upgrade-title { font-size: 17px; } .zone-upgrade-subtitle { font-size: 12px; } .zone-upgrade-daniel { width: 64px; height: 64px; margin-top: -44px; } .zone-upgrade-emoji { font-size: 28px; } }');
    
    var styles = document.createElement('style');
    styles.id = 'adventure-map-v4-styles';
    styles.textContent = css.join('\n');
    document.head.appendChild(styles);
  }

  ensureZoneStyles() {
    if (document.getElementById('adventure-map-zones-css')) return;
    var link = document.createElement('link');
    link.id = 'adventure-map-zones-css';
    link.rel = 'stylesheet';
    link.href = './src/adventure-map-zones.css';
    document.head.appendChild(link);
  }

  render() {
    var self = this;

    // Get data first (synchronous)
    getDashboardData();
    this.buildModuleList();
    this.filterModulesByCategory();

    console.log('[AdventureMap] render() — allModules:', this.allModules.length, 'filtered:', this.modules.length, 'category:', this.currentCategory, 'window.modules:', (window.modules || []).length, 'window.childModules:', (window.childModules || []).length);

    // If filter produced no results but modules exist, fall back to first available category
    if (this.modules.length === 0 && this.allModules.length > 0) {
      console.log('[AdventureMap] Category "' + this.currentCategory + '" has no modules — falling back');
      var fallbackCategories = this.getAvailableCategories();
      if (fallbackCategories.length > 0) {
        this.currentCategory = fallbackCategories[0];
        this.currentCycleId = null;
        this.filterModulesByCategory();
        console.log('[AdventureMap] Fell back to category:', this.currentCategory, 'modules:', this.modules.length);
      }
    }

    // Run DOM updates directly — callers already handle framing
    this.createMapHTML();
    this.setupEventListeners();

    if (this.modules.length > 0) {
      this.applyThemeToBackground();
      this.renderPath();
      this.renderDecorations();
      this.renderNodes();
      this.updateProgress();

      // Render roadblocks asynchronously to avoid blocking
      this.renderRoadblocks().then(function() {
        setTimeout(function() { self.centerOnCurrentModule(); }, 100);
        if (typeof window._dashboardRenderComplete === 'function') {
          window._dashboardRenderComplete();
          window._dashboardRenderComplete = null;
        }
      }).catch(function(err) {
        console.log('Roadblock rendering error:', err);
        setTimeout(function() { self.centerOnCurrentModule(); }, 100);
        if (typeof window._dashboardRenderComplete === 'function') {
          window._dashboardRenderComplete();
          window._dashboardRenderComplete = null;
        }
      });
    } else {
      // No modules to render - still signal completion
      if (typeof window._dashboardRenderComplete === 'function') {
        window._dashboardRenderComplete();
        window._dashboardRenderComplete = null;
      }
    }
  }
  
  // NEW: Initialize and render roadblocks on the adventure map
  async renderRoadblocks() {
    var self = this;
    var nodesContainer = document.getElementById('adventureNodes');
    if (!nodesContainer || this.modules.length < 2) return;
    
    // Initialize roadblock system if not already done
    if (window.roadblockSystem && !window.roadblockSystem.initialized) {
      var child = window.selectedChild || (window.state && window.state.selectedChild) || dashboardSelectedChild;
      if (child && child.id && window.supabase) {
        try {
          await window.roadblockSystem.init(window.supabase, child.id);
        } catch (error) {
          console.log('Could not initialize roadblock system:', error);
          return;
        }
      } else {
        return;
      }
    }
    
    if (!window.roadblockSystem || !window.roadblockSystem.initialized) return;
    
    // Calculate node positions for roadblock spawning
    var positions = this.calculateNodePositions();
    
    // Calculate roadblock spawn positions
    var spawns = window.roadblockSystem.calculateSpawnPositions(this.modules, positions);
    
    // Render roadblocks on the map
    if (spawns.length > 0) {
      window.roadblockSystem.renderRoadblocks(nodesContainer);
      console.log('Rendered', spawns.length, 'roadblocks on the map');
    }
  }

  buildModuleList() {
    var dashMods = window.modules || dashboardModules || [];
    var childMods = window.childModules || dashboardChildModules || [];
    var cycleLookup = {};
    if (cyclesFromDB && cyclesFromDB.length > 0) {
      cyclesFromDB.forEach(function(cycle) {
        if (cycle && cycle.id) {
          cycleLookup[cycle.id] = cycle;
        }
      });
    }

    if (dashMods.length > 0) {
      var seriesOrder = { 'luna': 1, 'Luna': 1, 'daniel': 2, 'Daniel': 2 };

      // Filter to only active modules
      var activeMods = dashMods.filter(function(m) { return m.is_active !== false; });

      var sorted = activeMods.slice().sort(function(a, b) {
        var seriesA = (a.series && a.series.label) || a.series_name || a.series || '';
        var seriesB = (b.series && b.series.label) || b.series_name || b.series || '';
        var seriesOrderA = seriesOrder[seriesA] || seriesOrder[seriesA.toLowerCase ? seriesA.toLowerCase() : ''] || 100;
        var seriesOrderB = seriesOrder[seriesB] || seriesOrder[seriesB.toLowerCase ? seriesB.toLowerCase() : ''] || 100;
        if (seriesOrderA !== seriesOrderB) return seriesOrderA - seriesOrderB;
        var posA = a.position !== undefined ? a.position : (a.order !== undefined ? a.order : (a.sort_order !== undefined ? a.sort_order : 0));
        var posB = b.position !== undefined ? b.position : (b.order !== undefined ? b.order : (b.sort_order !== undefined ? b.sort_order : 0));
        return posA - posB;
      });

      var self = this;
      this.allModules = sorted.map(function(m, index) {
        var childModule = childMods.find(function(cm) { return cm.module_id === m.id; }) || null;
        var completed = !!(childModule && childModule.is_completed);
        var isLocked = childModule ? childModule.locked !== false : true;
        var status = completed ? 'completed' : (isLocked ? 'locked' : 'available');
        var seriesName = (m.series && m.series.label) || m.series_name || m.series || '';
        
        // Get super skill slug - prioritize super_skill_id, fallback to category mapping
        var superSkillSlug = 'all';
        if (m.super_skill_id) {
          // Look up super skill slug from loaded data
          var superSkill = superSkillsFromDB.find(function(s) { return s.id === m.super_skill_id; });
          if (superSkill && superSkill.slug) {
            superSkillSlug = superSkill.slug;
          }
        } else {
          // Fallback: map old category to super skill
          var oldCategory = ((m.category && m.category.name) || (m.category && typeof m.category === 'string' ? m.category : '') || m.category_name || '').toLowerCase();
          if (oldCategory && CATEGORY_TO_SUPERSKILL[oldCategory]) {
            superSkillSlug = CATEGORY_TO_SUPERSKILL[oldCategory];
          }
        }
        
        var pathwayOrder = (m.pathway_order !== undefined && m.pathway_order !== null) ? Number(m.pathway_order) : 
                          (m.week_number !== undefined && m.week_number !== null) ? Number(m.week_number) : null;
        var cycleMeta = (m.cycle_id && cycleLookup[m.cycle_id]) ? cycleLookup[m.cycle_id] : null;
        var cycleNumber = cycleMeta && cycleMeta.cycle_number !== undefined ? cycleMeta.cycle_number : (m.cycle_number || null);
        var cycleName = cycleMeta && cycleMeta.name ? cycleMeta.name : '';

        return {
          id: m.id,
          code: m.module_code || m.code || m.id,
          name: m.title || 'Module ' + (index + 1),
          series: seriesName,
          category: superSkillSlug, // Use super skill slug as "category" for theme lookup
          superSkillSlug: superSkillSlug,
          status: status,
          completed: completed,
          pathwayOrder: pathwayOrder,
          cycleId: m.cycle_id || null,
          cycleNumber: cycleNumber,
          cycleName: cycleName,
          emoji: self.getModuleEmoji(m, superSkillSlug),
          module: m,
          childModule: childModule,
          locked: isLocked
        };
      });
    }

    // No placeholder modules - if no modules exist, show empty state
    // Previously there were hardcoded demo modules here that caused confusion
    if (this.allModules.length === 0) {
      console.log('No modules loaded - will show empty state');
    }
  }

  filterModulesByCategory() {
    var self = this;
    if (!this.currentCategory) {
      // If no category selected, use the first available one
      var availableCategories = this.getAvailableCategories();
      this.currentCategory = availableCategories.length > 0 ? availableCategories[0] : 'all';
    }

    var availableCycles = this.getAvailableCyclesForCategory();
    if (!this.currentCycleId || (availableCycles.length > 0 && !availableCycles.find(function(cycle) { return String(cycle.id) === String(self.currentCycleId); }))) {
      this.syncCycleSelection(availableCycles);
    }
    if (this.currentCycleId) {
      this.setStoredCycleId(this.currentCategory, this.currentCycleId);
    }
    
    this.modules = this.allModules.filter(function(m) { 
      var categoryMatch = (m.superSkillSlug === self.currentCategory) || (m.category === self.currentCategory);
      if (!categoryMatch) return false;
      if (!self.currentCycleId) return true;
      return String(m.cycleId) === String(self.currentCycleId);
    });

    // Pathway ordering: if modules have pathway_order, sort ascending (1,2,3...).
    // Fallback keeps original order for items without pathway_order.
    this.modules.sort(function(a, b) {
      var ao = (a.pathwayOrder !== null && a.pathwayOrder !== undefined) ? a.pathwayOrder : Number.POSITIVE_INFINITY;
      var bo = (b.pathwayOrder !== null && b.pathwayOrder !== undefined) ? b.pathwayOrder : Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return 0;
    });

    // Respect per-child lock state from child_modules.locked and only allow the next locked module to be unlockable.
    var firstLockedIndex = -1;
    for (var i = 0; i < this.modules.length; i++) {
      var moduleForLockCheck = this.modules[i];
      if (!moduleForLockCheck.completed && moduleForLockCheck.locked && firstLockedIndex === -1) {
        firstLockedIndex = i;
      }
    }

    for (var j = 0; j < this.modules.length; j++) {
      var mod = this.modules[j];
      mod.canUnlock = false;
      if (mod.completed) {
        mod.status = 'completed';
      } else if (mod.locked) {
        mod.status = 'locked';
        mod.canUnlock = j === firstLockedIndex;
      } else {
        mod.status = 'available';
      }
    }
  }

  getAvailableCategories() {
    var categories = [];
    var seen = {};
    this.allModules.forEach(function(m) {
      var slug = m.superSkillSlug || m.category;
      if (slug && !seen[slug] && SUPER_SKILL_THEMES[slug]) {
        seen[slug] = true;
        categories.push(slug);
      }
    });
    return categories;
  }

  getCycleStorageKey(category) {
    return 'adventureMapSelectedCycle_' + (category || 'all');
  }

  getStoredCycleId(category) {
    try {
      return localStorage.getItem(this.getCycleStorageKey(category));
    } catch (e) {
      return null;
    }
  }

  setStoredCycleId(category, cycleId) {
    try {
      if (cycleId) {
        localStorage.setItem(this.getCycleStorageKey(category), String(cycleId));
      } else {
        localStorage.removeItem(this.getCycleStorageKey(category));
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  getStoredCategory() {
    try {
      return localStorage.getItem('adventureMapSelectedCategory');
    } catch (e) {
      return null;
    }
  }

  setStoredCategory(category) {
    try {
      if (category) {
        localStorage.setItem('adventureMapSelectedCategory', String(category));
      } else {
        localStorage.removeItem('adventureMapSelectedCategory');
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  getAvailableCyclesForCategory(categoryOverride) {
    var category = categoryOverride || this.currentCategory;
    var cycles = [];
    if (cyclesFromDB && cyclesFromDB.length > 0 && superSkillsFromDB && superSkillsFromDB.length > 0) {
      var skill = superSkillsFromDB.find(function(s) { return s.slug === category; });
      if (skill) {
        cycles = cyclesFromDB.filter(function(cycle) { return cycle.super_skill_id === skill.id; });
      }
    }

    if (cycles.length === 0) {
      var seen = {};
      this.allModules.forEach(function(m) {
        if ((m.superSkillSlug === category || m.category === category) && m.cycleId && !seen[m.cycleId]) {
          seen[m.cycleId] = true;
          cycles.push({
            id: m.cycleId,
            cycle_number: m.cycleNumber,
            name: m.cycleName
          });
        }
      });
    }

    cycles.sort(function(a, b) {
      var aNum = a.cycle_number !== undefined && a.cycle_number !== null ? Number(a.cycle_number) : Number.POSITIVE_INFINITY;
      var bNum = b.cycle_number !== undefined && b.cycle_number !== null ? Number(b.cycle_number) : Number.POSITIVE_INFINITY;
      if (aNum !== bNum) return aNum - bNum;
      return String(a.id).localeCompare(String(b.id));
    });

    return cycles;
  }

  syncCycleSelection(availableCycles) {
    if (!availableCycles || availableCycles.length === 0) {
      this.currentCycleId = null;
      return;
    }

    var self = this;
    var selectableCycles = availableCycles.filter(function(cycle) {
      return !self.isCycleCompletedWithWeekCheck(self.currentCategory, cycle.id);
    });
    var cyclePool = selectableCycles.length > 0 ? selectableCycles : availableCycles;

    var stored = this.getStoredCycleId(this.currentCategory);
    var storedMatch = stored ? cyclePool.find(function(cycle) { return String(cycle.id) === String(stored); }) : null;
    if (storedMatch) {
      this.currentCycleId = storedMatch.id;
      return;
    }

    var cycleOne = cyclePool.find(function(cycle) { return Number(cycle.cycle_number) === 1; });
    this.currentCycleId = cycleOne ? cycleOne.id : cyclePool[0].id;
  }

  isCycleComplete(completedCount, totalCount) {
    return completedCount >= this.cycleModuleTarget && totalCount >= this.cycleModuleTarget;
  }

  isModuleComplete(module) {
    return !!(module && (module.completed || module.status === 'completed'));
  }

  isCycleCompletedWithWeekCheck(category, cycleId) {
    if (!category || !cycleId) return false;
    var cycleModules = this.allModules.filter(function(module) {
      var categoryMatch = module.superSkillSlug === category || module.category === category;
      return categoryMatch && String(module.cycleId) === String(cycleId);
    });

    if (!cycleModules.length) return false;

    var week12Modules = cycleModules.filter(function(module) {
      return Number(module.pathwayOrder) === 12;
    });
    var previousWeeks = cycleModules.filter(function(module) {
      var week = Number(module.pathwayOrder);
      return week > 0 && week < 12;
    });

    if (week12Modules.length > 0 && previousWeeks.length > 0) {
      var week12Completed = week12Modules.every(function(module) { return this.isModuleComplete(module); }.bind(this));
      var previousCompleted = previousWeeks.every(function(module) { return this.isModuleComplete(module); }.bind(this));
      return week12Completed && previousCompleted;
    }

    var completedCount = cycleModules.filter(function(module) { return this.isModuleComplete(module); }.bind(this)).length;
    return this.isCycleComplete(completedCount, cycleModules.length);
  }

  getEligibleSkillCycleOptions() {
    var self = this;
    var categories = this.getAvailableCategories();
    return categories.map(function(category) {
      var theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.all;
      var cycles = self.getAvailableCyclesForCategory(category).filter(function(cycle) {
        return !self.isCycleCompletedWithWeekCheck(category, cycle.id);
      });
      return {
        category: category,
        theme: theme,
        cycles: cycles
      };
    }).filter(function(entry) {
      return entry.cycles.length > 0;
    });
  }

  clearCycleCompletionPopupWatcher() {
    if (this.cycleCompletionPopupObserver) {
      this.cycleCompletionPopupObserver.disconnect();
      this.cycleCompletionPopupObserver = null;
    }
    if (this.cycleCompletionPopupTimer) {
      clearTimeout(this.cycleCompletionPopupTimer);
      this.cycleCompletionPopupTimer = null;
    }
  }

  maybeShowCycleCompletionPopup() {
    var mapSection = document.querySelector('.adventure-map-section');
    var cycleComplete = !!(this.currentCycleId && this.isCycleCompletedWithWeekCheck(this.currentCategory, this.currentCycleId));
    if (!mapSection || !cycleComplete) {
      this.clearCycleCompletionPopupWatcher();
      return;
    }

    if (this.lastCyclePopupShownId === this.currentCycleId || this.activeCycleCompletionPopup) {
      return;
    }

    var self = this;
    this.clearCycleCompletionPopupWatcher();
    this.cycleCompletionPopupObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.45) return;
        self.clearCycleCompletionPopupWatcher();
        self.cycleCompletionPopupTimer = setTimeout(function() {
          var stillComplete = !!(self.currentCycleId && self.isCycleCompletedWithWeekCheck(self.currentCategory, self.currentCycleId));
          if (!stillComplete || self.activeCycleCompletionPopup) return;
          self.showCycleCompletionPopup();
        }, 2200);
      });
    }, { threshold: [0.45] });

    this.cycleCompletionPopupObserver.observe(mapSection);
  }

  showCycleCompletionPopup() {
    if (!this.currentCycleId) return;
    var self = this;
    var allSkillCycleOptions = this.getAvailableCategories().map(function(category) {
      return {
        category: category,
        theme: CATEGORY_THEMES[category] || CATEGORY_THEMES.all,
        cycles: self.getAvailableCyclesForCategory(category)
      };
    }).filter(function(option) { return option.cycles && option.cycles.length > 0; });
    var eligibleOptions = this.getEligibleSkillCycleOptions();
    var overlay = document.createElement('div');
    overlay.className = 'cycle-complete-popup-overlay';

    var theme = CATEGORY_THEMES[this.currentCategory] || CATEGORY_THEMES.all;
    var optionsHtml = allSkillCycleOptions.map(function(option) {
      return '<option value="' + option.category + '">' + option.theme.emoji + ' ' + option.theme.name + '</option>';
    }).join('');

    overlay.innerHTML =
      '<div class="cycle-complete-popup-wrap">' +
      '<img src="/images/characters/DanielTheDogThumbsUp.webp" alt="Daniel thumbs up" class="cycle-complete-popup-daniel" />' +
      '<div class="cycle-complete-popup" role="dialog" aria-modal="true" aria-label="Cycle completion congratulations">' +
      '<div class="cycle-complete-popup-header">' +
      '<h3 class="cycle-complete-popup-title">🎉 Congratulations!</h3>' +
      '</div>' +
      '<p class="cycle-complete-popup-text">You completed this cycle in ' + theme.name + '. Would you like to move to your next cycle, or choose a different super skill?</p>' +
      '<div class="cycle-complete-popup-actions">' +
      '<button class="cycle-popup-btn primary" id="cyclePopupNextBtn" type="button">Move to next cycle</button>' +
      '<button class="cycle-popup-btn secondary" id="cyclePopupDifferentBtn" type="button">Choose different super skill</button>' +
      '<button class="cycle-popup-btn secondary" id="cyclePopupReviewBtn" type="button">Review completed modules</button>' +
      '</div>' +
      '<div class="cycle-complete-popup-selectors" id="cyclePopupSelectors">' +
      '<select class="category-filter-select" id="cyclePopupSkillSelect">' + optionsHtml + '</select>' +
      '<select class="category-filter-select" id="cyclePopupCycleSelect"></select>' +
      '<button class="cycle-popup-btn primary" id="cyclePopupGoBtn" type="button">Go</button>' +
      '</div>' +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    this.activeCycleCompletionPopup = overlay;

    var selectors = overlay.querySelector('#cyclePopupSelectors');
    var skillSelect = overlay.querySelector('#cyclePopupSkillSelect');
    var cycleSelect = overlay.querySelector('#cyclePopupCycleSelect');

    var renderCycleSelectOptions = function() {
      var selectedSkill = skillSelect.value;
      var selected = allSkillCycleOptions.find(function(option) { return option.category === selectedSkill; });
      var cycles = selected ? selected.cycles : [];
      cycleSelect.innerHTML = cycles.map(function(cycle) {
        var label = cycle.cycle_number ? ('Cycle ' + cycle.cycle_number) : 'Cycle';
        if (cycle.name) label += ': ' + cycle.name;
        return '<option value="' + cycle.id + '">' + label + '</option>';
      }).join('');
      cycleSelect.disabled = cycles.length === 0;
    };

    if (skillSelect) {
      if (!allSkillCycleOptions.length) {
        skillSelect.innerHTML = '<option value="">No available super skills</option>';
        skillSelect.disabled = true;
      } else {
        var currentSkillOption = allSkillCycleOptions.find(function(option) { return option.category === self.currentCategory; });
        skillSelect.value = currentSkillOption ? currentSkillOption.category : allSkillCycleOptions[0].category;
        renderCycleSelectOptions();
      }
    }

    var closePopup = function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      self.activeCycleCompletionPopup = null;
      self.lastCyclePopupShownId = self.currentCycleId;
    };

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closePopup();
    });

    overlay.querySelector('#cyclePopupNextBtn').addEventListener('click', function() {
      var currentSkill = eligibleOptions.find(function(option) { return option.category === self.currentCategory; });
      var nextCycle = currentSkill && currentSkill.cycles.length > 0 ? currentSkill.cycles[0] : null;
      if (!nextCycle) {
        selectors.classList.add('visible');
        return;
      }
      self.currentCycleId = nextCycle.id;
      self.setStoredCycleId(self.currentCategory, self.currentCycleId);
      closePopup();
      self.render();
    });

    overlay.querySelector('#cyclePopupDifferentBtn').addEventListener('click', function() {
      selectors.classList.add('visible');
      renderCycleSelectOptions();
    });

    overlay.querySelector('#cyclePopupReviewBtn').addEventListener('click', function() {
      closePopup();
    });

    overlay.querySelector('#cyclePopupGoBtn').addEventListener('click', function() {
      if (!skillSelect.value || !cycleSelect.value) return;
      self.currentCategory = skillSelect.value;
      self.setStoredCategory(self.currentCategory);
      self.currentCycleId = cycleSelect.value;
      self.setStoredCycleId(self.currentCategory, self.currentCycleId);
      closePopup();
      self.render();
    });
  }

  maybeCelebrateCycleCompletion() {
    if (!this.currentCycleId) return;
    var storageKey = 'adventureMapCycleComplete_' + this.currentCycleId;
    try {
      if (localStorage.getItem(storageKey) === 'true') return;
      if (typeof createConfettiCelebration === 'function') {
        createConfettiCelebration();
      }
      localStorage.setItem(storageKey, 'true');
    } catch (e) {
      if (typeof createConfettiCelebration === 'function') {
        createConfettiCelebration();
      }
    }
  }

  getModuleEmoji(module, superSkillSlug) {
    if (!module) return '📘';
    var title = (module.title || '').toLowerCase();
    
    var superSkillEmojis = {
      'brain-builder': ['🧠', '💡', '🎯', '📚', '💭'],
      'thought-driver': ['💭', '🎯', '💡', '🤔', '✨'],
      'emotion-navigator': ['🧭', '💖', '😊', '🌈', '💭'],
      'body-boss': ['💪', '🧘', '🏃', '✋', '🌊'],
      'connection-captain': ['🤝', '👫', '💬', '❤️', '🎉'],
      'calm-controller': ['🧘', '☀️', '🌈', '😌', '🌸'],
      'resilience-ranger': ['🏔️', '🌻', '💪', '⭐', '🌈'],
      'all': ['📘', '⭐', '🌟', '📖', '🎓']
    };

    // Title-based emoji detection
    if (title.indexOf('brain') >= 0 || title.indexOf('understand') >= 0) return '🧠';
    if (title.indexOf('worry') >= 0 || title.indexOf('anxious') >= 0) return '😰';
    if (title.indexOf('calm') >= 0 || title.indexOf('relax') >= 0) return '🧘';
    if (title.indexOf('friend') >= 0) return '👫';
    if (title.indexOf('angry') >= 0 || title.indexOf('anger') >= 0) return '😤';
    if (title.indexOf('sad') >= 0) return '😢';
    if (title.indexOf('happy') >= 0) return '😊';
    if (title.indexOf('body') >= 0) return '💪';
    if (title.indexOf('think') >= 0) return '💭';
    if (title.indexOf('feel') >= 0) return '💖';
    
    var emojis = superSkillEmojis[superSkillSlug] || superSkillEmojis.all;
    return emojis[0];
  }

  createMapHTML() {
    var container = document.getElementById('adventureMapContainer');
    if (!container) return;

    this.ensureZoneStyles();

    var theme = CATEGORY_THEMES[this.currentCategory] || CATEGORY_THEMES.all;
    var availableCategories = this.getAvailableCategories();
    var availableCycles = this.getAvailableCyclesForCategory();
    if (!this.currentCycleId && availableCycles.length > 0) {
      this.syncCycleSelection(availableCycles);
    }
    var currentCycle = availableCycles.find(function(cycle) { return String(cycle.id) === String(this.currentCycleId); }.bind(this)) || null;
    var numModules = this.modules.length;
    var completedCount = this.modules.filter(function(m) { return m.status === 'completed'; }).length;
    var canvasHeight = Math.max(this.config.minCanvasHeight, this.config.topPadding + (numModules * this.config.nodeSpacingY) + this.config.bottomPadding);

    var self = this;
    var categoryOptions = availableCategories.map(function(cat) {
      var catTheme = CATEGORY_THEMES[cat] || CATEGORY_THEMES.all;
      var count = self.allModules.filter(function(m) { return m.category === cat; }).length;
      return '<option value="' + cat + '"' + (cat === self.currentCategory ? ' selected' : '') + '>' + catTheme.emoji + ' ' + catTheme.name + ' (' + count + ')</option>';
    }).join('');

    var cycleOptions = availableCycles.map(function(cycle) {
      var cycleNumber = cycle.cycle_number ? 'Cycle ' + cycle.cycle_number : 'Cycle';
      var label = cycle.name ? cycleNumber + ': ' + cycle.name : cycleNumber;
      var selected = currentCycle && String(cycle.id) === String(currentCycle.id) ? ' selected' : '';
      var isCompletedCycle = self.isCycleCompletedWithWeekCheck(self.currentCategory, cycle.id);
      var completedText = isCompletedCycle ? ' ✅ Completed (review)' : '';
      return '<option value="' + cycle.id + '"' + selected + '>' + label + completedText + '</option>';
    }).join('');
    var cycleBadgeLabel = currentCycle ? ('Cycle ' + (currentCycle.cycle_number || '') + (currentCycle.name ? ': ' + currentCycle.name : '')) : 'Cycle';
    var remainingCount = numModules - completedCount;
    var progressMsg = completedCount === 0
      ? 'Your journey begins here — pick your first module to start exploring!'
      : remainingCount > 0
        ? completedCount + ' of ' + numModules + ' modules completed — ' + remainingCount + ' more to go!'
        : 'All ' + numModules + ' modules completed — amazing work! 🎉';
    var html = '<div class="adventure-header">' +
      '<h2 class="adventure-title">🗺️ Your Adventure Map</h2>' +
      '<p class="adventure-subtitle">' + progressMsg + '</p>' +
      '</div>' +
      '<div class="category-filter-container">' +
      '<label class="category-filter-label">Skill:</label>' +
      '<select class="category-filter-select" id="categoryFilter">' + categoryOptions + '</select>' +
      (availableCycles.length > 0 ? '<label class="category-filter-label" style="margin-left: 6px;">Cycle:</label>' +
      '<select class="category-filter-select" id="cycleFilter">' + cycleOptions + '</select>' +
      '<span class="category-badge cycle-badge" style="border-color: ' + theme.color + '">' + cycleBadgeLabel + '</span>' : '') +
      '<span class="category-badge" style="background: ' + theme.color + '">' + theme.emoji + ' ' + this.modules.length + ' module' + (this.modules.length !== 1 ? 's' : '') + '</span>' +
      '</div>';

    if (this.modules.length > 0) {
      html += this.getTownProgressCueHtml(completedCount);
      html += '<div class="adventure-skill-banner" style="--skill-color: ' + theme.color + '">' +
        '<span class="adventure-skill-emoji">' + theme.emoji + '</span>' +
        '<span class="adventure-skill-name">' + theme.name + '</span>' +
        '<span class="adventure-skill-desc">' + theme.description + '</span>' +
        '</div>';
      html += '<div class="adventure-viewport" id="adventureViewport">' +
        '<div class="adventure-canvas" id="adventureCanvas" style="height: ' + canvasHeight + 'px;">' +
        '<div class="map-zone-layers" aria-hidden="true"></div>' +
        '<div class="map-bg-stack">' +
        '<div class="map-bg-layer map-bg-sky" id="mapBgSky"></div>' +
        '<div class="map-bg-layer map-bg-hills"></div>' +
        '<div class="map-bg-layer map-bg-grass"></div>' +
        '<div class="map-bg-layer map-bg-clouds"></div>' +
        '<div class="map-bg-layer map-bg-trees"></div>' +
        '</div>' +
        '<div class="map-decorations" id="mapDecorations"></div>' +
        '<svg class="adventure-path-svg" id="adventurePathSvg"></svg>' +
        '<div class="adventure-nodes" id="adventureNodes"></div>' +
        '</div>' +
        '<div class="map-progress">' +
        '<span class="progress-icon">🏆</span>' +
        '<span class="progress-text" id="progressText">0/' + numModules + ' completed</span>' +
        '<div class="progress-bar"><div class="progress-fill" id="progressFill" style="width: 0%; background: linear-gradient(90deg, ' + theme.color + ', ' + theme.color + '99)"></div></div>' +
        '</div>' +
        '<div class="scroll-hint" id="scrollHint"><span class="scroll-hint-icon">👆</span><span>Drag to explore the map</span></div>' +
        '<div class="map-controls">' +
        '<button class="map-btn" id="btnCenter" title="Center on current">📍</button>' +
        '<button class="map-btn" id="btnTop" title="Go to start">⬆️</button>' +
        '</div>' +
        '</div>';
    } else {
      var emptyText = availableCycles.length > 0 ? 'There are no modules in this cycle yet. Try selecting a different cycle!' : 'There are no modules in this category yet. Try selecting a different path!';
      html += '<div class="map-empty-state">' +
        '<div class="map-empty-emoji">🗺️</div>' +
        '<div class="map-empty-title">No modules yet</div>' +
        '<div class="map-empty-text">' + emptyText + '</div>' +
        '</div>';
    }

    container.innerHTML = html;
    this.viewport = document.getElementById('adventureViewport');
    this.canvas = document.getElementById('adventureCanvas');
    this.applyZoneBackground();
  }

  applyThemeToBackground() {
    var theme = CATEGORY_THEMES[this.currentCategory] || CATEGORY_THEMES.all;
    var bgSky = document.getElementById('mapBgSky');
    
    // Calculate progress percentage for dynamic sky
    var completed = this.modules.filter(function(m) { return m.status === 'completed'; }).length;
    var total = this.modules.length;
    var progress = total > 0 ? completed / total : 0;
    
    if (bgSky && theme.skyGradientStart && theme.skyGradientEnd) {
      var self = this;
      var interpolatedGradient = [];
      for (var i = 0; i < 5; i++) {
        var startColor = theme.skyGradientStart[i];
        var endColor = theme.skyGradientEnd[i];
        interpolatedGradient.push(self.interpolateColor(startColor, endColor, progress));
      }
      bgSky.style.background = 'linear-gradient(180deg, ' + interpolatedGradient[0] + ' 0%, ' + interpolatedGradient[1] + ' 25%, ' + interpolatedGradient[2] + ' 50%, ' + interpolatedGradient[3] + ' 75%, ' + interpolatedGradient[4] + ' 100%)';
    }
  }

  applyZoneBackground() {
    if (!this.viewport) return;

    // Use completed module count to determine zone (matches the progress cue)
    var townStage = this.getTownStage(); // 0=Trailhead, 1=Village, 2=Town Center, 3=City
    var newZone = townStage + 1; // zones are 1-4

    var previousZone = this.currentZone;
    this.viewport.dataset.zone = newZone;
    this.currentZone = newZone;

    // Detect zone upgrade: only when moving to a higher zone (not zone 1)
    var child = window.selectedChild || (window.state && window.state.selectedChild) || dashboardSelectedChild;
    if (previousZone !== null && newZone > previousZone && newZone > 1) {
      var self = this;
      setTimeout(function() {
        self.showZoneUpgradeBanner(newZone, self.modules.filter(function(m) { return m.status === 'completed'; }).length);
      }, 400);
    } else if (previousZone === null && newZone > 1) {
      var childId = child ? child.id : 'unknown';
      var storageKey = 'zone-celebrated-' + childId + '-' + newZone;

      if (localStorage.getItem(storageKey) !== 'true') {
        var self = this;
        setTimeout(function() {
          self.showZoneUpgradeBanner(newZone, self.modules.filter(function(m) { return m.status === 'completed'; }).length);
        }, 800);
      }
    }
  }

  showZoneUpgradeBanner(zone, completedCount) {
    if (!this.viewport) return;

    // localStorage guard — only show once per child per zone
    var child = window.state && window.state.selectedChild;
    var childId = child ? child.id : 'unknown';
    var storageKey = 'zoneUpgradeSeen_child_' + childId + '_zone_' + zone;
    if (localStorage.getItem(storageKey) === 'true') return;
    localStorage.setItem(storageKey, 'true');

    // Remove any existing banner
    var existing = this.viewport.querySelector('.zone-upgrade-banner');
    if (existing) existing.remove();
    var existingShimmer = this.viewport.querySelector('.zone-upgrade-shimmer');
    if (existingShimmer) existingShimmer.remove();
    var existingConfetti = this.viewport.querySelector('.zone-upgrade-confetti');
    if (existingConfetti) existingConfetti.remove();

    // Zone metadata
    var stages = this.getTownStageMeta();
    var stageIndex = zone <= 1 ? 0 : Math.min(zone - 1, stages.length - 1);
    var stage = stages[stageIndex];
    var zoneTitles = [
      '',
      'Your Brain Town is Starting!',
      'Your Brain Town Grew Into a Village!',
      'Your Brain Town is Now a City!',
      'Your Brain Town is a Metropolis!'
    ];
    var zoneSubtitles = [
      '',
      'Every module builds new pathways in your brain!',
      'Look! Houses and fences appeared — your brain pathways are growing stronger!',
      'Shops and street lights! Your brain connections are getting really powerful!',
      'A whole skyline! Your brain is an incredible network of pathways!'
    ];

    var title = zoneTitles[zone] || 'Your Brain Town Upgraded!';
    var subtitle = zoneSubtitles[zone] || 'Keep completing modules to grow your town!';
    var emoji = stage ? stage.emoji : '🏘️';

    // 1. Add golden shimmer flash over the viewport
    var shimmer = document.createElement('div');
    shimmer.className = 'zone-upgrade-shimmer';
    this.viewport.appendChild(shimmer);
    setTimeout(function() { shimmer.remove(); }, 1400);

    // 2. Add confetti
    this.spawnZoneConfetti();

    // 3. Build and show the banner
    var self = this;
    var banner = document.createElement('div');
    banner.className = 'zone-upgrade-banner';
    banner.innerHTML =
      '<div class="zone-upgrade-card">' +
        '<div class="zone-upgrade-daniel"><img src="/images/characters/DanielTheDogThumbsUp.webp" alt="Daniel celebrates"></div>' +
        '<div class="zone-upgrade-emoji">' + emoji + '</div>' +
        '<div class="zone-upgrade-title">' + title + '</div>' +
        '<div class="zone-upgrade-subtitle">' + subtitle + '</div>' +
        '<div class="zone-upgrade-new-label"><span>✨</span> New Landscape Unlocked <span>✨</span></div>' +
        '<div class="zone-upgrade-tap-hint">Tap to continue exploring</div>' +
      '</div>';

    banner.addEventListener('click', function() {
      self.dismissZoneUpgradeBanner(banner);
    });

    this.viewport.appendChild(banner);

    // Auto-dismiss after 6 seconds
    this.zoneUpgradeTimeout = setTimeout(function() {
      self.dismissZoneUpgradeBanner(banner);
    }, 6000);
  }

  dismissZoneUpgradeBanner(banner) {
    if (!banner || !banner.parentNode) return;
    if (this.zoneUpgradeTimeout) {
      clearTimeout(this.zoneUpgradeTimeout);
      this.zoneUpgradeTimeout = null;
    }
    banner.classList.add('dismissing');
    setTimeout(function() {
      if (banner.parentNode) banner.remove();
    }, 600);
  }

  spawnZoneConfetti() {
    if (!this.viewport) return;
    var container = document.createElement('div');
    container.className = 'zone-upgrade-confetti';
    var colors = ['#fbbf24', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#22c55e', '#ec4899', '#14b8a6'];
    var viewportWidth = this.viewport.offsetWidth || 400;

    for (var i = 0; i < 40; i++) {
      var piece = document.createElement('div');
      piece.className = 'zone-confetti-piece';
      var color = colors[Math.floor(Math.random() * colors.length)];
      var left = Math.random() * viewportWidth;
      var delay = Math.random() * 1.2;
      var size = 6 + Math.random() * 6;
      piece.style.cssText = 'left:' + left + 'px; top:-10px; width:' + size + 'px; height:' + size + 'px; background:' + color + '; animation-delay:' + delay + 's; border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';';
      container.appendChild(piece);
    }

    this.viewport.appendChild(container);
    setTimeout(function() { if (container.parentNode) container.remove(); }, 4000);
  }

  interpolateColor(color1, color2, factor) {
    var c1 = this.hexToRgb(color1);
    var c2 = this.hexToRgb(color2);
    if (!c1 || !c2) return color1;
    var r = Math.round(c1.r + (c2.r - c1.r) * factor);
    var g = Math.round(c1.g + (c2.g - c1.g) * factor);
    var b = Math.round(c1.b + (c2.b - c1.b) * factor);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  
  hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
  }
  
  getProgressLevel() {
    var completed = this.modules.filter(function(m) { return m.status === 'completed'; }).length;
    var total = this.modules.length;
    if (total === 0) return 0;
    var progress = completed / total;
    if (progress < 0.33) return 0;
    if (progress < 0.66) return 1;
    return 2;
  }

  getTownStage() {
    var completed = this.modules.filter(function(m) { return m.status === 'completed'; }).length;
    if (completed <= 2) return 0;
    if (completed <= 5) return 1;
    if (completed <= 8) return 2;
    return 3;
  }

  getTownStageMeta() {
    return [
      { label: 'Trailhead', emoji: '🌱', minComplete: 0, maxComplete: 2, milestone: 3, rangeLabel: '1-3' },
      { label: 'Village', emoji: '🏡', minComplete: 3, maxComplete: 5, milestone: 6, rangeLabel: '4-6' },
      { label: 'Town Center', emoji: '🏘️', minComplete: 6, maxComplete: 8, milestone: 9, rangeLabel: '7-9' },
      { label: 'City', emoji: '🏙️', minComplete: 9, maxComplete: 99, milestone: null, rangeLabel: '10+' }
    ];
  }

  getTownProgressCueHtml(completedCount) {
    var stages = this.getTownStageMeta();
    var stageIndex = this.getTownStage();
    var stage = stages[stageIndex] || stages[0];
    var nextStage = stages[Math.min(stageIndex + 1, stages.length - 1)];
    var nextMilestone = stage.milestone;
    var modulesLeft = nextMilestone ? Math.max(0, nextMilestone - completedCount) : 0;
    var transitionCopy = nextMilestone
      ? 'Complete <span class="town-progress-cue-strong">' + modulesLeft + ' more module' + (modulesLeft === 1 ? '' : 's') + '</span> to unlock <span class="town-progress-cue-strong">' + nextStage.emoji + ' ' + nextStage.label + '</span>.'
      : 'You unlocked the final town stage. Keep reviewing modules to strengthen those pathways.';

    var timeline = stages.map(function(item, idx) {
      var statusClass = 'town-progress-cue-step';
      if (idx < stageIndex) statusClass += ' done';
      if (idx === stageIndex) statusClass += ' active';
      return '<div class="' + statusClass + '">' +
        '<div class="town-progress-cue-step-dot">' + item.emoji + '</div>' +
        '<strong>' + item.label + '</strong>' +
        '<small>' + item.rangeLabel + ' modules</small>' +
        '</div>';
    }).join('');

    return '<div class="town-progress-cue" role="status" aria-live="polite">' +
      '<div class="town-progress-cue-head">' +
      '<div class="town-progress-cue-title">🧠➡️🏙️ Brain Pathways = Town Pathways</div>' +
      '<div class="town-progress-cue-stage">Current: ' + stage.emoji + ' ' + stage.label + '</div>' +
      '</div>' +
      '<div class="town-progress-cue-copy">Each completed module lays another pathway in your brain, just like building roads and places in your town. ' + transitionCopy +
      '<div class="town-progress-cue-timeline">' + timeline + '</div>' +
      '</div>' +
      '</div>';
  }
  
  getDanielExpression() {
    var theme = CATEGORY_THEMES[this.currentCategory] || CATEGORY_THEMES.all;
    var level = this.getProgressLevel();
    var expressions = theme.danielExpressions || { start: 'focused', middle: 'happy', end: 'proud' };
    if (level === 0) return expressions.start;
    if (level === 1) return expressions.middle;
    return expressions.end;
  }

  calculateNodePositions() {
    var positions = [];
    var numModules = this.modules.length;
    var viewportWidth = this.viewport ? this.viewport.offsetWidth : 400;
    var centerX = viewportWidth / 2;

    for (var i = 0; i < numModules; i++) {
      var y = this.config.topPadding + (i * this.config.nodeSpacingY);
      var wave = Math.sin(i * this.config.zigzagFrequency) * this.config.pathAmplitude;
      var variation = Math.sin(i * 2.3) * 15;
      positions.push({ x: centerX + wave + variation, y: y, index: i });
    }
    return positions;
  }

  getSegmentRoadStage(completedBefore) {
    // Road evolves based on how many modules are completed before this segment
    // Matches brain-pathway metaphor: more modules = stronger neural connections = better road
    if (completedBefore <= 2) return 0;  // Trailhead: dirt track
    if (completedBefore <= 5) return 1;  // Village: paved road
    if (completedBefore <= 8) return 2;  // Town Center: highway
    return 3;                             // City: motorway
  }

  renderPath() {
    var svg = document.getElementById('adventurePathSvg');
    if (!svg || this.modules.length === 0) return;

    var positions = this.calculateNodePositions();
    if (positions.length < 2) return;

    // Road palettes: dirt → pavement → highway → motorway
    var roadPalettes = [
      // Trailhead: narrow dirt trail
      { main: '#A8754F', light: '#C89B6C', shadow: 'rgba(109, 71, 41, 0.35)',
        shadowW: 32, mainW: 26, lightW: 18, dashW: 2, dashArray: '0 20',
        dashColor: 'rgba(255,255,255,0.35)' },
      // Village: paved road — grey asphalt with white lane lines
      { main: '#6B7280', light: '#9CA3AF', shadow: 'rgba(55, 65, 81, 0.35)',
        shadowW: 38, mainW: 32, lightW: 24, dashW: 3, dashArray: '12 16',
        dashColor: 'rgba(255,255,255,0.7)' },
      // Town Center: highway — dark asphalt, wider, double lane markings
      { main: '#4B5563', light: '#6B7280', shadow: 'rgba(31, 41, 55, 0.4)',
        shadowW: 46, mainW: 40, lightW: 30, dashW: 3, dashArray: '18 12',
        dashColor: 'rgba(255,255,255,0.85)' },
      // City: motorway — dark smooth surface, widest, solid lane edges
      { main: '#1F2937', light: '#374151', shadow: 'rgba(17, 24, 39, 0.45)',
        shadowW: 54, mainW: 48, lightW: 38, dashW: 4, dashArray: '24 10',
        dashColor: 'rgba(255,255,255,0.9)' }
    ];

    // Build full continuous path
    var pathD = 'M ' + positions[0].x + ' ' + positions[0].y;
    for (var i = 1; i < positions.length; i++) {
      var prev = positions[i - 1];
      var curr = positions[i];
      var midY = (prev.y + curr.y) / 2;
      pathD += ' C ' + prev.x + ' ' + midY + ', ' + curr.x + ' ' + midY + ', ' + curr.x + ' ' + curr.y;
    }

    // Road style based on overall town stage (total completed modules)
    var totalCompleted = this.modules.filter(function(m) { return m.status === 'completed'; }).length;
    var stage = this.getSegmentRoadStage(totalCompleted);
    var road = roadPalettes[stage];

    var svgContent = '';

    // Shadow layer
    svgContent += '<path d="' + pathD + '" fill="none" stroke="' + road.shadow + '" stroke-width="' + road.shadowW + '" stroke-linecap="round" stroke-linejoin="round" />';
    // Main road surface
    svgContent += '<path d="' + pathD + '" fill="none" stroke="' + road.main + '" stroke-width="' + road.mainW + '" stroke-linecap="round" stroke-linejoin="round" />';
    // Lighter centre
    svgContent += '<path d="' + pathD + '" fill="none" stroke="' + road.light + '" stroke-width="' + road.lightW + '" stroke-linecap="round" stroke-linejoin="round" />';

    // Road markings — different per stage, with animated dashes
    // Animation speed varies: dirt slow & subtle, motorway fast & smooth
    var dashAnimClass = 'road-dash-s' + stage;
    if (stage === 0) {
      // Dirt trail: subtle speckled footpath marks
      svgContent += '<path class="' + dashAnimClass + '" d="' + pathD + '" fill="none" stroke="' + road.dashColor + '" stroke-width="' + road.dashW + '" stroke-linecap="round" stroke-dasharray="' + road.dashArray + '" />';
    } else if (stage === 1) {
      // Paved road: single dashed white centre line
      svgContent += '<path class="' + dashAnimClass + '" d="' + pathD + '" fill="none" stroke="' + road.dashColor + '" stroke-width="' + road.dashW + '" stroke-linecap="round" stroke-dasharray="' + road.dashArray + '" />';
    } else if (stage === 2) {
      // Highway: dashed centre line + solid yellow edge line
      svgContent += '<path class="' + dashAnimClass + '" d="' + pathD + '" fill="none" stroke="' + road.dashColor + '" stroke-width="' + road.dashW + '" stroke-linecap="round" stroke-dasharray="' + road.dashArray + '" />';
      svgContent += '<path d="' + pathD + '" fill="none" stroke="rgba(255,200,50,0.5)" stroke-width="1.5" stroke-linecap="round" />';
    } else {
      // Motorway: solid yellow centre line + dashed white lane markers
      svgContent += '<path d="' + pathD + '" fill="none" stroke="rgba(255,220,60,0.8)" stroke-width="2.5" stroke-linecap="round" />';
      svgContent += '<path class="' + dashAnimClass + '" d="' + pathD + '" fill="none" stroke="' + road.dashColor + '" stroke-width="' + road.dashW + '" stroke-linecap="round" stroke-dasharray="' + road.dashArray + '" />';
    }

    svg.innerHTML = svgContent;

    var startMarker = document.createElement('div');
    startMarker.className = 'map-marker start';
    startMarker.style.left = (positions[0].x - 50) + 'px';
    startMarker.style.top = (positions[0].y - 20) + 'px';
    this.canvas.appendChild(startMarker);

    var lastPos = positions[positions.length - 1];
    var finishMarker = document.createElement('div');
    finishMarker.className = 'map-marker finish';
    finishMarker.style.left = (lastPos.x + 50) + 'px';
    finishMarker.style.top = (lastPos.y - 20) + 'px';
    this.canvas.appendChild(finishMarker);
  }

  renderDecorations() {
    var container = document.getElementById('mapDecorations');
    if (!container) return;

    var positions = this.calculateNodePositions();

    // Zone labels removed as requested
    // Daniel companion removed as requested
  }

  renderTownBuildout(container, positions, viewportWidth) {
    if (positions.length === 0) return;

    var townStage = this.getTownStage();
    var anchorIndex = Math.min(positions.length - 1, Math.max(0, townStage * 3 + 2));
    var anchor = positions[anchorIndex];
    if (!anchor) return;

    var townStages = [
      { label: 'Wild Woods', buildings: ['🌲', '🌳', '⛺'] },
      { label: 'Little Village', buildings: ['🏠', '🏡', '🏘️'] },
      { label: 'Growing Town', buildings: ['🏫', '🏬', '🏪', '🏠'] },
      { label: 'Big City', buildings: ['🏢', '🏦', '🏙️', '🏬'] }
    ];

    var stageData = townStages[townStage];
    if (!stageData) return;

    var town = document.createElement('div');
    town.className = 'map-town';
    town.style.left = Math.min(viewportWidth - 140, anchor.x + 110) + 'px';
    town.style.top = (anchor.y + 30) + 'px';

    stageData.buildings.forEach(function(building) {
      var item = document.createElement('div');
      item.className = 'map-town-item';
      item.textContent = building;
      town.appendChild(item);
    });

    var label = document.createElement('div');
    label.className = 'map-town-label';
    label.textContent = stageData.label;
    town.appendChild(label);

    container.appendChild(town);
  }
  
  renderPathMoments(container, positions) {
    if (positions.length < 3) return;
    
    var moments = [
      { icon: '🪧', label: 'Pause', type: 'signpost' },
      { icon: '🔥', label: 'Rest', type: 'campfire' },
      { icon: '🪧', label: 'Breathe', type: 'signpost' },
      { icon: '💭', label: 'Check In', type: 'signpost' }
    ];
    
    // Place moments between nodes (not on every gap)
    var momentSpacing = Math.max(2, Math.floor(positions.length / 3));
    var momentIndex = 0;
    
    for (var i = momentSpacing; i < positions.length - 1; i += momentSpacing) {
      if (momentIndex >= moments.length) break;
      
      var pos1 = positions[i - 1];
      var pos2 = positions[i];
      var midX = (pos1.x + pos2.x) / 2 + (Math.random() - 0.5) * 40;
      var midY = (pos1.y + pos2.y) / 2;
      
      var moment = moments[momentIndex];
      var momentEl = document.createElement('div');
      momentEl.className = 'path-moment ' + moment.type;
      momentEl.style.left = (midX - 20) + 'px';
      momentEl.style.top = (midY - 20) + 'px';
      
      var iconEl = document.createElement('div');
      iconEl.className = 'path-moment-icon';
      iconEl.textContent = moment.icon;
      momentEl.appendChild(iconEl);
      
      var labelEl = document.createElement('div');
      labelEl.className = 'path-moment-label';
      labelEl.textContent = moment.label;
      momentEl.appendChild(labelEl);
      
      container.appendChild(momentEl);
      momentIndex++;
    }
  }
  
  renderDestination(container, positions) {
    if (positions.length === 0) return;
    
    var theme = CATEGORY_THEMES[this.currentCategory] || CATEGORY_THEMES.all;
    var destination = theme.destination || { name: 'Finish', emoji: '🏆' };
    var lastPos = positions[positions.length - 1];
    
    var destMarker = document.createElement('div');
    destMarker.className = 'destination-marker';
    destMarker.style.left = (lastPos.x + 60) + 'px';
    destMarker.style.top = (lastPos.y - 30) + 'px';
    
    var destIcon = document.createElement('div');
    destIcon.className = 'destination-icon';
    destIcon.textContent = destination.emoji;
    destMarker.appendChild(destIcon);
    
    var destLabel = document.createElement('div');
    destLabel.className = 'destination-label';
    destLabel.textContent = destination.name;
    destMarker.appendChild(destLabel);
    
    container.appendChild(destMarker);
  }
  
  getZoneLabels() {
    return []; // Remove zone headings as requested
  }

  renderNodes() {
    var container = document.getElementById('adventureNodes');
    if (!container) return;

    var positions = this.calculateNodePositions();
    var currentIndex = -1;
    for (var i = 0; i < this.modules.length; i++) {
      if (this.modules[i].status === 'available') {
        currentIndex = i;
        break;
      }
    }

    var self = this;
    this.modules.forEach(function(module, index) {
      var pos = positions[index];
      if (!pos) return;

      var node = document.createElement('div');
      node.className = 'adventure-node ' + module.status;
      node.style.left = pos.x + 'px';
      node.style.top = pos.y + 'px';

      var emoji = document.createElement('span');
      emoji.className = 'node-emoji';
      // Use category-specific node emojis for all categories
      var catThemeForEmoji = CATEGORY_THEMES[self.currentCategory] || CATEGORY_THEMES.all;
      if (catThemeForEmoji.nodeEmojis) {
        emoji.textContent = (module.status === 'completed') ? catThemeForEmoji.nodeEmojis.complete : catThemeForEmoji.nodeEmojis.incomplete;
      } else {
        emoji.textContent = module.emoji;
      }
      node.appendChild(emoji);

      var num = document.createElement('div');
      num.className = 'node-number';
      num.textContent = (index + 1).toString();
      node.appendChild(num);

      if (self.currentCategory === 'all' && module.category) {
        var catTheme = CATEGORY_THEMES[module.category];
        if (catTheme) {
          var catDot = document.createElement('div');
          catDot.className = 'node-category-dot';
          catDot.style.background = catTheme.color;
          catDot.title = catTheme.name;
          node.appendChild(catDot);
        }
      }

      var statusLabel = '';
      if (module.status === 'completed') {
        var badge = document.createElement('div');
        badge.className = 'node-badge check';
        badge.textContent = '✓';
        node.appendChild(badge);
        statusLabel = 'Done!';
      } else if (module.status === 'available') {
        var badge = document.createElement('div');
        badge.className = 'node-badge star';
        badge.textContent = '★';
        node.appendChild(badge);
        statusLabel = 'Next';
      }

      if (statusLabel) {
        var label = document.createElement('div');
        label.className = 'node-label';
        label.textContent = statusLabel;
        label.style.position = 'absolute';
        label.style.bottom = '-24px';
        label.style.left = '50%';
        label.style.transform = 'translateX(-50%)';
        label.style.fontSize = '11px';
        label.style.fontWeight = '700';
        label.style.color = '#405878';
        label.style.whiteSpace = 'nowrap';
        label.style.fontFamily = '"Fredoka", sans-serif';
        label.style.textShadow = '0 1px 2px rgba(255,255,255,0.8)';
        node.appendChild(label);
      }

      if (index === currentIndex && currentIndex !== -1) {
        node.classList.add('is-current');
        var character = document.createElement('div');
        character.className = 'current-indicator';
        var dogImage = document.createElement('img');
        dogImage.src = '/images/characters/DanielTheDog.webp';
        dogImage.alt = 'Daniel the dog';
        character.appendChild(dogImage);
        var indicatorLabel = document.createElement('div');
        indicatorLabel.className = 'current-indicator-label';
        indicatorLabel.textContent = 'You are here';
        character.appendChild(indicatorLabel);
        node.appendChild(character);
      }

      var tooltip = document.createElement('div');
      tooltip.className = 'node-tooltip';
      
      var statusText = '';
      var statusClass = '';
      if (module.status === 'completed') {
        statusText = '✓ Completed!';
        statusClass = 'done';
      } else if (module.status === 'available') {
        statusText = '▶ Ready to play!';
        statusClass = 'ready';
      } else {
        statusText = module.canUnlock ? 'Locked — spend 1 credit to unlock' : 'Locked — start with the first lock';
        statusClass = 'locked-status';
      }

      node.addEventListener('click', function(e) {
        e.stopPropagation();
        if (module.status === 'locked') {
          if (module.canUnlock && typeof window.openPurchaseModal === 'function') {
            window.openPurchaseModal(module.module || module);
          } else if (typeof window.showUnlockResultModal === 'function') {
            window.showUnlockResultModal({
              title: 'Almost there!',
              message: "Let's unlock this path one step at a time. Try the first locked module.",
              type: 'error'
            });
          }
          return;
        }
        self.onNodeClick(module);
      });

      node.addEventListener('touchend', function(e) {
        e.stopPropagation();
        if (module.status === 'locked') {
          if (module.canUnlock && typeof window.openPurchaseModal === 'function') {
            window.openPurchaseModal(module.module || module);
          } else if (typeof window.showUnlockResultModal === 'function') {
            window.showUnlockResultModal({
              title: 'Almost there!',
              message: "Let's unlock this path one step at a time. Try the first locked module.",
              type: 'error'
            });
          }
          return;
        }
        self.onNodeClick(module);
      });

      node.style.pointerEvents = 'auto';
      container.appendChild(node);
    });
  }

  onNodeClick(module) {
    if (window.enhancedDashboard && typeof window.enhancedDashboard.showModulePreview === 'function') {
      window.enhancedDashboard.showModulePreview(module);
    } else {
      var child = window.selectedChild || (window.state && window.state.selectedChild) || dashboardSelectedChild;
      if (child && module.module) {
        var url = '/module.html?childId=' + child.id + '&moduleId=' + module.module.id + '&code=' + (module.code || module.module.code);
        window.location.href = url;
      }
    }
  }

  updateProgress() {
    var completed = this.modules.filter(function(m) { return m.status === 'completed'; }).length;
    var total = this.modules.length;
    var progressText = document.getElementById('progressText');
    var progressFill = document.getElementById('progressFill');
    var theme = CATEGORY_THEMES[this.currentCategory] || CATEGORY_THEMES.all;
    var cycleComplete = !!(this.currentCycleId && this.isCycleCompletedWithWeekCheck(this.currentCategory, this.currentCycleId));

    if (progressText) progressText.textContent = completed + '/' + total + ' completed';
    if (progressFill) {
      var percent = total > 0 ? (completed / total) * 100 : 0;
      progressFill.style.width = percent + '%';
      progressFill.style.background = 'linear-gradient(90deg, ' + theme.color + ', ' + theme.color + '99)';
    }

    if (cycleComplete) {
      this.maybeCelebrateCycleCompletion();
    }

    this.maybeShowCycleCompletionPopup();
  }

  setupEventListeners() {
    this.removeEventListeners();
    
    var self = this;
    
    // Always attach dropdown listeners regardless of viewport
    var categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      this._categoryChangeHandler = function(e) {
        self.currentCategory = e.target.value;
        self.setStoredCategory(self.currentCategory);
        self.currentCycleId = null;
        self.translateX = 0;
        self.translateY = 0;
        self.hasUserInteracted = false;
        self.render();
      };
      categoryFilter.addEventListener('change', this._categoryChangeHandler);
    }

    var cycleFilter = document.getElementById('cycleFilter');
    if (cycleFilter) {
      this._cycleChangeHandler = function(e) {
        self.currentCycleId = e.target.value || null;
        self.setStoredCycleId(self.currentCategory, self.currentCycleId);
        self.translateX = 0;
        self.translateY = 0;
        self.hasUserInteracted = false;
        self.render();
      };
      cycleFilter.addEventListener('change', this._cycleChangeHandler);
    }

    var nextSkillFilter = document.getElementById('nextSkillFilter');
    if (nextSkillFilter) {
      this._nextSkillChangeHandler = function() {
        self.renderNextCycleOptions();
      };
      nextSkillFilter.addEventListener('change', this._nextSkillChangeHandler);
      this.renderNextCycleOptions();
    }

    var goToNextCycle = document.getElementById('goToNextCycle');
    if (goToNextCycle) {
      this._goToNextCycleHandler = function() {
        var skillSelect = document.getElementById('nextSkillFilter');
        var cycleSelect = document.getElementById('nextCycleFilter');
        if (!skillSelect || !cycleSelect || !cycleSelect.value) return;
        self.currentCategory = skillSelect.value;
        self.setStoredCategory(self.currentCategory);
        self.currentCycleId = cycleSelect.value;
        self.setStoredCycleId(self.currentCategory, self.currentCycleId);
        self.translateX = 0;
        self.translateY = 0;
        self.hasUserInteracted = false;
        self.render();
      };
      goToNextCycle.addEventListener('click', this._goToNextCycleHandler);
    }

    // Viewport-dependent listeners (drag, scroll, etc.)
    var viewport = document.getElementById('adventureViewport');
    if (!viewport) return;

    this.boundHandlers = {
      mousedown: function(e) { self.startDrag(e); },
      mousemove: function(e) { self.drag(e); },
      mouseup: function() { self.endDrag(); },
      mouseleave: function() { self.endDrag(); },
      touchstart: function(e) { self.startDrag(e); },
      touchmove: function(e) { self.drag(e); },
      touchend: function() { self.endDrag(); },
      resize: function() { 
        self.updateMobileConfig();
        self.render();
      }
    };

    viewport.addEventListener('mousedown', this.boundHandlers.mousedown);
    viewport.addEventListener('mousemove', this.boundHandlers.mousemove);
    viewport.addEventListener('mouseup', this.boundHandlers.mouseup);
    viewport.addEventListener('mouseleave', this.boundHandlers.mouseleave);
    viewport.addEventListener('touchstart', this.boundHandlers.touchstart, { passive: false });
    viewport.addEventListener('touchmove', this.boundHandlers.touchmove, { passive: false });
    viewport.addEventListener('touchend', this.boundHandlers.touchend);
    
    // Store viewport reference for later use
    this.viewport = viewport;

    var btnCenter = document.getElementById('btnCenter');
    var btnTop = document.getElementById('btnTop');
    if (btnCenter) btnCenter.addEventListener('click', function() { self.centerOnCurrentModule(); });
    if (btnTop) btnTop.addEventListener('click', function() { self.scrollToTop(); });

    // Add window resize listener
    window.addEventListener('resize', this.boundHandlers.resize);
  }

  removeEventListeners() {
    this.clearCycleCompletionPopupWatcher();

    if (this.viewport && this.boundHandlers && this.boundHandlers.mousedown) {
      this.viewport.removeEventListener('mousedown', this.boundHandlers.mousedown);
      this.viewport.removeEventListener('mousemove', this.boundHandlers.mousemove);
      this.viewport.removeEventListener('mouseup', this.boundHandlers.mouseup);
      this.viewport.removeEventListener('mouseleave', this.boundHandlers.mouseleave);
      this.viewport.removeEventListener('touchstart', this.boundHandlers.touchstart);
      this.viewport.removeEventListener('touchmove', this.boundHandlers.touchmove);
      this.viewport.removeEventListener('touchend', this.boundHandlers.touchend);
    }
    
    if (this.boundHandlers && this.boundHandlers.resize) {
      window.removeEventListener('resize', this.boundHandlers.resize);
    }

    // Remove dropdown event listeners
    var categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter && this._categoryChangeHandler) {
      categoryFilter.removeEventListener('change', this._categoryChangeHandler);
    }

    var cycleFilter = document.getElementById('cycleFilter');
    if (cycleFilter && this._cycleChangeHandler) {
      cycleFilter.removeEventListener('change', this._cycleChangeHandler);
    }

  }

  startDrag(e) {
    if (!this.canvas) return;
    this.isDragging = true;
    this.viewport.classList.add('dragging');
    
    var point = e.type.indexOf('touch') >= 0 ? e.touches[0] : e;
    this.startX = point.clientX;
    this.startY = point.clientY;
    this.lastTranslateX = this.translateX;
    this.lastTranslateY = this.translateY;

    if (!this.hasUserInteracted) {
      this.hasUserInteracted = true;
      var hint = document.getElementById('scrollHint');
      if (hint) hint.classList.add('hidden');
    }

    if (e.type.indexOf('touch') >= 0) e.preventDefault();
  }

  drag(e) {
    if (!this.isDragging || !this.canvas) return;

    var point = e.type.indexOf('touch') >= 0 ? e.touches[0] : e;
    var deltaX = point.clientX - this.startX;
    var deltaY = point.clientY - this.startY;

    this.translateX = this.lastTranslateX + deltaX;
    this.translateY = this.lastTranslateY + deltaY;

    var canvasHeight = parseInt(this.canvas.style.height) || 600;
    var viewportHeight = this.viewport.offsetHeight;
    var maxY = 0;
    var minY = -(canvasHeight - viewportHeight + 40);

    this.translateY = Math.min(maxY, Math.max(minY, this.translateY));
    this.translateX = Math.min(50, Math.max(-50, this.translateX));
    this.canvas.style.transform = 'translate(' + this.translateX + 'px, ' + this.translateY + 'px)';

    if (e.type.indexOf('touch') >= 0) e.preventDefault();
  }

  endDrag() {
    this.isDragging = false;
    if (this.viewport) this.viewport.classList.remove('dragging');
  }

  centerOnCurrentModule() {
    if (!this.canvas || !this.viewport) return;

    var positions = this.calculateNodePositions();
    var currentIndex = -1;
    
    // First, try to find an available module
    for (var i = 0; i < this.modules.length; i++) {
      if (this.modules[i].status === 'available') {
        currentIndex = i;
        break;
      }
    }
    
    // If no available module found, check if all are completed
    if (currentIndex === -1) {
      var allCompleted = true;
      for (var j = 0; j < this.modules.length; j++) {
        if (this.modules[j].status !== 'completed') {
          allCompleted = false;
          break;
        }
      }
      
      // If all modules are completed, center on the last completed module
      if (allCompleted) {
        for (var k = this.modules.length - 1; k >= 0; k--) {
          if (this.modules[k].status === 'completed') {
            currentIndex = k;
            break;
          }
        }
      }
    }
    
    // Fallback to index 0 if still no valid position found
    var targetIndex = currentIndex !== -1 ? currentIndex : 0;
    
    if (positions[targetIndex]) {
      var targetY = positions[targetIndex].y;
      var viewportHeight = this.viewport.offsetHeight;
      var canvasHeight = parseInt(this.canvas.style.height) || 600;
      
      this.translateY = -(targetY - viewportHeight / 2);
      this.translateY = Math.min(0, Math.max(-(canvasHeight - viewportHeight + 40), this.translateY));
      this.translateX = 0;
      
      var self = this;
      this.canvas.style.transition = 'transform 0.5s ease';
      this.canvas.style.transform = 'translate(' + this.translateX + 'px, ' + this.translateY + 'px)';
      
      setTimeout(function() {
        if (self.canvas) self.canvas.style.transition = 'transform 0.05s linear';
      }, 500);
    }
  }

  scrollToTop() {
    if (!this.canvas) return;
    this.translateY = 0;
    this.translateX = 0;
    var self = this;
    this.canvas.style.transition = 'transform 0.5s ease';
    this.canvas.style.transform = 'translate(' + this.translateX + 'px, ' + this.translateY + 'px)';
    setTimeout(function() {
      if (self.canvas) self.canvas.style.transition = 'transform 0.05s linear';
    }, 500);
  }
}

// ================================================
// DAILY QUESTS & ENHANCED DASHBOARD
// ================================================

var DAILY_QUESTS = [
  { id: 'q1', name: 'Complete any module', reward: 5 },
  { id: 'q2', name: 'Practice deep breathing', reward: 3 },
  { id: 'q3', name: 'Talk about your feelings', reward: 4 },
  { id: 'q4', name: 'Help someone today', reward: 5 },
  { id: 'q5', name: 'Try something new', reward: 4 }
];

var DANIEL_MOODS = [
  "Ready for adventure! 🌟",
  "Let's learn together! 📚",
  "You're doing great! 💪",
  "I believe in you! ⭐",
  "Time to explore! 🗺️"
];

var DANIEL_IMAGES = [
  "/images/characters/DanielTheDog.webp",
  "/images/characters/DanielReading.webp",
  "/images/characters/DanielTheDogHoldingHeart.webp",
  "/images/characters/DanielTheDogReading.webp",
  "/images/characters/DanielTheDogThumbsUp.webp",
  "/images/characters/DanielWithFootball.webp"
];

class EnhancedDashboard {
  constructor() {
    this.adventureMap = null;
    this.currentQuest = null;
    this.questProgress = 0;
    this.danielMoodIndex = 0;
    this.initialized = false;
    this.eventListenersAttached = false;
  }

  init() {
    var self = this;
    getDashboardData();

    // Only attach event listeners once
    if (!this.eventListenersAttached) {
      this.setupDanielHub();
      this.setupModulePreview();
      this.eventListenersAttached = true;
    }

    // Load quest data (synchronous localStorage read)
    this.loadDailyQuest();

    // Update UI synchronously — these are fast DOM writes
    this.updateDanielMood();
    this.updateQuestDisplay();
    this.updateRankDisplay();

    // Setup adventure map — render() has its own rAF
    this.setupAdventureMap();

    this.initialized = true;
  }

  setupDanielHub() {
    var self = this;
    var danielHub = document.getElementById('danielHub');
    if (danielHub) danielHub.addEventListener('click', function() { self.interactWithDaniel(); });
  }

  interactWithDaniel() {
    var danielAvatar = document.querySelector('.hero-daniel-img') || document.querySelector('.daniel-avatar');
    var moodText = document.getElementById('moodText');
    
    if (danielAvatar) {
      danielAvatar.style.transform = 'scale(1.2)';
      setTimeout(function() { danielAvatar.style.transform = 'scale(1)'; }, 200);
    }

    // Randomly select a mood quote
    this.danielMoodIndex = (this.danielMoodIndex + 1) % DANIEL_MOODS.length;
    if (moodText) moodText.textContent = DANIEL_MOODS[this.danielMoodIndex];

    // Randomly select and set a new Daniel image
    var randomImageIndex = Math.floor(Math.random() * DANIEL_IMAGES.length);
    if (danielAvatar && DANIEL_IMAGES[randomImageIndex]) {
      danielAvatar.src = DANIEL_IMAGES[randomImageIndex];
    }

    this.addSparkleEffect(danielAvatar);
  }

  updateDanielMood() {
    var moodText = document.getElementById('moodText');
    if (moodText) moodText.textContent = DANIEL_MOODS[this.danielMoodIndex];
  }

  addSparkleEffect(element) {
    if (!element) return;
    var sparkles = ['✨', '⭐', '💫', '🌟'];
    var rect = element.getBoundingClientRect();
    
    for (var i = 0; i < 5; i++) {
      var sparkle = document.createElement('div');
      sparkle.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
      sparkle.style.cssText = 'position: fixed; left: ' + (rect.left + Math.random() * rect.width) + 'px; top: ' + (rect.top + Math.random() * rect.height) + 'px; font-size: 20px; pointer-events: none; z-index: 9999; animation: sparkleFloat 1s ease-out forwards;';
      document.body.appendChild(sparkle);
      (function(s) {
        setTimeout(function() { s.remove(); }, 1000);
      })(sparkle);
    }
  }

  setupDailyQuest() {
    this.loadDailyQuest();
    this.updateQuestDisplay();
  }

  loadDailyQuest() {
    var today = new Date().toDateString();
    var savedQuest = localStorage.getItem('dailyQuest_' + today);
    
    if (savedQuest) {
      var questData = JSON.parse(savedQuest);
      this.currentQuest = questData.quest;
      this.questProgress = questData.progress;
    } else {
      var randomQuest = DAILY_QUESTS[Math.floor(Math.random() * DAILY_QUESTS.length)];
      this.currentQuest = { id: randomQuest.id, name: randomQuest.name, reward: randomQuest.reward, target: 1, completed: false };
      this.questProgress = 0;
      this.saveDailyQuest();
    }
  }

  saveDailyQuest() {
    var today = new Date().toDateString();
    localStorage.setItem('dailyQuest_' + today, JSON.stringify({
      quest: this.currentQuest,
      progress: this.questProgress
    }));
  }

  updateQuestDisplay() {
    var questDescription = document.getElementById('questDescription');
    var questProgressFill = document.getElementById('questProgressFill');
    var questProgressText = document.getElementById('questProgressText');
    var questRewardText = document.getElementById('questRewardText');

    if (this.currentQuest) {
      if (questDescription) questDescription.textContent = this.currentQuest.name;
      if (questRewardText) questRewardText.textContent = '+' + this.currentQuest.reward + ' Star' + (this.currentQuest.reward > 1 ? 's' : '');
      
      var progressPercent = Math.min((this.questProgress / this.currentQuest.target) * 100, 100);
      if (questProgressFill) questProgressFill.style.width = progressPercent + '%';
      if (questProgressText) questProgressText.textContent = this.questProgress + '/' + this.currentQuest.target;

      if (this.questProgress >= this.currentQuest.target && !this.currentQuest.completed) {
        this.completeQuest();
      }
    }
  }

  completeQuest() {
    if (this.currentQuest && !this.currentQuest.completed) {
      this.currentQuest.completed = true;
      this.saveDailyQuest();
    }
  }

  setupAdventureMap() {
    if (!this.adventureMap) {
      this.adventureMap = new AdventureMapV4();
    }
    this.adventureMap.init();
  }

  setupModulePreview() {
    var self = this;
    var closeBtn = document.getElementById('closePreviewBtn');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.hideModulePreview(); });

    var previewCloseBtn = document.getElementById('previewCloseBtn');
    if (previewCloseBtn) previewCloseBtn.addEventListener('click', function() { self.hideModulePreview(); });
  }

  showModulePreview(module) {
    var panels = document.querySelectorAll('.module-preview-panel');
    if (!panels || panels.length === 0) return;

    var emoji = document.getElementById('previewEmoji');
    var title = document.getElementById('previewTitle');
    var description = document.getElementById('previewDescription');
    var startBtnA = document.getElementById('startModuleBtn');

    var titleB = document.getElementById('previewModuleTitle');
    var imageB = document.getElementById('previewImage');
    var startBtnB = document.getElementById('previewStartBtn');

    var moduleTitle = (module.module && (module.module.title || module.module.name)) || module.title || module.name || 'Module';
    var moduleDescription = '';
    if (module.module) {
      moduleDescription = module.module.short_description || module.module.description || module.module.long_description || '';
    }
    moduleDescription = moduleDescription || module.short_description || module.description || 'Explore emotions and learn coping strategies in this interactive module.';

    if (emoji) emoji.textContent = module.emoji || '📘';
    if (title) title.textContent = moduleTitle;
    if (description) description.textContent = moduleDescription;

    if (titleB) titleB.textContent = moduleTitle;
    if (imageB) {
      imageB.innerHTML = '<div class="preview-placeholder">' + (module.emoji || '📚') + '</div>';
    }

    var self = this;
    var startHandler = function() {
      self.hideModulePreview();
      self.startModule(module);
    };

    if (startBtnA) startBtnA.onclick = startHandler;
    if (startBtnB) startBtnB.onclick = startHandler;

    panels.forEach(function(p) {
      p.classList.remove('hidden');
    });
  }

  hideModulePreview() {
    var panels = document.querySelectorAll('.module-preview-panel');
    if (!panels || panels.length === 0) return;
    panels.forEach(function(p) {
      p.classList.add('hidden');
    });
  }

  async startModule(module) {
    var child = window.selectedChild || (window.state && window.state.selectedChild) || dashboardSelectedChild;
    if (!module.module || !child) {
      return;
    }

    var mod = module.module;
    var moduleUrl = '/module.html?childId=' + child.id + '&moduleId=' + mod.id + '&code=' + (module.code || mod.code) + '&childName=' + encodeURIComponent(child.name || '');

    try {
      // Check 1: First module in a super skill → show character intro + checkin
      var superSkillId = mod.super_skill_id || null;
      if (superSkillId && typeof window.showCheckinPopup === 'function') {
        var introKey = 'superSkillIntroSeen_' + child.id + '_' + superSkillId;
        var alreadySeen = localStorage.getItem(introKey);
        if (!alreadySeen) {
          var popupModule = Object.assign({}, mod, { code: module.code || mod.code });
          window.showCheckinPopup(popupModule, function() {
            localStorage.setItem(introKey, 'true');
            window.location.href = moduleUrl;
          });
          return;
        }
      }

      // Check 2: Periodic check-in every 3 completed modules
      var needsCheckin = await this.shouldTriggerCheckinForModuleCount(child.id);
      if (needsCheckin) {
        if (typeof window.showCheckinPopup === 'function') {
          var popupModule = Object.assign({}, mod, { code: module.code || mod.code });
          window.showCheckinPopup(popupModule, function() {
            window.location.href = moduleUrl;
          });
          return;
        }
      }
    } catch (e) {
      console.error('[StartModule] Error checking checkin:', e);
    }

    window.location.href = moduleUrl;
  }
  
  // Check if a check-in is needed based on completed module count (every 3 modules)
  async shouldTriggerCheckinForModuleCount(childId) {
    if (!childId || !window.supabase) return false;
    var CHECKIN_MODULE_INTERVAL = 3;
    
    try {
      // Count completed modules for this child
      var completedResult = await window.supabase
        .from('child_modules')
        .select('id')
        .eq('child_id', childId)
        .eq('is_completed', true);
      
      if (completedResult.error) {
        console.error('[Check-in] Error counting completed modules:', completedResult.error);
        return false;
      }
      
      var completedCount = (completedResult.data && completedResult.data.length) || 0;
      
      // Count how many check-ins have been completed for this child
      var checkinsResult = await window.supabase
        .from('pathway_assessments')
        .select('id')
        .eq('child_id', childId)
        .in('assessment_type', ['checkin', 'check_in']);
      
      if (checkinsResult.error) {
        console.error('[Check-in] Error counting completed check-ins:', checkinsResult.error);
        return false;
      }
      
      var checkinCount = (checkinsResult.data && checkinsResult.data.length) || 0;
      
      // Calculate how many check-ins should have been done
      // First check-in at module 1, then every 3 modules (1, 4, 7, 10, etc.)
      var expectedCheckins = Math.floor(completedCount / CHECKIN_MODULE_INTERVAL) + 1;
      
      console.log('[Check-in] Completed modules:', completedCount, 'Check-ins done:', checkinCount, 'Expected:', expectedCheckins);
      
      // Trigger check-in if we haven't done enough check-ins yet
      if (checkinCount < expectedCheckins) {
        console.log('[Check-in] Triggering check-in - need to catch up');
        return true;
      }
      
      return false;
    } catch (e) {
      console.error('Error checking checkin status:', e);
      return false;
    }
  }

  async getPathwayProgress(childId, pathwayCategory) {
    if (!window.progressTrackingSystem || !window.supabase) return null;
    await window.progressTrackingSystem.init(window.supabase);
    var assessments = await window.progressTrackingSystem.getProgressData(childId, pathwayCategory);
    return window.progressTrackingSystem.generateProgressReport(assessments);
  }

  updateRankDisplay() {
    getDashboardData();
    var rankElement = document.getElementById('childRank');
    if (rankElement && dashboardSelectedChild) {
      if (dashboardChildren && dashboardChildren.length > 0) {
        var sortedChildren = dashboardChildren.filter(function(child) { return child.total_stars !== undefined; }).sort(function(a, b) { return (b.total_stars || 0) - (a.total_stars || 0); });
        var rank = -1;
        for (var i = 0; i < sortedChildren.length; i++) {
          if (sortedChildren[i].id === dashboardSelectedChild.id) {
            rank = i + 1;
            break;
          }
        }
        rankElement.textContent = rank > 0 ? '#' + rank : '#1';
      } else {
        rankElement.textContent = '#1';
      }
    }
  }
}

// CSS Animation for sparkles
var sparkleCSS = document.createElement('style');
sparkleCSS.textContent = '@keyframes sparkleFloat { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-50px) scale(0); opacity: 0; } }';
document.head.appendChild(sparkleCSS);

// Initialize
var enhancedDashboard;
var enhancedDashboardInitialized = false;

function initEnhancedDashboard() {
  if (enhancedDashboardInitialized && enhancedDashboard) {
    // Already initialized, just refresh
    enhancedDashboard.init();
    return;
  }

  console.log('Initializing enhanced dashboard with Adventure Map V4 (Super Skills Themed)...');
  enhancedDashboard = new EnhancedDashboard();
  enhancedDashboardInitialized = true;
  window.enhancedDashboard = enhancedDashboard;
  enhancedDashboard.init();
}

// OPTIMIZED: Use event-driven initialization instead of polling
document.addEventListener('DOMContentLoaded', function() {
  // Check immediately if data is available
  if (typeof window.modules !== 'undefined' && window.modules && window.modules.length > 0) {
    requestAnimationFrame(initEnhancedDashboard);
    return;
  }
  
  // If not ready, use MutationObserver to watch for data instead of polling
  var checkCount = 0;
  var maxChecks = 25; // Max 5 seconds (25 * 200ms)
  
  function checkDataReady() {
    checkCount++;
    // Check for window.modules OR window.state.selectedChild (the actual variable used)
    if (typeof window.modules !== 'undefined' || (window.state && window.state.selectedChild)) {
      requestAnimationFrame(initEnhancedDashboard);
    } else if (checkCount < maxChecks) {
      setTimeout(checkDataReady, 200);
    } else {
      console.warn('Enhanced dashboard: Data not available after timeout');
    }
  }
  
  // Start checking after a short delay
  setTimeout(checkDataReady, 100);
});

// Refresh function — immediate execution, debounces rapid successive calls
var refreshDebounceTimer = null;
window.refreshEnhancedDashboard = function() {
  // If a call is already pending, skip (debounce)
  if (refreshDebounceTimer) {
    return;
  }
  // Execute immediately
  if (enhancedDashboard) {
    enhancedDashboard.init();
  } else {
    initEnhancedDashboard();
  }
  // Block subsequent calls for 50ms
  refreshDebounceTimer = setTimeout(function() {
    refreshDebounceTimer = null;
  }, 50);
};

window.initEnhancedDashboard = initEnhancedDashboard;

// Function to set super skill from focus plan (called by dashboard.js)
window.setAdventureMapSuperSkill = function(superSkillSlug) {
  if (!superSkillSlug) return;
  
  // Store globally
  window.currentFocusSuperSkill = superSkillSlug;
  
  // Update the adventure map if it exists
  if (enhancedDashboard && enhancedDashboard.adventureMap) {
    enhancedDashboard.adventureMap.currentCategory = superSkillSlug;
    enhancedDashboard.adventureMap.setStoredCategory(superSkillSlug);
    enhancedDashboard.adventureMap.render();
  }
};

// Export the category to super skill mapping for use by focus-plan.js
window.CATEGORY_TO_SUPERSKILL = CATEGORY_TO_SUPERSKILL;
