import { getCountries, type CountryCode } from 'libphonenumber-js/min'

import type { AwardPaymentCurrency } from '@/lib/payments/bachs/types'

const supportedCountries = new Set<string>(getCountries())

export function magazineBillingCurrency(countryCode: string): AwardPaymentCurrency {
  const normalized = countryCode.trim().toUpperCase()
  if (!supportedCountries.has(normalized)) throw new Error('Select a valid country.')
  return (normalized === 'NG' ? 'NGN' : 'USD') satisfies AwardPaymentCurrency
}

export function normalizeMagazineCountryCode(countryCode: string): CountryCode {
  const normalized = countryCode.trim().toUpperCase()
  if (!supportedCountries.has(normalized)) throw new Error('Select a valid country.')
  return normalized as CountryCode
}
