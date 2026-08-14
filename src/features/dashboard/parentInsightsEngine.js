// ================================================
// PARENT INSIGHTS ENGINE
// Pure-function module: takes raw data, returns structured insights
// No DOM, no Supabase — deterministic and testable
// ================================================

// Confidence thresholds
const CONFIDENCE = {
  NOT_ENOUGH: 'not-enough-data',
  EARLY: 'early-signal',
  BUILDING: 'building-pattern',
  STRONG: 'strong-pattern'
}

const CONFIDENCE_LABELS = {
  [CONFIDENCE.NOT_ENOUGH]: 'Not enough data yet',
  [CONFIDENCE.EARLY]: 'Early signal',
  [CONFIDENCE.BUILDING]: 'Building pattern',
  [CONFIDENCE.STRONG]: 'Strong pattern'
}

export function determineConfidenceLevel(checkinCount, moduleCount) {
  if (checkinCount >= 10) return CONFIDENCE.STRONG
  if (checkinCount >= 5) return CONFIDENCE.BUILDING
  if (checkinCount >= 2 || moduleCount >= 3) return CONFIDENCE.EARLY
  return CONFIDENCE.NOT_ENOUGH
}

// ── Check-in → Super Skill recommendation ──
// Pure mapping from a weekly check-in (challenge + triggers) to one of the
// 7 Super Skills. Deliberately framed as a supportive learning suggestion,
// never a clinical assessment: "worth practising", not "your child has X".

var CHALLENGE_TO_SKILL = {
  'Morning routine': 'Behaviour Engineer',
  'School refusal / drop-off': 'Thought Driver',
  'Homework / focus': 'Behaviour Engineer',
  'Bedtime': 'Behaviour Engineer',
  'Sibling conflict': 'Social Mapper',
  'Social worries': 'Social Mapper',
  'Anger outbursts': 'Emotion Navigator',
  'Sensory overwhelm': 'Emotion Navigator'
}

var TRIGGER_TO_SKILL = {
  'Anger': 'Emotion Navigator',
  'Frustration': 'Emotion Navigator',
  'Overwhelm': 'Emotion Navigator',
  'Worry/Anxiety': 'Thought Driver',
  'Sadness': 'Resilience Architect'
}

var SKILL_REASONS = {
  'Emotion Navigator': 'noticing big feelings early and using calming tools before they take over',
  'Thought Driver': 'spotting worried or unhelpful thoughts and steering them somewhere more helpful',
  'Behaviour Engineer': 'building predictable routines and habits that make tricky moments smaller',
  'Social Mapper': 'reading social situations and practising what to say and do with others',
  'Resilience Architect': 'bouncing back from hard moments and building inner strength',
  'Brain Builder': 'understanding how the brain works — a great foundation for every other skill',
  'Future Designer': 'setting small goals and imagining the person they want to become'
}

/**
 * @param {Object|null} checkin - latest weekly check-in ({ challenge, triggers })
 * @returns {Object|null} { skillName, reason, message } or null when no signal
 */
export function computeCheckinRecommendation(checkin) {
  if (!checkin) return null

  var skillName = CHALLENGE_TO_SKILL[checkin.challenge] || null
  if (!skillName) {
    var triggers = checkin.triggers || []
    for (var i = 0; i < triggers.length && !skillName; i++) {
      skillName = TRIGGER_TO_SKILL[triggers[i]] || null
    }
  }
  if (!skillName) return null

  var reason = SKILL_REASONS[skillName] || 'practising this skill together'
  return {
    skillName: skillName,
    reason: reason,
    message: "Based on this week's check-in, Daniel recommends practising " + skillName +
      ' — ' + reason + '. A learning suggestion, not a diagnosis: you know your child best.'
  }
}

