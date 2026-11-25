import { z } from 'zod'

function linkedInProfile(value: string): string | null {
  try {
    const url = new URL(value)
    const handle = /^\/in\/([a-z0-9][a-z0-9_%.-]*)\/?$/i.exec(url.pathname)?.[1]
    if (url.protocol === 'https:' && ['linkedin.com', 'www.linkedin.com'].includes(url.hostname)
      && !url.username && !url.password && !url.port && handle) {
      return `https://www.linkedin.com/in/${handle}/`
    }
  } catch {
    return null
  }
  return null
}

export const founderListingSchema = z.object({
  startup: z.string().trim().min(1, 'Enter your startup name.').max(160),
  summary: z.string().trim().min(1, 'Describe what you’re building.').max(400),
  linkedinUrl: z.string().trim().max(500)
    .refine(value => linkedInProfile(value) !== null, 'Enter your LinkedIn profile link, such as https://www.linkedin.com/in/your-name/.')
    .transform(value => linkedInProfile(value)!),
})

export type FounderListing = z.infer<typeof founderListingSchema>
export type FounderDirectoryEntry = FounderListing & { profileId: string; founderName: string }
