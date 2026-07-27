import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  // tsconfig sets jsx: "preserve" and Next compiles with the automatic
  // runtime. Vitest's default is the classic runtime, which needs React in
  // scope — telling esbuild to match Next keeps app/og/route.tsx testable.
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
