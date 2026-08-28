// Onboarding Walkthrough Modal
// Shows a step-by-step guide to using the app with screenshots

const ONBOARDING_STEPS = [
  {
    images: ['/images/steps/step1.webp'],
    title: 'Welcome to your dashboard',
    description: 'This is your home base. Here you can see Daniel, your stars, streak, rank, level, and your Daily Quest.'
  },
  {
    images: ['/images/steps/step2.webp'],
    title: 'Explore your Adventure Map',
    description: 'Your map shows your progress through each skill. Tap a node to start a module and move along the path.'
  },
  {
    images: ['/images/steps/step3.webp'],
    title: 'Unlock new places as you grow',
    description: 'As you complete more modules, your path grows from Trailhead to Village, Town Centre, and City.'
  },
  {
    images: ['/images/steps/step4.webp'],
    title: 'Choose a skill and cycle',
    description: 'Use the dropdowns to switch between different super skills and once you are finished a cycle, you can move onto the next.'
  },
  {
    images: ['/images/steps/step5.1.webp', '/images/steps/step5.2.webp'],
    imageLabels: ['Dashboard', 'Daily Quest'],
    title: 'Complete your Daily Quest',
    description: 'Tap the Daily Quest button on your dashboard to do a quick check-in. You might be asked to notice how your body feels or pick an emotion.'
  },
  {
    images: ['/images/steps/step6.1.webp', '/images/steps/step6.2.webp'],
    imageLabels: ['Earn Stars', 'Star Shop'],
    title: 'Earn stars and spend them',
    description: 'Complete quizzes in your modules to earn stars. Then visit the Star Shop to trade your stars for rewards. You can even add your own custom rewards!'
  }
]

// Preload all walkthrough images so they display instantly
let _imagesPreloaded = false
function preloadAllImages() {
  if (_imagesPreloaded) return
  _imagesPreloaded = true
  ONBOARDING_STEPS.forEach(function(step) {
    step.images.forEach(function(src) {
      var img = new Image()
      img.src = src
    })
  })
}

const LS_KEY = 'dd_onboarding_seen'

let currentStep = 0
let modalEl = null

function hasSeenOnboarding(childId) {
  return localStorage.getItem(`${LS_KEY}_${childId}`) === 'true'
}

function markOnboardingSeen(childId) {
  localStorage.setItem(`${LS_KEY}_${childId}`, 'true')
}

function clearOnboardingSeen(childId) {
  localStorage.removeItem(`${LS_KEY}_${childId}`)
}

