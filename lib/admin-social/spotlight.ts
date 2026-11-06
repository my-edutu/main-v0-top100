export const SPOTLIGHT_PLATFORMS = ['linkedin', 'facebook', 'instagram', 'x'] as const
export type SpotlightPlatform = typeof SPOTLIGHT_PLATFORMS[number]
export const SPOTLIGHT_LABELS: Record<SpotlightPlatform, string> = { linkedin: 'LinkedIn', facebook: 'Facebook', instagram: 'Instagram', x: 'X' }
export const CAPTION_LIMITS: Record<SpotlightPlatform, number> = { linkedin: 3000, facebook: 5000, instagram: 2200, x: 280 }
export type PublicationResult = { platform?: SpotlightPlatform; caption?: string; state: 'publishing' | 'published' | 'failed' | 'uncertain'; message?: string; postId?: string | null; postUrl?: string | null }

// Conservative X count: URLs use t.co's 23 characters; non-Latin code points
// count twice. Emoji sequences may be overcounted, never silently truncated.
export function captionLength(platform: SpotlightPlatform, caption: string): number {
  if (platform !== 'x') return caption.length
  return caption.split(/(https?:\/\/[^\s]+)/g).reduce((total, part) => {
    if (/^https?:\/\//.test(part)) return total + 23
    return total + Array.from(part).reduce((n, char) => {
      const c = char.codePointAt(0)!
      return n + ((c <= 0x10ff || (c >= 0x2000 && c <= 0x200d) || (c >= 0x2010 && c <= 0x201f) || (c >= 0x2032 && c <= 0x2037)) ? 1 : 2)
    }, 0)
  }, 0)
}
export function completeSpotlightCaption(caption: string, profileUrl: string): string {
  return caption.includes(profileUrl) ? caption.trim() : `${caption.trim()}\n\n${profileUrl}`
}
export function validateSpotlightCaption(platform: SpotlightPlatform, caption: string, profileUrl: string): string | null {
  if (!caption.trim()) return 'Write a caption first.'
  if (!caption.split(/\s+/).some(word => word === profileUrl)) return 'Include the profile link on its own or separated by spaces.'
  if (captionLength(platform, caption) > CAPTION_LIMITS[platform]) return `Shorten this caption to ${CAPTION_LIMITS[platform]} characters.`
  return null
}

export function spotlightImageUrl(profileUrl: string, awardeeId: string, signature: string) {
  return new URL(`/api/social/spotlight-image/${encodeURIComponent(awardeeId)}?v=${signature}`, profileUrl).toString()
}
