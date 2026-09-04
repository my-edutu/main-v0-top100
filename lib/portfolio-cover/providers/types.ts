import type { PortfolioTailoring, PortfolioVariant } from '../types'

export type PortfolioEditInput = {
  portrait: Buffer
  mask: Buffer
  tailoring: PortfolioTailoring
  variant: PortfolioVariant
}

export type PortfolioEditResult = { image: Buffer; requestId?: string }

export interface PortfolioImageEditor {
  edit(input: PortfolioEditInput): Promise<PortfolioEditResult>
}
