import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from '../../cloudflare/portfolio-generation-consumer.js'

describe('portfolio queue consumer', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('acknowledges confirmed completion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'ready' })))
    const message = { body: { generationId: 'id' }, ack: vi.fn(), retry: vi.fn(), attempts: 1 }
    await worker.queue({ messages: [message] }, { APP_ORIGIN: 'https://www.top100afl.com', PORTFOLIO_WORKER_SECRET: 'secret' })
    expect(message.ack).toHaveBeenCalledOnce()
    expect(message.retry).not.toHaveBeenCalled()
  })
  it('retries a success page that is not a completion response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'processing' })))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const message = { body: {}, ack: vi.fn(), retry: vi.fn(), attempts: 1 }
    await worker.queue({ messages: [message] }, { APP_ORIGIN: 'https://www.top100afl.com', PORTFOLIO_WORKER_SECRET: 'secret' })
    expect(message.ack).not.toHaveBeenCalled()
    expect(message.retry).toHaveBeenCalledWith({ delaySeconds: 120 })
    vi.restoreAllMocks()
  })
})
