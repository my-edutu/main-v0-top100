import { z } from 'zod'
import { validateSpotlightCaption, type SpotlightPlatform } from './spotlight'

export const EDITORIAL_CAMPAIGN_TAG = '#Top100AfricaFutureLeaders'
export const EDITORIAL_THRESHOLD = 85

export const editorialOptions = z
  .object({
    focus: z.string().trim().max(800),
    angle: z.enum([
      'from-source',
      'education',
      'entrepreneurship',
      'technology',
      'leadership',
      'community-impact',
    ]),
    tone: z.enum(['editorial', 'celebratory', 'journalistic', 'inspirational']),
    length: z.enum(['short', 'standard', 'extended']),
  })
  .strict()

export type EditorialOptions = z.infer<typeof editorialOptions>
export type ApprovedStory = {
  revision: string
  source_signature: string
  story: string
  approved_at: string
}

export const editorialRubric = z
  .object({
    announcement: z.boolean(),
    storytelling: z.boolean(),
    factualAccuracy: z.boolean(),
    mission: z.boolean(),
    profileCta: z.boolean(),
    readability: z.boolean(),
    feedback: z.string().trim().min(1).max(500),
  })
  .strict()

export const editorialRubricWeights = {
  announcement: 20,
  storytelling: 20,
  factualAccuracy: 20,
  mission: 15,
  profileCta: 15,
  readability: 10,
} as const

export function scoreEditorialReview(review: z.infer<typeof editorialRubric>) {
  return Object.entries(editorialRubricWeights).reduce(
    (total, [key, weight]) =>
      total + (review[key as keyof typeof editorialRubricWeights] ? weight : 0),
    0,
  )
}

export type EditorialReview = {
  score: number
  passes: boolean
  feedback: string
}

const hashtag = /(?<!\S)#[\p{L}\p{N}_]+/gu
const profileInvitation =
  'Explore the official Top100 Africa Future Leaders profile:'

export function formatEditorialMaster(body: string, url: string, name: string) {
  const heading = `Meet ${name.trim()}`
  const prose = body
    .replace(/https?:\/\/[^\s<>]+/gi, '')
    .replace(hashtag, '')
    .trim()
  const [firstLine, ...rest] = prose.split(/\r?\n/)
  const cleanFirstLine = firstLine.replace(/^#+[ \t]+/, '').replace(/[*_]/g, '')
  const opening = cleanFirstLine.slice(0, heading.length).toLowerCase()
  const suffix = cleanFirstLine.slice(heading.length).trimStart()
  const repeatedHeading =
    opening === heading.toLowerCase() && (!suffix || /^[:.!–—-]/.test(suffix))
  return [
    heading,
    repeatedHeading ? rest.join('\n').trim() : prose,
    profileInvitation,
    url,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function withEditorialLink(story: string, url: string, compact = false) {
  // The model supplies prose. The application supplies the only outgoing URL.
  const prose = story.replace(/https?:\/\/[^\s<>]+/gi, '').trim()
  return [
    prose,
    compact ? 'Explore the official profile:' : profileInvitation,
    url,
    prose.includes(EDITORIAL_CAMPAIGN_TAG) ? '' : EDITORIAL_CAMPAIGN_TAG,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function editorialIssue(
  story: string,
  url: string,
  name: string,
  platform?: SpotlightPlatform,
) {
  if (platform) {
    const issue = validateSpotlightCaption(platform, story, url)
    if (issue) return issue
  }
  const links = story.match(/https?:\/\/[^\s<>]+/gi) ?? []
  if (links.length !== 1 || links[0] !== url)
    return 'Include the exact official profile link once.'
  if (!/official\s+(?:Top100 Africa Future Leaders\s+)?profile/i.test(story))
    return 'Invite readers to visit the official profile.'
  const heading = `Meet ${name.trim()}`
  if (!platform) {
    if (story.trim().split(/\r?\n/, 1)[0].trim() !== heading)
      return `Start the master story with “${heading}”.`
    if (story.match(hashtag)) return 'Remove hashtags from the master story.'
    return null
  }
  if (!story.includes(EDITORIAL_CAMPAIGN_TAG))
    return 'Include the AFL campaign hashtag.'
  const opening = story.trimStart().slice(0, heading.length).toLowerCase()
  const afterName = story.trimStart().slice(heading.length, heading.length + 1)
  if (
    opening === heading.toLowerCase() &&
    (!afterName || /[\s\p{P}]/u.test(afterName))
  )
    return null
  const announcement = story.split('\n\n').slice(0, 2).join(' ').slice(0, 700)
  const normalize = (value: string) =>
    value.toLowerCase().replace(/\s+/g, ' ').trim()
  if (
    !normalize(announcement).includes(normalize(name)) ||
    !/(?:Top100 Africa Future Leaders|\bAFL\b)/i.test(announcement) ||
    !/\b(?:featur\w+|spotlight\w*|celebrat\w+|introduc\w+|recognis\w+|recogniz\w+)\b/i.test(
      announcement,
    )
  ) {
    return 'Open with AFL announcing the awardee by full name.'
  }
  return null
}