// ── Game metadata (mirrors the arcade registry — keeps this module pure) ──
var GAME_INFO = {
  'shield-sprint': { name: 'Shield Sprint', skill: 'Helpful self-talk' },
  'calm-river-rapids': { name: 'Calm River Rapids', skill: 'Pausing and noticing' },
  'courage-canyon': { name: 'Courage Canyon', skill: 'Breathing and courage' },
  'thought-forest': { name: 'Thought Forest', skill: 'Unhelpful thoughts' },
  'emotion-ocean': { name: 'Emotion Ocean', skill: 'Reading feelings' },
  'kindness-kingdom': { name: 'Kindness Kingdom', skill: 'Empathy and kindness' },
  'focus-firefly-forest': { name: 'Focus Firefly Forest', skill: 'Focus and attention' },
  'coping-cave': { name: 'Coping Cave', skill: 'Coping strategies' },
  'gratitude-garden': { name: 'Gratitude Garden', skill: 'Gratitude' },
  'breathing-bridge': { name: 'Breathing Bridge', skill: 'Calm breathing' }
}

export function gameInfoFor(gameId) {
  return GAME_INFO[gameId] || { name: gameId, skill: 'Wellbeing practice' }
}

// ── This week vs last week momentum ──
// Parents scan for "is it working *now*" before anything all-time. Counts
// every activity stream in two 7-day windows and summarises the direction.
export function computeWeeklyActivity(data) {
  var now = Date.now()
  var weekMs = 7 * 24 * 60 * 60 * 1000
  var weekAgo = now - weekMs
  var twoWeeksAgo = now - 2 * weekMs

  function countIn(rows, field, from, to) {
    return (rows || []).filter(function(r) {
      var raw = r[field]
      if (!raw) return false
      var t = new Date(raw).getTime()
      return t >= from && t < to
    }).length
  }

  function windowCounts(from, to) {
    return {
      modules: countIn(data.completedModules, 'completed_at', from, to),
      games: countIn(data.arcadePlays, 'created_at', from, to),
      quests: countIn(data.dailyQuests, 'completed_at', from, to),
      roadblocks: countIn(data.roadblocks, 'completed_at', from, to),
      checkins: countIn(data.weeklyCheckins, 'created_at', from, to) +
                countIn(data.moodCheckins, 'created_at', from, to)
    }
  }

  var thisWeek = windowCounts(weekAgo, now + 1)
  var lastWeek = windowCounts(twoWeeksAgo, weekAgo)

  function total(w) { return w.modules + w.games + w.quests + w.roadblocks + w.checkins }
  var thisTotal = total(thisWeek)
  var lastTotal = total(lastWeek)

  var trend = 'steady'
  if (thisTotal > lastTotal) trend = 'up'
  else if (thisTotal < lastTotal) trend = 'down'

  var summaryLine
  if (thisTotal === 0 && lastTotal === 0) {
    summaryLine = 'A quiet fortnight — a single module or daily quest is an easy way back in.'
  } else if (thisTotal === 0) {
    summaryLine = 'Quieter this week. No pressure — small, regular moments matter more than big bursts.'
  } else if (trend === 'up') {
    summaryLine = 'More activity than last week — momentum is building.'
  } else if (trend === 'down') {
    summaryLine = 'A little less than last week — completely normal. Consistency over weeks is what counts.'
  } else {
    summaryLine = 'A steady week — regular practice is exactly how skills stick.'
  }

  return {
    show: thisTotal > 0 || lastTotal > 0,
    thisWeek: thisWeek,
    lastWeek: lastWeek,
    thisTotal: thisTotal,
    lastTotal: lastTotal,
    trend: trend,
    summaryLine: summaryLine
  }
}

// ── The child's own voice ──
// After each arcade game the child answers one Super-Skill reflection
// ("Which helpful thought will you keep?" → "I can ask for help"). Their own
// words are the most meaningful data on this page — surface them verbatim.
export function computeChildVoice(arcadePlays) {
  var withReflection = (arcadePlays || []).filter(function(p) {
    return p.reflection && String(p.reflection).trim().length > 0
  })

  // Newest first, capped so the card stays scannable.
  withReflection.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at) })

  return withReflection.slice(0, 6).map(function(p) {
    var info = gameInfoFor(p.game_id)
    return {
      reflection: String(p.reflection).trim(),
      gameName: info.name,
      skill: info.skill,
      date: p.created_at
    }
  })
}

