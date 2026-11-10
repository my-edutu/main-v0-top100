const SPEAKER_STATUSES = new Set(['draft', 'published', 'archived'])
const URL_FIELDS = ['portrait_url', 'website_url', 'linkedin_url', 'social_url'] as const

const cleanUrl = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new Error('Speaker links must be valid URLs')
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Speaker links must use http or https')
  return url.toString()
}

export const sanitizeSpeaker = (body: Record<string, unknown>, isUpdate = false) => {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') : ''
  if (!isUpdate && !name) throw new Error('Speaker name is required')
  if (!isUpdate && !slug) throw new Error('Speaker slug is required')

  const result: Record<string, unknown> = {
    name: name || undefined,
    slug: slug || undefined,
    role: typeof body.role === 'string' && body.role.trim() ? body.role.trim() : null,
    organisation: typeof body.organisation === 'string' && body.organisation.trim() ? body.organisation.trim() : null,
    biography: typeof body.biography === 'string' && body.biography.trim() ? body.biography.trim() : null,
    status: typeof body.status === 'string' && SPEAKER_STATUSES.has(body.status) ? body.status : 'draft',
  }
  for (const field of URL_FIELDS) result[field] = cleanUrl(body[field])
  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined))
}
