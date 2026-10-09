import { createHash } from 'node:crypto'
import { PARTICIPANT_HANDBOOK } from '@/lib/handbook/participant-handbook'

export const PARTICIPANT_HANDBOOK_CAMPAIGN_ID = 'afl-2026-participant-handbook'

export function handbookAudienceFingerprint(ids: string[]): string {
  return createHash('sha256').update([...ids].sort().join('\n')).digest('hex')
}

type HandbookProfile = {
  id: string
  role?: unknown
}

export function resolveHandbookAudience(profiles: HandbookProfile[]): string[] {
  return profiles.filter((profile) => profile.role === 'user').map((profile) => profile.id)
}

export function isParticipantHandbookPath(value: unknown): value is typeof PARTICIPANT_HANDBOOK.path {
  return value === PARTICIPANT_HANDBOOK.path
}