// ── Main entry point ──
export function computeInsights(rawData) {
  var child = rawData.child || {}
  var childModules = rawData.childModules || []
  var modules = rawData.modules || []
  var weeklyCheckins = rawData.weeklyCheckins || []
  var moodCheckins = rawData.moodCheckins || []
  var superSkills = rawData.superSkills || []
  var arcadePlays = rawData.arcadePlays || []
  var dailyQuests = rawData.dailyQuests || []
  var roadblocks = rawData.roadblocks || []
  var streak = rawData.streak || null

  var completedCMs = childModules.filter(function(cm) { return cm.is_completed === true })
  var completedModules = completedCMs.map(function(cm) {
    var mod = modules.find(function(m) { return m.id === cm.module_id })
    return mod ? Object.assign({}, mod, { completed_at: cm.completed_at, stars_awarded: cm.stars_awarded, xp_awarded: cm.xp_awarded, reflection_rating: cm.reflection_rating }) : null
  }).filter(Boolean)

  var inProgressCMs = childModules.filter(function(cm) { return cm.is_completed === false && cm.is_active })
  var inProgressModules = inProgressCMs.map(function(cm) {
    return modules.find(function(m) { return m.id === cm.module_id })
  }).filter(Boolean)

  var moduleCount = completedModules.length
  var checkinCount = weeklyCheckins.length
  var moodCount = moodCheckins.length
  var confidence = determineConfidenceLevel(checkinCount, moduleCount)

  var isNewUser = moduleCount === 0 && checkinCount === 0 && moodCount === 0 &&
    arcadePlays.length === 0 && dailyQuests.length === 0

  return {
    isNewUser: isNewUser,
    confidence: confidence,
    confidenceLabel: CONFIDENCE_LABELS[confidence],
    hero: computeHeroSummary(child, completedModules, inProgressModules, weeklyCheckins, moodCheckins, streak, arcadePlays),
    weeklyActivity: computeWeeklyActivity({
      completedModules: completedCMs,
      arcadePlays: arcadePlays,
      dailyQuests: dailyQuests,
      roadblocks: roadblocks,
      weeklyCheckins: weeklyCheckins,
      moodCheckins: moodCheckins
    }),
    childVoice: computeChildVoice(arcadePlays),
    observations: computeRecentObservations(completedModules, inProgressModules, weeklyCheckins, moodCheckins),
    patterns: computeEmergingPatterns(weeklyCheckins, moodCheckins, completedModules, superSkills, confidence),
    homeContext: computeHomeContext(weeklyCheckins),
    actions: computeWeeklyActions(weeklyCheckins, completedModules),
    celebrations: computeCelebrations(child, completedModules, moodCheckins, weeklyCheckins, arcadePlays, dailyQuests, streak),
    goalFollowUp: computeGoalFollowUp(weeklyCheckins),
    recommendation: computeCheckinRecommendation(weeklyCheckins[0] || null)
  }
}

