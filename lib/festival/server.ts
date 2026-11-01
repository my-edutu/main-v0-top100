// Server-owned persistence. Payment status is always current and never supplied by the member.
import { createAdminClient } from '@/lib/supabase/server'
import { getAwardPaymentView } from '@/lib/awards/payment-server'
import { FESTIVAL_KEY } from './config'
import {
  pickupPaymentState,
  type FestivalInterest,
  type FestivalInterestInput,
  type FestivalInterestView,
  type FestivalInterestList,
} from './interest'

type InterestRow = {
  full_name: string
  phone: string
  pickup_requested: boolean
  updated_at: string
  registered_at: string | null
  ticket_id: string
  ticket_email_sent_at: string | null
  ticket_email_failed_at: string | null
}
const fields = 'full_name,phone,pickup_requested,updated_at,registered_at,ticket_id,ticket_email_sent_at,ticket_email_failed_at'
const mapInterest = (row: InterestRow): FestivalInterest => ({
  fullName: row.full_name,
  phone: row.phone,
  pickupRequested: row.pickup_requested,
  updatedAt: row.updated_at,
})

async function view(
  memberId: string,
  row: InterestRow | null,
): Promise<FestivalInterestView> {
  const interest = row ? mapInterest(row) : null
  // Award payment is relevant to both festival collection and later delivery.
  try {
    const payment = pickupPaymentState(await getAwardPaymentView(memberId))
    return {
      interest,
      payment,
      ticket: payment === 'confirmed' && row?.registered_at ? {
        id: row.ticket_id,
        registeredAt: row.registered_at,
        emailStatus: row.ticket_email_sent_at ? 'sent' : row.ticket_email_failed_at ? 'failed' : 'pending',
      } : null,
    }
  } catch {
    return { interest, payment: 'unavailable', ticket: null }
  }
}

export async function readFestivalInterest(
  memberId: string,
): Promise<FestivalInterestView> {
  const { data, error } = await createAdminClient()
    .from('festival_attendance_interests')
    .select(fields)
    .eq('festival_key', FESTIVAL_KEY)
    .eq('member_id', memberId)
    .maybeSingle()
  if (error) throw new Error('Festival interest could not be loaded.')
  return view(memberId, data)
}

export class FestivalRegistrationError extends Error {
  constructor(public status: number, message: string, public payment: FestivalInterestView['payment']) {
    super(message)
  }
}

export async function requireFestivalPayment(memberId: string) {
  let payment: FestivalInterestView['payment']
  try { payment = pickupPaymentState(await getAwardPaymentView(memberId)) }
  catch { payment = 'unavailable' }
  if (payment !== 'confirmed') throw new FestivalRegistrationError(
    payment === 'unavailable' ? 503 : 409,
    payment === 'pending' ? 'Your award payment is still being verified. Check its status before registering.'
      : payment === 'unavailable' ? 'We couldn’t verify your award payment. Please check again before registering.'
        : 'Get your physical award first. Confirmed award payment is required to attend the festival.',
    payment,
  )
}

export async function saveFestivalInterest(
  memberId: string,
  input: FestivalInterestInput,
): Promise<FestivalInterestView> {
  await requireFestivalPayment(memberId)
  const { data, error } = await createAdminClient()
    .from('festival_attendance_interests')
    .upsert(
      {
        festival_key: FESTIVAL_KEY,
        member_id: memberId,
        full_name: input.fullName,
        phone: input.phone,
        pickup_requested: input.pickupRequested,
        updated_at: new Date().toISOString(),
        registered_at: new Date().toISOString(),
      },
      { onConflict: 'festival_key,member_id' },
    )
    .select(fields)
    .single()
  if (error || !data) throw new Error('Festival interest could not be saved.')
  return view(memberId, data)
}

export async function listFestivalInterests(
  page: number,
): Promise<FestivalInterestList> {
  const pageSize = 25
  const { data, count, error } = await createAdminClient()
    .from('festival_attendance_interests')
    .select(`member_id,${fields}`, { count: 'exact' })
    .eq('festival_key', FESTIVAL_KEY)
    .order('updated_at', { ascending: false })
    .order('member_id', { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1)
  if (error) throw new Error('Festival responses could not be loaded.')
  return {
    interests: (data ?? []).map((row) => ({
      ...mapInterest(row),
      memberId: row.member_id,
      registeredAt: row.registered_at,
      ticketId: row.registered_at ? row.ticket_id : null,
    })),
    total: count ?? 0,
    page,
    pageSize,
  }
}
