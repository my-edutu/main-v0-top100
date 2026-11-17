'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { memberMentorshipOpen, MENTOR_PORTAL, MentorInputError, mentorId, readMentorProfile, readMentorSlot } from '@/lib/mentors/contracts'
import { type MentorFormState, mentorFormError, mentorUser, ownMentorProfile } from '@/lib/mentors/server'

export async function saveMentorProfile(_: MentorFormState, form: FormData): Promise<MentorFormState> {
  try {
    const user = await mentorUser()
    if (!user) throw new MentorInputError('Sign in again to save your profile.')
    const { error } = await createAdminClient().from('impact_mentors').upsert({
      ...readMentorProfile(form),
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) throw error
    revalidatePath(MENTOR_PORTAL)
    return { success: 'Your mentor profile is saved.' }
  } catch (error) { return mentorFormError(error) }
}

export async function updateMentorWorkspace(_: MentorFormState, form: FormData): Promise<MentorFormState> {
  try {
    if (!memberMentorshipOpen()) throw new MentorInputError('Matching and scheduling are currently closed.')
    const user = await mentorUser()
    if (!user) throw new MentorInputError('Sign in again to continue.')
    const db = createAdminClient()
    const mentor = await ownMentorProfile(db, user.id)
    if (!mentor) throw new MentorInputError('Save your mentor profile first.')
    const intent = form.get('intent')

    if (intent === 'add-slot') {
      const slot = readMentorSlot(form)
      const ends = new Date(Date.parse(slot.starts_at) + 30 * 60_000).toISOString()
      const { error } = await db.from('impact_mentor_slots').insert({ ...slot, ends_at: ends, mentor_id: mentor.id })
      if (error) throw error
      revalidatePath(MENTOR_PORTAL)
      return { success: 'Your time is available to book.' }
    }
    if (intent === 'remove-slot') {
      const { data, error } = await db.from('impact_mentor_slots').delete()
        .eq('id', mentorId(form, 'slotId')).eq('mentor_id', mentor.id).gt('starts_at', new Date().toISOString()).select('id').maybeSingle()
      if (error) throw error
      if (!data) throw new MentorInputError('This time is no longer available to remove.')
      revalidatePath(MENTOR_PORTAL)
      return { success: 'Availability updated.' }
    }

    if (intent !== 'accepted' && intent !== 'declined') throw new MentorInputError('Choose a valid action.')
    const { data, error } = await db.from('impact_mentor_matches').update({ status: intent })
      .eq('id', mentorId(form, 'matchId')).eq('mentor_id', mentor.id).eq('status', 'pending').select('id').maybeSingle()
    if (error) throw error
    if (!data) throw new MentorInputError('This request has already been answered or is no longer available.')
    revalidatePath(MENTOR_PORTAL)
    return { success: intent === 'accepted' ? 'Match accepted. The member can book an open time.' : 'Request declined.' }
  } catch (error) { return mentorFormError(error) }
}

export async function signOutMentor() {
  const client = await createClient()
  await client.auth.signOut({ scope: 'local' })
  redirect(MENTOR_PORTAL)
}
