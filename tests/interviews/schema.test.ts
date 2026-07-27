import { describe, expect, it } from 'vitest'

import {
  applicationSchema,
  HEADSHOT_MAX_BYTES,
  sniffImageType,
  validateHeadshot,
} from '@/lib/interviews/schema'

const valid = {
  fullName: 'Amara Okonkwo',
  email: 'Amara@Example.com',
  phone: '+234 800 000 0000',
  country: 'Nigeria',
  cohortYear: '2025',
  roleTitle: 'Founder',
  organisation: 'Clinic Labs',
  bio: 'A'.repeat(320),
  impactStory: 'B'.repeat(120),
  linkedinUrl: 'https://linkedin.com/in/amara',
  otherLink: '',
  preferredFormat: 'video',
  consentRecorded: 'on',
}

describe('applicationSchema', () => {
  it('accepts a valid payload and normalises email and cohort year', () => {
    const result = applicationSchema.parse(valid)
    expect(result.email).toBe('amara@example.com')
    expect(result.cohortYear).toBe(2025)
    expect(result.consentRecorded).toBe(true)
  })

  it('rejects an invalid email', () => {
    expect(() => applicationSchema.parse({ ...valid, email: 'not-an-email' })).toThrow()
  })

  it('rejects a missing consent checkbox', () => {
    const { consentRecorded, ...withoutConsent } = valid
    expect(() => applicationSchema.parse(withoutConsent)).toThrow()
  })

  it('rejects a bio that is too short to be usable', () => {
    expect(() => applicationSchema.parse({ ...valid, bio: 'Too short.' })).toThrow()
  })

  it('rejects a cohort year before the programme existed', () => {
    expect(() => applicationSchema.parse({ ...valid, cohortYear: '1998' })).toThrow()
  })

  it('treats an empty optional link as absent rather than invalid', () => {
    const result = applicationSchema.parse({ ...valid, linkedinUrl: '', otherLink: '' })
    expect(result.linkedinUrl).toBe('')
    expect(result.otherLink).toBe('')
  })

  it('rejects a link that is not a url', () => {
    expect(() => applicationSchema.parse({ ...valid, linkedinUrl: 'linkedin' })).toThrow()
  })
})

describe('sniffImageType', () => {
  it('identifies a JPEG by magic bytes', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
  })

  it('identifies a PNG by magic bytes', () => {
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      'image/png',
    )
  })

  it('identifies a WEBP by its RIFF container', () => {
    const bytes = new Uint8Array(16)
    bytes.set([0x52, 0x49, 0x46, 0x46], 0) // RIFF
    bytes.set([0x57, 0x45, 0x42, 0x50], 8) // WEBP
    expect(sniffImageType(bytes)).toBe('image/webp')
  })

  it('returns null for a renamed non-image', () => {
    expect(sniffImageType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull() // %PDF
  })
})

describe('validateHeadshot', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])

  it('accepts a JPEG under the size cap', () => {
    expect(validateHeadshot(jpeg, 1024)).toEqual({ ok: true, extension: 'jpg', mime: 'image/jpeg' })
  })

  it('rejects a file over the size cap', () => {
    expect(validateHeadshot(jpeg, HEADSHOT_MAX_BYTES + 1).ok).toBe(false)
  })

  it('rejects a file whose bytes are not an allowed image', () => {
    expect(validateHeadshot(new Uint8Array([0x25, 0x50, 0x44, 0x46]), 1024).ok).toBe(false)
  })
})
