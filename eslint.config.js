import js from '@eslint/js'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'react-sidecar/dist/**', 'src/admin.js', 'src/dashboard.js', 'src/dashboard-enhanced.js']
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        CustomEvent: 'readonly',
        EventTarget: 'readonly',
        fetch: 'readonly'
      }
    },
    rules: {
      'no-console': 'off'
    }
  }
]
