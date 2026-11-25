import { z } from 'zod'
import { communityApplicationSchema } from './community-application'

export const communityRoles = {
  volunteer: 'Community Volunteer',
  connector: 'Alumni Connector',
  mentor: 'Career Mentor',
  speaker: 'Speaker or Workshop Host',
} as const

export const communityCategories = {
  education: 'Education and STEM',
  careers: 'Careers and employability',
  technology: 'Technology and entrepreneurship',
  climate: 'Climate and environment',
  wellbeing: 'Health and wellbeing',
  community: 'Community outreach',
} as const

const legacyCommunityDetails = z.object({
  version: z.undefined().optional(),
  roles: z.array(z.enum(Object.keys(communityRoles) as (keyof typeof communityRoles)[])).min(1).max(Object.keys(communityRoles).length),
  categories: z.array(z.enum(Object.keys(communityCategories) as (keyof typeof communityCategories)[])).min(1).max(6),
  full_name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254),
  country_code: z.string().regex(/^[A-Z]{2}$/),
  location: z.string().trim().min(2).max(200),
  availability: z.enum(['weekdays', 'weekends', 'flexible']),
  contribution: z.string().trim().min(5).max(500),
}).refine(({ roles, categories }) =>
  new Set(roles).size === roles.length && new Set(categories).size === categories.length
)

const communityDetails = z.union([communityApplicationSchema, legacyCommunityDetails])
export type CommunityDetails = z.infer<typeof communityDetails>
export const interestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.enum(['mentor', 'volunteer', 'programme']),
    activity_id: z.guid().nullable(),
    consent: z.literal(true),
  }).refine(x => x.kind === 'programme' ? x.activity_id !== null : x.activity_id === null),
  z.object({
    kind: z.literal('community'),
    activity_id: z.null(),
    consent: z.literal(true),
    community_details: communityDetails,
  }),
])
