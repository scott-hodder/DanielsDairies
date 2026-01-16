/**
 * Module Header Component
 * =======================
 * Load this script in module.html to make window.initModuleHeader available.
 * Generated modules then simply call window.initModuleHeader({ options })
 */

// Assign directly to window to avoid async wrapping
window.initModuleHeader = (function() {
  'use strict';

  return function(options) {
    options = options || {};
    
    var onPrev = options.onPrev;
    var onNext = options.onNext;
    var onHome = options.onHome;
    var onPrint = options.onPrint;
    var onShowStars = options.onShowStars;
    var onToggleParentMode = options.onToggleParentMode;
    var showParentToggle = options.showParentToggle || false;
    var initialPage = options.initialPage || { current: 1, total: 1 };
    var initialStars = options.initialStars || 0;
    var parentModeEnabled = options.parentModeEnabled || false;
    var labels = options.labels || {};

    // Remove any existing header first
    var existingHeader = document.querySelector('.module-header');
    if (existingHeader) {
      existingHeader.remove();
      var existingSpacer = document.querySelector('.module-header-spacer');
      if (existingSpacer) existingSpacer.remove();
    }

    // Create header element
    var header = document.createElement('header');
    header.className = 'module-header no-print';

    // Create inner container
    var inner = document.createElement('div');
    inner.className = 'module-header__inner';

    // Create navigation section
    var navSection = document.createElement('div');
    navSection.className = 'module-header__nav';

    // Detect mobile
    var isMobile = window.innerWidth <= 768;

    // Previous button
    var prevBtn = document.createElement('button');
    prevBtn.className = 'module-header__btn module-header__btn--nav';
    prevBtn.textContent = isMobile ? '←' : (labels.prev || '← Back');
    prevBtn.setAttribute('aria-label', 'Previous page');
    prevBtn.type = 'button';

    // Page display
    var pageDisplay = document.createElement('div');
    pageDisplay.className = 'module-header__page';

    // Next button
    var nextBtn = document.createElement('button');
    nextBtn.className = 'module-header__btn module-header__btn--nav';
    nextBtn.textContent = isMobile ? '→' : (labels.next || 'Next →');
    nextBtn.setAttribute('aria-label', 'Next page');
    nextBtn.type = 'button';

    navSection.appendChild(prevBtn);
    navSection.appendChild(pageDisplay);
    navSection.appendChild(nextBtn);

    // Create actions section
    var actionsSection = document.createElement('div');
    actionsSection.className = 'module-header__actions';

    // Star button
    var starButton = document.createElement('button');
    starButton.className = 'module-header__star';
    starButton.type = 'button';
    starButton.innerHTML = '<span class="star-icon">⭐</span><span data-role="star-count">' + initialStars + '</span>';

    // Print button (hidden on mobile via CSS)
    var printButton = document.createElement('button');
    printButton.className = 'module-header__btn module-header__print';
    printButton.type = 'button';
    printButton.textContent = '🖨️';

    // Home button
    var homeButton = document.createElement('button');
    homeButton.className = 'module-header__btn module-header__home';
    homeButton.type = 'button';
    homeButton.textContent = '🏠';
    homeButton.setAttribute('aria-label', 'Go home');

    // Parent mode button (optional)
    var parentModeButton = null;
    if (showParentToggle) {
      parentModeButton = document.createElement('button');
      parentModeButton.className = 'module-header__btn module-header__parent';
      parentModeButton.type = 'button';
      parentModeButton.textContent = parentModeEnabled ? '👨‍👩‍👧 ON' : '👨‍👩‍👧';
    }

    // Append to actions section
    actionsSection.appendChild(starButton);
    if (parentModeButton) actionsSection.appendChild(parentModeButton);
    actionsSection.appendChild(printButton);
    actionsSection.appendChild(homeButton);

    // Assemble header
    inner.appendChild(navSection);
    inner.appendChild(actionsSection);
    header.appendChild(inner);

    // Insert into DOM
    var root = document.getElementById('moduleHeaderRoot');
    if (root) {
      root.innerHTML = '';
      root.appendChild(header);
    } else {
      document.body.insertBefore(header, document.body.firstChild);
    }

    // Add spacer after header
    var spacer = document.createElement('div');
    spacer.className = 'module-header-spacer no-print';
    header.parentNode.insertBefore(spacer, header.nextSibling);

    // State
    var moduleCompleted = false;
    var currentLabels = labels;

    // Helper functions
    function updatePageDisplay(current, total) {
      current = current || 1;
      total = total || 1;
      var safeTotal = Math.max(1, Math.round(Number(total)) || 1);
      var safeCurrent = Math.min(Math.max(1, Math.round(Number(current)) || 1), safeTotal);
      
      var mobile = window.innerWidth <= 768;
      pageDisplay.textContent = mobile 
        ? safeCurrent + ' of ' + safeTotal
        : 'Page ' + safeCurrent + ' of ' + safeTotal;
      
      prevBtn.disabled = safeCurrent <= 1;
      nextBtn.disabled = safeCurrent >= safeTotal;
      updateButtonLabels();
      
      if (safeCurrent === safeTotal && safeTotal > 1 && !moduleCompleted) {
        moduleCompleted = true;
        setTimeout(function() {
          if (typeof window.handleModuleCompletion === 'function') {
            window.handleModuleCompletion();
          }
        }, 500);
      }
    }

    function updateStarCount(value) {
      var countEl = starButton.querySelector('[data-role="star-count"]');
      if (countEl) countEl.textContent = value;
    }

    function updateButtonLabels() {
      var mobile = window.innerWidth <= 768;
      prevBtn.textContent = mobile ? '←' : (currentLabels.prev || '← Back');
      nextBtn.textContent = mobile ? '→' : (currentLabels.next || 'Next →');
    }

    // Event listeners
    if (typeof onPrev === 'function') {
      prevBtn.addEventListener('click', onPrev);
    }

    if (typeof onNext === 'function') {
      nextBtn.addEventListener('click', onNext);
    }

    homeButton.addEventListener('click', function() {
      if (typeof onHome === 'function') {
        onHome();
      } else {
        var params = new URLSearchParams(window.location.search);
        var childId = params.get('childId');
        window.location.href = childId ? '/dashboard.html?childId=' + childId : '/dashboard.html';
      }
    });

    printButton.addEventListener('click', function() {
      if (typeof onPrint === 'function') {
        onPrint();
      } else {
        window.print();
      }
    });

    if (typeof onShowStars === 'function') {
      starButton.addEventListener('click', onShowStars);
    }

    if (parentModeButton && typeof onToggleParentMode === 'function') {
      parentModeButton.addEventListener('click', onToggleParentMode);
    }

    // Handle resize
    var resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        updateButtonLabels();
        var text = pageDisplay.textContent;
        var match = text.match(/(\d+)\s*(?:of)\s*(\d+)/i);
        if (match) {
          updatePageDisplay(parseInt(match[1], 10), parseInt(match[2], 10));
        }
      }, 150);
    });

    // Initialize
    updatePageDisplay(initialPage.current, initialPage.total);
    updateStarCount(initialStars);

    // Return public API
    return {
      updatePage: function(current, total) {
        updatePageDisplay(current, total);
      },
      updateStars: function(stars) {
        updateStarCount(stars);
      },
      setParentMode: function(enabled) {
        if (parentModeButton) {
          parentModeButton.textContent = enabled ? '👨‍👩‍👧 ON' : '👨‍👩‍👧';
        }
      },
      destroy: function() {
        header.remove();
        spacer.remove();
      }
    };
  };
})();

console.log('[ModuleHeader] window.initModuleHeader is now available');