export type CycleJob = {
  id: string
  cycleId: string
  cycleName: string
  cycleYear: number | null
  status: string
  totalCount: number
  processedCount: number
  needsReviewCount: number
  taskCounts: {
    pending: number
    processing: number
    retry: number
    failed: number
    completed: number
  }
}

export type SelectionOverview = {
  configured: boolean
  message?: string
  jobs: CycleJob[]
}

export type RankingApproval = {
  id: string
  approver_id: string
  decision: 'approve' | 'reject'
  notes: string
  created_at: string
}

export type RankingRun = {
  id: string
  cycle_id: string
  name: string
  policy_version: string
  status: 'draft' | 'frozen' | 'approved' | 'published' | 'void'
  winner_target: number
  reserve_target: number
  eligible_count: number
  proposed_winner_count: number
  reserve_count: number
  countries_represented: number
  input_checksum: string
  frozen_at: string | null
  approved_at: string | null
  published_at: string | null
  created_at: string
  selection_ranking_approvals?: RankingApproval[] | null
}

export type RankingApplicant = {
  full_name: string
  primary_email: string | null
  institution: string | null
  course: string | null
}

export type RankingEntry = {
  id: string
  application_id: string
  country: string
  overall_rank: number
  country_rank: number
  total_score: number | string
  selection_status: 'proposed_winner' | 'reserve' | 'eligible_not_selected'
  selection_applications: RankingApplicant | RankingApplicant[] | null
}

export type RankingDetails = {
  run: RankingRun
  entries: RankingEntry[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
}

export const requestJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with HTTP ${response.status}`)
  }
  return payload as T
}

export const statusStyle = (status: RankingRun['status']) => {
  if (status === 'approved' || status === 'published') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (status === 'void') return 'border-rose-200 bg-rose-50 text-rose-700'
  if (status === 'frozen') return 'border-blue-200 bg-blue-50 text-blue-700'
  return 'border-zinc-200 bg-zinc-50 text-zinc-600'
}
