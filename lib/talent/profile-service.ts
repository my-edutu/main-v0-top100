import { emptyTalentDraft, parseTalentDraft } from './contracts'
import type { TalentRecord } from './types'

type Prefill = { headline?: unknown; bio?: unknown; location?: unknown }
export function initialTalentRecord(profileId: string, prefill: Prefill = {}): TalentRecord {
  const draft = emptyTalentDraft()
  draft.headline = typeof prefill.headline === 'string' ? prefill.headline.slice(0, 160) : ''
  draft.summary = typeof prefill.bio === 'string' ? prefill.bio.replace(/<[^>]*>/g, '').slice(0, 1600) : ''
  return { profile_id: profileId, draft, published: null, revision: 0, published_revision: null, publication_status: 'draft', discovery_enabled: false, introductions_enabled: false, promotion_enabled: false, outreach_email_opt_out: false, consent_version: null, review_note: null, created_at: '', updated_at: '' }
}
export function mapTalentRecord(row: TalentRecord): TalentRecord {
  return { ...row, draft: parseTalentDraft({ ...emptyTalentDraft(), ...row.draft }) }
}
