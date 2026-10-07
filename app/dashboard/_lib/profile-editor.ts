import type { ProfileUpdateDraft } from './profile-wizard'
export const PROFILE_TEXT_LIMITS = { headline: 160, field: 160, location: 160, organization: 160, bio: 2000 } as const
export function validateProfileDraft(draft: ProfileUpdateDraft): string | null {
  for (const key of Object.keys(PROFILE_TEXT_LIMITS) as Array<keyof typeof PROFILE_TEXT_LIMITS>) {
    if (draft[key].length > PROFILE_TEXT_LIMITS[key]) return `${key === 'bio' ? 'BIO' : key} must be ${PROFILE_TEXT_LIMITS[key].toLocaleString('en-US')} characters or fewer.`
  }
  return null
}
