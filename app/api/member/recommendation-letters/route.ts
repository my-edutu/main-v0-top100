import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAwardLetterAccess } from '@/lib/award-letters/access'
import { getRecommendationAccess, getVerifiedRecommendationPack } from '@/lib/award-letters/recommendation-payment-server'
import { handleRecommendations, letterResponse, RecommendationCreditRequired, type Recommendation } from '@/lib/award-letters/recommendations'

const summaryFields = 'id,revision,name,recipient,purpose,updated_at,finalized_at'
const recordFields = `${summaryFields},snapshot`

async function handle(request: Request) {
  const user = await getCurrentUser()
  if (!user?.id) return letterResponse({ message: 'Sign in to access your letters.' }, 401)
  const memberId = user.id
  try {
    const db = createAdminClient()
    const access = await getAwardLetterAccess(db, memberId)
    if (!access) return letterResponse({ message: 'Letters are available to awardees only.' }, 403)
    const payment = await getRecommendationAccess(db, memberId)
    const table = () => db.from('member_recommendation_letters')
    const get = async (id: string) => {
      const { data, error } = await table().select(recordFields).eq('member_id', memberId).eq('id', id).maybeSingle()
      if (error) throw error
      return data as Recommendation | null
    }
    return handleRecommendations(request, {
      async list() {
        const letters = []
        const pageSize = 100
        for (let offset = 0; ; offset += pageSize) {
          const { data, error } = await table().select(summaryFields).eq('member_id', memberId)
            .order('updated_at', { ascending: false }).order('id').range(offset, offset + pageSize - 1)
          if (error) throw error
          letters.push(...data)
          if (data.length < pageSize) return letters
        }
      },
      get,
      async create(letter) {
        const { data, error } = await table().insert({ ...letter, member_id: memberId }).select(recordFields).single()
        if (error?.code === '23505') return null
        if (error) throw error
        return data as Recommendation
      },
      async update({ id, ...letter }, revision) {
        const { data, error } = await table().update(letter).eq('member_id', memberId).eq('id', id)
          .eq('revision', revision).is('finalized_at', null).select(recordFields).maybeSingle()
        if (error?.code === '23505') return null
        if (error) throw error
        return data as Recommendation | null
      },
      async finalize(id, revision) {
        const awardPaid = payment.award === 'confirmed'
        const verifiedPackId = awardPaid || payment.freeRemaining > 0 ? null : await getVerifiedRecommendationPack(db, memberId)
        const { data, error } = await db.rpc('finalize_member_recommendation', {
          p_member_id: memberId, p_letter_id: id, p_revision: revision,
          p_award_paid: awardPaid, p_verified_pack_id: verifiedPackId,
        })
        if (error?.code === 'P0001') throw new RecommendationCreditRequired()
        if (error) throw error
        return data?.id ? data as Recommendation : null
      },
    }, payment, access.year)
  } catch {
    return letterResponse({ message: 'Your letters are temporarily unavailable. Please try again.' }, 503)
  }
}

export const GET = handle
export const POST = handle
