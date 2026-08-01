import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

async function source(relativePath) {
  return readFile(join(root, relativePath), 'utf8')
}

test('service-role-backed admin functions enforce administrator access', async () => {
  for (const name of ['generate-module', 'generate-narration', 'fix-audit-errors']) {
    const text = await source(`supabase/functions/${name}/index.ts`)
    assert.match(text, /import \{ requireAdmin \}/, `${name} must import requireAdmin`)
    assert.match(text, /await requireAdmin\(req\)/, `${name} must call requireAdmin`)
    assert.match(text, /auth instanceof Response/, `${name} must stop on denied access`)
  }
})

test('internal payment email function requires the service role', async () => {
  const text = await source('supabase/functions/send-payment-failure-email/index.ts')
  assert.match(text, /requireServiceRole\(req\)/)
})

test('user-facing feedback and push functions require a verified user', async () => {
  for (const name of ['send-feedback-email', 'send-push-notification']) {
    const text = await source(`supabase/functions/${name}/index.ts`)
    assert.match(text, /await requireUser\(req\)/, `${name} must verify the caller`)
    assert.match(text, /auth instanceof Response/, `${name} must stop on denied access`)
    if (name === 'send-feedback-email') assert.match(text, /claim_feedback_email_slot/)
  }
})

test('admin module generation sends the signed-in session token, never the anon token', async () => {
  const text = await source('src/features/admin/adminModuleBuilder.js')
  const start = text.slice(text.indexOf('async function adminFunctionHeaders'), text.indexOf('// GENERATE NARRATION'))
  assert.match(start, /session\.access_token/)
  assert.doesNotMatch(start, /Authorization[^\n]+requireSupabaseEnv\(\)\.key/)
})
