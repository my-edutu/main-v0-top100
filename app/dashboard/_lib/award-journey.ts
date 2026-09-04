export const AWARD_JOURNEY_STEPS = [
  'address',
  'review',
  'payment',
  'tracking',
] as const

export type AwardJourneyStep = (typeof AWARD_JOURNEY_STEPS)[number]
export type AwardJourneyOrder = { status: string } | null | undefined

export type AwardAddressValues = {
  recipientName: string
  phone: string
  email: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  country: string
  postalCode: string
}

export type AwardAddressErrors = Partial<
  Record<keyof AwardAddressValues, string>
>

const STEP_PATHS: Record<AwardJourneyStep, string> = {
  address: '/dashboard/me/award/address',
  review: '/dashboard/me/award/review',
  payment: '/dashboard/me/award/payment',
  tracking: '/dashboard/me/award/tracking',
}

export function awardStepPath(step: AwardJourneyStep): string {
  return STEP_PATHS[step]
}

export function resolveAwardStep(order: AwardJourneyOrder): AwardJourneyStep {
  if (!order || order.status === 'draft' || order.status === 'quote_failed') {
    return 'address'
  }

  if (order.status === 'quoted') return 'review'
  if (order.status === 'awaiting_payment') return 'payment'

  // Paid fulfilment, delivery exceptions and unknown server-side states must
  // never expose a fresh payment handoff. Tracking is the safe recovery view.
  return 'tracking'
}

export function shouldAdvanceFromAwardQuote(order: AwardJourneyOrder): boolean {
  return order?.status === 'quoted'
}

export function awardStepRedirect(
  requestedStep: AwardJourneyStep,
  order: AwardJourneyOrder,
): string | null {
  const currentStep = resolveAwardStep(order)

  if (currentStep === 'tracking') {
    return requestedStep === 'tracking' ? null : awardStepPath('tracking')
  }

  if (currentStep === 'address') {
    return requestedStep === 'address' ? null : awardStepPath('address')
  }

  if (currentStep === 'review') {
    return requestedStep === 'tracking' ? awardStepPath('review') : null
  }

  if (requestedStep === 'tracking') return awardStepPath('payment')
  if (requestedStep === 'address') return awardStepPath('payment')
  return null
}

export function validateAwardAddress(
  values: AwardAddressValues,
): AwardAddressErrors {
  const errors: AwardAddressErrors = {}

  if (values.recipientName.trim().length < 2) {
    errors.recipientName = 'Enter the full name for delivery.'
  }
  if (values.phone.trim().length < 7) {
    errors.phone = 'Enter a reachable phone number.'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (values.addressLine1.trim().length < 4) {
    errors.addressLine1 = 'Enter your street address.'
  }
  if (values.city.trim().length < 2) errors.city = 'Enter your city.'
  if (values.state.trim().length < 2) {
    errors.state = 'Enter your state or region.'
  }
  if (values.country.trim().length < 2) {
    errors.country = 'Enter your country.'
  }

  return errors
}
