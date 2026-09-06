import { describe, expect, it } from 'vitest'

import { legacySelfServiceEnabled } from '@/lib/legacy-self-service'

function client(result: { data: unknown; error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        limit: () => ({ maybeSingle: async () => result }),
      }),
    }),
  }
}

describe('legacy awardee self-service launch gate', () => {
  it('is enabled only by an explicit database setting', async () => {
    await expect(
      legacySelfServiceEnabled(client({
        data: { self_service_profile_edit_enabled: true },
        error: null,
      }) as never),
    ).resolves.toBe(true)
  })

  it('fails closed when the settings row or table is unavailable', async () => {
    await expect(
      legacySelfServiceEnabled(client({ data: null, error: { message: 'missing' } }) as never),
    ).resolves.toBe(false)
    await expect(
      legacySelfServiceEnabled(client({ data: null, error: null }) as never),
    ).resolves.toBe(false)
  })
})
