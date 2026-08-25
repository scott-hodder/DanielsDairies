// ================================================
// ENHANCED DASHBOARD - Daily Quests, Daniel Hub, Module Preview
// Extracted from dashboard-enhanced.js
// ================================================

import { AdventureMapV4 } from './dashboard-enhanced.js';
import { CATEGORY_TO_SUPERSKILL } from './adventure-map-themes.js';

// Dashboard state helpers
let dashboardSelectedChild = null;
let dashboardChildren = [];

function getDashboardData() {
  var sc = window.selectedChild || (window.state && window.state.selectedChild) || null;
  if (sc) dashboardSelectedChild = sc;
  if (typeof window.children !== 'undefined') dashboardChildren = window.children;
}

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

    // Update UI synchronously - these are fast DOM writes
    this.updateDanielMood();
    this.updateQuestDisplay();
    this.updateRankDisplay();

    // Setup adventure map - render() has its own rAF
    this.setupAdventureMap();

    this.initialized = true;
  }

  setupDanielHub() {
    if (isDanielMoodCheckinEnabled()) return;
    var self = this;
    var danielHub = document.getElementById('danielHub');
    if (danielHub) danielHub.addEventListener('click', function() { self.interactWithDaniel(); });
  }

  interactWithDaniel() {
    if (isDanielMoodCheckinEnabled()) return;
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
    if (isDanielMoodCheckinEnabled()) return;
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
    this.checkReturnCelebration();
  }

  checkReturnCelebration() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('completed') !== '1') return;

    // Clean the URL so refreshing won't re-trigger
    params.delete('completed');
    var cleanUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', cleanUrl);

    // Brief celebration overlay
    var self = this;
    setTimeout(function() {
      var overlay = document.createElement('div');
      overlay.className = 'return-celebration';
      overlay.innerHTML =
        '<div class="return-celebration-content">' +
        '<div class="return-celebration-emoji">🎉</div>' +
        '<div class="return-celebration-text">Module Complete!</div>' +
        '<div class="return-celebration-sub">Great job! Your map has been updated.</div>' +
        '</div>';
      document.body.appendChild(overlay);

      // Spawn confetti
      var colors = ['#FBBF24', '#4ADE80', '#60A5FA', '#F472B6', '#A78BFA'];
      for (var i = 0; i < 30; i++) {
        var piece = document.createElement('div');
        piece.style.cssText = 'position:fixed;width:8px;height:8px;border-radius:50%;top:-10px;z-index:10001;pointer-events:none;' +
          'left:' + (Math.random() * 100) + 'vw;' +
          'background:' + colors[Math.floor(Math.random() * colors.length)] + ';' +
          'animation:returnConfettiFall ' + (1.5 + Math.random()) + 's ease-out forwards;' +
          'animation-delay:' + (Math.random() * 0.5) + 's;';
        document.body.appendChild(piece);
        setTimeout(function(el) { el.remove(); }.bind(null, piece), 3000);
      }

      // Auto-dismiss after 2.5s
      setTimeout(function() {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.4s ease';
        setTimeout(function() { overlay.remove(); }, 400);
      }, 2500);
    }, 600);
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

    // Prefetch the module page so navigation feels instant
    var child = window.selectedChild || (window.state && window.state.selectedChild) || null;
    if (child && module.module) {
      var prefetchUrl = '/module.html?childId=' + child.id + '&moduleId=' + module.module.id + '&code=' + (module.code || module.module.code);
      var existing = document.querySelector('link[data-prefetch-module]');
      if (existing) existing.remove();
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = prefetchUrl;
      link.setAttribute('data-prefetch-module', '1');
      document.head.appendChild(link);
    }
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

    // One tap → play. Check-ins moved to AFTER module completion
    // (dashboardCheckinInterception.maybeShowPostCompletionCheckin) so they
    // never sit between the child and the content.
    var mod = module.module;
    var moduleUrl = '/module.html?childId=' + child.id + '&moduleId=' + mod.id + '&code=' + (module.code || mod.code) + '&childName=' + encodeURIComponent(child.name || '') + ((window.state && window.state.isCurrentUserAdmin) ? '&isAdmin=true' : '');
    window.location.href = moduleUrl;
  }
  
  // Check if a check-in is needed based on completed module count (every 3 modules)
  async shouldTriggerCheckinForModuleCount(childId, superSkillId) {
    if (!childId || !window.supabase) return false;
    var CHECKIN_MODULE_INTERVAL = 3;

    try {
      // Count completed modules for this child IN this super skill
      var completedCount = 0;
      if (superSkillId) {
        var completedResult = await window.supabase
          .from('child_modules')
          .select('id, modules!inner(super_skill_id)')
          .eq('child_id', childId)
          .eq('is_completed', true)
          .eq('modules.super_skill_id', superSkillId);

        if (completedResult.error) {
          console.error('[Check-in] Error counting completed modules:', completedResult.error);
          return false;
        }
        completedCount = (completedResult.data && completedResult.data.length) || 0;
      } else {
        var completedResult = await window.supabase
          .from('child_modules')
          .select('id')
          .eq('child_id', childId)
          .eq('is_completed', true);

        if (completedResult.error) return false;
        completedCount = (completedResult.data && completedResult.data.length) || 0;
      }

      // Count check-ins for this child for this super skill's pathway
      var checkinCount = 0;
      if (superSkillId) {
        var skillResult = await window.supabase
          .from('super_skills')
          .select('slug')
          .eq('id', superSkillId)
          .single();

        var slug = skillResult.data && skillResult.data.slug;
        if (slug) {
          var checkinResult = await window.supabase
            .from('pathway_assessments')
            .select('id')
            .eq('child_id', childId)
            .eq('pathway_category', slug)
            .in('assessment_type', ['checkin', 'check_in']);

          if (!checkinResult.error) {
            checkinCount = (checkinResult.data && checkinResult.data.length) || 0;
          }
        }
      }
      // If no super skill or slug lookup failed, count all check-ins
      if (!superSkillId || checkinCount === 0) {
        var allCheckinsResult = await window.supabase
          .from('pathway_assessments')
          .select('id')
          .eq('child_id', childId)
          .in('assessment_type', ['checkin', 'check_in']);
        checkinCount = (allCheckinsResult.data && allCheckinsResult.data.length) || 0;
      }

      // Expected check-ins: one per 3 completed modules (at 3, 6, 9...)
      // Don't include the initial intro check-in (that's separate)
      var expectedCheckins = Math.floor(completedCount / CHECKIN_MODULE_INTERVAL);

      console.log('[Check-in] SuperSkill:', superSkillId, 'Completed:', completedCount, 'Check-ins done:', checkinCount, 'Expected:', expectedCheckins);

      if (expectedCheckins > 0 && checkinCount < expectedCheckins) {
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
  
  // Footer is shown after the adventure map finishes rendering
  // (via window._dashboardRenderComplete below)
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

// Refresh function - immediate execution, debounces rapid successive calls
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
function isDanielMoodCheckinEnabled() {
  return Boolean(window.__danielMoodCheckinEnabled || document.getElementById('danielMoodModal'))
}


