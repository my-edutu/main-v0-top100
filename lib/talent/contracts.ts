import type { TalentDraft, TalentFilters, TalentInterest, TalentRequestInput, TalentVisibilityInput } from './types'

export const TALENT_POLICY_VERSION = 'talent-discovery-2026-11-v1'
export const TALENT_INTERESTS: readonly TalentInterest[] = ['Employment', 'Internship', 'Scholarship', 'Fellowship', 'Research', 'Mentorship', 'Speaking', 'Project funding']
export const TALENT_SECTORS = ['Technology', 'Engineering', 'Health & life sciences', 'Business & finance', 'Education', 'Agriculture', 'Climate & sustainability', 'Law & public policy', 'Research', 'Creative industries', 'Social impact', 'Other'] as const
export const TALENT_WORK_MODES = ['Flexible', 'Remote', 'Hybrid', 'On-site'] as const
export const APPLICATION_STAGES = ['saved', 'preparing', 'applied', 'interview', 'offer', 'unsuccessful', 'withdrawn'] as const
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export class TalentInputError extends Error { constructor(message: string) { super(message); this.name = 'TalentInputError' } }

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TalentInputError('Please provide a valid form.')
  return value as Record<string, unknown>
}
function strict(value: Record<string, unknown>, keys: string[]) {
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new TalentInputError(`Unexpected field: ${key}`)
}
function text(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') throw new TalentInputError(`${field} must be text.`)
  const result = value.trim()
  if (result.length > max) throw new TalentInputError(`${field} must be ${max} characters or fewer.`)
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) throw new TalentInputError(`${field} contains unsupported characters.`)
  return result
}
function strings(value: unknown, field: string, max: number): string[] {
  if (!Array.isArray(value) || value.length > max) throw new TalentInputError(`${field} must contain at most ${max} items.`)
  const seen = new Set<string>()
  return value.map(item => text(item, field, 80)).filter(item => {
    const key = item.toLocaleLowerCase('en')
    if (!item || seen.has(key)) return false
    seen.add(key); return true
  })
}
export function isSafePublicUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && host.includes('.') && !host.includes(':') && !/^\d+(\.\d+){3}$/.test(host) && !['localhost', 'local', 'internal', 'test'].some(suffix => host === suffix || host.endsWith(`.${suffix}`))
  } catch { return false }
}
function link(value: unknown, field: string) {
  const result = text(value, field, 500)
  if (result && !isSafePublicUrl(result)) throw new TalentInputError(`${field} must be a public https link without embedded credentials.`)
  return result
}
export function emptyTalentDraft(): TalentDraft {
  return { headline: '', summary: '', sector: '', country: '', city: '', skills: [], languages: [], interests: [], workMode: 'Flexible', availability: '', experience: '', projects: [], education: [], portfolioUrl: '', linkedinUrl: '' }
}
export function parseTalentDraft(value: unknown): TalentDraft {
  const v = object(value); strict(v, Object.keys(emptyTalentDraft()))
  const workMode = text(v.workMode, 'Work preference', 30)
  if (!(TALENT_WORK_MODES as readonly string[]).includes(workMode)) throw new TalentInputError('Select a work preference.')
  const interests = strings(v.interests, 'Opportunity interests', 8)
  if (interests.some(item => !(TALENT_INTERESTS as readonly string[]).includes(item))) throw new TalentInputError('Choose a listed opportunity interest.')
  if (!Array.isArray(v.projects) || v.projects.length > 8) throw new TalentInputError('Add at most 8 projects.')
  if (!Array.isArray(v.education) || v.education.length > 8) throw new TalentInputError('Add at most 8 education entries.')
  return {
    headline: text(v.headline, 'Headline', 160), summary: text(v.summary, 'Introduction', 1600),
    sector: text(v.sector, 'Sector', 100), country: text(v.country, 'Country of residence', 100), city: text(v.city, 'City', 100),
    skills: strings(v.skills, 'Skills', 20), languages: strings(v.languages, 'Languages', 10), interests: interests as TalentInterest[],
    workMode: workMode as TalentDraft['workMode'], availability: text(v.availability, 'Availability', 160),
    experience: text(v.experience, 'Experience', 2400), portfolioUrl: link(v.portfolioUrl, 'Portfolio'), linkedinUrl: link(v.linkedinUrl, 'LinkedIn'),
    projects: v.projects.map((item) => {
      const p = object(item); strict(p, ['title', 'role', 'description', 'outcome', 'url'])
      const result = { title: text(p.title, 'Project title', 120), role: text(p.role, 'Your role', 160), description: text(p.description, 'Project description', 1200), outcome: text(p.outcome, 'Project outcome', 800), url: link(p.url, 'Project evidence link') }
      if (!result.title) throw new TalentInputError('Give each project a title, or remove the empty project.')
      return result
    }),
    education: v.education.map(item => {
      const e = object(item); strict(e, ['institution', 'qualification', 'field', 'year'])
      const result = { institution: text(e.institution, 'Institution', 160), qualification: text(e.qualification, 'Qualification', 160), field: text(e.field, 'Field of study', 160), year: text(e.year, 'Graduation year', 4) }
      if (result.year && !/^(19|20|21)\d{2}$/.test(result.year)) throw new TalentInputError('Use a four-digit graduation year.')
      if (!result.institution) throw new TalentInputError('Give each education entry an institution, or remove it.')
      return result
    }),
  }
}
export function publicationBlockedReason(draft: TalentDraft): string | null {
  if (draft.headline.length < 5) return 'Add a professional headline of at least 5 characters.'
  if (draft.summary.length < 30) return 'Add an introduction of at least 30 characters.'
  if (!draft.sector || !draft.country) return 'Add your sector and country of residence.'
  if (!draft.skills.length || !draft.interests.length) return 'Add at least one skill and one opportunity interest.'
  return null
}
export function profileCompleteness(draft: TalentDraft): number {
  const checks = [draft.headline.length >= 5, draft.summary.length >= 30, Boolean(draft.sector), Boolean(draft.country), draft.skills.length > 0, draft.interests.length > 0, draft.languages.length > 0, draft.projects.length > 0 || draft.experience.length > 0, draft.education.length > 0, Boolean(draft.availability)]
  return Math.round(checks.filter(Boolean).length / checks.length * 100)
}
export function parseTalentVisibility(value: unknown): TalentVisibilityInput {
  const v = object(value); strict(v, ['discoveryEnabled', 'introductionsEnabled', 'promotionEnabled', 'outreachEmailOptOut', 'policyVersion'])
  for (const key of ['discoveryEnabled', 'introductionsEnabled', 'promotionEnabled', 'outreachEmailOptOut']) if (typeof v[key] !== 'boolean') throw new TalentInputError('Choose valid visibility options.')
  if (v.policyVersion !== TALENT_POLICY_VERSION) throw new TalentInputError('Refresh the page to review the current privacy choices.')
  return v as TalentVisibilityInput
}
export function parseTalentFilters(params: URLSearchParams): TalentFilters {
  const q = (params.get('q') ?? '').trim().replace(/[,()%*\\'"<>]/g, ' ').slice(0, 100)
  const cursor = params.get('cursor') || null
  if (cursor && !UUID_PATTERN.test(cursor)) throw new TalentInputError('Invalid directory cursor.')
  const yearValue = params.get('year') ?? ''
  const year = /^(19|20|21)\d{2}$/.test(yearValue) ? Number(yearValue) : null
  const size = Number.parseInt(params.get('limit') ?? '24', 10)
  const clean = (key: string) => (params.get(key) ?? '').replace(/[,()%*\\'"<>]/g, ' ').trim().slice(0, 100)
  return { q, sector: clean('sector'), skill: clean('skill'), country: clean('country'), interest: clean('interest'), language: clean('language'), workMode: clean('workMode'), year, limit: Number.isFinite(size) ? Math.max(1, Math.min(size, 48)) : 24, cursor }
}
export function parseTalentRequest(value: unknown): TalentRequestInput {
  const v = object(value)
  strict(v, ['organisation', 'website', 'contactName', 'email', 'title', 'kind', 'description', 'skills', 'country', 'workMode', 'places', 'compensation', 'deadline', 'talentSlug', 'consent'])
  const result = {
    organisation: text(v.organisation, 'Organisation', 160), website: link(v.website, 'Organisation website'), contactName: text(v.contactName, 'Contact name', 120),
    email: text(v.email, 'Email', 254).toLowerCase(), title: text(v.title, 'Opportunity title', 160), kind: text(v.kind, 'Opportunity type', 40),
    description: text(v.description, 'Brief', 4000), skills: strings(v.skills, 'Required skills', 20), country: text(v.country, 'Location', 100),
    workMode: text(v.workMode, 'Work mode', 40), places: Number(v.places), compensation: text(v.compensation, 'Compensation or funding', 300),
    deadline: text(v.deadline, 'Deadline', 10), talentSlug: text(v.talentSlug, 'Talent reference', 180), consent: v.consent,
  }
  if (result.organisation.length < 2 || result.contactName.length < 2 || result.title.length < 5 || result.description.length < 30) throw new TalentInputError('Add your organisation, contact name and a clear opportunity brief.')
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result.email)) throw new TalentInputError('Add a valid contact email.')
  if (!(TALENT_INTERESTS as readonly string[]).includes(result.kind)) throw new TalentInputError('Choose a listed opportunity type.')
  if (!(TALENT_WORK_MODES as readonly string[]).includes(result.workMode)) throw new TalentInputError('Choose a work preference.')
  if (!Number.isInteger(result.places) || result.places < 1 || result.places > 1000) throw new TalentInputError('Number of places must be between 1 and 1,000.')
  if (!result.compensation) throw new TalentInputError('Explain the compensation or funding, including if unpaid.')
  if (result.deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(result.deadline) || Number.isNaN(Date.parse(result.deadline)) || new Date(result.deadline).toISOString().slice(0,10) !== result.deadline)) throw new TalentInputError('Use a valid deadline.')
  if (result.talentSlug && !/^[a-zA-Z0-9-]+$/.test(result.talentSlug)) throw new TalentInputError('Invalid talent reference.')
  if (v.consent !== true) throw new TalentInputError('Confirm that Top100 may contact you about this brief.')
  return result as TalentRequestInput
}