// ── Hero Summary ──
function computeHeroSummary(child, completedModules, inProgressModules, weeklyCheckins, moodCheckins, streak, arcadePlays) {
  var level = child.level || 1
  var totalXp = child.total_xp || 0
  var xpPerLevel = 500
  var xpIntoLevel = totalXp - ((level - 1) * xpPerLevel)
  var progressPercent = Math.min(100, (xpIntoLevel / xpPerLevel) * 100)

  var totalCheckins = weeklyCheckins.length + moodCheckins.length
  var currentStreak = streak ? (streak.current_streak || 0) : (child.day_streak || child.streak || 0)
  var longestStreak = streak ? (streak.longest_streak || 0) : 0
  var gamesPlayed = (arcadePlays || []).length

  var engagementLine = ''
  if (completedModules.length === 0 && inProgressModules.length === 0) {
    engagementLine = 'Ready to begin the journey!'
  } else if (inProgressModules.length > 0) {
    engagementLine = 'Currently exploring ' + inProgressModules[0].title
  } else if (completedModules.length > 0) {
    engagementLine = 'Last completed: ' + completedModules[completedModules.length - 1].title
  }

  return {
    name: child.name || 'Your child',
    level: level,
    totalXp: totalXp,
    xpIntoLevel: xpIntoLevel,
    xpPerLevel: xpPerLevel,
    progressPercent: progressPercent,
    totalStars: child.stars || 0,
    modulesCompleted: completedModules.length,
    modulesInProgress: inProgressModules.length,
    totalCheckins: totalCheckins,
    currentStreak: currentStreak,
    longestStreak: longestStreak,
    gamesPlayed: gamesPlayed,
    engagementLine: engagementLine
  }
}

// ── Recent Observations ──
function computeRecentObservations(completedModules, inProgressModules, weeklyCheckins, moodCheckins) {
  // Last 5 completed modules
  var recentModules = completedModules.slice(-5).reverse().map(function(m) {
    return {
      title: m.title,
      category: m.category || '',
      completedAt: m.completed_at,
      reflection: m.reflection_rating || null
    }
  })

  // Latest weekly check-in
  var latestCheckin = weeklyCheckins.length > 0 ? weeklyCheckins[0] : null
  var latestCheckinSummary = null
  if (latestCheckin) {
    latestCheckinSummary = {
      intensity: latestCheckin.intensity,
      challenge: latestCheckin.challenge,
      triggers: normalizeArray(latestCheckin.triggers),
      goal: latestCheckin.goal,
      date: latestCheckin.created_at,
      previousGoalResult: latestCheckin.previous_goal_result || null
    }
  }

  // Mood trend
  var moodTrend = computeMoodTrend(moodCheckins)

  // Data label
  var parts = []
  if (completedModules.length > 0) parts.push(completedModules.length + ' completed module' + (completedModules.length !== 1 ? 's' : ''))
  if (weeklyCheckins.length > 0) parts.push(weeklyCheckins.length + ' weekly check-in' + (weeklyCheckins.length !== 1 ? 's' : ''))
  if (moodCheckins.length > 0) parts.push(moodCheckins.length + ' mood check-in' + (moodCheckins.length !== 1 ? 's' : ''))
  var dataLabel = parts.length > 0 ? 'Based on ' + parts.join(', ') : 'No activity data yet'

  return {
    recentModules: recentModules,
    inProgressModules: inProgressModules.slice(0, 3).map(function(m) { return { title: m.title, category: m.category } }),
    latestCheckin: latestCheckinSummary,
    moodTrend: moodTrend,
    dataLabel: dataLabel
  }
}

// ── Mood Trend ──
export function computeMoodTrend(moodCheckins) {
  if (!moodCheckins || moodCheckins.length === 0) {
    return { scores: [], direction: null, average: null, recentMoods: [] }
  }

  // Reverse so oldest first for trend calc
  var chronological = moodCheckins.slice().reverse()
  var scores = chronological.map(function(m) { return m.mood_score })
  var average = scores.reduce(function(a, b) { return a + b }, 0) / scores.length

  var direction = null
  if (scores.length >= 4) {
    var half = Math.floor(scores.length / 2)
    var firstHalf = scores.slice(0, half)
    var secondHalf = scores.slice(half)
    var firstAvg = firstHalf.reduce(function(a, b) { return a + b }, 0) / firstHalf.length
    var secondAvg = secondHalf.reduce(function(a, b) { return a + b }, 0) / secondHalf.length
    var delta = secondAvg - firstAvg
    if (delta > 0.4) direction = 'improving'
    else if (delta < -0.4) direction = 'dipping'
    else direction = 'stable'
  }

  // Recent moods for dot display (last 10, newest first)
  var recentMoods = moodCheckins.slice(0, 10).map(function(m) {
    return { score: m.mood_score, emoji: m.mood_emoji, label: m.mood_label, date: m.created_at, note: m.mood_note || null }
  })

  return {
    scores: scores,
    direction: direction,
    average: Math.round(average * 10) / 10,
    recentMoods: recentMoods
  }
}

