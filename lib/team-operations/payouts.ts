export type PayoutStatus = 'requested' | 'under_review' | 'approved' | 'processing' | 'paid' | 'rejected' | 'cancelled'
export type TeamPayout = {
  id: string
  teamId: string
  requesterName: string
  amountMinor: number
  currency: string
  status: PayoutStatus
  payoutMethod: string
  bankName: string | null
  accountName: string | null
  accountNumber: string | null
  otherDestination: string | null
  requestedAt: string
  paidAt: string | null
  reference: string | null
  canManage: boolean
  isOwnRequest: boolean
}
export type TeamPayoutPage = {
  requests: TeamPayout[]
  page: number
  pageSize: number
  total: number
  canManageTeam: boolean
}
