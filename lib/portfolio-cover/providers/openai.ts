import type { PortfolioImageEditor, PortfolioEditInput, PortfolioEditResult } from './types'

type FetchLike = typeof fetch

export class PortfolioProviderError extends Error {
  constructor(public readonly code: 'provider_unavailable' | 'provider_rejected' | 'invalid_provider_output' | 'provider_timeout', public readonly retryable: boolean) {
    super(code)
    this.name = 'PortfolioProviderError'
  }
}

export function buildVariantPrompt(tailoring: PortfolioEditInput['tailoring']) {
  const cut = tailoring === 'female' ? 'tailored feminine cut' : 'tailored masculine cut'
  return [
    'Create one premium mid-thigh editorial magazine portrait using the supplied person as the identity reference.',
    'Recompose the subject standing upright and square to the camera, with both shoulders level, the head straight, and both eyes looking directly into the camera with a calm, confident expression.',
    'Show the complete head, hair, shoulders, torso, and arms. Leave generous clean headroom equal to about twelve percent of the frame above the hair and do not crop the face, hair, chin, shoulders, or hands.',
    'Isolate the complete subject on a transparent background; do not include a studio backdrop, scenery, floor, furniture, or shadows outside the person.',
    `Dress the subject in a premium charcoal corporate suit with a crisp white shirt, a ${cut}, and a restrained burnt-orange pocket square.`,
    'Keep the person unmistakably recognizable by preserving their facial structure, skin tone, hair, age, eyewear, and distinctive features while correcting the pose to face forward.',
    'Remove handheld objects, microphones, other people, furniture, scenery, and clothing from the source. Use a natural symmetrical pose, clean tailoring, realistic anatomy, and polished studio lighting.',
    'Return a photorealistic vertical portrait with no text, no letters, no logos, no watermarks, no symbols, and no extra people.',
  ].join(' ')
}

export function createOpenAIImageEditor(options: { apiKey: string; fetchImpl?: FetchLike; timeoutMs?: number; model?: string }): PortfolioImageEditor {
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? 120_000
  const model = options.model?.trim() || process.env.PORTFOLIO_IMAGE_MODEL?.trim() || 'gpt-image-2.5-sunburst'

  return {
    async edit(input): Promise<PortfolioEditResult> {
      const body = new FormData()
      body.append('model', model)
      body.append('size', '1024x1536')
      body.append('quality', 'medium')
      body.append('background', 'transparent')
      body.append('output_format', 'png')
      body.append('n', '1')
      body.append('prompt', buildVariantPrompt(input.tailoring))
      body.append('image[]', new Blob([new Uint8Array(input.portrait)], { type: 'image/png' }), 'portrait.png')

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      let response: Response
      const startedAt = Date.now()
      if (process.env.NODE_ENV !== 'production') {
        console.info('[portfolio-cover] OpenAI edit started', { model, tailoring: input.tailoring, variant: input.variant })
      }
      try {
        response = await fetchImpl('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: { Authorization: `Bearer ${options.apiKey}` },
          body,
          signal: controller.signal,
        })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw new PortfolioProviderError('provider_timeout', true)
        throw new PortfolioProviderError('provider_unavailable', true)
      } finally {
        clearTimeout(timeout)
      }

      if (!response.ok) {
        throw new PortfolioProviderError(response.status >= 500 ? 'provider_unavailable' : 'provider_rejected', response.status >= 500 || response.status === 429)
      }

      let payload: { data?: Array<{ b64_json?: string }> }
      try { payload = await response.json() as { data?: Array<{ b64_json?: string }> } } catch { throw new PortfolioProviderError('invalid_provider_output', true) }
      const encoded = payload.data?.[0]?.b64_json
      // Buffer.from(..., 'base64') is deliberately forgiving and silently
      // drops malformed characters, so validate the provider payload before
      // accepting it as an image artifact.
      if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
        throw new PortfolioProviderError('invalid_provider_output', true)
      }
      const image = Buffer.from(encoded, 'base64')
      if (!image.length) throw new PortfolioProviderError('invalid_provider_output', true)
      const requestId = response.headers.get('x-request-id') ?? undefined
      if (process.env.NODE_ENV !== 'production') {
        console.info('[portfolio-cover] OpenAI edit completed', { model, requestId: requestId ?? null, bytes: image.length, durationMs: Date.now() - startedAt })
      }
      return { image, requestId }
    },
  }
}
