import type { PublicationResult } from './spotlight'

export class PublicationRejected extends Error {}

// The repository claim is a compare-and-set in Postgres, not an in-process lock.
// A request that loses its response may have published: never blindly retry it.
export async function publishSpotlight(deps: {
  claim: () => Promise<string | null>
  read: () => Promise<PublicationResult>
  finish: (claim: string, result: PublicationResult) => Promise<void>
  send: () => Promise<{ postId: string; postUrl: string | null }>
}): Promise<PublicationResult> {
  const claim = await deps.claim()
  if (!claim) return deps.read()
  let result: PublicationResult
  try {
    result = { state: 'published', ...await deps.send() }
  } catch (error) {
    result = error instanceof PublicationRejected
      ? { state: 'failed', message: 'The platform rejected this post. Check account permissions and caption/media requirements before retrying.' }
      : { state: 'uncertain', message: 'Delivery could not be confirmed. Check the social account before attempting another post.' }
  }
  try { await deps.finish(claim, result) } catch {
    return { state: 'uncertain', message: 'The delivery record could not be saved. Check the social account; this post will not be automatically retried.' }
  }
  return result
}
