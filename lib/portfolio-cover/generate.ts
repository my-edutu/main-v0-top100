import { portfolioObjectPath } from './repository'
import { renderPortfolioCover } from './render-cover'
import type { PortfolioCoverFields, PortfolioTailoring, PortfolioVariant } from './types'

export const PORTFOLIO_VARIANTS: PortfolioVariant[] = ['executive-charcoal']

type GenerationInput = {
  id: string
  memberId: string
  memberName: string
  tailoring: PortfolioTailoring
  fields: PortfolioCoverFields
  portrait: Buffer
  attempt?: number
}

type GenerationRepository = {
  update: (id: string, patch: Record<string, unknown>) => Promise<unknown>
  uploadOption: (path: string, body: Buffer) => Promise<void>
}

export async function generatePortfolioCoverSet(
  input: GenerationInput,
  deps: { repo: GenerationRepository; render?: typeof renderPortfolioCover; editor?: unknown },
) {
  const render = deps.render ?? renderPortfolioCover
  const attempt = input.attempt ?? 1
  await deps.repo.update(input.id, { status: 'processing', attempt })

  try {
    const optionPaths: Record<PortfolioVariant, string> = {} as Record<PortfolioVariant, string>
    const requestIds: string[] = []
    for (const variant of PORTFOLIO_VARIANTS) {
      const cover = await render({ portrait: input.portrait, memberName: input.fields.name?.trim() || input.memberName, fields: input.fields })
      const path = portfolioObjectPath(input.memberId, input.id, variant)
      await deps.repo.uploadOption(path, cover)
      optionPaths[variant] = path
    }
    await deps.repo.update(input.id, { status: 'ready', attempt, option_paths: optionPaths, provider_request_ids: requestIds })
    return { status: 'ready' as const, optionPaths }
  } catch (error) {
    const code = error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : 'generation_failed'
    await deps.repo.update(input.id, { status: 'failed', attempt, failure_code: code })
    throw error
  }
}
