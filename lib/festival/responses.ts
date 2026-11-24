import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import { FESTIVAL_KEY } from './config'
import type { FestivalDispatch, FestivalResponse, FestivalResponseList, FestivalRsvp } from './interest'

type Row = {
  attending: boolean | null
  awardee_name: string | null
  awardee_email: string | null
  awardee_phone: string | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  pickup: FestivalResponse['pickup']
  dispatch: FestivalDispatch | null
}
const fields = 'attending,awardee_name,awardee_email,awardee_phone,guest_name,guest_email,guest_phone,pickup,dispatch'

function mapResponse(row: Row): FestivalResponse {
  return {
    attending: row.attending,
    awardee: row.awardee_name ? {
      name: row.awardee_name, email: row.awardee_email ?? '', phone: row.awardee_phone ?? '',
    } : null,
    guest: row.guest_name ? {
      name: row.guest_name, email: row.guest_email ?? '', phone: row.guest_phone ?? '',
    } : null,
    pickup: row.pickup,
    dispatch: row.pickup === 'dispatch' ? row.dispatch : null,
  }
}

export async function getFestivalResponse(memberId: string) {
  const { data, error } = await createAdminClient().from('festival_rsvps')
    .select(fields).eq('festival_key', FESTIVAL_KEY).eq('member_id', memberId).maybeSingle()
  if (error) throw error
  return data ? mapResponse(data as Row) : null
}

export async function saveFestivalResponse(
  memberId: string,
  submission: { rsvp: FestivalRsvp } | { dispatch: FestivalDispatch },
) {
  const update = 'rsvp' in submission
    ? {
        attending: submission.rsvp.attending,
        awardee_name: submission.rsvp.awardee.name,
        awardee_email: submission.rsvp.awardee.email,
        awardee_phone: submission.rsvp.awardee.phone,
        guest_name: submission.rsvp.guest?.name ?? null,
        guest_email: submission.rsvp.guest?.email ?? null,
        guest_phone: submission.rsvp.guest?.phone ?? null,
        pickup: submission.rsvp.pickup,
        ...(submission.rsvp.pickup === 'festival' ? { dispatch: null } : {}),
      }
    : { pickup: 'dispatch', dispatch: submission.dispatch }
  const { data, error } = await createAdminClient().from('festival_rsvps').upsert({
    ...update, festival_key: FESTIVAL_KEY, member_id: memberId, updated_at: new Date().toISOString(),
  }, { onConflict: 'festival_key,member_id', defaultToNull: false }).select(fields).single()
  if (error) throw error
  return mapResponse(data as Row)
}

export async function listFestivalResponses(page: number, filter: string): Promise<FestivalResponseList> {
  const db = createAdminClient()
  const query = () => db.from('festival_rsvps')
  const pageSize = 25
  let listing = query().select(`member_id,${fields},profiles(full_name,email)`, { count: 'exact' }).eq('festival_key', FESTIVAL_KEY)
  if (filter === 'attending') listing = listing.eq('attending', true)
  if (filter === 'guests') listing = listing.not('guest_name', 'is', null)
  if (filter === 'dispatch') listing = listing.eq('pickup', 'dispatch')
  const count = () => query().select('member_id', { count: 'exact', head: true }).eq('festival_key', FESTIVAL_KEY)
  const [list, attending, guests, dispatch] = await Promise.all([
    listing.order('updated_at', { ascending: false }).order('member_id').range((page - 1) * pageSize, page * pageSize - 1),
    count().eq('attending', true),
    count().not('guest_name', 'is', null),
    count().eq('pickup', 'dispatch'),
  ])
  if (list.error || attending.error || guests.error || dispatch.error) throw new Error('Could not load festival responses.')
  return {
    pageSize,
    total: list.count ?? 0,
    attending: attending.count ?? 0,
    guests: guests.count ?? 0,
    dispatch: dispatch.count ?? 0,
    responses: list.data.map((row) => {
      const profile = row.profiles as unknown as { full_name: string | null; email: string | null } | null
      return { ...mapResponse(row as Row), memberId: row.member_id, name: profile?.full_name || 'Awardee', email: profile?.email || '' }
    }),
  }
}
