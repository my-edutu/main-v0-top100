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
  const svg = `<svg width="1024" height="1536" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1536" fill="black"/><rect x="0" y="800" width="1024" height="736" fill="white"/></svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}
