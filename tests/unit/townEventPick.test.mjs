// Daily town-event pick: the pool follows the child's ACTIVE super skill
// (that skill's character + Daniel for variety), falling back to the full
// rotation when no skill is active. The daily-reminders edge function
// mirrors this logic — see supabase/functions/daily-reminders/index.ts.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHARS, EVENTS, eventPool, pickEvent, hashStr } from '../../src/features/dashboard/townEventData.js'

const SKILL_SLUGS = Object.values(CHARS).map(c => c.slug).filter(Boolean).filter(s => s !== null)

test('every event belongs to a known character', () => {
  for (const ev of EVENTS) assert.ok(CHARS[ev.c], `unknown character ${ev.c}`)
})

test('pool for an active skill = that character + Daniel, in EVENTS order', () => {
  for (const slug of SKILL_SLUGS) {
    const key = Object.keys(CHARS).find(k => CHARS[k].slug === slug)
    const pool = eventPool(slug)
    assert.ok(pool.length > 0)
    // Only the skill's character and Daniel appear
    for (const ev of pool) assert.ok(ev.c === key || ev.c === 'daniel', `${slug}: unexpected ${ev.c}`)
    // Both actually appear (variety)
    assert.ok(pool.some(ev => ev.c === key), `${slug}: missing own character`)
    assert.ok(pool.some(ev => ev.c === 'daniel'), `${slug}: missing daniel`)
    // Order preserved from EVENTS (parity with the edge function's
    // count-based reconstruction: skill chars first, then daniel)
    const seq = pool.map(ev => ev.c)
    const danielStart = seq.indexOf('daniel')
    assert.ok(seq.slice(0, danielStart).every(c => c === key), `${slug}: daniel events not last`)
  }
})

test('no active skill (or unknown slug) falls back to the full rotation', () => {
  assert.equal(eventPool(null), EVENTS)
  assert.equal(eventPool(undefined), EVENTS)
  assert.equal(eventPool('not-a-skill'), EVENTS)
})

test('pick is deterministic for a given date + child + skill', () => {
  const a = pickEvent('child-1', '2026-09-02', 'behaviour-engineer')
  const b = pickEvent('child-1', '2026-09-02', 'behaviour-engineer')
  assert.equal(a, b)
  assert.ok(a.c === 'pepper' || a.c === 'daniel')
})

test('edge-function parity: character sequence matches count-based pools', () => {
  // The edge function rebuilds pools from per-character counts instead of
  // shipping the full EVENTS array. Verify that reconstruction here so a
  // new event added to EVENTS fails this test until the counts are synced.
  const serverCounts = [['kip', 4], ['lenny', 3], ['coco', 3], ['pepper', 3], ['eddie', 3], ['kai', 3], ['billie', 3], ['daniel', 3]]
  const fullFromCounts = serverCounts.flatMap(([k, n]) => Array(n).fill(k))
  assert.deepEqual(EVENTS.map(ev => ev.c), fullFromCounts)
  for (const slug of SKILL_SLUGS) {
    const key = Object.keys(CHARS).find(k => CHARS[k].slug === slug)
    const n = serverCounts.find(([k]) => k === key)[1]
    const serverPool = [...Array(n).fill(key), 'daniel', 'daniel', 'daniel']
    assert.deepEqual(eventPool(slug).map(ev => ev.c), serverPool, slug)
  }
})

test('hashStr matches the edge function implementation', () => {
  // Same algorithm both sides; spot-check stable values.
  assert.equal(hashStr(''), 0)
  assert.equal(hashStr('a'), 97)
  assert.equal(hashStr('2026-09-02|child-1') >= 0, true)
})
