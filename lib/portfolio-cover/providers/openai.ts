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
    'Edit only the transparent lower wardrobe region into a premium charcoal corporate suit with a white shirt, subtle orange pocket square, and a tailored professional cut.',
    `Use a ${cut} and extend a natural upper torso beneath the neckline when the source is a close portrait.`,
    'Keep the original person exactly recognizable: do not change the face, facial features, skin tone, hair, age, body shape above the mask, pose, expression, or jewelry.',
    'Preserve the original framing and lighting. Do not add text, logos, written facts, symbols, or extra people.',
    'Use a premium Africa-focused magazine editorial finish with realistic fabric, natural shoulders, and clean edges. Return one vertical portrait.',
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
      body.append('n', '1')
      body.append('prompt', buildVariantPrompt(input.tailoring))
      body.append('image[]', new Blob([new Uint8Array(input.portrait)], { type: 'image/png' }), 'portrait.png')
      body.append('mask', new Blob([new Uint8Array(input.mask)], { type: 'image/png' }), 'mask.png')

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
