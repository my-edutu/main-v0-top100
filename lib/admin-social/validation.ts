import { z } from 'zod'
import { SOCIAL_PLATFORMS } from './types'

const uuid = z.guid()

export const draftInputSchema = z
  .object({
    awardeeId: uuid,
    platform: z.enum(SOCIAL_PLATFORMS),
    caption: z.string().trim().min(1).max(5000),
    signature: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    expectedUpdatedAt: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
  })
  .strict()

export type DraftInput = z.infer<typeof draftInputSchema>

export function parseDraftInput(value: unknown): DraftInput | null {
  const result = draftInputSchema.safeParse(value)
  return result.success ? result.data : null
}

const markPostedSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
    publicPostUrl: z
      .string()
      .trim()
      .url()
      .max(2048)
      .refine((value) => {
        try {
          return new URL(value).protocol === 'https:'
        } catch {
          return false
        }
      })
      .nullable()
      .optional(),
  })
  .strict()

export type MarkPostedInput = {
  publicPostUrl: string | null
  expectedUpdatedAt?: string
}

export function parseMarkPostedInput(value: unknown): MarkPostedInput | null {
  const result = markPostedSchema.safeParse(value)
  if (!result.success) return null
  return {
    publicPostUrl: result.data.publicPostUrl ?? null,
    ...(result.data.expectedUpdatedAt
      ? { expectedUpdatedAt: result.data.expectedUpdatedAt }
      : {}),
  }
}

export const generateInputSchema = z
  .object({
    awardeeId: uuid,
    platform: z.enum(SOCIAL_PLATFORMS),
  })
  .strict()

export function parseGenerateInput(value: unknown) {
  const result = generateInputSchema.safeParse(value)
  return result.success ? result.data : null
}
