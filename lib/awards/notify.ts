// lib/awards/notify.ts
// Tells the member their award moved. Two properties govern every line below:
//
//   1. `notifyAwardStatus` NEVER throws. It is called from the Paystack webhook
//      and from the admin dispatch action. A bounced email that propagated an
//      exception would fail the webhook, Paystack would retry, and a retry on
//      an already-paid order is the double-charge path. Every failure inside is
//      caught and logged.
//   2. EXACTLY ONCE per (order, status). The claim row in
//      `award_notification_log` is inserted BEFORE anything is sent, and the
//      table's `unique (order_id, status)` is what enforces it. A 23505 means an
//      earlier attempt already owns this milestone, so we send nothing.
import type { SupabaseClient } from '@supabase/supabase-js'

import type { AwardStatus } from '@/lib/awards/status'
import { sendEmail } from '@/lib/email/brevo'
import { buildAwardEmail, type AwardEmailInput, type AwardMilestone } from '@/lib/email/award-templates'

export type { AwardMilestone } from '@/lib/email/award-templates'

export const AWARD_NOTIFICATION_SETUP_MESSAGE =
  'The award notification log is not set up yet. Ask the admin to run ' +
  'supabase/migrations/20260728_award_notification_log.sql.'

export const USER_NOTIFICATIONS_SETUP_MESSAGE =
  'In-app notifications are not set up yet. Ask the admin to run supabase/SETUP-MEMBER-HUB.sql.'

/** The four statuses the member hears about. Everything else is internal. */
export const AWARD_MILESTONES = ['paid', 'dispatched', 'in_transit', 'delivered'] as const

export function isAwardMilestone(status: unknown): status is AwardMilestone {
  return typeof status === 'string' && (AWARD_MILESTONES as readonly string[]).includes(status)
}

/** The `award_orders` columns this module reads. Kept loose — rows come from `select('*')`. */
export type AwardOrderRow = {
  id: string
  profile_id?: string | null
  status?: string | null
  recipient_name?: string | null
  email?: string | null
  phone?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  postal_code?: string | null
  total_amount_kobo?: number | null
  gig_waybill?: string | null
  gig_tracking_url?: string | null
  [key: string]: unknown
}

type PostgrestLikeError = { code?: string; message?: string } | null | undefined

/** True when the failure is "the notification-log migration has not been run yet". */
export function isMissingNotificationLogTable(error: PostgrestLikeError): boolean {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') return true
  return /relation .*award_notification_log.* does not exist|schema cache/i.test(error.message ?? '')
}

/**
 * True when `public.user_notifications` has not been created yet. As of
 * 2026-07-27 the live database has never had supabase/SETUP-MEMBER-HUB.sql
 * applied, so this is the *expected* path in production today — it must
 * degrade to a log line, never an exception.
 */
export function isMissingUserNotificationsTable(error: PostgrestLikeError): boolean {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') return true
  return /relation .*user_notifications.* does not exist|schema cache/i.test(error.message ?? '')
}

/** True when the insert lost the race for this (order, status) — someone already sent it. */
export function isUniqueViolation(error: PostgrestLikeError): boolean {
  if (!error) return false
  if (error.code === '23505') return true
  return /duplicate key value|already exists/i.test(error.message ?? '')
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'unknown error')
  }
  return typeof error === 'string' ? error : 'unknown error'
}

/** Human-readable courier name for the email. */
function courierName(): string {
  return process.env.COURIER_DISPLAY_NAME?.trim() || 'GIG Logistics'
}

/** Everything a template needs, pulled off the order row. */
export function toEmailInput(order: AwardOrderRow): AwardEmailInput {
  const cityState = [order.city, order.state].filter((part) => Boolean(part && String(part).trim())).join(', ')
  const tail = [cityState, order.postal_code].filter((part) => Boolean(part && String(part).trim())).join(' ')

  return {
    recipientName: order.recipient_name ?? '',
    totalAmountKobo: typeof order.total_amount_kobo === 'number' ? order.total_amount_kobo : null,
    addressLines: [order.address_line1 ?? '', order.address_line2 ?? '', tail, order.country ?? ''],
    waybill: order.gig_waybill ?? null,
    trackingUrl: order.gig_tracking_url ?? null,
    courierName: courierName(),
  }
}

/** Short in-app copy per milestone. Mirrors the email subject the member also gets. */
function inAppNotice(milestone: AwardMilestone, order: AwardOrderRow): { title: string; body: string } {
  const waybill = (order.gig_waybill ?? '').trim()
  const waybillSuffix = waybill ? ` Waybill: ${waybill}.` : ''

  switch (milestone) {
    case 'paid':
      return {
        title: 'Payment confirmed — your award is being prepared',
        body: 'We have received your payment. Your award is being packed and you will get the tracking details as soon as it ships.',
      }
    case 'dispatched':
      return {
        title: 'Your award has been sent',
        body: `Your award has left us and is with the courier.${waybillSuffix}`,
      }
    case 'in_transit':
      return {
        title: 'Your award is on the way',
        body: `Your award is moving through the courier network.${waybillSuffix}`,
      }
    case 'delivered':
      return {
        title: 'Your award has been delivered',
        body: `Your award has been delivered. We would love to see a photo — share it and tag us.${waybillSuffix}`,
      }
  }
}

/**
 * In-app channel. Writes one `public.user_notifications` row targeted at this
 * member — the exact table and columns `/api/member/me` reads and
 * `mapNotification` in `lib/member-hub-server.ts` maps, so the dashboard's
 * notifications section picks it up with no further wiring.
 */
