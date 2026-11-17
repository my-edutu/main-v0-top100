import { cache } from 'react'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { MentorInputError, memberMentorshipOpen } from './contracts'

export const mentorUser = cache(async () => {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  return user?.email_confirmed_at && !user.is_anonymous ? user : null
})

export async function mentorAwardeeAccess() {
  const user = await mentorUser()
  if (!user) return null
  const db = createAdminClient()
  // Older profile schemas have no account_status column.
  const { data, error } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) throw error
  if (data?.membership_status !== 'approved' || (data.account_status && data.account_status !== 'active')) {
    return null
  }
  const awardee = await db.from('awardees').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
  if (awardee.error) throw awardee.error
  return awardee.data ? { db, user } : null
}

export async function approvedMentorMember() {
  if (!memberMentorshipOpen()) throw new MentorInputError('Mentor matching is currently closed to members.')
  const access = await mentorAwardeeAccess()
  if (!access) throw new MentorInputError('You need an approved Top100 account with a linked awardee profile to use mentoring.')
  return access
}

export type MentorProfile = {
  id: string
  name: string
  headline: string
  bio: string
  expertise: string
  accepting_requests: boolean
}

export const mentorProfileFields = 'id,name,headline,bio,expertise,accepting_requests'

export async function ownMentorProfile(db: ReturnType<typeof createAdminClient>, userId: string) {
  const { data, error } = await db.from('impact_mentors').select(mentorProfileFields).eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}

export type MentorFormState = { error?: string; success?: string }

export function mentorFormError(error: unknown): MentorFormState {
  if (error instanceof MentorInputError) return { error: error.message }
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null
  if (code === '23505' || code === '23P01' || code === '23503') return { error: 'This item already exists or the time is taken. Refresh the page and try again.' }
  if (code === 'P0002' || code === '42501') return { error: 'This option is no longer available. Refresh the page and try again.' }
  console.error('[impact-mentors] Request failed', code)
  return { error: 'We could not save this right now. Please try again.' }
}
