import { sendPaymentLifecycleEmail, type PaymentEmailStatus } from '@/lib/payments/payment-emails'
import { createAdminClient } from '@/lib/supabase/server'

type NotificationResult = { sent: boolean; retry: boolean; reason?: string }

/** Send only from a current, database-confirmed magazine payment state. */
export async function notifyMagazinePaymentStatus(attemptId: string): Promise<NotificationResult> {
  const db = createAdminClient()
  const { data: attempt, error: attemptError } = await db.from('magazine_feature_payment_attempts')
    .select('id,order_id,status,currency,requested_amount_minor,captured_amount_minor,confirmed_at')
    .eq('id', attemptId).maybeSingle()
  if (attemptError || !attempt) return { sent: false, retry: Boolean(attemptError), reason: 'Could not load magazine payment status.' }

  const { data: order, error: orderError } = await db.from('magazine_feature_orders')
    .select('id,status,paid_attempt_id,paid_at,customer_name,customer_email,profile_id')
    .eq('id', attempt.order_id).maybeSingle()
  if (orderError || !order) return { sent: false, retry: Boolean(orderError), reason: 'Could not load magazine order.' }

  let status: PaymentEmailStatus | null = null
  if (order.status === 'paid' && order.paid_attempt_id === attempt.id && attempt.status === 'succeeded') status = 'paid'
  else if (order.status === 'failed' && attempt.status === 'failed') status = 'failed'
  else if (order.status === 'failed' && attempt.status === 'expired') status = 'expired'
  else if (order.status !== 'paid' && ['underpaid', 'overpaid', 'exception'].includes(attempt.status)) status = 'review'
  if (!status) return { sent: false, retry: false }

  if (status === 'failed' || status === 'expired') {
    const { data: latest, error: latestError } = await db.from('magazine_feature_payment_attempts')
      .select('id').eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (latestError) return { sent: false, retry: true, reason: 'Could not verify the current magazine checkout.' }
    if (latest?.id !== attempt.id) return { sent: false, retry: false }
  }

  let email = typeof order.customer_email === 'string' ? order.customer_email.trim() : ''
  let name = typeof order.customer_name === 'string' ? order.customer_name : null
  if ((!email || !name) && order.profile_id) {
    const { data: profile, error: profileError } = await db.from('profiles').select('email,full_name').eq('id', order.profile_id).maybeSingle()
    if (profileError) return { sent: false, retry: true, reason: 'Could not load magazine customer details.' }
    email ||= typeof profile?.email === 'string' ? profile.email.trim() : ''
    name ||= profile?.full_name ?? null
  }
  if (!email) return { sent: false, retry: false }

  const { error: claimError } = await db.from('magazine_feature_payment_email_log')
    .insert({ attempt_id: attempt.id, event_type: status })
  if (claimError && claimError.code !== '23505') return { sent: false, retry: true, reason: 'Could not record magazine email delivery.' }
  if (claimError?.code === '23505') {
    const { data: existing, error: readError } = await db.from('magazine_feature_payment_email_log')
      .select('sent_at').eq('attempt_id', attempt.id).eq('event_type', status).maybeSingle()
    if (readError) return { sent: false, retry: true, reason: 'Could not read magazine email delivery status.' }
    if (existing?.sent_at) return { sent: true, retry: false }
  }

  const result = await sendPaymentLifecycleEmail({
    product: 'magazine', status, attemptId: attempt.id, email, name,
    currency: attempt.currency, amountMinor: Number(attempt.captured_amount_minor ?? attempt.requested_amount_minor),
  })
  const { error: finishError } = await db.from('magazine_feature_payment_email_log')
    .update({ sent_at: result.ok ? new Date().toISOString() : null, last_error: result.ok ? null : result.reason ?? 'Email provider failed.' })
    .eq('attempt_id', attempt.id).eq('event_type', status)
  if (finishError) return { sent: false, retry: true, reason: 'Could not save magazine email delivery status.' }
  return result.ok
    ? { sent: true, retry: false }
    : { sent: false, retry: true, reason: result.reason ?? 'Email provider failed.' }
}
