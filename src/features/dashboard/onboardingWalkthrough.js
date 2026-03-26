// Onboarding Walkthrough Modal
// Shows a step-by-step guide to using the app with screenshots

const ONBOARDING_STEPS = [
  {
    images: ['/images/steps/step1.png'],
    title: 'Welcome to your dashboard',
    description: "This is your home base! Here you'll find Daniel, your stars, your streak, and your Daily Quest — everything you need in one place."
  },
  {
    images: ['/images/steps/step2.png'],
    title: 'Explore your Adventure Map',
    description: "Your Adventure Map shows how far you've come. Tap any glowing node to start a module and keep moving forward."
  },
  {
    images: ['/images/steps/step3.png'],
    title: 'Unlock new places as you grow',
    description: 'As you complete more modules, your world grows! New places unlock as you progress — from Trailhead all the way to Town Center and beyond.'
  },
  {
    images: ['/images/steps/step4.png'],
    title: 'Choose a skill and cycle',
    description: 'You can explore different skills and learning cycles using the dropdowns at the top of your map.'
  },
  {
    images: ['/images/steps/step5.1.png', '/images/steps/step5.2.png'],
    imageLabels: ['Dashboard', 'Check-in'],
    title: 'Complete your Daily Quest',
    description: "Your Daily Quest is a quick check-in that takes just a moment. Tap it on your dashboard to share how you're feeling today."
  },
  {
    images: ['/images/steps/step6.1.png', '/images/steps/step6.2.png'],
    imageLabels: ['Earn Stars', 'Star Shop'],
    title: 'Earn stars and spend them',
    description: 'Earn stars by completing activities inside your modules. Then head to the Star Shop to trade them for rewards — you can even create your own custom ones!'
  },
  {
    isFinal: true,
    characterImage: '/images/characters/DanielTheDogHoldingHeart.webp',
    title: "You're all set!",
    description: "Daniel is excited to go on this adventure with you. Complete modules, earn stars, and watch yourself grow. Let's get started!"
  }
]

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
        <div class="owt-image-area" id="owtImageArea">
          <div class="owt-images" id="owtImages"></div>
        </div>

        <div class="owt-text-area">
          <div class="owt-step-counter" id="owtCounter">1 of 7</div>
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
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .owt-image-area.owt-sliding-out {
      opacity: 0;
      transform: translateX(-40px);
    }
    .owt-image-area.owt-sliding-in {
      opacity: 0;
      transform: translateX(40px);
    }
    .owt-image-area.owt-sliding-out-reverse {
      opacity: 0;
      transform: translateX(40px);
    }
    .owt-image-area.owt-sliding-in-reverse {
      opacity: 0;
      transform: translateX(-40px);
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

    /* Two-image carousel: show one at a time at full size */
    .owt-images.owt-two-images {
      position: relative;
    }
    .owt-images.owt-two-images img {
      max-width: 100%;
      max-height: 100%;
      display: none;
      animation: owtImgFadeIn 0.3s ease;
    }
    .owt-images.owt-two-images img.owt-img-active {
      display: block;
    }

    @keyframes owtImgFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }

    .owt-img-tabs {
      display: flex;
      gap: 8px;
      justify-content: center;
      padding: 10px 0 0;
      background: #fffff5;
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

    /* Final encouragement slide */
    .owt-final-slide {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      position: relative;
      overflow: hidden;
    }

    /* Floating decorative elements */
    .owt-final-slide::before {
      content: '';
      position: absolute;
      top: -60px;
      right: -60px;
      width: 200px;
      height: 200px;
      background: rgba(20, 184, 166, 0.12);
      border-radius: 50%;
    }
    .owt-final-slide::after {
      content: '';
      position: absolute;
      bottom: -40px;
      left: -40px;
      width: 160px;
      height: 160px;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 50%;
    }

    .owt-final-card {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 40px;
      background: linear-gradient(145deg, #2b3a55 0%, #405878 60%, #4c6c96 100%);
      border-radius: 28px;
      padding: 40px 50px;
      max-width: 780px;
      width: 90%;
      box-shadow:
        0 20px 50px rgba(43, 58, 85, 0.35),
        0 0 0 1px rgba(255, 255, 255, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
    }

    .owt-final-character-wrap {
      flex-shrink: 0;
      position: relative;
    }
    .owt-final-character-wrap::before {
      content: '';
      position: absolute;
      inset: -10px;
      background: radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, transparent 70%);
      border-radius: 50%;
      animation: owtGlow 3s ease-in-out infinite;
    }
    .owt-final-character {
      width: 180px;
      height: 180px;
      object-fit: contain;
      border-radius: 24px;
      position: relative;
      filter: drop-shadow(0 8px 24px rgba(0,0,0,0.3));
      animation: owtFloat 3s ease-in-out infinite;
    }

    .owt-final-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: white;
    }

    .owt-final-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(20, 184, 166, 0.2);
      border: 1px solid rgba(20, 184, 166, 0.35);
      border-radius: 20px;
      padding: 5px 14px;
      width: fit-content;
      font-family: 'Fredoka', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: #5eead4;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .owt-final-heading {
      font-family: 'League Spartan', 'Fredoka', sans-serif;
      font-size: 32px;
      font-weight: 800;
      color: white;
      margin: 0;
      line-height: 1.2;
    }

    .owt-final-text {
      font-family: 'Fredoka', sans-serif;
      font-size: 15px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.6;
      margin: 0;
    }

    .owt-final-stats {
      display: flex;
      gap: 20px;
      margin-top: 4px;
    }
    .owt-final-stat {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'Fredoka', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.7);
    }
    .owt-final-stat-icon {
      font-size: 18px;
    }

    /* Floating sparkles */
    .owt-sparkle {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      animation: owtSparkle 4s ease-in-out infinite;
    }
    .owt-sparkle:nth-child(1) { width: 6px; height: 6px; top: 15%; right: 12%; animation-delay: 0s; }
    .owt-sparkle:nth-child(2) { width: 4px; height: 4px; top: 30%; right: 25%; animation-delay: 1.2s; }
    .owt-sparkle:nth-child(3) { width: 5px; height: 5px; bottom: 20%; right: 18%; animation-delay: 2.4s; }
    .owt-sparkle:nth-child(4) { width: 3px; height: 3px; top: 60%; left: 8%; animation-delay: 0.8s; }

    @keyframes owtFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes owtGlow {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.08); }
    }
    @keyframes owtSparkle {
      0%, 100% { opacity: 0.2; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.6); }
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

    .owt-btn-start {
      background: linear-gradient(135deg, #2b3a55, #405878);
      color: white;
      box-shadow: 0 4px 14px rgba(43, 58, 85, 0.4);
      font-size: 16px;
      padding: 13px 38px;
      border-radius: 16px;
      letter-spacing: 0.3px;
    }
    .owt-btn-start:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(43, 58, 85, 0.45);
      background: linear-gradient(135deg, #364f66, #4c6c96);
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
      .owt-final-card {
        flex-direction: column;
        gap: 20px;
        padding: 28px 24px;
        text-align: center;
      }
      .owt-final-character {
        width: 120px;
        height: 120px;
      }
      .owt-final-heading {
        font-size: 24px;
      }
      .owt-final-stats {
        justify-content: center;
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

let isAnimating = false

function animateTransition(direction, callback) {
  if (isAnimating) return
  isAnimating = true

  const imageArea = document.getElementById('owtImageArea')
  const slideOut = direction === 'forward' ? 'owt-sliding-out' : 'owt-sliding-out-reverse'
  const slideIn = direction === 'forward' ? 'owt-sliding-in' : 'owt-sliding-in-reverse'

  imageArea.classList.add(slideOut)

  setTimeout(() => {
    callback()
    imageArea.classList.remove(slideOut)
    imageArea.classList.add(slideIn)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        imageArea.classList.remove(slideIn)
        isAnimating = false
      })
    })
  }, 200)
}

