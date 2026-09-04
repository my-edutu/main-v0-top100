import { afterEach, describe, expect, it, vi } from 'vitest'

import { createOpenAIImageEditor, buildVariantPrompt } from '@/lib/portfolio-cover/providers/openai'

afterEach(() => vi.restoreAllMocks())

describe('OpenAI portfolio image editor', () => {
  it('sends a server-owned wardrobe prompt and captures the provider request id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: [{ b64_json: Buffer.from('png').toString('base64') }] }), { headers: { 'x-request-id': 'req_123' } }))
    const editor = createOpenAIImageEditor({ apiKey: 'test-key', fetchImpl: fetchMock, timeoutMs: 1000 })
    const result = await editor.edit({ portrait: Buffer.from('portrait'), mask: Buffer.from('mask'), tailoring: 'female', variant: 'executive-charcoal' })

    expect(result).toEqual({ image: Buffer.from('png'), requestId: 'req_123' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const request = fetchMock.mock.calls[0][1]
    const body = request?.body as FormData
    expect(body.get('model')).toBe('gpt-image-2')
    expect(body.get('size')).toBe('1024x1536')
    expect(String(body.get('prompt'))).toContain('corporate charcoal suit')
    expect(String(body.get('prompt'))).not.toContain('Ada')
  })

  it('keeps prompts free of member profile fields', () => {
    const prompt = buildVariantPrompt('male', 'leadership-ivory')
    expect(prompt).toContain('corporate ivory suit')
    expect(prompt).toContain('do not change the face')
    expect(prompt).not.toContain('name')
    expect(prompt).not.toContain('school')
  })

  it('classifies provider failures without returning raw response content', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('upstream details', { status: 503 }))
    const editor = createOpenAIImageEditor({ apiKey: 'test-key', timeoutMs: 1000 })
    await expect(editor.edit({ portrait: Buffer.from('portrait'), mask: Buffer.from('mask'), tailoring: 'male', variant: 'leadership-ivory' })).rejects.toMatchObject({ code: 'provider_unavailable', retryable: true })
  })
})
