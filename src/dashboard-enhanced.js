// ================================================
// ADVENTURE MAP V4 - Category-Themed Interactive Maps
// Enhanced Dashboard Features with Draggable Map & Category Filters
// ================================================

// Import existing dashboard state and functions
let dashboardModules = [];
let dashboardChildModules = [];
let dashboardSelectedChild = null;
let dashboardChildren = [];

// Function to get data from main dashboard
function getDashboardData() {
  if (typeof window.modules !== 'undefined') dashboardModules = window.modules;
  if (typeof window.childModules !== 'undefined') dashboardChildModules = window.childModules;
  if (typeof window.selectedChild !== 'undefined') dashboardSelectedChild = window.selectedChild;
  if (typeof window.children !== 'undefined') dashboardChildren = window.children;
}

// ================================================
// CATEGORY THEME CONFIGURATIONS
// ================================================

const CATEGORY_THEMES = {
  all: {
    name: 'All Adventures',
    emoji: '🗺️',
    color: '#405878',
    description: 'View all your adventures',
    // Progress-based sky: starts neutral, ends peaceful
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
  
  anger: {
    name: 'Anger Journey',
    emoji: '🔥',
    color: '#8B0000',
    description: 'From fiery feelings to peaceful calm',
    // Progress-based sky: harsh reds → orange warmth → calm blues/greens
    skyGradientStart: ['#8B0000', '#A52A2A', '#CD5C5C', '#DC143C', '#FF6347'],
    skyGradientEnd: ['#87CEEB', '#98D8C8', '#90EE90', '#98FB98', '#E0FFFF'],
    decorationsStart: ['🔥', '💨', '💢', '⚡', '🌪️'],
    decorationsEnd: ['🌸', '🌼', '🦋', '🐦', '☀️', '🌈', '🌿'],
    pathColor: { main: '#8B4513', light: '#A0522D', shadow: 'rgba(139, 0, 0, 0.3)' },
    startMarker: '🔥',
    endMarker: '🌸',
    destination: { name: 'Calm Meadow', emoji: '🏕️' },
    nodeEmojis: { incomplete: '😠', complete: '😊' },
    danielExpressions: { start: 'stressed', middle: 'focused', end: 'calm' }
  },
  
  anxiety: {
    name: 'Anxiety Journey',
    emoji: '🌧️',
    color: '#ab47bc',
    description: 'From stormy skies to sunshine',
    // Progress-based sky: dark stormy → clearing → bright sunny
    skyGradientStart: ['#4A5568', '#5A6578', '#6B7B8C', '#7C8B9C', '#8D9BAC'],
    skyGradientEnd: ['#87CEEB', '#FFE4B5', '#FFFACD', '#FFF8DC', '#FFFFF0'],
    decorationsStart: ['🌧️', '💨', '☁️', '🌫️', '⛈️'],
    decorationsEnd: ['☀️', '🌈', '🌻', '🦋', '🐦', '🌸'],
    pathColor: { main: '#9370DB', light: '#BA55D3', shadow: 'rgba(171, 71, 188, 0.3)' },
    startMarker: '🌧️',
    endMarker: '☀️',
    destination: { name: 'Sunny Clearing', emoji: '🌅' },
    nodeEmojis: { incomplete: '😰', complete: '😌' },
    danielExpressions: { start: 'worried', middle: 'hopeful', end: 'peaceful' }
  },
  
  depression: {
    name: 'Depression Journey',
    emoji: '🌙',
    color: '#002657',
    description: 'From darkness to bright garden',
    // Progress-based sky: dark night → dawn → bright day
    skyGradientStart: ['#1a1a2e', '#16213e', '#1f3460', '#2C3E50', '#34495E'],
    skyGradientEnd: ['#87CEEB', '#FFB347', '#FFCC33', '#FFD700', '#FFF8DC'],
    decorationsStart: ['🌙', '✨', '🌑', '💫'],
    decorationsEnd: ['🌻', '🌷', '🌸', '🦋', '🐦', '☀️', '🌈'],
    pathColor: { main: '#4682B4', light: '#5F9EA0', shadow: 'rgba(0, 38, 87, 0.3)' },
    startMarker: '🌙',
    endMarker: '🌻',
    destination: { name: 'Bright Garden', emoji: '🌻' },
    nodeEmojis: { incomplete: '😔', complete: '😊' },
    danielExpressions: { start: 'sad', middle: 'hopeful', end: 'joyful' }
  },
  
  emotions: {
    name: 'Emotions Journey',
    emoji: '💭',
    color: '#f46b6b',
    description: 'Understanding all feelings',
    // Progress-based sky: mixed/confused → balanced → harmonious
    skyGradientStart: ['#DDA0DD', '#DA70D6', '#BA55D3', '#9370DB', '#8A2BE2'],
    skyGradientEnd: ['#FFB6C1', '#FFC0CB', '#FFE4E1', '#FFF0F5', '#FFFAFA'],
    decorationsStart: ['💭', '❓', '🌀', '💫'],
    decorationsEnd: ['💖', '😊', '🌈', '✨', '🦋', '🌸'],
    pathColor: { main: '#FF6B6B', light: '#FF8E8E', shadow: 'rgba(244, 107, 107, 0.3)' },
    startMarker: '💭',
    endMarker: '💖',
    destination: { name: 'Heart Haven', emoji: '💖' },
    nodeEmojis: { incomplete: '🤔', complete: '😊' },
    danielExpressions: { start: 'curious', middle: 'understanding', end: 'loving' }
  },
  
  body: {
    name: 'Body Awareness',
    emoji: '💪',
    color: '#f4a73b',
    description: 'Connect with your body',
    // Progress-based sky: tense energy → flowing → calm
    skyGradientStart: ['#FF8C00', '#FFA500', '#FFB347', '#FFCC00', '#FFD700'],
    skyGradientEnd: ['#87CEEB', '#B0E0E6', '#ADD8E6', '#E0FFFF', '#F0FFFF'],
    decorationsStart: ['⚡', '💨', '🔥', '💪'],
    decorationsEnd: ['🧘', '🌊', '🍃', '🦋', '🌸', '☀️'],
    pathColor: { main: '#F4A73B', light: '#FFB84D', shadow: 'rgba(244, 167, 59, 0.3)' },
    startMarker: '⚡',
    endMarker: '🧘',
    destination: { name: 'Zen Garden', emoji: '🧘' },
    nodeEmojis: { incomplete: '😤', complete: '😌' },
    danielExpressions: { start: 'tense', middle: 'relaxing', end: 'zen' }
  },
  
  cognitive: {
    name: 'Thinking Skills',
    emoji: '🧠',
    color: '#35a4d4',
    description: 'Train your brain',
    // Progress-based sky: foggy → clearing → crystal clear
    skyGradientStart: ['#778899', '#8899AA', '#99AABB', '#AABBCC', '#BBCCDD'],
    skyGradientEnd: ['#00CED1', '#48D1CC', '#40E0D0', '#7FFFD4', '#AFEEEE'],
    decorationsStart: ['💭', '🌫️', '❓', '🤔'],
    decorationsEnd: ['💡', '⭐', '🌟', '✨', '🎯', '🏆'],
    pathColor: { main: '#35A4D4', light: '#5BB8DE', shadow: 'rgba(53, 164, 212, 0.3)' },
    startMarker: '💭',
    endMarker: '💡',
    destination: { name: 'Clarity Peak', emoji: '💡' },
    nodeEmojis: { incomplete: '🤔', complete: '🧠' },
    danielExpressions: { start: 'confused', middle: 'thinking', end: 'enlightened' }
  },
  
  social: {
    name: 'Social Skills',
    emoji: '👫',
    color: '#4caf50',
    description: 'Connect with others',
    // Progress-based sky: isolated → connecting → together
    skyGradientStart: ['#90A4AE', '#A5B5BF', '#B0BEC5', '#CFD8DC', '#ECEFF1'],
    skyGradientEnd: ['#98FB98', '#90EE90', '#7CCD7C', '#66CDAA', '#3CB371'],
    decorationsStart: ['🏠', '🚪', '🌲'],
    decorationsEnd: ['👫', '🤝', '❤️', '🎉', '🎊', '🦋', '🌈'],
    pathColor: { main: '#4CAF50', light: '#66BB6A', shadow: 'rgba(76, 175, 80, 0.3)' },
    startMarker: '🏠',
    endMarker: '🎉',
    destination: { name: 'Friendship Circle', emoji: '🎉' },
    nodeEmojis: { incomplete: '🙂', complete: '😄' },
    danielExpressions: { start: 'shy', middle: 'friendly', end: 'celebrating' }
  },
  
  general: {
    name: 'General Skills',
    emoji: '📚',
    color: '#4c6c96',
    description: 'Life skills and more',
    // Progress-based sky: learning → growing → mastering
    skyGradientStart: ['#B0C4DE', '#A8B8CC', '#9AACBE', '#8CA0B0', '#7E94A2'],
    skyGradientEnd: ['#87CEEB', '#98D8F0', '#ADD8E6', '#B0E0E6', '#E0FFFF'],
    decorationsStart: ['📚', '📖', '✏️'],
    decorationsEnd: ['🎓', '🏆', '⭐', '🌟', '✨', '🎯'],
    pathColor: { main: '#4C6C96', light: '#6080A8', shadow: 'rgba(76, 108, 150, 0.3)' },
    startMarker: '📚',
    endMarker: '🏆',
    destination: { name: 'Achievement Hall', emoji: '🏆' },
    nodeEmojis: { incomplete: '📖', complete: '🎓' },
    danielExpressions: { start: 'curious', middle: 'learning', end: 'proud' }
  }
};

// Daniel expression images mapping
const DANIEL_EXPRESSIONS = {
  stressed: '/images/characters/DanielTheDog.png',
  worried: '/images/characters/DanielTheDog.png',
  sad: '/images/characters/DanielTheDog.png',
  tense: '/images/characters/DanielTheDog.png',
  confused: '/images/characters/DanielTheDog.png',
  shy: '/images/characters/DanielTheDog.png',
  curious: '/images/characters/DanielTheDog.png',
  focused: '/images/characters/DanielTheDog.png',
  hopeful: '/images/characters/DanielTheDog.png',
  relaxing: '/images/characters/DanielTheDog.png',
  thinking: '/images/characters/DanielTheDog.png',
  friendly: '/images/characters/DanielTheDog.png',
  learning: '/images/characters/DanielTheDog.png',
  understanding: '/images/characters/DanielTheDog.png',
  happy: '/images/characters/DanielTheDog.png',
  calm: '/images/characters/DanielTheDog.png',
  peaceful: '/images/characters/DanielTheDog.png',
  joyful: '/images/characters/DanielTheDog.png',
  loving: '/images/characters/DanielTheDog.png',
  zen: '/images/characters/DanielTheDog.png',
  enlightened: '/images/characters/DanielTheDog.png',
  celebrating: '/images/characters/DanielTheDog.png',
  proud: '/images/characters/DanielTheDog.png'
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
    this.currentCategory = 'all';
    this.boundHandlers = {};
    
    this.updateMobileConfig();
  }

  updateMobileConfig() {
    this.isMobile = window.innerWidth <= 768;
    
    this.config = {
      nodeSize: this.isMobile ? 50 : 68,
      nodeSpacingY: this.isMobile ? 75 : 115,
      pathAmplitude: this.isMobile ? 50 : 120,
      zigzagFrequency: this.isMobile ? 0.8 : 1.2,
      topPadding: this.isMobile ? 50 : 100,
      bottomPadding: this.isMobile ? 70 : 140,
      sidePadding: this.isMobile ? 30 : 80,
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
    this.injectStyles();
    this.render();
  }

  injectStyles() {
    if (document.getElementById('adventure-map-v4-styles')) return;
    
    var css = [];
    css.push('.adventure-map-section { background: #fff; border-radius: 20px; padding: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); border: 1px solid rgba(64,88,120,0.08); margin-top: 20px; overflow: hidden; }');
    css.push('.adventure-header { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 8px 16px; }');
    css.push('.adventure-title { font-family: "Fredoka", "League Spartan", system-ui, sans-serif; font-size: 26px; margin: 0; color: #405878; display: flex; align-items: center; gap: 10px; }');
    css.push('.adventure-subtitle { margin: 0; color: #6d86a8; font-size: 14px; }');
    css.push('.category-filter-container { display: flex; align-items: center; gap: 12px; margin: 12px 0 16px; padding: 0 8px; flex-wrap: wrap; justify-content: center; }');
    css.push('.category-filter-label { font-family: "Fredoka", sans-serif; font-size: 14px; font-weight: 600; color: #405878; }');
    css.push('.category-filter-select { font-family: "Fredoka", sans-serif; font-size: 14px; font-weight: 500; padding: 10px 36px 10px 16px; border-radius: 12px; border: 2px solid rgba(64,88,120,0.15); background: linear-gradient(180deg, #fff 0%, #f8f9fa 100%); color: #405878; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23405878\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; min-width: 200px; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }');
    css.push('.category-filter-select:hover { border-color: rgba(64,88,120,0.25); }');
    css.push('.category-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }');
    css.push('.adventure-viewport { position: relative; width: 100%; height: 480px; border-radius: 16px; overflow: hidden; cursor: grab; border: 3px solid rgba(64,88,120,0.12); box-shadow: inset 0 0 80px rgba(135,206,235,0.2), 0 4px 20px rgba(0,0,0,0.1); user-select: none; -webkit-user-select: none; touch-action: none; }');
    css.push('.adventure-viewport:active, .adventure-viewport.dragging { cursor: grabbing; }');
    css.push('.map-bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }');
    css.push('.map-bg-sky { transition: background 0.8s ease; }');
    css.push('.map-bg-hills { background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 200\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M0,200 Q150,80 300,120 T600,80 T900,110 T1200,70 L1200,200 Z\' fill=\'%2368B868\'/%3E%3Cpath d=\'M0,200 Q200,100 400,130 T800,90 T1200,120 L1200,200 Z\' fill=\'%2358A858\'/%3E%3C/svg%3E"); background-size: 100% 140px; background-repeat: no-repeat; background-position: center 35%; }');
    css.push('.map-bg-grass { background: linear-gradient(180deg, transparent 0%, transparent 50%, #4CAF50 50%, #43A047 100%); }');
    css.push('.map-bg-clouds { background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 500 120\'%3E%3Cellipse cx=\'70\' cy=\'50\' rx=\'40\' ry=\'24\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'100\' cy=\'42\' rx=\'30\' ry=\'20\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'50\' cy=\'48\' rx=\'25\' ry=\'16\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'85\' cy=\'55\' rx=\'28\' ry=\'15\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'350\' cy=\'60\' rx=\'45\' ry=\'26\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'385\' cy=\'52\' rx=\'32\' ry=\'20\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'330\' cy=\'58\' rx=\'28\' ry=\'18\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3Cellipse cx=\'365\' cy=\'65\' rx=\'30\' ry=\'16\' fill=\'white\' fill-opacity=\'0.9\'/%3E%3C/svg%3E"); background-size: 600px 120px; background-repeat: repeat-x; background-position: 0 15px; animation: cloudsDrift 90s linear infinite; }');
    css.push('@keyframes cloudsDrift { from { background-position-x: 0; } to { background-position-x: 600px; } }');
    css.push('.map-bg-trees { background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 200 70\'%3E%3Cpath d=\'M10,70 L20,35 L15,40 L25,18 L20,23 L30,0 L40,23 L35,18 L45,40 L40,35 L50,70 Z\' fill=\'%232E7D32\'/%3E%3Cpath d=\'M55,70 L63,42 L59,46 L67,28 L63,32 L71,14 L79,32 L75,28 L83,46 L79,42 L87,70 Z\' fill=\'%231B5E20\'/%3E%3Cpath d=\'M95,70 L107,32 L101,38 L113,10 L125,38 L119,32 L131,70 Z\' fill=\'%232E7D32\'/%3E%3Cpath d=\'M140,70 L148,45 L144,49 L152,32 L148,36 L156,20 L164,36 L160,32 L168,49 L164,45 L172,70 Z\' fill=\'%231B5E20\'/%3E%3C/svg%3E"); background-size: 250px 90px; background-repeat: repeat-x; background-position: 0 bottom; }');
    css.push('.adventure-canvas { position: absolute; top: 0; left: 0; width: 100%; will-change: transform; transition: transform 0.05s linear; background: linear-gradient(180deg, transparent 0%, rgba(92, 184, 92, 0.15) 30%, rgba(76, 175, 80, 0.25) 60%, rgba(67, 160, 71, 0.3) 100%); }');
    css.push('.adventure-viewport.dragging .adventure-canvas { transition: none; }');
    css.push('.map-decorations { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }');
    css.push('.map-decoration { position: absolute; font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15)); opacity: 0.9; }');
    css.push('.map-decoration.animate { animation: decorSway 4s ease-in-out infinite; }');
    css.push('@keyframes decorSway { 0%, 100% { transform: rotate(-3deg) scale(1); } 50% { transform: rotate(3deg) scale(1.05); } }');
    css.push('.adventure-path-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }');
    css.push('.path-shadow { fill: none; stroke-width: 36; stroke-linecap: round; stroke-linejoin: round; }');
    css.push('.path-main { fill: none; stroke-width: 30; stroke-linecap: round; stroke-linejoin: round; }');
    css.push('.path-light { fill: none; stroke-width: 22; stroke-linecap: round; stroke-linejoin: round; }');
    css.push('.path-dashes { fill: none; stroke: rgba(255,255,255,0.5); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 0 18; animation: dashMove 1s linear infinite; }');
    css.push('@keyframes dashMove { to { stroke-dashoffset: -36; } }');
    css.push('.adventure-nodes { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; }');
    css.push('.adventure-node { position: absolute; width: 66px; height: 66px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transform: translate(-50%, -50%); transition: transform 0.2s ease, box-shadow 0.2s ease; z-index: 10; }');
    css.push('.adventure-node:hover { transform: translate(-50%, -50%) scale(1.15); z-index: 20; }');
    css.push('.adventure-node .node-emoji { font-size: 28px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2)); }');
    css.push('.adventure-node.completed { background: linear-gradient(145deg, #4ADE80 0%, #22C55E 100%); border: 4px solid #fff; box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4), 0 0 0 4px rgba(34, 197, 94, 0.2); }');
    css.push('.adventure-node.available { background: linear-gradient(145deg, #FBBF24 0%, #F59E0B 100%); border: 4px solid #fff; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5), 0 0 0 4px rgba(245, 158, 11, 0.25); animation: availablePulse 2s ease-in-out infinite; }');
    css.push('@keyframes availablePulse { 0%, 100% { box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5), 0 0 0 4px rgba(245, 158, 11, 0.25); } 50% { box-shadow: 0 8px 30px rgba(245, 158, 11, 0.7), 0 0 0 8px rgba(245, 158, 11, 0.15); } }');
    css.push('.adventure-node.locked { background: linear-gradient(145deg, #9CA3AF 0%, #6B7280 100%); border: 4px solid rgba(255,255,255,0.6); box-shadow: 0 4px 12px rgba(0,0,0,0.2); cursor: not-allowed; opacity: 0.8; }');
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
    css.push('.current-indicator { position: absolute; top: -54px; left: 50%; transform: translateX(-50%); width: 56px; height: 56px; padding: 4px; border-radius: 50%; background: rgba(255, 255, 255, 0.95); display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25)); animation: characterBounce 1s ease-in-out infinite; z-index: 15; }');
    css.push('.current-indicator img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; pointer-events: none; }');
    css.push('@keyframes characterBounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-8px); } }');
    css.push('.map-progress { position: absolute; top: 12px; left: 12px; background: rgba(255,255,255,0.95); padding: 10px 16px; border-radius: 14px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.12); border: 1px solid rgba(64,88,120,0.1); font-family: "Fredoka", sans-serif; z-index: 50; }');
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
    css.push('.map-marker { position: absolute; font-size: 32px; z-index: 5; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25)); pointer-events: none; }');
    css.push('.map-marker.start { animation: markerPop 0.5s ease-out; }');
    css.push('.map-marker.finish { animation: flagWave 1.5s ease-in-out infinite; }');
    css.push('@keyframes markerPop { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }');
    css.push('@keyframes flagWave { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }');
    css.push('.floating-cloud { position: absolute; font-size: 40px; opacity: 0.6; z-index: 0; animation: cloudFloat 20s linear infinite; pointer-events: none; }');
    css.push('@keyframes cloudFloat { 0% { transform: translateX(-100px); } 100% { transform: translateX(calc(100% + 100px)); } }');
    css.push('.zone-label { position: absolute; font-family: "Fredoka", sans-serif; font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.9); text-transform: uppercase; letter-spacing: 1.5px; pointer-events: none; z-index: 4; text-shadow: 0 2px 4px rgba(0,0,0,0.4); background: rgba(0,0,0,0.2); padding: 4px 12px; border-radius: 12px; }');
    css.push('.map-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; text-align: center; color: #6d86a8; }');
    css.push('.map-empty-emoji { font-size: 64px; margin-bottom: 16px; opacity: 0.6; }');
    css.push('.map-empty-title { font-family: "Fredoka", sans-serif; font-size: 20px; font-weight: 600; color: #405878; margin-bottom: 8px; }');
    css.push('.map-empty-text { font-size: 14px; max-width: 300px; }');
    
    // Enhanced "next" node styles - bigger, pulsing, dramatic
    css.push('.adventure-node.available { width: 76px; height: 76px; background: linear-gradient(145deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%); animation: nextNodePulse 2s ease-in-out infinite, nextNodeGlow 1.5s ease-in-out infinite alternate; }');
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
    css.push('.destination-icon { font-size: 48px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }');
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
    
    css.push('@media (max-width: 768px) { .adventure-viewport { height: 400px; } .adventure-node { width: 56px; height: 56px; } .adventure-node .node-emoji { font-size: 24px; } .node-number { width: 20px; height: 20px; font-size: 9px; } .node-badge { width: 22px; height: 22px; font-size: 11px; } .category-filter-container { flex-direction: column; align-items: stretch; } .category-filter-select { width: 100%; } .path-shadow { stroke-width: 24 !important; } .path-main { stroke-width: 20 !important; } .path-light { stroke-width: 14 !important; } .map-decoration { font-size: 20px; } .zone-label { font-size: 12px; padding: 2px 8px; } .current-indicator { width: 48px; height: 48px; top: -48px; } .node-tooltip { font-size: 12px; padding: 10px 12px; } .map-progress { padding: 8px 12px; font-size: 12px; } .progress-bar { width: 60px; } .progress-text { font-size: 12px; } .progress-icon { font-size: 16px; } }');
    
    var styles = document.createElement('style');
    styles.id = 'adventure-map-v4-styles';
    styles.textContent = css.join('\n');
    document.head.appendChild(styles);
  }

  render() {
    getDashboardData();
    this.buildModuleList();
    this.filterModulesByCategory();
    this.createMapHTML();
    
    if (this.modules.length > 0) {
      this.applyThemeToBackground();
      this.renderPath();
      this.renderDecorations();
      this.renderNodes();
      this.updateProgress();
      this.centerOnCurrentModule();
    }
    
    this.setupEventListeners();
  }

  buildModuleList() {
    var dashMods = window.modules || dashboardModules || [];
    var childMods = window.childModules || dashboardChildModules || [];

    if (dashMods.length > 0) {
      var seriesOrder = { 'luna': 1, 'Luna': 1, 'daniel': 2, 'Daniel': 2 };

      var sorted = dashMods.slice().sort(function(a, b) {
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
        var status = completed ? 'completed' : 'available';
        var seriesName = (m.series && m.series.label) || m.series_name || m.series || '';
        var category = ((m.category && m.category.name) || (m.category && typeof m.category === 'string' ? m.category : '') || m.category_name || 'general').toLowerCase();
        var pathwayOrder = (m.pathway_order !== undefined && m.pathway_order !== null) ? Number(m.pathway_order) : null;

        return {
          id: m.id,
          code: m.module_code || m.code || m.id,
          name: m.title || 'Module ' + (index + 1),
          series: seriesName,
          category: category,
          status: status,
          completed: completed,
          pathwayOrder: pathwayOrder,
          emoji: self.getModuleEmoji(m, category),
          module: m,
          childModule: childModule
        };
      });
    }

    if (this.allModules.length === 0) {
      this.allModules = [
        { id: 'm1', name: 'Understanding Feelings', category: 'emotions', status: 'completed', emoji: '💭' },
        { id: 'm2', name: 'Calming Down', category: 'anxiety', status: 'available', emoji: '🧘' },
        { id: 'm3', name: 'Making Friends', category: 'social', status: 'available', emoji: '👫' }
      ];
    }
  }

  filterModulesByCategory() {
    var self = this;
    if (this.currentCategory === 'all') {
      this.modules = this.allModules.slice();
    } else {
      this.modules = this.allModules.filter(function(m) { return m.category === self.currentCategory; });
    }

    // Pathway ordering: if modules have pathway_order, sort ascending (1,2,3...).
    // Fallback keeps original order for items without pathway_order.
    this.modules.sort(function(a, b) {
      var ao = (a.pathwayOrder !== null && a.pathwayOrder !== undefined) ? a.pathwayOrder : Number.POSITIVE_INFINITY;
      var bo = (b.pathwayOrder !== null && b.pathwayOrder !== undefined) ? b.pathwayOrder : Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return 0;
    });

    // Sequential unlocking: only the first incomplete module is playable; later ones are locked.
    // Completed modules stay completed.
    if (this.currentCategory !== 'all') {
      var firstIncompleteIndex = -1;
      for (var i = 0; i < this.modules.length; i++) {
        if (!this.modules[i].completed) {
          firstIncompleteIndex = i;
          break;
        }
      }

      for (var j = 0; j < this.modules.length; j++) {
        var mod = this.modules[j];
        if (mod.completed) {
          mod.status = 'completed';
        } else if (firstIncompleteIndex === -1 || j === firstIncompleteIndex) {
          mod.status = 'available';
        } else {
          mod.status = 'locked';
        }
      }
    }
  }

  getAvailableCategories() {
    var categories = ['all'];
    var seen = { all: true };
    this.allModules.forEach(function(m) {
      if (m.category && !seen[m.category]) {
        seen[m.category] = true;
        categories.push(m.category);
      }
    });
    return categories;
  }

  getModuleEmoji(module, category) {
    if (!module) return '📘';
    var title = (module.title || '').toLowerCase();
    
    var categoryEmojis = {
      anger: ['😤', '😠', '💢', '🔥', '❄️'],
      anxiety: ['😰', '😨', '😟', '🧘', '☀️'],
      depression: ['😢', '😔', '🌙', '🌈', '🌻'],
      emotions: ['💭', '😊', '😢', '💖', '🌈'],
      body: ['💪', '🏃', '🧘', '✋', '🌊'],
      cognitive: ['🧠', '💡', '🎯', '📚', '💭'],
      social: ['👫', '🤝', '💬', '❤️', '🎉'],
      general: ['📘', '⭐', '🌟', '📖', '🎓']
    };

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
    
    var emojis = categoryEmojis[category] || categoryEmojis.general;
    return emojis[0];
  }

  createMapHTML() {
    var section = document.querySelector('.adventure-map-section');
    if (!section) return;

    var theme = CATEGORY_THEMES[this.currentCategory] || CATEGORY_THEMES.all;
    var availableCategories = this.getAvailableCategories();
    var numModules = this.modules.length;
    var canvasHeight = Math.max(this.config.minCanvasHeight, this.config.topPadding + (numModules * this.config.nodeSpacingY) + this.config.bottomPadding);

    var self = this;
    var categoryOptions = availableCategories.map(function(cat) {
      var catTheme = CATEGORY_THEMES[cat] || CATEGORY_THEMES.all;
      var count = cat === 'all' ? self.allModules.length : self.allModules.filter(function(m) { return m.category === cat; }).length;
      return '<option value="' + cat + '"' + (cat === self.currentCategory ? ' selected' : '') + '>' + catTheme.emoji + ' ' + catTheme.name + ' (' + count + ')</option>';
    }).join('');

    var html = '<div class="adventure-header">' +
      '<h2 class="adventure-title" style="color: ' + theme.color + '">' + theme.emoji + ' ' + theme.name + '</h2>' +
      '<p class="adventure-subtitle">' + theme.description + '</p>' +
      '</div>' +
      '<div class="category-filter-container">' +
      '<label class="category-filter-label">Choose your path:</label>' +
      '<select class="category-filter-select" id="categoryFilter">' + categoryOptions + '</select>' +
      '<span class="category-badge" style="background: ' + theme.color + '">' + theme.emoji + ' ' + this.modules.length + ' module' + (this.modules.length !== 1 ? 's' : '') + '</span>' +
      '</div>';

    if (this.modules.length > 0) {
      html += '<div class="adventure-viewport" id="adventureViewport">' +
        '<div class="map-bg-layer map-bg-sky" id="mapBgSky"></div>' +
        '<div class="map-bg-layer map-bg-hills"></div>' +
        '<div class="map-bg-layer map-bg-grass"></div>' +
        '<div class="map-bg-layer map-bg-clouds"></div>' +
        '<div class="map-bg-layer map-bg-trees"></div>' +
        '<div class="adventure-canvas" id="adventureCanvas" style="height: ' + canvasHeight + 'px;">' +
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
      html += '<div class="map-empty-state">' +
        '<div class="map-empty-emoji">🗺️</div>' +
        '<div class="map-empty-title">No modules yet</div>' +
        '<div class="map-empty-text">There are no modules in this category yet. Try selecting a different path!</div>' +
        '</div>';
    }

    section.innerHTML = html;
    this.viewport = document.getElementById('adventureViewport');
    this.canvas = document.getElementById('adventureCanvas');
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

  renderPath() {
    var svg = document.getElementById('adventurePathSvg');
    if (!svg || this.modules.length === 0) return;

    var positions = this.calculateNodePositions();
    if (positions.length < 2) return;

    var theme = CATEGORY_THEMES[this.currentCategory] || CATEGORY_THEMES.all;
    var pathD = 'M ' + positions[0].x + ' ' + positions[0].y;
    
    for (var i = 1; i < positions.length; i++) {
      var prev = positions[i - 1];
      var curr = positions[i];
      var midY = (prev.y + curr.y) / 2;
      pathD += ' C ' + prev.x + ' ' + midY + ', ' + curr.x + ' ' + midY + ', ' + curr.x + ' ' + curr.y;
    }

    svg.innerHTML = '<path class="path-shadow" d="' + pathD + '" style="stroke: ' + theme.pathColor.shadow + '" />' +
      '<path class="path-main" d="' + pathD + '" style="stroke: ' + theme.pathColor.main + '" />' +
      '<path class="path-light" d="' + pathD + '" style="stroke: ' + theme.pathColor.light + '" />' +
      '<path class="path-dashes" d="' + pathD + '" />';

    var startMarker = document.createElement('div');
    startMarker.className = 'map-marker start';
    startMarker.textContent = theme.startMarker || '🏠';
    startMarker.style.left = (positions[0].x - 50) + 'px';
    startMarker.style.top = (positions[0].y - 20) + 'px';
    this.canvas.appendChild(startMarker);

    var lastPos = positions[positions.length - 1];
    var finishMarker = document.createElement('div');
    finishMarker.className = 'map-marker finish';
    finishMarker.textContent = theme.endMarker || '🏁';
    finishMarker.style.left = (lastPos.x + 50) + 'px';
    finishMarker.style.top = (lastPos.y - 20) + 'px';
    this.canvas.appendChild(finishMarker);
  }

  renderDecorations() {
    var container = document.getElementById('mapDecorations');
    if (!container) return;

    var theme = CATEGORY_THEMES[this.currentCategory] || CATEGORY_THEMES.all;
    var positions = this.calculateNodePositions();
    var viewportWidth = this.viewport ? this.viewport.offsetWidth : 400;
    var progressLevel = this.getProgressLevel();
    var self = this;

    // Clouds - fewer as progress increases
    var numClouds = Math.max(1, 3 - progressLevel);
    for (var i = 0; i < numClouds; i++) {
      var cloud = document.createElement('div');
      cloud.className = 'floating-cloud';
      cloud.textContent = '☁️';
      cloud.style.top = (20 + Math.random() * 60) + 'px';
      cloud.style.animationDelay = (i * 7) + 's';
      cloud.style.animationDuration = (18 + Math.random() * 10) + 's';
      cloud.style.opacity = (0.4 + (1 - progressLevel * 0.3) * 0.3).toString();
      container.appendChild(cloud);
    }

    // Get progress-based decorations
    var decorationsStart = theme.decorationsStart || ['🌲', '🌳'];
    var decorationsEnd = theme.decorationsEnd || ['🌸', '🌻', '🦋'];
    
    positions.forEach(function(pos, index) {
      var module = self.modules[index];
      var isCompleted = module && module.status === 'completed';
      var nodeProgress = self.modules.length > 0 ? index / self.modules.length : 0;
      
      // Choose decorations based on position in journey
      var decorations = nodeProgress < 0.5 ? decorationsStart : decorationsEnd;
      var numDecorations = 2 + Math.floor(Math.random() * 2);
      
      for (var d = 0; d < numDecorations; d++) {
        var decoIndex = (index + d) % decorations.length;
        var deco = decorations[decoIndex];
        var angle = (d / numDecorations) * Math.PI * 2 + Math.random() * 0.5;
        var distance = 60 + Math.random() * 80;
        var decoX = pos.x + Math.cos(angle) * distance;
        var decoY = pos.y + Math.sin(angle) * distance * 0.6;

        if (decoX < 20 || decoX > viewportWidth - 20) continue;

        var el = document.createElement('div');
        el.className = 'map-decoration';
        el.textContent = deco;
        el.style.left = decoX + 'px';
        el.style.top = decoY + 'px';
        el.style.fontSize = (24 + Math.random() * 12) + 'px';
        el.style.opacity = (0.7 + Math.random() * 0.3).toString();
        
        if (Math.random() > 0.7) {
          el.classList.add('animate');
          el.style.animationDelay = (Math.random() * 2) + 's';
        }
        container.appendChild(el);
      }
      
      // Add environmental feedback near completed nodes
      if (isCompleted) {
        // Add flowers blooming near completed nodes
        var flowerEmojis = ['🌸', '🌼', '🌻', '🌷'];
        for (var f = 0; f < 2; f++) {
          var flower = document.createElement('div');
          flower.className = 'env-element bloom';
          flower.textContent = flowerEmojis[Math.floor(Math.random() * flowerEmojis.length)];
          flower.style.left = (pos.x + (Math.random() - 0.5) * 100) + 'px';
          flower.style.top = (pos.y + 30 + Math.random() * 40) + 'px';
          flower.style.fontSize = '20px';
          flower.style.animationDelay = (Math.random() * 0.5) + 's';
          container.appendChild(flower);
        }
        
        // Add butterflies/birds near completed nodes
        if (Math.random() > 0.5) {
          var creature = document.createElement('div');
          creature.className = 'env-element ' + (Math.random() > 0.5 ? 'env-butterfly' : 'env-bird');
          creature.textContent = Math.random() > 0.5 ? '🦋' : '🐦';
          creature.style.left = (pos.x + (Math.random() - 0.5) * 80) + 'px';
          creature.style.top = (pos.y - 20 - Math.random() * 30) + 'px';
          creature.style.fontSize = '18px';
          creature.style.animationDelay = (Math.random() * 2) + 's';
          container.appendChild(creature);
        }
        
        // Add sparkles
        var sparkle = document.createElement('div');
        sparkle.className = 'env-element env-sparkle';
        sparkle.textContent = '✨';
        sparkle.style.left = (pos.x + 35) + 'px';
        sparkle.style.top = (pos.y - 25) + 'px';
        sparkle.style.fontSize = '16px';
        sparkle.style.animationDelay = (Math.random() * 1.5) + 's';
        container.appendChild(sparkle);
      }
    });

    // Add mini-moments on path (signposts, campfires)
    this.renderPathMoments(container, positions);

    // Add zone labels
    var zones = this.getZoneLabels();
    if (positions.length >= 3) {
      var zoneSpacing = Math.floor(positions.length / zones.length);
      zones.forEach(function(zone, i) {
        var nodeIndex = Math.min(i * zoneSpacing, positions.length - 1);
        var pos = positions[nodeIndex];
        if (!pos) return;
        var label = document.createElement('div');
        label.className = 'zone-label';
        label.textContent = zone;
        label.style.left = '16px';
        label.style.top = (pos.y - 35) + 'px';
        container.appendChild(label);
      });
    }

    // Add destination marker at the end
    this.renderDestination(container, positions);
    
    // Add Daniel companion on the path
    this.renderDanielCompanion(container, positions);
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
  
  renderDanielCompanion(container, positions) {
    if (positions.length === 0) return;
    
    // Find Daniel's position - he should be at the furthest completed module
    var danielIndex = -1;
    for (var i = 0; i < this.modules.length; i++) {
      if (this.modules[i].status === 'completed') {
        danielIndex = i;
      } else if (this.modules[i].status === 'available') {
        // Daniel is just before the current available module
        break;
      }
    }
    
    // If no modules completed, Daniel is at the start
    if (danielIndex < 0) danielIndex = 0;
    
    var pos = positions[danielIndex];
    if (!pos) return;
    
    var expression = this.getDanielExpression();
    var expressionImage = DANIEL_EXPRESSIONS[expression] || DANIEL_EXPRESSIONS.focused;
    
    var daniel = document.createElement('div');
    daniel.className = 'daniel-companion';
    daniel.style.left = (pos.x - 32) + 'px';
    daniel.style.top = (pos.y - 80) + 'px';
    
    var danielInner = document.createElement('div');
    danielInner.className = 'daniel-companion-inner';
    
    var danielImg = document.createElement('img');
    danielImg.src = expressionImage;
    danielImg.alt = 'Daniel - ' + expression;
    danielInner.appendChild(danielImg);
    daniel.appendChild(danielInner);
    
    var expressionLabel = document.createElement('div');
    expressionLabel.className = 'daniel-expression-label';
    expressionLabel.textContent = expression.charAt(0).toUpperCase() + expression.slice(1);
    daniel.appendChild(expressionLabel);
    
    container.appendChild(daniel);
  }
  
  getZoneLabels() {
    var zonesByCategory = {
      anger: ['🔥 Hot Start', '❄️ Cooling Down', '🌸 Finding Peace'],
      anxiety: ['🌧️ Stormy Skies', '🌤️ Clearing Up', '☀️ Sunny Days'],
      depression: ['🌙 Dark Night', '🌅 Dawn Breaking', '🌻 Bright Garden'],
      emotions: ['💭 Mixed Feelings', '💪 Understanding', '💖 Harmony'],
      body: ['⚡ Tense Energy', '🌊 Finding Flow', '🧘 Inner Calm'],
      cognitive: ['💭 Foggy Mind', '🎯 Getting Clear', '💡 Sharp Focus'],
      social: ['🏠 Starting Out', '👫 Making Connections', '🎉 Together'],
      general: ['🌱 Getting Started', '🌿 Growing Stronger', '🌳 Mastering Skills'],
      all: ['🌱 Getting Started', '🌿 Growing Stronger', '🌳 Mastering Skills']
    };
    return zonesByCategory[this.currentCategory] || zonesByCategory.all;
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
        var character = document.createElement('div');
        character.className = 'current-indicator';
        var dogImage = document.createElement('img');
        dogImage.src = '/images/characters/DanielTheDog.png';
        dogImage.alt = 'Daniel the dog';
        character.appendChild(dogImage);
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
        statusText = 'Complete previous module';
        statusClass = 'locked-status';
      }

      node.addEventListener('click', function(e) {
        e.stopPropagation();
        if (module.status !== 'locked') {
          self.onNodeClick(module);
        }
      });

      node.addEventListener('touchend', function(e) {
        e.stopPropagation();
        if (module.status !== 'locked') {
          self.onNodeClick(module);
        }
      });

      node.style.pointerEvents = 'auto';
      container.appendChild(node);
    });
  }

  onNodeClick(module) {
    if (window.enhancedDashboard && typeof window.enhancedDashboard.showModulePreview === 'function') {
      window.enhancedDashboard.showModulePreview(module);
    } else {
      var child = window.selectedChild || dashboardSelectedChild;
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

    if (progressText) progressText.textContent = completed + '/' + total + ' completed';
    if (progressFill) {
      var percent = total > 0 ? (completed / total) * 100 : 0;
      progressFill.style.width = percent + '%';
      progressFill.style.background = 'linear-gradient(90deg, ' + theme.color + ', ' + theme.color + '99)';
    }
  }

  setupEventListeners() {
    this.removeEventListeners();
    if (!this.viewport) return;

    var self = this;
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

    this.viewport.addEventListener('mousedown', this.boundHandlers.mousedown);
    this.viewport.addEventListener('mousemove', this.boundHandlers.mousemove);
    this.viewport.addEventListener('mouseup', this.boundHandlers.mouseup);
    this.viewport.addEventListener('mouseleave', this.boundHandlers.mouseleave);
    this.viewport.addEventListener('touchstart', this.boundHandlers.touchstart, { passive: false });
    this.viewport.addEventListener('touchmove', this.boundHandlers.touchmove, { passive: false });
    this.viewport.addEventListener('touchend', this.boundHandlers.touchend);

    var btnCenter = document.getElementById('btnCenter');
    var btnTop = document.getElementById('btnTop');
    if (btnCenter) btnCenter.addEventListener('click', function() { self.centerOnCurrentModule(); });
    if (btnTop) btnTop.addEventListener('click', function() { self.scrollToTop(); });

    var categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', function(e) {
        self.currentCategory = e.target.value;
        self.translateX = 0;
        self.translateY = 0;
        self.hasUserInteracted = false;
        self.render();
      });
    }

    // Add window resize listener
    window.addEventListener('resize', this.boundHandlers.resize);
  }

  removeEventListeners() {
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
    for (var i = 0; i < this.modules.length; i++) {
      if (this.modules[i].status === 'available') {
        currentIndex = i;
        break;
      }
    }
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

class EnhancedDashboard {
  constructor() {
    this.adventureMap = null;
    this.currentQuest = null;
    this.questProgress = 0;
    this.danielMoodIndex = 0;
  }

  init() {
    getDashboardData();
    this.setupDanielHub();
    this.setupDailyQuest();
    this.setupAdventureMap();
    this.setupModulePreview();
    this.loadDailyQuest();
    this.updateDanielMood();
    this.updateRankDisplay();
  }

  setupDanielHub() {
    var self = this;
    var danielHub = document.getElementById('danielHub');
    if (danielHub) danielHub.addEventListener('click', function() { self.interactWithDaniel(); });
  }

  interactWithDaniel() {
    var danielAvatar = document.querySelector('.daniel-avatar');
    var moodText = document.getElementById('moodText');
    
    if (danielAvatar) {
      danielAvatar.style.transform = 'scale(1.2)';
      setTimeout(function() { danielAvatar.style.transform = 'scale(1)'; }, 200);
    }

    this.danielMoodIndex = (this.danielMoodIndex + 1) % DANIEL_MOODS.length;
    if (moodText) moodText.textContent = DANIEL_MOODS[this.danielMoodIndex];
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
    this.adventureMap = new AdventureMapV4();
    this.adventureMap.init();
  }

  setupModulePreview() {
    var self = this;
    var closeBtn = document.getElementById('closePreviewBtn');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.hideModulePreview(); });
  }

  showModulePreview(module) {
    var panel = document.getElementById('modulePreviewPanel');
    if (!panel) return;

    var emoji = document.getElementById('previewEmoji');
    var title = document.getElementById('previewTitle');
    var description = document.getElementById('previewDescription');
    var startBtn = document.getElementById('startModuleBtn');

    if (emoji) emoji.textContent = module.emoji || '📘';
    if (title) title.textContent = module.name;
    if (description) description.textContent = (module.module && module.module.description) ? module.module.description : 'Explore emotions and learn coping strategies in this interactive module.';

    var self = this;
    if (startBtn) {
      startBtn.onclick = function() {
        self.hideModulePreview();
        self.startModule(module);
      };
    }
    panel.classList.remove('hidden');
  }

  hideModulePreview() {
    var panel = document.getElementById('modulePreviewPanel');
    if (panel) panel.classList.add('hidden');
  }

  startModule(module) {
    var child = window.selectedChild || dashboardSelectedChild;
    if (module.module && child) {
      var moduleUrl = '/module.html?childId=' + child.id + '&moduleId=' + module.module.id + '&code=' + (module.code || module.module.code) + '&childName=' + encodeURIComponent(child.name || '');
      window.location.href = moduleUrl;
    }
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

function initEnhancedDashboard() {
  console.log('Initializing enhanced dashboard with Adventure Map V4 (Category Themed)...');
  if (!enhancedDashboard) {
    enhancedDashboard = new EnhancedDashboard();
  } else {
    enhancedDashboard.init();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  function checkAndInit() {
    if (typeof window.modules !== 'undefined' || typeof window.selectedChild !== 'undefined') {
      initEnhancedDashboard();
    } else {
      setTimeout(checkAndInit, 200);
    }
  }
  setTimeout(checkAndInit, 100);
});

window.refreshEnhancedDashboard = function() {
  if (enhancedDashboard) {
    setTimeout(function() { enhancedDashboard.init(); }, 50);
  } else {
    initEnhancedDashboard();
  }
};

window.enhancedDashboard = enhancedDashboard;
window.initEnhancedDashboard = initEnhancedDashboard;