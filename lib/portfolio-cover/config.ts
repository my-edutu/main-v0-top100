import { getMediaStorageConfig } from '@/lib/media/storage-config'
import { portfolioQueueConfigured } from './queue'

function enabled(value: string | undefined) {
  return value === '1' || value?.toLowerCase() === 'true'
}

export function portfolioCoverConfig(env: Record<string, string | undefined> = process.env) {
  const demo = enabled(env.PORTFOLIO_IMAGE_GENERATION_DEMO)
  const production = env.NODE_ENV === 'production'
  if (demo && production) return { enabled: false, demo: false, reason: 'production_demo_forbidden' as const }
  if (demo) return { enabled: true, demo: true, reason: null }
  if (!enabled(env.PORTFOLIO_IMAGE_GENERATION_ENABLED)) return { enabled: false, demo: false, reason: 'disabled' as const }
  if (!env.OPENAI_API_KEY?.trim()) return { enabled: false, demo: false, reason: 'missing_provider' as const }
  if (!env.PORTFOLIO_SOURCE_BUCKET?.trim() || !env.PORTFOLIO_OPTION_BUCKET?.trim() || !env.PORTFOLIO_COVER_BUCKET?.trim()) return { enabled: false, demo: false, reason: 'missing_storage' as const }
  try {
    const storage = getMediaStorageConfig(env)
    if (storage.provider === 'r2' && !portfolioQueueConfigured(env)) {
      return { enabled: false, demo: false, reason: 'missing_queue' as const }
    }
  } catch {
    return { enabled: false, demo: false, reason: 'missing_storage' as const }
  }
  return { enabled: true, demo: false, reason: null }
}
