import { z } from 'zod'
import { SOCIAL_PLATFORMS } from './types'

const uuid = z.string().uuid()

export const draftInputSchema = z.object({
  awardeeId: uuid,
  platform: z.enum(SOCIAL_PLATFORMS),
  caption: z.string().trim().min(1).max(5000),
}).strict()

export type DraftInput = z.infer<typeof draftInputSchema>

export function parseDraftInput(value: unknown): DraftInput | null {
  const result = draftInputSchema.safeParse(value)
  return result.success ? result.data : null
}

const markPostedSchema = z.object({
  publicPostUrl: z.string().trim().url().max(2048).refine((value) => {
    try { return new URL(value).protocol === 'https:' } catch { return false }
  }).nullable().optional(),
}).strict()

export type MarkPostedInput = { publicPostUrl: string | null }

export function parseMarkPostedInput(value: unknown): MarkPostedInput | null {
  const result = markPostedSchema.safeParse(value)
  if (!result.success) return null
  return { publicPostUrl: result.data.publicPostUrl ?? null }
}

export const generateInputSchema = z.object({
  awardeeId: uuid,
  platform: z.enum(SOCIAL_PLATFORMS),
}).strict()

export function parseGenerateInput(value: unknown) {
  const result = generateInputSchema.safeParse(value)
  return result.success ? result.data : null
}
