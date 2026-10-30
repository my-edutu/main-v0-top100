import type { AwardeeFilters } from '@/lib/data'

export type AwardeeSearchParams = {
  search?: string
  payment?: string
  contact?: string
  country?: string
  agent?: string
  assignment?: string
  followup?: string
  sort?: string
  page?: string
  shuffle?: string
}

export function toAwardeeFilters(
  params: AwardeeSearchParams,
  fallbackSeed: string,
): AwardeeFilters {
  const page = Number(params.page ?? 1)
  const sorts = ['name', 'newest', 'followup', 'last_contact', 'shuffle']
  return {
    search: params.search,
    paymentStatus: params.payment
      ?.split(',')
      .filter((value) =>
        ['paid', 'unpaid', 'pending', 'refunded'].includes(value),
      ),
    contactStatus: ['not_contacted', 'contacted', 'responded'].includes(
      params.contact ?? '',
    )
      ? params.contact
      : undefined,
    country: params.country,
    agentId: params.agent,
    assignment:
      params.assignment === 'assigned' || params.assignment === 'unassigned'
        ? params.assignment
        : '',
    followUp: ['due', 'overdue', 'scheduled'].includes(params.followup ?? '')
      ? (params.followup as AwardeeFilters['followUp'])
      : '',
    sort: sorts.includes(params.sort ?? '')
      ? (params.sort as AwardeeFilters['sort'])
      : 'name',
    shuffleSeed: params.shuffle || fallbackSeed,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: 25,
  }
}
