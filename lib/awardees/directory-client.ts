import { fetchWithTimeout } from '@/lib/http/fetch-with-timeout'
import type { DirectoryCard } from './directory-cards'

// Only public cards are retained. Member profiles and other authenticated data
// continue to use uncached reads. A failed refresh never poisons the cache.
let cached: { cards: DirectoryCard[]; expiresAt: number } | null = null
let pending: Promise<DirectoryCard[]> | null = null

export function peekPublicDirectory(): DirectoryCard[] | null {
  return typeof window !== 'undefined' && cached && cached.expiresAt > Date.now() ? cached.cards : null
}

export async function fetchPublicDirectory(refresh = false): Promise<DirectoryCard[]> {
  if (typeof window === 'undefined') return readDirectory()
  const existing = peekPublicDirectory()
  if (!refresh && existing) return existing
  if (!pending) {
    pending = readDirectory().then(cards => {
      cached = { cards, expiresAt: Date.now() + 60_000 }
      return cards
    }).finally(() => { pending = null })
  }
  return pending
}

async function readDirectory(): Promise<DirectoryCard[]> {
  const response = await fetchWithTimeout('/api/awardees/directory', { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not load the member directory. Please try again.')
  const cards = await response.json()
  if (!Array.isArray(cards) || cards.some(card => typeof card?.name !== 'string' || typeof card?.slug !== 'string')) {
    throw new Error('Could not load the member directory. Please try again.')
  }
  return cards
}
