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
  prevBtn.textContent = labels.prev ?? '← Back';
  prevBtn.type = 'button';

  const pageDisplay = document.createElement('div');
  pageDisplay.className = 'module-header__page';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'module-header__btn module-header__btn--nav';
  nextBtn.textContent = labels.next ?? 'Next →';
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
  homeButton.textContent = '🏠 Home';

  actionsSection.append(starButton);
  if (parentModeButton) {
    actionsSection.append(parentModeButton);
  }
  actionsSection.append(printButton, homeButton);

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
    spacer.style.height = computedHeight || '96px';
  } catch (error) {
    spacer.style.height = '96px';
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
    pageDisplay.textContent = `Page ${safeCurrent} of ${safeTotal}`;
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
    },
  };
}
