export function initModuleHeader(options = {}) {
  const {
    onPrev,
    onNext,
    onHome,
    onPrint,
    onShowStars,
    onToggleParentMode,
    showParentToggle = false,
    initialPage = { current: 1, total: 1 },
    initialStars = 0,
    parentModeEnabled = false,
    labels = {},
  } = options;

  const header = document.createElement('header');
  header.className = 'module-header no-print';

  const navSection = document.createElement('div');
  navSection.className = 'module-header__nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'module-header__btn module-header__btn--nav';
  prevBtn.textContent = labels.prev ?? '←';
  prevBtn.setAttribute('aria-label', 'Previous page');
  prevBtn.type = 'button';

  const pageDisplay = document.createElement('div');
  pageDisplay.className = 'module-header__page';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'module-header__btn module-header__btn--nav';
  nextBtn.textContent = labels.next ?? '→';
  nextBtn.setAttribute('aria-label', 'Next page');
  nextBtn.type = 'button';

  navSection.append(prevBtn, pageDisplay, nextBtn);

  const actionsSection = document.createElement('div');
  actionsSection.className = 'module-header__actions';

  const starButton = document.createElement('button');
  starButton.className = 'module-header__star';
  starButton.type = 'button';
  starButton.innerHTML = `
    <span class="star-icon">⭐</span>
    <span data-role="star-count">${initialStars}</span>
  `;

  const printButton = document.createElement('button');
  printButton.className = 'module-header__btn module-header__print';
  printButton.type = 'button';
  printButton.textContent = '🖨 Print';

  let parentModeButton = null;
  if (showParentToggle) {
    parentModeButton = document.createElement('button');
    parentModeButton.className = 'module-header__btn module-header__parent';
    parentModeButton.type = 'button';
  }

  const homeButton = document.createElement('button');
  homeButton.className = 'module-header__btn module-header__home';
  homeButton.type = 'button';
  homeButton.innerHTML = '<span class="btn-icon">🏠</span><span class="btn-text"> Home</span>';
  homeButton.setAttribute('aria-label', 'Go home');

  actionsSection.append(starButton);
  if (parentModeButton) {
    actionsSection.append(parentModeButton);
  }
  actionsSection.append(printButton, homeButton);

  // Create hamburger menu button for mobile
  const hamburgerBtn = document.createElement('button');
  hamburgerBtn.className = 'module-header__hamburger';
  hamburgerBtn.type = 'button';
  hamburgerBtn.innerHTML = '☰';
  hamburgerBtn.setAttribute('aria-label', 'Open menu');
  actionsSection.append(hamburgerBtn);

  // Create mobile menu overlay
  const mobileMenu = document.createElement('div');
  mobileMenu.className = 'module-header__mobile-menu';
  mobileMenu.innerHTML = `
    <div class="module-header__mobile-menu-content">
      <div class="module-header__mobile-menu-header">
        <span style="font-weight: 700; color: var(--module-header-text, #1e3a5f);">Menu</span>
        <button class="module-header__mobile-menu-close" aria-label="Close menu">×</button>
      </div>
      <div class="module-header__mobile-menu-actions"></div>
    </div>
  `;

  // Clone buttons for mobile menu
  const mobileMenuActions = mobileMenu.querySelector('.module-header__mobile-menu-actions');
  
  const mobileHomeBtn = document.createElement('button');
  mobileHomeBtn.className = 'module-header__btn module-header__home';
  mobileHomeBtn.type = 'button';
  mobileHomeBtn.textContent = '🏠 Home';
  
  const mobilePrintBtn = document.createElement('button');
  mobilePrintBtn.className = 'module-header__btn module-header__print';
  mobilePrintBtn.type = 'button';
  mobilePrintBtn.textContent = '🖨 Print';

  mobileMenuActions.append(mobileHomeBtn, mobilePrintBtn);
  
  if (showParentToggle) {
    const mobileParentBtn = document.createElement('button');
    mobileParentBtn.className = 'module-header__btn module-header__parent';
    mobileParentBtn.type = 'button';
    mobileParentBtn.textContent = parentModeEnabled ? '👨‍👩‍👧 Parent Mode ON' : '👨‍👩‍👧 Parent Mode';
    mobileMenuActions.append(mobileParentBtn);
    
    if (typeof onToggleParentMode === 'function') {
      mobileParentBtn.addEventListener('click', () => {
        onToggleParentMode();
        closeMobileMenu();
      });
    }
  }

  document.body.appendChild(mobileMenu);

  // Mobile menu toggle functions
  function openMobileMenu() {
    mobileMenu.style.display = 'block';
    requestAnimationFrame(() => {
      mobileMenu.classList.add('active');
    });
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove('active');
    setTimeout(() => {
      mobileMenu.style.display = 'none';
    }, 300);
  }

  hamburgerBtn.addEventListener('click', openMobileMenu);
  mobileMenu.querySelector('.module-header__mobile-menu-close').addEventListener('click', closeMobileMenu);
  mobileMenu.addEventListener('click', (e) => {
    if (e.target === mobileMenu) closeMobileMenu();
  });

  mobileHomeBtn.addEventListener('click', () => {
    if (typeof onHome === 'function') {
      onHome();
    } else {
      defaultGoHome();
    }
    closeMobileMenu();
  });

  mobilePrintBtn.addEventListener('click', () => {
    if (typeof onPrint === 'function') {
      onPrint();
    } else if (typeof window.print === 'function') {
      window.print();
    }
    closeMobileMenu();
  });

  const inner = document.createElement('div');
  inner.className = 'module-header__inner';
  inner.append(navSection, actionsSection);
  header.appendChild(inner);

  document.body.prepend(header);
  const spacer = document.createElement('div');
  spacer.className = 'module-header-spacer no-print';

  // Ensure there is always enough space below the fixed header
  try {
    const computedHeight = getComputedStyle(document.documentElement)
      .getPropertyValue('--module-header-height')
      .trim();
    spacer.style.height = computedHeight || '75px';
  } catch (error) {
    spacer.style.height = '75px';
  }

  header.after(spacer);

  let starSourceObserver = null;
  let starSourceCheck = null;

  function attachStarSourceWatcher() {
    const sourceEl = document.getElementById('starCount');
    if (!sourceEl) return false;

    const readAndUpdate = () => {
      const value = (sourceEl.textContent || '').trim();
      const asNumber = Number(value);
      updateStarCount(Number.isFinite(asNumber) ? asNumber : value);
    };

    readAndUpdate();

    if (starSourceObserver) {
      starSourceObserver.disconnect();
    }

    starSourceObserver = new MutationObserver(readAndUpdate);
    starSourceObserver.observe(sourceEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return true;
  }

  function startStarSourcePolling() {
    if (attachStarSourceWatcher()) return;
    starSourceCheck = window.setInterval(() => {
      if (attachStarSourceWatcher()) {
        window.clearInterval(starSourceCheck);
        starSourceCheck = null;
      }
    }, 500);
  }

  function normalizePageValue(value, fallback = 1) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(1, Math.round(numeric));
  }

  function updatePageDisplay(current = 1, total = 1) {
    const safeTotal = normalizePageValue(total, 1);
    const safeCurrent = Math.min(normalizePageValue(current, 1), safeTotal);
    pageDisplay.textContent = `${safeCurrent}/${safeTotal}`;
    
    // Debug logging
    console.log(`[ModuleHeader] Page update: ${safeCurrent}/${safeTotal}`);
    
    // Check if user has reached the last page
    if (safeCurrent === safeTotal && safeTotal > 1) {
      console.log(`[ModuleHeader] Last page detected! Triggering completion...`);
      handleModuleCompletion();
    }
  }

  function updateParentMode(enabled) {
    if (!parentModeButton) return;
    parentModeButton.textContent = enabled ? '👨‍👩‍👧 Parent Mode ON' : '👨‍👩‍👧 Parent Mode';
    parentModeButton.classList.toggle('is-on', enabled);
  }

  function updateStarCount(stars) {
    const starCountEl = starButton.querySelector('[data-role="star-count"]');
    if (starCountEl) {
      starCountEl.textContent = stars;
    }
  }

  let moduleCompletionHandled = false;

  function handleModuleCompletion() {
    // Prevent multiple completions
    if (moduleCompletionHandled) {
      console.log('[ModuleHeader] Module completion already handled, skipping...');
      return;
    }
    moduleCompletionHandled = true;

    console.log('[ModuleHeader] Handling module completion...');

    // Get module parameters from URL
    try {
      const params = new URLSearchParams(window.location.search);
      const childId = params.get('childId');
      const moduleId = params.get('moduleId');
      
      console.log(`[ModuleHeader] URL params - childId: ${childId}, moduleId: ${moduleId}`);
      
      if (childId && moduleId) {
        // Mark module as completed
        completeModule(childId, moduleId);
      } else {
        console.error('[ModuleHeader] Missing childId or moduleId in URL');
      }
    } catch (error) {
      console.error('[ModuleHeader] Error parsing URL for module completion:', error);
    }
  }

  async function completeModule(childId, moduleId) {
    try {
      // Import the database function (dynamically to avoid circular dependencies)
      const { updateChildModuleStatus } = await import('../src/database.js');
      
      // Update module status to completed
      await updateChildModuleStatus(childId, moduleId, 'completed');
      
      // Show completion celebration
      showCompletionCelebration();
      
      console.log('[ModuleHeader] Module completed successfully');
    } catch (error) {
      console.error('[ModuleHeader] Error completing module:', error);
    }
  }

  function showCompletionCelebration() {
    // Create celebration modal
    const modal = document.createElement('div');
    modal.className = 'module-completion-modal';
    modal.innerHTML = `
      <div class="module-completion-content">
        <div class="completion-emoji">🎉</div>
        <h2 class="completion-title">Module Complete!</h2>
        <p class="completion-message">Congratulations! You've finished this module and learned valuable emotional skills.</p>
        <div class="completion-confetti" id="completionConfetti"></div>
        <button class="completion-btn" onclick="closeCompletionModal()">Continue Journey</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Generate confetti
    generateCompletionConfetti();
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      closeCompletionModal();
    }, 5000);
  }

  function generateCompletionConfetti() {
    const container = document.getElementById('completionConfetti');
    if (!container) return;
    
    container.innerHTML = '';
    const pieceCount = 40;
    
    for (let i = 0; i < pieceCount; i++) {
      const piece = document.createElement('div');
      piece.className = 'completion-confetti-piece';
      
      const randomX = Math.random() * 300 - 150;
      const randomDelay = Math.random() * 0.3;
      const colors = ['#f4a261', '#e76f51', '#2a9d8f', '#405878', '#4c6c96', '#ab47bc'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      piece.style.left = Math.random() * 100 + '%';
      piece.style.top = Math.random() * 50 + '%';
      piece.style.setProperty('--tx', randomX + 'px');
      piece.style.animationDelay = randomDelay + 's';
      piece.style.backgroundColor = randomColor;
      
      container.appendChild(piece);
    }
  }

  // Make close function globally accessible
  window.closeCompletionModal = function() {
    const modal = document.querySelector('.module-completion-modal');
    if (modal) {
      modal.remove();
    }
  };

  updatePageDisplay(initialPage.current, initialPage.total);
  updateStarCount(initialStars);
  updateParentMode(parentModeEnabled);
  startStarSourcePolling();

  if (typeof onPrev === 'function') {
    prevBtn.addEventListener('click', () => onPrev());
  } else {
    prevBtn.disabled = true;
  }

  if (typeof onNext === 'function') {
    nextBtn.addEventListener('click', () => onNext());
  } else {
    nextBtn.disabled = true;
  }

  function defaultGoHome() {
    if (typeof window.goHome === 'function') {
      try {
        window.goHome();
        return;
      } catch (error) {
        console.warn('[ModuleHeader] window.goHome threw an error:', error);
      }
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const childId = params.get('childId');
      if (childId) {
        window.location.href = `/dashboard.html?childId=${encodeURIComponent(childId)}`;
        return;
      }
    } catch (error) {
      console.warn('[ModuleHeader] Failed to parse URL params:', error);
    }

    if (document.referrer) {
      window.location.href = document.referrer;
      return;
    }

    window.location.href = '/dashboard.html';
  }

  homeButton.addEventListener('click', () => {
    if (typeof onHome === 'function') {
      onHome();
    } else {
      defaultGoHome();
    }
  });

  printButton.addEventListener('click', () => {
    if (typeof onPrint === 'function') {
      onPrint();
    } else if (typeof window.print === 'function') {
      window.print();
    }
  });

  if (typeof onShowStars === 'function') {
    starButton.addEventListener('click', () => onShowStars());
  }

  if (parentModeButton && typeof onToggleParentMode === 'function') {
    parentModeButton.addEventListener('click', () => onToggleParentMode());
  } else if (parentModeButton) {
    parentModeButton.style.display = 'none';
  }

  return {
    updatePage(current, total, options = {}) {
      updatePageDisplay(current, total);
      if (typeof options.canPrev === 'boolean') {
        prevBtn.disabled = !options.canPrev;
      }
      if (typeof options.canNext === 'boolean') {
        nextBtn.disabled = !options.canNext;
      }
    },
    updateStars(stars) {
      updateStarCount(stars);
    },
    setParentMode(enabled) {
      updateParentMode(enabled);
    },
    destroy() {
      if (starSourceObserver) {
        starSourceObserver.disconnect();
        starSourceObserver = null;
      }
      if (starSourceCheck) {
        window.clearInterval(starSourceCheck);
        starSourceCheck = null;
      }
      header.remove();
      spacer.remove();
      mobileMenu.remove();
    },
  };
}