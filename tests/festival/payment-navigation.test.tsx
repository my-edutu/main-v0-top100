import type { ReactElement } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { FestivalPaymentState } from '@/lib/festival/interest'

const state = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], request: vi.fn(), push: vi.fn(), reconcile: vi.fn() }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => [state.cursor < state.values.length ? state.values[state.cursor++] : initial, vi.fn()],
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }))
vi.mock('@/app/dashboard/_providers/dashboard-member', () => ({ useDashboardMember: () => ({ member: { id: 'member-1', name: 'Amara Okafor', status: 'approved' } }) }))
vi.mock('@/lib/festival/client', () => ({ festivalRequest: state.request }))
vi.mock('@/lib/awards/payment', () => ({ reconcileAwardPayment: state.reconcile }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
import FestivalInterestPage from '@/app/dashboard/festival/page'

type FormNode = ReactElement<{ onSubmit: (event: { preventDefault: () => void }) => Promise<void>; children?: unknown }>
function findForm(node: unknown): FormNode | undefined {
  if (!node || typeof node !== 'object') return
  const element = node as FormNode
  if (element.type === 'form') return element
  for (const child of [element.props?.children].flat(2)) {
    const form = findForm(child)
    if (form) return form
  }
}
function submit(payment: FestivalPaymentState = 'required', pickupRequested = false, phone = '+2348031234567', country = 'NG') {
  state.values = [{ interest: null, payment }, 'Amara Okafor', phone, pickupRequested, false, '', '', {}, false, false, false, false, 0, country]
  return findForm(FestivalInterestPage())!.props.onSubmit({ preventDefault() {} })
}
beforeEach(() => {
  state.cursor = 0; state.request.mockReset(); state.push.mockReset(); state.reconcile.mockReset()
  state.reconcile.mockResolvedValue({ status: 'pending', confirmedPayment: null })
  vi.stubGlobal('document', { activeElement: null }); vi.stubGlobal('HTMLElement', class {})
})
afterEach(() => vi.unstubAllGlobals())

it.each([true, false])('opens award payment without registering an unpaid member, pickup=%s', async pickup => {
  await submit('required', pickup, '')
  expect(state.request).not.toHaveBeenCalled()
  expect(state.push).toHaveBeenCalledWith('/dashboard/me/award/payment')
})
it.each(['pending', 'unavailable'] as const)('rechecks %s payment without registering or prompting duplicate payment', async payment => {
  await submit(payment, true)
  expect(state.request).not.toHaveBeenCalled()
  expect(state.push).not.toHaveBeenCalled()
  expect(state.reconcile).toHaveBeenCalledOnce()
})
it.each([true, false])('registers only after payment is confirmed, pickup=%s', async pickup => {
  state.request.mockResolvedValue({ interest: null, payment: 'confirmed' })
  await submit('confirmed', pickup)
  expect(JSON.parse(state.request.mock.calls[0][1].body).pickupRequested).toBe(pickup)
  expect(state.push).not.toHaveBeenCalled()
})
it('stays on the form when registration fails', async () => {
  state.request.mockRejectedValue(new Error('Please retry'))
  await submit('confirmed', true)
  expect(state.push).not.toHaveBeenCalled()
})
it.each([
  ['NG', '0803 123 4567', '+2348031234567'],
  ['GH', '024 123 4567', '+233241234567'],
  ['GB', '07123 456789', '+447123456789'],
])('saves a local %s phone number with the selected country code', async (country, phone, expected) => {
  state.request.mockResolvedValue({ interest: null, payment: 'confirmed' })
  await submit('confirmed', true, phone, country)
  expect(JSON.parse(state.request.mock.calls[0][1].body).phone).toBe(expected)
})
