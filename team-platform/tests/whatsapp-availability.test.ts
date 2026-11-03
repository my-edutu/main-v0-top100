import { expect, it } from 'vitest'
import { whatsappUnavailableReport } from '@/lib/whatsapp-availability'

const report = { phone: '+2348031234567', source: 'rep_reported', reported_at: '2026-11-03T17:00:00Z' }
it('shows only a rep report for the same normalized current phone', () => {
  expect(whatsappUnavailableReport({ phone: '0803 123 4567', country: 'Nigeria', metadata: { whatsapp_unavailable_report: report } })).toEqual({ phone: report.phone, reportedAt: report.reported_at })
  expect(whatsappUnavailableReport({ phone: '+2348037654321', metadata: { whatsapp_unavailable_report: report } })).toBeNull()
})
it('does not invent verified availability from malformed or unrelated metadata', () => {
  for (const value of [null, {}, { ...report, source: 'verified' }, { ...report, reported_at: 'bad-date' }, { ...report, phone: '08031234567' }]) {
    expect(whatsappUnavailableReport({ phone: '08031234567', metadata: { whatsapp_unavailable_report: value } })).toBeNull()
  }
})
