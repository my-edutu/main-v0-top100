import { clampText } from '@/lib/og'
import { SITE_URL } from '@/lib/site'
import type { AwardeeDirectoryEntry } from '@/types/profile'

export function profileDescription(bio: string | null | undefined, fallback: string): string {
  return clampText(bio, 160) || clampText(fallback, 160) || fallback
}

function webUrl(value: string | null | undefined, allowRelative = false): string | undefined {
  if (!value?.trim()) return undefined
  try {
    const url = allowRelative ? new URL(value, SITE_URL) : new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}

export function profileStructuredData(profile: AwardeeDirectoryEntry, socialUrls: string[]) {
  const url = `${SITE_URL}/awardees/${encodeURIComponent(profile.slug)}`
  const validDate = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${url}#profile`,
    url,
    dateCreated: validDate(profile.created_at),
    dateModified: validDate(profile.updated_at),
    mainEntity: {
      '@type': 'Person',
      '@id': `${url}#person`,
      url,
      name: profile.name,
      image: webUrl(profile.avatar_url, true) || webUrl(profile.cover_image_url, true),
      description: profile.bio || undefined,
      // Country and current school do not establish nationality or alumni status.
      award: profile.achievements?.map(item => item.title).filter(Boolean),
      sameAs: [...new Set(socialUrls.map(value => webUrl(value)).filter((value): value is string => Boolean(value)))],
      memberOf: { '@type': 'Organization', name: 'Top100 Africa Future Leaders', url: SITE_URL },
      knowsAbout: profile.interests || undefined,
    },
  }
}
