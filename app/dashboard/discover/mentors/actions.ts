'use server'

import { revalidatePath } from 'next/cache'
import { MEMBER_MENTORS, MentorInputError, mentorId, mentorText } from '@/lib/mentors/contracts'
import { approvedMentorMember, type MentorFormState, mentorFormError } from '@/lib/mentors/server'

export async function updateMemberMentorship(_: MentorFormState, form: FormData): Promise<MentorFormState> {
  try {
    const { db, user } = await approvedMentorMember()
    const intent = form.get('intent')
    if (intent === 'request') {
      const { error } = await db.rpc('impact_request_mentor_match', {
        p_member: user.id,
        p_mentor: mentorId(form, 'mentorId'),
        p_goal: mentorText(form, 'goal', 'Your goal', 10, 1000),
      })
      if (error) throw error
      revalidatePath(MEMBER_MENTORS)
      return { success: 'Your request was sent to the mentor.' }
    }
    if (intent === 'book') {
      const { error } = await db.rpc('impact_book_mentor_slot', {
        p_member: user.id,
        p_match: mentorId(form, 'matchId'),
        p_slot: mentorId(form, 'slotId'),
      })
      if (error) throw error
      revalidatePath(MEMBER_MENTORS)
      return { success: 'Your session is booked. Open My matches to see the meeting link.' }
    }
    throw new MentorInputError('Choose a valid action.')
  } catch (error) { return mentorFormError(error) }
}
