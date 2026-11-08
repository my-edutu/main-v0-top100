import { parseTalentDraft, publicationRequirements } from './contracts'
import type { TalentDraft, TalentRecord } from './types'

export type DraftField = keyof TalentDraft
export const DRAFT_FIELD_LABELS: Record<DraftField, string> = {
  headline: 'Professional headline', summary: 'Introduction', sector: 'Sector', country: 'Country', city: 'City',
  skills: 'Skills', languages: 'Languages', interests: 'Opportunity interests', workMode: 'Work preference',
  availability: 'Availability', experience: 'Experience', projects: 'Selected work', education: 'Education',
  portfolioUrl: 'Portfolio link', linkedinUrl: 'LinkedIn link',
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const fields = Object.keys(DRAFT_FIELD_LABELS) as DraftField[]

/** A slow save acknowledges the submitted snapshot, not edits typed afterwards. */
export function reconcileSavedDraft(current: TalentDraft, sent: TalentDraft, saved: TalentDraft): TalentDraft {
  return Object.fromEntries(fields.map(key => [key, same(current[key], sent[key]) ? saved[key] : current[key]])) as TalentDraft
}

/** Only overlapping edits require a choice. Never silently replace remote work. */
export function planDraftMerge(base: TalentDraft, local: TalentDraft, remote: TalentDraft): { merged: TalentDraft; conflicts: DraftField[] } {
  const conflicts: DraftField[] = []
  const merged = Object.fromEntries(fields.map(key => {
    if (same(local[key], base[key])) return [key, remote[key]]
    if (!same(remote[key], base[key]) && !same(local[key], remote[key])) conflicts.push(key)
    return [key, local[key]]
  })) as TalentDraft
  return { merged, conflicts }
}

/** Draft and privacy revisions are independent: out-of-order responses cannot
 * undo either. Review-only changes to the same draft use the database timestamp. */
export function mergeTalentRecords(current: TalentRecord, incoming: TalentRecord): TalentRecord {
  if (current.profile_id !== incoming.profile_id) return incoming
  const takeDraft = incoming.revision > current.revision || (incoming.revision === current.revision && incoming.updated_at >= current.updated_at)
  const takePrivacy = incoming.visibility_revision > current.visibility_revision || (incoming.visibility_revision === current.visibility_revision && incoming.updated_at >= current.updated_at)
  const draft = takeDraft ? incoming : current
  const privacy = takePrivacy ? incoming : current
  return {
    ...current, ...draft,
    visibility_revision: privacy.visibility_revision,
    discovery_enabled: privacy.discovery_enabled,
    introductions_enabled: privacy.introductions_enabled,
    promotion_enabled: privacy.promotion_enabled,
    outreach_email_opt_out: privacy.outreach_email_opt_out,
    consent_version: privacy.consent_version,
    updated_at: current.updated_at > incoming.updated_at ? current.updated_at : incoming.updated_at,
  }
}

export function parseCommaItems(value: string): string[] {
  const seen = new Set<string>()
  return value.split(',').map(item => item.trim()).filter(item => {
    const key = item.toLocaleLowerCase('en')
    if (!item || seen.has(key)) return false
    seen.add(key); return true
  })
}

export function profileChecklist(draft: TalentDraft) {
  return publicationRequirements(draft).map(item => ({ label: item.label, done: item.complete, step: item.step, field: item.field }))
}

/** Canonical saves trim text/deduplicate tags. Treat those harmless differences
 * as saved without stripping a trailing space from a member who is still typing. */
export function draftsEquivalent(a: TalentDraft, b: TalentDraft): boolean {
  try { return same(parseTalentDraft(a, 'draft'), parseTalentDraft(b, 'draft')) }
  catch { return same(a, b) }
}
