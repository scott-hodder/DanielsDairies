import { supabase } from '../../supabaseClient.js'
import { escapeHtml } from '../../lib/sanitize.js'
import { dashboardState } from '../../state/dashboardState.js'
import { saveWeeklyCheckin } from '../../services/databaseService.js'
import { buildModuleUrl } from '../modules/moduleNavigation.js'
import { showToast } from '../../ui/toast.js'
import { KID_FRIENDLY_COPY } from '../../adventure-map-themes.js'

const state = dashboardState

// Check if a check-in is needed based on completed module count per super skill
export async function shouldTriggerCheckinForModuleCount(childId, superSkillId) {
  if (!childId) return false
  const CHECKIN_MODULE_INTERVAL = 3
  try {
    // Count completed modules for this child IN this super skill
    let completedCount = 0
    if (superSkillId) {
      const { data: completedModules, error: countError } = await supabase
        .from('child_modules')
        .select('id, modules!inner(super_skill_id)')
        .eq('child_id', childId)
        .eq('is_completed', true)
        .eq('modules.super_skill_id', superSkillId)

      if (countError) {
        console.error('[Check-in] Error counting completed modules:', countError)
        return false
      }
      completedCount = completedModules?.length || 0
    } else {
      const { data: completedModules, error: countError } = await supabase
        .from('child_modules')
        .select('id')
        .eq('child_id', childId)
        .eq('is_completed', true)

      if (countError) return false
      completedCount = completedModules?.length || 0
    }

    // Count check-ins for this child for this super skill's pathway
    let checkinCount = 0
    if (superSkillId) {
      const { data: skillData } = await supabase
        .from('super_skills')
        .select('slug')
        .eq('id', superSkillId)
        .single()

      const slug = skillData?.slug
      if (slug) {
        const { data: completedCheckins, error: checkinError } = await supabase
          .from('pathway_assessments')
          .select('id')
          .eq('child_id', childId)
          .eq('pathway_category', slug)
          .in('assessment_type', ['checkin', 'check_in'])

        if (!checkinError) {
          checkinCount = completedCheckins?.length || 0
        }
      }
    }
    // If no super skill or slug lookup failed, count all check-ins
    if (!superSkillId || checkinCount === 0) {
      const { data: allCheckins } = await supabase
        .from('pathway_assessments')
        .select('id')
        .eq('child_id', childId)
        .in('assessment_type', ['checkin', 'check_in'])
      checkinCount = allCheckins?.length || 0
    }

    // Expected check-ins: a baseline after the FIRST completed module
    // (replaces the old pre-play assessment that used to gate module 1),
    // then one per 3 completions (at 1, 4, 7, 10...)
    const expectedCheckins = completedCount >= 1
      ? 1 + Math.floor((completedCount - 1) / CHECKIN_MODULE_INTERVAL)
      : 0

    console.log('[Check-in] SuperSkill:', superSkillId, 'Completed:', completedCount, 'Check-ins done:', checkinCount, 'Expected:', expectedCheckins)

    if (expectedCheckins > 0 && checkinCount < expectedCheckins) {
      console.log('[Check-in] Triggering check-in - need to catch up')
      return true
    }

    return false
  } catch (e) {
    console.error('Error checking checkin status:', e)
    return false
  }
}

export function navigateToModule(module) {
  const moduleUrl = buildModuleUrl({
    link: `/module.html?code=${module.code}&moduleId=${module.id}&parentUserId=${state.currentUser.id}`
  }, state.selectedChild.id)
  window.location.href = moduleUrl
}

// Get super skill info for a module (character name, species, domain, image)
export async function getSuperSkillInfo(module) {
  let superSkill = null

  // Try to get from window.superSkills first
  if (module.super_skill_id && window.superSkills) {
    superSkill = window.superSkills.find(s => s.id === module.super_skill_id)
  }

  // If not found, try to fetch from database with character info
  if (!superSkill && module.super_skill_id) {
    try {
      const { data } = await supabase
        .from('super_skills')
        .select('*, characters:character_id(id, name, species, image_url)')
        .eq('id', module.super_skill_id)
        .single()
      if (data) superSkill = data
    } catch (e) {
      console.error('Error fetching super skill:', e)
    }
  }

  // Fallback: try to get from current adventure map category
  if (!superSkill) {
    const mapCat = window.enhancedDashboard?.adventureMap?.currentCategory ||
                   window.currentFocusSuperSkill || null
    if (mapCat && mapCat !== 'all' && window.superSkills) {
      superSkill = window.superSkills.find(s => s.slug === mapCat)
    }
  }

  // If still not found, try to fetch from database using the map category slug
  if (!superSkill) {
    const mapCat = window.enhancedDashboard?.adventureMap?.currentCategory ||
                   window.currentFocusSuperSkill || null
    if (mapCat && mapCat !== 'all') {
      try {
        const { data } = await supabase
          .from('super_skills')
          .select('*, characters:character_id(id, name, species, image_url)')
          .eq('slug', mapCat)
          .single()
        if (data) superSkill = data
      } catch (e) {
        console.error('Error fetching super skill by slug:', e)
      }
    }
  }

  return superSkill
}

