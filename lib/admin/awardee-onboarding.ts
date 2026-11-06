export function getAwardeeOnboardingStatus(profile?: Record<string, unknown>) {
  if (!profile?.user_id) return 'not-activated' as const

  const hasContent = (value: unknown): boolean => {
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.some(hasContent)
    if (value && typeof value === 'object') return Object.values(value).some(hasContent)
    return false
  }
  const fields = ['bio', 'avatar_url', 'cover_image_url', 'portfolio_cover_url',
    'tagline', 'location', 'current_school', 'field', 'field_of_study', 'organization', 'social_links', 'achievements', 'gallery',
    'video_links', 'interests', 'youtube_video_url']
  const headline = profile.headline === 'Top100 Africa Future Leaders awardee' ? '' : profile.headline
  return hasContent(headline) || fields.some(field => hasContent(profile[field]))
    ? 'has-details' as const : 'empty' as const
}
