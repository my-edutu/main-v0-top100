const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function currentBioDestination(userId: string | null, slug: string | null) {
  if (!userId) return '/login?redirect=%2Fbio'
  if (!slug || !PUBLIC_SLUG.test(slug)) return '/dashboard/me/profile'
  return `/bio/${slug}`
}

export function publicBioDestination(slug: string) {
  if (!PUBLIC_SLUG.test(slug)) return null
  return `/awardees/${slug}`
}
