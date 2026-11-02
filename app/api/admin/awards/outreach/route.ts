import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { OUTREACH_SEGMENTS, OUTREACH_REASONS, filterOutreachAudience, outreachCsv } from '@/lib/awards/outreach'
import { OUTREACH_TEMPLATES, defaultOutreachDraft, templateEligible, validateOutreachDraft, type OutreachTemplate } from '@/lib/awards/outreach-templates'
import { ensureOutreachContacts, loadOutreachAudience, outreachLinks, OUTREACH_SETUP_MESSAGE, renderOutreach } from '@/lib/awards/outreach-server'

export const runtime = 'nodejs'
const segment = z.enum(Object.keys(OUTREACH_SEGMENTS) as [keyof typeof OUTREACH_SEGMENTS, ...Array<keyof typeof OUTREACH_SEGMENTS>])
const template = z.enum(Object.keys(OUTREACH_TEMPLATES) as [OutreachTemplate, ...OutreachTemplate[]])
const filter = z.object({ year: z.string().refine(v => v === 'all' || /^20\d{2}$/.test(v) && Number(v) >= 2023), segment, search: z.string().max(200).default('') }).strict()
const draft = z.object({ subject: z.string().min(1).max(160), body: z.string().min(1).max(6000) }).strict()
const selection = { filter, template, limit: z.number().int().min(1).max(500).default(50) }
const postSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('preview'), ...selection, draft }).strict(),
  z.object({ action: z.literal('export'), ...selection, draft, format: z.enum(['csv', 'emails']).default('csv') }).strict(),
  z.object({ action: z.literal('save_template'), template, draft }).strict(),
  z.object({ action: z.literal('campaign'), ...selection, draft, requestId: z.string().uuid(), confirmed: z.literal(true), audienceKey: z.string().length(64) }).strict(),
  z.object({ action: z.literal('cancel'), campaignId: z.string().uuid() }).strict(),
  z.object({ action: z.literal('resolve_delivery'), recipientId: z.string().uuid(), outcome: z.enum(['accepted', 'not_sent']), reviewNote: z.string().trim().min(10).max(500), confirmed: z.literal(true) }).strict(),
])
const noteSchema = z.object({
  awardeeId: z.string().uuid(), owner: z.string().max(120), notes: z.string().max(3000),
  reason: z.enum(OUTREACH_REASONS), suppressed: z.boolean(),
  lastContactedAt: z.string().datetime().nullable(), nextFollowUpAt: z.string().datetime().nullable(),
}).strict()
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } })
const fail = (error: unknown) => {
  console.error('[award-outreach] operation failed', { message: error instanceof Error ? error.message : 'Unknown error' })
  return json({ message: 'Award outreach is unavailable. Verify the database migration and refresh before continuing.' }, 503)
}
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error
  try {
    const db = createAdminClient()
    const audience = await loadOutreachAudience(db)
    const saved = audience.setup ? await db.from('award_outreach_templates').select('key,subject,body') : null
    const campaigns = audience.setup ? await db.from('award_outreach_campaigns').select('id,template,created_at,cancelled_at,audience_filter').order('created_at', { ascending: false }).limit(10) : null
    if (saved?.error || campaigns?.error) throw new Error('Could not load outreach history.')
    const deliveryReviews = audience.setup ? await db.from('award_outreach_recipients').select('id,name,email,status,outcome').eq('status', 'delivery_unknown').order('id').limit(20) : null
    if (deliveryReviews?.error) throw new Error('Could not load outstanding delivery reviews.')
    const history = []
    for (const campaign of campaigns?.data ?? []) {
      const jobs: Array<{ awardee_id: string; status: string }> = []
      for (;;) {
        const { data, error } = await db.from('award_outreach_recipients').select('awardee_id,status,id').eq('campaign_id', campaign.id).order('id').range(jobs.length, jobs.length + 499)
        if (error) throw new Error('Could not load campaign results.')
        if (!data?.length) break
        jobs.push(...data)
      }
      const counts = jobs.reduce<Record<string, number>>((out, row) => ({ ...out, [row.status]: (out[row.status] ?? 0) + 1 }), {})
      const issues = await db.from('award_outreach_recipients').select('id,name,email,status,outcome').eq('campaign_id', campaign.id).eq('status', 'failed').order('id').limit(20)
      if (issues.error) throw new Error('Could not load delivery review details.')
      const paidIds = new Set(audience.members.filter(m => m.state === 'paid').flatMap(m => m.awardeeIds))
      history.push({ ...campaign, total: jobs.length, counts, issues: issues.data ?? [], paidAfterSend: campaign.template === 'paid' ? null : jobs.filter(j => j.status === 'sent' && paidIds.has(j.awardee_id)).length })
    }
    return json({ members: audience.members, setup: audience.setup, message: audience.setup ? null : OUTREACH_SETUP_MESSAGE,
      templates: Object.fromEntries(Object.keys(OUTREACH_TEMPLATES).map(key => [key, saved?.data?.find(t => t.key === key) ?? defaultOutreachDraft(key as OutreachTemplate)])), campaigns: history, deliveryReviews: deliveryReviews?.data ?? [] })
  } catch (error) { return fail(error) }
}
export async function PATCH(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request); if (crossOrigin) return crossOrigin
  const admin = await requireAdmin(request); if ('error' in admin) return admin.error
  const parsed = noteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ message: 'Choose a valid awardee and check the follow-up fields.' }, 400)
  try {
    const db = createAdminClient(), input = parsed.data
    const { members, setup } = await loadOutreachAudience(db)
    const member = members.find(m => m.awardeeIds.includes(input.awardeeId))
    if (!setup) return json({ message: OUTREACH_SETUP_MESSAGE }, 503)
    if (!member) return json({ message: 'Eligible awardee not found.' }, 404)
    const { error } = await db.from('award_outreach_contacts').upsert(member.awardeeIds.map(awardee_id => ({
      awardee_id, owner: input.owner.trim(), notes: input.notes.trim(), reason: input.reason,
      suppressed: input.suppressed || input.reason === 'not_interested', last_contacted_at: input.lastContactedAt,
      next_follow_up_at: input.nextFollowUpAt, updated_by: admin.user.id, updated_at: new Date().toISOString(),
    })), { onConflict: 'awardee_id' })
    if (error) throw new Error('Could not save outreach notes.')
    return json({ message: 'Follow-up saved.' })
  } catch (error) { return fail(error) }
}
export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request); if (crossOrigin) return crossOrigin
  const admin = await requireAdmin(request); if ('error' in admin) return admin.error
  const parsed = postSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ message: 'Choose a valid audience, template and action. Recipient lists and HTML are not accepted.' }, 400)
  const input = parsed.data
  if ('draft' in input) { try { validateOutreachDraft(input.draft) } catch (error) { return json({ message: (error as Error).message }, 400) } }
  try {
    const db = createAdminClient()
    if (input.action === 'resolve_delivery') {
      const { data, error } = await db.from('award_outreach_recipients').update({
        status: input.outcome === 'accepted' ? 'sent' : 'failed',
        ...(input.outcome === 'accepted' ? { sent_at: new Date().toISOString() } : {}),
        outcome: `Reviewed ${new Date().toISOString()} by ${admin.user.id}: ${input.reviewNote}`,
      }).eq('id', input.recipientId).eq('status', 'delivery_unknown').select('id').maybeSingle()
      if (error) throw new Error('Could not save the delivery review.')
      if (!data) return json({ message: 'This recipient is no longer awaiting delivery review. Refresh its campaign.' }, 409)
      return json({ message: 'Delivery review saved. No email was sent or automatically retried.' })
    }
    if (input.action === 'save_template') {
      const { error } = await db.from('award_outreach_templates').upsert({ key: input.template, ...input.draft, updated_by: admin.user.id, updated_at: new Date().toISOString() })
      if (error) throw new Error('Could not save template.')
      return json({ message: 'Reusable template saved.' })
    }
    if (input.action === 'cancel') {
      const { error } = await db.from('award_outreach_campaigns').update({ cancelled_at: new Date().toISOString() }).eq('id', input.campaignId)
      if (error) throw new Error('Could not cancel campaign.')
      const result = await db.from('award_outreach_recipients').update({ status: 'skipped', outcome: 'Campaign cancelled.' }).eq('campaign_id', input.campaignId).eq('status', 'pending')
      if (result.error) throw new Error('Campaign stopped but its pending results could not be updated. Refresh.')
      return json({ message: 'Campaign stopped. Messages already being processed may still arrive.' })
    }
    const audience = await loadOutreachAudience(db)
    const matched = filterOutreachAudience(audience.members, input.filter)
    const eligible = matched.filter(m => templateEligible(m, input.template))
    // Reach people not contacted yet before revisiting older conversations.
    const selected = [...eligible].sort((a, b) => (Date.parse(a.lastContactedAt ?? '') || 0) - (Date.parse(b.lastContactedAt ?? '') || 0)).slice(0, input.limit)
    const audienceKey = createHash('sha256').update(selected.map(m => `${m.id}:${m.email}`).sort().join('\n')).digest('hex')
    if (input.action === 'preview') {
      const sample = selected[0]
      return json({ count: selected.length, matched: matched.length, excluded: matched.length - eligible.length, eligible: eligible.length, audienceKey,
        preview: sample ? renderOutreach(input.draft, sample, '00000000-0000-4000-8000-000000000000') : null })
    }
    if (!audience.setup) return json({ message: OUTREACH_SETUP_MESSAGE }, 503)
    if (!selected.length) return json({ message: 'No contactable members match this audience and template.' }, 409)
    if (input.action === 'campaign') {
      if (input.audienceKey !== audienceKey) return json({ message: 'The audience changed. Preview the current recipients again before queuing.' }, 409)
      const limit = await checkRateLimit({ identifier: `award-outreach-campaign:${admin.user.id}`, maxRequests: 10, windowSeconds: 3600 })
      if (!limit.success) return createRateLimitResponse(limit, 'Please wait before starting another campaign.')
      const { data, error } = await db.rpc('queue_award_outreach', { p_id: input.requestId, p_admin: admin.user.id, p_template: input.template,
        p_subject: input.draft.subject, p_body: input.draft.body, p_filter: input.filter,
        p_members: selected.map(m => ({ awardee_id: m.id, email: m.email, name: m.name })) })
      if (error) throw new Error('Could not queue campaign.')
      return json({ message: 'Campaign queued. The outreach worker delivers messages in small batches.', campaignId: data, count: selected.length })
    }
    if (input.format === 'emails') {
      return new NextResponse(selected.map(m => m.email).join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="award-outreach-${input.filter.year}-${input.filter.segment}.txt"`, 'Cache-Control': 'private, no-store' } })
    }
    await ensureOutreachContacts(db, selected.map(m => m.id))
    const { contacts } = await loadOutreachAudience(db)
    const tokens = new Map(contacts.map(c => [c.awardee_id, c.token]))
    const stamp = new Date().toISOString()
    for (let offset = 0; offset < selected.length; offset += 50) {
      const { error } = await db.from('award_outreach_contacts').update({ tracking_started_at: stamp }).in('awardee_id', selected.slice(offset, offset + 50).map(m => m.id)).is('tracking_started_at', null)
      if (error) throw new Error('Could not record tracked export.')
    }
    const rows = selected.map(m => {
      const token = tokens.get(m.id)
      if (!token) throw new Error('Tracked link could not be prepared.')
      const message = renderOutreach(input.draft, m, token)
      return { Email: m.email, Name: m.name, Cohort: m.years.join(' / '), Phone: m.phone, Country: m.country,
        PaymentState: m.state, ProfileCreated: m.profileId ? 'Yes' : 'No', LinkVisit: m.visit, Owner: m.owner,
        Reason: m.reason, NextFollowUp: m.nextFollowUpAt ?? '', Subject: message.subject, Message: message.text, Html: message.html,
        ActionLink: outreachLinks(m, token).actionUrl, StopLink: outreachLinks(m, token).stopUrl }
    })
    return new NextResponse(outreachCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="award-outreach-${input.filter.year}-${input.filter.segment}.csv"`, 'Cache-Control': 'private, no-store' } })
  } catch (error) { return fail(error) }
}
