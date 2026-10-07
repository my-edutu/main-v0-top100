import { afterEach, expect, it, vi } from 'vitest'
const send = vi.hoisted(() => vi.fn())
vi.mock('web-push', () => ({ default: { sendNotification: send } }))
import { sendMemberPush } from '@/lib/push/send'
import { isAllowedPushEndpoint, isValidSubscription, notificationPath } from '@/lib/push/validation'
const subscription = { id: 's1', user_id: 'member', endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) } }
const deleted = vi.fn(async () => ({ error: null }))
function database() {
  return { from: (table: string) => ({
    select: () => table === 'push_subscriptions'
      ? { in: async () => ({ data: [subscription], error: null }) }
      : { eq: () => ({ is: async () => ({ count: 3, error: null }) }) },
    delete: () => ({ eq: deleted }),
  }) } as any
}
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
function configure() {
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'public')
  vi.stubEnv('VAPID_PRIVATE_KEY', 'private')
}
it('allows only known HTTPS push providers and rejects private endpoints', () => {
  for (const endpoint of ['http://fcm.googleapis.com/a','https://127.0.0.1/a','https://fcm.googleapis.com.evil.test/a','https://user:pass@fcm.googleapis.com/a','https://fcm.googleapis.com:8080/a']) expect(isAllowedPushEndpoint(endpoint)).toBe(false)
  expect(isAllowedPushEndpoint('https://web.push.apple.com/a')).toBe(true)
  expect(isValidSubscription(subscription)).toBe(true)
  expect(isValidSubscription({ ...subscription, keys: {} })).toBe(false)
  expect(notificationPath('//evil.test')).toBe('/dashboard/notifications')
})
it('sends an encrypted provider request containing the correct unread count', async () => {
  configure(); send.mockResolvedValue({ statusCode: 201 })
  const result = await sendMemberPush(database(), ['member'], { title: 'Update', body: 'Hello', url: '//evil.test' })
  expect(result.accepted).toBe(1)
  expect(JSON.parse(send.mock.calls[0][1])).toMatchObject({ unreadCount: 3, url: '/dashboard/notifications' })
  expect(send.mock.calls[0][2]).toMatchObject({ timeout: 10000, TTL: 3600 })
})
it('removes expired subscriptions without claiming delivery', async () => {
  configure(); send.mockRejectedValue({ statusCode: 410 })
  expect(await sendMemberPush(database(), ['member'], { title: 'Update', body: 'Hello' })).toMatchObject({ accepted: 0, expired: 1 })
  expect(deleted).toHaveBeenCalledWith('id', 's1')
})
it('keeps transient failures for a later retry and reports failure', async () => {
  configure(); send.mockRejectedValue({ statusCode: 503 })
  expect(await sendMemberPush(database(), ['member'], { title: 'Update', body: 'Hello' })).toMatchObject({ accepted: 0, failed: 1 })
  expect(deleted).not.toHaveBeenCalled()
})
it('does not claim delivery when signing configuration is missing', async () => {
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', '')
  vi.stubEnv('VAPID_PRIVATE_KEY', '')
  expect(await sendMemberPush(database(), ['member'], { title: 'Update', body: 'Hello' })).toMatchObject({ configured: false, accepted: 0 })
  expect(send).not.toHaveBeenCalled()
})
