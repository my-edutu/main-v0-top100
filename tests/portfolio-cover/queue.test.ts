import { describe, expect, it, vi } from 'vitest'

import { enqueuePortfolioGeneration } from '@/lib/portfolio-cover/queue'

describe('portfolio generation queue', () => {
  it('posts an identifier-only message to the configured Cloudflare queue', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }))

    await enqueuePortfolioGeneration(
      { generationId: 'g1', memberId: 'm1', attempt: 1 },
      {
        CLOUDFLARE_ACCOUNT_ID: 'account',
        CLOUDFLARE_QUEUE_ID: 'queue',
        CLOUDFLARE_API_TOKEN: 'token',
      },
      fetchImpl,
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/account/queues/queue/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        body: JSON.stringify({
          content_type: 'json',
          body: {
            type: 'portfolio-cover.generate',
            generationId: 'g1',
            memberId: 'm1',
            attempt: 1,
          },
        }),
      }),
    )
  })

  it('fails clearly when queue credentials are incomplete', async () => {
    await expect(
      enqueuePortfolioGeneration(
        { generationId: 'g1', memberId: 'm1', attempt: 1 },
        { CLOUDFLARE_QUEUE_ID: 'queue' },
        fetch,
      ),
    ).rejects.toThrow(/CLOUDFLARE_ACCOUNT_ID/)
  })
})