// ── Emerging Patterns ──
function computeEmergingPatterns(weeklyCheckins, moodCheckins, completedModules, superSkills, confidence) {
  if (confidence === CONFIDENCE.NOT_ENOUGH) {
    return { show: false, confidenceLevel: confidence, confidenceLabel: CONFIDENCE_LABELS[confidence] }
  }

  // Trigger frequency from weekly check-ins
  var triggerCounts = {}
  weeklyCheckins.forEach(function(c) {
    normalizeArray(c.triggers).forEach(function(t) {
      triggerCounts[t] = (triggerCounts[t] || 0) + 1
    })
  })
  var triggerFrequency = Object.keys(triggerCounts).map(function(t) {
    return { trigger: t, count: triggerCounts[t] }
  }).sort(function(a, b) { return b.count - a.count })

  // Challenge frequency
  var challengeCounts = {}
  weeklyCheckins.forEach(function(c) {
    if (c.challenge) challengeCounts[c.challenge] = (challengeCounts[c.challenge] || 0) + 1
  })
  var challengeFrequency = Object.keys(challengeCounts).map(function(c) {
    return { challenge: c, count: challengeCounts[c] }
  }).sort(function(a, b) { return b.count - a.count })

  // Intensity trend
  var intensities = weeklyCheckins.slice().reverse().map(function(c) { return c.intensity })
  var intensityTrend = null
  if (intensities.length >= 3) {
    var iHalf = Math.floor(intensities.length / 2)
    var iFirst = intensities.slice(0, iHalf)
    var iSecond = intensities.slice(iHalf)
    var iFirstAvg = iFirst.reduce(function(a, b) { return a + b }, 0) / iFirst.length
    var iSecondAvg = iSecond.reduce(function(a, b) { return a + b }, 0) / iSecond.length
    var iDelta = iSecondAvg - iFirstAvg
    if (iDelta < -0.4) intensityTrend = 'easing'
    else if (iDelta > 0.4) intensityTrend = 'increasing'
    else intensityTrend = 'steady'
  }

  // Most practiced skill areas from module categories
  var categoryCounts = {}
  completedModules.forEach(function(m) {
    if (m.category) categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1
  })
  var skillAreas = Object.keys(categoryCounts).map(function(cat) {
    return { area: cat, count: categoryCounts[cat] }
  }).sort(function(a, b) { return b.count - a.count })

  // Super skill coverage
  var superSkillCounts = {}
  completedModules.forEach(function(m) {
    if (m.super_skill_id) {
      superSkillCounts[m.super_skill_id] = (superSkillCounts[m.super_skill_id] || 0) + 1
    }
  })
  var superSkillAreas = Object.keys(superSkillCounts).map(function(ssId) {
    var ss = superSkills.find(function(s) { return s.id === ssId })
    return { id: ssId, name: ss ? ss.name : 'Unknown', emoji: ss ? ss.emoji : '', count: superSkillCounts[ssId] }
  }).sort(function(a, b) { return b.count - a.count })

  // Mood direction
  var moodTrend = computeMoodTrend(moodCheckins)

  // Explanation
  var explanation = 'We identified these patterns from '
  var explParts = []
  if (weeklyCheckins.length > 0) explParts.push(weeklyCheckins.length + ' weekly check-in' + (weeklyCheckins.length !== 1 ? 's' : ''))
  if (completedModules.length > 0) explParts.push(completedModules.length + ' completed module' + (completedModules.length !== 1 ? 's' : ''))
  if (moodCheckins.length > 0) explParts.push(moodCheckins.length + ' mood rating' + (moodCheckins.length !== 1 ? 's' : ''))
  explanation += explParts.join(' and ') + '. As more data comes in, these patterns become more reliable.'

  return {
    show: true,
    confidenceLevel: confidence,
    confidenceLabel: CONFIDENCE_LABELS[confidence],
    triggerFrequency: triggerFrequency.slice(0, 5),
    challengeFrequency: challengeFrequency.slice(0, 3),
    intensityTrend: intensityTrend,
    moodDirection: moodTrend.direction,
    moodAverage: moodTrend.average,
    skillAreas: skillAreas.slice(0, 5),
    superSkillAreas: superSkillAreas.slice(0, 5),
    explanation: explanation
  }
}

