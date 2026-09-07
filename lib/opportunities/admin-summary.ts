import type { OpportunityStatus, OpportunityVisibility } from './types'

type OpportunitySummaryItem = {
  status: OpportunityStatus
  visibility: OpportunityVisibility
}

export function summarizeAdminOpportunities(items: OpportunitySummaryItem[]) {
  return {
    total: items.length,
    published: items.filter((item) => item.status === 'published').length,
    restricted: items.filter((item) => item.visibility !== 'public').length,
    drafts: items.filter((item) => item.status === 'draft').length,
  }
}
