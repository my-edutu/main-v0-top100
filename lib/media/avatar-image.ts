import sharp from 'sharp'
import { AVATAR_PRESET, type ProcessedImage } from '@/lib/image-processing'

export class InvalidAvatarError extends Error {}

/** Only decoded raster images reach the public avatar bucket. */
export async function processAvatar(input: ArrayBuffer | Buffer): Promise<ProcessedImage> {
  try {
    const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input)
    const image = sharp(bytes, { limitInputPixels: 40_000_000 })
    const metadata = await image.metadata()
    if (!metadata.format || !['jpeg', 'png', 'webp', 'gif', 'avif', 'heif'].includes(metadata.format)) {
      throw new InvalidAvatarError('Choose a JPG, PNG or WebP photo.')
    }
    const data = await image.rotate().resize(AVATAR_PRESET.maxDimension, AVATAR_PRESET.maxDimension, {
      fit: 'inside', withoutEnlargement: true,
    }).webp({ quality: AVATAR_PRESET.quality }).toBuffer()
    return { data, contentType: 'image/webp', extension: 'webp' }
  } catch {
    throw new InvalidAvatarError('This photo could not be read. Export it as JPG, PNG or WebP and try again.')
  }
}
