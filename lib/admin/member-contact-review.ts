export type ContactAwardee = { id: string; name: string; email: string | null; profile_id: string | null }
export type ContactProfile = { id: string; user_id: string | null; email: string | null }
export type ContactAttempt = { email: string; status: string; contact_day: string }
export type ContactReview = {
  id: string; name: string; email: string; activated: boolean
  eligible: boolean; reason: string
}

export function resolveContact(awardee: ContactAwardee, profile?: ContactProfile) {
  const activated = Boolean(profile?.user_id)
  return { id: awardee.id, name: awardee.name,
    email: String(activated ? profile?.email || awardee.email || '' : awardee.email || '').trim().toLowerCase(), activated }
}

export function reviewContacts(awardees: ContactAwardee[], profiles: ContactProfile[], attempts: ContactAttempt[], today: string): ContactReview[] {
  const linked = new Map(profiles.map(p => [p.id, p]))
  const seen = new Set<string>()
  return awardees.map(awardee => {
    const recipient = resolveContact(awardee, linked.get(awardee.profile_id ?? ''))
    let reason = ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) reason = 'Missing or invalid email'
    else if (attempts.some(a => a.email === recipient.email && ['sending', 'unknown'].includes(a.status))) reason = 'Earlier delivery needs review'
    else if (attempts.some(a => a.email === recipient.email && a.contact_day === today)) reason = 'Already attempted today'
    else if (seen.has(recipient.email)) reason = 'Duplicate email in this selection'
    seen.add(recipient.email)
    return { ...recipient, eligible: !reason, reason }
  })
}

export type ContactResult = { id: string; name: string; outcome: 'accepted' | 'not_sent' | 'unknown' | 'skipped'; message: string }
export function remainingContacts(recipients: ContactReview[], results: ContactResult[]) {
  const attempted = new Set(results.map(r => r.id))
  return recipients.filter(r => r.eligible && !attempted.has(r.id))
}
