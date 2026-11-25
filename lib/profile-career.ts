import { z } from 'zod'

export const CAREER_TYPES = {
  startup: 'Startup I’m building',
  employer: 'Organization I work for',
}

export function organizationLinkedInUrl(value: string): string | null {
  try {
    const url = new URL(value)
    const company = url.pathname.match(/^\/company\/([a-z\d][a-z\d_-]*)\/?$/i)?.[1]
    if (url.protocol === 'https:' && ['linkedin.com', 'www.linkedin.com'].includes(url.hostname)
      && !url.port && !url.username && !url.password && company) {
      return `https://www.linkedin.com/company/${company}/`
    }
  } catch {
    return null
  }
  return null
}

const careerSchema = z.object({
  name: z.string().trim().min(1, 'Enter the organization name.').max(160),
  type: z.enum(['startup', 'employer']),
  role: z.string().trim().max(160),
  linkedinUrl: z.string().trim().max(500)
    .refine(value => !value || organizationLinkedInUrl(value) !== null, 'Use a LinkedIn company page link, such as https://www.linkedin.com/company/example/.')
    .transform(value => organizationLinkedInUrl(value) ?? ''),
  isPublic: z.boolean(),
})

export type ProfileCareer = z.infer<typeof careerSchema>
export const profileCareerSchema = careerSchema.nullable()

export function readProfileCareer(value: unknown): ProfileCareer | null {
  const parsed = profileCareerSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
