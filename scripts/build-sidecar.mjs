import { existsSync } from 'node:fs'

const required = [
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
