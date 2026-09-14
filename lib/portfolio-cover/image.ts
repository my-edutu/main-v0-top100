import sharp from 'sharp'

export const PORTFOLIO_SOURCE_MAX_BYTES = 8 * 1024 * 1024

type PortraitValidation = { ok: true } | { ok: false; code: 'invalid_type' | 'too_large' | 'invalid_image' }

function matchesMime(buffer: Buffer, mime: string) {
  if (mime === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (mime === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  return false
}

export function validatePortraitUpload(buffer: Buffer, mime: string): PortraitValidation {
  if (buffer.byteLength > PORTFOLIO_SOURCE_MAX_BYTES) return { ok: false, code: 'too_large' }
  if (!matchesMime(buffer, mime)) return { ok: false, code: 'invalid_type' }
  return { ok: true }
}

export async function preparePortrait(source: Buffer) {
  return sharp(source, { failOn: 'error' })
    .rotate()
    .resize(1024, 1536, { fit: 'cover', position: 'centre', withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

export async function prepareEditMask() {
  // GPT Image requires an alpha channel and treats transparent pixels as the
  // editable area. Keep the face and hair opaque, while leaving the lower
  // wardrobe region transparent for the suit edit.
  const width = 1024
  const height = 1536
  const pixels = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    const alpha = y < 800 ? 255 : 0
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      pixels[offset] = 255
      pixels[offset + 1] = 255
      pixels[offset + 2] = 255
      pixels[offset + 3] = alpha
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer()
}