// ── Home Context ──
function computeHomeContext(weeklyCheckins) {
  if (weeklyCheckins.length < 2) return null

  var triggerCounts = {}
  var challengeCounts = {}
  weeklyCheckins.forEach(function(c) {
    normalizeArray(c.triggers).forEach(function(t) { triggerCounts[t] = (triggerCounts[t] || 0) + 1 })
    if (c.challenge) challengeCounts[c.challenge] = (challengeCounts[c.challenge] || 0) + 1
  })

  var topTrigger = Object.keys(triggerCounts).sort(function(a, b) { return triggerCounts[b] - triggerCounts[a] })[0]
  var topChallenge = Object.keys(challengeCounts).sort(function(a, b) { return challengeCounts[b] - challengeCounts[a] })[0]

  if (!topTrigger || !topChallenge) return null

  var contextMap = {
    'Anger': 'Your child may show frustration through raised voices, physical tension, or shutting down. This is their nervous system\'s way of saying "this is too much right now."',
    'Overwhelm': 'When things pile up, your child might freeze, cry, or refuse to engage. They\'re not being difficult — their brain is trying to process too many inputs at once.',
    'Worry/Anxiety': 'Worry can show up as avoidance, repeated questions, tummy aches, or difficulty settling at night. These are normal signals that their brain is working hard to predict and prepare.',
    'Sadness': 'Your child might become quieter, more withdrawn, or lose interest in things they usually enjoy. Sadness is a natural response and naming it together can help.',
    'Frustration': 'Frustration often surfaces during tasks that feel hard or unfair. You might see tears, giving up quickly, or angry words. This is their way of saying "I need help but don\'t know how to ask."'
  }

  var description = contextMap[topTrigger] || null
  if (!description) return null

  return {
    topTrigger: topTrigger,
    topChallenge: topChallenge,
    description: description,
    basis: 'Based on ' + weeklyCheckins.length + ' check-ins where "' + topTrigger + '" appeared ' + triggerCounts[topTrigger] + ' time' + (triggerCounts[topTrigger] !== 1 ? 's' : '') + ' and "' + topChallenge + '" was the most common challenge.'
  }
}

