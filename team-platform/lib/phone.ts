export type PhoneResult =
  | { ok: true; e164: string; whatsapp: string; country: 'NG' | 'INTL' }
  | { ok: false; reason: string }

const NIGERIAN_MOBILE = /^[789]\d{9}$/

/**
 * Normalises a phone number to E.164. Nigerian local formats (0803…, 803…,
 * 234803…) become +234803…. Numbers already in international form keep their
 * country code. This is deliberately conservative: an ambiguous or too-short
 * number is rejected instead of being stored in a form WhatsApp cannot open.
 */
export function normalizePhone(input: string | null | undefined, country = 'Nigeria'): PhoneResult {
  const raw = (input ?? '').trim()
  if (!raw) return { ok: false, reason: 'Phone number is required' }

  let digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('+')) digits = digits.slice(1)
  digits = digits.replace(/\D/g, '')

  if (!digits) return { ok: false, reason: 'Phone number has no digits' }

  const isNigeria = /^(nigeria|ng)$/i.test(country.trim())

  if (isNigeria) {
    if (digits.length === 11 && digits.startsWith('0')) {
      const local = digits.slice(1)
      if (!NIGERIAN_MOBILE.test(local)) return { ok: false, reason: 'Not a valid Nigerian mobile number' }
      return { ok: true, e164: `+234${local}`, whatsapp: `234${local}`, country: 'NG' }
    }
    if (digits.length === 10 && NIGERIAN_MOBILE.test(digits)) {
      return { ok: true, e164: `+234${digits}`, whatsapp: `234${digits}`, country: 'NG' }
    }
    if (digits.length === 13 && digits.startsWith('234')) {
      const local = digits.slice(3)
      if (!NIGERIAN_MOBILE.test(local)) return { ok: false, reason: 'Not a valid Nigerian mobile number' }
      return { ok: true, e164: `+234${local}`, whatsapp: `234${local}`, country: 'NG' }
    }
    if (digits.length >= 11 && digits.length <= 15) {
      // A foreign number stored on a Nigerian awardee is allowed if it has a
      // plausible country code.
      return { ok: true, e164: `+${digits}`, whatsapp: digits, country: 'INTL' }
    }
    return { ok: false, reason: 'Unrecognised Nigerian phone number' }
  }

  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, reason: 'International number must be 8–15 digits' }
  }
  return { ok: true, e164: `+${digits}`, whatsapp: digits, country: 'INTL' }
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value.trim())
}

export function maskPhone(phone: string | null | undefined) {
  if (!phone) return '—'
  if (phone.length < 6) return phone
  return `${phone.slice(0, 4)}•••${phone.slice(-3)}`
}

export function maskAccountNumber(value: string) {
  if (!value) return '—'
  return value.length <= 4 ? value : `••••${value.slice(-4)}`
}
