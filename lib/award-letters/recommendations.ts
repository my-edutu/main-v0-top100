import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { renderLetter } from './render'
import { canIssueRecommendation, type RecommendationAccess } from './recommendation-payment'
import { letterFields } from './request'

export type RecommendationDetails = { name: string; recipient: string; purpose: string }
export type RecommendationSummary = RecommendationDetails & {
  id: string
  revision: string
  updated_at: string
  finalized_at: string | null
}
type Snapshot = { image: string; pdf: string }
export type Recommendation = RecommendationSummary & { snapshot: Snapshot | null }

type Repository = {
  list: () => Promise<RecommendationSummary[]>
  get: (id: string) => Promise<Recommendation | null>
  create: (letter: Recommendation) => Promise<Recommendation | null>
  update: (letter: Recommendation, revision: string) => Promise<Recommendation | null>
  finalize: (id: string, revision: string) => Promise<Recommendation | null>
}

const id = z.string().uuid()
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), id: id.optional(), revision: id.optional(), preview: z.boolean(), ...letterFields }),
  z.object({ action: z.literal('open'), id }),
  z.object({ action: z.literal('finalize'), id, revision: id, confirmed: z.literal(true) }),
])

function publicLetter(letter: Recommendation) {
  const { snapshot, ...summary } = letter
  return { ...summary, image: snapshot?.image, pdf: letter.finalized_at ? snapshot?.pdf : undefined }
}

export function letterResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

const fail = (message: string, status: number) => letterResponse({ message }, status)

export class RecommendationCreditRequired extends Error {}

export async function handleRecommendations(request: Request, repo: Repository, access: RecommendationAccess, year?: string) {
  try {
    if (request.method === 'GET') return letterResponse({ letters: await repo.list(), access })

    const parsed = actionSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return fail('Check the letter details and try again.', 400)
    const action = parsed.data

    if (action.action === 'save') {
      if (!canIssueRecommendation(access)) return fail('Your free letters have been used. Buy a recommendation pack or confirm your award payment to create more.', 402)
      const { id, revision, name, purpose, recipient, preview } = action
      if (!name || !purpose || Boolean(id) !== Boolean(revision)) return fail('Enter your name and the opportunity.', 400)
      if (id) {
        const previous = await repo.get(id)
        if (!previous) return fail('Letter not found.', 404)
        if (previous.finalized_at) return fail('This letter is final and cannot be edited.', 409)
        if (previous.revision !== revision) return fail('This draft changed. Reopen it before saving again.', 409)
      }

      const letter = {
        id: id ?? randomUUID(), revision: randomUUID(), name, purpose, recipient,
        updated_at: new Date().toISOString(), finalized_at: null,
        snapshot: preview ? await renderLetter({ kind: 'recommendation', name, purpose, recipient }, year, access.demo) : null,
      }
      const saved = id && revision ? await repo.update(letter, revision) : await repo.create(letter)
      if (!saved) return fail('This draft changed, or you already have a letter for this opportunity. Reopen it from Saved letters.', 409)
      return letterResponse(publicLetter(saved))
    }

    const letter = await repo.get(action.id)
    if (!letter) return fail('Letter not found.', 404)
    if (action.action === 'open') {
      if (!letter.finalized_at && !canIssueRecommendation(access)) {
        return fail('You need recommendation access to open this draft.', 402)
      }
      return letterResponse(publicLetter(letter))
    }
    if (letter.revision !== action.revision || !letter.snapshot) {
      return fail('This draft changed. Preview it again before downloading.', 409)
    }
    if (letter.finalized_at) return letterResponse(publicLetter(letter))
    if (!canIssueRecommendation(access)) return fail('You need a recommendation credit to finalize this letter.', 402)
    const finalized = await repo.finalize(action.id, action.revision)
    if (finalized) return letterResponse(publicLetter(finalized))
    const latest = await repo.get(action.id)
    if (latest?.finalized_at && latest.revision === action.revision) return letterResponse(publicLetter(latest))
    return fail('This draft changed. Preview it again before downloading.', 409)
  } catch (error) {
    if (error instanceof RecommendationCreditRequired) return fail('You need a recommendation credit to finalize this letter.', 402)
    if (error instanceof RangeError) return fail(error.message, 400)
    return fail('Your letters are temporarily unavailable. Please try again.', 503)
  }
}
