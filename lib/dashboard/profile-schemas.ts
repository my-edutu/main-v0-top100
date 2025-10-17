import { z } from 'zod'

const urlSchema = z.string().url().optional().or(z.literal(''))

export const socialLinksSchema = z
  .object({
    website: urlSchema,
    linkedin: urlSchema,
    twitter: urlSchema,
    instagram: urlSchema,
    facebook: urlSchema,
    youtube: urlSchema,
    medium: urlSchema,
    threads: urlSchema,
  })
  .partial()


export const achievementSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3).max(120),
  description: z.string().max(280).optional().or(z.literal('')),
  organization: z.string().max(120).optional().or(z.literal('')),
  recognition_date: z.string().max(32).optional().or(z.literal('')),
  link: urlSchema,
})

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(120),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/i, 'Only letters, numbers and underscores')
    .optional()
    .or(z.literal('')),
  headline: z.string().max(160).optional().or(z.literal('')),

  bio: z.string().max(3000).optional().or(z.literal('')),
  currentSchool: z.string().max(160).optional().or(z.literal('')),
  fieldOfStudy: z.string().max(160).optional().or(z.literal('')),
  graduationYear: z
    .number({ invalid_type_error: 'Graduation year must be a number' })
    .int()
    .min(1950)
    .max(2100)
    .nullable()
    .optional(),
  location: z.string().max(160).optional().or(z.literal('')),
  avatarUrl: urlSchema,
  coverImageUrl: urlSchema,
  personalEmail: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(32).optional().or(z.literal('')),
  mentor: z.string().max(160).optional().or(z.literal('')),
  cohort: z.string().max(80).optional().or(z.literal('')),
  interests: z.array(z.string().max(60)).max(16).optional(),
  socialLinks: socialLinksSchema.optional(),
  achievements: z.array(achievementSchema).max(24).optional(),

  videoLinks: z.array(z.string().url()).max(8).optional(),
  isPublic: z.boolean().optional(),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .or(z.literal('')),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
