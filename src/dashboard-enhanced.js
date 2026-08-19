// ================================================
// ADVENTURE MAP V4 - Super Skills Themed Interactive Maps
// Enhanced Dashboard Features with Draggable Map & Super Skill Filters
// ================================================

import { getZoneState } from './adventure-map-zones.js';
import { getZoneSceneCss, getZoneFillerCss, getZoneGround, isSvgScenesEnabled } from './adventure-zone-scenes.js';
import { injectRoadBuilderStops, openRoadBuilderGame } from './features/dashboard/roadBuilder.js';
import { renderSkillJourneyView } from './features/dashboard/skillJourneyMap.js';
// Side-effect import: defines window.roadblockSystem on load.
import './roadblock-system.js';
import { isMiniGamesEnabled } from './minigames/index.js';
// Side-effect import: EnhancedDashboard class, init/bootstrap, window globals
import './enhanced-dashboard.js';

// Cached once per page load so sync code paths (render) can check it.
let _miniGamesFlag = null;
isMiniGamesEnabled().then((v) => { _miniGamesFlag = v; }).catch(() => { _miniGamesFlag = false; });
function miniGamesActive() { return _miniGamesFlag === true; }

// SVG district scenes flag (Admin Centre → Features). The first render can
// happen before the flag resolves, so re-apply the background once it does.
let _svgScenesFlag = null;
isSvgScenesEnabled().then((v) => {
  _svgScenesFlag = v;
  var map = window.enhancedDashboard && window.enhancedDashboard.adventureMap;
  if (v && map && typeof map.applyZoneBackground === 'function') map.applyZoneBackground();
}).catch(() => { _svgScenesFlag = false; });
function svgScenesActive() { return _svgScenesFlag === true; }

// Show the dashboard footer once the map is fully rendered
function showDashboardFooter() {
  // Delay footer reveal until the loading screen is fully gone
  var loadingEl = document.getElementById('loadingState');
  if (loadingEl && !loadingEl.classList.contains('hidden')) {
    // Loading screen still visible — wait and retry
    setTimeout(showDashboardFooter, 500);
    return;
  }
  var footer = document.getElementById('dashboardFooter');
  if (footer) {
    footer.removeAttribute('style');
    footer.classList.add('dashboard-footer-visible');
  }
}

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
// THEME & CONFIG IMPORTS (extracted to adventure-map-themes.js)
// ================================================
import {
  SUPER_SKILL_THEMES, CATEGORY_THEMES, KID_FRIENDLY_COPY,
  CATEGORY_TO_SUPERSKILL, MAP_ZONE_PROGRESSION, DANIEL_EXPRESSIONS
} from './adventure-map-themes.js';
import { injectAdventureMapStyles } from './adventure-map-styles.js';
import { getSkillGate, getUnlockRequirement, isPractitionerSession } from './features/dashboard/superSkillGate.js';

// Super Skills data loaded from database (will be populated on init)
let superSkillsFromDB = [];
let cyclesFromDB = [];

// NOTE: SUPER_SKILL_THEMES, CATEGORY_THEMES, KID_FRIENDLY_COPY,
// CATEGORY_TO_SUPERSKILL, MAP_ZONE_PROGRESSION, DANIEL_EXPRESSIONS
// are now imported from ./adventure-map-themes.js


// ================================================
// ADVENTURE MAP V4 CLASS
// ================================================

export class AdventureMapV4 {
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
      nodeSpacingY: this.isMobile ? 85 : 130,
      pathAmplitude: this.isMobile ? 50 : 110,
      zigzagFrequency: this.isMobile ? 0.8 : 1.0,
      topPadding: this.isMobile ? 200 : 80,
      bottomPadding: this.isMobile ? 80 : 120,
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
          .select('*, characters:character_id(id, name, species, image_url)')
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
            window.superSkills = superSkillsResult.data;
            // Preload character images so they appear instantly
            superSkillsResult.data.forEach(function(skill) {
              var imgUrl = (skill.characters && skill.characters.image_url) || skill.character_image_url;
              if (imgUrl) {
                var img = new Image();
                img.src = imgUrl;
              }
            });
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

  injectStyles() { injectAdventureMapStyles(); }

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

    // Inject road builder stops at zone boundaries (after modules 3, 6, 9).
    // When mini_games_enabled is ON, road builder delegates to the new
    // mini-game framework internally; the stops, celebration, and rewards
    // are shared either way.
    this.modules = injectRoadBuilderStops(this.modules);

    console.log('[AdventureMap] render() - allModules:', this.allModules.length, 'filtered:', this.modules.length, 'category:', this.currentCategory, 'window.modules:', (window.modules || []).length, 'window.childModules:', (window.childModules || []).length);

    // If filter produced no results but modules exist, and this isn't a deliberate user cycle selection,
    // fall back to first available category
    if (this.modules.length === 0 && this.allModules.length > 0 && !this._userSelectedEmptyCycle) {
      console.log('[AdventureMap] Category "' + this.currentCategory + '" has no modules - falling back');
      var fallbackCategories = this.getAvailableCategories();
      if (fallbackCategories.length > 0) {
        this.currentCategory = fallbackCategories[0];
        this.currentCycleId = null;
        this.filterModulesByCategory();
        console.log('[AdventureMap] Fell back to category:', this.currentCategory, 'modules:', this.modules.length);
      }
    }
    this._userSelectedEmptyCycle = false;

    // Always show the skill picker first so the user chooses each session.
    // Once they click a card, _skillSelectedThisSession is set and the map renders.
    if (!this._skillSelectedThisSession && this.getAvailableCategories().length > 1) {
      this.renderSkillPickerInline();
      showDashboardFooter();
      if (typeof window._dashboardRenderComplete === 'function') {
        window._dashboardRenderComplete();
        window._dashboardRenderComplete = null;
      }
      return;
    }

    // ── Skill Journey view ("inside the district") ──
    // The new scene renderer owns the whole Adventures view: one
    // continuous road from the district depot to Brain City, buildings
    // that grow as modules complete, and the skill's guide character at
    // the next stop. The classic vertical map stays available behind
    // window.DD_CLASSIC_JOURNEY for rollback.
    if (!window.DD_CLASSIC_JOURNEY && this.modules.length > 0) {
      renderSkillJourneyView(this);
      showDashboardFooter();
      if (typeof window._dashboardRenderComplete === 'function') {
        window._dashboardRenderComplete();
        window._dashboardRenderComplete = null;
      }
      return;
    }

