import { createHash } from 'node:crypto'
import type { createAdminClient } from '@/lib/supabase/server'
import { talentUpgradeEmail } from './email-template'
import { canSendUpgradeEmail } from './policy'
import { talentLaunchFlags } from './features'
import { TalentAccessError } from './api'

type Db = ReturnType<typeof createAdminClient>
type Claim = { profile_id: string; attempt_id: string; member_name: string | null }
type Delivery = { status: 'sent' | 'failed' | 'unknown' | 'skipped'; providerMessageId?: string; code?: string }
export const TALENT_EMAIL_CONFIRMATION = 'SEND THE LIVE TALENT UPGRADE EMAIL'
export function upgradeOrigin(): string {
  const raw = process.env.TALENT_PUBLIC_ORIGIN || 'https://top100afl.com'
  const url = new URL(raw)
  if (url.protocol !== 'https:' || !['top100afl.com','www.top100afl.com'].includes(url.hostname) || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) throw new TalentAccessError('Configure the canonical Top100 launch origin before sending.', 503)
  return url.origin
}
export async function sendUpgradeBatch(db: Db, actorId: string, limit: number, requestOrigin: string) {
  const flags = talentLaunchFlags()
  if (!canSendUpgradeEmail(flags) || process.env.NODE_ENV !== 'production') throw new TalentAccessError('Sending is locked until the reviewed talent feature is live in production.', 409)
  const origin = upgradeOrigin()
  if (new URL(requestOrigin).origin !== origin) throw new TalentAccessError('Launch emails may only be sent from the canonical production website.', 403)
  const admin = await db.from('profiles').select('role').eq('id', actorId).maybeSingle()
  if (admin.error) throw admin.error
  if (admin.data?.role !== 'superadmin') throw new TalentAccessError('Only a current superadmin can release the member campaign.', 403)
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) throw new TalentAccessError('Configure and verify the existing Brevo sender before sending.', 503)
  // Release gate is explicit. A branch preview never sets these three flags.
  const storage = await db.from('talent_public_directory').select('profile_id', { head: true, count: 'exact' })
  if (storage.error) throw storage.error
  const claimed = await db.rpc('talent_claim_upgrade_batch', { p_actor: actorId, p_limit: limit })
  if (claimed.error) throw claimed.error
  const claims = (claimed.data ?? []) as Claim[]
  const totals = { selected: claims.length, acceptedByProvider: 0, failed: 0, unknown: 0, skipped: 0 }
  // Small bounded concurrency. One database reservation per account; no automatic retries.
  for (let start = 0; start < claims.length; start += 2) {
    const results = await Promise.all(claims.slice(start, start + 2).map(claim => sendOne(db, claim, origin, actorId)))
    for (const result of results) {
      if (result.status === 'sent') totals.acceptedByProvider++
      else totals[result.status]++
    }
  }
  return totals
}
async function sendOne(db: Db, claim: Claim, origin: string, actorId: string): Promise<Delivery> {
  let delivery: Delivery = { status: 'unknown', code: 'not_confirmed' }
  try {
    const [profile, talent, account, membership] = await Promise.all([
      db.from('profiles').select('membership_status,notification_prefs').eq('id',claim.profile_id).maybeSingle(),
      db.from('talent_profiles').select('outreach_email_opt_out').eq('profile_id',claim.profile_id).maybeSingle(),
      db.auth.admin.getUserById(claim.profile_id),
      db.rpc('talent_assert_member', { p_actor: claim.profile_id }),
    ])
    if (profile.error || talent.error || account.error) throw new Error('recipient_recheck_failed')
    const prefs = (profile.data?.notification_prefs ?? {}) as Record<string,unknown>
    const user = account.data?.user
    const bannedUntil = user && 'banned_until' in user ? String(user.banned_until || '') : ''
    if (membership.error || profile.data?.membership_status !== 'approved' || talent.data?.outreach_email_opt_out || prefs.opportunityAlerts === false || prefs.emailOptOut === true || prefs.emailUnsubscribed === true || !user?.email || !user.email_confirmed_at || (bannedUntil && Date.parse(bannedUntil)>Date.now())) {
      delivery = { status: 'skipped', code: 'recipient_not_eligible' }
    } else {
      const recipientHash = createHash('sha256').update(user.email.trim().toLowerCase()).digest('hex')
      const reserved = await db.from('talent_upgrade_deliveries').update({ recipient_hash: recipientHash }).eq('profile_id',claim.profile_id).eq('attempt_id',claim.attempt_id).eq('status','sending').select('profile_id').maybeSingle()
      if (reserved.error?.code === '23505') delivery = { status: 'skipped', code: 'address_already_reserved' }
      else if (reserved.error || !reserved.data) throw new Error('reservation_not_confirmed')
      else {
        const email = talentUpgradeEmail(claim.member_name || 'Top100 member', origin)
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST', signal: AbortSignal.timeout(12_000),
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY! },
          body: JSON.stringify({ to:[{email:user.email}],sender:{name:'Top100 Africa Future Leaders',email:process.env.BREVO_SENDER_EMAIL},subject:email.subject,htmlContent:email.html,textContent:email.text,tags:['talent-discovery-upgrade-2026-11'] }),
        })
        const receipt: unknown = await response.json()
        const messageId = receipt && typeof receipt === 'object' && 'messageId' in receipt && typeof receipt.messageId === 'string' ? receipt.messageId.slice(0,300) : null
        delivery = response.ok && messageId ? {status:'sent',providerMessageId:messageId} : {status:response.status>=400 && response.status<500?'failed':'unknown',code:`provider_${response.status}`}
      }
    }
  } catch { delivery = { status: 'unknown', code: 'delivery_confirmation_unavailable' } }
  const recorded = await db.from('talent_upgrade_deliveries').update({ status:delivery.status,provider_message_id:delivery.providerMessageId??null,failure_code:delivery.code??null,completed_at:new Date().toISOString() }).eq('profile_id',claim.profile_id).eq('attempt_id',claim.attempt_id).eq('status','sending').select('profile_id').maybeSingle()
  if (recorded.error || !recorded.data) return {status:'unknown',code:'receipt_persistence_failed'}
  const audit = await db.from('talent_events').insert({actor_id:actorId,profile_id:claim.profile_id,entity_id:claim.attempt_id,kind:'upgrade_email_attempt',details:{status:delivery.status}})
  if (audit.error) console.error('[talent-email] audit receipt unavailable', { code:audit.error.code })
  return delivery
}
