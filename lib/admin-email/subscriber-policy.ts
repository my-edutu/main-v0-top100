export type ListmonkSubscription = { status: string; lists?: Array<{ subscription_status?: string }> }
/** A missing or unknown status must be reviewed, not silently converted to an opt-out. */
export function subscriberDecision(value: ListmonkSubscription | null): 'allow' | 'suppress' | 'hold' {
  if (!value) return 'allow'
  if (value.status === 'blocklisted') return 'suppress'
  if (value.status !== 'enabled' || !Array.isArray(value.lists)) return 'hold'
  if (value.lists.some(list => list.subscription_status === 'unsubscribed')) return 'suppress'
  if (value.lists.some(list => !['unconfirmed', 'confirmed'].includes(list.subscription_status ?? ''))) return 'hold'
  return 'allow'
}
export function mayAddSubscriber(value: ListmonkSubscription | null): boolean { return subscriberDecision(value) === 'allow' }
