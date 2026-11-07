import { buildProfileContent } from '@/lib/seo/profile-content'
import { resolveRemoteImageSource } from '@/lib/media/remote-image-source'
import { SITE_URL } from '@/lib/site'

export type QualityFilter = 'all' | 'bio' | 'headline' | 'photo' | 'broken' | 'review'
export type LinkResult = { label: string; host: string; status: 'working' | 'broken' | 'review'; reason: string }
export type QualityRow = {
  id: string
  slug: string | null
  name: string
  year: string | null
  missingBio: boolean
  missingHeadline: boolean
  missingPhoto: boolean
  details: string[]
  invalidLinks: LinkResult[]
  linkCount: number
}

export type QualitySource = Parameters<typeof buildProfileContent>[0] & {
  awardee_id: string
  profile_id: string | null
  avatar_url?: string | null
  cover_image_url?: string | null
  portfolio_cover_url?: string | null
  achievements?: { title?: string; link?: string }[] | null
  social_links?: Record<string, string> | null
}

export const QUALITY_BATCH_SIZE = 6

const detailLabels: Record<string, string> = {
  'missing-real-name': 'Confirm the awardee’s name',
  'missing-country-or-location': 'Add the recorded country or location',
  'missing-cohort-year': 'Confirm the cohort year',
  'cohort-year-needs-review': 'Cohort and year fields disagree',
  'academic-figures-need-review': 'Confirm differing academic figures in the biography',
}

export function qualityLinkUrl(value: string): URL | null {
  try {
    const path = value.startsWith('/')
    const url = path ? new URL(value, SITE_URL) : new URL(value)
    if (path && url.origin !== SITE_URL) return null
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return null
    url.hash = ''
    return url
  } catch {
    return null
  }
}

export function assessProfileQuality(profile: QualitySource, socialLinks: Record<string, string>) {
  const content = buildProfileContent(profile)
  const portrait = profile.avatar_url?.trim()
  const cover = profile.cover_image_url?.trim()
  const sources = [
    { label: 'Portrait', value: portrait, image: true },
    { label: 'Cover photo', value: cover, image: true },
    { label: 'Portfolio cover', value: profile.portfolio_cover_url, image: true },
    ...Object.entries(socialLinks).map(([label, value]) => ({ label, value, image: false })),
    ...(Array.isArray(profile.achievements) ? profile.achievements.filter(item => typeof item?.link === 'string' && item.link.trim()).slice(0, 12) : [])
      .map(achievement => ({ label: achievement?.title || 'Achievement link', value: achievement?.link, image: false })),
  ]
  const targets = new Map<string, { label: string; url: string; image: boolean }>()
  const invalidLinks: LinkResult[] = []
  for (const { label, value, image } of sources) {
    if (typeof value !== 'string' || !value.trim() || value.trim() === '/image-unavailable.svg') continue
    const source = image ? resolveRemoteImageSource(value.trim()) : value.trim()
    const url = source && qualityLinkUrl(source)
    if (!url) {
      invalidLinks.push({ label, host: '', status: 'broken', reason: 'Invalid web address' })
    } else {
      const key = `${image}:${url.href}`
      if (!targets.has(key)) targets.set(key, { label, url: url.href, image })
    }
  }

  const details = content.reviewFlags.flatMap(flag => detailLabels[flag] ? [detailLabels[flag]] : [])
  const slug = profile.slug?.trim()
  const validSlug = slug && slug === profile.slug && !/[/?#\\\s]/.test(slug) && slug !== '.' && slug !== '..'
  if (!validSlug) details.push('Confirm the public profile URL')
  const row: QualityRow = {
    id: profile.awardee_id,
    name: profile.name?.trim() || 'Unnamed awardee',
    slug: validSlug ? slug : null,
    year: content.year,
    missingBio: content.reviewFlags.includes('missing-biography'),
    missingHeadline: content.reviewFlags.includes('missing-specific-headline'),
    missingPhoto: ![...targets.values()].some(target => target.label === 'Portrait' || target.label === 'Cover photo'),
    details,
    invalidLinks,
    linkCount: targets.size,
  }
  return { row, targets: [...targets.values()] }
}
