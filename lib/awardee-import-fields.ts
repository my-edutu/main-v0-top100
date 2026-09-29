// Shared browser-safe field vocabulary for the admin mapper and server parser.
export const IMPORT_FIELDS = [
  'externalId', 'name', 'email', 'country', 'course', 'bio', 'year',
  'imageUrl', 'tagline', 'headline', 'linkedin', 'twitter', 'instagram',
  'facebook', 'website', 'cgpa',
] as const

export type ImportField = (typeof IMPORT_FIELDS)[number]
