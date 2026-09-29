import type { PublicAwardee, SocialPlatform } from './types'

export async function prepareAwardeeSpotlight(
  awardeeId: string,
  platform: SocialPlatform,
  fetchImpl: typeof fetch = fetch,
): Promise<{ caption: string; profile: PublicAwardee }> {
  const response = await fetchImpl('/api/admin/social/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ awardeeId, platform }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof result?.message === 'string' ? result.message : 'Could not prepare this awardee spotlight.')
  }
  if (typeof result?.caption !== 'string' || !result.profile || typeof result.profile !== 'object') {
    throw new Error('The spotlight preview could not be prepared. Please try again.')
  }
  return { caption: result.caption, profile: result.profile as PublicAwardee }
}