function createModal() {
  if (modalEl) return modalEl

  const overlay = document.createElement('div')
  overlay.id = 'onboardingWalkthrough'
  overlay.innerHTML = `
    <div class="owt-backdrop"></div>
    <div class="owt-modal" role="dialog" aria-modal="true" aria-label="App walkthrough">
      <button class="owt-close" aria-label="Close walkthrough">&times;</button>

      <div class="owt-body">
        <div class="owt-image-area">
          <div class="owt-images" id="owtImages"></div>
        </div>

        <div class="owt-text-area">
          <div class="owt-step-counter" id="owtCounter">1 of 6</div>
          <h2 class="owt-title" id="owtTitle"></h2>
          <p class="owt-desc" id="owtDesc"></p>
        </div>
      </div>

      <div class="owt-footer">
        <div class="owt-dots" id="owtDots"></div>
        <div class="owt-buttons">
          <button class="owt-btn owt-btn-back" id="owtBack">Back</button>
          <button class="owt-btn owt-btn-next" id="owtNext">Next</button>
        </div>
      </div>

      <label class="owt-dont-show" id="owtDontShow">
        <input type="checkbox" id="owtDontShowCheck">
        <span>Don't show this again</span>
      </label>
    </div>
  `

  // Styles
  const style = document.createElement('style')
  style.textContent = `
    #onboardingWalkthrough {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    #onboardingWalkthrough.owt-visible {
      opacity: 1;
    }

    .owt-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(7, 16, 31, 0.85);
      backdrop-filter: blur(4px);
    }

    .owt-modal {
      position: relative;
      background: #fffff5;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(30, 35, 70, 0.35);
      max-width: 1100px;
      width: 96vw;
      height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: owtSlideUp 0.35s ease-out;
    }

    @keyframes owtSlideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .owt-close {
      position: absolute;
      top: 12px;
      right: 14px;
      z-index: 2;
      background: rgba(64, 88, 120, 0.08);
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 22px;
      color: #405878;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .owt-close:hover {
      background: rgba(64, 88, 120, 0.18);
    }

    .owt-body {
      flex: 1;
      overflow: hidden;
      padding: 0;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .owt-image-area {
      background: linear-gradient(135deg, #e8f0fe 0%, #f0f4ff 100%);
      padding: 32px 40px;
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
      min-height: 0;
    }

    .owt-images {
      display: flex;
      gap: 12px;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
    }

    .owt-images img {
      max-width: 100%;
      max-height: 100%;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(64, 92, 150, 0.15);
      object-fit: contain;
    }

    /* Phones: the tour images are wide desktop shots — letterboxing them
       into a tall card renders them tiny. Fill the space and crop instead. */
    @media (max-width: 540px) {
      .owt-images img {
        width: 100%;
        height: 100%;
        min-height: 40vh;
        object-fit: cover;
        object-position: top center;
      }
    }

    /* Two-image carousel: show one at a time at full size */
    .owt-images.owt-two-images {
      position: relative;
    }
    .owt-images.owt-two-images img {
      max-width: 100%;
      max-height: 100%;
      display: none;
    }
    .owt-images.owt-two-images img.owt-img-active {
      display: block;
    }

    .owt-img-tabs {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-top: 10px;
    }
    .owt-img-tab {
      padding: 5px 18px;
      border-radius: 20px;
      border: 1.5px solid #d4dbe6;
      background: white;
      font-family: 'Fredoka', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #5f6b85;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .owt-img-tab:hover {
      border-color: #14b8a6;
      color: #0d9488;
    }
    .owt-img-tab.owt-img-tab-active {
      background: #14b8a6;
      border-color: #14b8a6;
      color: white;
    }

    .owt-text-area {
      padding: 28px 40px 10px;
      text-align: center;
    }

    .owt-step-counter {
      font-family: 'Fredoka', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: #6b7c8f;
      margin-bottom: 6px;
      letter-spacing: 0.3px;
    }

    .owt-title {
      font-family: 'League Spartan', 'Fredoka', sans-serif;
      font-size: 26px;
      font-weight: 700;
      color: #2b3a55;
      margin: 0 0 8px;
    }

    .owt-desc {
      font-family: 'Fredoka', sans-serif;
      font-size: 16px;
      font-weight: 400;
      color: #5f6b85;
      margin: 0;
      line-height: 1.5;
      max-width: 640px;
      margin: 0 auto;
    }

    .owt-footer {
      padding: 16px 28px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .owt-dots {
      display: flex;
      gap: 8px;
    }

    .owt-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #d4dbe6;
      border: none;
      padding: 0;
      cursor: pointer;
      transition: all 0.25s ease;
    }
    .owt-dot.owt-dot-active {
      background: #14b8a6;
      width: 24px;
      border-radius: 5px;
    }

    .owt-buttons {
      display: flex;
      gap: 10px;
      width: 100%;
      justify-content: center;
    }

    .owt-btn {
      font-family: 'Fredoka', sans-serif;
      font-size: 15px;
      font-weight: 600;
      padding: 10px 28px;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 110px;
    }

    .owt-btn-back {
      background: #e8edf4;
      color: #405878;
    }
    .owt-btn-back:hover {
      background: #d8dfe8;
    }
    .owt-btn-back.owt-hidden {
      visibility: hidden;
    }

    .owt-btn-next {
      background: linear-gradient(135deg, #14b8a6, #0d9488);
      color: white;
      box-shadow: 0 2px 8px rgba(20, 184, 166, 0.3);
    }
    .owt-btn-next:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(20, 184, 166, 0.4);
    }

    .owt-dont-show {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 28px 18px;
      cursor: pointer;
      font-family: 'Fredoka', sans-serif;
      font-size: 13px;
      color: #6b7c8f;
      user-select: none;
      justify-content: center;
    }
    .owt-dont-show input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: #14b8a6;
      cursor: pointer;
    }


    .owt-img-skeleton {
      width: 80%;
      height: 70%;
      border-radius: 12px;
      background: linear-gradient(90deg, #e8edf4 25%, #f0f4ff 50%, #e8edf4 75%);
      background-size: 200% 100%;
      animation: owtShimmer 1.2s ease-in-out infinite;
    }

    @keyframes owtShimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (max-width: 768px) {
      .owt-modal {
        border-radius: 18px;
        height: 96vh;
        width: 98vw;
      }
      .owt-image-area {
        padding: 12px;
      }
      .owt-images img {
        max-height: 100%;
      }
      .owt-images.owt-two-images img {
        max-height: 100%;
      }
      .owt-title {
        font-size: 20px;
      }
      .owt-desc {
        font-size: 14px;
      }
      .owt-text-area {
        padding: 18px 20px 6px;
      }
      .owt-footer {
        padding: 12px 20px 8px;
      }
      .owt-btn {
        padding: 10px 20px;
        min-width: 90px;
      }
    }
  `

  document.head.appendChild(style)
  document.body.appendChild(overlay)
  modalEl = overlay

  // Event listeners
  overlay.querySelector('.owt-backdrop').addEventListener('click', closeWalkthrough)
  overlay.querySelector('.owt-close').addEventListener('click', closeWalkthrough)
  overlay.querySelector('#owtBack').addEventListener('click', prevStep)
  overlay.querySelector('#owtNext').addEventListener('click', nextStep)

  document.addEventListener('keydown', handleKeydown)

  return overlay
}

