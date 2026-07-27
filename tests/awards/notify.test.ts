// tests/awards/notify.test.ts
// The two properties that matter: notifyAwardStatus never throws, and it sends
// exactly once per (order, status).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sendEmail = vi.fn()
vi.mock('@/lib/email/brevo', () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }))

import {
  AWARD_MILESTONES,
  isAwardMilestone,
  isMissingNotificationLogTable,
  isMissingUserNotificationsTable,
  isUniqueViolation,
  notifyAwardStatus,
  toEmailInput,
  type AwardOrderRow,
} from '@/lib/awards/notify'
import {
  buildAwardEmail,
  deliveredEmail,
  dispatchedEmail,
  escapeHtml,
  inTransitEmail,
  paidEmail,
} from '@/lib/email/award-templates'

// --- a minimal fake supabase client ----------------------------------------

type TableBehaviour = {
  /** Error returned by `.insert()` on this table. */
  insertError?: { code?: string; message?: string } | null
  /** Error returned by the terminal `.update().eq().eq()` on this table. */
  updateError?: { code?: string; message?: string } | null
  /** When set, `.insert()` throws instead of resolving. */
  insertThrows?: Error
}

type Recorded = { table: string; op: 'insert' | 'update'; payload: any }

function makeSupabase(behaviour: Record<string, TableBehaviour> = {}) {
  const calls: Recorded[] = []

  const client = {
    from(table: string) {
      const config = behaviour[table] ?? {}
      return {
        insert(payload: any) {
          calls.push({ table, op: 'insert', payload })
          if (config.insertThrows) throw config.insertThrows
          return Promise.resolve({ data: null, error: config.insertError ?? null })
        },
        update(payload: any) {
          calls.push({ table, op: 'update', payload })
          // The chain is `.update(...).eq(...).eq(...)` and is awaited at the
          // end, so every link is both chainable and thenable.
          const result = { data: null, error: config.updateError ?? null }
          const chain: any = {
            eq: () => chain,
            then: (resolve: (value: any) => unknown) => Promise.resolve(result).then(resolve),
          }
          return chain
        },
      }
    },
  }

  return { client: client as any, calls }
}

const ORDER: AwardOrderRow = {
  id: 'order-1',
  profile_id: 'profile-1',
  status: 'paid',
  recipient_name: 'Ada Lovelace',
  email: 'ada@example.com',
  address_line1: '12 Broad Street',
  address_line2: 'Flat 4',
  city: 'Lagos',
  state: 'Lagos',
  country: 'Nigeria',
  postal_code: '100001',
  total_amount_kobo: 2_000_000,
  gig_waybill: 'GIG-778899',
  gig_tracking_url: 'https://track.example.com/GIG-778899',
}

const inserts = (calls: Recorded[], table: string) => calls.filter((c) => c.table === table && c.op === 'insert')

let errorSpy: ReturnType<typeof vi.spyOn>
let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  sendEmail.mockReset()
  sendEmail.mockResolvedValue(true)
  process.env.BREVO_API_KEY = 'test-key'
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  errorSpy.mockRestore()
  warnSpy.mockRestore()
  delete process.env.BREVO_API_KEY
})

// ---------------------------------------------------------------------------

