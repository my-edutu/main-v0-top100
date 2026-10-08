import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { renderPortfolioCover } from '@/lib/portfolio-cover/render-cover'

describe('deterministic Top100 magazine cover renderer', () => {
  it('renders the supplied 2026 banner at its original 4:5 dimensions', async () => {
    const portrait = await sharp({ create: { width: 1024, height: 1536, channels: 3, background: '#b9b0a4' } }).png().toBuffer()
    const output = await renderPortfolioCover({ portrait, memberName: 'Ada Lovelace', fields: {} })
    const metadata = await sharp(output).metadata()

    expect(metadata.width).toBe(1080)
    expect(metadata.height).toBe(1350)
    expect(output.toString('utf8')).not.toContain('undefined')
  }, 15000)

  it('places the uploaded portrait inside the template image area and keeps the banner outside it', async () => {
    const portrait = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#d02080' } }).png().toBuffer()
    const output = await renderPortfolioCover({ portrait, memberName: 'Ada Lovelace', fields: {} })
    const { data, info } = await sharp(output).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const pixelAt = (x: number, y: number) => Array.from(data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3))

    expect(pixelAt(300, 400)).toEqual([208, 32, 128])
    expect(pixelAt(100, 400)).not.toEqual([208, 32, 128])
  }, 15000)

  it('renders the awardee name in the template nameplate', async () => {
    const portrait = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#d02080' } }).png().toBuffer()
    const common = { portrait, fields: {} }
    const ada = await renderPortfolioCover({ ...common, memberName: 'Ada Lovelace' })
    const grace = await renderPortfolioCover({ ...common, memberName: 'Grace Hopper' })
    const crop = { left: 266, top: 873, width: 548, height: 91 }
    const [adaNameplate, graceNameplate] = await Promise.all([
      sharp(ada).extract(crop).png().toBuffer(),
      sharp(grace).extract(crop).png().toBuffer(),
    ])

    expect(adaNameplate.equals(graceNameplate)).toBe(false)
  }, 15000)

  it('keeps long awardee names inside the nameplate instead of clipping across the cover', async () => {
    const portrait = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#d02080' } }).png().toBuffer()
    const [longNameCover, referenceCover] = await Promise.all([
      renderPortfolioCover({ portrait, memberName: 'W'.repeat(120), fields: {} }),
      renderPortfolioCover({ portrait, memberName: 'Ada Lovelace', fields: {} }),
    ])
    const [longName, reference] = await Promise.all([
      sharp(longNameCover).removeAlpha().raw().toBuffer(),
      sharp(referenceCover).removeAlpha().raw().toBuffer(),
    ])
    const width = 1080
    const channels = 3
    let changedPixelsOutsideNameplate = 0

    for (let y = 873; y < 964; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (x >= 266 && x < 814) continue
        const offset = (y * width + x) * channels
        if (longName[offset] !== reference[offset] || longName[offset + 1] !== reference[offset + 1] || longName[offset + 2] !== reference[offset + 2]) {
          changedPixelsOutsideNameplate += 1
        }
      }
    }

    expect(changedPixelsOutsideNameplate).toBe(0)
  }, 15000)
})
