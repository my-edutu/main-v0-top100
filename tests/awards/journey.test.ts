import { describe, expect, it } from 'vitest'

import {
  awardStepPath,
  awardStepRedirect,
  resolveAwardStep,
  validateAwardAddress,
} from '@/app/dashboard/_lib/award-journey'

describe('award journey state resolution', () => {
  it.each([
    [null, 'address'],
    [{ status: 'draft' }, 'address'],
    [{ status: 'quote_failed' }, 'address'],
    [{ status: 'quoted' }, 'review'],
    [{ status: 'awaiting_payment' }, 'payment'],
    [{ status: 'paid' }, 'tracking'],
    [{ status: 'processing' }, 'tracking'],
    [{ status: 'dispatched' }, 'tracking'],
    [{ status: 'in_transit' }, 'tracking'],
    [{ status: 'delivered' }, 'tracking'],
    [{ status: 'exception' }, 'tracking'],
    [{ status: 'cancelled' }, 'tracking'],
  ] as const)('resolves %o to %s', (order, expected) => {
    expect(resolveAwardStep(order)).toBe(expected)
  })

  it('builds stable paths for each routed step', () => {
    expect(awardStepPath('address')).toBe('/dashboard/me/award/address')
    expect(awardStepPath('review')).toBe('/dashboard/me/award/review')
    expect(awardStepPath('payment')).toBe('/dashboard/me/award/payment')
    expect(awardStepPath('tracking')).toBe('/dashboard/me/award/tracking')
  })
})

describe('award journey prerequisite guards', () => {
  it('redirects attempts to skip an incomplete address or quote', () => {
    expect(awardStepRedirect('review', null)).toBe('/dashboard/me/award/address')
    expect(awardStepRedirect('payment', { status: 'draft' })).toBe(
      '/dashboard/me/award/address',
    )
    expect(awardStepRedirect('tracking', { status: 'quoted' })).toBe(
      '/dashboard/me/award/review',
    )
    expect(awardStepRedirect('tracking', { status: 'awaiting_payment' })).toBe(
      '/dashboard/me/award/payment',
    )
  })

  it('allows completed steps and the next action while a quote is live', () => {
    expect(awardStepRedirect('address', null)).toBeNull()
    expect(awardStepRedirect('address', { status: 'quoted' })).toBeNull()
    expect(awardStepRedirect('review', { status: 'quoted' })).toBeNull()
    expect(awardStepRedirect('payment', { status: 'quoted' })).toBeNull()
    expect(awardStepRedirect('review', { status: 'awaiting_payment' })).toBeNull()
  })

  it('moves every pre-tracking route forward after payment', () => {
    expect(awardStepRedirect('address', { status: 'paid' })).toBe(
      '/dashboard/me/award/tracking',
    )
    expect(awardStepRedirect('review', { status: 'in_transit' })).toBe(
      '/dashboard/me/award/tracking',
    )
    expect(awardStepRedirect('payment', { status: 'delivered' })).toBe(
      '/dashboard/me/award/tracking',
    )
    expect(awardStepRedirect('tracking', { status: 'delivered' })).toBeNull()
  })
})

describe('award address validation', () => {
  const validAddress = {
    recipientName: 'Amara Okafor',
    phone: '+234 800 000 0000',
    email: 'amara@example.com',
    addressLine1: '1 Demo Street',
    addressLine2: '',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    postalCode: '',
  }

  it('accepts a complete delivery address', () => {
    expect(validateAwardAddress(validAddress)).toEqual({})
  })

  it('returns field-linked errors for missing required values', () => {
    expect(
      validateAwardAddress({
        ...validAddress,
        recipientName: ' ',
        phone: '123',
        addressLine1: '',
        city: '',
        state: '',
        country: '',
      }),
    ).toEqual({
      recipientName: 'Enter the full name for delivery.',
      phone: 'Enter a reachable phone number.',
      addressLine1: 'Enter your street address.',
      city: 'Enter your city.',
      state: 'Enter your state or region.',
      country: 'Enter your country.',
    })
  })

  it('rejects an invalid email without rejecting optional fields', () => {
    expect(
      validateAwardAddress({ ...validAddress, email: 'not-an-email' }),
    ).toEqual({ email: 'Enter a valid email address.' })
  })
})
