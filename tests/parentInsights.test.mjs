import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeWeeklyActivity,
  computeChildVoice,
  gameInfoFor,
  computeInsights
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
