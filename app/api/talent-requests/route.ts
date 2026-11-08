import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertTalentEnabled, assertSameOrigin, readTalentBody, talentError, talentJson, talentRateLimit, id } from '@/lib/talent/api'
import { parseTalentRequest, TalentInputError } from '@/lib/talent/contracts'
export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    assertTalentEnabled(); assertSameOrigin(request)
    const rate = await talentRateLimit(request, 'CONTACT', 'request'); if (rate) return rate
    const key = id(request.headers.get('idempotency-key'), 'Submission reference')
    const input = parseTalentRequest(await readTalentBody(request))
    if (input.deadline && input.deadline < new Date().toISOString().slice(0, 10)) throw new TalentInputError('Choose a deadline that has not already passed.')
    const db = createAdminClient()
    const result = await db.from('talent_requests').insert({ idempotency_key: key, organisation: input.organisation, website: input.website, contact_name: input.contactName, contact_email: input.email, title: input.title, kind: input.kind, description: input.description, skills: input.skills, country: input.country, work_mode: input.workMode, places: input.places, compensation: input.compensation, deadline: input.deadline || null, talent_slug: input.talentSlug || null })
    // A duplicate is acknowledged without exposing the original private request.
    if (result.error && result.error.code !== '23505') throw result.error
    return talentJson({ received: true, message: 'Your brief has been received for review. Top100 will contact you using the details you supplied. No member information has been shared.' }, 202)
  } catch (error) { return talentError(error) }
}
