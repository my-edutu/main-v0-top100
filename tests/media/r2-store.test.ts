import { describe, expect, it, vi } from 'vitest'

import { createR2MediaStore } from '@/lib/media/r2'

const config = {
  provider: 'r2' as const,
  accountId: 'account',
  accessKeyId: 'access',
  secretAccessKey: 'secret',
  bucket: 'top100-media',
  publicUrl: 'https://media.example.com',
}

describe('R2 media store', () => {
  it('uploads objects to the configured bucket and returns the public URL', async () => {
    const send = vi.fn(async () => ({}))
    const store = createR2MediaStore(config, { send } as never)

    const result = await store.put('awardees/member-1/avatar.webp', Buffer.from('image'), {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    })

    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'top100-media',
      Key: 'awardees/member-1/avatar.webp',
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
    expect(result).toEqual({
      key: 'awardees/member-1/avatar.webp',
      url: 'https://media.example.com/awardees/member-1/avatar.webp',
    })
  })
})
