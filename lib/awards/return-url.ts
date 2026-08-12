type AwardReturnPathOptions = {
  paymentDone: boolean
  demo?: boolean
}

export function awardReturnPath({
  paymentDone,
  demo = false,
}: AwardReturnPathOptions): string {
  const params = new URLSearchParams()

  if (paymentDone) params.set('payment', 'done')
  if (demo) params.set('demo', '1')

  const query = params.toString()
  return `/dashboard/me/award${query ? `?${query}` : ''}`
}