// Show intro screen with Daniel + character before check-in
export function showEncouragementScreen(superSkill, onContinue, onClose) {
  const character = superSkill?.characters || {}
  const characterName = escapeHtml(character.name || superSkill?.character_name || 'Lenny')
  const characterImage = character.image_url || superSkill?.character_image_url || '/images/characters/lenny.png'
  const domain = escapeHtml(superSkill?.domain || superSkill?.name || 'your skills')

  // Pick a random encouragement message
  const encouragements = [
    { title: 'Amazing Progress!', emoji: '\u{1F31F}', message: `Wow, you're doing brilliantly! ${characterName} and Daniel are so proud of how far you've come with <strong>${domain}</strong>!` },
    { title: 'You\'re on Fire!', emoji: '\u{1F525}', message: `Look at you go! You've been working so hard - ${characterName} can't believe how much you've grown!` },
    { title: 'Super Star!', emoji: '\u2B50', message: `${characterName} says you're a real superstar! Every step you take in <strong>${domain}</strong> makes you stronger.` },
    { title: 'Keep It Up!', emoji: '\u{1F680}', message: `You're absolutely smashing it! Daniel and ${characterName} love adventuring with you through <strong>${domain}</strong>!` }
  ]
  const pick = encouragements[Math.floor(Math.random() * encouragements.length)]

  const overlay = document.createElement('div')
  overlay.className = 'intro-screen-overlay'
  overlay.id = 'encouragementScreenOverlay'
  overlay.innerHTML = `
    <div class="intro-screen-modal">
      <button class="intro-screen-close" id="closeEncouragementBtn" aria-label="Close">\u2715</button>

      <div class="intro-screen-characters">
        <div class="intro-character daniel">
          <img src="/images/characters/DanielTheDog.webp" alt="Daniel" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="intro-character-fallback" style="display:none;">\u{1F415}</div>
        </div>
        <div class="intro-character friend">
          <img src="${characterImage}" alt="${characterName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="intro-character-fallback" style="display:none;">${superSkill?.emoji || '\u{1F415}'}</div>
        </div>
      </div>

      <div class="intro-screen-content">
        <h2 class="intro-screen-title">${pick.emoji} ${pick.title}</h2>
        <p class="intro-screen-text">${pick.message}</p>
        <p class="intro-screen-text intro-checkin-prompt">
          Time for a quick check-in so we can see how you're feeling and keep the adventure going! \u{1F4AB}
        </p>
      </div>

      <button class="intro-screen-btn" id="continueEncouragementBtn">
        Let's Check In! \u2192
      </button>
    </div>
  `

  // Reuse existing intro screen styles (already injected by showIntroScreen)
  if (!document.getElementById('introScreenStyles')) {
    injectIntroScreenStyles()
  }

  document.body.appendChild(overlay)

  document.getElementById('continueEncouragementBtn').addEventListener('click', () => {
    overlay.remove()
    onContinue()
  })

  document.getElementById('closeEncouragementBtn').addEventListener('click', () => {
    overlay.remove()
    onClose()
  })
}

