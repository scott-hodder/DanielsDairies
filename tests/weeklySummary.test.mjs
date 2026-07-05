import test from 'node:test'
import assert from 'node:assert/strict'
import { isoWeekKey } from '../supabase/functions/_shared/weekKey.mjs'

test('week key is stable across a week (one email per parent per week)', () => {
  // Mon 2026-06-29 .. Sun 2026-07-05 are the same ISO week
  const monday = new Date(Date.UTC(2026, 5, 29))
  const friday = new Date(Date.UTC(2026, 6, 3))
  const sunday = new Date(Date.UTC(2026, 6, 5))
  assert.equal(isoWeekKey(monday), isoWeekKey(friday))
  assert.equal(isoWeekKey(monday), isoWeekKey(sunday))
})

test('week key changes at the ISO week boundary', () => {
  const sunday = new Date(Date.UTC(2026, 6, 5))
  const nextMonday = new Date(Date.UTC(2026, 6, 6))
  assert.notEqual(isoWeekKey(sunday), isoWeekKey(nextMonday))
})

test('week key format is YYYY-Www', () => {
  assert.match(isoWeekKey(new Date(Date.UTC(2026, 0, 15))), /^\d{4}-W\d{2}$/)
})

test('year-boundary weeks resolve to the ISO year, not the calendar year', () => {
  // 1 Jan 2027 is a Friday, part of 2026-W53
  assert.equal(isoWeekKey(new Date(Date.UTC(2027, 0, 1))), '2026-W53')
})