function renderStep() {
  const step = ONBOARDING_STEPS[currentStep]
  if (!step) return

  const imageArea = document.getElementById('owtImageArea')
  const imagesEl = document.getElementById('owtImages')
  const titleEl = document.getElementById('owtTitle')
  const descEl = document.getElementById('owtDesc')
  const counterEl = document.getElementById('owtCounter')
  const dotsEl = document.getElementById('owtDots')
  const backBtn = document.getElementById('owtBack')
  const nextBtn = document.getElementById('owtNext')

  // Remove image tabs if they exist
  const existingTabs = document.getElementById('owtImgTabs')
  if (existingTabs) existingTabs.remove()

  const textArea = titleEl.closest('.owt-text-area')

  // Final slide - special layout
  if (step.isFinal) {
    textArea.style.display = 'none'
    imageArea.style.background = 'linear-gradient(160deg, #e8f0fe 0%, #dbeafe 40%, #ede9fe 100%)'
    imagesEl.innerHTML = `
      <div class="owt-final-slide">
        <div class="owt-sparkle"></div>
        <div class="owt-sparkle"></div>
        <div class="owt-sparkle"></div>
        <div class="owt-sparkle"></div>
        <div class="owt-final-card">
          <div class="owt-final-character-wrap">
            <img class="owt-final-character" src="${step.characterImage}" alt="Daniel the Dog" />
          </div>
          <div class="owt-final-content">
            <div class="owt-final-badge">🎉 Adventure awaits</div>
            <h3 class="owt-final-heading">You're ready to begin your journey!</h3>
            <p class="owt-final-text">Daniel can't wait to explore with you. Complete modules to learn new skills, earn stars along the way, and watch yourself grow stronger every day.</p>
            <div class="owt-final-stats">
              <div class="owt-final-stat"><span class="owt-final-stat-icon">⭐</span> Earn stars</div>
              <div class="owt-final-stat"><span class="owt-final-stat-icon">🗺️</span> Explore the map</div>
              <div class="owt-final-stat"><span class="owt-final-stat-icon">📈</span> Level up</div>
            </div>
          </div>
        </div>
      </div>
    `
    imagesEl.className = 'owt-images'

    nextBtn.textContent = 'Start Exploring'
    nextBtn.className = 'owt-btn owt-btn-start'
  } else {
    textArea.style.display = ''
    imageArea.style.background = ''
    nextBtn.className = 'owt-btn owt-btn-next'
    nextBtn.textContent = 'Next'

    // Images
    const isMulti = step.images.length > 1
    imagesEl.className = 'owt-images' + (isMulti ? ' owt-two-images' : '')
    imagesEl.innerHTML = step.images.map((src, i) =>
      `<img src="${src}" alt="${step.title}" loading="eager" class="${i === 0 ? 'owt-img-active' : ''}">`
    ).join('')

    // Image tabs for multi-image steps
    if (isMulti && step.imageLabels) {
      const tabsDiv = document.createElement('div')
      tabsDiv.className = 'owt-img-tabs'
      tabsDiv.id = 'owtImgTabs'
      tabsDiv.innerHTML = step.imageLabels.map((label, i) =>
        `<button class="owt-img-tab${i === 0 ? ' owt-img-tab-active' : ''}" data-idx="${i}">${label}</button>`
      ).join('')

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
      const targetStep = parseInt(dot.dataset.step)
      const dir = targetStep > currentStep ? 'forward' : 'backward'
      animateTransition(dir, () => {
        currentStep = targetStep
        renderStep()
      })
    })
  })

  // Back button
  backBtn.classList.toggle('owt-hidden', currentStep === 0)
}

function nextStep() {
  if (isAnimating) return
  if (currentStep < ONBOARDING_STEPS.length - 1) {
    animateTransition('forward', () => {
      currentStep++
      renderStep()
    })
  } else {
    closeWalkthrough()
  }
}

function prevStep() {
  if (isAnimating) return
  if (currentStep > 0) {
    animateTransition('backward', () => {
      currentStep--
      renderStep()
    })
  }
}

export function openWalkthrough() {
  currentStep = 0
  isAnimating = false
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
}
