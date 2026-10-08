import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
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
    const output = await renderPortfolioCover({ portrait, memberName: 'Gabriel Kwaku Agbeshie', fields: {} })
    const { data, info } = await sharp(output)
      .extract({ left: 266, top: 873, width: 548, height: 91 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    let darkTextPixels = 0

    for (let offset = 0; offset < data.length; offset += info.channels) {
      if (data[offset] < 60 && data[offset + 1] < 60 && data[offset + 2] < 60) darkTextPixels += 1
    }

    expect(darkTextPixels).toBeGreaterThan(500)
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

// A fresh process avoids fonts registered by other renderer tests.
it('renders distinct letters without any system fonts instead of missing-glyph squares', async () => {
  const folder = mkdtempSync(path.join(tmpdir(), 'cover-fontless-'))
  const config = path.join(folder, 'fonts.conf')
  writeFileSync(config, '<fontconfig></fontconfig>')
  try {
    const renderer = pathToFileURL(path.join(process.cwd(), 'lib/portfolio-cover/render-cover.ts')).href
    const script = `
      import sharp from 'sharp';
      import { renderPortfolioCover } from ${JSON.stringify(renderer)};
      const portrait = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#fff' } }).png().toBuffer();
      const results = [];
      for (const memberName of ['IIIIIIII', 'WWWWWWWW']) {
        const cover = await renderPortfolioCover({ portrait, memberName, fields: {} });
        results.push((await sharp(cover).extract({ left:266, top:873, width:548, height:91 }).png().toBuffer()).toString('base64'));
      }
      process.stdout.write(JSON.stringify(results));
    `
    const images: string[] = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
      encoding: 'utf8', env: { ...process.env, FONTCONFIG_FILE: config, FONTCONFIG_PATH: folder, XDG_CACHE_HOME: folder }, timeout: 20000,
    }))
    const widths = await Promise.all(images.map(async encoded => {
      const { data, info } = await sharp(Buffer.from(encoded, 'base64')).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      const xs: number[] = []
      for (let offset = 0; offset < data.length; offset += info.channels) {
        if (data[offset] < 60 && data[offset + 1] < 60 && data[offset + 2] < 60) xs.push((offset / info.channels) % info.width)
      }
      expect(xs.length).toBeGreaterThan(0)
      return Math.max(...xs) - Math.min(...xs)
    }))
    expect(widths[1]).toBeGreaterThan(widths[0] * 2)
  } finally { rmSync(folder, { recursive: true, force: true }) }
}, 30000)
