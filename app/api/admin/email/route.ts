import { emailSecret } from '@/lib/admin-email/secrets'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { ensureOutreachContacts, loadOutreachAudience, outreachLinks } from '@/lib/awards/outreach-server'
import { OUTREACH_SEGMENTS } from '@/lib/awards/outreach'
import { OUTREACH_TEMPLATES, validateOutreachDraft, type OutreachTemplate } from '@/lib/awards/outreach-templates'
import { renderAdminEmail } from '@/lib/admin-email/render-server'
import { selectEmailAudience } from '@/lib/admin-email/audience'
import { provisionCampaign } from '@/lib/admin-email/provision'
import * as listmonk from '@/lib/admin-email/listmonk'
import { sendTransactionalEmail } from '@/lib/email/send'

export const runtime = 'nodejs'
const segment = z.enum(Object.keys(OUTREACH_SEGMENTS) as [keyof typeof OUTREACH_SEGMENTS, ...Array<keyof typeof OUTREACH_SEGMENTS>])
const template = z.enum(['general', ...(Object.keys(OUTREACH_TEMPLATES) as OutreachTemplate[])] as ['general', ...OutreachTemplate[]])
const scheduleSchema = z.object({ action: z.literal('schedule'), requestId: z.string().uuid(), audienceKey: z.string().length(64), confirmed: z.literal(true),
  filter: z.object({ year: z.string().regex(/^(all|20\d{2})$/), segment, search: z.string().max(200).default('') }).strict(),
  template, limit: z.number().int().min(1).max(500), draft: z.object({ subject: z.string().min(1).max(160), body: z.string().min(1).max(6000) }).strict(),
  sendAt: z.string().datetime(),
}).strict()
const previewSchema = z.object({ action: z.literal('preview'), filter: z.object({ year: z.string().regex(/^(all|20\d{2})$/), segment, search: z.string().max(200).default('') }).strict(), template, limit: z.number().int().min(1).max(500), draft: z.object({ subject: z.string().min(1).max(160), body: z.string().min(1).max(6000) }).strict() }).strict()
const inputSchema = z.discriminatedUnion('action', [scheduleSchema, previewSchema, z.object({ action: z.literal('cancel'), campaignId: z.string().uuid() }).strict(), z.object({ action: z.literal('test'), awardeeId: z.string().uuid(), template, draft: z.object({ subject: z.string().min(1).max(160), body: z.string().min(1).max(6000) }).strict() }).strict()])
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request); if ('error' in admin) return admin.error
  try {
    const db = createAdminClient()
    const campaignId = request.nextUrl.searchParams.get('id')
    if (campaignId) {
      if (!z.string().uuid().safeParse(campaignId).success) return json({ message: 'Invalid campaign.' }, 400)
      const campaign = await db.from('top100_email_campaigns').select('id,subject,body,status,scheduled_at,created_at,audience_filter').eq('id', campaignId).maybeSingle()
      if (campaign.error) throw new Error('Campaign unavailable')
      if (!campaign.data) return json({ message: 'Campaign not found.' }, 404)
      const recipients = await db.from('top100_email_recipients').select('name,email,status,outcome,updated_at').eq('campaign_id', campaignId).order('name').limit(500)
      if (recipients.error) throw new Error('Recipients unavailable')
      return json({ campaign: campaign.data, recipients: recipients.data ?? [] })
    }
    const result = await db.from('top100_email_campaigns').select('id,subject,status,scheduled_at,created_at,top100_email_recipients(status)').order('created_at', { ascending: false }).limit(50)
    if (result.error) throw new Error('History unavailable')
    const campaigns = (result.data ?? []).map(row => {
      const recipients = Array.isArray(row.top100_email_recipients) ? row.top100_email_recipients : []
      const counts = recipients.reduce<Record<string, number>>((out, item) => { const status = String(item.status); out[status] = (out[status] ?? 0) + 1; return out }, {})
      const unfinished = (counts.pending ?? 0) + (counts.sending ?? 0)
      const status = row.status === 'scheduled' && recipients.length > 0 && unfinished === 0 ? 'completed' : row.status
      return { id: row.id, subject: row.subject, status, scheduledAt: row.scheduled_at, createdAt: row.created_at, total: recipients.length, counts }
    })
    return json({ campaigns })
  } catch { return json({ message: 'Email history is temporarily unavailable.' }, 503) }
}
export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request); if (crossOrigin) return crossOrigin
  const admin = await requireAdmin(request); if ('error' in admin) return admin.error
  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ message: 'Check the campaign and schedule, then preview again.' }, 400)
  const input = parsed.data
  if (input.action === 'cancel') {
    try {
      const db = createAdminClient()
      const result = await db.from('top100_email_campaigns').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', input.campaignId).in('status', ['creating', 'armed', 'scheduled', 'running']).select('listmonk_id').maybeSingle()
      if (result.error || !result.data) return json({ message: 'Campaign could not be cancelled; refresh its status.' }, 409)
      if (result.data.listmonk_id) {
        try { await listmonk.updateCampaignStatus(result.data.listmonk_id, 'cancelled') }
        catch { return json({ message: 'Top100 stopped new deliveries; the campaign service still needs a status refresh.' }) }
      }
      return json({ message: 'Campaign cancelled. A message already being processed may still arrive.' })
    } catch { return json({ message: 'Could not cancel the campaign.' }, 503) }
  }
  try { validateOutreachDraft(input.draft) } catch (error) { return json({ message: (error as Error).message }, 400) }
  if (input.action === 'preview') {
    try {
      const audience = await loadOutreachAudience(createAdminClient())
      if (!audience.setup) return json({ message: 'Recipient preferences are unavailable.' }, 503)
      const result = selectEmailAudience(audience.members, input.filter, input.template, input.limit)
      const sample = result.selected[0]
      return json({ count: result.selected.length, matched: result.matched, eligible: result.eligible, audienceKey: result.audienceKey,
        preview: sample ? renderAdminEmail(input.draft, sample, '00000000-0000-4000-8000-000000000000', input.template) : null })
    } catch { return json({ message: 'Could not preview this audience.' }, 503) }
  }
  if (input.action === 'test') {
    try {
      const db = createAdminClient()
      let audience = await loadOutreachAudience(db)
      const member = audience.members.find(m => m.id === input.awardeeId)
      if (!audience.setup || !member || member.suppressed || member.deliveryHeld || !member.emailable || !member.name.trim() || member.name.trim() === 'Awardee') return json({ message: 'Choose an eligible awardee with a name and email who has not unsubscribed.' }, 409)
      const throttle = await checkRateLimit({ identifier: `admin-email-test:${admin.user.id}`, maxRequests: 5, windowSeconds: 3600 })
      if (!throttle.success) return createRateLimitResponse(throttle, 'Please wait before sending another test.')
      await ensureOutreachContacts(db, [member.id])
      audience = await loadOutreachAudience(db)
      const refreshed = audience.members.find(m => m.id === member.id)
      const contact = audience.contacts.find(c => c.awardee_id === member.id)
      if (!refreshed || refreshed.suppressed || refreshed.email !== member.email || !contact?.token) return json({ message: 'Recipient preferences changed; no email was sent.' }, 409)
      const message = renderAdminEmail(input.draft, refreshed, contact.token, input.template)
      const stop = outreachLinks(refreshed, contact.token).stopUrl.replace('/award-outreach/stop/', '/api/award-outreach/') + '/stop'
      const result = await sendTransactionalEmail({ to: refreshed.email, toName: refreshed.name, ...message, awardOutreach: { unsubscribeUrl: stop } })
      if (!result.ok) return json({ message: result.delivery === 'not_sent' ? 'SMTP rejected the test email.' : 'The test result is uncertain. Check the inbox before trying again.' }, 503)
      return json({ message: 'SMTP accepted the test email. Check the inbox for delivery.' })
    } catch { return json({ message: 'The test email could not be prepared or its outcome is uncertain. Check the inbox before retrying.' }, 503) }
  }
  const when = Date.parse(input.sendAt), now = Date.now()
  if (when < now + 5 * 60_000 || when > now + 366 * 86_400_000) return json({ message: 'Choose a time at least five minutes from now and within one year.' }, 400)
  const templateId = Number(process.env.LISTMONK_TEMPLATE_ID)
  if (!Number.isInteger(templateId) || templateId < 1 || !process.env.LISTMONK_URL || !process.env.LISTMONK_API_USER || !emailSecret('LISTMONK_API_TOKEN') || !process.env.LISTMONK_GATEWAY_USER || !emailSecret('LISTMONK_GATEWAY_PASSWORD') || !process.env.AWARD_OUTREACH_SMTP_HOST || !process.env.AWARD_OUTREACH_SMTP_USER || !process.env.AWARD_OUTREACH_SMTP_PASSWORD)
    return json({ message: 'Email scheduling is not configured yet.' }, 503)
  try {
    const throttle = await checkRateLimit({ identifier: `admin-email:${admin.user.id}`, maxRequests: 10, windowSeconds: 3600 })
    if (!throttle.success) return createRateLimitResponse(throttle, 'Please wait before scheduling another campaign.')
    const db = createAdminClient()
    const audience = await loadOutreachAudience(db)
    if (!audience.setup) return json({ message: 'Recipient preferences are unavailable.' }, 503)
    const { selected, audienceKey } = selectEmailAudience(audience.members, input.filter, input.template, input.limit)
    if (!selected.length || audienceKey !== input.audienceKey) return json({ message: 'The audience changed. Preview the current recipients again.' }, 409)
    await ensureOutreachContacts(db, selected.map(m => m.id))
    const remoteSubscribers = await listmonk.listSubscribers()
    const byEmail = new Map<string, (typeof remoteSubscribers)[number]>()
    for (const subscriber of remoteSubscribers) {
      const email = subscriber.email.trim().toLowerCase()
      if (byEmail.has(email)) throw new Error('Duplicate subscription state')
      byEmail.set(email, subscriber)
    }
    const inserted = await db.from('top100_email_campaigns').insert({ id: input.requestId, created_by: admin.user.id, subject: input.draft.subject, body: input.draft.body,
      audience_filter: input.filter, template: input.template, status: 'creating', scheduled_at: input.sendAt }).select('id').maybeSingle()
    if (inserted.error || !inserted.data) return json({ message: 'This request was already started or could not be saved. Check campaign history before trying again.' }, 409)
    const result = await provisionCampaign({ id: input.requestId, subject: input.draft.subject, sendAt: input.sendAt, templateId,
      members: selected.map(m => ({ id: m.id, email: m.email, name: m.name })) }, {
      createList: listmonk.createList, findSubscriber: async email => byEmail.get(email) ?? null, createSubscriber: listmonk.createSubscriber, addToList: listmonk.addToList,
      async suppressMember(id) { const result = await db.from('award_outreach_contacts').update({ suppressed: true, next_follow_up_at: null, updated_at: new Date().toISOString() }).eq('awardee_id', id); if (result.error) throw new Error('Could not preserve preference') },
      async saveRecipients(id, recipients) { const result = await db.from('top100_email_recipients').insert(recipients.map(r => ({ ...r, campaign_id: id }))); if (result.error) throw new Error('Could not save recipients') },
      createCampaign: listmonk.createCampaign,
      async markArmed(id, remoteId, remoteUuid) { const result = await db.from('top100_email_campaigns').update({ status: 'armed', listmonk_id: remoteId, listmonk_uuid: remoteUuid, updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'creating').select('id').maybeSingle(); if (result.error || !result.data) throw new Error('Could not prepare campaign') },
      async markScheduled(id) { const result = await db.from('top100_email_campaigns').update({ status: 'scheduled', updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'armed').select('id').maybeSingle(); if (result.error || !result.data) throw new Error('Could not enable campaign') },
      schedule: id => listmonk.updateCampaignStatus(id, 'scheduled'),
      async markFailed(id) { const result = await db.from('top100_email_campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', id).in('status', ['creating', 'armed', 'scheduled']); if (result.error) throw new Error('Could not hold campaign') },
      now: Date.now,
    })
    return json({ message: 'Campaign scheduled.', campaignId: input.requestId, ...result })
  } catch { return json({ message: 'Campaign preparation did not complete. Check history before trying again; unconfirmed sends are held for review.' }, 503) }
}
