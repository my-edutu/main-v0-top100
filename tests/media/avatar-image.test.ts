import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { InvalidAvatarError, processAvatar } from '@/lib/media/avatar-image'

describe('avatar image processing', () => {
  it('decodes, resizes and converts a portrait to a bucket-supported format', async () => {
    const original = await sharp({ create: { width: 1200, height: 1600, channels: 3, background: '#ff8800' } }).jpeg().toBuffer()
    const result = await processAvatar(original)
    const metadata = await sharp(result.data).metadata()
    expect(result.contentType).toBe('image/webp')
    expect(metadata.width).toBe(384)
    expect(metadata.height).toBe(512)
  })
  it('rejects corrupt bytes rather than uploading an unreadable original', async () => {
    await expect(processAvatar(Buffer.from('not a photo'))).rejects.toBeInstanceOf(InvalidAvatarError)
  })
  it('rejects SVG rather than passing it to the raster-only bucket', async () => {
    await expect(processAvatar(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" /></svg>'))).rejects.toBeInstanceOf(InvalidAvatarError)
  })
})
