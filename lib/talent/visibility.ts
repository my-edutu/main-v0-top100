import { TALENT_POLICY_VERSION, TalentInputError } from './contracts'
import type { TalentRecord, TalentVisibilityInput } from './types'

export type TalentVisibilitySnapshot = Pick<TalentRecord,
  'discovery_enabled' | 'introductions_enabled' | 'promotion_enabled' |
  'outreach_email_opt_out' | 'consent_version'>

const BOOLEAN_KEYS = ['discovery_enabled', 'introductions_enabled', 'promotion_enabled', 'outreach_email_opt_out'] as const
const SNAPSHOT_KEYS = [...BOOLEAN_KEYS, 'consent_version'] as const

/** Snapshot the last confirmed state, never the currently edited checkboxes. */
export function visibilitySnapshot(record: TalentVisibilitySnapshot): TalentVisibilitySnapshot {
  return {
    discovery_enabled: record.discovery_enabled,
    introductions_enabled: record.introductions_enabled,
    promotion_enabled: record.promotion_enabled,
    outreach_email_opt_out: record.outreach_email_opt_out,
    consent_version: record.consent_version,
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
  return visibilitySnapshot(record as TalentVisibilitySnapshot)
}
