import { sendTransactionalEmail } from '@/lib/email/send'
import type { createAdminClient } from '@/lib/supabase/server'
import { filterOutreachAudience, type OutreachFilter } from './outreach'
import { templateEligible, type OutreachTemplate } from './outreach-templates'
import { loadOutreachAudience, outreachLinks, renderOutreach } from './outreach-server'

type Db = ReturnType<typeof createAdminClient>
type Job = { id: string; campaign_id: string; awardee_id: string; email: string; lease_token: string }
export async function processOutreachJobs(db: Db, deps: { load?: typeof loadOutreachAudience; send?: typeof sendTransactionalEmail } = {}) {
  const { data, error } = await db.rpc('claim_award_outreach', { p_limit: 3 })
  if (error) throw new Error('Could not claim outreach jobs.')
  const jobs = (data ?? []) as Job[]
  const counts = { claimed: jobs.length, sent: 0, skipped: 0, deliveryUnknown: 0, failed: 0 }
  for (const job of jobs) {
    let startedSend = false
    const finish = async (status: string, outcome: string) => {
      const result = await db.from('award_outreach_recipients').update({ status, outcome, ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}) }).eq('id', job.id).eq('lease_token', job.lease_token).eq('status', 'processing')
      if (result.error) throw new Error('Could not record outreach delivery status.')
    }
    try {
      const { data: campaign, error: campaignError } = await db.from('award_outreach_campaigns').select('*').eq('id', job.campaign_id).maybeSingle()
      if (campaignError || !campaign) throw new Error('Could not load campaign.')
      if (campaign.cancelled_at) { await finish('skipped', 'Campaign cancelled.'); counts.skipped++; continue }
      // Fresh payment and suppression truth for each recipient, rather than a stale campaign snapshot.
      const audience = await (deps.load ?? loadOutreachAudience)(db)
      if (!audience.setup) throw new Error('Outreach tracking is unavailable.')
      const member = audience.members.find(m => m.awardeeIds.includes(job.awardee_id))
      const contact = audience.contacts.find(c => c.awardee_id === job.awardee_id)
      const recent = member?.lastContactedAt && Date.parse(member.lastContactedAt) > Date.now() - 3 * 86400000
      if (!member || !member.name.trim() || member.name.trim() === 'Awardee' || member.email !== job.email || !contact?.token || recent || !templateEligible(member, campaign.template as OutreachTemplate) ||
        !filterOutreachAudience([member], campaign.audience_filter as OutreachFilter).length) {
        await finish('skipped', recent ? 'Contacted within the last three days.' : 'Payment, contact or audience eligibility changed.'); counts.skipped++; continue
      }
      const message = renderOutreach({ subject: campaign.subject, body: campaign.body }, member, contact.token)
      const stamp = new Date().toISOString()
      const { error: stampError } = await db.from('award_outreach_contacts').update({
        last_contacted_at: stamp, tracking_started_at: contact.tracking_started_at ?? stamp,
        next_follow_up_at: campaign.template === 'final' || campaign.template === 'paid' ? null : new Date(Date.now() + (campaign.template === 'follow_up' ? 4 : 3) * 86400000).toISOString(),
      }).eq('awardee_id', job.awardee_id)
      if (stampError) throw new Error('Could not record contact attempt.')
      // Loading a large audience can outlive a claim. Fence the actual SMTP
      // call with the same token and an unexpired lease, then extend it.
      const lease = await db.from('award_outreach_recipients').update({ lease_until: new Date(Date.now() + 5 * 60000).toISOString() })
        .eq('id', job.id).eq('lease_token', job.lease_token).eq('status', 'processing')
        .gt('lease_until', new Date().toISOString()).select('id').maybeSingle()
      if (lease.error) throw new Error('Could not verify email worker ownership.')
      if (!lease.data) { counts.skipped++; continue }
      startedSend = true
      const result = await (deps.send ?? sendTransactionalEmail)({ to: job.email, toName: member.name, ...message,
        idempotencyKey: `award-outreach/${job.campaign_id}/${job.id}`,
        ...(process.env.AWARD_OUTREACH_SMTP_HOST
          ? { awardOutreach: { unsubscribeUrl: outreachLinks(member, contact.token).stopUrl.replace('/award-outreach/stop/', '/api/award-outreach/') + '/stop' } }
          : { requireBrevoSmtp: true }) })
      if (!result.ok) {
        if (result.delivery === 'not_sent') {
          await finish('failed', 'SMTP explicitly rejected the message before acceptance. No automatic retry.'); counts.failed++; continue
        }
        await finish('delivery_unknown', 'SMTP did not confirm acceptance. Check provider delivery before resending.'); counts.deliveryUnknown++; continue
      }
      await finish('sent', 'SMTP accepted this message.'); counts.sent++
    } catch {
      // A possible SMTP acceptance or lost finalization is never retried automatically.
      try { await finish(startedSend ? 'delivery_unknown' : 'failed', startedSend ? 'Delivery outcome uncertain. Check the provider before resending.' : 'Preparation failed; no email was attempted.') } catch { /* Lease expiry holds the job for review. */ }
      if (startedSend) counts.deliveryUnknown++; else counts.failed++
    }
  }
  return counts
}
