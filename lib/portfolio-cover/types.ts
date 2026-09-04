export type PortfolioTailoring = 'male' | 'female'

export type PortfolioVariant = 'executive-charcoal' | 'leadership-ivory'

export type PortfolioGenerationStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'selected'
  | 'failed'
  | 'rejected'
  | 'expired'

export type PortfolioCoverFields = {
  name?: string
  school?: string
  cgpa?: string
  degreeClass?: string
  fieldOfStudy?: string
  country?: string
  cohort?: string
  headline?: string
  impactStatement?: string
}

export type PortfolioCoverGeneration = {
  id: string
  memberId: string
  status: PortfolioGenerationStatus
  tailoring: PortfolioTailoring
  fields: PortfolioCoverFields
  attempt: number
  options: Partial<Record<PortfolioVariant, string>>
  selectedVariant?: PortfolioVariant
  selectedUrl?: string
  failureCode?: string
  createdAt: string
  updatedAt: string
}
