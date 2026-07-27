import { createAdminClient } from '@/lib/supabase/server'
import type { AwardeeCandidate } from '@/lib/interviews/matching'
import type { InterviewRow } from '@/lib/interviews/mappers'

export const INTERVIEW_SELECT = `
  id, slug, title, format, video_id, duration_seconds, thumbnail_url,
  pull_quote, summary, body, awardee_id, awardee_name, country, cohort_year,
  topics, featured, status, published_at, sort_order, application_id,
  awardee:awardees ( slug )
`

/**
 * Reads never throw. A missing table (environment without the migration) or an
 * unreachable Supabase must degrade to "no interviews yet" so the apply funnel
 * on /interviews keeps working. Same defensive posture as app/api/youtube/route.ts.
 */
export async function getPublishedInterviews(): Promise<InterviewRow[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('interviews')
      .select(INTERVIEW_SELECT)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false })

    if (error) {
      console.error('[interviews] getPublishedInterviews failed:', error.message)
      return []
    }

    return (data ?? []) as unknown as InterviewRow[]
  } catch (error) {
    console.error('[interviews] getPublishedInterviews threw:', error)
    return []
  }
}

export async function getInterviewBySlug(slug: string): Promise<InterviewRow | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('interviews')
      .select(INTERVIEW_SELECT)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (error) {
      console.error('[interviews] getInterviewBySlug failed:', error.message)
      return null
    }

    return (data as unknown as InterviewRow) ?? null
  } catch (error) {
    console.error('[interviews] getInterviewBySlug threw:', error)
    return null
  }
}

export async function getPublishedSlugs(): Promise<Array<{ slug: string; published_at: string | null }>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('interviews')
      .select('slug, published_at')
      .eq('status', 'published')

    if (error) {
      console.error('[interviews] getPublishedSlugs failed:', error.message)
      return []
    }

    return data ?? []
  } catch (error) {
    console.error('[interviews] getPublishedSlugs threw:', error)
    return []
  }
}

/**
 * Narrow the directory to plausible matches before matching in memory: an exact
 * email hit, or anyone sharing the applicant's surname. Pulling the whole
 * directory on every submission would not scale, and matching in SQL would make
 * the rules untestable.
 */
export async function getAwardeeCandidates(
  email: string,
  fullName: string,
): Promise<AwardeeCandidate[]> {
  try {
    const supabase = createAdminClient()
    const surname = fullName.trim().split(/\s+/).slice(-1)[0] ?? ''

    // PostgREST's .or() treats commas as separators, so a name containing one
    // would silently corrupt the filter. Strip anything that could break out.
    const safeSurname = surname.replace(/[,()*]/g, '')
    const safeEmail = email.replace(/[,()*]/g, '')

    const filters = [`email.ilike.${safeEmail}`]
    if (safeSurname.length >= 2) {
      filters.push(`name.ilike.%${safeSurname}%`)
    }

    const { data, error } = await supabase
      .from('awardees')
      .select('id, name, email, year')
      .or(filters.join(','))
      .limit(200)

    if (error) {
      console.error('[interviews] getAwardeeCandidates failed:', error.message)
      return []
    }

    return (data ?? []) as AwardeeCandidate[]
  } catch (error) {
    console.error('[interviews] getAwardeeCandidates threw:', error)
    return []
  }
}

const DUPLICATE_WINDOW_DAYS = 30

/** Stops a double-tapped submit button, and a reapplication while one is open. */
export async function findRecentPendingApplication(email: string): Promise<{ id: string } | null> {
  try {
    const supabase = createAdminClient()
    const since = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('interview_applications')
      .select('id')
      .ilike('email', email)
      .eq('status', 'pending')
      .gte('created_at', since)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[interviews] findRecentPendingApplication failed:', error.message)
      return null
    }

    return data ?? null
  } catch (error) {
    console.error('[interviews] findRecentPendingApplication threw:', error)
    return null
  }
}
