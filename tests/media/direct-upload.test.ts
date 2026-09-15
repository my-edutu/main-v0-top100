import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepareDirectUpload, signUploadTicket, verifyUploadTicket, validateDirectUpload } from '@/lib/media/direct-upload'

describe('private direct upload receipts', () => {
  afterEach(() => vi.unstubAllEnvs())
  const receipt = { key: 'incoming/member-1/file', userId: 'member-1', purpose: 'avatar' as const, size: 100, contentType: 'image/png', expires: Date.now() + 60_000 }
  it('accepts only the owning member and intended purpose', () => {
    const token = signUploadTicket(receipt, 'secret')
    expect(verifyUploadTicket(token, 'member-1', 'avatar', 'secret')).toEqual(receipt)
    expect(() => verifyUploadTicket(token, 'member-2', 'avatar', 'secret')).toThrow()
    expect(() => verifyUploadTicket(token, 'member-1', 'portrait', 'secret')).toThrow()
  })
  it('rejects tampering and expired receipts', () => {
    const token = signUploadTicket(receipt, 'secret')
    expect(() => verifyUploadTicket(token + 'x', 'member-1', 'avatar', 'secret')).toThrow()
    expect(() => verifyUploadTicket(signUploadTicket({ ...receipt, expires: 0 }, 'secret'), 'member-1', 'avatar', 'secret')).toThrow()
  })
  it('rejects unsupported content and oversized uploads', () => {
    expect(validateDirectUpload('avatar', 100, 'image/svg+xml')).toBe(false)
    expect(validateDirectUpload('avatar', 6 * 1024 * 1024, 'image/png')).toBe(false)
    expect(validateDirectUpload('portrait', 8 * 1024 * 1024, 'image/png')).toBe(true)
    expect(validateDirectUpload('avatar', -1, 'image/png')).toBe(false)
  })
  it('signs a bounded private upload without exposing credentials', async () => {
    const settings = {
      MEDIA_STORAGE_PROVIDER: 'r2', CLOUDFLARE_R2_ACCOUNT_ID: 'account',
      CLOUDFLARE_R2_ACCESS_KEY_ID: 'access', CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'secret',
      CLOUDFLARE_R2_BUCKET: 'public', CLOUDFLARE_R2_PRIVATE_BUCKET: 'private',
      CLOUDFLARE_R2_PUBLIC_URL: 'https://media.example.com',
    }
    for (const [name, value] of Object.entries(settings)) vi.stubEnv(name, value)
    const result = await prepareDirectUpload('member-1', 'avatar', 100, 'image/png')
    const url = new URL(result.url)
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-length')
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type')
    expect(result.url).not.toContain('secret')
    expect(verifyUploadTicket(result.ticket, 'member-1', 'avatar', 'secret').size).toBe(100)
    expect(url.hostname + url.pathname).toContain('private')
  })
})