// ── Weekly Actions ──
function computeWeeklyActions(weeklyCheckins, completedModules) {
  // Default generic actions
  var todayAction = {
    label: 'Try a feelings check-in',
    description: 'At a calm moment, ask your child: "What\'s one feeling you had today?" Just listen — no fixing needed.',
    tool: null
  }
  var parentScript = {
    title: 'The naming script',
    script: '"It sounds like you might be feeling [emotion]. That\'s okay. I\'m here."',
    context: 'Use when you notice a shift in your child\'s mood'
  }
  var celebrate = {
    text: 'Notice one small moment of calm or kindness today and name it out loud.'
  }

  if (weeklyCheckins.length > 0) {
    var recentTriggers = {}
    weeklyCheckins.slice(0, 3).forEach(function(c) {
      normalizeArray(c.triggers).forEach(function(t) { recentTriggers[t] = (recentTriggers[t] || 0) + 1 })
    })
    var topTrigger = Object.keys(recentTriggers).sort(function(a, b) { return recentTriggers[b] - recentTriggers[a] })[0]

    var toolMap = {
      'Anger': { label: 'Volcano Scale (1-5)', description: 'Ask: "If your volcano is a 1 to 5, what number are you right now? What helps you go down by one?"' },
      'Overwhelm': { label: '5-4-3-2-1 Grounding', description: 'Guide them through: 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.' },
      'Worry/Anxiety': { label: 'Belly Breathing', description: 'Place hands on belly together. Three slow breaths. Count "in 2-3-4, out 2-3-4-5."' },
      'Sadness': { label: 'Thought Bubble', description: 'Ask: "What is your brain telling you right now?" Write it down together, then ask: "Is that definitely true?"' },
      'Frustration': { label: 'Fix-It / Accept-It', description: 'Ask: "Can we fix this, or do we ride it out?" Then pick one small step together.' }
    }

    var scriptMap = {
      'Anger': { title: 'In the moment (anger)', script: '"I can see you\'re really angry. You\'re not in trouble. I\'m here. Let\'s do 3 slow breaths together."', context: 'Use when anger is escalating' },
      'Overwhelm': { title: 'When it\'s too much', script: '"This feels like too much right now. Let\'s make it smaller. What\'s one tiny next step?"', context: 'Use when your child shuts down or melts down' },
      'Worry/Anxiety': { title: 'Worry without feeding it', script: '"Thanks for telling me. Worry is trying to protect you. Let\'s take a breath and then make a plan."', context: 'Validate without reinforcing the worry' },
      'Sadness': { title: 'Sitting with sadness', script: '"It\'s okay to feel sad. You don\'t have to fix it. I\'m right here with you."', context: 'Use when your child is withdrawn or tearful' },
      'Frustration': { title: 'Frustration de-escalation', script: '"That was really hard. I get it. When you\'re ready, let\'s figure out one thing that might help."', context: 'Use after the peak, not during it' }
    }

    if (topTrigger && toolMap[topTrigger]) {
      todayAction = toolMap[topTrigger]
      todayAction.tool = topTrigger
    }
    if (topTrigger && scriptMap[topTrigger]) {
      parentScript = scriptMap[topTrigger]
    }
  }

  if (completedModules.length > 0) {
    var lastModule = completedModules[completedModules.length - 1]
    celebrate = { text: 'Your child finished "' + lastModule.title + '." Ask them what they remember most — they might surprise you.' }
  }

  return {
    todayAction: todayAction,
    parentScript: parentScript,
    celebrate: celebrate
  }
}

