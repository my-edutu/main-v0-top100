import type { Metadata } from 'next'
import { CheckCircle2, LockKeyhole } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'
import { memberMentorshipOpen, MENTOR_PORTAL } from '@/lib/mentors/contracts'
import { mentorUser, ownMentorProfile } from '@/lib/mentors/server'
import { panel, secondary, sessionTime } from '@/lib/mentors/ui'
import { AddSlotForm, MentorActionForm, MentorAuthForm, ProfileForm } from './forms'
import { signOutMentor, updateMentorWorkspace } from './actions'

export const metadata: Metadata = {
  title: 'Impact Africa Mentors',
  description: 'Sign up as an Impact Africa mentor and share what you can teach.',
  alternates: { canonical: MENTOR_PORTAL },
  ...ogMetadata(pageOg(MENTOR_PORTAL), { url: MENTOR_PORTAL }),
}

export default async function ImpactAfricaMentorsPage() {
  const user = await mentorUser()
  const matchingOpen = memberMentorshipOpen()

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <header className="self-start rounded-2xl bg-[#fff4c7] p-6 text-stone-950 sm:p-9">
        <p className="text-sm font-semibold text-stone-700">Impact Africa · Top100</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{user ? 'Your mentor space' : 'Become an Impact Africa mentor'}</h1>
        <p className="mt-4 max-w-md text-base leading-7 text-stone-700">Help young African leaders learn from your experience. Tell us what you do and what you can help someone learn.</p>
        {!matchingOpen && <p className="mt-6 flex items-start gap-2 text-sm leading-6 text-stone-700"><LockKeyhole size={17} className="mt-1 shrink-0" aria-hidden="true" />Mentor signup is open. Members can find and book mentors when matching opens.</p>}
      </header>
      {user ? <MentorWorkspace userId={user.id} email={user.email} matchingOpen={matchingOpen} /> : (
        <section className={panel} aria-labelledby="mentor-sign-in">
          <h2 id="mentor-sign-in" className="text-2xl font-semibold text-stone-950">Get started or sign in</h2>
          <p className="mb-6 mt-2 text-sm leading-6 text-stone-600">Enter your email to get a sign-in code. Use the same email next time to open your saved profile.</p>
          <MentorAuthForm />
        </section>
      )}
    </main>
  )
}

async function MentorWorkspace({ userId, email, matchingOpen }: { userId: string; email?: string; matchingOpen: boolean }) {
  const db = createAdminClient()
  let profile
  try {
    profile = await ownMentorProfile(db, userId)
  } catch (error) {
    console.error('[impact-mentors] Profile unavailable', error && typeof error === 'object' && 'code' in error ? error.code : null)
    return <p className={panel} role="alert">We could not load your mentor profile. Refresh the page to try again.</p>
  }
  return (
    <div className="min-w-0 space-y-5">
      <section className={panel}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-stone-950">Mentor profile</h2>
            <p className="mt-1 break-words text-sm text-stone-600">{email}</p>
          </div>
          <form action={signOutMentor}><button className={secondary} type="submit">Sign out</button></form>
        </div>
        {profile && <p className="mb-4 flex items-center gap-2 rounded-lg bg-stone-100 p-3 text-sm text-stone-700"><CheckCircle2 size={17} aria-hidden="true" />{matchingOpen && profile.accepting_requests ? 'Visible to approved Top100 members' : 'Profile saved and private'}</p>}
        <ProfileForm profile={profile} matchingOpen={matchingOpen} />
      </section>
      {profile && matchingOpen && <MentorSchedule mentorId={profile.id} />}
    </div>
  )
}

async function MentorSchedule({ mentorId }: { mentorId: string }) {
  const db = createAdminClient()
  const [matches, slots] = await Promise.all([
    db.from('impact_mentor_matches').select('id,goal,status').eq('mentor_id', mentorId).eq('status', 'pending').order('created_at', { ascending: true }).limit(100),
    db.from('impact_mentor_slots').select('id,starts_at,meeting_url,impact_mentor_bookings(slot_id)').eq('mentor_id', mentorId).gt('ends_at', new Date().toISOString()).order('starts_at').limit(100),
  ])
  if (matches.error || slots.error) return <p className={panel} role="alert">We could not load your schedule or requests. Refresh the page to try again.</p>
  return <>
    <section className={panel}>
      <h2 className="mb-4 text-xl font-semibold">Match requests</h2>
      {!matches.data.length && <p className="text-sm text-stone-600">No requests to review.</p>}
      <ul className="space-y-4">{matches.data.map(match => (
        <li key={match.id} className="rounded-lg border border-stone-200 p-4">
          <p className="mb-3 whitespace-pre-wrap break-words">{match.goal}</p>
          <MentorActionForm action={updateMentorWorkspace}>
            <input type="hidden" name="matchId" value={match.id} />
            <div className="flex flex-wrap gap-2">
              <button className={secondary} name="intent" value="accepted" type="submit">Accept request</button>
              <button className={secondary} name="intent" value="declined" type="submit">Decline</button>
            </div>
          </MentorActionForm>
        </li>
      ))}</ul>
    </section>
    <section className={panel}>
      <h2 className="text-xl font-semibold">Your schedule</h2>
      <p className="mb-4 mt-1 text-sm leading-6 text-stone-600">Add a time and a link for one 30-minute session. The link is shared with the member who books it.</p>
      <AddSlotForm />
      <ul className="mt-5 divide-y divide-stone-200">{slots.data.map(slot => (
        <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <time dateTime={slot.starts_at}>{sessionTime(slot.starts_at)}</time>
          {slot.impact_mentor_bookings ? <a className={secondary} href={slot.meeting_url} target="_blank" rel="noreferrer">Join booked session</a> : (
            <MentorActionForm action={updateMentorWorkspace}>
              <input type="hidden" name="intent" value="remove-slot" />
              <input type="hidden" name="slotId" value={slot.id} />
              <button className={secondary} type="submit">Remove time</button>
            </MentorActionForm>
          )}
        </li>
      ))}</ul>
    </section>
  </>
}
