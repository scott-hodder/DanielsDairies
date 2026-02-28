// Module Header Component
// Provides navigation, star tracking, and print functionality for modules
// Loaded as regular script - sets window.initModuleHeader

(function() {
  'use strict';

  // ============================================================
  // PRINT FUNCTIONALITY - Prints ALL pages of the module
  // ============================================================

  function printEntireModule() {
    console.log('[Print] ====== PRINT PROCESS STARTING ======');
    
    try {
      // DEBUG: Log what's available on window
      console.log('[Print] Checking for pages array...');
      console.log('[Print] window.pages exists:', typeof window.pages !== 'undefined');
      console.log('[Print] window.pages is array:', Array.isArray(window.pages));
      if (window.pages) {
        console.log('[Print] window.pages.length:', window.pages.length);
      }
      
      // Step 1: Find or create a print container
      var printContainer = document.getElementById('printContainer');
      if (!printContainer) {
        printContainer = document.createElement('div');
        printContainer.id = 'printContainer';
        printContainer.className = 'print-container';
        document.body.appendChild(printContainer);
        console.log('[Print] Created new printContainer element');
      }
      
      // Step 2: Find the pages array from various sources
      var pagesArray = null;
      
      // Method 1: Check window.pages (most common for newer modules)
      if (typeof window.pages !== 'undefined' && window.pages !== null && Array.isArray(window.pages) && window.pages.length > 0) {
        pagesArray = window.pages;
        console.log('[Print] SUCCESS: Found window.pages with ' + pagesArray.length + ' pages');
      }
      
      // Method 2: Check window.modulePages (alternative name)
      if (!pagesArray && typeof window.modulePages !== 'undefined' && window.modulePages !== null && Array.isArray(window.modulePages) && window.modulePages.length > 0) {
        pagesArray = window.modulePages;
        console.log('[Print] SUCCESS: Found window.modulePages with ' + pagesArray.length + ' pages');
      }
      
      // Method 3: Look for generatePage functions on window
      if (!pagesArray) {
        var generatedPages = [];
        var pageIndex = 0;
        while (typeof window['generatePage' + pageIndex] === 'function') {
          generatedPages.push(window['generatePage' + pageIndex]);
          pageIndex++;
        }
        if (generatedPages.length > 0) {
          pagesArray = generatedPages;
          console.log('[Print] SUCCESS: Found ' + generatedPages.length + ' generatePageN functions');
        }
      }
      
      // Method 4: Check for TOTAL_PAGES constant and generatePageN functions
      if (!pagesArray && typeof window.TOTAL_PAGES === 'number' && window.TOTAL_PAGES > 0) {
        var generatedPages = [];
        for (var i = 0; i < window.TOTAL_PAGES; i++) {
          if (typeof window['generatePage' + i] === 'function') {
            generatedPages.push(window['generatePage' + i]);
          }
        }
        if (generatedPages.length > 0) {
          pagesArray = generatedPages;
          console.log('[Print] SUCCESS: Found ' + generatedPages.length + ' pages using TOTAL_PAGES');
        }
      }
      
      // Step 3: Generate all page HTML and populate the print container
      if (pagesArray && pagesArray.length > 0) {
        console.log('[Print] Generating HTML for ' + pagesArray.length + ' pages...');
        
        // Clear the print container
        printContainer.innerHTML = '';

        generatePagesForPrint(pagesArray, printContainer).then(function(successCount) {
          console.log('[Print] Successfully generated ' + successCount + ' pages');

          // Step 4: Show the print container
          printContainer.style.display = 'block';

          // Step 5: Inject print-specific styles if not already present
          injectPrintStyles();

          // Step 6: Wait for images/fonts/layout, then print
          waitForPrintReady(printContainer).then(function() {
            console.log('[Print] Triggering print dialog...');
            window.print();

            // After printing (or cancel), hide the print container
            setTimeout(function() {
              printContainer.style.display = 'none';
              console.log('[Print] Print container hidden');
            }, 1000);
          });
        });
        
      } else {
        console.log('[Print] No pages array found, trying fallback methods...');
        
        // Fallback: No pages array found, try to get existing .page elements
        var existingPages = document.querySelectorAll('.page');
        console.log('[Print] Found ' + existingPages.length + ' existing .page elements in DOM');
        
        if (existingPages.length > 1) {
          console.log('[Print] Using existing .page elements as fallback');
          
          printContainer.innerHTML = '';
          
          for (var j = 0; j < existingPages.length; j++) {
            var clonedPage = existingPages[j].cloneNode(true);
            printContainer.appendChild(clonedPage);
          }
          
          printContainer.style.display = 'block';
          injectPrintStyles();
          
          setTimeout(function() {
            window.print();
            setTimeout(function() {
              printContainer.style.display = 'none';
            }, 1000);
          }, 300);
          
        } else {
          console.log('[Print] FALLBACK: No multi-page content found, using standard window.print()');
          window.print();
        }
      }
      
    } catch (error) {
      console.error('[Print] FATAL ERROR:', error);
      window.print();
    }
  }

  function generatePagesForPrint(pagesArray, printContainer) {
    var successCount = 0;

    return pagesArray.reduce(function(chain, pageFunction, index) {
      return chain.then(function() {
        return resolvePageHtml(pageFunction, index).then(function(pageHTML) {
          if (!pageHTML) {
            return;
          }

          // Insert HTML directly without extra wrapper to avoid double min-height
          // The generated HTML already has a .page div with proper styling
          printContainer.insertAdjacentHTML('beforeend', pageHTML);
          successCount++;
        });
      });
    }, Promise.resolve()).then(function() {
      return successCount;
    });
  }

  function resolvePageHtml(pageFunction, index) {
    return new Promise(function(resolve) {
      try {
        var pageResult = pageFunction;
        if (typeof pageFunction === 'function') {
          pageResult = pageFunction();
        }

        if (pageResult && typeof pageResult.then === 'function') {
          pageResult.then(function(resolvedHtml) {
            resolve(typeof resolvedHtml === 'string' ? resolvedHtml : '');
          }).catch(function(err) {
            console.error('[Print] Error generating page ' + index + ':', err);
            resolve('');
          });
          return;
        }

        resolve(typeof pageResult === 'string' ? pageResult : '');
      } catch (err) {
        console.error('[Print] Error generating page ' + index + ':', err);
        resolve('');
      }
    });
  }

  function waitForPrintReady(printContainer) {
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function() {}) : Promise.resolve();
    var imageReady = waitForImages(printContainer);

    return Promise.all([fontsReady, imageReady]).then(function() {
      return new Promise(function(resolve) {
        requestAnimationFrame(function() {
          requestAnimationFrame(resolve);
        });
      });
    });
  }

  function waitForImages(printContainer) {
    var images = printContainer.querySelectorAll('img');
    if (!images.length) {
      return Promise.resolve();
    }

    var loaders = Array.prototype.map.call(images, function(image) {
      if (image.complete && image.naturalWidth > 0) {
        return Promise.resolve();
      }

      return new Promise(function(resolve) {
        var settled = false;
        var finish = function() {
          if (settled) {
            return;
          }
          settled = true;
          resolve();
        };

        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });

        setTimeout(finish, 2000);
      });
    });

    return Promise.all(loaders).then(function() {});
  }

  // Inject CSS styles needed for multi-page printing
  function injectPrintStyles() {
    if (document.getElementById('moduleHeaderPrintStyles')) {
      return;
    }
    
    var styleSheet = document.createElement('style');
    styleSheet.id = 'moduleHeaderPrintStyles';
    styleSheet.textContent = 
      /* Hide print container by default */
      '#printContainer { display: none; }' +
      
      /* Screen preview styles */
      '@media screen {' +
        '#printContainer {' +
          'position: fixed; top: 0; left: 0; right: 0; bottom: 0;' +
          'background: #f0f0f0; z-index: 99999; overflow-y: auto; padding: 20px;' +
        '}' +
        '#printContainer > .page {' +
          'background: white; max-width: 800px; margin: 20px auto;' +
          'box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-radius: 8px;' +
        '}' +
      '}' +
      
      /* Print styles */
      '@media print {' +
        '@page { margin: 0.5in; }' +
        /* Hide everything except print container */
        'body > *:not(#printContainer) { display: none !important; }' +
        
        /* Show and reset print container */
        '#printContainer {' +
          'display: block !important;' +
          'position: static !important;' +
          'background: white !important;' +
          'padding: 0 !important;' +
          'margin: 0 !important;' +
          'overflow: visible !important;' +
        '}' +
        
        /* Page styling - remove min-height to prevent blank pages */
        '#printContainer > .page {' +
          'page-break-after: always;' +
          'page-break-inside: avoid;' +
          'break-after: page;' +
          'min-height: 100vh !important;' +
          'height: auto !important;' +
          'width: 100% !important;' +
          'box-sizing: border-box !important;' +
          'display: block !important;' +
          'padding: 0.5in !important;' +
          'margin: 0 !important;' +
          'box-shadow: none !important;' +
          'border-radius: 0 !important;' +
          'max-width: none !important;' +
          'overflow: visible !important;' +
        '}' +
        
        /* Last page no break after */
        '#printContainer > .page:last-child {' +
          'page-break-after: auto;' +
        '}' +
        
        /* Hide buttons and no-print elements */
        '#printContainer button, #printContainer .no-print { display: none !important; }' +
        
        /* Ensure colors print */
        '#printContainer, #printContainer * {' +
          '-webkit-print-color-adjust: exact !important;' +
          'print-color-adjust: exact !important;' +
          'color-adjust: exact !important;' +
        '}' +
        
        /* Form elements */
        '#printContainer input[type="text"], #printContainer input[type="range"], #printContainer textarea {' +
          'border: 1px solid #999 !important;' +
          'background: white !important;' +
          'color: black !important;' +
        '}' +
      '}';
    
    document.head.appendChild(styleSheet);
    console.log('[Print] Injected print styles');
  }

  // ============================================================
  // AGE RANGE ATTRIBUTE HELPERS
  // ============================================================

  function normalizeAgeRange(text) {
    if (!text) {
      return null;
    }
    var normalized = text.replace(/[–—]/g, '-');
    var match = normalized.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
    if (match) {
      return match[1] + '-' + match[2];
    }
    return null;
  }

  function extractAgeRangeFromText(text) {
    if (!text) {
      return null;
    }
    var ageMatch = text.match(/Ages?\s*(\d{1,2}\s*-\s*\d{1,2})/i);
    if (ageMatch) {
      return normalizeAgeRange(ageMatch[1]);
    }
    var rangeMatch = text.match(/(\d{1,2}\s*-\s*\d{1,2})\s*years?/i);
    if (rangeMatch) {
      return normalizeAgeRange(rangeMatch[1]);
    }
    return null;
  }

  function applyAgeRangeAttribute() {
    if (!document.body || document.body.dataset.ageRange) {
      return true;
    }
    var container = document.getElementById('pageContainer') || document.body;
    var text = container.textContent || '';
    var ageRange = extractAgeRangeFromText(text);
    if (ageRange) {
      document.body.dataset.ageRange = ageRange;
      return true;
    }
    return false;
  }

  function observeAgeRangeAttribute() {
    if (applyAgeRangeAttribute()) {
      return;
    }
    var target = document.getElementById('pageContainer') || document.body;
    if (!target || typeof MutationObserver === 'undefined') {
      return;
    }
    var observer = new MutationObserver(function() {
      if (applyAgeRangeAttribute()) {
        observer.disconnect();
      }
    });
    observer.observe(target, { childList: true, subtree: true, characterData: true });
  }

  // ============================================================
  // MAIN MODULE HEADER FUNCTION
  // ============================================================

  function initModuleHeader(options) {
    options = options || {};
    var initialPage = options.initialPage || { current: 1, total: 1 };
    var initialStars = options.initialStars || 0;
    var parentModeEnabled = options.parentModeEnabled || false;
    var labels = options.labels || {};
    var showParentToggle = options.showParentToggle || false;
    var onPrev = options.onPrev;
    var onNext = options.onNext;
    var onHome = options.onHome;
    var onShowStars = options.onShowStars;
    var onToggleParentMode = options.onToggleParentMode;

    observeAgeRangeAttribute();

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

    // Print button
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
      } else if (typeof window.handleHomeButtonClick === 'function') {
        window.handleHomeButtonClick();
      } else {
        var params = new URLSearchParams(window.location.search);
        var childId = params.get('childId');
        window.location.href = childId ? '/dashboard.html?childId=' + childId : '/dashboard.html';
      }
    });

    // PRINT BUTTON - ALWAYS calls printEntireModule (ignores onPrint option)
    printButton.addEventListener('click', function() {
      console.log('[ModuleHeader] Print button clicked - calling printEntireModule()');
      printEntireModule();
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
  }

  // ============================================================
  // EXPOSE TO WINDOW (for regular script loading)
  // ============================================================
  window.initModuleHeader = initModuleHeader;
  window.printEntireModule = printEntireModule;

  console.log('[ModuleHeader] Loaded - window.initModuleHeader and window.printEntireModule available');

})();
