import { afterEach, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { emailSecret } from '@/lib/admin-email/secrets'

afterEach(() => vi.unstubAllEnvs())
it('reads a private mounted secret file instead of the environment fallback', () => {
  const dir = mkdtempSync(join(tmpdir(), 'top100-email-test-'))
  try {
    const path = join(dir, 'token'); writeFileSync(path, 'private-token\n')
    vi.stubEnv('LISTMONK_API_TOKEN', 'fallback'); vi.stubEnv('LISTMONK_API_TOKEN_FILE', path)
    expect(emailSecret('LISTMONK_API_TOKEN')).toBe('private-token')
    vi.stubEnv('LISTMONK_API_TOKEN_FILE', join(dir, 'missing'))
    expect(emailSecret('LISTMONK_API_TOKEN')).toBeUndefined()
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
