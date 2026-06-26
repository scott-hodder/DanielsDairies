import { escapeHtml } from '../../lib/sanitize.js'

// Local storage helpers for streaks (per child)
export function hasStreakPopupBeenShownToday(childId) {
  const today = new Date().toISOString().split('T')[0]
  const key = `streakPopup_child_${childId}_${today}`
  return localStorage.getItem(key) === 'true'
}

export function markStreakPopupAsShown(childId) {
  const today = new Date().toISOString().split('T')[0]
  const key = `streakPopup_child_${childId}_${today}`
  localStorage.setItem(key, 'true')
}

export function hasFirstStarCelebrationBeenShown(childId) {
  if (!childId) return false
  return localStorage.getItem(`firstStarCelebrated_child_${childId}`) === 'true'
}

export function markFirstStarCelebrationAsShown(childId) {
  if (!childId) return
  localStorage.setItem(`firstStarCelebrated_child_${childId}`, 'true')
}

export function ensureCelebrationPopupStyles() {
  if (document.getElementById('celebrationPopupStyles')) return

  const style = document.createElement('style')
  style.id = 'celebrationPopupStyles'
  style.textContent = `
    .celebration-popup-overlay {
      position: fixed;
      inset: 0;
      background: rgba(24, 34, 56, 0.45);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 10000;
      animation: celebrationFadeIn 0.25s ease;
    }

    .celebration-popup-card {
      position: relative;
      width: min(460px, 100%);
      border-radius: 28px;
      padding: 32px 28px 26px;
      color: #243b5a;
      text-align: center;
      background: linear-gradient(145deg, #fffff5 0%, #fef9ef 50%, #f0f7ff 100%);
      box-shadow: 0 20px 50px rgba(64, 88, 120, 0.22);
      overflow: hidden;
      animation: celebrationCardPop 0.35s ease;
      font-family: 'Fredoka', sans-serif;
    }

    .celebration-popup-glow {
      position: absolute;
      inset: auto auto -40px -30px;
      width: 180px;
      height: 180px;
      background: radial-gradient(circle, rgba(251, 191, 36, 0.28) 0%, rgba(251, 191, 36, 0) 70%);
      pointer-events: none;
    }

    .celebration-popup-stars {
      display: flex;
      justify-content: center;
      gap: 10px;
      font-size: 26px;
      margin-bottom: 16px;
    }

    .celebration-popup-stars span {
      animation: celebrationFloat 2.4s ease-in-out infinite;
    }

    .celebration-popup-stars span:nth-child(2) { animation-delay: 0.2s; }
    .celebration-popup-stars span:nth-child(3) { animation-delay: 0.4s; }

    .celebration-popup-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.85);
      color: #b45309;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    .celebration-popup-card h2 {
      margin: 0 0 12px;
      font-size: clamp(24px, 4vw, 30px);
      line-height: 1.15;
      color: #405878;
      font-family: 'Fredoka', sans-serif;
    }

    .celebration-popup-card p {
      margin: 0 auto 22px;
      max-width: 330px;
      font-size: 15px;
      line-height: 1.6;
      color: #5f6b85;
      font-family: 'Fredoka', sans-serif;
    }

    .celebration-popup-button {
      border: none;
      border-radius: 14px;
      padding: 14px 22px;
      min-width: 170px;
      background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
      color: #fff;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(20, 184, 166, 0.3);
      font-family: 'Fredoka', sans-serif;
    }

    .celebration-popup-button:hover {
      transform: translateY(-1px);
    }

    @keyframes celebrationFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes celebrationCardPop {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes celebrationFloat {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-8px) scale(1.08); }
    }
  `

  document.head.appendChild(style)
}