function handleKeydown(e) {
  if (!modalEl || modalEl.style.display === 'none') return
  if (e.key === 'Escape') closeWalkthrough()
  if (e.key === 'ArrowRight') nextStep()
  if (e.key === 'ArrowLeft') prevStep()
}

function renderStep() {
  const step = ONBOARDING_STEPS[currentStep]
  if (!step) return

  const imagesEl = document.getElementById('owtImages')
  const titleEl = document.getElementById('owtTitle')
  const descEl = document.getElementById('owtDesc')
  const counterEl = document.getElementById('owtCounter')
  const dotsEl = document.getElementById('owtDots')
  const backBtn = document.getElementById('owtBack')
  const nextBtn = document.getElementById('owtNext')

  // Images — show skeleton until loaded
  const isMulti = step.images.length > 1
  imagesEl.className = 'owt-images' + (isMulti ? ' owt-two-images' : '')
  imagesEl.innerHTML = '<div class="owt-img-skeleton"></div>'

  var loadedCount = 0
  var totalToLoad = isMulti ? 1 : 1 // only need first image visible before showing
  var allImgs = step.images.map(function(src, i) {
    var img = document.createElement('img')
    img.src = src
    img.alt = step.title
    img.className = i === 0 ? 'owt-img-active' : ''
    img.style.display = 'none'
    img.onload = function() {
      loadedCount++
      if (loadedCount >= totalToLoad) {
        var skel = imagesEl.querySelector('.owt-img-skeleton')
        if (skel) skel.remove()
        allImgs.forEach(function(im) { im.style.display = '' })
      }
    }
    imagesEl.appendChild(img)
    return img
  })
  // Fallback: remove skeleton after 3s even if load fails
  setTimeout(function() {
    var skel = imagesEl.querySelector('.owt-img-skeleton')
    if (skel) {
      skel.remove()
      allImgs.forEach(function(im) { im.style.display = '' })
    }
  }, 3000)

  // Image tabs for multi-image steps
  const existingTabs = document.getElementById('owtImgTabs')
  if (existingTabs) existingTabs.remove()

  if (isMulti && step.imageLabels) {
    const tabsDiv = document.createElement('div')
    tabsDiv.className = 'owt-img-tabs'
    tabsDiv.id = 'owtImgTabs'
    tabsDiv.innerHTML = step.imageLabels.map((label, i) =>
      `<button class="owt-img-tab${i === 0 ? ' owt-img-tab-active' : ''}" data-idx="${i}">${label}</button>`
    ).join('')

    // Insert tabs between image area and text area
    const imageArea = imagesEl.closest('.owt-image-area')
    imageArea.parentNode.insertBefore(tabsDiv, imageArea.nextSibling)

    tabsDiv.querySelectorAll('.owt-img-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const idx = parseInt(tab.dataset.idx)
        const imgs = imagesEl.querySelectorAll('img')
        imgs.forEach((img, i) => img.classList.toggle('owt-img-active', i === idx))
        tabsDiv.querySelectorAll('.owt-img-tab').forEach((t, i) =>
          t.classList.toggle('owt-img-tab-active', i === idx)
        )
      })
    })
  }

  // Text
  titleEl.textContent = step.title
  descEl.textContent = step.description
  counterEl.textContent = `${currentStep + 1} of ${ONBOARDING_STEPS.length}`

  // Dots
  dotsEl.innerHTML = ONBOARDING_STEPS.map((_, i) =>
    `<button class="owt-dot${i === currentStep ? ' owt-dot-active' : ''}" data-step="${i}" aria-label="Go to step ${i + 1}"></button>`
  ).join('')

  dotsEl.querySelectorAll('.owt-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      currentStep = parseInt(dot.dataset.step)
      renderStep()
    })
  })

  // Back button
  backBtn.classList.toggle('owt-hidden', currentStep === 0)

  // Next button
  if (currentStep === ONBOARDING_STEPS.length - 1) {
    nextBtn.textContent = 'Start Exploring'
  } else {
    nextBtn.textContent = 'Next'
  }
}

