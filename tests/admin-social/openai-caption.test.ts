import { describe, expect, it, vi } from 'vitest'
import {
  createOpenAICaptionGenerator,
  captionInstructions,
} from '@/lib/admin-social/openai-caption'

const profile = {
  awardeeId: 'awardee-1',
  profileId: null,
  slug: 'amara',
  name: 'Amara',
  bio: 'Leads a clean-energy startup.',
  profileUrl: 'https://top100afl.com/awardees/amara',
  imageUrl: null,
  imageSource: 'none' as const,
  isPublic: true,
}

describe('OpenAI caption generator', () => {
  it('gives the rewrite an explicit AFL purpose and treats editorial focus as direction, not evidence', async () => {
    const fetchImpl = vi.fn(async (_url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body))
      const input = JSON.parse(body.input)
      expect(input.editorialFocus).toBe('Highlight accessible energy.')
      expect(input.organizationPurpose).toContain(
        'recognition into opportunity',
      )
      expect(body.instructions).toContain(
        'Do not present AFL’s aspirations as outcomes already achieved by the awardee',
      )
      expect(body.instructions).toContain(
        'editorial focus is direction, not additional factual evidence',
      )
      return Response.json({ output_text: 'A grounded feature.' })
    })
    await createOpenAICaptionGenerator({
      apiKey: 'test',
      fetchImpl: fetchImpl as typeof fetch,
    }).generate(profile, 'linkedin', 'Highlight accessible energy.')
  })
  it('uses the Responses API and sends only public awardee content', async () => {
    const fetchImpl = vi.fn(async (_url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body))
      expect(body.model).toBe('gpt-6-luna')
      expect(body.input).toContain('Amara')
      expect(body.input).toContain('Leads a clean-energy startup.')
      expect(body.input).not.toContain('private@example.com')
      expect(body.store).toBe(false)
      return Response.json({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: 'Meet Amara, building clean energy across Africa.',
              },
            ],
          },
        ],
      })
    })
    const generator = createOpenAICaptionGenerator({
      apiKey: 'test-secret',
      model: 'gpt-6-luna',
      fetchImpl: fetchImpl as typeof fetch,
    })
    await expect(generator.generate(profile, 'linkedin')).resolves.toBe(
      'Meet Amara, building clean energy across Africa.',
    )
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('gives different platform guidance and rejects empty provider output', async () => {
    expect(captionInstructions('instagram')).not.toEqual(
      captionInstructions('linkedin'),
    )
    const generator = createOpenAICaptionGenerator({
      apiKey: 'test-secret',
      fetchImpl: vi.fn(async () =>
        Response.json({ output: [] }),
      ) as typeof fetch,
    })
    await expect(generator.generate(profile, 'facebook')).rejects.toMatchObject(
      { code: 'invalid_provider_output' },
    )
  })

  it('maps provider failures and aborts into safe errors', async () => {
    const expired = createOpenAICaptionGenerator({
      apiKey: 'expired',
      fetchImpl: vi.fn(
        async () => new Response(null, { status: 401 }),
      ) as typeof fetch,
    })
    await expect(expired.generate(profile, 'linkedin')).rejects.toMatchObject({
      code: 'provider_credentials',
    })
    const rejected = createOpenAICaptionGenerator({
      apiKey: 'test-secret',
      fetchImpl: vi.fn(
        async () => new Response(null, { status: 429 }),
      ) as typeof fetch,
    })
    await expect(rejected.generate(profile, 'facebook')).rejects.toMatchObject({
      code: 'provider_unavailable',
    })
    const timeout = createOpenAICaptionGenerator({
      apiKey: 'test-secret',
      timeoutMs: 1,
      fetchImpl: vi.fn(
        (_url, options) =>
          new Promise((_resolve, reject) =>
            options?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            ),
          ),
      ) as typeof fetch,
    })
    await expect(timeout.generate(profile, 'facebook')).rejects.toMatchObject({
      code: 'provider_timeout',
    })
  })
})
