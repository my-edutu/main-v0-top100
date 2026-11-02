import { beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ payment: vi.fn(), book: vi.fn(), quote: vi.fn(), provider: vi.fn(), create: vi.fn() }))
vi.mock('@/lib/awards/payment-server', () => ({ getAwardPaymentView: state.payment }))
vi.mock('@/lib/courier', () => ({ getCourier: () => ({ name: 'gig', quote: state.quote, book: state.book }) }))
vi.mock('@/lib/payments/bachs/settlement', () => ({ verifyBachsAwardCheckout: state.provider }))
vi.mock('@/lib/payments/bachs/checkout', async original => ({ ...await original<typeof import('@/lib/payments/bachs/checkout')>(), createCheckoutSession: state.create }))
import { dispatchPaidDelivery, deliveryView, readDelivery, reconcileDeliveryRow, saveDeliveryQuote, startDeliveryCheckout, type DeliveryRow } from '@/lib/awards/delivery/server'
import { BACHS_DELIVERY_PAYMENT_LINK } from '@/lib/payments/bachs/payment-links'
const id = '3b1ab34c-af79-42de-857c-b56e2aa1aa01'
const row: DeliveryRow = { id, order_id: 'order-1', member_id: 'member-1', status: 'paid', amount_minor: 513550, currency: 'NGN', expires_at: '2099-01-01T00:00:00Z', reference: 'delivery-reference', checkout_id: 'chk-1', checkout_url: 'https://checkout.bachs.io/c/1', checkout_request: null, checkout_expires_at: '2099-01-01T00:00:00Z', charge_id: 'charge-1', paid_at: '2026-11-01T00:00:00Z', payment_evidence: { checkout_id: 'chk-1', reference: 'delivery-reference', purpose: 'afl_award_delivery_v1', status: 'paid', amount_minor: 513550, charge_id: 'charge-1' }, waybill: null, tracking_url: null, quote_input: { recipientName: 'Amara Okafor', phone: '+2348031234567', email: 'member@example.com', deliveryMode: 'home', countryCode: 'NG', country: 'Nigeria', provinceCode: '', addressLine1: '12 Adeola Odeku Street', addressLine2: '', city: 'Victoria Island', state: 'Lagos', postalCode: '' }, resolved_delivery: { mode: 'home', stationId: 4, latitude: 6.4281, longitude: 3.4219, formattedAddress: '12 Adeola Odeku Street, Lagos' } }
function database(current: DeliveryRow | null = row) {
  const chain: any = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), maybeSingle: vi.fn(async () => ({ data: current, error: null })), then: (resolve: (value: unknown) => void) => resolve({ data: current, error: null }) }
  const rpc = vi.fn(async (name: string) => ({ data: name === 'claim_award_delivery_dispatch' ? { ...row, status: 'booking' } : name === 'finish_award_delivery_dispatch' ? { ...row, status: 'dispatched', waybill: 'WB-1' } : current, error: null }))
  return { from: vi.fn(() => chain), rpc, chain }
}
beforeEach(() => {
  vi.resetAllMocks()
  for (const [key, value] of Object.entries({ BACHS_API_BASE_URL: 'https://sandbox-api.bachs.io', BACHS_API_KEY: 'sk_sandbox_test', NEXT_PUBLIC_SITE_URL: 'https://top100afl.com', BACHS_AWARD_WEBHOOK_SECRET: 'test-secret', BACHS_ORGANIZATION_ID: 'org-1', AWARD_DELIVERY_CHECKOUT_ENABLED: 'true', BACHS_CHECKOUT_HOSTS: 'checkout.bachs.io', GIG_SENDER_NAME: 'Top100', GIG_SENDER_PHONE: '+2348031234567', GIG_SENDER_ADDRESS: 'Pickup address' })) vi.stubEnv(key, value)
  state.payment.mockResolvedValue({ status: 'paid', confirmedPayment: { amountMinor: 2500000, currency: 'NGN' } })
  state.book.mockResolvedValue({ waybill: 'WB-1', trackingUrl: null, raw: {} })
})
import { afterEach } from 'vitest'
afterEach(() => vi.unstubAllEnvs())
describe('separately paid delivery', () => {
  it('shows delivery already included for a previously paid combined order', async () => {
    const db = database(null)
    db.chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { status: 'paid', paid_at: '2026-01-01T00:00:00Z', paystack_reference: 'legacy-ref', paystack_status: 'success', gig_waybill: 'OLD-WB', gig_tracking_url: 'javascript:bad' }, error: null })
    expect(await readDelivery('member-1', db)).toEqual({ delivery: null, includedDelivery: { waybill: 'OLD-WB', trackingUrl: null } })
    expect(state.create).not.toHaveBeenCalled(); expect(state.quote).not.toHaveBeenCalled()
  })
  it.each(['quoted', 'creating', 'open', 'expired', 'needs_review', 'booking', 'dispatched'] as const)('does not book a %s row', async status => {
    const db = database()
    expect((await dispatchPaidDelivery({ ...row, status }, db)).status).toBe(status)
    expect(state.book).not.toHaveBeenCalled(); expect(db.rpc).not.toHaveBeenCalled()
  })
  it('durably claims a paid delivery before booking the exact priced destination', async () => {
    const db = database()
    state.book.mockImplementation(async input => {
      expect(db.rpc).toHaveBeenCalledWith('claim_award_delivery_dispatch', { p_id: id })
      expect(input).toMatchObject({ orderId: id, quotedDelivery: row.resolved_delivery, recipientName: 'Amara Okafor', email: 'member@example.com' })
      return { waybill: 'WB-1', trackingUrl: 'javascript:bad', raw: {} }
    })
    expect(await dispatchPaidDelivery(row, db)).toMatchObject({ status: 'dispatched', waybill: 'WB-1' })
    expect(db.rpc).toHaveBeenCalledWith('finish_award_delivery_dispatch', { p_id: id, p_waybill: 'WB-1', p_url: null, p_response: {} })
    expect(state.book).toHaveBeenCalledOnce()
  })
  it('does not create a second parcel when another invocation owns dispatch', async () => {
    const db = database(); db.rpc.mockResolvedValue({ data: null, error: null })
    await dispatchPaidDelivery(row, db)
    expect(state.book).not.toHaveBeenCalled()
  })
  it('does not book when the claim returns a parent-payment conflict for review', async () => {
    const db = database(); db.rpc.mockResolvedValue({ data: { ...row, status: 'needs_review' }, error: null })
    expect(await dispatchPaidDelivery(row, db)).toMatchObject({ status: 'needs_review' })
    expect(state.book).not.toHaveBeenCalled()
  })
  it('leaves an uncertain booking for review and never retries the carrier', async () => {
    const db = database(); state.book.mockRejectedValue(new Error('timeout'))
    expect(await dispatchPaidDelivery(row, db)).toMatchObject({ status: 'needs_review' })
    expect(state.book).toHaveBeenCalledOnce()
    expect(db.chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'needs_review', booking_response: expect.objectContaining({ reference: id }) }))
  })
  it('uses provider-verified delivery purpose, amount and identity before settlement', async () => {
    const db = database()
    state.provider.mockResolvedValue({ status: 'paid', currency: 'NGN', amountMinor: 513550, chargeId: 'charge-1' })
    await reconcileDeliveryRow({ ...row, status: 'open' }, db)
    expect(state.provider).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'afl_award_delivery_v1', requestedMinor: 513550, reference: 'delivery-reference', orderId: id, attemptId: id }), expect.anything())
    expect(db.rpc).toHaveBeenCalledWith('settle_award_delivery_checkout', expect.objectContaining({ p_checkout: expect.objectContaining({ amount_minor: 513550, purpose: 'afl_award_delivery_v1' }) }))
  })
  it('never settles or books an unverifiable or wrong-purpose checkout', async () => {
    const db = database(); state.provider.mockResolvedValue(null)
    await expect(reconcileDeliveryRow({ ...row, status: 'open' }, db)).rejects.toThrow('could not be confirmed')
    expect(db.rpc).not.toHaveBeenCalled(); expect(state.book).not.toHaveBeenCalled()
    expect(db.chain.update).not.toHaveBeenCalled()
  })
  it('returns canonical status when resuming a checkout that has since completed', async () => {
    const db = database({ ...row, status: 'open' })
    db.rpc.mockImplementation(async name => ({ data: name === 'reserve_award_delivery_checkout' ? { ...row, status: 'open' } : name === 'settle_award_delivery_checkout' ? row : name === 'claim_award_delivery_dispatch' ? { ...row, status: 'booking' } : { ...row, status: 'dispatched', waybill: 'WB-1' }, error: null }))
    state.provider.mockResolvedValue({ status: 'paid', currency: 'NGN', amountMinor: 513550, chargeId: 'charge-1' })
    expect(await startDeliveryCheckout('member-1', id, db)).toMatchObject({ status: 'dispatched' })
    expect(state.create).not.toHaveBeenCalled()
  })
  it('does not overwrite a saved quote with client prices or coordinates', async () => {
    const db = database(null)
    await expect(saveDeliveryQuote({ id: 'member-1', email: 'member@example.com' }, { ...row.quote_input, email: undefined, amountMinor: 1 }, db)).rejects.toMatchObject({ status: 400 })
    expect(state.quote).not.toHaveBeenCalled(); expect(db.rpc).not.toHaveBeenCalled()
  })
  it('blocks a new quote for an unconfirmed award fee', async () => {
    const db = database(null); state.payment.mockResolvedValue({ status: 'pending', confirmedPayment: null })
    const { email, ...input } = row.quote_input
    await expect(saveDeliveryQuote({ id: 'member-1', email }, input, db)).rejects.toMatchObject({ status: 409 })
    expect(state.quote).not.toHaveBeenCalled()
  })
  it('preserves the same reservation when checkout creation has an uncertain outcome', async () => {
    const db = database({ ...row, status: 'creating', checkout_id: null, checkout_request: 'saved-request' })
    state.create.mockRejectedValue(new Error('network timeout'))
    await expect(startDeliveryCheckout('member-1', id, db)).rejects.toMatchObject({ status: 502 })
    expect(db.chain.update).not.toHaveBeenCalledWith({ status: 'expired' })
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ requestBody: 'saved-request', idempotencyKey: `award-delivery-${id}` }), expect.anything())
  })
  it('uses the fixed Bachs link for a fresh reservation and records an immutable external marker', async () => {
    const creating = { ...row, status: 'creating' as const, checkout_id: null, checkout_url: null, checkout_request: null, checkout_expires_at: null, charge_id: null, paid_at: null, payment_evidence: null }
    const saved = { ...creating, checkout_url: BACHS_DELIVERY_PAYMENT_LINK, checkout_request: JSON.stringify({ kind: 'external_payment_link', version: 1, provider: 'bachs', checkout_url: BACHS_DELIVERY_PAYMENT_LINK, purpose: 'afl_award_delivery_v1' }) }
    const db = database(creating)
    db.rpc.mockImplementation(async name => ({ data: name === 'reserve_award_delivery_checkout' ? creating : creating, error: null }))
    db.chain.maybeSingle.mockResolvedValueOnce({ data: saved, error: null })
    await expect(startDeliveryCheckout('member-1', id, db)).resolves.toMatchObject({ checkoutUrl: BACHS_DELIVERY_PAYMENT_LINK, status: 'open', checkoutMode: 'external_link', amountMinor: 513550 })
    expect(state.create).not.toHaveBeenCalled()
    expect(db.chain.update).toHaveBeenCalledWith(expect.objectContaining({ checkout_url: BACHS_DELIVERY_PAYMENT_LINK, checkout_request: expect.stringContaining('external_payment_link') }))
    expect(deliveryView(creating).status).toBe('creating')
    expect(deliveryView(saved).status).toBe('open')
    expect(deliveryView(saved).paymentMode).toBe('external_link')
  })
  it.each(['paid', 'booking', 'dispatched'] as const)('hides paidAt when a %s row has no delivery payment evidence', status => {
    const unconfirmed = { ...row, status, checkout_id: null, charge_id: null, paid_at: '2026-11-02T00:00:00Z', payment_evidence: null }
    expect(deliveryView(unconfirmed)).toMatchObject({ status: 'needs_review', paidAt: null })
  })
  it.each([99, 100_000_001])('rejects a fresh static checkout outside the public Bachs amount range (%s kobo)', async amountMinor => {
    const creating = { ...row, status: 'creating' as const, amount_minor: amountMinor, checkout_id: null, checkout_url: null, checkout_request: null, checkout_expires_at: null, charge_id: null, paid_at: null, payment_evidence: null }
    const db = database(creating)
    db.rpc.mockResolvedValue({ data: creating, error: null })
    await expect(startDeliveryCheckout('member-1', id, db)).rejects.toMatchObject({ status: 422 })
    expect(db.chain.update).not.toHaveBeenCalled()
    expect(state.create).not.toHaveBeenCalled()
  })
  it('does not dispatch a paid row without delivery payment evidence', async () => {
    const db = database({ ...row, charge_id: null, paid_at: null, payment_evidence: null })
    const result = await dispatchPaidDelivery({ ...row, charge_id: null, paid_at: null, payment_evidence: null }, db)
    expect(result.status).toBe('needs_review')
    expect(state.book).not.toHaveBeenCalled()
    expect(db.rpc).not.toHaveBeenCalled()
  })
})
