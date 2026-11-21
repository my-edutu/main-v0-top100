import { randomUUID } from 'node:crypto'
import { getAwardPaymentView } from '@/lib/awards/payment-server'
import { pickupPaymentState } from '@/lib/festival/interest'
import { buildCheckoutRequest, createCheckoutSession, isDefinitiveNoSessionError } from '@/lib/payments/bachs/checkout'
import { bachsConfig } from '@/lib/payments/bachs/config'
import { verifyBachsAwardCheckout } from '@/lib/payments/bachs/settlement'
import type { createAdminClient } from '@/lib/supabase/server'
import { canIssueRecommendation, FREE_RECOMMENDATION_LIMIT, RECOMMENDATION_PACK_SIZE, type RecommendationAccess } from './recommendation-payment'

type Db = ReturnType<typeof createAdminClient>
type Pack = { id: string; request_body: string; checkout_id: string | null; remaining: number }
const fields = 'id,request_body,checkout_id,remaining'
const purpose = 'afl_recommendation_pack_v1'
const lettersPath = '/dashboard/letters/recommendation'

export async function getRecommendationAccess(db: Db, memberId: string): Promise<RecommendationAccess> {
  const [award, paid, pending, freeUsed] = await Promise.all([
    getAwardPaymentView(memberId).then(pickupPaymentState).catch(() => 'unavailable' as const),
    db.from('recommendation_letter_packs').select('remaining').eq('member_id', memberId).eq('status', 'paid').gt('remaining', 0),
    db.from('recommendation_letter_packs').select('id').eq('member_id', memberId).eq('status', 'pending').maybeSingle(),
    db.from('member_recommendation_letters').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('used_free_letter', true),
  ])
  if (paid.error || pending.error || freeUsed.error || freeUsed.count === null) throw new Error('Could not load recommendation credits.')
  return { award, freeRemaining: Math.max(0, FREE_RECOMMENDATION_LIMIT - freeUsed.count), credits: paid.data.reduce((sum, pack) => sum + pack.remaining, 0), checkoutPending: Boolean(pending.data) }
}

function verifyPack(pack: Pack) {
  if (!pack.checkout_id) throw new Error('Checkout has not been recorded.')
  return verifyBachsAwardCheckout({
    checkoutId: pack.checkout_id, reference: `AFL-REC-${pack.id}`, orderId: pack.id, attemptId: pack.id,
    currency: 'USD', requestedMinor: 500, purpose,
  }, bachsConfig())
}

export async function getVerifiedRecommendationPack(db: Db, memberId: string) {
  const { data, error } = await db.from('recommendation_letter_packs').select(fields)
    .eq('member_id', memberId).eq('status', 'paid').gt('remaining', 0).order('created_at').limit(1).maybeSingle()
  if (error) throw error
  if (!data) return null
  const verified = await verifyPack(data)
  if (verified?.status !== 'paid') throw new Error('Could not verify recommendation pack payment.')
  return data.id
}

function checkoutInput(id: string, email: string) {
  return {
    orderId: id, attemptId: id, reference: `AFL-REC-${id}`, idempotencyKey: `recommendation-pack-${id}`,
    purpose, currency: 'USD', adaptivePricing: true, customer: { email },
    successPath: `${lettersPath}?pack=return`, cancelPath: `${lettersPath}?pack=cancelled`,
  } as const
}

async function pendingPack(db: Db, memberId: string) {
  const { data, error } = await db.from('recommendation_letter_packs').select(fields)
    .eq('member_id', memberId).eq('status', 'pending').maybeSingle()
  if (error) throw error
  return data as Pack | null
}

async function resolvePack(db: Db, memberId: string, pack: Pack) {
  const config = bachsConfig()
  if (!pack.checkout_id) {
    try {
      const { customer } = JSON.parse(pack.request_body) as { customer: { email: string } }
      const session = await createCheckoutSession({
        ...checkoutInput(pack.id, customer.email), requestBody: pack.request_body, recover: true,
      }, { config })
      const { error } = await db.from('recommendation_letter_packs').update({ checkout_id: session.checkoutId })
        .eq('member_id', memberId).eq('id', pack.id).eq('status', 'pending').is('checkout_id', null)
      if (error) throw error
      pack = { ...pack, checkout_id: session.checkoutId }
      if (session.status === 'open' && Date.parse(session.expiresAt) > Date.now()) return session.checkoutUrl
    } catch (error) {
      if (isDefinitiveNoSessionError(error)) {
        const expired = await db.from('recommendation_letter_packs').update({ status: 'expired' })
          .eq('member_id', memberId).eq('id', pack.id).eq('status', 'pending').is('checkout_id', null)
        if (expired.error) throw expired.error
      }
      throw error
    }
  }

  const verified = await verifyPack(pack)
  if (verified?.status === 'open' && verified.checkoutUrl && Date.parse(verified.expiresAt ?? '') > Date.now()) {
    const url = new URL(verified.checkoutUrl)
    if (url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash || !config.checkoutHosts.has(url.hostname)) {
      throw new Error('Invalid recommendation checkout URL.')
    }
    return url.href
  }
  if (verified?.status !== 'expired' && verified?.status !== 'paid') return null

  const update = verified.status === 'paid'
    ? { status: 'paid', charge_id: verified.chargeId, remaining: RECOMMENDATION_PACK_SIZE }
    : { status: 'expired' }
  const { error } = await db.from('recommendation_letter_packs').update(update)
    .eq('member_id', memberId).eq('id', pack.id).eq('status', 'pending')
  if (error) throw error
  return null
}

export async function manageRecommendationPack(db: Db, memberId: string, email: string | undefined, purchase: boolean) {
  const existing = await pendingPack(db, memberId)
  if (existing) {
    const checkoutUrl = await resolvePack(db, memberId, existing)
    const access = await getRecommendationAccess(db, memberId)
    return { checkoutUrl: purchase && access.award === 'required' && !canIssueRecommendation(access) ? checkoutUrl : null, access }
  }

  const access = await getRecommendationAccess(db, memberId)
  if (!purchase || access.award !== 'required' || canIssueRecommendation(access)) return { access, checkoutUrl: null }
  if (!email) throw new Error('An email address is required for payment.')

  const id = randomUUID()
  const requestBody = JSON.stringify(buildCheckoutRequest({ ...checkoutInput(id, email), config: bachsConfig() }))
  const { data, error } = await db.from('recommendation_letter_packs').insert({
    id, member_id: memberId, request_body: requestBody,
  }).select(fields).single()
  if (error && error.code !== '23505') throw error
  const pack = data ?? await pendingPack(db, memberId)
  const checkoutUrl = pack ? await resolvePack(db, memberId, pack) : null
  return { checkoutUrl, access: await getRecommendationAccess(db, memberId) }
}
