/**
 * Money parsing for forms. All storage is integer minor units.
 */
export function parseMoneyToMinor(input: string | number, currency = 'NGN'): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new Error('Enter a valid amount')
    return Math.round(input * 100)
  }
  const cleaned = input
    .trim()
    .replace(/,/g, '')
    .replace(/[₦$€£\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Enter a valid ${currency} amount with at most 2 decimal places`)
  }
  const [whole, fraction = ''] = cleaned.split('.')
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(minor) || minor <= 0) {
    throw new Error('Amount must be greater than zero')
  }
  return minor
}

export function minorToInput(minor: number | null | undefined) {
  return ((minor ?? 0) / 100).toFixed(2)
}

export function safeAdd(a: number, b: number) {
  const result = a + b
  if (!Number.isSafeInteger(result)) throw new Error('Amount exceeds safe range')
  return result
}
