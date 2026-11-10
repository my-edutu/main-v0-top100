import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from '@/lib/email/send'
import { loadOutreachAudience, outreachLinks } from '@/lib/awards/outreach-server'
import { filterOutreachAudience, OUTREACH_SEGMENTS, type OutreachFilter } from '@/lib/awards/outreach'
import { OUTREACH_TEMPLATES } from '@/lib/awards/outreach-templates'
import { awardCouponDigest } from '@/lib/awards/coupon-server'
import { renderAdminEmail } from './render-server'
import { deliveryDecision } from './policy'
import { emailTemplateEligible, type EmailTemplate } from './audience'
import type { GatewayClaim, GatewayDependencies, GatewayEvidence } from './gateway'

const filterSchema = z.object({ year: z.string().regex(/^(all|20\d{2})$/), segment: z.enum(Object.keys(OUTREACH_SEGMENTS) as [keyof typeof OUTREACH_SEGMENTS, ...Array<keyof typeof OUTREACH_SEGMENTS>]), search: z.string().max(200).optional() }).strict()
export function gatewayDependencies(): GatewayDependencies {
  const db = createAdminClient()
  return {
    async waitForSlot() {
      const result = await db.rpc('reserve_top100_email_slot')
      if (result.error || typeof result.data !== 'string') throw new Error('Sending rate unavailable')
      const delay = Date.parse(result.data) - Date.now()
      if (!Number.isFinite(delay) || delay > 40_000) throw new Error('Sending rate unavailable')
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay))
    },
    async claim(campaignUuid, subscriberUuid, email) {
      const campaign = await db.from('top100_email_campaigns').select('id').eq('listmonk_uuid', campaignUuid).maybeSingle()
      if (campaign.error) throw new Error('Could not load campaign')
      if (!campaign.data) return null
      const row = await db.from('top100_email_recipients').update({ status: 'sending', attempted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('campaign_id', campaign.data.id).eq('subscriber_uuid', subscriberUuid).eq('email', email).eq('status', 'pending').select('id').maybeSingle()
      if (row.error) throw new Error('Could not claim recipient')
      return row.data ? { recipientId: row.data.id } : null
    },
    async evidence(claim: GatewayClaim): Promise<GatewayEvidence> {
      const recipient = await db.from('top100_email_recipients').select('id,campaign_id,awardee_id,email,name').eq('id', claim.recipientId).eq('status', 'sending').maybeSingle()
      if (recipient.error || !recipient.data) throw new Error('Recipient record unavailable')
      const currentRecipient = recipient.data
      const campaign = await db.from('top100_email_campaigns').select('status,audience_filter,template,subject,body').eq('id', currentRecipient.campaign_id).maybeSingle()
      if (campaign.error || !campaign.data) throw new Error('Campaign record unavailable')
      const filter = filterSchema.safeParse(campaign.data.audience_filter)
      if (!filter.success || campaign.data.template !== 'general' && !Object.prototype.hasOwnProperty.call(OUTREACH_TEMPLATES, campaign.data.template)) throw new Error('Campaign policy unavailable')
      const audience = await loadOutreachAudience(db)
      if (!audience.setup) throw new Error('Suppression records unavailable')
      const member = audience.members.find(m => m.awardeeIds.includes(currentRecipient.awardee_id))
      const contact = audience.contacts.find(c => c.awardee_id === currentRecipient.awardee_id)
      const coupon = campaign.data.body.match(/\bAFL-[A-F0-9]{16}\b/i)?.[0]
      let couponAvailable: boolean | null = null
      if (coupon && member) {
        const result = await db.rpc('preview_award_coupon', { p_profile_id: member.profileId, p_code_digest: awardCouponDigest(coupon) })
        if (result.error || typeof result.data !== 'boolean') throw new Error('Coupon check unavailable')
        couponAvailable = result.data
      }
      let decision = deliveryDecision({ status: campaign.data.status, memberExists: Boolean(member && contact?.token), sameEmail: member?.email === currentRecipient.email,
        suppressed: member?.suppressed ?? true, audienceEligible: Boolean(member && emailTemplateEligible(member, campaign.data.template as EmailTemplate) && filterOutreachAudience([member], filter.data as OutreachFilter).length), couponPresent: Boolean(coupon), couponAvailable })
      if (decision === 'send') {
        const now = new Date(), cutoff = new Date(now.getTime() - 3 * 86400000).toISOString()
        const claimed = await db.from('award_outreach_contacts').update({ last_contacted_at: now.toISOString(), tracking_started_at: contact?.tracking_started_at ?? now.toISOString(), updated_at: now.toISOString() })
          .eq('awardee_id', currentRecipient.awardee_id).eq('suppressed', false).or(`last_contacted_at.is.null,last_contacted_at.lt.${cutoff}`).select('awardee_id').maybeSingle()
        if (claimed.error) throw new Error('Could not verify contact eligibility')
        if (!claimed.data) decision = 'skip'
      }
      const links = member && contact?.token ? outreachLinks(member, contact.token) : null
      return { recipientId: claim.recipientId, email: currentRecipient.email, name: member?.name ?? currentRecipient.name, decision,
        message: decision === 'send' && member && contact?.token ? renderAdminEmail({ subject: campaign.data.subject, body: campaign.data.body }, member, contact.token, campaign.data.template as EmailTemplate) : null,
        unsubscribePage: links?.stopUrl ?? '', unsubscribeUrl: links ? links.stopUrl.replace('/award-outreach/stop/', '/api/award-outreach/') + '/stop' : '' }
    },
    async update(recipientId, status, outcome, queueId) {
      const result = await db.from('top100_email_recipients').update({ status, outcome, ...(queueId ? { stalwart_queue_id: queueId } : {}), updated_at: new Date().toISOString() }).eq('id', recipientId).eq('status', 'sending').select('id').maybeSingle()
      if (result.error || !result.data) throw new Error('Could not record email outcome')
    },
    send: sendTransactionalEmail,
  }
}
