import sharp from "sharp"

/**
 * Normalises user uploads before they reach Supabase Storage.
 *
 * Every upload route used to hand Supabase the raw `File` bytes, so a 5MB
 * portrait straight off a phone was stored — and later served — at 4000px to
 * fill a 200px thumbnail. That was the bulk of the cached-egress overage that
 * restricted the project. Storage is the wrong place to keep originals we
 * never display, so uploads are capped and re-encoded on the way in.
 *
 * This is deliberately the *second* line of defence. `next/image` already
 * downscales on read; capping on write means the CDN miss is cheap too, and
 * that a single scraper hitting object URLs directly cannot pull megabytes.
 */

export type ImagePreset = {
  /** Longest edge in pixels. Images already smaller are left alone. */
  maxDimension: number
  /** webp quality, 1-100. */
  quality: number
}

/** Displayed at 56-256px. 512 leaves room for retina without storing a poster. */
export const AVATAR_PRESET: ImagePreset = { maxDimension: 512, quality: 82 }

/** Covers, galleries, event heroes — the widest they ever render is ~1200px. */
export const PHOTO_PRESET: ImagePreset = { maxDimension: 1600, quality: 80 }

export type ProcessedImage = {
  data: Buffer
  contentType: string
  extension: string
}

/**
 * SVGs are already tiny and vector; rasterising one would make it bigger and
 * blurrier. Pass them straight through.
 */
const isSvg = (contentType?: string) => contentType?.includes("svg") ?? false

export async function processUpload(
  input: ArrayBuffer | Buffer | Uint8Array,
  preset: ImagePreset,
  contentType?: string,
): Promise<ProcessedImage> {
  const original = Buffer.isBuffer(input) ? input : Buffer.from(input as ArrayBuffer)

  if (isSvg(contentType)) {
    return { data: original, contentType: "image/svg+xml", extension: "svg" }
  }

  try {
    // `animated` keeps every frame of a gif; for a still it is a no-op.
    //
    // `rotate()` with no argument applies the EXIF orientation tag and then
    // drops it. Without this, portrait phone photos land sideways, because
    // re-encoding discards the tag the browser was relying on.
    const data = await sharp(original, { animated: true })
      .rotate()
      .resize(preset.maxDimension, preset.maxDimension, {
        fit: "inside",
        withoutEnlargement: true,
      })
      // webp beats jpeg at this quality and, unlike avif, is cheap enough to
      // encode inside a request. Metadata is dropped by default, which also
      // strips the GPS coordinates phone cameras attach.
      .webp({ quality: preset.quality })
      .toBuffer()

    return { data, contentType: "image/webp", extension: "webp" }
  } catch (error) {
    // A corrupt or unsupported payload should not cost the user their upload;
    // the size cap in the route still applies to the original bytes.
    console.warn("[image-processing] falling back to original bytes", error)
    return {
      data: original,
      contentType: contentType ?? "application/octet-stream",
      extension: contentType?.split("/")[1] ?? "bin",
    }
  }
}