async function writeInAppNotification(
  supabase: SupabaseClient,
  order: AwardOrderRow,
  milestone: AwardMilestone,
): Promise<string | null> {
  const profileId = order.profile_id
  if (!profileId) return 'no profile_id on the order — nothing to target in-app'

  const notice = inAppNotice(milestone, order)
  const trackingUrl = order.gig_tracking_url ?? null
  const linkToCourier = milestone !== 'paid' && typeof trackingUrl === 'string' && /^https?:\/\//i.test(trackingUrl)

  const { error } = await supabase.from('user_notifications').insert({
    user_id: profileId,
    title: notice.title,
    body: notice.body,
    category: 'award',
    cta_label: linkToCourier ? 'Track your parcel' : 'View your award',
    cta_url: linkToCourier ? trackingUrl : '/dashboard',
    delivered_at: new Date().toISOString(),
    metadata: { audience: 'all', source: 'award-order', order_id: order.id, status: milestone },
  })

  if (error) {
    if (isMissingUserNotificationsTable(error)) {
      console.error('[award-notify] ' + USER_NOTIFICATIONS_SETUP_MESSAGE, {
        orderId: order.id,
        status: milestone,
      })
      return `in-app: ${USER_NOTIFICATIONS_SETUP_MESSAGE}`
    }
    return `in-app: ${error.message ?? 'insert failed'}`
  }
  return null
}

/** Email channel. A missing BREVO_API_KEY is a config gap, not an error state. */
async function sendMilestoneEmail(order: AwardOrderRow, milestone: AwardMilestone): Promise<string | null> {
  const to = (order.email ?? '').trim()
  if (!to) return 'email: the order has no email address'

  if (!process.env.BREVO_API_KEY) {
    console.warn('[award-notify] BREVO_API_KEY is not set — skipping the milestone email', {
      orderId: order.id,
      status: milestone,
    })
    return null
  }

  const { subject, html, text } = buildAwardEmail(milestone, toEmailInput(order))
  const sent = await sendEmail({ to, subject, html, text })
  return sent ? null : 'email: Brevo reported a failure'
}

/**
 * Tell the member their order reached `status`, once and only once.
 *
 * Resolves in every case — callers must not need a try/catch around it.
 */
export async function notifyAwardStatus(
  supabase: SupabaseClient,
  order: AwardOrderRow | null | undefined,
  status: AwardStatus | string,
): Promise<void> {
  try {
    if (!order?.id) {
      console.error('[award-notify] called without an order row', { status })
      return
    }
    if (!isAwardMilestone(status)) return

    const milestone: AwardMilestone = status

    // --- Claim the milestone BEFORE sending anything ------------------------
    // `unique (order_id, status)` is the whole exactly-once mechanism. Two
    // concurrent Paystack deliveries both reach here; exactly one insert wins.
    const { error: claimError } = await supabase.from('award_notification_log').insert({
      order_id: order.id,
      profile_id: order.profile_id ?? null,
      status: milestone,
      channels: [],
    })

    if (claimError) {
      if (isUniqueViolation(claimError)) {
        // Already announced by an earlier attempt (or a Paystack retry). Silent.
        return
      }
      if (isMissingNotificationLogTable(claimError)) {
        // The award flow itself must keep working when the migration is behind.
        console.error('[award-notify] ' + AWARD_NOTIFICATION_SETUP_MESSAGE, {
          orderId: order.id,
          status: milestone,
        })
        return
      }
      // Any other claim failure: we cannot guarantee exactly-once, so send
      // nothing rather than risk repeating a "payment confirmed" email.
      console.error('[award-notify] could not claim the milestone; sending nothing', {
        orderId: order.id,
        status: milestone,
        error: claimError,
      })
      return
    }

    // --- Both channels, independently ---------------------------------------
    const channels: string[] = []
    const failures: string[] = []

    try {
      const inAppFailure = await writeInAppNotification(supabase, order, milestone)
      if (inAppFailure) failures.push(inAppFailure)
      else channels.push('in_app')
    } catch (inAppError) {
      console.error('[award-notify] in-app notification failed', { orderId: order.id, error: inAppError })
      failures.push(`in-app: ${describe(inAppError)}`)
    }

    try {
      const emailFailure = await sendMilestoneEmail(order, milestone)
      if (emailFailure) failures.push(emailFailure)
      else if (process.env.BREVO_API_KEY) channels.push('email')
    } catch (emailError) {
      console.error('[award-notify] email send failed', { orderId: order.id, error: emailError })
      failures.push(`email: ${describe(emailError)}`)
    }

    if (failures.length > 0) {
      console.error('[award-notify] one or more channels failed', {
        orderId: order.id,
        status: milestone,
        failures,
      })
    }

    // --- Close the log row so /admin/awards has a trail ----------------------
    const { error: finaliseError } = await supabase
      .from('award_notification_log')
      .update({
        channels,
        sent_at: channels.length > 0 ? new Date().toISOString() : null,
        error: failures.length > 0 ? failures.join(' | ') : null,
      })
      .eq('order_id', order.id)
      .eq('status', milestone)

    if (finaliseError) {
      console.error('[award-notify] could not record the notification outcome', {
        orderId: order.id,
        status: milestone,
        error: finaliseError,
      })
    }
  } catch (error) {
    // Last line of defence. Nothing in this module may reach a caller.
    console.error('[award-notify] unexpected failure', error)
  }
}
