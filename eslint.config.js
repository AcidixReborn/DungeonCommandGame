import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import prettierConfig from 'eslint-config-prettier'

export default [
  {
    // src/test/** and test-*.js are standalone/manual test-runner scripts (run via
    // `npx vite-node test-abilities.js` or the in-app test tabs), not part of the
    // linted application surface.
    ignores: [
      'dist/**',
      'dist-electron/**',
      '.vite/**',
      'node_modules/**',
      'src/test/**',
      'test-*.js',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      // Only the two long-standing, well-understood hook rules — eslint-plugin-react-hooks v7's
      // "recommended" bundle also pulls in the newer React Compiler rule set (set-state-in-effect,
      // purity, etc.), which is a lot more opinionated and better evaluated once characterization
      // tests exist (Phase C) rather than as part of the initial lint baseline.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/prop-types': 'off',
      // Cosmetic only (raw apostrophes/quotes in JSX text render fine everywhere) — surfaced
      // as a warning for future polish rather than blocking on ~27 pre-existing instances.
      'react/no-unescaped-entities': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['electron/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettierConfig,
]
