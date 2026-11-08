import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('talent critique regressions', () => {
  it('runs domain, merge and directory checks', () => {
    const output = execFileSync(process.execPath, ['--test', resolve('scripts/talent-network/audit-regressions.cjs')], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 20000,
      env: { ...process.env, TALENT_AUDIT_BASELINE: '', TALENT_DISCOVERY_LAUNCHED: 'false', TALENT_UPGRADE_EMAIL_ENABLED: 'false' },
    })
    expect(output).toContain('# fail 0')
  }, 25000)
  it('runs real member route handlers against external dependency doubles', () => {
    const output = execFileSync(process.execPath, [resolve('scripts/talent-network/audit-api.cjs')], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 20000,
      env: { ...process.env, TALENT_AUDIT_BASELINE: '', TALENT_DISCOVERY_LAUNCHED: 'false', TALENT_UPGRADE_EMAIL_ENABLED: 'false' },
    })
    expect(output).toContain('12 API audit checks passed; 0 failed')
  }, 25000)
})