export function showFirstStarPopup(childName = 'Explorer') {
  ensureCelebrationPopupStyles()

  const existingPopup = document.getElementById('firstStarCelebrationPopup')
  if (existingPopup) existingPopup.remove()

  const overlay = document.createElement('div')
  overlay.id = 'firstStarCelebrationPopup'
  overlay.className = 'celebration-popup-overlay'
  overlay.innerHTML = `
    <div class="celebration-popup-card" role="dialog" aria-modal="true" aria-labelledby="firstStarCelebrationTitle">
      <div class="celebration-popup-glow"></div>
      <div class="celebration-popup-stars"><span>⭐</span><span>✨</span><span>🌟</span></div>
      <div class="celebration-popup-badge">Your very first star!</div>
      <h2 id="firstStarCelebrationTitle">Congratulations, ${childName}!</h2>
      <p>You just earned your very first star! Every module you complete brings more stars, and you can trade them for awesome rewards in the Star Shop.</p>
      <button type="button" class="celebration-popup-button" id="firstStarCelebrationClose">Let's keep going!</button>
    </div>
  `

  const closePopup = () => overlay.remove()
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closePopup()
  })

  document.body.appendChild(overlay)
  document.getElementById('firstStarCelebrationClose')?.addEventListener('click', closePopup)
}

export function createConfettiCelebration() {
    const colors = ['#7c3aed', '#ec4899', '#fbbf24', '#14b8a6', '#3b82f6', '#f97316', '#22c55e'];
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.width = (6 + Math.random() * 8) + 'px';
        piece.style.height = piece.style.width;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 0.5 + 's';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        container.appendChild(piece);
    }

    setTimeout(() => container.remove(), 3500);
}

export function maybeCelebrateFirstStar(childData) {
  const childId = childData?.id
  const totalStars = Number(childData?.stars ?? childData?.total_stars ?? 0)

  if (!childId || totalStars !== 1 || hasFirstStarCelebrationBeenShown(childId)) return false

  markFirstStarCelebrationAsShown(childId)
  createConfettiCelebration()
  showFirstStarPopup(childData?.name || 'Explorer')
  return true
}

// Get motivational message based on streak
export function getStreakMessage(streak) {
  if (streak === 1) return "Great start! Keep it going!"
  if (streak === 2) return "Two days in a row! You're on fire! 🔥"
  if (streak === 3) return "Three day streak! Building momentum!"
  if (streak === 5) return "Five days! You're developing a great habit!"
  if (streak === 7) return "One week streak! Amazing consistency! 🎉"
  if (streak === 10) return "Double digits! You're crushing it!"
  if (streak === 14) return "Two weeks! Your dedication is inspiring!"
  if (streak === 21) return "Three weeks! You're unstoppable!"
  if (streak === 30) return "One month! This is incredible! 🌟"
  if (streak === 50) return "50 days! You're a legend! 🏆"
  if (streak === 100) return "100 days! Absolutely phenomenal! 👑"
  if (streak % 7 === 0) return `${Math.floor(streak / 7)} weeks! Consistency is key!`
  if (streak % 10 === 0) return `${streak} days! Milestone reached! 🎯`
  return "Keep it going!"
}

// Streak popup UI — called when streak milestones are hit
export function showStreakPopup(childName, streak) {
  ensureCelebrationPopupStyles()

  const existingPopup = document.getElementById('streakCelebrationPopup')
  if (existingPopup) existingPopup.remove()

  const message = getStreakMessage(streak)
  const streakEmoji = streak >= 30 ? '👑' : streak >= 14 ? '💪' : streak >= 7 ? '🎉' : '🔥'

  // Day 1: "Streak started!" / Day 2+: "X Day Streak!"
  const badgeText = streak === 1 ? '🔥 Streak Started!' : `🔥 ${streak} Day Streak!`
  const bodyText = streak === 1
    ? `You've started your streak, ${childName}! Come back tomorrow to keep it going.`
    : `Way to go, ${childName}! ${streak} days in a row. Keep showing up!`

  const overlay = document.createElement('div')
  overlay.id = 'streakCelebrationPopup'
  overlay.className = 'celebration-popup-overlay'
  overlay.innerHTML = `
    <div class="celebration-popup-card" role="dialog" aria-modal="true" aria-labelledby="streakCelebrationTitle">
      <div class="celebration-popup-glow"></div>
      <div class="celebration-popup-stars"><span>${streakEmoji}</span><span>⭐</span><span>${streakEmoji}</span></div>
      <div class="celebration-popup-badge" style="color: #b45309;">${badgeText}</div>
      <h2 id="streakCelebrationTitle">${message}</h2>
      <p>${bodyText}</p>
      <button type="button" class="celebration-popup-button" id="streakCelebrationClose">Let's go!</button>
    </div>
  `

  const closePopup = () => overlay.remove()
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closePopup()
  })

  document.body.appendChild(overlay)
  document.getElementById('streakCelebrationClose')?.addEventListener('click', closePopup)
}

