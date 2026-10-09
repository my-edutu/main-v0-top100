import { createHash } from 'node:crypto'
import { PARTICIPANT_HANDBOOK } from '@/lib/handbook/participant-handbook'

export const PARTICIPANT_HANDBOOK_CAMPAIGN_ID = 'afl-2026-participant-handbook'

export function handbookAudienceFingerprint(ids: string[]): string {
  return createHash('sha256').update([...ids].sort().join('\n')).digest('hex')
}

type HandbookProfile = {
  id: string
  role?: unknown
  membership_status?: unknown
  cohort?: unknown
}

type LinkedAwardee = {
  profile_id: string
  year?: unknown
}

export function resolveHandbookAudience(profiles: HandbookProfile[], awardees: LinkedAwardee[]): string[] {
  const awardsByProfile = new Map<string, LinkedAwardee[]>()
  for (const awardee of awardees) {
    const linked = awardsByProfile.get(awardee.profile_id) ?? []
    linked.push(awardee)
    awardsByProfile.set(awardee.profile_id, linked)
  }

  return profiles.filter((profile) => {
    if (profile.role !== 'user' || profile.membership_status !== 'approved') return false
    if (typeof profile.cohort !== 'string' || profile.cohort.trim() !== String(PARTICIPANT_HANDBOOK.year)) return false
    const linked = awardsByProfile.get(profile.id) ?? []
    return linked.length === 1 && linked[0].year === PARTICIPANT_HANDBOOK.year
  }).map((profile) => profile.id)
}

export function isParticipantHandbookPath(value: unknown): value is typeof PARTICIPANT_HANDBOOK.path {
  return value === PARTICIPANT_HANDBOOK.path
}
