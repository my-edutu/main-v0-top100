import type { ImportIssue, ImportRecord } from './awardee-workbook'

export type ExistingAwardee = {
  id: string
  name: string
  slug: string
  email: string | null
  profile_id: string | null
  metadata: Record<string, unknown> | null
  country: string | null
  course: string | null
  bio: string | null
  year: number | null
  image_url: string | null
  tagline: string | null
  headline: string | null
  cgpa: string | null
  social_links: Record<string, string> | null
}

export type ImportAction = {
  type: 'insert' | 'update'
  source: string[]
  name: string
  email: string
  id?: string
  payload: Record<string, unknown>
}

export type ImportReview = {
  actions: ImportAction[]
  issues: ImportIssue[]
  summary: { new: number; fill: number; unchanged: number; skipped: number }
}

const contentFields = [
  'country', 'course', 'bio', 'year', 'image_url', 'tagline', 'headline', 'cgpa',
] as const

function slugBase(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'awardee'
}

export function planReviewedImport(records: ImportRecord[], existing: ExistingAwardee[], initialIssues: ImportIssue[] = []): ImportReview {
  const issues = [...initialIssues]
  const actions: ImportAction[] = []
  const emails = new Map<string, ExistingAwardee[]>()
  const externalIds = new Map<string, ExistingAwardee[]>()
  const usedSlugs = new Set(existing.map((row) => row.slug))
  for (const row of existing) {
    const email = row.email?.trim().toLowerCase()
    if (email) emails.set(email, [...(emails.get(email) ?? []), row])
    const externalId = String(row.metadata?.import_external_id ?? '').trim()
    if (externalId) externalIds.set(externalId, [...(externalIds.get(externalId) ?? []), row])
  }
  let unchanged = 0
  let skipped = initialIssues.length
  for (const record of records) {
    const byId = record.externalId ? (externalIds.get(record.externalId) ?? []) : []
    const byEmail = emails.get(record.email) ?? []
    const candidates = new Set([...byId, ...byEmail])
    if (candidates.size > 1 || byId.length > 1 || byEmail.length > 1) {
      issues.push({ source: record.sources[0], message: 'Existing records disagree on winner ID or email; review manually.' })
      skipped++
      continue
    }
    const match = [...candidates][0]
    if (match && match.email?.trim().toLowerCase() !== record.email) {
      issues.push({ source: record.sources[0], message: 'Winner ID matches an existing record with a different email; review manually.' })
      skipped++
      continue
    }
    if (match?.profile_id) {
      issues.push({ source: record.sources[0], message: 'This winner has claimed their account; spreadsheet changes were not applied.' })
      skipped++
      continue
    }
    if (match) {
      const patch: Record<string, unknown> = {}
      for (const field of contentFields) {
        const incoming = record[field]
        if (incoming !== undefined && incoming !== null && incoming !== '' && !match[field]) patch[field] = incoming
      }
      const social = { ...(match.social_links ?? {}) }
      for (const [key, value] of Object.entries(record.social_links ?? {})) {
        if (!social[key]) social[key] = value
      }
      if (Object.keys(social).length > Object.keys(match.social_links ?? {}).length) patch.social_links = social
      if (record.externalId && !match.metadata?.import_external_id) {
        patch.metadata = { ...(match.metadata ?? {}), import_external_id: record.externalId }
      }
      if (!Object.keys(patch).length) {
        unchanged++
        continue
      }
      actions.push({ type: 'update', id: match.id, name: record.name, email: record.email, source: record.sources, payload: patch })
      continue
    }
    let slug = slugBase(record.name)
    let suffix = 2
    while (usedSlugs.has(slug)) slug = `${slugBase(record.name)}-${suffix++}`
    usedSlugs.add(slug)
    const payload: Record<string, unknown> = {
      name: record.name,
      email: record.email,
      slug,
      is_public: false,
      social_links: record.social_links ?? {},
      metadata: record.externalId ? { import_external_id: record.externalId } : {},
    }
    for (const field of contentFields) {
      if (record[field] !== undefined && record[field] !== null && record[field] !== '') payload[field] = record[field]
    }
    actions.push({ type: 'insert', name: record.name, email: record.email, source: record.sources, payload })
  }
  return {
    actions,
    issues,
    summary: {
      new: actions.filter((action) => action.type === 'insert').length,
      fill: actions.filter((action) => action.type === 'update').length,
      unchanged,
      skipped,
    },
  }
}
