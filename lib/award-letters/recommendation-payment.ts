export const FREE_RECOMMENDATION_LIMIT = 3
export const RECOMMENDATION_PACK_SIZE = 5

export type RecommendationAccess = {
  award: 'confirmed' | 'pending' | 'required' | 'unavailable'
  freeRemaining: number
  credits: number
  checkoutPending: boolean
  demo?: boolean
}

export function canIssueRecommendation(access: RecommendationAccess) {
  return access.award === 'confirmed' || access.freeRemaining > 0 || access.credits > 0
}
