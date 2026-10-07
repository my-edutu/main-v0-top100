export const SOCIAL_PLATFORMS = ['linkedin', 'facebook', 'instagram', 'twitter', 'youtube', 'tiktok', 'website'] as const
export type SocialLink = { platform: typeof SOCIAL_PLATFORMS[number]; url: string }
export function validateSocialLinks(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > 3) return 'Add no more than three social links.'
  const platforms = new Set<string>()
  for (const link of value) {
    if (!link || !SOCIAL_PLATFORMS.includes(link.platform) || typeof link.url !== 'string' || link.url.length > 500) return 'Choose a platform and enter a valid link.'
    try { const url = new URL(link.url); if (url.protocol !== 'https:' || url.username || url.password) return 'Use a secure https:// link.' } catch { return 'Use a complete https:// link.' }
    if (platforms.has(link.platform)) return 'Use each platform only once.'
    platforms.add(link.platform)
  }
  return null
}
