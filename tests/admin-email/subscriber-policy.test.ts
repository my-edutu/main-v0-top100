import { expect, it } from 'vitest'
import { mayAddSubscriber } from '@/lib/admin-email/subscriber-policy'
it('does not re-subscribe a blocked or previously unsubscribed person', () => {
  expect(mayAddSubscriber({ status: 'blocklisted', lists: [] })).toBe(false)
  expect(mayAddSubscriber({ status: 'enabled', lists: [{ subscription_status: 'unsubscribed' }] })).toBe(false)
  expect(mayAddSubscriber({ status: 'enabled', lists: [{ subscription_status: 'confirmed' }] })).toBe(true)
  expect(mayAddSubscriber(null)).toBe(true)
})