function nextStep() {
  if (currentStep < ONBOARDING_STEPS.length - 1) {
    currentStep++
    renderStep()
  } else {
    closeWalkthrough()
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--
    renderStep()
  }
}

export function openWalkthrough() {
  preloadAllImages()
  currentStep = 0
  const el = createModal()
  el.style.display = 'flex'
  document.body.style.overflow = 'hidden'
  requestAnimationFrame(() => {
    el.classList.add('owt-visible')
  })
  renderStep()
}

export function closeWalkthrough() {
  if (!modalEl) return

  // Check "don't show again"
  const checkbox = document.getElementById('owtDontShowCheck')
  if (checkbox && checkbox.checked) {
    const childId = window.state?.selectedChild?.id
    if (childId) markOnboardingSeen(childId)
  }

  modalEl.classList.remove('owt-visible')
  setTimeout(() => {
    modalEl.style.display = 'none'
    document.body.style.overflow = ''
  }, 250)
}

export function maybeShowOnboarding(childId) {
  if (!childId) return
  if (hasSeenOnboarding(childId)) return
  // Small delay so the dashboard finishes rendering first
  setTimeout(() => openWalkthrough(), 800)
}

export function addHelpButton() {
  // Wire up the header buttons (already in HTML)
  const desktopBtn = document.getElementById('howThisWorksBtn')
  const mobileBtn = document.getElementById('howThisWorksBtnMobile')

  if (desktopBtn && !desktopBtn._owtBound) {
    desktopBtn.addEventListener('click', openWalkthrough)
    desktopBtn._owtBound = true
  }
  if (mobileBtn && !mobileBtn._owtBound) {
    mobileBtn.addEventListener('click', openWalkthrough)
    mobileBtn._owtBound = true
  }

  // Start preloading images as soon as buttons are wired up
  preloadAllImages()
}
