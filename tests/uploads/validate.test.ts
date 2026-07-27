import { describe, it, expect } from 'vitest'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  memberUploadPath,
  validateUpload,
} from '@/lib/uploads/validate'

const NOW = Date.parse('2026-07-27T12:00:00.000Z')

describe('MAX_UPLOAD_BYTES', () => {
  it('is 5 MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024)
  })
})

describe('validateUpload', () => {
  it('accepts a jpeg within the size cap', () => {
    expect(validateUpload({ type: 'image/jpeg', size: 1000, name: 'a.jpg' })).toEqual({ ok: true })
  })

  it('accepts png and webp', () => {
    expect(validateUpload({ type: 'image/png', size: 10, name: 'a.png' }).ok).toBe(true)
    expect(validateUpload({ type: 'image/webp', size: 10, name: 'a.webp' }).ok).toBe(true)
  })

  it('rejects a type that is not on the allowlist', () => {
    const result = validateUpload({ type: 'image/svg+xml', size: 10, name: 'a.svg' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/JPG, PNG or WebP/i)
  })

  it('rejects an executable disguised by name', () => {
    expect(validateUpload({ type: 'application/x-msdownload', size: 10, name: 'a.png' }).ok).toBe(false)
  })

  it('rejects an empty file', () => {
    expect(validateUpload({ type: 'image/png', size: 0, name: 'a.png' }).ok).toBe(false)
  })

  it('rejects a file over the cap', () => {
    const result = validateUpload({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1, name: 'a.png' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/5 ?MB/i)
  })

  it('accepts a file exactly at the cap', () => {
    expect(validateUpload({ type: 'image/png', size: MAX_UPLOAD_BYTES, name: 'a.png' }).ok).toBe(true)
  })

  it('exposes exactly three allowed types', () => {
    expect([...ALLOWED_IMAGE_TYPES].sort()).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})

describe('memberUploadPath', () => {
  it('namespaces the path under the member id', () => {
    expect(memberUploadPath('abc-123', 'Head Shot.JPG', NOW)).toMatch(/^members\/abc-123\//)
  })

  it('strips characters that could escape the prefix', () => {
    const path = memberUploadPath('abc-123', '../../etc/passwd.png', NOW)
    expect(path.startsWith('members/abc-123/')).toBe(true)
    expect(path).not.toContain('..')
    expect(path).not.toContain('/etc/')
  })

  it('preserves a normalised extension', () => {
    expect(memberUploadPath('abc-123', 'Head Shot.JPG', NOW).endsWith('.jpg')).toBe(true)
  })

  it('defaults the extension when the name has none', () => {
    expect(memberUploadPath('abc-123', 'headshot', NOW).endsWith('.jpg')).toBe(true)
  })

  it('produces different paths for different timestamps', () => {
    expect(memberUploadPath('abc-123', 'a.png', NOW)).not.toBe(memberUploadPath('abc-123', 'a.png', NOW + 1))
  })
})
