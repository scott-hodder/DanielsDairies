import test from 'node:test'
import assert from 'node:assert/strict'
import { computeOverviewStats, computeNeedsAttention, relativeDayLabel } from '../src/features/practitioner/overviewStats.js'

const NOW = new Date('2026-08-16T12:00:00Z')

const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

const clients = [
  { child_id: 'c1', child_name: 'Ava', last_login_date: daysAgo(1) },
  { child_id: 'c2', child_name: 'Ben', last_login_date: daysAgo(20) },
  { child_id: 'c3', child_name: 'Cass', last_login_date: null }
]

test('overview stats count clients, weekly activity and weekly completions', () => {
  const recentCompletions = [
    { child_id: 'c1', completed_at: daysAgo(2) },
    { child_id: 'c1', completed_at: daysAgo(6) },
    { child_id: 'c2', completed_at: daysAgo(12) }
  ]
  const s = computeOverviewStats({ clients, goalProgress: [], recentCompletions, now: NOW })
  assert.equal(s.activeClients, 3)
  assert.equal(s.activeThisWeek, 1)
  assert.equal(s.modulesThisWeek, 2)
})

test('goal reviews due counts in-progress goals due within a week, including overdue', () => {
  const goalProgress = [
    { child_id: 'c1', status: 'in_progress', review_date: daysAgo(3) },      // overdue
    { child_id: 'c2', status: 'in_progress', review_date: daysAgo(-3) },     // due soon
    { child_id: 'c2', status: 'in_progress', review_date: daysAgo(-30) },    // far future
    { child_id: 'c3', status: 'complete', review_date: daysAgo(1) },         // not in progress
    { child_id: 'c3', status: 'in_progress', review_date: null }             // no date
  ]
  const s = computeOverviewStats({ clients, goalProgress, recentCompletions: [], now: NOW })
  assert.equal(s.goalsDueSoon, 2)
})

test('needs attention flags inactivity, never-active and overdue reviews', () => {
  const goalProgress = [
    { child_id: 'c1', status: 'in_progress', review_date: daysAgo(2) }
  ]
  const attention = computeNeedsAttention({ clients, goalProgress, now: NOW })
  const byId = Object.fromEntries(attention.map(a => [a.childId, a]))

  assert.equal(byId.c1.reasons.length, 1)
  assert.match(byId.c1.reasons[0], /review overdue/i)
  assert.match(byId.c2.reasons[0], /Inactive 20 days/)
  assert.match(byId.c3.reasons[0], /No app activity yet/)
})

test('a healthy caseload produces no attention rows', () => {
  const healthy = [{ child_id: 'c9', child_name: 'Zoe', last_login_date: daysAgo(0) }]
  assert.deepEqual(computeNeedsAttention({ clients: healthy, goalProgress: [], now: NOW }), [])
})

test('relative day labels stay human', () => {
  assert.equal(relativeDayLabel(daysAgo(0), NOW), 'Today')
  assert.equal(relativeDayLabel(daysAgo(1), NOW), 'Yesterday')
  assert.equal(relativeDayLabel(daysAgo(4), NOW), '4 days ago')
  assert.equal(relativeDayLabel(daysAgo(10), NOW), '1w ago')
  assert.equal(relativeDayLabel(null, NOW), '')
})
