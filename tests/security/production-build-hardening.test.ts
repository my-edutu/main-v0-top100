import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')
const config = readFileSync(path.join(root, 'next.config.mjs'), 'utf8')

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
})