    // Run DOM updates directly - callers already handle framing
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
        showDashboardFooter();
        if (typeof window._dashboardRenderComplete === 'function') {
          window._dashboardRenderComplete();
          window._dashboardRenderComplete = null;
        }
      }).catch(function(err) {
        console.log('Roadblock rendering error:', err);
        setTimeout(function() { self.centerOnCurrentModule(); }, 100);
        showDashboardFooter();
        if (typeof window._dashboardRenderComplete === 'function') {
          window._dashboardRenderComplete();
          window._dashboardRenderComplete = null;
        }
      });
    } else {
      // No modules to render - still signal completion
      showDashboardFooter();
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

    // When mini-games are enabled, the Road Builder stops handle everything.
    // Skip the old random roadblock spawning entirely.
    if (miniGamesActive()) return;

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
        // Practitioner accounts tour the whole program: nothing is credit-locked.
        var isLocked = isPractitionerSession() ? false : (childModule ? childModule.locked !== false : true);
        var status = completed ? 'completed' : (isLocked ? 'locked' : 'available');
        var seriesName = (m.series && m.series.label) || m.series_name || m.series || '';
        
        // Get super skill slug - prioritize super_skill_id, then category field
        var superSkillSlug = 'all';
        if (m.super_skill_id) {
          // Look up super skill slug from loaded data
          var superSkill = superSkillsFromDB.find(function(s) { return s.id === m.super_skill_id; });
          if (superSkill && superSkill.slug) {
            superSkillSlug = superSkill.slug;
          }
        }
        // Fallback: use the category field (may already be a slug, or an old category name)
        if (superSkillSlug === 'all') {
          var rawCategory = ((m.category && m.category.name) || (m.category && typeof m.category === 'string' ? m.category : '') || m.category_name || '').toLowerCase();
          if (rawCategory) {
            if (SUPER_SKILL_THEMES[rawCategory]) {
              // Category is already a valid super skill slug
              superSkillSlug = rawCategory;
            } else if (CATEGORY_TO_SUPERSKILL[rawCategory]) {
              // Map old category name to super skill slug
              superSkillSlug = CATEGORY_TO_SUPERSKILL[rawCategory];
            }
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

    // Sequential unlock clamp: whatever path set the category (picker, quiz,
    // focus plan, stored value), a locked Super Skill is never shown — the
    // child is redirected to the skill they're meant to be working on.
    var gate = getSkillGate();
    if (gate && this.currentCategory && this.currentCategory !== 'all') {
      var gateState = gate.bySlug[this.currentCategory];
      if (gateState && gateState.state === 'locked' && gate.activeSlug) {
        this.currentCategory = gate.activeSlug;
        this.setStoredCategory(gate.activeSlug);
        this.currentCycleId = null;
      }
    }

    var availableCycles = this.getAvailableCyclesForCategory();
    if (availableCycles.length === 0) {
      // No cycles for this category - clear any stale cycle from a previous category
      this.currentCycleId = null;
    } else if (!this.currentCycleId || !availableCycles.find(function(cycle) { return String(cycle.id) === String(self.currentCycleId); })) {
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

    // Safety net: if cycle filter eliminated ALL modules during automatic sync (not manual user selection),
    // fall back to the cycle that has the most modules
    if (this.modules.length === 0 && this.currentCycleId && !this._manualCycleSelect) {
      var categoryModules = this.allModules.filter(function(m) {
        return (m.superSkillSlug === self.currentCategory) || (m.category === self.currentCategory);
      });
      if (categoryModules.length > 0) {
        var cycleCounts = {};
        categoryModules.forEach(function(m) {
          if (m.cycleId) {
            cycleCounts[m.cycleId] = (cycleCounts[m.cycleId] || 0) + 1;
          }
        });
        var bestCycleId = null;
        var bestCount = 0;
        Object.keys(cycleCounts).forEach(function(cid) {
          if (cycleCounts[cid] > bestCount) {
            bestCount = cycleCounts[cid];
            bestCycleId = cid;
          }
        });
        if (bestCycleId) {
          this.currentCycleId = bestCycleId;
        } else {
          this.currentCycleId = null;
        }
        this.modules = this.allModules.filter(function(m) {
          var categoryMatch = (m.superSkillSlug === self.currentCategory) || (m.category === self.currentCategory);
          if (!categoryMatch) return false;
          if (!self.currentCycleId) return true;
          return String(m.cycleId) === String(self.currentCycleId);
        });
      }
    }
    // Reset manual flag after filtering
    this._manualCycleSelect = false;

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
    var popupGate = getSkillGate();
    var allSkillCycleOptions = this.getAvailableCategories().map(function(category) {
      return {
        category: category,
        theme: CATEGORY_THEMES[category] || CATEGORY_THEMES.all,
        cycles: self.getAvailableCyclesForCategory(category)
      };
    }).filter(function(option) {
      if (!option.cycles || option.cycles.length === 0) return false;
      // Locked Super Skills can't be jumped to from the cycle popup
      if (popupGate && popupGate.bySlug[option.category] && popupGate.bySlug[option.category].state === 'locked') return false;
      return true;
    });
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

  // =============================================
  // SKILL PICKER - Card-based Super Skill selection (inline, replaces map)
  // =============================================
  renderSkillPickerInline() {
    var container = document.getElementById('adventureMapContainer');
    if (!container) return;

    this.ensureZoneStyles();
    var self = this;

    // Show ALL active super skills from DB, not just ones with modules
    var allSlugs = [];
    if (superSkillsFromDB && superSkillsFromDB.length > 0) {
      allSlugs = superSkillsFromDB.map(function(s) { return s.slug; }).filter(Boolean);
    }
    // Fallback to module-based categories if DB isn't loaded yet
    if (allSlugs.length === 0) {
      allSlugs = this.getAvailableCategories();
    }

    var pickerGate = getSkillGate();

    // Build skill card data with progress
    var skillCards = allSlugs.map(function(cat) {
      var theme = CATEGORY_THEMES[cat] || CATEGORY_THEMES.all;
      var dbSkill = superSkillsFromDB.find(function(s) { return s.slug === cat; });
      var gateState = pickerGate && pickerGate.bySlug[cat] ? pickerGate.bySlug[cat].state : null;
      var unlockReq = gateState === 'locked' ? getUnlockRequirement(cat, pickerGate) : null;
      var totalModules = self.allModules.filter(function(m) { return !m.isRoadBuilder && (m.superSkillSlug === cat || m.category === cat); }).length;
      var completedModules = self.allModules.filter(function(m) { return !m.isRoadBuilder && (m.superSkillSlug === cat || m.category === cat) && self.isModuleComplete(m); }).length;
      var description = (dbSkill && dbSkill.description) || theme.description || '';
      var characterImg = dbSkill ? ((dbSkill.characters && dbSkill.characters.image_url) || dbSkill.character_image_url) : null;
      var characterName = dbSkill ? ((dbSkill.characters && dbSkill.characters.name) || dbSkill.character_name) : null;

      var kidCopy = KID_FRIENDLY_COPY[cat] || {};
      var kidDescription = kidCopy.description || description;
      var pickThisIf = kidCopy.pickThisIf || '';
      var tag = kidCopy.tag || (dbSkill && dbSkill.domain) || '';
      var youllLearn = kidCopy.youllLearn || [];

      return {
        slug: cat,
        name: theme.name,
        emoji: theme.emoji,
        color: theme.color,
        description: kidDescription,
        pickThisIf: pickThisIf,
        tag: tag,
        youllLearn: youllLearn,
        characterImg: characterImg,
        characterName: characterName,
        totalModules: totalModules,
        completedModules: completedModules,
        bgColor: kidCopy.bgColor || '#fff',
        borderColor: kidCopy.borderColor || '#e2e8f0',
        btnColor: kidCopy.btnColor || '#405878',
        decos: kidCopy.decos || [],
        speechNew: kidCopy.speechNew || '',
        speechCurrent: kidCopy.speechCurrent || '',
        locked: gateState === 'locked',
        unlockName: unlockReq ? unlockReq.name : null
      };
    });

    var lastChosen = this.getStoredCategory() || this.currentCategory;

    // Sort: last-chosen skill first, locked skills last (journey order kept)
    skillCards.sort(function(a, b) {
      if (lastChosen && lastChosen !== 'all') {
        if (a.slug === lastChosen && !a.locked) return -1;
        if (b.slug === lastChosen && !b.locked) return 1;
      }
      if (a.locked !== b.locked) return a.locked ? 1 : -1;
      return 0;
    });

    var cardsHtml = skillCards.map(function(card) {
      var progressPct = card.totalModules > 0 ? Math.round((card.completedModules / card.totalModules) * 100) : 0;
      var isLastChosen = card.slug === lastChosen && lastChosen !== 'all' && !card.locked;
      var cardClasses = 'skill-card' + (isLastChosen ? ' last-chosen' : '') + (card.locked ? ' skill-card-locked' : '');
      var decosHtml = card.decos.map(function(d) { return '<span class="skill-card-deco">' + d + '</span>'; }).join('');
      var speechText = card.locked
        ? (card.unlockName ? 'Complete ' + card.unlockName + ' to unlock me!' : 'You\'ll unlock me later on your journey!')
        : (isLastChosen ? card.speechCurrent : (card.completedModules === 0 ? card.speechNew : ''));
      var btnLabel = card.locked
        ? (card.unlockName ? '🔒 Complete ' + card.unlockName + ' first' : '🔒 Unlocks later')
        : (isLastChosen ? 'Continue quest' : (card.completedModules > 0 ? 'Keep exploring' : 'Start adventure'));
      var progressLabel = card.locked
        ? (card.unlockName ? 'Unlocks after ' + card.unlockName : 'Next on your journey')
        : (card.completedModules > 0
          ? '⭐ ' + card.completedModules + '/' + card.totalModules + ' steps completed'
          : card.totalModules + ' steps to explore');
      var btnStyle = card.locked
        ? 'background: linear-gradient(135deg, #9AA5B1, #5B6773)'
        : 'background: linear-gradient(135deg, ' + card.btnColor + ', ' + card.btnColor + 'dd)';

      return '<div class="' + cardClasses + '" data-skill="' + card.slug + '" style="--card-bg: ' + card.bgColor + '; --card-border: ' + card.borderColor + '">' +
        '<div class="skill-card-decos">' + decosHtml + '</div>' +
        (isLastChosen ? '<span class="skill-card-continue-badge">⭐ Your current quest</span>' : '') +
        (card.locked ? '<span class="skill-card-locked-badge">🔒 ' + (card.unlockName ? 'Complete ' + card.unlockName + ' first' : 'Unlocks later') + '</span>' : '') +
        (card.characterImg ? '<img class="skill-card-character" src="' + card.characterImg + '" alt="' + (card.characterName || '') + '" />' : '') +
        (speechText ? '<div class="skill-card-speech">' + speechText + '</div>' : '') +
        '<div class="skill-card-top">' +
        '<div class="skill-card-emoji">' + card.emoji + '</div>' +
        '<div class="skill-card-name">' + card.name + '</div>' +
        '</div>' +
        '<div class="skill-card-desc">' + card.description + '</div>' +
        (card.pickThisIf && !card.locked ? '<div class="skill-card-pick-label">Pick this if:</div><div class="skill-card-pick-text">' + card.pickThisIf + '</div>' : '') +
        (card.tag ? '<div class="skill-card-tags"><span class="skill-card-tag">' + card.tag + '</span></div>' : '') +
        '<div class="skill-card-progress">' +
        '<div class="skill-card-progress-bar"><div class="skill-card-progress-fill" style="width: ' + progressPct + '%; background: ' + card.btnColor + ';"></div></div>' +
        '<span class="skill-card-progress-text">' + progressLabel + '</span>' +
        '</div>' +
        '<button class="skill-card-btn" style="' + btnStyle + '">' + btnLabel + '</button>' +
        '</div>';
    }).join('');

    container.innerHTML =
      '<div class="skill-picker-inline">' +
      '<div class="skill-picker-header">' +
      '<h2 class="skill-picker-title">🗺️ Choose Your Adventure</h2>' +
      '<p class="skill-picker-subtitle">Each Super Skill is a different adventure world. Pick the one that feels right for you!</p>' +
      '<div class="skill-picker-help-wrap">' +
      '<button class="skill-picker-help-btn" id="helpMeChooseBtn">✨ Help me choose</button>' +
      '<p class="skill-picker-help-hint">Not sure where to start? Answer a few quick questions.</p>' +
      '</div>' +
      '</div>' +
      '<div class="skill-picker-cards' + (lastChosen && lastChosen !== 'all' ? ' has-chosen' : '') + '">' + cardsHtml + '</div>' +
      '</div>';

    // Event: clicking a card opens the preview modal
    container.querySelectorAll('.skill-card').forEach(function(cardEl) {
      var slug = cardEl.dataset.skill;
      var cardData = skillCards.find(function(c) { return c.slug === slug; });
      // Playable skills go straight in — the card already says everything the
      // old confirmation modal repeated. Locked skills keep the preview modal
      // because it explains what unlocks them.
      var openCard = function() {
        if (!cardData) return;
        if (cardData.locked) { self.showSkillPreviewModal(cardData); return }
        self.currentCategory = cardData.slug;
        self.setStoredCategory(cardData.slug);
        self._skillSelectedThisSession = true;
        self.currentCycleId = null;
        self.translateX = 0;
        self.translateY = 0;
        self.hasUserInteracted = false;
        self.render();
      };
      cardEl.addEventListener('click', function(e) {
        if (e.target.classList.contains('skill-card-btn')) return;
        openCard();
      });
      var btn = cardEl.querySelector('.skill-card-btn');
      if (btn) btn.addEventListener('click', openCard);
    });

    // Event: Help me choose quiz
    var helpBtn = container.querySelector('#helpMeChooseBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', function() {
        self.showHelpMeChooseQuiz();
      });
    }
  }

  // =============================================
  // SKILL PREVIEW MODAL - shown before entering a skill
  // =============================================
  showSkillPreviewModal(cardData) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.className = 'skill-preview-overlay';

    var kidCopy = KID_FRIENDLY_COPY[cardData.slug] || {};
    var btnColor = kidCopy.btnColor || '#405878';
    var bgColor = kidCopy.bgColor || '#f8fafc';

    var learnHtml = cardData.youllLearn.map(function(item) {
      return '<li>' + item + '</li>';
    }).join('');

    var isLocked = !!cardData.locked;
    var btnLabel = isLocked
      ? (cardData.unlockName ? '🔒 Complete ' + cardData.unlockName + ' first' : '🔒 Unlocks later')
      : (cardData.completedModules > 0 ? 'Continue quest' : 'Start adventure');
    var lockedNote = isLocked
      ? '<div class="skill-preview-desc" style="font-weight:600;color:#5B6773">🔒 ' +
        (cardData.unlockName
          ? 'This adventure unlocks when you complete the <strong>' + cardData.unlockName + '</strong> Super Skill.'
          : 'This adventure unlocks later on your journey.') + '</div>'
      : '';

    overlay.innerHTML =
      '<div class="skill-preview-modal">' +
      '<div class="skill-preview-header" style="background: ' + bgColor + '">' +
      '<div class="skill-preview-top">' +
      '<div class="skill-preview-emoji">' + cardData.emoji + '</div>' +
      (cardData.characterImg ? '<img class="skill-preview-character" src="' + cardData.characterImg + '" alt="' + (cardData.characterName || '') + '" ' + (isLocked ? 'style="filter:grayscale(.7);opacity:.85"' : '') + '/>' : '') +
      '</div>' +
      '<div class="skill-preview-name">' + cardData.name + '</div>' +
      '</div>' +
      '<div class="skill-preview-body">' +
      lockedNote +
      '<div class="skill-preview-desc">' + cardData.description + '</div>' +
      (learnHtml ? '<div class="skill-preview-learn-label">You\'ll learn how to:</div>' +
      '<ul class="skill-preview-learn-list">' + learnHtml + '</ul>' : '') +
      '<div class="skill-preview-actions">' +
      '<button class="skill-preview-btn primary" id="previewStartBtn" ' + (isLocked ? 'disabled ' : '') + 'style="background: linear-gradient(135deg, ' + (isLocked ? '#9AA5B1, #5B6773' : btnColor + ', ' + btnColor + 'dd') + ')' + (isLocked ? ';opacity:.75;cursor:not-allowed' : '') + '">' + btnLabel + '</button>' +
      '<button class="skill-preview-btn secondary" id="previewBackBtn">Choose another skill</button>' +
      '</div>' +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#previewStartBtn').addEventListener('click', function() {
      if (isLocked) return;
      self.currentCategory = cardData.slug;
      self.setStoredCategory(cardData.slug);
      self._skillSelectedThisSession = true;
      self.currentCycleId = null;
      self.translateX = 0;
      self.translateY = 0;
      self.hasUserInteracted = false;
      overlay.remove();
      self.render();
    });

    overlay.querySelector('#previewBackBtn').addEventListener('click', function() {
      overlay.remove();
    });
  }

  // =============================================
  // HELP ME CHOOSE - Kid-friendly quiz
  // =============================================
  showHelpMeChooseQuiz() {
    var self = this;
    var currentQuestion = 0;
    var answers = [];

    var overlay = document.createElement('div');
    overlay.className = 'quiz-overlay';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });

    var container = overlay;

    var questions = [
      {
        question: 'How are you feeling today?',
        options: [
          { emoji: '\uD83D\uDE21', label: 'Angry or frustrated', skills: ['emotion-navigator', 'calm-controller'] },
          { emoji: '\uD83D\uDE1F', label: 'Worried or nervous', skills: ['calm-controller', 'thought-driver'] },
          { emoji: '\uD83D\uDE22', label: 'Sad or down', skills: ['emotion-navigator', 'resilience-ranger'] },
          { emoji: '\uD83D\uDE10', label: 'Not sure', skills: ['brain-builder', 'emotion-navigator'] },
          { emoji: '\uD83D\uDE04', label: 'Good!', skills: ['connection-captain', 'brain-builder'] }
        ]
      },
      {
        question: 'What do you want help with?',
        options: [
          { emoji: '\uD83E\uDDE0', label: 'Understanding my feelings', skills: ['emotion-navigator', 'brain-builder'] },
          { emoji: '\uD83D\uDC42', label: 'Staying calm', skills: ['calm-controller', 'body-boss'] },
          { emoji: '\uD83D\uDDE3\uFE0F', label: 'Talking to people', skills: ['connection-captain'] },
          { emoji: '\uD83D\uDCAA', label: 'Being brave', skills: ['resilience-ranger', 'thought-driver'] },
          { emoji: '\uD83C\uDF08', label: 'Making friends', skills: ['connection-captain'] }
        ]
      },
      {
        question: 'When things get tough, what do you usually do?',
        options: [
          { emoji: '\uD83C\uDFC3', label: 'I want to run away', skills: ['calm-controller', 'resilience-ranger'] },
          { emoji: '\uD83D\uDE24', label: 'I get really upset', skills: ['emotion-navigator', 'body-boss'] },
          { emoji: '\uD83E\uDD14', label: 'I think too much about it', skills: ['thought-driver', 'brain-builder'] },
          { emoji: '\uD83E\uDD10', label: 'I go quiet', skills: ['connection-captain', 'emotion-navigator'] },
          { emoji: '\uD83E\uDD37', label: 'I\'m not sure', skills: ['brain-builder'] }
        ]
      }
    ];

    function renderQuestion(qIndex) {
      var q = questions[qIndex];
      var dotsHtml = questions.map(function(_, i) {
        var cls = 'quiz-dot';
        if (i < qIndex) cls += ' done';
        if (i === qIndex) cls += ' active';
        return '<span class="' + cls + '"></span>';
      }).join('');

      var optionsHtml = q.options.map(function(opt, i) {
        return '<div class="quiz-option" data-index="' + i + '">' +
          '<span class="quiz-option-emoji">' + opt.emoji + '</span>' +
          '<span>' + opt.label + '</span>' +
          '</div>';
      }).join('');

      container.innerHTML =
        '<div class="quiz-container">' +
        '<div class="quiz-header">' +
        '<h2 class="quiz-title">&#10024; Help Me Choose</h2>' +
        '<p class="quiz-subtitle">Answer a few quick questions and we\'ll find the best adventure for you!</p>' +
        '<div class="quiz-progress-dots">' + dotsHtml + '</div>' +
        '</div>' +
        '<div class="quiz-body">' +
        '<div class="quiz-question">' + q.question + '</div>' +
        '<div class="quiz-options">' + optionsHtml + '</div>' +
        '<button class="quiz-next-btn" id="quizNextBtn" disabled>Next</button>' +
        '</div>' +
        '</div>';

      var selectedIndex = null;
      container.querySelectorAll('.quiz-option').forEach(function(opt) {
        opt.addEventListener('click', function() {
          selectedIndex = parseInt(opt.dataset.index);
          container.querySelectorAll('.quiz-option').forEach(function(o) { o.classList.remove('selected'); });
          opt.classList.add('selected');
          container.querySelector('#quizNextBtn').disabled = false;
        });
      });

      container.querySelector('#quizNextBtn').addEventListener('click', function() {
        if (selectedIndex === null) return;
        answers.push(q.options[selectedIndex].skills);
        currentQuestion++;
        if (currentQuestion < questions.length) {
          renderQuestion(currentQuestion);
        } else {
          showResult();
        }
      });
    }

    function showResult() {
      // Tally up skill scores
      var scores = {};
      answers.forEach(function(skillList) {
        skillList.forEach(function(skill, i) {
          // First skill in list gets more weight
          scores[skill] = (scores[skill] || 0) + (skillList.length - i);
        });
      });

      // Find the best match among available (unlocked) categories
      var quizGate = getSkillGate();
      var availableCategories = self.getAvailableCategories().filter(function(cat) {
        return !(quizGate && quizGate.bySlug[cat] && quizGate.bySlug[cat].state === 'locked');
      });
      var bestSkill = null;
      var bestScore = -1;
      availableCategories.forEach(function(cat) {
        var score = scores[cat] || 0;
        if (score > bestScore) {
          bestScore = score;
          bestSkill = cat;
        }
      });

      // Fallback if no match
      if (!bestSkill && availableCategories.length > 0) {
        bestSkill = availableCategories[0];
      }

      var theme = CATEGORY_THEMES[bestSkill] || CATEGORY_THEMES.all;
      var dbSkill = superSkillsFromDB.find(function(s) { return s.slug === bestSkill; });
      var description = (dbSkill && dbSkill.description) || theme.description || '';

      container.innerHTML =
        '<div class="quiz-container">' +
        '<div class="quiz-header">' +
        '<h2 class="quiz-title">&#10024; We found your adventure!</h2>' +
        '<p class="quiz-subtitle">Based on your answers, we think you should start with...</p>' +
        '</div>' +
        '<div class="quiz-result">' +
        '<div class="quiz-result-label">We recommend</div>' +
        '<div class="quiz-result-skill" style="color: ' + theme.color + '">' + theme.emoji + ' ' + theme.name + '</div>' +
        '<div class="quiz-result-desc">' + description + '</div>' +
        '<div class="quiz-result-actions">' +
        '<button class="quiz-result-btn primary" id="quizStartBtn">Start here</button>' +
        '<button class="quiz-result-btn secondary" id="quizOtherBtn">Show me other options</button>' +
        '</div>' +
        '</div>' +
        '</div>';

      container.querySelector('#quizStartBtn').addEventListener('click', function() {
        self.currentCategory = bestSkill;
        self.setStoredCategory(bestSkill);
        self._skillSelectedThisSession = true;
        self.currentCycleId = null;
        self.translateX = 0;
        self.translateY = 0;
        self.hasUserInteracted = false;
        overlay.remove();
        self.render();
      });

      container.querySelector('#quizOtherBtn').addEventListener('click', function() {
        overlay.remove();
      });
    }

    renderQuestion(0);
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
    var numModules = this.modules.filter(function(m) { return !m.isRoadBuilder; }).length;
    var completedCount = this.modules.filter(function(m) { return !m.isRoadBuilder && m.status === 'completed'; }).length;
    var canvasHeight = Math.max(this.config.minCanvasHeight, this.config.topPadding + (numModules * this.config.nodeSpacingY) + this.config.bottomPadding);

    var self = this;

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
      ? 'Your journey begins here - pick your first module to start exploring!'
      : remainingCount > 0
        ? completedCount + ' of ' + numModules + ' modules completed - ' + remainingCount + ' more to go!'
        : 'All ' + numModules + ' modules completed - amazing work! 🎉';
    var stages = this.getTownStageMeta();
    var stageIndex = this.getTownStage();
    var stage = stages[stageIndex] || stages[0];

    var html = '<div class="adventure-header">' +
      '<div class="adventure-header-top">' +
      '<div class="current-skill-badge" id="openSkillPicker" title="Choose a different Super Skill">' +
      '<span class="current-skill-badge-emoji">' + theme.emoji + '</span>' +
      '<span class="current-skill-badge-name">' + theme.name + '</span>' +
      '<span class="current-skill-badge-change">Change</span>' +
      '</div>' +
      (availableCycles.length > 0 ? '<select class="category-filter-select cycle-select-compact" id="cycleFilter">' + cycleOptions + '</select>' : '') +
      '<span class="category-badge" style="background: ' + theme.color + '">' + completedCount + '/' + numModules + '</span>' +
      '</div>' +
      '</div>';

    // Compact progression tracker
    var nextStage = stages[Math.min(stageIndex + 1, stages.length - 1)];
    var nextMilestone = stage.milestone;
    var modulesLeft = nextMilestone ? Math.max(0, nextMilestone - completedCount) : 0;
    var rbForNote = this.modules.filter(function(m) { return m.isRoadBuilder; });
    var rbNeededForNote = stageIndex + 1;
    var rbDoneForNote = rbForNote.slice(0, rbNeededForNote).every(function(rb) { return rb && rb.status === 'completed'; });
    var progressNote;
    if (!nextMilestone) {
      progressNote = 'All stages unlocked!';
    } else if (modulesLeft <= 0 && !rbDoneForNote) {
      progressNote = 'Complete the Road Builder to unlock ' + nextStage.emoji + ' ' + nextStage.label;
    } else {
      progressNote = modulesLeft + ' more module' + (modulesLeft === 1 ? '' : 's') + ' to unlock ' + nextStage.emoji + ' ' + nextStage.label;
    }

    var timelineHtml = stages.map(function(s, idx) {
      var cls = 'progression-step';
      if (idx < stageIndex) cls += ' done';
      if (idx === stageIndex) cls += ' active';
      return '<div class="' + cls + '">' +
        '<div class="progression-step-icon">' + s.emoji + '</div>' +
        '<div class="progression-step-label">' + s.label + '</div>' +
        '<div class="progression-step-range">' + s.rangeLabel + ' modules</div>' +
        '</div>';
    }).join('');

    html += '<div class="progression-tracker">' +
      '<div class="progression-steps">' + timelineHtml + '</div>' +
      '<div class="progression-note">' + progressNote + '</div>' +
      '</div>';

    if (this.modules.length > 0) {
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
        '<button class="map-btn" id="btnRefreshMap" title="Refresh map">🔄</button>' +
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
    // Keep the canvas on its own GPU layer so dragging is a composite,
    // not a repaint — critical on mobile.
    if (this.canvas) this.canvas.style.willChange = 'transform';
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
    var townStage = this.getTownStage(); // 0=Trailhead, 1=Village, 2=Town Centre, 3=City
    var newZone = townStage + 1; // zones are 1-4

    var previousZone = this.currentZone;
    this.viewport.dataset.zone = newZone;
    this.currentZone = newZone;

    // SVG district scenes (feature-flagged): the background is this Super
    // Skill's own Brain Town district. It grows twice over — every completed
    // module adds a prop to the scene, and each town stage transforms it.
    // When the flag is off, clearing the inline styles falls back to the
    // classic image map CSS.
    if (svgScenesActive()) {
      var completedForScene = this.modules.filter(function(m) { return !m.isRoadBuilder && m.status === 'completed'; }).length;
      // The scene lives INSIDE the canvas so the landscape pans 1:1 with
      // the road. The viewport's own background is disabled meanwhile.
      this.viewport.style.backgroundImage = 'none';
      this.viewport.style.backgroundSize = '';
      this.viewport.style.backgroundPosition = '';
      this.renderSceneLayer(townStage, completedForScene);
    } else {
      this.viewport.style.backgroundImage = '';
      this.viewport.style.backgroundSize = '';
      this.viewport.style.backgroundPosition = '';
      this.removeSceneLayer();
    }

    // Detect zone upgrade: only when moving to a higher zone (not zone 1)
    var child = window.selectedChild || (window.state && window.state.selectedChild) || dashboardSelectedChild;
    if (previousZone !== null && newZone > previousZone && newZone > 1) {
      var self = this;
      setTimeout(function() {
        self.showZoneUpgradeBanner(newZone, self.modules.filter(function(m) { return !m.isRoadBuilder && m.status === 'completed'; }).length);
      }, 400);
    } else if (previousZone === null && newZone > 1) {
      var childId = child ? child.id : 'unknown';
      var storageKey = 'zone-celebrated-' + childId + '-' + newZone;

      if (localStorage.getItem(storageKey) !== 'true') {
        var self = this;
        setTimeout(function() {
          self.showZoneUpgradeBanner(newZone, self.modules.filter(function(m) { return !m.isRoadBuilder && m.status === 'completed'; }).length);
        }, 800);
      }
    }
  }

  // Injects the district scene INSIDE the canvas (behind the road and
  // nodes, via negative z-index) so the whole landscape moves 1:1 with
  // the road when the child pans. The scene sits at the top of the road
  // at its natural 3:2 aspect — horizon and hill pass first — and a
  // seamless meadow filler continues beneath it for the rest of the road.
  renderSceneLayer(stage, completed) {
    if (!this.canvas) return;
    this.removeSceneLayer();

    // Bleed past the canvas edges so the ±50px sideways pan never
    // reveals the container behind the map.
    var BLEED = 60;
    var cw = this.canvas.offsetWidth || (this.viewport ? this.viewport.offsetWidth : 0) || 1200;
    var layerW = cw + BLEED * 2;
    var sceneH = Math.round(layerW / 1.5); // scenes are drawn at 3:2
    var ground = getZoneGround(this.currentCategory, stage);

    var layer = document.createElement('div');
    layer.className = 'zone-scene-layer';
    // translateZ(0) gives the scenery its own GPU texture so animated
    // road nodes never force these big backgrounds to re-rasterise.
    layer.style.cssText = 'position:absolute;top:0;left:' + (-BLEED) + 'px;right:' + (-BLEED) + 'px;bottom:' + (-BLEED) + 'px;z-index:-1;pointer-events:none;overflow:hidden;transform:translateZ(0);';

    // Built via style properties (not innerHTML) because the data-URI
    // background values contain quotes.
    var top = document.createElement('div');
    top.style.cssText = 'position:absolute;top:0;left:0;right:0;height:' + sceneH + 'px;background-size:100% 100%;background-repeat:no-repeat;';
    top.style.backgroundImage = getZoneSceneCss(this.currentCategory, stage, completed);

    // The district continues for the whole length of the road: a scenery
    // tile (same stage of buildings) repeats seamlessly beneath the scene.
    var fill = document.createElement('div');
    fill.style.cssText = 'position:absolute;top:' + sceneH + 'px;left:0;right:0;bottom:0;background-size:100% auto;background-repeat:repeat-y;';
    fill.style.backgroundColor = ground.color;
    fill.style.backgroundImage = getZoneFillerCss(this.currentCategory, stage);

    layer.appendChild(top);
    layer.appendChild(fill);
    this.canvas.insertBefore(layer, this.canvas.firstChild);
  }

  removeSceneLayer() {
    if (!this.canvas) return;
    var layer = this.canvas.querySelector('.zone-scene-layer');
    if (layer) layer.remove();
  }

  showZoneUpgradeBanner(zone, completedCount) {
    if (!this.viewport) return;

    // localStorage guard - only show once per child per zone
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
      'Your Adventure Begins at the Trailhead!',
      'Your Brain Town Grew Into a Village!',
      'Your Village Grew Into a Town Centre!',
      'Your Town Centre Grew Into a City!'
    ];
    var zoneSubtitles = [
      '',
      'Every module builds new pathways in your brain!',
      'Look! Houses and fences appeared - your brain pathways are growing stronger!',
      'Shops, lamps and a clock tower! Your brain connections are getting really powerful!',
      'Tall buildings and a whole skyline! Your brain is an incredible network of pathways!'
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
    var completed = this.modules.filter(function(m) { return !m.isRoadBuilder && m.status === 'completed'; }).length;
    var total = this.modules.filter(function(m) { return !m.isRoadBuilder; }).length;
    if (total === 0) return 0;
    var progress = completed / total;
    if (progress < 0.33) return 0;
    if (progress < 0.66) return 1;
    return 2;
  }

  getTownStage() {
    var completed = this.modules.filter(function(m) { return !m.isRoadBuilder && m.status === 'completed'; }).length;
    // Zone upgrades are gated behind road builder completion.
    // Even if 3 modules are done, stay in zone 0 until road builder 1 is completed.
    var roadBuilders = this.modules.filter(function(m) { return m.isRoadBuilder; });
    var rb1Done = roadBuilders.length > 0 && roadBuilders[0] && roadBuilders[0].status === 'completed';
    var rb2Done = roadBuilders.length > 1 && roadBuilders[1] && roadBuilders[1].status === 'completed';
    var rb3Done = roadBuilders.length > 2 && roadBuilders[2] && roadBuilders[2].status === 'completed';

    if (completed >= 9 && rb3Done) return 3;
    if (completed >= 6 && rb2Done) return 2;
    if (completed >= 3 && rb1Done) return 1;
    return 0;
  }

  getTownStageMeta() {
    return [
      { label: 'Trailhead', emoji: '🌱', minComplete: 0, maxComplete: 2, milestone: 3, rangeLabel: '1-3' },
      { label: 'Village', emoji: '🏡', minComplete: 3, maxComplete: 5, milestone: 6, rangeLabel: '4-6' },
      { label: 'Town Centre', emoji: '🏘️', minComplete: 6, maxComplete: 8, milestone: 9, rangeLabel: '7-9' },
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

    // Check if modules are sufficient but road builder is blocking progression
    var roadBuilders = this.modules.filter(function(m) { return m.isRoadBuilder; });
    var rbNeeded = stageIndex + 1; // road builder 1 needed for Village, 2 for Town Centre, etc.
    var rbDone = roadBuilders.slice(0, rbNeeded).every(function(rb) { return rb && rb.status === 'completed'; });
    var transitionCopy;
    if (!nextMilestone) {
      transitionCopy = 'You unlocked the final town stage. Keep reviewing modules to strengthen those pathways.';
    } else if (modulesLeft <= 0 && !rbDone) {
      transitionCopy = 'Complete the <span class="town-progress-cue-strong">Road Builder challenge</span> to unlock <span class="town-progress-cue-strong">' + nextStage.emoji + ' ' + nextStage.label + '</span>.';
    } else if (modulesLeft > 0) {
      transitionCopy = modulesLeft + ' more module' + (modulesLeft === 1 ? '' : 's') + ' to unlock ' + nextStage.emoji + ' ' + nextStage.label;
    } else {
      transitionCopy = 'Complete <span class="town-progress-cue-strong">the Road Builder</span> to unlock <span class="town-progress-cue-strong">' + nextStage.emoji + ' ' + nextStage.label + '</span>.';
    }

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
    // Road style is now tied to getTownStage so it only upgrades
    // after the road builder mini-game is completed for that zone.
    return this.getTownStage();
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
      // Village: paved road - grey asphalt with white lane lines
      { main: '#6B7280', light: '#9CA3AF', shadow: 'rgba(55, 65, 81, 0.35)',
        shadowW: 38, mainW: 32, lightW: 24, dashW: 3, dashArray: '12 16',
        dashColor: 'rgba(255,255,255,0.7)' },
      // Town Centre: highway - dark asphalt, wider, double lane markings
      { main: '#4B5563', light: '#6B7280', shadow: 'rgba(31, 41, 55, 0.4)',
        shadowW: 46, mainW: 40, lightW: 30, dashW: 3, dashArray: '18 12',
        dashColor: 'rgba(255,255,255,0.85)' },
      // City: motorway - dark smooth surface, widest, solid lane edges
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
    var totalCompleted = this.modules.filter(function(m) { return !m.isRoadBuilder && m.status === 'completed'; }).length;
    var stage = this.getSegmentRoadStage(totalCompleted);
    var road = roadPalettes[stage];

    var svgContent = '';

    // Shadow layer
    svgContent += '<path d="' + pathD + '" fill="none" stroke="' + road.shadow + '" stroke-width="' + road.shadowW + '" stroke-linecap="round" stroke-linejoin="round" />';
    // Main road surface
    svgContent += '<path d="' + pathD + '" fill="none" stroke="' + road.main + '" stroke-width="' + road.mainW + '" stroke-linecap="round" stroke-linejoin="round" />';
    // Lighter centre
    svgContent += '<path d="' + pathD + '" fill="none" stroke="' + road.light + '" stroke-width="' + road.lightW + '" stroke-linecap="round" stroke-linejoin="round" />';

    // Road markings - different per stage, with animated dashes
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
      { label: 'Trailhead', buildings: ['🌲', '🌳', '⛺'] },
      { label: 'Village', buildings: ['🏠', '🏡', '🏘️'] },
      { label: 'Town Centre', buildings: ['🏫', '🏬', '🏪', '🏠'] },
      { label: 'City', buildings: ['🏢', '🏦', '🏙️', '🏬'] }
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
      if (!this.modules[i].isRoadBuilder && this.modules[i].status === 'available') {
        currentIndex = i;
        break;
      }
    }

    var self = this;
    var moduleNumber = 0; // Track actual module numbers (excluding road builders)
    this.modules.forEach(function(module, index) {
      var pos = positions[index];
      if (!pos) return;

      // ── Road Builder Stop (roadblock-style node) ──
      if (module.isRoadBuilder) {
        var rbNode = document.createElement('div');
        rbNode.className = 'adventure-node road-builder ' + module.status;
        rbNode.setAttribute('data-module-id', module.id);
        rbNode.style.left = pos.x + 'px';
        rbNode.style.top = pos.y + 'px';

        var rbIcon = document.createElement('div');
        rbIcon.className = 'node-emoji';
        rbIcon.textContent = module.status === 'completed' ? '✅' : '🚧';
        rbNode.appendChild(rbIcon);

        if (module.status === 'completed') {
          // Green checkmark badge (matches roadblock completed style)
          var rbCheck = document.createElement('div');
          rbCheck.className = 'rb-checkmark';
          rbCheck.textContent = '✓';
          rbNode.appendChild(rbCheck);
        } else if (module.status === 'available') {
          // Daniel indicator for available road builder
          if (currentIndex === -1 || !self.modules.some(function(m, mi) { return mi < index && m.status === 'available' && !m.isRoadBuilder; })) {
            rbNode.classList.add('is-current');
            var character = document.createElement('div');
            character.className = 'current-indicator';
            var dogImage = document.createElement('img');
            dogImage.src = '/images/characters/DanielTheDog.webp';
            dogImage.alt = 'Daniel the dog';
            character.appendChild(dogImage);
            var indicatorLabel = document.createElement('div');
            indicatorLabel.className = 'current-indicator-label';
            indicatorLabel.textContent = 'Tap to play!';
            character.appendChild(indicatorLabel);
            rbNode.appendChild(character);
          }
        }

        var rbClickHandler = function(e) {
          e.stopPropagation();
          if (module.status === 'locked') return;
          if (module.status === 'completed') return;
          openRoadBuilderGame(module.zoneTransition, function() {
            // Re-render map after completing road builder
            self.render();
          });
        };

        rbNode.addEventListener('click', rbClickHandler);
        rbNode.addEventListener('touchend', function(e) {
          e.preventDefault();
          rbClickHandler(e);
        });

        rbNode.style.pointerEvents = 'auto';
        container.appendChild(rbNode);
        return; // Skip normal module rendering
      }

      // ── Normal Module Node ──
      moduleNumber++;
      var node = document.createElement('div');
      var nodeStatus = module.status;
      // Distinguish the current module from other available (unlocked) ones
      if (module.status === 'available' && index !== currentIndex) {
        nodeStatus = 'available available-next';
      }
      node.className = 'adventure-node ' + nodeStatus;
      var nodeModuleId = module.id || (module.module && module.module.id);
      if (nodeModuleId) node.setAttribute('data-module-id', nodeModuleId);
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
      num.textContent = moduleNumber.toString();
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
        statusLabel = (index === currentIndex) ? 'Next' : '';
      } else if (module.status === 'locked') {
        var lockBadge = document.createElement('div');
        lockBadge.className = 'node-lock';
        lockBadge.textContent = '🔒';
        node.appendChild(lockBadge);
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

      var moduleTitle = (module.module && (module.module.title || module.module.name)) || module.title || module.name || 'Module ' + moduleNumber;
      var statusText = '';
      var statusClass = '';
      if (module.status === 'completed') {
        statusText = '✓ Completed!';
        statusClass = 'done';
      } else if (module.status === 'available') {
        statusText = '▶ Ready to play!';
        statusClass = 'ready';
      } else {
        statusText = module.canUnlock ? '✨ Tap to open this adventure!' : '🔒 Complete earlier modules first';
        statusClass = 'locked-status';
      }
      tooltip.innerHTML = '<strong style="display:block;margin-bottom:4px;font-size:14px;">' + moduleTitle + '</strong><span class="' + statusClass + '">' + statusText + '</span>';
      node.appendChild(tooltip);

      node.addEventListener('click', function(e) {
        e.stopPropagation();
        if (module.status === 'locked') {
          // Child-facing path: unlock silently (credits are a grown-up
          // concept) and go straight into the adventure.
          if (module.canUnlock && typeof window.autoUnlockAndStart === 'function') {
            window.autoUnlockAndStart(module.module || module);
          } else if (module.canUnlock && typeof window.openPurchaseModal === 'function') {
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
        if (module.status === 'available' && !self.arePreviousModulesComplete(index)) {
          if (typeof window.showUnlockResultModal === 'function') {
            window.showUnlockResultModal({
              title: 'Not quite yet!',
              message: 'Complete the earlier modules first before starting this one.',
              type: 'error'
            });
          }
          return;
        }
        self.onNodeClick(module, this);
      });

      node.addEventListener('touchend', function(e) {
        e.preventDefault(); // Prevent subsequent click event from double-firing
        e.stopPropagation();
        if (module.status === 'locked') {
          // Child-facing path: unlock silently (credits are a grown-up
          // concept) and go straight into the adventure.
          if (module.canUnlock && typeof window.autoUnlockAndStart === 'function') {
            window.autoUnlockAndStart(module.module || module);
          } else if (module.canUnlock && typeof window.openPurchaseModal === 'function') {
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
        if (module.status === 'available' && !self.arePreviousModulesComplete(index)) {
          if (typeof window.showUnlockResultModal === 'function') {
            window.showUnlockResultModal({
              title: 'Not quite yet!',
              message: 'Complete the earlier modules first before starting this one.',
              type: 'error'
            });
          }
          return;
        }
        self.onNodeClick(module, this);
      });

      node.style.pointerEvents = 'auto';
      container.appendChild(node);
    });
  }

  arePreviousModulesComplete(moduleIndex) {
    for (var i = 0; i < moduleIndex; i++) {
      var m = this.modules[i];
      if (!m.isRoadBuilder && m.status !== 'completed') return false;
    }
    return true;
  }

  onNodeClick(module, nodeEl) {
    // Prevent double-fire from click + touchend both triggering
    if (this._processingNodeClick) return;
    this._processingNodeClick = true;

    // Show immediate loading pulse on the clicked node
    if (nodeEl) {
      nodeEl.classList.add('node-loading');
    }

    // Clear guard and loading after popup has had time to appear (or on timeout)
    var self = this;
    var clearLoading = function() {
      self._processingNodeClick = false;
      if (nodeEl) nodeEl.classList.remove('node-loading');
    };
    // Safety timeout - clear loading state after 5 seconds max
    setTimeout(clearLoading, 5000);
    // Expose clearLoading so Daniel system can call it when popup appears
    window._clearNodeLoading = clearLoading;

    if (window.enhancedDashboard && typeof window.enhancedDashboard.showModulePreview === 'function') {
      Promise.resolve(window.enhancedDashboard.showModulePreview(module)).then(clearLoading).catch(clearLoading);
    } else {
      var child = window.selectedChild || (window.state && window.state.selectedChild) || dashboardSelectedChild;
      if (child && module.module) {
        var url = '/module.html?childId=' + child.id + '&moduleId=' + module.module.id + '&code=' + (module.code || module.module.code);
        if (window.state && window.state.isCurrentUserAdmin) url += '&isAdmin=true';
        window.location.href = url;
      }
      clearLoading();
    }
  }

  updateProgress() {
    var completed = this.modules.filter(function(m) { return !m.isRoadBuilder && m.status === 'completed'; }).length;
    var total = this.modules.filter(function(m) { return !m.isRoadBuilder; }).length;
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
    
    // Skill picker badge click - go back to skill picker
    var openSkillPicker = document.getElementById('openSkillPicker');
    if (openSkillPicker) {
      this._openSkillPickerHandler = function() {
        self._skillSelectedThisSession = false;
        self.render();
      };
      openSkillPicker.addEventListener('click', this._openSkillPickerHandler);
    }

    var cycleFilter = document.getElementById('cycleFilter');
    if (cycleFilter) {
      this._cycleChangeHandler = function(e) {
        self.currentCycleId = e.target.value || null;
        self._manualCycleSelect = true;
        self._userSelectedEmptyCycle = true;
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
    var btnRefreshMap = document.getElementById('btnRefreshMap');
    if (btnCenter) btnCenter.addEventListener('click', function() { self.centerOnCurrentModule(); });
    if (btnTop) btnTop.addEventListener('click', function() { self.scrollToTop(); });
    if (btnRefreshMap) btnRefreshMap.addEventListener('click', function() { self.refreshMap(); });

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

    // Remove skill picker badge listener
    var openSkillPicker = document.getElementById('openSkillPicker');
    if (openSkillPicker && this._openSkillPickerHandler) {
      openSkillPicker.removeEventListener('click', this._openSkillPickerHandler);
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
    // No transition while the finger is down — a lingering transform
    // transition makes every drag frame animate and feel laggy.
    this.canvas.style.transition = 'none';

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
    this.canvas.style.transform = 'translate3d(' + this.translateX + 'px, ' + this.translateY + 'px, 0)';

    if (e.type.indexOf('touch') >= 0) e.preventDefault();
  }

  endDrag() {
    this.isDragging = false;
    if (this.viewport) this.viewport.classList.remove('dragging');
  }

  refreshMap() {
    var self = this;
    var btn = document.getElementById('btnRefreshMap');
    if (btn) {
      btn.style.animation = 'spin 0.5s ease';
      setTimeout(function() { btn.style.animation = ''; }, 500);
    }
    // Re-fetch data and re-render
    this.translateX = 0;
    this.translateY = 0;
    this.render();
    console.log('[AdventureMap] Map refreshed manually');
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
      this.canvas.style.transform = 'translate3d(' + this.translateX + 'px, ' + this.translateY + 'px, 0)';

      setTimeout(function() {
        if (self.canvas) self.canvas.style.transition = 'none';
      }, 500);
    }
  }

  scrollToTop() {
    if (!this.canvas) return;
    this.translateY = 0;
    this.translateX = 0;
    var self = this;
    this.canvas.style.transition = 'transform 0.5s ease';
    this.canvas.style.transform = 'translate3d(' + this.translateX + 'px, ' + this.translateY + 'px, 0)';
    setTimeout(function() {
      if (self.canvas) self.canvas.style.transition = 'none';
    }, 500);
  }
}
