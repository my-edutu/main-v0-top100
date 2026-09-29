import { createAdminClient } from '@/lib/supabase/server'
import { mapPublicAwardee } from './profile'
import type { PublicAwardee, SocialDraftStatus, SocialPlatform, SocialShareDraft } from './types'

export const PUBLIC_AWARDEE_SELECT = 'awardee_id,profile_id,slug,name,bio,headline,country,field_of_study,cohort,year,achievements,impact_projects,lives_impacted,awards_received,updated_at,portfolio_cover_url,avatar_url,cover_image_url,is_public'
export const SOCIAL_DRAFT_SELECT = 'id,awardee_id,profile_id,platform,caption,status,publish_state,publish_error,linkedin_post_urn,snapshot_profile_updated_at,snapshot_name,snapshot_bio,snapshot_facts,snapshot_profile_url,snapshot_image_url,snapshot_image_source,created_by,updated_by,created_at,updated_at,marked_posted_by,marked_posted_at,public_post_url'

export async function loadPublicAwardee(awardeeId: string, origin: string): Promise<PublicAwardee | null> {
  const db = createAdminClient()
  const { data, error } = await db.from('awardee_directory')
    .select(PUBLIC_AWARDEE_SELECT)
    .eq('awardee_id', awardeeId)
    .eq('is_public', true)
    .maybeSingle()
  if (error) throw new Error('Could not load awardee profile.')
  if (!data) return null
  const profile = mapPublicAwardee(data, origin)
  if (!profile.awardeeId || !profile.slug || !profile.name) return null
  return profile
}

export function mapSocialDraft(row: Record<string, unknown>): SocialShareDraft {
  return {
    id: String(row.id ?? ''),
    awardeeId: String(row.awardee_id ?? ''),
    profileId: typeof row.profile_id === 'string' ? row.profile_id : null,
    platform: row.platform as SocialPlatform,
    caption: String(row.caption ?? ''),
    status: row.status as SocialDraftStatus,
    publishState: (row.publish_state ?? 'ready') as SocialShareDraft['publishState'],
    publishError: typeof row.publish_error === 'string' ? row.publish_error : null,
    publishStartedAt: typeof row.publish_started_at === 'string' ? row.publish_started_at : null,
    linkedinPostUrn: typeof row.linkedin_post_urn === 'string' ? row.linkedin_post_urn : null,
    snapshotProfileUpdatedAt: typeof row.snapshot_profile_updated_at === 'string' ? row.snapshot_profile_updated_at : null,
    publicSnapshot: {
      name: String(row.snapshot_name ?? ''),
      bio: String(row.snapshot_bio ?? ''),
      headline: String((row.snapshot_facts as Record<string, unknown> | null)?.headline ?? ''),
      country: String((row.snapshot_facts as Record<string, unknown> | null)?.country ?? ''),
      fieldOfStudy: String((row.snapshot_facts as Record<string, unknown> | null)?.fieldOfStudy ?? ''),
      cohort: String((row.snapshot_facts as Record<string, unknown> | null)?.cohort ?? ''),
      year: typeof (row.snapshot_facts as Record<string, unknown> | null)?.year === 'number' ? (row.snapshot_facts as Record<string, number>).year : null,
      achievements: Array.isArray((row.snapshot_facts as Record<string, unknown> | null)?.achievements) ? (row.snapshot_facts as Record<string, unknown[]>).achievements as SocialShareDraft['publicSnapshot']['achievements'] : [],
      impactProjects: typeof (row.snapshot_facts as Record<string, unknown> | null)?.impactProjects === 'number' ? (row.snapshot_facts as Record<string, number>).impactProjects : null,
      livesImpacted: typeof (row.snapshot_facts as Record<string, unknown> | null)?.livesImpacted === 'number' ? (row.snapshot_facts as Record<string, number>).livesImpacted : null,
      awardsReceived: typeof (row.snapshot_facts as Record<string, unknown> | null)?.awardsReceived === 'number' ? (row.snapshot_facts as Record<string, number>).awardsReceived : null,
      updatedAt: typeof (row.snapshot_facts as Record<string, unknown> | null)?.updatedAt === 'string' ? (row.snapshot_facts as Record<string, string>).updatedAt : null,
      profileUrl: String(row.snapshot_profile_url ?? ''),
      imageUrl: typeof row.snapshot_image_url === 'string' ? row.snapshot_image_url : null,
      imageSource: row.snapshot_image_source as PublicAwardee['imageSource'],
    },
    createdBy: typeof row.created_by === 'string' ? row.created_by : '',
    updatedBy: typeof row.updated_by === 'string' ? row.updated_by : '',
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    markedPostedBy: typeof row.marked_posted_by === 'string' ? row.marked_posted_by : null,
    markedPostedAt: typeof row.marked_posted_at === 'string' ? row.marked_posted_at : null,
    publicPostUrl: typeof row.public_post_url === 'string' ? row.public_post_url : null,
  }
}
