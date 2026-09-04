import { portfolioObjectPath } from './repository'
import { renderPortfolioCover } from './render-cover'
import type { PortfolioImageEditor } from './providers/types'
import type { PortfolioCoverFields, PortfolioTailoring, PortfolioVariant } from './types'

export const PORTFOLIO_VARIANTS: PortfolioVariant[] = ['executive-charcoal', 'leadership-ivory']

type GenerationInput = {
  id: string
  memberId: string
  memberName: string
  tailoring: PortfolioTailoring
  fields: PortfolioCoverFields
  portrait: Buffer
  mask: Buffer
  attempt?: number
}

type GenerationRepository = {
  update: (id: string, patch: Record<string, unknown>) => Promise<unknown>
  uploadOption: (path: string, body: Buffer) => Promise<void>
}

export async function generatePortfolioCoverSet(
  input: GenerationInput,
  deps: { repo: GenerationRepository; editor: PortfolioImageEditor; render?: typeof renderPortfolioCover },
) {
  const render = deps.render ?? renderPortfolioCover
  const attempt = input.attempt ?? 1
  await deps.repo.update(input.id, { status: 'processing', attempt })

  try {
    const optionPaths: Record<PortfolioVariant, string> = {} as Record<PortfolioVariant, string>
    const requestIds: string[] = []
    for (const variant of PORTFOLIO_VARIANTS) {
      const edited = await deps.editor.edit({ portrait: input.portrait, mask: input.mask, tailoring: input.tailoring, variant })
      if (edited.requestId) requestIds.push(edited.requestId)
      const cover = await render({ portrait: edited.image, memberName: input.memberName, tailoring: input.tailoring, variant, fields: input.fields })
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
