import { expect, it, vi } from 'vitest'
import { provisionCampaign } from '@/lib/admin-email/provision'
const input = { id: 'campaign-id', subject: 'Hello', sendAt: '2099-01-01T00:00:00.000Z', templateId: 1, members: [{ id: 'a1', email: 'one@example.org', name: 'One' }, { id: 'a2', email: 'two@example.org', name: 'Two' }] }
function deps() { return { createList: vi.fn().mockResolvedValue({ id: 7 }), findSubscriber: vi.fn().mockResolvedValue(null), createSubscriber: vi.fn().mockImplementation(async (email: string) => ({ id: 10, uuid: email })), addToList: vi.fn(), suppressMember: vi.fn().mockResolvedValue(undefined), saveRecipients: vi.fn().mockResolvedValue(undefined), createCampaign: vi.fn().mockResolvedValue({ id: 4, uuid: 'remote' }), markArmed: vi.fn().mockResolvedValue(undefined), markScheduled: vi.fn().mockResolvedValue(undefined), schedule: vi.fn().mockResolvedValue(undefined), markFailed: vi.fn().mockResolvedValue(undefined), now: () => Date.parse('2098-12-31T00:00:00.000Z') } }
it('schedules only after all recipient records and campaign mapping are stored', async () => {
  const d = deps(); expect(await provisionCampaign(input, d)).toEqual({ count: 2, blocked: 0 })
  expect(d.saveRecipients).toHaveBeenCalledOnce(); expect(d.markArmed).toHaveBeenCalledWith('campaign-id', 4, 'remote'); expect(d.markScheduled).toHaveBeenCalledWith('campaign-id')
  expect(d.schedule).toHaveBeenCalledWith(4)
  expect(d.saveRecipients.mock.invocationCallOrder[0]).toBeLessThan(d.schedule.mock.invocationCallOrder[0])
  expect(d.markArmed.mock.invocationCallOrder[0]).toBeLessThan(d.schedule.mock.invocationCallOrder[0]); expect(d.schedule.mock.invocationCallOrder[0]).toBeLessThan(d.markScheduled.mock.invocationCallOrder[0])
})
it('does not add previously unsubscribed subscribers', async () => {
  const d = deps(); d.findSubscriber.mockResolvedValueOnce({ id: 1, uuid: 'old', status: 'enabled', lists: [{ subscription_status: 'unsubscribed' }] })
  expect(await provisionCampaign(input, d)).toEqual({ count: 1, blocked: 1 }); expect(d.addToList).not.toHaveBeenCalled(); expect(d.suppressMember).toHaveBeenCalledWith('a1')
})
it('holds an unclear subscription state instead of changing the person’s preference', async () => {
  const d = deps(); d.findSubscriber.mockResolvedValueOnce({ id: 1, uuid: 'old', status: 'mystery' })
  await expect(provisionCampaign(input, d)).rejects.toThrow(); expect(d.suppressMember).not.toHaveBeenCalled(); expect(d.schedule).not.toHaveBeenCalled()
})
it('never schedules if storing recipients fails', async () => {
  const d = deps(); d.saveRecipients.mockRejectedValue(new Error('db down'))
  await expect(provisionCampaign(input, d)).rejects.toThrow(); expect(d.schedule).not.toHaveBeenCalled(); expect(d.markFailed).toHaveBeenCalledOnce()
})
it('does not enable sending if the scheduling response is uncertain', async () => {
  const d = deps(); d.schedule.mockRejectedValue(new Error('timeout'))
  await expect(provisionCampaign(input, d)).rejects.toThrow(); expect(d.markScheduled).not.toHaveBeenCalled(); expect(d.markFailed).toHaveBeenCalledOnce()
})
it('does not schedule if preparation missed the chosen time', async () => {
  const d = deps(); d.now = () => Date.parse('2099-01-01T00:00:01.000Z')
  await expect(provisionCampaign(input, d)).rejects.toThrow(); expect(d.schedule).not.toHaveBeenCalled()
})
