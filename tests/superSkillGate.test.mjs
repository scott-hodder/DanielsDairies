import test from 'node:test'
import assert from 'node:assert/strict'
import { computeSkillStates, getUnlockRequirement, applyPractitionerOverride } from '../src/features/dashboard/superSkillGate.js'

const skills = [
  { id: 'bb', slug: 'brain-builder', name: 'Brain Builder', sort_order: 10, is_active: true },
  { id: 'td', slug: 'thought-driver', name: 'Thought Driver', sort_order: 20, is_active: true },
  { id: 'en', slug: 'emotion-navigator', name: 'Emotion Navigator', sort_order: 30, is_active: true }
]

const modules = [
  { id: 'm1', super_skill_id: 'bb' },
  { id: 'm2', super_skill_id: 'bb' },
  { id: 'm3', super_skill_id: 'td' },
  { id: 'm4', super_skill_id: 'en' }
]

test('first skill in order is active, later skills are locked', () => {
  const g = computeSkillStates(skills, modules, [])
  assert.equal(g.activeSlug, 'brain-builder')
  assert.equal(g.bySlug['brain-builder'].state, 'active')
  assert.equal(g.bySlug['thought-driver'].state, 'locked')
  assert.equal(g.bySlug['emotion-navigator'].state, 'locked')
})

test('completing the first skill activates the second', () => {
  const childModules = [
    { module_id: 'm1', is_completed: true },
    { module_id: 'm2', is_completed: true }
  ]
  const g = computeSkillStates(skills, modules, childModules)
  assert.equal(g.bySlug['brain-builder'].state, 'completed')
  assert.equal(g.activeSlug, 'thought-driver')
  assert.equal(g.bySlug['thought-driver'].state, 'active')
  assert.equal(g.bySlug['emotion-navigator'].state, 'locked')
})

test('partially completed first skill stays active', () => {
  const g = computeSkillStates(skills, modules, [{ module_id: 'm1', is_completed: true }])
  assert.equal(g.activeSlug, 'brain-builder')
  assert.equal(g.bySlug['brain-builder'].state, 'active')
})

test('partially started later skill is strictly locked (no grandfathering)', () => {
  // Child completed one Emotion Navigator module while skills were
  // free-choice: the skill still locks until its turn, but the completed
  // module keeps counting toward finishing it.
  const modsWithTwoEn = [...modules, { id: 'm5', super_skill_id: 'en' }]
  const g = computeSkillStates(skills, modsWithTwoEn, [{ module_id: 'm4', is_completed: true }])
  assert.equal(g.activeSlug, 'brain-builder')
  assert.equal(g.bySlug['emotion-navigator'].state, 'locked')
  assert.equal(g.bySlug['emotion-navigator'].done, 1)
})

test('skills with no modules yet are locked and skipped for active', () => {
  const noTdModules = modules.filter(m => m.super_skill_id !== 'td')
  const childModules = [
    { module_id: 'm1', is_completed: true },
    { module_id: 'm2', is_completed: true }
  ]
  const g = computeSkillStates(skills, noTdModules, childModules)
  assert.equal(g.activeSlug, 'emotion-navigator')
  assert.equal(g.bySlug['thought-driver'].state, 'locked')
})

test('everything complete keeps the last skill open', () => {
  const childModules = modules.map(m => ({ module_id: m.id, is_completed: true }))
  const g = computeSkillStates(skills, modules, childModules)
  assert.equal(g.activeSlug, 'emotion-navigator')
})

test('unlock requirement names the nearest unfinished earlier skill', () => {
  const g = computeSkillStates(skills, modules, [])
  const req = getUnlockRequirement('emotion-navigator', g)
  assert.equal(req.slug, 'thought-driver')
  const req2 = getUnlockRequirement('thought-driver', g)
  assert.equal(req2.slug, 'brain-builder')
  assert.equal(getUnlockRequirement('brain-builder', g), null)
})

test('fails open with no skill data', () => {
  assert.equal(computeSkillStates([], modules, []), null)
  assert.equal(computeSkillStates(null, modules, []), null)
})

test('legacy category matching links modules without super_skill_id', () => {
  const legacyModules = [{ id: 'm9', category: 'Brain Builder' }]
  const g = computeSkillStates(skills, legacyModules, [])
  assert.equal(g.bySlug['brain-builder'].total, 1)
})

test('practitioner override opens every non-completed skill', () => {
  const childModules = [
    { module_id: 'm1', is_completed: true },
    { module_id: 'm2', is_completed: true }
  ]
  const g = applyPractitionerOverride(computeSkillStates(skills, modules, childModules))
  assert.equal(g.bySlug['brain-builder'].state, 'completed')
  assert.equal(g.bySlug['thought-driver'].state, 'active')
  assert.equal(g.bySlug['emotion-navigator'].state, 'active')
})

test('practitioner override passes null through (fail open)', () => {
  assert.equal(applyPractitionerOverride(null), null)
})
