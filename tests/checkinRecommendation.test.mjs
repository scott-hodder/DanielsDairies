import test from 'node:test'
import assert from 'node:assert/strict'
import { computeCheckinRecommendation } from '../src/features/dashboard/parentInsightsEngine.js'

test('anger outbursts recommend Emotion Navigator', () => {
  const rec = computeCheckinRecommendation({ challenge: 'Anger outbursts', triggers: ['Anger'] })
  assert.equal(rec.skillName, 'Emotion Navigator')
  assert.match(rec.message, /Emotion Navigator/)
})

test('school refusal recommends Thought Driver', () => {
  const rec = computeCheckinRecommendation({ challenge: 'School refusal / drop-off', triggers: [] })
  assert.equal(rec.skillName, 'Thought Driver')
})

test('unknown challenge falls back to trigger mapping', () => {
  const rec = computeCheckinRecommendation({ challenge: 'Other', triggers: ['Worry/Anxiety'] })
  assert.equal(rec.skillName, 'Thought Driver')
})

test('sadness trigger recommends Resilience Architect', () => {
  const rec = computeCheckinRecommendation({ challenge: 'Other', triggers: ['Sadness'] })
  assert.equal(rec.skillName, 'Resilience Architect')
})

test('no signal returns null (no fabricated recommendations)', () => {
  assert.equal(computeCheckinRecommendation({ challenge: 'Other', triggers: [] }), null)
  assert.equal(computeCheckinRecommendation(null), null)
})

test('message stays non-clinical', () => {
  const rec = computeCheckinRecommendation({ challenge: 'Bedtime', triggers: ['Overwhelm'] })
  assert.match(rec.message, /not a diagnosis/i)
})
