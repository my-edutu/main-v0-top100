export const SOCIAL_PLATFORMS = ['linkedin', 'facebook', 'instagram'] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export type SocialDraftStatus = 'draft' | 'marked_posted'
export type SocialPublishState = 'ready' | 'publishing' | 'failed' | 'uncertain' | 'published'
export type SocialImageSource = 'portfolio-cover' | 'profile-photo' | 'none'

export type PublicAchievement = {
  title: string
  description?: string
  organization?: string
  date?: string
}

export type PublicAwardee = {
  awardeeId: string
  profileId: string | null
  slug: string
  name: string
  bio: string
  headline: string
  country: string
  fieldOfStudy: string
  cohort: string
  year: number | null
  achievements: PublicAchievement[]
  impactProjects: number | null
  livesImpacted: number | null
  awardsReceived: number | null
  updatedAt: string | null
  profileUrl: string
  imageUrl: string | null
  imageSource: SocialImageSource
  isPublic: boolean
}

export type SocialShareDraft = {
  id: string
  awardeeId: string
  profileId: string | null
  platform: SocialPlatform
  caption: string
  status: SocialDraftStatus
  publishState: SocialPublishState
  publishError: string | null
  publishStartedAt: string | null
  linkedinPostUrn: string | null
  snapshotProfileUpdatedAt: string | null
  publicSnapshot: Pick<PublicAwardee, 'name' | 'bio' | 'headline' | 'country' | 'fieldOfStudy' | 'cohort' | 'year' | 'achievements' | 'impactProjects' | 'livesImpacted' | 'awardsReceived' | 'updatedAt' | 'profileUrl' | 'imageUrl' | 'imageSource'>
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  markedPostedBy: string | null
  markedPostedAt: string | null
  publicPostUrl: string | null
}

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
}
