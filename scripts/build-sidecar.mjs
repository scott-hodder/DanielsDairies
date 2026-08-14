import { existsSync } from 'node:fs'

// The React sidecar is an optional, separately configured application. A legacy
// component remains in this repository, but without a package manifest it is
// not part of the production build.
if (!existsSync('react-sidecar/package.json')) {
  console.log('sidecar build skipped (not configured)')
  process.exit(0)
}

const required = [
  'react-sidecar/package.json',
  'react-sidecar/src/App.jsx',
  'react-sidecar/src/main.jsx',
  'react-sidecar/vite.config.js'
]

for (const file of required) {
  if (!existsSync(file)) {
    throw new Error(`Sidecar build guard failed: missing ${file}`)
  }
}

console.log('sidecar build guard ok')
