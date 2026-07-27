import { z } from 'zod'

export const PREFERRED_FORMATS = ['video', 'written', 'either'] as const
export type PreferredFormat = (typeof PREFERRED_FORMATS)[number]

/** The first Top100 cohort. Anything earlier is a typo, not a cohort. */
const FIRST_COHORT_YEAR = 2015

/**
 * ~100 words. The bio feeds the interview card and the published page, so a
 * one-liner is not usable copy — but the message has to say so plainly rather
 * than just failing.
 */
const BIO_MIN_CHARS = 300
const BIO_MAX_CHARS = 1600

/** Checkboxes arrive from FormData as "on"; JSON clients may send "true". */
const consentField = z
  .union([z.literal('on'), z.literal('true'), z.literal(true)])
  .transform(() => true)

/** An untouched optional URL input posts as "", which is absent, not invalid. */
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((value) => value === '' || /^https?:\/\/\S+\.\S+/.test(value), {
    message: 'Enter a full URL starting with https://',
  })
  .default('')

export const applicationSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z.string().trim().max(40).default(''),
  country: z.string().trim().min(2, 'Enter your country').max(80),
  cohortYear: z.coerce
    .number()
    .int()
    .min(FIRST_COHORT_YEAR, 'Select the year you were recognised')
    .max(new Date().getFullYear() + 1),
  roleTitle: z.string().trim().max(140).default(''),
  organisation: z.string().trim().max(140).default(''),
  bio: z
    .string()
    .trim()
    .min(BIO_MIN_CHARS, 'Please write about 100 words so we have something to work with')
    .max(BIO_MAX_CHARS, 'Please keep this under about 250 words'),
  impactStory: z
    .string()
    .trim()
    .min(80, 'Tell us in a few sentences what this interview would be about')
    .max(2000),
  linkedinUrl: optionalUrl,
  otherLink: optionalUrl,
  preferredFormat: z.enum(PREFERRED_FORMATS),
  consentRecorded: consentField,
})

export type ApplicationInput = z.infer<typeof applicationSchema>

export const HEADSHOT_MAX_BYTES = 5 * 1024 * 1024

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * The browser-reported content type is attacker-controlled, so the file is
 * identified from its own leading bytes instead. Mirrors the hardening already
 * applied in app/api/upload-image/route.ts.
 */
export function sniffImageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length >= 8 && png.every((byte, index) => bytes[index] === byte)) {
    return 'image/png'
  }

  const riff = [0x52, 0x49, 0x46, 0x46]
  const webp = [0x57, 0x45, 0x42, 0x50]
  if (
    bytes.length >= 12 &&
    riff.every((byte, index) => bytes[index] === byte) &&
    webp.every((byte, index) => bytes[index + 8] === byte)
  ) {
    return 'image/webp'
  }

  return null
}

export function validateHeadshot(
  bytes: Uint8Array,
  size: number,
): { ok: true; extension: string; mime: string } | { ok: false; message: string } {
  if (size > HEADSHOT_MAX_BYTES) {
    return { ok: false, message: 'Your headshot must be 5 MB or smaller.' }
  }

  const mime = sniffImageType(bytes)
  if (!mime) {
    return { ok: false, message: 'Upload a JPG, PNG or WEBP image.' }
  }

  return { ok: true, extension: EXTENSION_BY_MIME[mime], mime }
}