export function showIntroScreen(superSkill, onContinue, onClose) {

  // Get character info
  const character = superSkill?.characters || {}
  const characterName = character.name || superSkill?.character_name || 'Lenny'
  const characterSpecies = character.species || 'friend'
  const characterImage = character.image_url || superSkill?.character_image_url || '/images/characters/lenny.png'
  // superSkill.domain holds adult framing ("Prospection, Goal Setting, and
  // Identity Formation") — use the kid-friendly tag for the child screen.
  const kidCopy = KID_FRIENDLY_COPY[superSkill?.slug] || {}
  const domain = kidCopy.tag || superSkill?.name || 'important skills'
  const superSkillName = superSkill?.name || 'Super Skills'

  // Create intro overlay
  const overlay = document.createElement('div')
  overlay.className = 'intro-screen-overlay'
  overlay.id = 'introScreenOverlay'
  overlay.innerHTML = `
    <div class="intro-screen-modal">
      <button class="intro-screen-close" id="closeIntroBtn" aria-label="Close">\u2715</button>

      <div class="intro-screen-characters">
        <div class="intro-character daniel">
          <img src="/images/characters/DanielTheDog.webp" alt="Daniel" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="intro-character-fallback" style="display:none;">\u{1F415}</div>
        </div>
        <div class="intro-character friend">
          <img src="${characterImage}" alt="${characterName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="intro-character-fallback" style="display:none;">${superSkill?.emoji || '\u{1F415}'}</div>
        </div>
      </div>

      <div class="intro-screen-content">
        <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(20,184,166,0.12); border:1px solid rgba(20,184,166,0.25); border-radius:20px; padding:4px 14px; font-size:12px; font-weight:600; color:#0d9488; margin-bottom:12px;">\u{1F31F} First adventure in ${superSkillName}</div>
        <h2 class="intro-screen-title">Your adventure is about to begin!</h2>
        <p class="intro-screen-text">
          Hi! I'm <strong>Daniel</strong>, and this is my friend <strong>${characterName}</strong>. We're going to explore <strong>${domain}</strong> together!
        </p>
        <p class="intro-screen-text">
          ${characterName} knows so much about this - and they're really excited to share it with you. Every module is a new step on the path, and you'll earn stars along the way.
        </p>
        <p class="intro-screen-text intro-checkin-prompt">
          Before we dive in, let's do a quick check-in. It only takes a moment! \u{1F4AB}
        </p>
      </div>

      <button class="intro-screen-btn" id="continueToCheckinBtn">
        I'm ready! \u2192
      </button>
    </div>
  `

  // Add styles if not already present
  if (!document.getElementById('introScreenStyles')) {
    injectIntroScreenStyles()
  }

  document.body.appendChild(overlay)

  // Event listeners
  document.getElementById('continueToCheckinBtn').addEventListener('click', () => {
    overlay.remove()
    onContinue()
  })

  document.getElementById('closeIntroBtn').addEventListener('click', () => {
    overlay.remove()
    onClose()
  })
}

function injectIntroScreenStyles() {
  const styles = document.createElement('style')
  styles.id = 'introScreenStyles'
  styles.textContent = `
    .intro-screen-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    }
    .intro-screen-modal {
      background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
      border-radius: 24px;
      padding: 32px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      position: relative;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.4s ease;
      border: 2px solid rgba(20, 184, 166, 0.15);
    }
    .intro-screen-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(0, 0, 0, 0.1);
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .intro-screen-close:hover {
      background: rgba(0, 0, 0, 0.2);
    }
    .intro-screen-characters {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 24px;
    }
    .intro-character {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      overflow: visible;
      background: white;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      position: relative;
    }
    .intro-character img {
      width: 130px;
      height: 130px;
      object-fit: contain;
      object-position: center bottom;
    }
    .intro-character-fallback {
      font-size: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .intro-screen-title {
      font-size: 28px;
      font-weight: 700;
      color: #1a365d;
      margin-bottom: 16px;
    }
    .intro-screen-text {
      font-size: 16px;
      line-height: 1.6;
      color: #4a5568;
      margin-bottom: 12px;
    }
    .intro-checkin-prompt {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      padding: 12px 16px;
      border-radius: 12px;
      margin-top: 16px;
      font-weight: 500;
    }
    .intro-screen-btn {
      background: linear-gradient(135deg, #2b3a55 0%, #405878 100%);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 16px 32px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .intro-screen-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(43, 58, 85, 0.4);
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `
  document.head.appendChild(styles)
}

