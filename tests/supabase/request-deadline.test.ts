import { afterEach, expect, it, vi } from 'vitest'
import { createRecoveryFetch } from '@/lib/supabase/password-recovery-client'

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })
it('works in browsers without AbortSignal.any', async () => {
  vi.spyOn(AbortSignal, 'any').mockImplementation(() => { throw new Error('Not supported') })
  const fetcher = vi.fn().mockResolvedValue(new Response('{}'))
  const response = await createRecoveryFetch(fetcher)('/auth', { signal: new AbortController().signal })
  expect(response.ok).toBe(true)
})
it('preserves cancellation on a Request object', async () => {
  const controller = new AbortController()
  const fetcher = vi.fn(async (_input, init) => {
    expect(init?.signal?.aborted).toBe(true)
    throw new DOMException('Cancelled', 'AbortError')
  })
  controller.abort()
  const request = new Request('https://example.com/auth', { signal: controller.signal })
  await expect(createRecoveryFetch(fetcher)(request)).rejects.toThrow('Cancelled')
})
it('aborts a stalled request at its deadline', async () => {
  vi.useFakeTimers()
  const fetcher = vi.fn((_input, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal.reason), { once: true })
  }))
  const promise = createRecoveryFetch(fetcher, 25)('/auth')
  const assertion = expect(promise).rejects.toThrow()
  await vi.advanceTimersByTimeAsync(25)
  await assertion
  expect(vi.getTimerCount()).toBe(0)
})
