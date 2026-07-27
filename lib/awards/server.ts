// lib/awards/server.ts
// Server-only helpers mapping award_orders rows onto the API shape.
// Never import into a client component.
import type { createAdminClient } from '@/lib/supabase/server'
import type { AwardStatus } from '@/lib/awards/status'

export const AWARD_SETUP_MESSAGE =
  'The awards database is not set up yet. Ask the admin to run supabase/migrations/20260726_award_orders.sql.'

export type AwardOrderView = {
  id: string
  status: AwardStatus
  recipientName: string
  phone: string
  email: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  country: string
  postalCode: string
  awardAmountKobo: number
  shippingAmountKobo: number | null
  totalAmountKobo: number | null
  currency: string
  quoteExpiresAt: string | null
  waybill: string | null
  trackingUrl: string | null
  deliveryStatus: string | null
  paidAt: string | null
  createdAt: string
}

export function mapAwardOrder(row: any): AwardOrderView {
  return {
    id: row.id,
    status: (row.status ?? 'draft') as AwardStatus,
    recipientName: row.recipient_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    addressLine1: row.address_line1 ?? '',
    addressLine2: row.address_line2 ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    country: row.country ?? '',
    postalCode: row.postal_code ?? '',
    awardAmountKobo: row.award_amount_kobo ?? 0,
    shippingAmountKobo: row.shipping_amount_kobo ?? null,
    totalAmountKobo: row.total_amount_kobo ?? null,
    currency: row.currency ?? 'NGN',
    quoteExpiresAt: row.gig_quote_expires_at ?? null,
    waybill: row.gig_waybill ?? null,
    trackingUrl: row.gig_tracking_url ?? null,
    deliveryStatus: row.gig_last_status ?? null,
    paidAt: row.paid_at ?? null,
    createdAt: row.created_at,
  }
}

/** The member's one live order, or null if they have never started one. */
export async function loadOrderForUser(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from('award_orders')
    .select('*')
    .eq('profile_id', userId)
    .neq('status', 'cancelled')
    .maybeSingle()

  return { order: data ?? null, error }
}

/** True when the failure is "the migration has not been run yet". */
export function isMissingAwardTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === '42P01') return true
  return /relation .*award_orders.* does not exist|schema cache/i.test(error.message ?? '')
}
