import { describe, expect, it } from 'vitest'

import { getMediaStorageConfig } from '@/lib/media/storage-config'
import { physicalR2BucketName } from '@/lib/media/storage'

describe('R2 media bucket routing', () => {
  const config = getMediaStorageConfig({
    MEDIA_STORAGE_PROVIDER: 'r2',
    CLOUDFLARE_R2_ACCOUNT_ID: 'account',
    CLOUDFLARE_R2_ACCESS_KEY_ID: 'access',
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'secret',
    CLOUDFLARE_R2_BUCKET: 'top100-afl-media',
    CLOUDFLARE_R2_PRIVATE_BUCKET: 'top100-afl-private',
    CLOUDFLARE_R2_PUBLIC_URL: 'https://media.example.com',
  })

  it('keeps portfolio sources and options in the private bucket', () => {
    expect(physicalR2BucketName('portfolio-sources', config)).toBe('top100-afl-private')
    expect(physicalR2BucketName('portfolio-options', config)).toBe('top100-afl-private')
  })

  it('routes public media and selected covers to the public bucket', () => {
    expect(physicalR2BucketName('awardee-images', config)).toBe('top100-afl-media')
    expect(physicalR2BucketName('portfolio-covers', config)).toBe('top100-afl-media')
  })
})
