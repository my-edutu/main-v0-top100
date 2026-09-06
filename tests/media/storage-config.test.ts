import { describe, expect, it } from 'vitest'

import {
  getMediaStorageConfig,
  mediaObjectKey,
  portfolioGenerationMessage,
} from '@/lib/media/storage-config'

describe('media storage configuration', () => {
  it('uses Supabase by default so legacy media keeps working', () => {
    expect(getMediaStorageConfig({})).toEqual({ provider: 'supabase' })
  })

  it('requires the R2 connection settings when R2 is selected', () => {
    expect(() =>
      getMediaStorageConfig({ MEDIA_STORAGE_PROVIDER: 'r2' }),
    ).toThrow(/CLOUDFLARE_R2_ACCOUNT_ID/)
  })

  it('returns a complete R2 configuration when all required settings exist', () => {
    expect(
      getMediaStorageConfig({
        MEDIA_STORAGE_PROVIDER: 'r2',
        CLOUDFLARE_R2_ACCOUNT_ID: 'account',
        CLOUDFLARE_R2_ACCESS_KEY_ID: 'access',
        CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'secret',
        CLOUDFLARE_R2_BUCKET: 'top100-media',
        CLOUDFLARE_R2_PRIVATE_BUCKET: 'top100-private',
        CLOUDFLARE_R2_PUBLIC_URL: 'https://media.example.com/',
      }),
    ).toEqual({
      provider: 'r2',
      accountId: 'account',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      bucket: 'top100-media',
      privateBucket: 'top100-private',
      publicUrl: 'https://media.example.com',
    })
  })

  it('builds stable namespaced keys without allowing path traversal', () => {
    expect(mediaObjectKey('awardees', '../member', 'avatar.png')).toBe(
      'awardees/member/avatar.png',
    )
  })

  it('creates a queue payload containing identifiers only', () => {
    expect(
      portfolioGenerationMessage({
        generationId: 'generation-1',
        memberId: 'member-1',
        attempt: 1,
      }),
    ).toEqual({
      type: 'portfolio-cover.generate',
      generationId: 'generation-1',
      memberId: 'member-1',
      attempt: 1,
    })
  })
})
