import sharp from "sharp"
import { describe, expect, it } from "vitest"

import { AVATAR_PRESET, PHOTO_PRESET, processUpload } from "@/lib/image-processing"

/**
 * Solid colour blocks compress to almost nothing, which would let a "did it
 * shrink?" assertion pass for the wrong reason. Noise keeps the byte counts
 * honest.
 */
const noisyJpeg = async (width: number, height: number) => {
  const pixels = Buffer.alloc(width * height * 3)
  for (let i = 0; i < pixels.length; i += 1) {
    pixels[i] = (i * 2654435761) % 256
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 100 })
    .toBuffer()
}

/** Generating and re-encoding multi-megapixel fixtures outruns the 5s default. */
const SLOW = 30_000

describe("processUpload", () => {
  it("downscales an oversized photo to the preset's longest edge", async () => {
    const original = await noisyJpeg(3000, 2000)

    const result = await processUpload(original, PHOTO_PRESET)
    const meta = await sharp(result.data).metadata()

    expect(meta.width).toBe(PHOTO_PRESET.maxDimension)
    expect(meta.height).toBe(Math.round((PHOTO_PRESET.maxDimension * 2000) / 3000))
  }, SLOW)

  it("caps the longest edge regardless of orientation", async () => {
    const original = await noisyJpeg(1000, 4000)

    const result = await processUpload(original, PHOTO_PRESET)
    const meta = await sharp(result.data).metadata()

    expect(meta.height).toBe(PHOTO_PRESET.maxDimension)
    expect(meta.width).toBe(PHOTO_PRESET.maxDimension / 4)
  }, SLOW)

  it("never upscales an image that is already small", async () => {
    const original = await noisyJpeg(320, 240)

    const result = await processUpload(original, PHOTO_PRESET)
    const meta = await sharp(result.data).metadata()

    expect(meta.width).toBe(320)
    expect(meta.height).toBe(240)
  })

  it("re-encodes to webp and reports a matching content type and extension", async () => {
    const result = await processUpload(await noisyJpeg(800, 600), PHOTO_PRESET)

    expect((await sharp(result.data).metadata()).format).toBe("webp")
    expect(result.contentType).toBe("image/webp")
    expect(result.extension).toBe("webp")
  })

  it("produces meaningfully fewer bytes than the original upload", async () => {
    const original = await noisyJpeg(3000, 2000)

    const result = await processUpload(original, PHOTO_PRESET)

    expect(result.data.byteLength).toBeLessThan(original.byteLength / 4)
  }, SLOW)

  it("uses a tighter bound for avatars than for photos", async () => {
    expect(AVATAR_PRESET.maxDimension).toBeLessThan(PHOTO_PRESET.maxDimension)

    const original = await noisyJpeg(3000, 3000)
    const avatar = await processUpload(original, AVATAR_PRESET)

    expect((await sharp(avatar.data).metadata()).width).toBe(AVATAR_PRESET.maxDimension)
  }, SLOW)

  it("honours EXIF orientation so rotated phone photos are not stored sideways", async () => {
    // Orientation 6 means "rotate 90deg clockwise on display", so a stored
    // 1000x500 frame is meant to be seen as 500x1000.
    const original = await sharp(await noisyJpeg(1000, 500))
      .withMetadata({ orientation: 6 })
      .toBuffer()

    const result = await processUpload(original, PHOTO_PRESET)
    const meta = await sharp(result.data).metadata()

    expect(meta.width).toBe(500)
    expect(meta.height).toBe(1000)
  })

  it("strips EXIF, which carries GPS coordinates on phone uploads", async () => {
    const original = await sharp(await noisyJpeg(800, 600))
      .withExifMerge({ IFD0: { Copyright: "somebody" } })
      .toBuffer()

    const result = await processUpload(original, PHOTO_PRESET)

    expect((await sharp(result.data).metadata()).exif).toBeUndefined()
  })

  it("passes SVG through untouched rather than rasterising it", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    )

    const result = await processUpload(svg, PHOTO_PRESET, "image/svg+xml")

    expect(result.data.equals(svg)).toBe(true)
    expect(result.contentType).toBe("image/svg+xml")
    expect(result.extension).toBe("svg")
  })

  it("keeps an animated gif animated instead of flattening it to one frame", async () => {
    const frame = (value: number) =>
      sharp(Buffer.alloc(20 * 20 * 3, value), { raw: { width: 20, height: 20, channels: 3 } })
        .png()
        .toBuffer()
    const gif = await sharp([await frame(40), await frame(200)], { join: { animated: true } })
      .gif()
      .toBuffer()

    const result = await processUpload(gif, PHOTO_PRESET)

    expect((await sharp(result.data, { animated: true }).metadata()).pages).toBe(2)
  })

  it("falls back to the original bytes when the payload is not a decodable image", async () => {
    const notAnImage = Buffer.from("this is definitely not an image")

    const result = await processUpload(notAnImage, PHOTO_PRESET, "image/jpeg")

    expect(result.data.equals(notAnImage)).toBe(true)
    expect(result.contentType).toBe("image/jpeg")
  })
})
