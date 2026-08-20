import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')
const config = readFileSync(path.join(root, 'next.config.mjs'), 'utf8')
const qualityWorkflow = readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8')

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

  it('measures legacy lint debt but strictly lints files changed by the PR', () => {
    expect(qualityWorkflow).toContain('fetch-depth: 0')
    expect(qualityWorkflow).toContain('Measure repository lint baseline')
    expect(qualityWorkflow).toContain('git diff --name-only --diff-filter=ACMR')
    expect(qualityWorkflow).toContain('--max-warnings=0')
  })

  it('keeps security, tests, lint, and build independently observable before aggregate enforcement', () => {
    for (const stepName of [
      'Audit high-severity dependencies',
      'Verify distributed rate-limit migration',
      'Run tests',
      'Enforce changed-file lint',
      'Build',
    ]) {
      expect(qualityWorkflow).toMatch(new RegExp(`name: ${stepName}[\\s\\S]*?continue-on-error: true`))
    }
    expect(qualityWorkflow).toContain('Enforce quality gates')
  })
})
