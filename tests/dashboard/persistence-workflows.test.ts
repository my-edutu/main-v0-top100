import { describe, expect, it, vi } from 'vitest'

import { persistThenRefresh } from '@/app/dashboard/_lib/persistence-workflows'

describe('dashboard persistence workflows', () => {
  it('commits returned state before a best-effort refresh and keeps mutation success', async () => {
    const persisted = { id: 'saved-member' }
    const events: string[] = []
    const applyPersisted = vi.fn(() => events.push('applied'))

    const result = await persistThenRefresh({
      persist: async () => {
        events.push('persisted')
        return persisted
      },
      applyPersisted,
      refresh: async () => {
        events.push('refresh')
        throw new Error('history unavailable')
      },
      refreshWarning: 'Saved, but the latest server view could not be loaded.',
    })

    expect(events).toEqual(['persisted', 'applied', 'refresh'])
    expect(applyPersisted).toHaveBeenCalledWith(persisted)
    expect(result).toEqual({
      persisted,
      warning: 'Saved, but the latest server view could not be loaded.',
    })
  })

  it('does not apply or refresh when persistence fails', async () => {
    const applyPersisted = vi.fn()
    const refresh = vi.fn()

    await expect(
      persistThenRefresh({
        persist: async () => {
          throw new Error('write failed')
        },
        applyPersisted,
        refresh,
        refreshWarning: 'secondary warning',
      }),
    ).rejects.toThrow('write failed')

    expect(applyPersisted).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })
})
