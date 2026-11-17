import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LockKeyhole, Search } from 'lucide-react'
import { memberMentorshipOpen, MEMBER_MENTORS } from '@/lib/mentors/contracts'
import { mentorAwardeeAccess, mentorProfileFields } from '@/lib/mentors/server'
import { fieldClass, panel, primary, secondary, sessionTime } from '@/lib/mentors/ui'
import { Field, MentorActionForm } from '@/app/impact-africa/mentors/forms'
import { updateMemberMentorship } from './actions'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

export default async function DashboardMentorsPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; view?: string; page?: string }>
}) {
  let access
  try {
    access = await mentorAwardeeAccess()
  } catch {
    console.error('[impact-mentors] Member access failed')
    return <p className={panel} role="alert">We could not load mentorship right now. Try again shortly.</p>
  }
  if (!access) notFound()

  if (!memberMentorshipOpen()) {
    return (
      <section className={panel}>
        <LockKeyhole className="mb-4 size-6 text-stone-700" aria-hidden="true" />
        <h1 className="text-3xl font-semibold tracking-tight">Impact Africa mentors</h1>
        <p className="mt-2 max-w-xl text-base leading-7 text-stone-600">Mentor matching is closed for now. When it opens, you’ll be able to find a mentor, ask for a match, and book a time here.</p>
        <Link href="/dashboard/discover" className={`${secondary} mt-5`}>Back to Discover</Link>
      </section>
    )
  }

  const { db, user } = access
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 80) : ''
  const page = typeof params.page === 'string' && /^[1-9]\d{0,4}$/.test(params.page) ? Number(params.page) : 1
  const showMatches = params.view === 'matches'

  return (
    <div className="space-y-5">
      <header className={panel}>
        <h1 className="text-3xl font-semibold tracking-tight">Impact Africa mentors</h1>
        <p className="mt-2 text-base leading-7 text-stone-600">Find someone who can help you reach your next goal. Ask for a match, then book a time once they accept.</p>
        <nav aria-label="Mentoring" className="mt-5 flex flex-wrap gap-2">
          <Link href={MEMBER_MENTORS} aria-current={!showMatches ? 'page' : undefined} className={showMatches ? secondary : primary}>Find a mentor</Link>
          <Link href={`${MEMBER_MENTORS}?view=matches`} aria-current={showMatches ? 'page' : undefined} className={showMatches ? primary : secondary}>My matches</Link>
        </nav>
      </header>
      {showMatches ? <Matches db={db} userId={user.id} /> : <Directory db={db} userId={user.id} q={q} page={page} />}
    </div>
  )
}

type Db = NonNullable<Awaited<ReturnType<typeof mentorAwardeeAccess>>>['db']

async function Directory({ db, userId, q, page }: { db: Db; userId: string; q: string; page: number }) {
  const from = (page - 1) * PAGE_SIZE
  let query = db.from('impact_mentors').select(mentorProfileFields).eq('accepting_requests', true)
    .neq('user_id', userId).order('name').order('id').range(from, from + PAGE_SIZE)
  if (q) query = query.ilike('search_text', `%${q.replace(/[\\%_*]/g, '')}%`)
  const mentors = await query
  if (mentors.error) return <p className={panel} role="alert">We could not load the mentor list. Try again shortly.</p>
  const visible = mentors.data.slice(0, PAGE_SIZE)
  const existing = visible.length
    ? await db.from('impact_mentor_matches').select('mentor_id,status').eq('member_id', userId).in('mentor_id', visible.map(row => row.id))
    : { data: [], error: null }
  if (existing.error) return <p className={panel} role="alert">We could not load your match status. Try again shortly.</p>
  const status = new Map(existing.data.map(row => [row.mentor_id, row.status]))
  const pageUrl = (number: number) => `${MEMBER_MENTORS}?${new URLSearchParams({ ...(q ? { q } : {}), page: String(number) })}`

  return <>
    <form action={MEMBER_MENTORS} className={`${panel} flex flex-wrap items-end gap-3`}>
      <div className="min-w-0 flex-1 basis-48"><Field label="Search by name, role or topic">
        <input className={fieldClass} type="search" name="q" defaultValue={q} maxLength={80} placeholder="e.g. Product design" />
      </Field></div>
      <button type="submit" className={`${primary} gap-2`}><Search size={16} aria-hidden="true" />Search</button>
    </form>
    {!visible.length && <p className={panel}>No mentors found. {q ? 'Try a different name or topic.' : 'Check back later for new profiles.'}</p>}
    <ul className="grid gap-4 lg:grid-cols-2">{visible.map(mentor => (
      <li key={mentor.id} className={panel}>
        <h2 className="break-words text-xl font-semibold">{mentor.name}</h2>
        <p className="mt-1 break-words text-sm font-medium text-stone-700">{mentor.headline}</p>
        <p className="mt-3 break-words text-sm"><strong>Can help with</strong> {mentor.expertise}</p>
        <p className="my-4 whitespace-pre-wrap break-words text-sm leading-6 text-stone-600">{mentor.bio}</p>
        {status.has(mentor.id) ? (
          <Link className={secondary} href={`${MEMBER_MENTORS}?view=matches`}>View your match request</Link>
        ) : (
          <details>
            <summary className={`${secondary} cursor-pointer`}>Request a match</summary>
            <MentorActionForm action={updateMemberMentorship} className="mt-3">
              <input type="hidden" name="intent" value="request" />
              <input type="hidden" name="mentorId" value={mentor.id} />
              <Field label="What would you like help with?">
                <textarea className={fieldClass} name="goal" required minLength={10} maxLength={1000} rows={3} />
              </Field>
              <button type="submit" className={primary}>Send request</button>
            </MentorActionForm>
          </details>
        )}
      </li>
    ))}</ul>
    {(page > 1 || mentors.data.length > PAGE_SIZE) && <nav aria-label="Mentor results pages" className="flex flex-wrap gap-2">
      {page > 1 && <Link className={secondary} href={pageUrl(page - 1)}>Previous page</Link>}
      {mentors.data.length > PAGE_SIZE && <Link className={secondary} href={pageUrl(page + 1)}>Next page</Link>}
    </nav>}
  </>
}

