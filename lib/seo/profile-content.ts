/** Publish existing public facts as readable content, without rewriting claims. */
type ProfileFacts = {
  is_public?: boolean
  name?: string | null
  slug?: string | null
  bio?: string | null
  headline?: string | null
  tagline?: string | null
  current_school?: string | null
  field_of_study?: string | null
  country?: string | null
  location?: string | null
  cohort?: string | null
  year?: unknown
  cgpa?: string | null
}
export type BiographySection = { heading: string | null; paragraphs: string[] }
export type ProfileDetail = { label: string; value: string; source: keyof ProfileFacts }

const SECTION_LABELS: Record<string, string> = {
  'education level': 'Education level',
  'graduation year': 'Graduation year',
  'cgpa / academic achievement': 'Academic achievement',
  'first-class / bgs status': 'Academic recognition',
  'leadership journey': 'Leadership journey',
  'notable impact': 'Notable impact',
  'area of impact': 'Area of impact',
  'people benefited': 'People benefited',
}
const text = (value: string | null | undefined) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
const fact = (value: string | null | undefined) => /^(?:n\/?a|none|null|undefined|not (?:available|provided|applicable)|[-–—])$/i.test(text(value)) ? '' : text(value)

export function profileYear(value: unknown): string | null {
  const year = typeof value === 'number' || typeof value === 'string' ? String(value).trim() : ''
  return /^(?:19|20|21)\d{2}$/.test(year) ? year : null
}

export function biographySections(bio: string | null | undefined): BiographySection[] {
  const sections: BiographySection[] = []
  for (const paragraph of (bio || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)) {
    const colon = paragraph.indexOf(':')
    const heading = colon >= 0 ? SECTION_LABELS[text(paragraph.slice(0, colon)).toLowerCase()] : undefined
    if (heading && paragraph.slice(colon + 1).trim()) {
      sections.push({ heading, paragraphs: [paragraph.slice(colon + 1).trim()] })
    } else {
      // Unknown labels, URLs, and continuation paragraphs remain unchanged.
      if (!sections.length) sections.push({ heading: null, paragraphs: [] })
      sections[sections.length - 1].paragraphs.push(paragraph)
    }
  }
  return sections
}

export function buildProfileContent(profile: ProfileFacts) {
  const details: ProfileDetail[] = []
  const sections: BiographySection[] = []
  const reviewFlags: string[] = []
  const empty = { title: '', description: '', introduction: '', biography: '', recognition: '', year: null as string | null, headline: '', details, sections, reviewFlags }
  if (profile.is_public !== true) return empty

  const name = fact(profile.name)
  const realName = Boolean(name) && !/^awardee\s+\d+$/i.test(name)
  const year = profileYear(profile.year)
  const cohort = fact(profile.cohort)
  const cohortYear = profileYear(cohort)
  const recognition = cohort && !cohortYear
    ? cohort
    : `Top100 Africa Future Leaders${cohortYear || year ? ` · Class of ${cohortYear || year}` : ''}`
  const rawHeadline = fact(profile.headline)
  const headline = /^(?:top\s*100|awardee\b|class of\b)/i.test(rawHeadline) ? '' : rawHeadline
  const background = fact(profile.field_of_study) || fact(profile.current_school)
  const add = (label: string, value: string, source: keyof ProfileFacts) => {
    if (value && !details.some(item => item.value.toLowerCase() === value.toLowerCase())) details.push({ label, value, source })
  }
  add('Background / field of study', background, fact(profile.field_of_study) ? 'field_of_study' : 'current_school')
  // The legacy view copies course into current_school. Avoid an institution claim.
  add('Additional background', fact(profile.current_school), 'current_school')
  add('Profile highlight', fact(profile.tagline), 'tagline')
  add('Country / location', fact(profile.country), 'country')
  add('Location', fact(profile.location), 'location')
  add('Academic record', fact(profile.cgpa), 'cgpa')

  sections.push(...biographySections(profile.bio))
  const introduction = realName ? `${name} is featured in ${recognition.replace(/ · /g, ", ")}.${!sections.length && background ? ` Background: ${background}.` : ''}` : ''
  const biography = [introduction, ...sections.flatMap(section => [section.heading ? `${section.heading}:` : '', ...section.paragraphs])].filter(Boolean).join('\n\n')
  const title = [name, headline || background || recognition].filter(Boolean).join(' — ')
  // Metadata summarizes the same facts shown in the header and detail rows.
  const narrative = sections.find(section => section.heading === 'Leadership journey')?.paragraphs[0] || sections.find(section => !section.heading)?.paragraphs[0] || ''
  const description = [
    headline ? `${name} — ${headline}.` : `${name}.`,
    background ? `Background: ${background}.` : '',
    fact(profile.country) ? `Location: ${fact(profile.country)}.` : '',
    !headline && !background ? text(narrative) : '',
    `Featured in ${recognition.replace(/ · /g, ', ')}.`,
  ].filter(Boolean).join(' ')
  if (!realName) reviewFlags.push('missing-real-name')
  if (!sections.length) reviewFlags.push('missing-biography')
  if (!headline) reviewFlags.push('missing-specific-headline')
  if (!fact(profile.country)) reviewFlags.push('missing-country-or-location')
  if (!year && !cohortYear && !cohort) reviewFlags.push('missing-cohort-year')
  if (cohortYear && year && cohortYear !== year) reviewFlags.push('cohort-year-needs-review')
  const academicSection = sections.find(section => section.heading === 'Academic achievement')
  const academicValue = academicSection?.paragraphs[0].match(/\b[0-5](?:\.\d+)?\b/)?.[0]
  const narrativeValues = [...(profile.bio || '').matchAll(/\b([0-5](?:\.\d+)?)\s*(?:\/\s*[45](?:\.0+)?)?\s*CGPA\b/gi)].map(match => Number(match[1]))
  if (academicValue && narrativeValues.some(value => value !== Number(academicValue))) reviewFlags.push('academic-figures-need-review')
  return { title, description, introduction, biography, recognition, year: cohortYear || year, headline, details, sections, reviewFlags }
}
