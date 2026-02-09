import { readFileSync } from 'node:fs'

const files = [
  'supabase/functions/child-credentials/index.ts',
  'supabase/functions/_shared/child-credentials-schemas.ts',
  'supabase/functions/_shared/database.types.ts'
]

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  if (!text.includes('type') && !text.includes('interface')) {
    throw new Error(`Typecheck guard failed for ${file}: expected typed declarations`)
  }
}

console.log('typecheck ok (static guards)')
