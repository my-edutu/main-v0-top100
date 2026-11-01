import { beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ user: vi.fn(), read: vi.fn(), render: vi.fn(), blocked: false }))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: state.user }))
vi.mock('@/lib/festival/access', () => ({ checkFestivalAwardeeAccess: async () => state.blocked ? new Response('{}', { status: 403 }) : null }))
vi.mock('@/lib/festival/server', () => ({ readFestivalInterest: state.read }))
vi.mock('@/lib/festival/ticket', () => ({ renderFestivalTicket: state.render }))
import { GET } from '@/app/api/member/festival-interest/ticket/route'
beforeEach(() => {
  vi.resetAllMocks(); state.blocked = false
  state.user.mockResolvedValue({ id: 'member-1' })
  state.read.mockResolvedValue({ payment: 'confirmed', ticket: { id: 'ticket-1' }, interest: { fullName: 'Amara', pickupRequested: true } })
  state.render.mockResolvedValue(Buffer.from('test-image'))
})
it('requires a signed-in approved awardee', async () => {
  state.user.mockResolvedValue(null)
  expect((await GET()).status).toBe(401)
  state.user.mockResolvedValue({ id: 'member-1' }); state.blocked = true
  expect((await GET()).status).toBe(403)
  expect(state.read).not.toHaveBeenCalled()
})
it.each([['required', 403], ['pending', 403], ['unavailable', 503]] as const)('blocks %s payment even if a previous ticket exists', async (payment, status) => {
  state.read.mockResolvedValue({ payment, ticket: { id: 'old-ticket' } })
  expect((await GET()).status).toBe(status)
  expect(state.render).not.toHaveBeenCalled()
})
it('does not manufacture tickets from a paid legacy interest', async () => {
  state.read.mockResolvedValue({ payment: 'confirmed', ticket: null, interest: { fullName: 'Amara' } })
  expect((await GET()).status).toBe(404)
  expect(state.render).not.toHaveBeenCalled()
})
it('downloads only the authenticated member ticket without shared caching', async () => {
  const response = await GET()
  expect(response.status).toBe(200)
  expect(state.read).toHaveBeenCalledWith('member-1')
  expect(state.render).toHaveBeenCalledWith({ id: 'ticket-1', fullName: 'Amara', pickupRequested: true })
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  expect(response.headers.get('Content-Type')).toBe('image/png')
  expect(response.headers.get('Content-Disposition')).toContain('attachment;')
  expect(await response.text()).toBe('test-image')
})
