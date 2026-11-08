import type { NextRequest } from 'next/server'
import { onlyFields, requireTalentMember, readTalentBody, revision, assertSameOrigin, talentError, talentJson, talentRateLimit } from '@/lib/talent/api'
import { TALENT_POLICY_VERSION, TalentInputError, parseTalentDraft, parseTalentVisibility, profileCompleteness, publicationBlockedReason } from '@/lib/talent/contracts'
import { initialTalentRecord, mapTalentRecord } from '@/lib/talent/profile-service'
import { parseVisibilityExpectation } from '@/lib/talent/visibility'
import type { TalentRecord } from '@/lib/talent/types'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const rate = await talentRateLimit(request, 'QUERY', 'member'); if (rate) return rate
    const { db, user, profile, awardee } = await requireTalentMember(request)
    const result = await db.from('talent_profiles').select('*').eq('profile_id', user.id).maybeSingle()
    if (result.error) throw result.error
    const talent = result.data ? mapTalentRecord(result.data as TalentRecord) : initialTalentRecord(user.id, { headline: profile.headline || awardee.headline, bio: profile.bio || awardee.bio })
    return talentJson({ talent, name: profile.full_name || awardee.name, slug: profile.slug || awardee.slug, completeness: profileCompleteness(talent.draft), policyVersion: TALENT_POLICY_VERSION })
  } catch (error) { return talentError(error) }
}
export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request)
    const rate = await talentRateLimit(request, 'QUERY', 'save'); if (rate) return rate
    const { db, user } = await requireTalentMember(request)
    const body = await readTalentBody(request)
    let result
    if (body.action === 'visibility') {
      onlyFields(body, ['action', 'visibility', 'expectedVisibility'])
      const v = parseTalentVisibility(body.visibility)
      const expected = parseVisibilityExpectation(body.expectedVisibility)
      result = await db.rpc('talent_set_visibility_checked', { p_actor: user.id, p_expected: expected, p_choices: v, p_withdraw: false })
    } else if (body.action === 'withdraw_visibility') {
      onlyFields(body, ['action'])
      result = await db.rpc('talent_set_visibility_checked', { p_actor: user.id, p_expected: null, p_choices: null, p_withdraw: true })
    } else if (body.action === 'save' || body.action === 'submit') {
      onlyFields(body, ['action', 'expectedRevision', 'draft'])
      const draft = parseTalentDraft(body.draft)
      const blocked = body.action === 'submit' ? publicationBlockedReason(draft) : null
      if (blocked) throw new TalentInputError(blocked)
      result = await db.rpc('talent_save_draft', { p_actor: user.id, p_expected_revision: revision(body.expectedRevision), p_draft: draft, p_submit: body.action === 'submit' })
    } else throw new TalentInputError('Choose a valid profile action.')
    if (result.error) throw result.error
    return talentJson({ talent: mapTalentRecord(result.data as TalentRecord) })
  } catch (error) { return talentError(error) }
}