// ── Celebrations ──
function computeCelebrations(child, completedModules, moodCheckins, weeklyCheckins, arcadePlays, dailyQuests, streak) {
  var wins = []
  arcadePlays = arcadePlays || []
  dailyQuests = dailyQuests || []

  // Streak wins (login_streaks is the source of truth, child column fallback)
  var currentStreak = streak ? (streak.current_streak || 0) : (child.day_streak || 0)
  if (currentStreak >= 7) wins.push({ icon: '🔥', title: currentStreak + '-day streak', detail: 'Showing up every day — that\'s how habits form' })
  else if (currentStreak >= 3) wins.push({ icon: '🔥', title: currentStreak + ' days in a row', detail: 'A routine is starting to take shape' })

  // Practice through play
  var reflectionCount = arcadePlays.filter(function(p) { return p.reflection }).length
  if (reflectionCount >= 3) {
    wins.push({ icon: '💬', title: 'Reflecting after games', detail: reflectionCount + ' reflections shared in their own words — see "In their own words" above' })
  } else if (arcadePlays.length >= 5) {
    wins.push({ icon: '🎮', title: 'Practising through play', detail: arcadePlays.length + ' arcade games — each one rehearses a real skill' })
  }

  // Daily quest consistency
  if (dailyQuests.length >= 10) wins.push({ icon: '🗓️', title: 'Daily quest regular', detail: dailyQuests.length + ' daily quests — small check-ins building self-awareness' })
  else if (dailyQuests.length >= 3) wins.push({ icon: '🌤️', title: 'Daily quests started', detail: dailyQuests.length + ' quests done — a lovely daily rhythm forming' })

  // Module milestones
  var count = completedModules.length
  if (count >= 20) wins.push({ icon: '🏆', title: '20 modules completed', detail: 'Incredible dedication to emotional learning!' })
  else if (count >= 10) wins.push({ icon: '🌟', title: '10 modules completed', detail: 'A real commitment to growth!' })
  else if (count >= 5) wins.push({ icon: '⭐', title: '5 modules completed', detail: 'Building a strong foundation!' })
  else if (count >= 1) wins.push({ icon: '🎉', title: 'First module completed', detail: 'The journey has begun!' })

  // Star milestones
  var stars = child.stars || 0
  if (stars >= 100) wins.push({ icon: '💫', title: stars + ' stars earned', detail: 'Consistent effort across many activities' })
  else if (stars >= 50) wins.push({ icon: '✨', title: stars + ' stars earned', detail: 'Showing up and trying — that matters' })
  else if (stars >= 10) wins.push({ icon: '⭐', title: stars + ' stars earned', detail: 'Every star represents real engagement' })

  // Mood check-in engagement
  if (moodCheckins.length >= 10) wins.push({ icon: '💚', title: 'Regular mood check-ins', detail: moodCheckins.length + ' check-ins — building self-awareness' })
  else if (moodCheckins.length >= 3) wins.push({ icon: '🌱', title: 'Starting to share feelings', detail: moodCheckins.length + ' mood check-ins so far' })

  // Weekly check-in consistency
  if (weeklyCheckins.length >= 5) wins.push({ icon: '📋', title: 'Consistent weekly reflections', detail: weeklyCheckins.length + ' weekly check-ins — you\'re staying connected' })

  // Super skill depth (3+ modules in one area)
  var skillCounts = {}
  completedModules.forEach(function(m) {
    if (m.category) skillCounts[m.category] = (skillCounts[m.category] || 0) + 1
  })
  Object.keys(skillCounts).forEach(function(cat) {
    if (skillCounts[cat] >= 3) {
      wins.push({ icon: '🎯', title: 'Deep dive: ' + cat, detail: skillCounts[cat] + ' modules completed in this area' })
    }
  })

  // Module completion pace (completed a module in last 7 days)
  var now = Date.now()
  var recentCompletion = completedModules.some(function(m) {
    return m.completed_at && (now - new Date(m.completed_at).getTime()) < 7 * 24 * 60 * 60 * 1000
  })
  if (recentCompletion) {
    wins.push({ icon: '🔥', title: 'Active this week', detail: 'Completed a module in the last 7 days' })
  }

  // Positive reflection ratings
  var reflections = completedModules.filter(function(m) { return m.reflection_rating && m.reflection_rating >= 4 })
  if (reflections.length >= 3) {
    wins.push({ icon: '😊', title: 'Enjoying the journey', detail: reflections.length + ' modules rated positively after completion' })
  }

  return wins
}

// ── Goal Follow-Up ──
function computeGoalFollowUp(weeklyCheckins) {
  if (weeklyCheckins.length < 2) return null

  // The most recent check-in's previous_goal_result tells us about the goal from the check-in before it
  var latest = weeklyCheckins[0]
  var previous = weeklyCheckins[1]

  if (!previous.goal) return null

  return {
    previousGoal: previous.goal,
    result: latest.previous_goal_result || null,
    needsFollowUp: !latest.previous_goal_result
  }
}

// ── Utility ──
function normalizeArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') {
    try {
      var parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch (_) {}
    return value.replace(/[\{\}\[\]]/g, '').split(',').map(function(s) { return s.trim() }).filter(Boolean)
  }
  return []
}
