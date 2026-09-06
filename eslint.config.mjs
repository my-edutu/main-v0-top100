import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'warn',
      '@next/next/no-html-link-for-pages': 'warn',
      // These React 19 compiler-oriented checks were introduced as errors by
      // the Next 16 preset. Keep them visible while the legacy client screens
      // are migrated incrementally instead of making the entire lint command
      // unusable for unrelated changes.
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'lib/generated/prisma/**',
    '.playwright-cli/**',
    'remotion-advert/**',
    'scripts/**',
    'tests/**',
    'types/scripts/**',
    'check-matches.js',
    'debug-excel.js',
    'test-admin-check.js',
    'test-awardees.js',
  ]),
])
