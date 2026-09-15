import { normalizeCode } from '@/lib/access-codes'

type SignupAwardee = {
  country: string | null
  course: string | null
  bio: string | null
  image_url: string | null
}

export function buildSignupProfile(input: {
  userId: string
  email: string
  name: string
  headline: string
  slug: string
  accessCode: string
  awardee: SignupAwardee
}) {
  const { userId, email, name, headline, slug, accessCode, awardee } = input

  return {
    id: userId,
    user_id: userId,
    email,
    role: 'user',
    full_name: name,
    headline: headline || 'Top100 Africa Future Leaders awardee',
    membership_status: 'pending',
    slug,
    is_public: true,
    access_code: normalizeCode(accessCode),
    location: awardee.country ?? null,
    field: awardee.course ?? null,
    field_of_study: awardee.course ?? null,
    bio: awardee.bio ?? null,
    avatar_url: awardee.image_url ?? null,
    bio_update_count: 0,
    bio_update_limit: 2,
    notification_prefs: {
      recruiterVisible: true,
      emailVisible: false,
      opportunityAlerts: true,
      magazineAlerts: true,
      messageAlerts: true,
      eventReminders: true,
    },
  }
}
