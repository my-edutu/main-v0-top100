export const SOCIAL_PLATFORMS = ['linkedin', 'facebook', 'instagram', 'twitter', 'youtube', 'tiktok', 'website'] as const
export type SocialLink = { platform: typeof SOCIAL_PLATFORMS[number]; url: string }
const SOCIAL_HOSTS: Record<string, string[]> = { linkedin: ['linkedin.com'], facebook: ['facebook.com', 'fb.com'], instagram: ['instagram.com'], twitter: ['twitter.com', 'x.com'], youtube: ['youtube.com', 'youtu.be'], tiktok: ['tiktok.com'] }
export function validateSocialLinks(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > 3) return 'Add no more than three social links.'
  const platforms = new Set<string>()
  for (const link of value) {
    if (!link || !SOCIAL_PLATFORMS.includes(link.platform) || typeof link.url !== 'string' || link.url.length > 500) return 'Choose a platform and enter a valid link.'
    try { const url = new URL(link.url); if (url.protocol !== 'https:' || url.username || url.password) return 'Use a secure https:// link.'; const hosts = SOCIAL_HOSTS[link.platform]; if (hosts && !hosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) return `Enter a ${link.platform === 'twitter' ? 'X / Twitter' : link.platform} link that matches your selected platform.` } catch { return 'Use a complete https:// link.' }
    if (platforms.has(link.platform)) return 'Use each platform only once.'
    platforms.add(link.platform)
  }
  return null
}
