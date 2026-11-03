import { expect, it } from 'vitest'
import { payoutReference } from '@/lib/payouts'

it('shows a completed payout reference from either PostgREST relation shape', () => {
  expect(payoutReference({ transaction_reference: ' BANK-001 ' })).toBe('BANK-001')
  expect(payoutReference([{ transaction_reference: 'BANK-002' }])).toBe('BANK-002')
})
it('does not invent a transfer reference when no payout exists', () => {
  for (const value of [null, undefined, [], {}, { transaction_reference: 123 }, { transaction_reference: ' ' }]) {
    expect(payoutReference(value)).toBeNull()
  }
})
