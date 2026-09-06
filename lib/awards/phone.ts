import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'

export function internationalDeliveryPhone(value: string, country: CountryCode): string {
  const parsed = parsePhoneNumberFromString(value.trim(), { defaultCountry: country, extract: false })
  return parsed?.isPossible() && !parsed.ext ? parsed.number : ''
}
