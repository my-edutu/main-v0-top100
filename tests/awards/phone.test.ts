import { expect, it } from 'vitest'
import { internationalDeliveryPhone } from '@/lib/awards/phone'

it('normalizes national numbers using the selected country', () => {
  expect(internationalDeliveryPhone('0803 123 4567', 'NG')).toBe('+2348031234567')
  expect(internationalDeliveryPhone('07123 456789', 'GB')).toBe('+447123456789')
})
it('preserves a pasted international number without duplicating its code', () => {
  expect(internationalDeliveryPhone('+1 202 555 0123', 'NG')).toBe('+12025550123')
})
it('rejects incomplete or non-phone input', () => {
  expect(internationalDeliveryPhone('', 'NG')).toBe('')
  expect(internationalDeliveryPhone('123', 'NG')).toBe('')
  expect(internationalDeliveryPhone('call me tomorrow', 'NG')).toBe('')
})
