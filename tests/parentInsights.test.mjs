import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeWeeklyActivity,
  computeChildVoice,
  gameInfoFor,
  computeInsights,
  computeSkillGrowth,
  computeCorrelationInsight,
  collectActivityTimes
} from '../src/features/dashboard/parentInsightsEngine.js'

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

test('weekly activity counts this week vs last week per stream', () => {
  const activity = computeWeeklyActivity({
    completedModules: [{ completed_at: daysAgo(1) }, { completed_at: daysAgo(9) }],
    arcadePlays: [{ created_at: daysAgo(2) }, { created_at: daysAgo(3) }],
    dailyQuests: [{ completed_at: daysAgo(8) }],
    roadblocks: [],
    weeklyCheckins: [{ created_at: daysAgo(1) }],
    moodCheckins: [{ created_at: daysAgo(12) }]
  })
  assert.equal(activity.thisWeek.modules, 1)
  assert.equal(activity.thisWeek.games, 2)
  assert.equal(activity.thisWeek.checkins, 1)
  assert.equal(activity.lastWeek.modules, 1)
  assert.equal(activity.lastWeek.quests, 1)
  assert.equal(activity.lastWeek.checkins, 1)
  assert.equal(activity.thisTotal, 4)
  assert.equal(activity.lastTotal, 3)
  assert.equal(activity.trend, 'up')
  assert.ok(activity.show)
})

test('weekly activity hides with no data and never guilts on quiet weeks', () => {
  const empty = computeWeeklyActivity({ completedModules: [], arcadePlays: [], dailyQuests: [], roadblocks: [], weeklyCheckins: [], moodCheckins: [] })
  assert.equal(empty.show, false)

  const quiet = computeWeeklyActivity({
    completedModules: [{ completed_at: daysAgo(10) }],
    arcadePlays: [], dailyQuests: [], roadblocks: [], weeklyCheckins: [], moodCheckins: []
  })
  assert.equal(quiet.trend, 'down')
  assert.match(quiet.summaryLine, /No pressure/i)
})

test('child voice returns newest reflections first, capped at 6', () => {
  const plays = []
  for (let i = 0; i < 9; i++) {
    plays.push({ game_id: 'shield-sprint', reflection: `answer ${i}`, created_at: daysAgo(i) })
  }
  plays.push({ game_id: 'coping-cave', reflection: '   ', created_at: daysAgo(0) }) // blank → excluded
  plays.push({ game_id: 'coping-cave', reflection: null, created_at: daysAgo(0) })  // null → excluded

  const voice = computeChildVoice(plays)
  assert.equal(voice.length, 6)
  assert.equal(voice[0].reflection, 'answer 0')
  assert.equal(voice[0].gameName, 'Shield Sprint')
  assert.equal(voice[0].skill, 'Helpful self-talk')
})

test('unknown game ids get a safe fallback name', () => {
  assert.equal(gameInfoFor('mystery-game').skill, 'Wellbeing practice')
})

test('computeInsights includes new streams and treats play-only accounts as active', () => {
  const insights = computeInsights({
    child: { name: 'Testy', level: 2, total_xp: 700, stars: 12 },
    childModules: [], modules: [], weeklyCheckins: [], moodCheckins: [], superSkills: [],
    arcadePlays: [{ game_id: 'emotion-ocean', reflection: 'Ask them how they feel', created_at: daysAgo(1) }],
    dailyQuests: [{ completed_at: daysAgo(2) }],
    roadblocks: [],
    streak: { current_streak: 4, longest_streak: 9 }
  })
  assert.equal(insights.isNewUser, false)
  assert.equal(insights.hero.currentStreak, 4)
  assert.equal(insights.hero.gamesPlayed, 1)
  assert.equal(insights.childVoice.length, 1)
  assert.ok(insights.weeklyActivity.show)
  assert.ok(insights.celebrations.some(w => w.title.includes('days in a row')))
})

function emptyRaw(overrides) {
  return Object.assign({
    child: {}, childModules: [], modules: [], superSkills: [],
    weeklyCheckins: [], moodCheckins: [], arcadePlays: [], dailyQuests: [], roadblocks: []
  }, overrides)
}

