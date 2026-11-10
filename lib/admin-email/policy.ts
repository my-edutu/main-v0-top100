/** 'hold' means required evidence is unavailable, so delivery must not be attempted. */
export type DeliveryEvidence = {
  status: string
  memberExists: boolean
  sameEmail: boolean
  suppressed: boolean
  audienceEligible: boolean
  couponPresent: boolean
  couponAvailable: boolean | null
}
export function deliveryDecision(input: DeliveryEvidence): 'send' | 'skip' | 'hold' {
  if (input.status === 'cancelled') return 'skip'
  if (input.status !== 'scheduled' && input.status !== 'running') return 'hold'
  if (!input.memberExists || !input.sameEmail || input.suppressed || !input.audienceEligible) return 'skip'
  if (input.couponPresent && input.couponAvailable === null) return 'hold'
  if (input.couponPresent && input.couponAvailable === false) return 'skip'
  return 'send'
}
