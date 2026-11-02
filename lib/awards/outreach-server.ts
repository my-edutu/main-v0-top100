import { createAdminClient } from '@/lib/supabase/server'
import { hasVerifiedAwardPayment } from './admin-summary'
import { mapAdminPaymentAttempt, selectAdminPaymentAttempt } from './admin-payment-view'
import { buildOutreachAudience, type OutreachContact, type OutreachSource } from './outreach'
import { awardFee } from './payment-price'
import { SITE_URL } from '@/lib/site'
import { buildOutreachMessage, type OutreachDraft } from './outreach-templates'
import type { OutreachMember } from './outreach'

export const OUTREACH_SETUP_MESSAGE = 'Outreach tracking needs the award_outreach_workspace database migration. Awardee counts remain available; apply the migration to enable notes, tracked exports and campaigns.'
type Db = ReturnType<typeof createAdminClient>
export const outreachDbMissing = (error: { code?: string } | null) => Boolean(error && ['42P01', 'PGRST205'].includes(error.code ?? ''))

/** Iterate until empty using the actual row count, even when the server caps each page. */
export async function readOutreachRows<T>(db: Db, table: string, columns: string): Promise<T[]> {
  const rows: T[] = []
  for (;;) {
    const { data, error } = await db.from(table).select(columns).order('id', { ascending: true }).range(rows.length, rows.length + 499)
    if (error) throw Object.assign(new Error(`Could not load ${table}.`), { code: error.code })
    if (!data?.length) return rows
    rows.push(...data as T[])
    if (rows.length > 100_000) throw new Error('Audience exceeds the safe loading limit. Contact the team before exporting.')
  }
}
export async function loadOutreachAudience(db: Db) {
  const [awardees, profiles, rawOrders, rawAttempts] = await Promise.all([
    readOutreachRows<OutreachSource['awardees'][number]>(db, 'awardees', 'id,name,email,profile_id,year,country'),
    readOutreachRows<OutreachSource['profiles'][number]>(db, 'profiles', 'id,email,full_name,phone'),
    readOutreachRows<Record<string, unknown>>(db, 'award_orders', 'id,awardee_id,profile_id,email,status,award_payment_status,award_paid_attempt_id,paid_at,paystack_reference,paystack_status,total_amount_kobo,currency'),
    readOutreachRows<Record<string, unknown>>(db, 'award_payment_attempts', 'id,order_id,provider,charge_scope,status,confirmed_at,provider_reference,failure_reason,created_at'),
  ])
  const contacts: OutreachContact[] = []
  let setup = true
  try {
    // This table uses awardee_id, not id, as its primary key.
    let offset = 0
    for (;;) {
      const { data, error } = await db.from('award_outreach_contacts').select('*').order('awardee_id').range(offset, offset + 499)
      if (error) throw Object.assign(new Error(OUTREACH_SETUP_MESSAGE), { code: error.code })
      if (!data?.length) break
      contacts.push(...data as OutreachContact[]); offset += data.length
    }
  } catch (error) {
    if (!outreachDbMissing(error as { code?: string })) throw error
    setup = false
  }
  const deliveryHeldEmails: string[] = []
  if (setup) {
    let offset = 0
    for (;;) {
      const { data, error } = await db.from('award_outreach_recipients').select('id,email').eq('status', 'delivery_unknown').order('id').range(offset, offset + 499)
      if (error) throw new Error('Could not load outstanding email delivery reviews.')
      if (!data?.length) break
      deliveryHeldEmails.push(...data.map(row => String(row.email))); offset += data.length
    }
  }
  const byOrder = new Map<string, Record<string, unknown>[]>()
  for (const a of rawAttempts) byOrder.set(String(a.order_id), [...(byOrder.get(String(a.order_id)) ?? []), a])
  const orders = rawOrders.map(row => {
    const raw = byOrder.get(String(row.id)) ?? []
    const payment = selectAdminPaymentAttempt(row, raw)
    const attempts = raw.length ? raw.map(mapAdminPaymentAttempt) : payment ? [payment] : []
    const legacyPaid = Boolean(payment?.isLegacy && ['paid', 'success', 'successful', 'succeeded', 'complete', 'completed', 'accepted'].includes(payment.status.toLowerCase())) || Boolean(row.status === 'paid' || row.paid_at)
    const awardPaymentStatus = typeof row.award_payment_status === 'string' ? row.award_payment_status : payment?.provider === 'bachs' ? payment.status : legacyPaid ? 'paid' : 'unpaid'
    return {
      id: String(row.id), awardee_id: row.awardee_id as string | null, profile_id: row.profile_id as string | null, email: row.email as string | null, status: String(row.status),
      awardPaymentStatus, paymentStatus: payment?.status,
      awardPaymentVerified: hasVerifiedAwardPayment({ awardPaymentStatus, awardPaidAttemptId: row.award_paid_attempt_id as string | null, payment, paymentAttempts: attempts }),
    }
  })
  return { members: buildOutreachAudience({ awardees, profiles, orders, contacts, deliveryHeldEmails }), contacts, setup }
}
export function outreachLinks(member: OutreachMember, token: string) {
  const origin = new URL(SITE_URL).origin
  return {
    actionUrl: `${origin}/api/award-outreach/${token}`,
    stopUrl: `${origin}/award-outreach/stop/${token}`,
    imageUrl: `${origin}/afl-physical-award.png`,
    name: member.name, year: member.years.join(' / '), fee: `${awardFee('NGN').display} or ${awardFee('USD').display}`,
  }
}
export const renderOutreach = (draft: OutreachDraft, member: OutreachMember, token: string) => buildOutreachMessage(draft, outreachLinks(member, token))
export async function ensureOutreachContacts(db: Db, ids: string[]) {
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100)
    const { error } = await db.from('award_outreach_contacts').upsert(batch.map(awardee_id => ({ awardee_id })), { onConflict: 'awardee_id', ignoreDuplicates: true })
    if (error) throw new Error('Could not prepare tracked outreach links.')
  }
}
