import { describe, expect, it } from 'vitest'

import {
  FetchTimeoutError,
  fetchWithTimeout,
} from '@/lib/http/fetch-with-timeout'

describe('fetchWithTimeout', () => {
  it('returns a successful response before the deadline', async () => {
    const fetchImpl: typeof fetch = async () => new Response('ready', { status: 200 })

    const response = await fetchWithTimeout('/health', {}, 100, fetchImpl)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('ready')
  })

  it('aborts a stalled request with a stable retryable error', async () => {
    const fetchImpl: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), {
          once: true,
        })
      })

    await expect(fetchWithTimeout('/stalled', {}, 5, fetchImpl)).rejects.toEqual(
      new FetchTimeoutError('The request took too long. Please try again.'),
    )
  })
})
