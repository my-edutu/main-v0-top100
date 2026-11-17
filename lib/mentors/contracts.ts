export const MENTOR_PORTAL = '/impact-africa/mentors'
export const MEMBER_MENTORS = '/dashboard/discover/mentors'

export function memberMentorshipOpen() {
  return process.env.IMPACT_AFRICA_MEMBER_MENTORSHIP_ENABLED === 'true'
}

export class MentorInputError extends Error {}

export function mentorText(form: FormData, key: string, label: string, min: number, max: number) {
  const value = form.get(key)
  const text = typeof value === 'string' ? value.trim() : ''
  if (text.length < min || text.length > max) {
    throw new MentorInputError(`${label} must be ${min}–${max} characters.`)
  }
  return text
}

export function mentorId(form: FormData, key: string) {
  const id = form.get(key)
  if (typeof id !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) {
    throw new MentorInputError('This item has changed. Refresh the page and try again.')
  }
  return id
}

export function readMentorProfile(form: FormData) {
  return {
    name: mentorText(form, 'name', 'Name', 2, 100),
    headline: mentorText(form, 'headline', 'Role or headline', 2, 120),
    bio: mentorText(form, 'bio', 'About you', 10, 1200),
    expertise: mentorText(form, 'expertise', 'Mentoring topics', 2, 240),
    accepting_requests: form.get('acceptingRequests') === 'on',
  }
}

export function readMentorSlot(form: FormData, now = Date.now()) {
  const startsAt = form.get('startsAt')
  const starts = typeof startsAt === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:00\.000Z$/.test(startsAt)
    ? Date.parse(startsAt) : NaN
  if (!Number.isFinite(starts) || starts <= now) throw new MentorInputError('Choose a future date and time.')
  const meeting = mentorText(form, 'meetingUrl', 'Meeting link', 8, 500)
  let url: URL
  try { url = new URL(meeting) } catch { throw new MentorInputError('Enter a valid HTTPS meeting link.') }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new MentorInputError('Enter a valid HTTPS meeting link.')
  }
  return { starts_at: new Date(starts).toISOString(), meeting_url: url.href }
}
