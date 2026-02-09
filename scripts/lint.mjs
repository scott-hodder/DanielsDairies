import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'

const files = globSync('src/**/*.js')
let failed = false
for (const file of files) {
  const content = readFileSync(file, 'utf8')
  if (content.includes('TODO_SECURITY')) {
    console.error(`Lint failed: unresolved TODO_SECURITY in ${file}`)
    failed = true
  }
}

if (failed) process.exit(1)
console.log(`lint ok (${files.length} files scanned)`)
