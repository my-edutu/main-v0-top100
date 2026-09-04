import type { PortfolioGenerationStatus } from './types'

export function canCreatePortfolioGeneration(input: {
  active: boolean
  successful: boolean
  attempts: number
}) {
  return !input.active && !input.successful && input.attempts === 0
}

export function canRetryPortfolioGeneration(input: {
  status: PortfolioGenerationStatus
  attempts: number
}) {
  return input.status === 'failed' && input.attempts === 1
}

export function canResetPortfolioGeneration(input: {
  isAdmin: boolean
  status: PortfolioGenerationStatus
}) {
  return input.isAdmin && ['ready', 'selected', 'rejected', 'failed'].includes(input.status)
}