window.showCheckinPopup = showCheckinPopup
export async function showCheckinPopup(module, onComplete, skipIntro = false) {
  console.log('[showCheckinPopup] Called - skipIntro:', skipIntro, 'module:', module?.title || module?.id || module?.code, 'caller:', new Error().stack?.split('\n')[2]?.trim())
  // Determine the pathway/super skill for the psychometric assessment
  // Priority: module's super_skill_id -> current adventure map category -> 'general'
  let pathwayOrSuperSkill = 'general'

  // Get super skill info for intro screen
  const superSkill = await getSuperSkillInfo(module)

  if (superSkill && superSkill.slug) {
    pathwayOrSuperSkill = superSkill.slug
  } else {
    // Fallback: use the current adventure map category
    const mapCat = window.enhancedDashboard?.adventureMap?.currentCategory ||
                   window.currentFocusSuperSkill || 'general'
    if (mapCat && mapCat !== 'all') pathwayOrSuperSkill = mapCat
  }

  const childId = state.selectedChild?.id || window.state?.selectedChild?.id
  if (!childId) {
    onComplete()
    return
  }

  // Initialize the progress tracking system if needed
  if (window.progressTrackingSystem && !window.progressTrackingSystem.supabaseClient) {
    window.progressTrackingSystem.init(supabase)
  }

  const hasProgressTracking = !!window.progressTrackingSystem

  // Function to show the actual check-in assessment (only if progress tracking available)
  const showActualCheckin = () => {
    if (!hasProgressTracking) {
      onComplete()
      return
    }
    // Use 'checkin' assessment type for check-ins
    // Pass closeToDashboard: true so X button closes to dashboard, not module
    window.progressTrackingSystem.showAssessment(
      childId,
      pathwayOrSuperSkill,
      'checkin',
      // onComplete - assessment finished, also record in pathway_assessments so it won't trigger again
      async (results) => {
        try {
          // weekly_checkins.intensity has a CHECK (1..5) constraint; the raw
          // psychometric score (0..maxScore) is preserved in the notes field.
          const rawScore = Number(results?.totalScore) || 0
          const maxScore = Number(results?.maxScore) || 0
          const scaledIntensity = maxScore > 0
            ? Math.min(5, Math.max(1, Math.round((rawScore / maxScore) * 4) + 1))
            : 3
          await saveWeeklyCheckin({
            parentUserId: state.currentUser?.id || window.state?.currentUser?.id,
            childId: childId,
            intensity: scaledIntensity,
            challenge: pathwayOrSuperSkill,
            triggers: [],
            goal: null,
            notes: `Wellbeing check-in completed in the app — score ${rawScore} of ${maxScore}`,
            generatedPlan: null,
            subSkillId: module.sub_skill_id || null,
            weekNumber: Number(module.week_number || module.pathway_order || module.order || 0) || null,
            moduleId: module.id
          })
        } catch (e) {
          console.error('Error recording weekly checkin after assessment:', e)
        }
        onComplete()
      },
      // onSkip - user closed/skipped, return to dashboard (NOT navigate to module)
      () => {
        // Do nothing - just close the modal and stay on dashboard
      },
      // Pass module data for tracking
      module
    )
  }

  // Show intro screen first (unless skipped)
  console.log('[showCheckinPopup] Decision - skipIntro:', skipIntro, 'hasProgressTracking:', hasProgressTracking)
  if (!skipIntro) {
    // Create fallback super skill if none found
    const introSuperSkill = superSkill || {
      name: 'Super Skills',
      domain: 'important life skills',
      emoji: '\u{1F31F}',
      character_name: 'Lenny',
      character_image_url: '/images/characters/lenny.png',
      characters: {
        name: 'Lenny',
        species: 'Dog',
        image_url: '/images/characters/lenny.png'
      }
    }
    showIntroScreen(
      introSuperSkill,
      showActualCheckin,  // onContinue - show the check-in (or navigate if no tracking)
      () => {}             // onClose - return to dashboard
    )
  } else if (hasProgressTracking) {
    // Periodic check-in - show encouragement screen instead of character intro
    showEncouragementScreen(
      superSkill,
      showActualCheckin,
      () => {}
    )
  } else {
    onComplete()
  }
}

// Start module — one tap, straight in. Check-ins no longer gate play:
// they run AFTER a module is completed (see maybeShowPostCompletionCheckin),
// so nothing ever sits between the child and the content.
export async function startModule(module) {
  try {
    navigateToModule(module)
  } catch (error) {
    console.error('Error starting module:', error)
    showToast('Failed to start module. Please try again.', 'error')
  }
}

// After a module is completed the player stamps a flag (see module.html
// completeModuleDB); the dashboard calls this on the way back in. If the
// child is due a check-in (first completion = baseline, then every 3rd),
// Lenny asks THEN — at the moment of victory, never before play.
export async function maybeShowPostCompletionCheckin() {
  try {
    const childId = state.selectedChild?.id
    if (!childId) return false

    const flagKey = `dd_just_completed_${childId}`
    const raw = localStorage.getItem(flagKey)
    if (!raw) return false

    let flag = null
    try { flag = JSON.parse(raw) } catch (_) { /* legacy/corrupt flag */ }
    localStorage.removeItem(flagKey)
    // Stale flags (e.g. an old tab) don't get to interrupt today's session
    if (!flag || !flag.at || Date.now() - flag.at > 30 * 60 * 1000) return false

    const superSkillId = flag.superSkillId || null
    const needsCheckin = await shouldTriggerCheckinForModuleCount(childId, superSkillId)
    if (!needsCheckin) return false

    const moduleLike = {
      id: flag.moduleId || null,
      super_skill_id: superSkillId,
      title: flag.moduleTitle || ''
    }
    // skipIntro=true → the celebratory encouragement screen, then the
    // check-in. onComplete keeps the child on the dashboard.
    showCheckinPopup(moduleLike, () => {}, true)
    return true
  } catch (error) {
    console.error('Error running post-completion check-in:', error)
    return false
  }
}
