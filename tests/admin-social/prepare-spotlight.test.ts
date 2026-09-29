import { describe, expect, it, vi } from 'vitest'
import { prepareAwardeeSpotlight } from '@/lib/admin-social/prepare-spotlight'

describe('prepareAwardeeSpotlight', () => {
  it('loads a current public profile and generated caption without publishing', async () => {
    const profile = { awardeeId: 'awardee-1', name: 'Amara', imageUrl: 'https://cdn.example/amara.png' }
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ caption: 'Meet Amara', profile }), { status: 200 }))

    const result = await prepareAwardeeSpotlight('awardee-1', 'linkedin', fetcher as typeof fetch)

    expect(result).toEqual({ caption: 'Meet Amara', profile })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith('/api/admin/social/generate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ awardeeId: 'awardee-1', platform: 'linkedin' }),
    }))
  })

  it('reports generation errors without creating a share action', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Add a public BIO first.' }), { status: 422 }))

    await expect(prepareAwardeeSpotlight('awardee-1', 'linkedin', fetcher as typeof fetch))
      .rejects.toThrow('Add a public BIO first.')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