test('skill growth: baseline vs latest, lower challenge = easing', () => {
  const growth = computeSkillGrowth([
    { pathway_category: 'anxiety', assessment_type: 'baseline', total_score: 18, max_score: 24, efficacy_score: 2, created_at: daysAgo(60) },
    { pathway_category: 'anxiety', assessment_type: 'midpoint', total_score: 12, max_score: 24, efficacy_score: 3, created_at: daysAgo(10) },
    { pathway_category: 'social', assessment_type: 'baseline', total_score: 10, max_score: 20, created_at: daysAgo(5) }
  ])
  assert.ok(growth.show)
  assert.ok(growth.hasChange)
  const anxiety = growth.areas.find(a => a.category === 'anxiety')
  assert.equal(anxiety.direction, 'easing')
  assert.equal(anxiety.firstPct, 75)
  assert.equal(anxiety.latestPct, 50)
  assert.equal(anxiety.efficacyDelta, 1)
  assert.equal(anxiety.label, 'Managing worry')
  const social = growth.areas.find(a => a.category === 'social')
  assert.ok(social.baselineOnly)
  // measurable change sorts before baseline-only areas
  assert.equal(growth.areas[0].category, 'anxiety')
})

test('skill growth: empty or missing input hides the card', () => {
  assert.equal(computeSkillGrowth([]).show, false)
  assert.equal(computeSkillGrowth(null).show, false)
})

test('correlation: reports calmer active weeks, stays silent without signal', () => {
  const checkins = [
    { intensity: 2, created_at: daysAgo(1) },
    { intensity: 2, created_at: daysAgo(8) },
    { intensity: 4, created_at: daysAgo(15) },
    { intensity: 4, created_at: daysAgo(22) }
  ]
  const activity = []
  for (let i = 0; i < 5; i++) activity.push({ created_at: daysAgo(2) })
  for (let i = 0; i < 5; i++) activity.push({ created_at: daysAgo(9) })
  const times = collectActivityTimes([], activity, [], [])

  const result = computeCorrelationInsight(checkins, times)
  assert.ok(result)
  assert.equal(result.direction, 'practice-calmer')
  assert.match(result.message, /quieter weeks/)

  // fewer than 4 check-ins -> no claim
  assert.equal(computeCorrelationInsight(checkins.slice(0, 3), times), null)
  // no activity variation -> no claim
  assert.equal(computeCorrelationInsight(checkins, []), null)
})

test('weekly actions rotate with check-in count and stay goal-aware', () => {
  const base = { challenge: 'Anger outbursts', triggers: ['Anger'], created_at: daysAgo(1) }
  const one = computeInsights(emptyRaw({ weeklyCheckins: [Object.assign({}, base)] }))
  const two = computeInsights(emptyRaw({
    weeklyCheckins: [
      Object.assign({}, base, { previous_goal_result: 'tried_it' }),
      Object.assign({}, base, { goal: 'Use a calm-down tool once', created_at: daysAgo(8) })
    ]
  }))
  assert.notEqual(one.actions.todayAction.label, two.actions.todayAction.label)
  assert.ok(two.actions.goalNudge)
  assert.match(two.actions.goalNudge.text, /calm-down tool/)
  assert.equal(one.actions.goalNudge, null)
})

test('tough weeks get a permission-to-do-less note', () => {
  const res = computeInsights(emptyRaw({
    weeklyCheckins: [{ intensity: 5, challenge: 'Bedtime', triggers: ['Overwhelm'], created_at: daysAgo(1) }]
  }))
  assert.ok(res.actions.intensityNote)
  const calm = computeInsights(emptyRaw({
    weeklyCheckins: [{ intensity: 2, challenge: 'Bedtime', triggers: ['Overwhelm'], created_at: daysAgo(1) }]
  }))
  assert.equal(calm.actions.intensityNote, null)
})

test('last completed module reflects dates, not row order', () => {
  const res = computeInsights(emptyRaw({
    modules: [{ id: 'm1', title: 'Older Module' }, { id: 'm2', title: 'Newer Module' }],
    childModules: [
      { module_id: 'm2', is_completed: true, completed_at: daysAgo(1) },
      { module_id: 'm1', is_completed: true, completed_at: daysAgo(20) }
    ]
  }))
  assert.match(res.hero.engagementLine, /Newer Module/)
  assert.match(res.actions.celebrate.text, /Newer Module/)
})

test('computeInsights exposes skillGrowth and correlation', () => {
  const res = computeInsights(emptyRaw({
    pathwayAssessments: [
      { pathway_category: 'emotions', total_score: 15, max_score: 20, created_at: daysAgo(40) },
      { pathway_category: 'emotions', total_score: 8, max_score: 20, created_at: daysAgo(3) }
    ]
  }))
  assert.ok(res.skillGrowth.show)
  assert.equal(res.skillGrowth.areas[0].direction, 'easing')
  assert.equal(res.correlation, null) // not enough check-ins: no invented pattern
})
