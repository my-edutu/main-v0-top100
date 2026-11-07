import { createAdminClient } from '@/lib/supabase/server'
import { validateSocialLinks, type SocialLink } from '@/lib/profile-contact'
import { assessProfileQuality, type QualitySource } from './profile-quality'

const columns = 'awardee_id,profile_id,name,slug,is_public,year,cohort,bio,headline,country,avatar_url,cover_image_url,portfolio_cover_url,social_links,achievements'

export async function loadProfileQuality(ids?: string[]) {
  const db = createAdminClient()
  const assessments = []
  for (let offset = 0; ;) {
    let query = db.from('awardee_directory').select(columns).eq('is_public', true).order('awardee_id')
    if (ids) query = query.in('awardee_id', ids)
    const { data, error } = await query.range(offset, offset + 99)
    if (error) throw new Error('Unable to load public profiles.', { cause: error })
    if (!data?.length) break
    const rows = data as QualitySource[]
    const linked = [...new Set(rows.flatMap(row => row.profile_id ? [row.profile_id] : []))]
    const consent = new Map<string, Record<string, string>>()
    if (linked.length) {
      const { data: profiles, error: consentError } = await db.from('profiles')
        .select('id,notification_prefs').in('id', linked)
      if (consentError) throw new Error('Unable to load profile link preferences.', { cause: consentError })
      for (const profile of profiles ?? []) {
        const prefs = profile.notification_prefs
        if (prefs?.socialLinksConsent === true && !validateSocialLinks(prefs.socialLinks)) {
          consent.set(profile.id, Object.fromEntries((prefs.socialLinks as SocialLink[]).map(link => [link.platform, link.url])))
        }
      }
    }
    for (const row of rows) {
      const links = row.profile_id ? consent.get(row.profile_id) ?? {} : row.social_links ?? {}
      assessments.push(assessProfileQuality(row, links))
    }
    offset += rows.length
  }
  return assessments
}
