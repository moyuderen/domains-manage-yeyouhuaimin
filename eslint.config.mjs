import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import nextVitals from 'eslint-config-next/core-web-vitals'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['.next', '**/.next/**', 'dist', 'node_modules', '.claude/worktrees/**']),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
])
