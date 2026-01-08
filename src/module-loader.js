/**
 * Module Loader
 * 
 * This script is injected into all generated module HTML files.
 * It provides:
 * - Supabase client access
 * - Child/user state management  
 * - Star tracking and awarding
 * - Module completion tracking
 * - Navigation header
 * - Response tracking
 * 
 * All functions are exposed globally so module scripts can use them
 * without needing import statements.
 */

import { supabase } from './supabaseClient.js';

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
  childId: null,
  moduleId: null,
  parentUserId: null,
  currentChild: null,
  initialized: false
};

// Parse URL parameters on load
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  state.childId = params.get('childId');
  state.moduleId = params.get('moduleId');
  state.parentUserId = params.get('parentUserId');
  
  // Also set as window globals for backward compatibility
  window.childId = state.childId;
  window.moduleId = state.moduleId;
  window.parentUserId = state.parentUserId;
}

// ============================================
// DATABASE FUNCTIONS
// ============================================

async function getChild(id) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

async function updateChildStars(id, stars) {
  const { data, error } = await supabase
    .from('children')
    .update({ stars })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// EXPORTED MODULE FUNCTIONS
// ============================================

/**
 * Initialize the module with child data
 */
window.initializeModule = async function(workbookId) {
  if (!state.childId) {
    console.warn('No childId in URL parameters');
    return null;
  }
  
  try {
    state.currentChild = await getChild(state.childId);
    state.initialized = true;
    
    // Update header subtitle if it exists
    const headerSubtitle = document.getElementById('headerSubtitle');
    if (headerSubtitle && state.currentChild?.name) {
      headerSubtitle.textContent = `${state.currentChild.name}'s Journey`;
    }
    
    return state.currentChild;
  } catch (error) {
    console.error('Error initializing module:', error);
    return null;
  }
};

/**
 * Load stars from database
 */
window.loadStarsFromDB = async function() {
  if (!state.childId) return 0;
  
  try {
    state.currentChild = await getChild(state.childId);
    return state.currentChild?.stars || 0;
  } catch (error) {
    console.error('Error loading stars:', error);
    return 0;
  }
};

/**
 * Save stars to database
 */
window.saveStarsToDB = async function(totalStars) {
  if (!state.childId) return;
  
  try {
    await updateChildStars(state.childId, totalStars);
  } catch (error) {
    console.error('Error saving stars:', error);
    throw error;
  }
};

/**
 * Award a single star (increment by 1)
 */
window.awardSingleStar = async function() {
  if (!state.childId) return 0;
  
  try {
    const child = await getChild(state.childId);
    const newStars = (child.stars || 0) + 1;
    const updated = await updateChildStars(state.childId, newStars);
    state.currentChild = updated;
    return updated.stars;
  } catch (error) {
    console.error('Error awarding star:', error);
    throw error;
  }
};

/**
 * Get child's name
 */
window.getChildName = function() {
  return state.currentChild?.name || '';
};

/**
 * Get child ID
 */
window.getChildId = function() {
  return state.childId;
};

/**
 * Resolve display name with fallbacks
 */
window.resolveChildDisplayName = function(options = {}) {
  const { preferredName = '', fallback = 'Friend' } = options || {};
  
  if (preferredName?.trim()) return preferredName.trim();
  
  const childName = window.getChildName();
  if (childName?.trim()) return childName.trim();
  
  try {
    const stored = localStorage.getItem('moduleChildName');
    if (stored?.trim()) return stored.trim();
  } catch (e) {
    // localStorage not available
  }
  
  return fallback;
};

/**
 * Complete a module
 */
window.completeModuleDB = async function(moduleCode) {
  if (!state.childId) {
    throw new Error('No child ID available');
  }
  
  // Get module ID from code
  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select('id')
    .eq('code', moduleCode)
    .maybeSingle();
  
  if (moduleError) throw moduleError;
  if (!module) throw new Error(`Module "${moduleCode}" not found`);
  
  // Upsert completion record
  const { error } = await supabase
    .from('child_module_progress')
    .upsert({
      child_id: state.childId,
      module_id: module.id,
      completed: true,
      completed_at: new Date().toISOString()
    }, { 
      onConflict: 'child_id,module_id' 
    });
  
  if (error) throw error;
  return true;
};

// ============================================
// MODULE HEADER
// ============================================

/**
 * Initialize the module navigation header
 */
window.initModuleHeader = function(config) {
  const {
    title = 'Module',
    childName = 'Friend',
    onNext,
    onPrev,
    onGoToPage,
    onShowStars,
    onPrint,
    initialPage = { current: 1, total: 1 }
  } = config;
  
  let currentPage = initialPage.current;
  let totalPages = initialPage.total;
  let stars = 0;
  let canPrev = currentPage > 1;
  let canNext = currentPage < totalPages;
  
  const headerRoot = document.getElementById('moduleHeaderRoot');
  if (!headerRoot) {
    console.warn('moduleHeaderRoot element not found');
    return createNoopHeader();
  }
  
  function render() {
    headerRoot.innerHTML = `
      <header class="module-header">
        <div class="module-header__inner">
          <div class="module-header__nav">
            <button class="module-header__btn" id="mh-prev" ${!canPrev ? 'disabled' : ''}>
              ← Back
            </button>
            <span class="module-header__page">
              Page ${currentPage} of ${totalPages}
            </span>
            <button class="module-header__btn" id="mh-next" ${!canNext ? 'disabled' : ''}>
              Next →
            </button>
          </div>
          <div class="module-header__actions">
            <button class="module-header__star" id="mh-stars">
              <span class="star-icon">⭐</span>
              <span id="mh-star-count">${stars}</span>
            </button>
            <button class="module-header__btn module-header__home" id="mh-home">
              🏠 Home
            </button>
            <button class="module-header__btn module-header__print" id="mh-print">
              🖨️ Print
            </button>
          </div>
        </div>
      </header>
      <div class="module-header-spacer"></div>
    `;
    
    // Bind event listeners
    document.getElementById('mh-prev')?.addEventListener('click', () => {
      if (canPrev && onPrev) onPrev();
    });
    
    document.getElementById('mh-next')?.addEventListener('click', () => {
      if (canNext && onNext) onNext();
    });
    
    document.getElementById('mh-stars')?.addEventListener('click', () => {
      if (onShowStars) onShowStars();
    });
    
    document.getElementById('mh-home')?.addEventListener('click', () => {
      const url = state.childId 
        ? `/dashboard.html?childId=${state.childId}` 
        : '/dashboard.html';
      window.location.href = url;
    });
    
    document.getElementById('mh-print')?.addEventListener('click', () => {
      if (onPrint) onPrint();
      else window.print();
    });
  }
  
  render();
  
  return {
    updatePage(current, total, options = {}) {
      currentPage = current;
      totalPages = total;
      canPrev = options.canPrev ?? current > 1;
      canNext = options.canNext ?? current < total;
      render();
    },
    
    updateStars(count) {
      stars = count;
      const el = document.getElementById('mh-star-count');
      if (el) el.textContent = count;
    }
  };
};

function createNoopHeader() {
  return {
    updatePage() {},
    updateStars() {}
  };
}

// ============================================
// SUPABASE ACCESS
// ============================================

// Expose supabase for direct access if needed
window.supabase = supabase;

// ============================================
// INITIALIZATION
// ============================================

// Auto-initialize when script loads
parseUrlParams();

console.log('📦 Module loader initialized', {
  childId: state.childId,
  moduleId: state.moduleId,
  moduleMeta: window.__MODULE_META__
});