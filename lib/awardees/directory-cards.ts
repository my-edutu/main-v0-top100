import type { Awardee } from '@/lib/awardees-shared'

export type DirectoryCard = Pick<Awardee,
  'awardee_id' | 'profile_id' | 'name' | 'slug' | 'country' | 'year' |
  'headline' | 'tagline' | 'bio' | 'course' | 'field_of_study' |
  'avatar_url' | 'email' | 'personal_email' | 'is_public'> & { socialLinks?: import('@/lib/profile-contact').SocialLink[] }

// Public directory cards do not need galleries, achievements or record metadata.
export function publicDirectoryCards(awardees: Awardee[]): DirectoryCard[] {
  return awardees.filter(person => person.is_public !== false && person.slug?.trim()).map(person => ({
    awardee_id: person.awardee_id, profile_id: person.profile_id,
    name: person.name, slug: person.slug, country: person.country, year: person.year,
    headline: person.headline, tagline: person.tagline, bio: person.bio?.slice(0, 280) ?? null,
    course: person.course, field_of_study: person.field_of_study,
    avatar_url: person.avatar_url, email: person.email,
    personal_email: person.personal_email, is_public: true,
  }))
}
