import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')
const read = (file: string) => readFileSync(path.join(root, file), 'utf8')
const config = read('next.config.mjs')
const qualityWorkflow = read('.github/workflows/quality.yml')
const globalsCss = read('app/globals.css')
const calendar = read('components/ui/calendar.tsx')
const posts = read('lib/posts.ts')

describe('production build hardening', () => {
  it('does not suppress lint or TypeScript build failures', () => {
    expect(config).not.toMatch(/ignoreDuringBuilds\s*:\s*true/)
    expect(config).not.toMatch(/ignoreBuildErrors\s*:\s*true/)
  })

  it('does not ship unsafe-eval in the production CSP', () => {
    expect(config).toContain("process.env.NODE_ENV === 'production'")
    expect(config).toMatch(/productionScriptSrc/)
    const productionLine = config.match(/const\s+productionScriptSrc\s*=\s*([^\n]+)/)?.[1] ?? ''
    expect(productionLine).not.toContain("'unsafe-eval'")
  })

  it('measures legacy lint debt but blocks lint findings on lines changed by the PR', () => {
    expect(qualityWorkflow).toContain('fetch-depth: 0')
    expect(qualityWorkflow).toContain('Measure repository lint baseline')
    expect(qualityWorkflow).toContain('git diff --name-only --diff-filter=ACMR')
    expect(qualityWorkflow).toContain('git diff --unified=0 --diff-filter=ACMR')
    expect(qualityWorkflow).toContain('scripts/lint-changed-lines.ts')
  })

  it('reports the full audit while blocking on production dependency exposure', () => {
    expect(qualityWorkflow).toContain('Report full dependency audit')
    expect(qualityWorkflow).toContain('Audit production dependencies')
    expect(qualityWorkflow).toContain('npm audit --omit=dev --audit-level=high')
  })

  it('keeps security, tests, lint, and build independently observable before aggregate enforcement', () => {
    for (const stepName of [
      'Audit production dependencies',
      'Verify distributed rate-limit migration',
      'Run tests',
      'Enforce changed-line lint',
      'Build',
    ]) {
      expect(qualityWorkflow).toMatch(new RegExp(`name: ${stepName}[\\s\\S]*?continue-on-error: true`))
    }
    expect(qualityWorkflow).toContain('Enforce quality gates')
  })

  it('keeps global CSS imports legal for the Next 16 Turbopack parser', () => {
    const importIndex = globalsCss.indexOf('@import ')
    const firstTailwindIndex = globalsCss.indexOf('@tailwind ')
    expect(importIndex).toBeGreaterThanOrEqual(0)
    expect(importIndex).toBeLessThan(firstTailwindIndex)
  })

  it('uses Tailwind 3-compatible calendar spacing syntax', () => {
    expect(calendar).not.toContain('--spacing(8)')
    expect(calendar).toContain('[--cell-size:2rem]')
  })

  it('retains post merge and homepage selection exports required by the server module', () => {
    expect(posts).toContain('export const mergePosts')
    expect(posts).toContain('export const selectHomepagePosts')
  })
})
