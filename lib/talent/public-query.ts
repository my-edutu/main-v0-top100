import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { parseTalentDraft, emptyTalentDraft } from './contracts'
import { talentDiscoveryEnabled } from './features'
import type { TalentCard, TalentFilters, TalentPage, TalentPublicProfile } from './types'

type PublicRow = { profile_id: string; slug: string; name: string; avatar_url: string | null; year: string | null; published: Record<string, unknown>; published_revision: number; introductions_enabled: boolean; updated_at: string }
const COLUMNS = 'profile_id,slug,name,avatar_url,year,published,published_revision,introductions_enabled,updated_at'
export function toTalentCard(row: PublicRow): TalentCard {
  const d = parseTalentDraft({ ...emptyTalentDraft(), ...row.published })
  return { id: row.profile_id, slug: row.slug, name: row.name, avatarUrl: row.avatar_url, year: row.year, headline: d.headline, sector: d.sector, country: d.country, skills: d.skills.slice(0, 3), interests: d.interests, workMode: d.workMode, availability: d.availability, updatedAt: row.updated_at }
}
export async function getTalentPage(filters: TalentFilters): Promise<TalentPage> {
  if (!talentDiscoveryEnabled()) return { people: [], nextCursor: null, total: 0 }
  const db = createAdminClient()
  function query(head = false) {
    let q = db.from('talent_public_directory').select(COLUMNS, { count: 'exact', head })
    if (filters.q) q = q.ilike('search_text', `%${filters.q}%`)
    if (filters.sector) q = q.ilike('sector', filters.sector)
    if (filters.country) q = q.ilike('country', filters.country)
    if (filters.skill) q = q.contains('skill_keys', [filters.skill.toLocaleLowerCase('en')])
    if (filters.interest) q = q.contains('interests', [filters.interest])
    if (filters.language) q = q.contains('language_keys', [filters.language.toLocaleLowerCase('en')])
    if (filters.workMode) q = q.eq('work_mode', filters.workMode)
    if (filters.year !== null) q = q.eq('year', String(filters.year))
    return q
  }
  let pageQuery = query().order('profile_id', { ascending: true }).limit(filters.limit + 1)
  if (filters.cursor) pageQuery = pageQuery.gt('profile_id', filters.cursor)
  const [page, count] = await Promise.all([pageQuery, query(true)])
  if (page.error) throw page.error
  if (count.error) throw count.error
  const rows = (page.data ?? []) as unknown as PublicRow[]
  const hasMore = rows.length > filters.limit
  const visible = rows.slice(0, filters.limit)
  return { people: visible.map(toTalentCard), nextCursor: hasMore ? visible[visible.length - 1].profile_id : null, total: count.count ?? 0 }
}
export async function getPromotedTalent(): Promise<TalentCard[]> {
  if (!talentDiscoveryEnabled()) return []
  const { data, error } = await createAdminClient()
    .from('talent_public_directory')
    .select(COLUMNS)
    .eq('promotion_enabled', true)
    .order('updated_at', { ascending: false })
    .order('profile_id')
    .limit(3)
  if (error) throw error
  return ((data ?? []) as unknown as PublicRow[]).map(toTalentCard)
}

export const getPublishedTalentProfile = cache(async function (slug: string): Promise<TalentPublicProfile | null> {
  if (!talentDiscoveryEnabled()) return null
  try {
    const db = createAdminClient()
    const result = await db.from('talent_public_directory').select(COLUMNS).eq('slug', slug).maybeSingle()
    if (result.error || !result.data) return null
    const row = result.data as unknown as PublicRow
    const checks = await db.from('talent_verifications').select('scope,claim_index,method,checked_at').eq('profile_id', row.profile_id).eq('published_revision', row.published_revision).is('revoked_at', null).order('checked_at', { ascending: false }).limit(30)
    if (checks.error) return null
    return { ...toTalentCard(row), details: parseTalentDraft({ ...emptyTalentDraft(), ...row.published }), introductionsEnabled: row.introductions_enabled, publishedRevision: row.published_revision, checks: (checks.data ?? []).map(v => ({ scope: String(v.scope), claimIndex: v.claim_index, method: String(v.method), checkedAt: String(v.checked_at) })) }
  } catch {
    // Keep recognition profiles available when the talent service is unavailable.
    return null
  }
})
