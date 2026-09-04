import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { preparePortrait, validatePortraitUpload } from '@/lib/portfolio-cover/image'

async function jpegBuffer(width = 900, height = 1200) {
  return sharp({ create: { width, height, channels: 3, background: '#c9a56a' } }).jpeg().toBuffer()
}

describe('portfolio cover portrait preparation', () => {
  it('accepts a real portrait image and emits a normalized vertical PNG', async () => {
    const source = await jpegBuffer()
    expect(validatePortraitUpload(source, 'image/jpeg')).toEqual({ ok: true })

    const output = await preparePortrait(source)
    const metadata = await sharp(output).metadata()
    expect(metadata.format).toBe('png')
    expect(metadata.width).toBe(1024)
    expect(metadata.height).toBe(1536)
  })

  it('rejects invalid MIME claims and oversized uploads', async () => {
    const source = await jpegBuffer()
    expect(validatePortraitUpload(source, 'image/png')).toEqual({ ok: false, code: 'invalid_type' })
    expect(validatePortraitUpload(Buffer.alloc(8 * 1024 * 1024 + 1), 'image/jpeg')).toEqual({ ok: false, code: 'too_large' })
  })
})
