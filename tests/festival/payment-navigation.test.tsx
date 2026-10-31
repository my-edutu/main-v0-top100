import type { ReactElement } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { FestivalPaymentState } from '@/lib/festival/interest'

const state = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], request: vi.fn(), push: vi.fn() }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => [state.cursor < state.values.length ? state.values[state.cursor++] : initial, vi.fn()],
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }))
vi.mock('@/app/dashboard/_providers/dashboard-member', () => ({ useDashboardMember: () => ({ member: { id: 'member-1', name: 'Amara Okafor', status: 'approved' } }) }))
vi.mock('@/lib/festival/client', () => ({ festivalRequest: state.request }))
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
beforeEach(() => { state.cursor = 0; state.request.mockReset(); state.push.mockReset() })

it('saves interest before navigating to award payment even without festival pickup', async () => {
  let finish!: (value: unknown) => void
  state.request.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const saving = submit()
  expect(state.push).not.toHaveBeenCalled()
  expect(JSON.parse(state.request.mock.calls[0][1].body)).toEqual({ fullName: 'Amara Okafor', phone: '+2348031234567', pickupRequested: false })
  finish({ interest: null, payment: 'not_requested' })
  await saving
  expect(state.push).toHaveBeenCalledWith('/dashboard/me/award/payment')
})
it.each(['required', 'pending'] as const)('continues to the award payment flow for %s payments', async payment => {
  state.request.mockResolvedValue({ interest: null, payment })
  await submit(payment)
  expect(state.push).toHaveBeenCalledWith('/dashboard/me/award/payment')
})
it.each(['required', 'pending', 'confirmed', 'unavailable'] as const)('saves festival pickup registration without navigating away when payment is %s', async payment => {
  state.request.mockResolvedValue({ interest: null, payment })
  await submit(payment, true)
  expect(JSON.parse(state.request.mock.calls[0][1].body).pickupRequested).toBe(true)
  expect(state.push).not.toHaveBeenCalled()
})
it.each(['confirmed', 'unavailable'] as const)('does not prompt another payment when status is %s', async payment => {
  state.request.mockResolvedValue({ interest: null, payment })
  await submit(payment)
  expect(state.push).not.toHaveBeenCalled()
})
it('stays on the form when saving fails', async () => {
  state.request.mockRejectedValue(new Error('Please retry'))
  await submit()
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
