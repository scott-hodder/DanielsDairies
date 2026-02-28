// Module Header Component
// Provides navigation, star tracking, and print functionality for modules
// Loaded as regular script - sets window.initModuleHeader

(function() {
  'use strict';

  // ============================================================
  // PRINT FUNCTIONALITY - Prints ALL pages of the module
  // ============================================================

  // ============================================================
  // PRINT HELPER: Sanitize a container's DOM for print
  // Directly strips/fixes inline styles that prevent content from showing
  // ============================================================
  function sanitizeForPrint(container) {
    // CRITICAL: Force override overflow:hidden that comes from CSS classes
    // (e.g. .rounded-3xl.shadow-xl has overflow:hidden in module-base.css)
    // el.style.overflow only checks inline styles, so we must SET inline !important
    var allEls = container.querySelectorAll('*');
    for (var i = 0; i < allEls.length; i++) {
      var el = allEls[i];
      var computed = window.getComputedStyle(el);
      
      // Fix any element with computed overflow:hidden (from classes OR inline)
      if (computed.overflow === 'hidden' || computed.overflowY === 'hidden' || computed.overflowX === 'hidden') {
        el.style.setProperty('overflow', 'visible', 'important');
      }
      
      // Fix constrained heights from classes or inline
      var h = computed.height;
      if (h && h !== 'auto' && h.indexOf('calc') !== -1) {
        el.style.setProperty('height', 'auto', 'important');
      }
      var mh = computed.maxHeight;
      if (mh && mh !== 'none' && mh !== '0px') {
        el.style.setProperty('max-height', 'none', 'important');
      }
      
      // Fix position:fixed which breaks print layout
      if (computed.position === 'fixed') {
        el.style.setProperty('position', 'relative', 'important');
      }
    }
    
    // Fix .page elements specifically
    var pages = container.querySelectorAll('.page');
    for (var p = 0; p < pages.length; p++) {
      var pg = pages[p];
      pg.style.setProperty('min-height', 'auto', 'important');
      pg.style.setProperty('height', 'auto', 'important');
      pg.style.setProperty('max-height', 'none', 'important');
      pg.style.setProperty('overflow', 'visible', 'important');
      pg.style.setProperty('padding', '0.4in 0.5in', 'important');
      pg.style.setProperty('box-shadow', 'none', 'important');
      pg.style.setProperty('border-radius', '0', 'important');
      pg.classList.remove('min-h-screen');
    }
    
    // Convert interactive buttons to visible divs
    // (module-base.css @media print hides ALL button:not(.completion-btn))
    var contentBtnSelectors = [
      'button.interactive-option',
      'button.match-item',
      'button.quiz-answer',
      'button.scenario-choice',
      'button.scenario-option',
      'button.quiz-option',
      'button.sort-item',
      'button.agree-disagree-option',
      'button.emoji-option'
    ];
    var contentButtons = container.querySelectorAll(contentBtnSelectors.join(','));
    for (var b = 0; b < contentButtons.length; b++) {
      var btn = contentButtons[b];
      var div = document.createElement('div');
      div.innerHTML = btn.innerHTML;
      div.className = btn.className;
      div.setAttribute('style', btn.getAttribute('style') || '');
      div.style.setProperty('display', 'block', 'important');
      div.style.setProperty('margin-bottom', '4px');
      btn.parentNode.replaceChild(div, btn);
    }
    
    // Also convert any remaining buttons with substantial content text
    var remainingBtns = container.querySelectorAll('button');
    for (var rb = 0; rb < remainingBtns.length; rb++) {
      var navBtn = remainingBtns[rb];
      var textLen = (navBtn.textContent || '').trim().length;
      if (textLen > 20) {
        var contentDiv = document.createElement('div');
        contentDiv.innerHTML = navBtn.innerHTML;
        contentDiv.className = navBtn.className;
        contentDiv.setAttribute('style', navBtn.getAttribute('style') || '');
        contentDiv.style.setProperty('display', 'block', 'important');
        navBtn.parentNode.replaceChild(contentDiv, navBtn);
      }
    }
    
    // Remove Grown-Up Notes entirely from print (parent-facing content, not for kids)
    // These inflate the page height significantly and cause unnecessary scaling
    var grownUpNotes = container.querySelectorAll('[id^="grownup-note"]');
    for (var g = 0; g < grownUpNotes.length; g++) {
      // Remove the entire grown-up note container (the parent .rounded-xl that wraps it)
      var noteParent = grownUpNotes[g].closest('.rounded-xl[style*="border-color"]') || grownUpNotes[g].parentNode;
      if (noteParent) noteParent.remove();
    }
    // Also remove any toggle buttons for grown-up notes
    var grownUpBtns = container.querySelectorAll('[onclick*="toggleGrownUpNote"]');
    for (var gb = 0; gb < grownUpBtns.length; gb++) {
      var btnContainer = grownUpBtns[gb].closest('.rounded-xl') || grownUpBtns[gb].parentNode;
      if (btnContainer) btnContainer.remove();
    }
    
    // Remove elements with class 'hidden' (but grown-up notes already removed above)
    var hiddenEls = container.querySelectorAll('.hidden');
    for (var h2 = 0; h2 < hiddenEls.length; h2++) {
      hiddenEls[h2].remove();
    }
    
    // Remove no-print elements
    var noPrint = container.querySelectorAll('.no-print');
    for (var np = 0; np < noPrint.length; np++) {
      noPrint[np].remove();
    }
    
    // Remove elements with display:none (feedback, mascot messages, etc.)
    // These are hidden interactive responses that just inflate page height
    var allDisplayNone = container.querySelectorAll('[style*="display: none"], [style*="display:none"]');
    for (var dn = 0; dn < allDisplayNone.length; dn++) {
      allDisplayNone[dn].remove();
    }
    
    // Ensure images have reasonable print dimensions
    var imgs = container.querySelectorAll('img');
    for (var im = 0; im < imgs.length; im++) {
      imgs[im].style.setProperty('max-width', '100%', 'important');
      var imgH = imgs[im].getAttribute('style') || '';
      if (imgH.indexOf('height') !== -1) {
        // Keep explicit heights for character images but cap them
        var currentH = parseInt(window.getComputedStyle(imgs[im]).height, 10);
        if (currentH > 300) {
          imgs[im].style.setProperty('height', '250px', 'important');
          imgs[im].style.setProperty('width', 'auto', 'important');
        }
      }
    }
    
    console.log('[Print] Sanitized container for print (' + allEls.length + ' elements processed)');
  }

  // ============================================================
  // FIT EACH MODULE PAGE TO EXACTLY ONE PRINTED PAGE
  // Only scales down pages that are genuinely too tall
  // ============================================================
  function fitPagesToSingleSheet(container) {
    var pages = container.querySelectorAll('.page');
    console.log('[Print] Fitting ' + pages.length + ' pages to single sheets...');
    
    // Create a hidden measurement div that simulates print page size
    var measurer = document.createElement('div');
    measurer.style.cssText = 'position:absolute;left:-9999px;top:0;width:6.5in;visibility:hidden;';
    document.body.appendChild(measurer);
    
    // Target height: US Letter printable area is ~10in at 96dpi = 960px
    // A4 is slightly taller. We use a generous target since we've already
    // removed grown-up notes and hidden feedback elements.
    var TARGET_HEIGHT = 1020;
    
    for (var i = 0; i < pages.length; i++) {
      var page = pages[i];
      
      // Clone the page into the measurer to get accurate content height
      var clone = page.cloneNode(true);
      clone.style.cssText = 'height:auto !important;min-height:auto !important;max-height:none !important;overflow:visible !important;padding:0.3in 0.4in !important;position:relative !important;';
      measurer.innerHTML = '';
      measurer.appendChild(clone);
      
      var contentHeight = clone.offsetHeight;
      
      console.log('[Print] Page ' + i + ': measured height=' + contentHeight + 'px, target=' + TARGET_HEIGHT + 'px');
      
      if (contentHeight > TARGET_HEIGHT) {
        // Needs scaling — wrap content and scale to fit
        var scale = TARGET_HEIGHT / contentHeight;
        // No minimum cap - always fit the content on one page
        // Very long pages (scale < 0.5) are rare and better small than cut off
        
        var wrapper = document.createElement('div');
        wrapper.className = 'print-page-wrapper';
        while (page.firstChild) {
          wrapper.appendChild(page.firstChild);
        }
        page.appendChild(wrapper);
        
        wrapper.style.setProperty('transform', 'scale(' + scale + ')', 'important');
        wrapper.style.setProperty('transform-origin', 'top left', 'important');
        wrapper.style.setProperty('width', (100 / scale) + '%', 'important');
        
        console.log('[Print] Page ' + i + ': scaled to ' + (scale * 100).toFixed(1) + '%');
      }
      // else: page fits naturally, no wrapping/scaling needed
    }
    
    // Clean up measurer
    document.body.removeChild(measurer);
    
    // Set all pages to exactly one page height
    for (var j = 0; j < pages.length; j++) {
      pages[j].style.setProperty('height', '100vh', 'important');
      pages[j].style.setProperty('min-height', '100vh', 'important');
      pages[j].style.setProperty('max-height', '100vh', 'important');
      pages[j].style.setProperty('overflow', 'hidden', 'important');
      pages[j].style.setProperty('box-sizing', 'border-box', 'important');
    }
  }
  function printEntireModule() {
    console.log('[Print] ====== PRINT PROCESS STARTING ======');
    
    try {
      // DEBUG: Log what's available on window
      console.log('[Print] Checking for pages array...');
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
        
        // Generate and add each page
        var successCount = 0;
        for (var i = 0; i < pagesArray.length; i++) {
          try {
            var pageFunction = pagesArray[i];
            var pageHTML = '';
            
            if (typeof pageFunction === 'function') {
              pageHTML = pageFunction();
            } else if (typeof pageFunction === 'string') {
              pageHTML = pageFunction;
            }
            
            if (pageHTML) {
              printContainer.insertAdjacentHTML('beforeend', pageHTML);
              successCount++;
            }
          } catch (err) {
            console.error('[Print] Error generating page ' + i + ':', err);
          }
        }
        
        console.log('[Print] Successfully generated ' + successCount + ' pages');
        
        // Step 4: Sanitize the DOM - fix inline styles, convert buttons, etc.
        sanitizeForPrint(printContainer);
        
        // Step 5: Show the print container
        printContainer.style.display = 'block';
        
        // Step 6: Inject print-specific styles
        injectPrintStyles();
        
        // Step 7: Fit each module page to exactly one printed page
        fitPagesToSingleSheet(printContainer);
        
        // Step 8: Wait for images to load, then print
        waitForImagesAndPrint(printContainer);
        
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
          
          sanitizeForPrint(printContainer);
          printContainer.style.display = 'block';
          injectPrintStyles();
          fitPagesToSingleSheet(printContainer);
          waitForImagesAndPrint(printContainer);
          
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

  // Wait for images then trigger print
  function waitForImagesAndPrint(printContainer) {
    var images = printContainer.querySelectorAll('img');
    var total = images.length;
    var loaded = 0;
    var printed = false;
    
    // Create a loading overlay so user doesn't see the print container flash
    var overlay = document.createElement('div');
    overlay.id = 'printLoadingOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;font-family:Nunito,sans-serif;';
    overlay.innerHTML = '<div style="text-align:center;">' +
      '<div style="width:48px;height:48px;border:4px solid #e8e4d9;border-top-color:#405878;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>' +
      '<p style="color:#405878;font-size:18px;font-weight:600;">Preparing your print...</p>' +
      '</div>';
    document.body.appendChild(overlay);
    
    function doPrint() {
      if (printed) return;
      printed = true;
      console.log('[Print] Triggering print dialog...');
      
      // Hide overlay just before print dialog (print dialog will cover screen)
      overlay.style.display = 'none';
      
      window.print();
      
      // After printing (or cancel), show overlay briefly while cleaning up
      overlay.innerHTML = '<div style="text-align:center;">' +
        '<div style="width:48px;height:48px;border:4px solid #e8e4d9;border-top-color:#405878;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>' +
        '<p style="color:#405878;font-size:18px;font-weight:600;">Restoring view...</p>' +
        '</div>';
      overlay.style.display = 'flex';
      
      setTimeout(function() {
        // Clean up print container
        printContainer.style.display = 'none';
        printContainer.innerHTML = '';
        console.log('[Print] Print container hidden and cleared');
        
        // Fade out overlay
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
        setTimeout(function() {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 350);
      }, 500);
    }
    
    if (total === 0) {
      setTimeout(doPrint, 500);
      return;
    }
    
    for (var i = 0; i < total; i++) {
      if (images[i].complete) {
        loaded++;
      } else {
        images[i].addEventListener('load', function() {
          loaded++;
          if (loaded >= total) doPrint();
        });
        images[i].addEventListener('error', function() {
          loaded++;
          if (loaded >= total) doPrint();
        });
      }
    }
    
    if (loaded >= total) {
      setTimeout(doPrint, 500);
    } else {
      // Fallback timeout
      setTimeout(doPrint, 3000);
    }
  }

  // Inject CSS styles needed for multi-page printing
  function injectPrintStyles() {
    if (document.getElementById('moduleHeaderPrintStyles')) {
      // Remove old one to ensure fresh styles
      document.getElementById('moduleHeaderPrintStyles').remove();
    }
    
    var styleSheet = document.createElement('style');
    styleSheet.id = 'moduleHeaderPrintStyles';
    styleSheet.textContent = 
      /* Hide print container by default on screen */
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
      
      '@media print {' +
        /* Hide EVERYTHING except the print container */
        'body > *:not(#printContainer) { display: none !important; }' +
        '#moduleHeaderRoot, .module-header, .module-header-spacer, #loader { display: none !important; }' +
        
        /* Hide body pseudo-elements (animated backgrounds from module-base.css) */
        'body::before, body::after { display: none !important; }' +
        
        /* Show and reset the print container */
        '#printContainer {' +
          'display: block !important;' +
          'position: static !important;' +
          'background: white !important;' +
          'padding: 0 !important;' +
          'margin: 0 !important;' +
        '}' +
        
        /* Each .page = exactly one printed page */
        '#printContainer .page {' +
          'page-break-after: always;' +
          'page-break-inside: avoid;' +
          'break-after: page;' +
          'break-inside: avoid;' +
          'height: 100vh;' +
          'max-height: 100vh;' +
          'overflow: hidden;' +
          'box-sizing: border-box;' +
          'position: relative;' +
        '}' +
        '#printContainer .page:last-child {' +
          'page-break-after: auto;' +
          'break-after: auto;' +
        '}' +
        
        /* The wrapper inside each page that holds scaled content */
        '#printContainer .print-page-wrapper {' +
          'position: relative;' +
          'width: 100%;' +
        '}' +
        
        /* CRITICAL: Override module-base.css overflow:hidden on cards */
        '#printContainer .rounded-3xl.shadow-xl,' +
        '#printContainer .rounded-3xl,' +
        '#printContainer .shadow-xl {' +
          'overflow: visible !important;' +
          'backdrop-filter: none !important;' +
          '-webkit-backdrop-filter: none !important;' +
        '}' +
        
        /* Override module-base.css button:not(.completion-btn) {display:none} */
        /* Our sanitizer already converts content buttons to divs, this catches any remaining */
        '#printContainer button { display: none !important; }' +
        
        /* Make sure converted content divs (from buttons) are visible */
        '#printContainer div.interactive-option,' +
        '#printContainer div.match-item,' +
        '#printContainer div.quiz-answer,' +
        '#printContainer div.scenario-option,' +
        '#printContainer div.quiz-option,' +
        '#printContainer div.sort-item {' +
          'display: block !important;' +
          'border: 1px solid #ccc !important;' +
          'margin-bottom: 6px !important;' +
          'padding: 8px 12px !important;' +
          'border-radius: 8px !important;' +
        '}' +
        
        /* Ensure colors print */
        '#printContainer, #printContainer * {' +
          '-webkit-print-color-adjust: exact !important;' +
          'print-color-adjust: exact !important;' +
          'color-adjust: exact !important;' +
        '}' +
        
        /* Ensure all text is visible (override background-clip:text from module-base.css headings) */
        '#printContainer h1, #printContainer h2, #printContainer h3,' +
        '#printContainer h4, #printContainer h5, #printContainer h6 {' +
          '-webkit-background-clip: unset !important;' +
          'background-clip: unset !important;' +
          '-webkit-text-fill-color: unset !important;' +
        '}' +
        
        /* Form elements */
        '#printContainer input[type="text"], #printContainer input[type="range"], #printContainer textarea {' +
          'border: 1px solid #999 !important;' +
          'background: white !important;' +
          'color: black !important;' +
        '}' +
        
        /* SVG lines for matching activities */
        '#printContainer svg.matching-lines { display: none !important; }' +
        
        /* Canvases - show border placeholder */
        '#printContainer canvas {' +
          'border: 2px dashed #ccc !important;' +
          'background: white !important;' +
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