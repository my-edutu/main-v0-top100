import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidSubscription, notificationPath } from './validation'

export async function sendMemberPush(db: SupabaseClient, userIds: string[], payload: { title: string; body: string; url?: string; tag?: string }) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:info@top100afl.com'
  const result = { accepted: 0, failed: 0, expired: 0, configured: Boolean(publicKey && privateKey) }
  if (!publicKey || !privateKey) return result
  // Bounded URLs and concurrency; never expose endpoints or keys in responses.
  for (let i = 0; i < userIds.length; i += 100) {
    const { data, error } = await db.from('push_subscriptions').select('id,endpoint,keys,user_id').in('user_id', userIds.slice(i, i + 100))
    if (error) { result.failed += userIds.slice(i, i + 100).length; continue }
    const subscriptions = data ?? []
    for (let j = 0; j < subscriptions.length; j += 8) {
      await Promise.all(subscriptions.slice(j, j + 8).map(async subscription => {
        if (!isValidSubscription(subscription)) { result.failed++; return }
        try {
          const { count, error: countError } = await db.from('user_notifications')
            .select('id', { count: 'exact', head: true }).eq('user_id', subscription.user_id).is('read_at', null)
          const message = { ...payload, title: payload.title.slice(0, 80), body: payload.body.slice(0, 400), url: notificationPath(payload.url), ...(countError ? {} : { unreadCount: count ?? 0 }) }
          await webpush.sendNotification(subscription, JSON.stringify(message), {
            vapidDetails: { subject, publicKey, privateKey }, TTL: 3600, timeout: 10000,
          })
          result.accepted++
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) {
            result.expired++
            await db.from('push_subscriptions').delete().eq('id', subscription.id)
          } else { result.failed++ }
        }
      }))
    }
  }
  return result
}
