/** PostgREST returns unique payout relations as an object; older callers may use an array. */
export function payoutReference(value: unknown): string | null {
  const payout = Array.isArray(value) ? value[0] : value
  if (!payout || typeof payout !== 'object' || !('transaction_reference' in payout)) return null
  return typeof payout.transaction_reference === 'string' && payout.transaction_reference.trim()
    ? payout.transaction_reference.trim()
    : null
}