describe('notifyAwardStatus — the happy path', () => {
  it.each(AWARD_MILESTONES)('sends both channels once for %s', async (milestone) => {
    const { client, calls } = makeSupabase()

    await notifyAwardStatus(client, ORDER, milestone)

    // Claimed before sending.
    const claims = inserts(calls, 'award_notification_log')
    expect(claims).toHaveLength(1)
    expect(claims[0].payload).toMatchObject({ order_id: 'order-1', status: milestone, profile_id: 'profile-1' })

    // In-app row keyed by user_id, on the table the dashboard reads.
    const notices = inserts(calls, 'user_notifications')
    expect(notices).toHaveLength(1)
    expect(notices[0].payload.user_id).toBe('profile-1')
    expect(notices[0].payload.title).toBeTruthy()

    // Exactly one email.
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: 'ada@example.com' })

    // Outcome recorded on the log row.
    const finalise = calls.find((c) => c.table === 'award_notification_log' && c.op === 'update')
    expect(finalise?.payload.channels).toEqual(['in_app', 'email'])
    expect(finalise?.payload.sent_at).toBeTruthy()
    expect(finalise?.payload.error).toBeNull()
  })

  it('claims the log row before touching either channel', async () => {
    const { client, calls } = makeSupabase()
    await notifyAwardStatus(client, ORDER, 'paid')
    expect(calls[0]).toMatchObject({ table: 'award_notification_log', op: 'insert' })
  })

  it('ignores statuses that are not milestones', async () => {
    const { client, calls } = makeSupabase()
    await notifyAwardStatus(client, ORDER, 'quoted')
    await notifyAwardStatus(client, ORDER, 'cancelled')
    expect(calls).toHaveLength(0)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe('notifyAwardStatus — exactly once', () => {
  it('sends nothing when the (order, status) claim hits a unique violation', async () => {
    const { client, calls } = makeSupabase({
      award_notification_log: { insertError: { code: '23505', message: 'duplicate key value violates unique constraint' } },
    })

    await notifyAwardStatus(client, ORDER, 'paid')

    expect(inserts(calls, 'user_notifications')).toHaveLength(0)
    expect(sendEmail).not.toHaveBeenCalled()
    // A retry is normal traffic, not an error worth shouting about.
    expect(calls.filter((c) => c.op === 'update')).toHaveLength(0)
  })

  it('simulated Paystack retry: two deliveries produce one email', async () => {
    let claimed = false
    const client: any = {
      from(table: string) {
        return {
          insert() {
            if (table === 'award_notification_log') {
              if (claimed) return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } })
              claimed = true
            }
            return Promise.resolve({ error: null })
          },
          update() {
            const chain: any = { eq: () => chain, then: (r: any) => Promise.resolve({ error: null }).then(r) }
            return chain
          },
        }
      },
    }

    await notifyAwardStatus(client, ORDER, 'paid')
    await notifyAwardStatus(client, ORDER, 'paid')
    await notifyAwardStatus(client, ORDER, 'paid')

    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('sends nothing when the claim fails for an unknown reason', async () => {
    const { client, calls } = makeSupabase({
      award_notification_log: { insertError: { code: '08006', message: 'connection failure' } },
    })

    await notifyAwardStatus(client, ORDER, 'paid')

    expect(sendEmail).not.toHaveBeenCalled()
    expect(inserts(calls, 'user_notifications')).toHaveLength(0)
  })
})

describe('notifyAwardStatus — never throws', () => {
  it('swallows a Brevo throw and still resolves', async () => {
    sendEmail.mockRejectedValue(new Error('brevo exploded'))
    const { client, calls } = makeSupabase()

    await expect(notifyAwardStatus(client, ORDER, 'dispatched')).resolves.toBeUndefined()

    // The in-app channel still landed — the channels are independent.
    expect(inserts(calls, 'user_notifications')).toHaveLength(1)
    const finalise = calls.find((c) => c.table === 'award_notification_log' && c.op === 'update')
    expect(finalise?.payload.channels).toEqual(['in_app'])
    expect(finalise?.payload.error).toContain('brevo exploded')
  })

  it('swallows a supabase client that throws outright', async () => {
    const exploding: any = {
      from() {
        throw new Error('client is broken')
      },
    }
    await expect(notifyAwardStatus(exploding, ORDER, 'paid')).resolves.toBeUndefined()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('resolves when handed no order at all', async () => {
    const { client } = makeSupabase()
    await expect(notifyAwardStatus(client, null, 'paid')).resolves.toBeUndefined()
    await expect(notifyAwardStatus(client, undefined, 'paid')).resolves.toBeUndefined()
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe('notifyAwardStatus — degradation', () => {
  it('degrades silently when award_notification_log does not exist', async () => {
    const { client, calls } = makeSupabase({
      award_notification_log: {
        insertError: { code: 'PGRST205', message: "Could not find the table 'public.award_notification_log' in the schema cache" },
      },
    })

    await expect(notifyAwardStatus(client, ORDER, 'paid')).resolves.toBeUndefined()

    // No exactly-once guarantee available, so nothing is sent.
    expect(sendEmail).not.toHaveBeenCalled()
    expect(inserts(calls, 'user_notifications')).toHaveLength(0)
    expect(errorSpy.mock.calls.flat().join(' ')).toContain('20260728_award_notification_log.sql')
  })

  it('still emails when only user_notifications is missing', async () => {
    const { client, calls } = makeSupabase({
      user_notifications: { insertError: { code: '42P01', message: 'relation "public.user_notifications" does not exist' } },
    })

    await expect(notifyAwardStatus(client, ORDER, 'delivered')).resolves.toBeUndefined()

    expect(sendEmail).toHaveBeenCalledTimes(1)
    const finalise = calls.find((c) => c.table === 'award_notification_log' && c.op === 'update')
    expect(finalise?.payload.channels).toEqual(['email'])
    expect(finalise?.payload.error).toContain('SETUP-MEMBER-HUB.sql')
  })

  it('live-DB reality today: BOTH tables missing resolves, sends nothing, throws nothing', async () => {
    const missing = { code: 'PGRST205', message: 'Could not find the table in the schema cache' }
    const { client, calls } = makeSupabase({
      award_notification_log: { insertError: missing },
      user_notifications: { insertError: missing },
    })

    await expect(notifyAwardStatus(client, ORDER, 'paid')).resolves.toBeUndefined()

    expect(sendEmail).not.toHaveBeenCalled()
    expect(inserts(calls, 'user_notifications')).toHaveLength(0)
    expect(calls.filter((c) => c.op === 'update')).toHaveLength(0)
  })

  it('records a failure on the log row when the in-app insert throws', async () => {
    const { client, calls } = makeSupabase({
      user_notifications: { insertThrows: new Error('network down') },
    })

    await expect(notifyAwardStatus(client, ORDER, 'in_transit')).resolves.toBeUndefined()

    const finalise = calls.find((c) => c.table === 'award_notification_log' && c.op === 'update')
    expect(finalise?.payload.channels).toEqual(['email'])
    expect(finalise?.payload.error).toContain('network down')
  })

  it('skips the in-app row when the order has no profile_id', async () => {
    const { client, calls } = makeSupabase()
    await notifyAwardStatus(client, { ...ORDER, profile_id: null }, 'paid')
    expect(inserts(calls, 'user_notifications')).toHaveLength(0)
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})

describe('notifyAwardStatus — BREVO_API_KEY', () => {
  it('skips email but still writes the in-app notification when the key is unset', async () => {
    delete process.env.BREVO_API_KEY
    const { client, calls } = makeSupabase()

    await notifyAwardStatus(client, ORDER, 'paid')

    expect(sendEmail).not.toHaveBeenCalled()
    expect(inserts(calls, 'user_notifications')).toHaveLength(1)

    const finalise = calls.find((c) => c.table === 'award_notification_log' && c.op === 'update')
    // A config gap, not an error state: no `error` recorded.
    expect(finalise?.payload.channels).toEqual(['in_app'])
    expect(finalise?.payload.error).toBeNull()
  })

  it('records a failure when Brevo reports the send did not go out', async () => {
    sendEmail.mockResolvedValue(false)
    const { client, calls } = makeSupabase()

    await notifyAwardStatus(client, ORDER, 'paid')

    const finalise = calls.find((c) => c.table === 'award_notification_log' && c.op === 'update')
    expect(finalise?.payload.channels).toEqual(['in_app'])
    expect(finalise?.payload.error).toContain('Brevo')
  })
})

// ---------------------------------------------------------------------------

describe('error classifiers', () => {
  it('recognises unique violations', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true)
    expect(isUniqueViolation({ message: 'duplicate key value violates unique constraint' })).toBe(true)
    expect(isUniqueViolation({ code: '42P01' })).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
  })

  it('recognises the missing tables', () => {
    expect(isMissingNotificationLogTable({ code: '42P01' })).toBe(true)
    expect(isMissingNotificationLogTable({ code: 'PGRST205' })).toBe(true)
    expect(isMissingNotificationLogTable(null)).toBe(false)
    expect(isMissingUserNotificationsTable({ message: 'relation "public.user_notifications" does not exist' })).toBe(true)
    expect(isMissingUserNotificationsTable({ code: '23505' })).toBe(false)
  })

  it('knows which statuses are milestones', () => {
    expect(isAwardMilestone('paid')).toBe(true)
    expect(isAwardMilestone('delivered')).toBe(true)
    expect(isAwardMilestone('quoted')).toBe(false)
    expect(isAwardMilestone(undefined)).toBe(false)
  })
})

describe('toEmailInput', () => {
  it('builds a readable address block and drops empty parts', () => {
    expect(toEmailInput(ORDER).addressLines).toEqual([
      '12 Broad Street',
      'Flat 4',
      'Lagos, Lagos 100001',
      'Nigeria',
    ])
    expect(toEmailInput({ id: 'x' }).addressLines.join('').trim()).toBe('')
  })
})

// --- templates -------------------------------------------------------------

const TEMPLATE_INPUT = {
  recipientName: 'Ada Lovelace',
  totalAmountKobo: 2_000_000,
  addressLines: ['12 Broad Street', 'Lagos, Lagos', 'Nigeria'],
  waybill: 'GIG-778899',
  trackingUrl: 'https://track.example.com/GIG-778899',
  courierName: 'GIG Logistics',
}

describe('award email templates', () => {
  it('escapes a <script> in a recipient name', () => {
    const hostile = { ...TEMPLATE_INPUT, recipientName: '<script>alert("xss")</script>' }
    for (const milestone of AWARD_MILESTONES) {
      const email = buildAwardEmail(milestone, hostile)
      expect(email.html).not.toContain('<script>')
      expect(email.html).toContain('&lt;script&gt;')
    }
  })

  it('escapes hostile address lines', () => {
    const email = paidEmail({ ...TEMPLATE_INPUT, addressLines: ['<img src=x onerror=alert(1)>'] })
    expect(email.html).not.toContain('<img')
    expect(email.html).toContain('&lt;img')
  })

  it('escapeHtml handles the five dangerous characters without double-escaping', () => {
    expect(escapeHtml('<a href="x">Tom & \'Jerry\'</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;',
    )
    expect(escapeHtml(null)).toBe('')
  })

  it('formats 2,000,000 kobo as naira in the paid email', () => {
    const email = paidEmail(TEMPLATE_INPUT)
    // formatNaira (lib/awards/money.ts) renders a whole-naira amount without
    // trailing kobo: 2_000_000 -> "₦20,000".
    expect(email.text).toContain('₦20,000')
    expect(email.html).toContain('₦20,000')
    expect(email.subject).toBe('Payment confirmed — your award is being prepared')
  })

  it('the paid email carries the delivery address and what-happens-next', () => {
    const email = paidEmail(TEMPLATE_INPUT)
    expect(email.html).toContain('12 Broad Street')
    expect(email.text).toContain('12 Broad Street')
    expect(email.text).toContain('What happens next')
  })

  it('the dispatch email includes the waybill, courier, tracking link and address', () => {
    const email = dispatchedEmail(TEMPLATE_INPUT)
    expect(email.subject).toBe('Your award has been sent')
    expect(email.html).toContain('GIG-778899')
    expect(email.text).toContain('GIG-778899')
    expect(email.html).toContain('https://track.example.com/GIG-778899')
    expect(email.html).toContain('GIG Logistics')
    expect(email.html).toContain('Lagos')
  })

  it('the in-transit email carries the waybill and tracking link', () => {
    const email = inTransitEmail(TEMPLATE_INPUT)
    expect(email.subject).toBe('Your award is on the way')
    expect(email.html).toContain('GIG-778899')
    expect(email.text).toContain('https://track.example.com/GIG-778899')
  })

  it('the delivered email carries the waybill and invites a photo', () => {
    const email = deliveredEmail(TEMPLATE_INPUT)
    expect(email.subject).toBe('Your award has been delivered')
    expect(email.html).toContain('GIG-778899')
    expect(email.html).toContain('share a photo')
    expect(email.text).toContain('share a photo')
  })

  it('refuses to render a non-http tracking URL as a link', () => {
    const email = dispatchedEmail({ ...TEMPLATE_INPUT, trackingUrl: 'javascript:alert(1)' })
    expect(email.html).not.toContain('javascript:')
    expect(email.text).not.toContain('javascript:')
  })

  it('degrades gracefully with everything missing', () => {
    for (const milestone of AWARD_MILESTONES) {
      const email = buildAwardEmail(milestone, {
        recipientName: '',
        totalAmountKobo: null,
        addressLines: [],
        waybill: null,
        trackingUrl: null,
        courierName: '',
      })
      expect(email.subject).toBeTruthy()
      expect(email.html).toContain('Awardee')
      expect(email.text).toContain('Awardee')
      expect(email.html).not.toContain('undefined')
      expect(email.text).not.toContain('null')
    }
  })

  it('every milestone produces a plain-text alternative', () => {
    for (const milestone of AWARD_MILESTONES) {
      const email = buildAwardEmail(milestone, TEMPLATE_INPUT)
      expect(email.text.length).toBeGreaterThan(40)
      expect(email.text).not.toContain('<p')
    }
  })
})
