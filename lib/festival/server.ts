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
}
const fields = 'full_name,phone,pickup_requested,updated_at'
const mapInterest = (row: InterestRow): FestivalInterest => ({
  fullName: row.full_name,
  phone: row.phone,
  pickupRequested: row.pickup_requested,
  updatedAt: row.updated_at,
})

async function view(
  memberId: string,
  interest: FestivalInterest | null,
): Promise<FestivalInterestView> {
  // Award payment is relevant to both festival collection and later delivery.
  try {
    return {
      interest,
      payment: pickupPaymentState(await getAwardPaymentView(memberId)),
    }
  } catch {
    return { interest, payment: 'unavailable' }
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
  return view(memberId, data ? mapInterest(data) : null)
}

export async function saveFestivalInterest(
  memberId: string,
  input: FestivalInterestInput,
): Promise<FestivalInterestView> {
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
      },
      { onConflict: 'festival_key,member_id' },
    )
    .select(fields)
    .single()
  if (error || !data) throw new Error('Festival interest could not be saved.')
  return view(memberId, mapInterest(data))
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
    })),
    total: count ?? 0,
    page,
    pageSize,
  }
}
