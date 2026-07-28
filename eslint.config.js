import js from '@eslint/js'
import tseslint from 'typescript-eslint'
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
  // Scope typescript-eslint's recommended rules to .ts/.tsx only — spreading it unscoped
  // would also apply `@typescript-eslint/no-unused-vars` etc. to plain .js/.jsx files.
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    // Applies to both plain JS/JSX (not yet migrated to TS, Phase D) and TS/TSX.
    files: ['**/*.{js,jsx,ts,tsx}'],
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
    // TS's own unused-vars check understands types (e.g. imported-only-as-a-type usage)
    // better than the base rule, so swap it in for .ts/.tsx and disable the base rule there.
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Ratcheted up incrementally as more of the codebase converts (Phase D) — an explicit
      // `any` is still far better than no types at all during a large incremental migration.
      '@typescript-eslint/no-explicit-any': 'off',
      // typescript-eslint's version of this rule disallows `condition && doThing()` as a
      // statement by default (unlike the base ESLint rule) — this codebase uses that idiom
      // pervasively and intentionally, not by mistake.
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
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
