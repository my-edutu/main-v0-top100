import { afterEach, describe, expect, it, vi } from 'vitest'

import { createOpenAIImageEditor, buildVariantPrompt } from '@/lib/portfolio-cover/providers/openai'

afterEach(() => vi.restoreAllMocks())

describe('OpenAI portfolio image editor', () => {
  it('sends a server-owned wardrobe prompt and captures the provider request id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: [{ b64_json: Buffer.from('png').toString('base64') }] }), { headers: { 'x-request-id': 'req_123' } }))
    const editor = createOpenAIImageEditor({ apiKey: 'test-key', fetchImpl: fetchMock, timeoutMs: 1000 })
    const result = await editor.edit({ portrait: Buffer.from('portrait'), tailoring: 'female', variant: 'executive-charcoal' })

    expect(result).toEqual({ image: Buffer.from('png'), requestId: 'req_123' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const request = fetchMock.mock.calls[0][1]
    const body = request?.body as FormData
    expect(body.get('model')).toBe('gpt-image-2.5-sunburst')
    expect(body.get('size')).toBe('1024x1536')
    expect(body.get('input_fidelity')).toBeNull()
    expect(body.get('mask')).toBeNull()
    expect(body.get('background')).toBe('transparent')
    expect(body.get('output_format')).toBe('png')
    expect(String(body.get('prompt'))).toContain('premium charcoal corporate suit')
    expect(String(body.get('prompt')).toLowerCase()).toContain('transparent background')
    expect(String(body.get('prompt')).toLowerCase()).toContain('looking directly into the camera')
    expect(String(body.get('prompt')).toLowerCase()).toContain('headroom')
    expect(String(body.get('prompt')).toLowerCase()).toContain('head-and-shoulders')
    expect(String(body.get('prompt')).toLowerCase()).toContain('hands and forearms are completely outside the frame')
    expect(String(body.get('prompt')).toLowerCase()).toContain('never beautify, reshape, smooth, regenerate, or substitute the face')
    expect(String(body.get('prompt')).toLowerCase()).toContain('no text')
    expect(String(body.get('prompt'))).not.toContain('Ada')
  })

  it('keeps prompts free of member profile fields', () => {
    const prompt = buildVariantPrompt('male')
    const normalizedPrompt = prompt.toLowerCase()
    expect(prompt).toContain('premium charcoal corporate suit')
    expect(prompt).toContain('square to the camera')
    expect(normalizedPrompt).toContain('unmistakably recognizable')
    expect(normalizedPrompt).toContain('remove handheld objects')
    expect(normalizedPrompt).not.toContain('name')
    expect(normalizedPrompt).not.toContain('school')
  })

  it('classifies provider failures without returning raw response content', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('upstream details', { status: 503 }))
    const editor = createOpenAIImageEditor({ apiKey: 'test-key', timeoutMs: 1000 })
    await expect(editor.edit({ portrait: Buffer.from('portrait'), tailoring: 'male', variant: 'leadership-ivory' })).rejects.toMatchObject({ code: 'provider_unavailable', retryable: true })
  })
})
