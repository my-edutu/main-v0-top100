import { TALENT_POLICY_VERSION, TalentInputError } from './contracts'
import type { TalentRecord, TalentVisibilityInput } from './types'

export type TalentVisibilitySnapshot = Pick<TalentRecord,
  'discovery_enabled' | 'introductions_enabled' | 'promotion_enabled' |
  'outreach_email_opt_out' | 'consent_version' | 'visibility_revision'>

const BOOLEAN_KEYS = ['discovery_enabled', 'introductions_enabled', 'promotion_enabled', 'outreach_email_opt_out'] as const
const SNAPSHOT_KEYS = [...BOOLEAN_KEYS, 'consent_version', 'visibility_revision'] as const

/** Snapshot the last confirmed state, never the currently edited checkboxes.
 * Include the monotonic revision: off -> on -> off is not the same permission
 * decision as the first off state, even though the booleans happen to match. */
export function visibilitySnapshot(record: TalentVisibilitySnapshot): TalentVisibilitySnapshot {
  return {
    discovery_enabled: record.discovery_enabled,
    introductions_enabled: record.introductions_enabled,
    promotion_enabled: record.promotion_enabled,
    outreach_email_opt_out: record.outreach_email_opt_out,
    consent_version: record.consent_version,
    visibility_revision: record.visibility_revision,
  }
}

export function visibilityChoices(record: TalentVisibilitySnapshot): TalentVisibilityInput {
  return {
    discoveryEnabled: record.discovery_enabled,
    introductionsEnabled: record.introductions_enabled,
    promotionEnabled: record.promotion_enabled,
    outreachEmailOptOut: record.outreach_email_opt_out,
    policyVersion: TALENT_POLICY_VERSION,
  }
}

export function parseVisibilityExpectation(value: unknown): TalentVisibilitySnapshot {
  const message = 'Reload your saved privacy choices before changing them.'
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TalentInputError(message)
  const record = value as Record<string, unknown>
  if (Object.keys(record).length !== SNAPSHOT_KEYS.length || Object.keys(record).some(key => !(SNAPSHOT_KEYS as readonly string[]).includes(key))) throw new TalentInputError(message)
  if (BOOLEAN_KEYS.some(key => typeof record[key] !== 'boolean')) throw new TalentInputError(message)
  if (record.consent_version !== null && (typeof record.consent_version !== 'string' || record.consent_version.length > 100)) throw new TalentInputError(message)
  if (!Number.isSafeInteger(record.visibility_revision) || Number(record.visibility_revision) < 0) throw new TalentInputError(message)
  return visibilitySnapshot(record as TalentVisibilitySnapshot)
}

export function talentVisibilityStatus(profile: Pick<TalentRecord, 'discovery_enabled' | 'published'>) {
  if (!profile.discovery_enabled) return 'Hidden from Talent Discovery'
  return profile.published ? 'Public in Talent Discovery' : 'Hidden until approved'
}
