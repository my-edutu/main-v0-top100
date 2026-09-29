import type { PublicAchievement, PublicAwardee, SocialImageSource } from './types'

type AwardeeRow = {
  awardee_id?: unknown
  profile_id?: unknown
  slug?: unknown
  name?: unknown
  bio?: unknown
  headline?: unknown
  country?: unknown
  field_of_study?: unknown
  cohort?: unknown
  year?: unknown
  achievements?: unknown
  impact_projects?: unknown
  lives_impacted?: unknown
  awards_received?: unknown
  updated_at?: unknown
  portfolio_cover_url?: unknown
  avatar_url?: unknown
  cover_image_url?: unknown
  is_public?: unknown
}

function safeWebUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

function safeText(value: unknown, maxLength = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function safeCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function safeAchievements(value: unknown): PublicAchievement[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 5).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const title = safeText(row.title, 180)
    if (!title) return []
    return [{
      title,
      description: safeText(row.description, 500) || undefined,
      organization: safeText(row.organization, 160) || undefined,
      date: safeText(row.recognition_date, 50) || undefined,
    }]
  })
}

export function mapPublicAwardee(row: AwardeeRow, siteUrl: string): PublicAwardee {
  const slug = typeof row.slug === 'string' ? row.slug.trim() : ''
  const base = new URL(siteUrl)
  const profileUrl = slug
    ? new URL(`/awardees/${encodeURIComponent(slug)}`, base).toString()
    : base.toString()

  const cover = safeWebUrl(row.portfolio_cover_url)
  const avatar = safeWebUrl(row.avatar_url) ?? safeWebUrl(row.cover_image_url)
  const imageUrl = cover ?? avatar
  const imageSource: SocialImageSource = cover ? 'portfolio-cover' : avatar ? 'profile-photo' : 'none'

  return {
    awardeeId: typeof row.awardee_id === 'string' ? row.awardee_id : '',
    profileId: typeof row.profile_id === 'string' ? row.profile_id : null,
    slug,
    name: typeof row.name === 'string' ? row.name.trim() : '',
    bio: typeof row.bio === 'string' ? row.bio.trim() : '',
    headline: safeText(row.headline, 250),
    country: safeText(row.country, 120),
    fieldOfStudy: safeText(row.field_of_study, 160),
    cohort: safeText(row.cohort, 80),
    year: safeCount(row.year),
    achievements: safeAchievements(row.achievements),
    impactProjects: safeCount(row.impact_projects),
    livesImpacted: safeCount(row.lives_impacted),
    awardsReceived: safeCount(row.awards_received),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
    profileUrl,
    imageUrl,
    imageSource,
    isPublic: row.is_public !== false,
  }
}

export function publicSnapshot(profile: PublicAwardee): Pick<PublicAwardee, 'name' | 'bio' | 'headline' | 'country' | 'fieldOfStudy' | 'cohort' | 'year' | 'achievements' | 'impactProjects' | 'livesImpacted' | 'awardsReceived' | 'updatedAt' | 'profileUrl' | 'imageUrl' | 'imageSource'> {
  return {
    name: profile.name,
    bio: profile.bio,
    headline: profile.headline,
    country: profile.country,
    fieldOfStudy: profile.fieldOfStudy,
    cohort: profile.cohort,
    year: profile.year,
    achievements: profile.achievements,
    impactProjects: profile.impactProjects,
    livesImpacted: profile.livesImpacted,
    awardsReceived: profile.awardsReceived,
    updatedAt: profile.updatedAt,
    profileUrl: profile.profileUrl,
    imageUrl: profile.imageUrl,
    imageSource: profile.imageSource,
  }
}