// Level-up celebration popup
export function showLevelUpPopup(childName, newLevel) {
  ensureCelebrationPopupStyles()

  const existingPopup = document.getElementById('levelUpCelebrationPopup')
  if (existingPopup) existingPopup.remove()

  const levelMessages = {
    2: "You're getting stronger!",
    3: "Look how far you've come!",
    4: "Village unlocked! New adventures await!",
    5: "You're becoming an expert!",
    6: "Incredible progress!",
    7: "Town Center unlocked! The world is growing!",
    8: "You're a real champion!",
    9: "Almost at the top!",
    10: "Metropolis unlocked! You're a legend!"
  }
  const message = levelMessages[newLevel] || `Level ${newLevel} reached! Amazing!`

  const overlay = document.createElement('div')
  overlay.id = 'levelUpCelebrationPopup'
  overlay.className = 'celebration-popup-overlay'
  overlay.innerHTML = `
    <div class="celebration-popup-card" role="dialog" aria-modal="true" aria-labelledby="levelUpTitle">
      <div class="celebration-popup-glow"></div>
      <div class="celebration-popup-stars"><span>🎉</span><span>⬆️</span><span>🎉</span></div>
      <div class="celebration-popup-badge" style="color: #b45309;">Level Up!</div>
      <h2 id="levelUpTitle">Level ${newLevel}!</h2>
      <p>${message} Keep exploring and learning, ${childName}!</p>
      <button type="button" class="celebration-popup-button" id="levelUpCelebrationClose">Awesome!</button>
    </div>
  `

  const closePopup = () => overlay.remove()
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closePopup()
  })

  document.body.appendChild(overlay)
  createConfettiCelebration()
  document.getElementById('levelUpCelebrationClose')?.addEventListener('click', closePopup)
}

// Welcome back message for returning users
export function showWelcomeBackBanner(childName, daysAway) {
  const existing = document.getElementById('welcomeBackBanner')
  if (existing) existing.remove()

  let message, emoji
  if (daysAway >= 14) {
    emoji = '🎉'
    message = `Welcome back, ${childName}! We really missed you. Daniel's been waiting for your next adventure!`
  } else if (daysAway >= 7) {
    emoji = '👋'
    message = `Hey ${childName}, it's been a while! Daniel's excited to see you again. Ready to jump back in?`
  } else if (daysAway >= 3) {
    emoji = '😊'
    message = `Welcome back, ${childName}! Let's pick up where you left off.`
  } else {
    return // Don't show for 1-2 days
  }

  const banner = document.createElement('div')
  banner.id = 'welcomeBackBanner'
  banner.style.cssText = 'background: linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%); border: 1.5px solid #bae6fd; border-radius: 16px; padding: 16px 20px; margin: 0 0 16px; display: flex; align-items: center; gap: 12px; animation: celebrationFadeIn 0.3s ease; cursor: pointer;'
  banner.innerHTML = `
    <span style="font-size: 28px;">${emoji}</span>
    <div style="flex: 1;">
      <div style="font-family: \'Fredoka\', sans-serif; font-weight: 600; color: #2b3a55; font-size: 15px; margin-bottom: 2px;">${message}</div>
    </div>
    <button style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 4px;" aria-label="Dismiss">&times;</button>
  `

  banner.querySelector('button').addEventListener('click', (e) => {
    e.stopPropagation()
    banner.remove()
  })

  // Insert at the top of the adventure map container or child detail view
  const mapContainer = document.getElementById('adventureMapContainer')
  const childDetail = document.getElementById('childDetailView')
  const target = mapContainer || childDetail
  if (target) {
    target.insertBefore(banner, target.firstChild)
  }
}