async function Matches({ db, userId }: { db: Db; userId: string }) {
  const result = await db.from('impact_mentor_matches').select('id,mentor_id,status,impact_mentors(name)')
    .eq('member_id', userId).order('created_at', { ascending: false }).limit(100)
    .overrideTypes<{ id: string; mentor_id: string; status: string; impact_mentors: { name: string } | null }[], { merge: false }>()
  if (result.error) return <p className={panel} role="alert">We could not load your matches. Try again shortly.</p>
  if (!result.data.length) return <p className={panel}>You haven’t asked for a match yet. <Link className="font-semibold underline" href={MEMBER_MENTORS}>Find a mentor</Link> to get started.</p>
  return <ul className="space-y-4">{result.data.map(match => (
    <li key={match.id} className={panel}>
      <h2 className="break-words text-xl font-semibold">{match.impact_mentors?.name ?? 'Mentor'}</h2>
      <p className="mt-1 text-sm font-medium text-stone-600">{match.status === 'pending' ? 'Waiting for a reply' : match.status === 'accepted' ? 'Match accepted' : 'Request declined'}</p>
      {match.status === 'accepted' && <AvailableTimes db={db} matchId={match.id} mentorId={match.mentor_id} />}
    </li>
  ))}</ul>
}

async function AvailableTimes({ db, matchId, mentorId }: { db: Db; matchId: string; mentorId: string }) {
  const now = new Date().toISOString()
  const [slots, booked] = await Promise.all([
    db.from('impact_mentor_slots').select('id,starts_at,impact_mentor_bookings(slot_id)')
      .eq('mentor_id', mentorId).gt('starts_at', now).is('impact_mentor_bookings', null).order('starts_at').limit(24),
    db.from('impact_mentor_bookings').select('slot_id,impact_mentor_slots!inner(starts_at,meeting_url)')
      .eq('match_id', matchId).gt('impact_mentor_slots.ends_at', now)
      .order('impact_mentor_slots(starts_at)').limit(100)
      .overrideTypes<{ slot_id: string; impact_mentor_slots: { starts_at: string; meeting_url: string } }[], { merge: false }>(),
  ])
  if (slots.error || booked.error) return <p role="alert" className="mt-3 text-sm text-red-800">We could not load session times.</p>
  return <div className="mt-4 space-y-3">
    {booked.data.map(booking => (
      <div key={booking.slot_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-3">
        <p className="text-sm font-semibold">Booked · {sessionTime(booking.impact_mentor_slots.starts_at)}</p>
        <a className={secondary} href={booking.impact_mentor_slots.meeting_url} target="_blank" rel="noreferrer">Join session</a>
      </div>
    ))}
    {slots.data.length ? <MentorActionForm action={updateMemberMentorship}>
      <input type="hidden" name="intent" value="book" />
      <input type="hidden" name="matchId" value={matchId} />
      <Field label="Choose a 30-minute time">
        <select className={fieldClass} name="slotId" required defaultValue="">
          <option value="" disabled>Choose a time (UTC)</option>
          {slots.data.map(slot => <option key={slot.id} value={slot.id}>{sessionTime(slot.starts_at)}</option>)}
        </select>
      </Field>
      <button className={primary} type="submit">Book session</button>
    </MentorActionForm> : <p className="text-sm text-stone-600">No open times right now. Check back after your mentor adds one.</p>}
  </div>
}
