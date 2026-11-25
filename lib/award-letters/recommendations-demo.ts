import { handleRecommendations, RecommendationCreditRequired, letterResponse, type Recommendation } from './recommendations'

import { FREE_RECOMMENDATION_LIMIT, RECOMMENDATION_PACK_SIZE, type RecommendationAccess } from './recommendation-payment'

const freeUsed = new WeakMap<object, number>()
const balances = new WeakMap<object, number>()
const demoRecords = new WeakMap<object, Map<string, Recommendation>>()

export async function handleDemoRecommendations(request: Request, store: object, award: RecommendationAccess['award']) {
  const freeRemaining = FREE_RECOMMENDATION_LIMIT - (freeUsed.get(store) ?? 0)
  const access = { award, freeRemaining, credits: balances.get(store) ?? 0, checkoutPending: false, demo: true }
  if (new URL(request.url).searchParams.get('demoPack') === 'true' && request.method === 'POST') {
    const input = await request.json().catch(() => null)
    if (input?.action === 'checkout' && award === 'required' && freeRemaining === 0 && !(balances.get(store) ?? 0)) {
      balances.set(store, RECOMMENDATION_PACK_SIZE)
    }
    return letterResponse({ access: { ...access, credits: balances.get(store) ?? 0 } })
  }
  const records = demoRecords.get(store) ?? new Map<string, Recommendation>()
  demoRecords.set(store, records)
  const key = (purpose: string) => purpose.trim().replace(/\s+/g, ' ').toLowerCase()
  function save(letter: Recommendation) {
    if ([...records.values()].some(other => other.id !== letter.id && key(other.purpose) === key(letter.purpose))) return null
    records.set(letter.id, letter)
    return letter
  }
  return handleRecommendations(request, {
    async list() {
      return [...records.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map(({ id, revision, name, purpose, recipient, updated_at, finalized_at }) => ({ id, revision, name, purpose, recipient, updated_at, finalized_at }))
    },
    async get(id) { return records.get(id) ?? null },
    async create(letter) { return save(letter) },
    async update(letter, revision) {
      const current = records.get(letter.id)
      return current?.revision === revision && !current.finalized_at ? save(letter) : null
    },
    async finalize(id, revision) {
      const current = records.get(id)
      if (!current || current.revision !== revision || current.finalized_at || !current.snapshot) return null
      if (award !== 'confirmed') {
        const used = freeUsed.get(store) ?? 0
        if (used < FREE_RECOMMENDATION_LIMIT) {
          freeUsed.set(store, used + 1)
        } else {
          const credits = balances.get(store) ?? 0
          if (!credits) throw new RecommendationCreditRequired()
          balances.set(store, credits - 1)
        }
      }
      const now = new Date().toISOString()
      return save({ ...current, finalized_at: now, updated_at: now })
    },
  }, access, '2026')
}
