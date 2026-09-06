import { z } from 'zod'

import type { PortfolioCoverFields } from './types'

const optionalText = (max: number) => z.string().trim().max(max).optional()

const cgpa = z
  .string()
  .trim()
  .refine(value => {
    const match = value.match(/^(\d(?:\.\d{1,2})?)\s*\/\s*([45])(?:\.0{1,2})?$/)
    return Boolean(match && Number(match[1]) <= Number(match[2]))
  }, 'Use a CGPA within a 4.0 or 5.0 scale.')
  .optional()

export const portfolioCoverFieldsSchema = z
  .object({
    name: optionalText(120),
    school: optionalText(160),
    cgpa,
    degreeClass: optionalText(80),
    fieldOfStudy: optionalText(120),
    country: optionalText(80),
    cohort: optionalText(40),
    headline: optionalText(180),
    impactStatement: optionalText(420),
  })
  .strict()

export const portfolioCoverRequestSchema = z
  .object({
    tailoring: z.enum(['male', 'female']),
    consent: z.literal(true),
    fields: portfolioCoverFieldsSchema.optional(),
  })
  .strict()

export function normalizePortfolioCoverFields(input: Partial<Record<keyof PortfolioCoverFields, unknown>>) {
  const values: Record<string, unknown> = {}
  for (const key of Object.keys(portfolioCoverFieldsSchema.shape)) {
    const value = input[key as keyof PortfolioCoverFields]
    if (typeof value === 'string' && value.trim()) values[key] = value.trim()
  }
  return portfolioCoverFieldsSchema.parse(values)
}
