import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('talent network independent review harnesses', () => {
  for (const script of ['contract-tests.cjs', 'api-tests.cjs', 'integration-checks.cjs']) {
    it(`runs ${script}`, () => {
      const output = execFileSync(process.execPath, [resolve('scripts/talent-network', script)], {
        cwd: process.cwd(), encoding: 'utf8', timeout: 20000,
        env: { ...process.env, TALENT_DISCOVERY_LAUNCHED: 'false', TALENT_UPGRADE_EMAIL_ENABLED: 'false' },
      })
      expect(output).toContain('passed')
    }, 25000)
  }
})
