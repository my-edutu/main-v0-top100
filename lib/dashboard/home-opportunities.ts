import { isDeadlinePast, type Opportunity } from '@/lib/opportunities/types'

export function selectHomeOpportunities(
  opportunities: Opportunity[],
  now: Date = new Date(),
): Opportunity[] {
  return opportunities
    .filter((opportunity) => {
      if (opportunity.status !== 'published' || !opportunity.deadline) return false
      if (Number.isNaN(new Date(opportunity.deadline).getTime())) return false
      return !isDeadlinePast(opportunity.deadline, now)
    })
    .sort(
      (left, right) =>
        new Date(left.deadline as string).getTime() -
        new Date(right.deadline as string).getTime(),
    )
    .slice(0, 3)
}
