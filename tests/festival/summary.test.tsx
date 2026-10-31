import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { FestivalInterestSummary } from '@/app/dashboard/_components/festival-interest-summary'
import type { FestivalInterestView } from '@/lib/festival/interest'

const interest = {
  fullName: 'Amara Okafor',
  phone: '+2348031234567',
  pickupRequested: true,
  updatedAt: '2026-10-31T00:00:00Z',
}
function render(
  payment: FestivalInterestView['payment'],
  pickupRequested = true,
) {
  return renderToStaticMarkup(
    <FestivalInterestSummary
      interest={{ ...interest, pickupRequested }}
      payment={payment}
      onEdit={vi.fn()}
      onCheckPayment={vi.fn()}
      checking={false}
      error=""
    />,
  )
}

describe('registered festival interest', () => {
  it('shows saved details and an edit action without keeping a form open', () => {
    const html = render('confirmed')
    expect(html).toContain('Amara Okafor')
    expect(html).toContain('+2348031234567')
    expect(html).toContain('Requested at festival')
    expect(html).toContain('Edit details')
    expect(html).not.toContain('<input')
    expect(html).not.toContain('<form')
  })
  it('offers the existing payment destination only when payment is needed or pending', () => {
    expect(render('required')).toContain('href="/dashboard/me/award/payment"')
    expect(render('pending')).toContain('href="/dashboard/me/award/payment"')
    expect(render('confirmed')).not.toContain(
      'href="/dashboard/me/award/payment"',
    )
  })
  it('keeps verification failures actionable without inviting another payment', () => {
    const html = render('unavailable')
    expect(html).toContain('Check payment status')
    expect(html).not.toContain('href="/dashboard/me/award/payment"')
    expect(html).not.toContain('Payment confirmed')
  })
  it('leaves payment out when award pickup was not requested', () => {
    const html = render('not_requested', false)
    expect(html).toContain('Not requested')
    expect(html).not.toContain('Award payment')
    expect(html).not.toContain('Check payment status')
  })
})
