import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { renderPortfolioCover } from '@/lib/portfolio-cover/render-cover'

describe('deterministic Top100 magazine cover renderer', () => {
  it('renders an exact vertical cover and omits missing fields', async () => {
    const portrait = await sharp({ create: { width: 1024, height: 1536, channels: 3, background: '#b9b0a4' } }).png().toBuffer()
    const output = await renderPortfolioCover({
      portrait,
      memberName: 'Ada Lovelace',
      tailoring: 'female',
      variant: 'executive-charcoal',
      fields: { school: 'University of Lagos', cgpa: '4.82 / 5.0' },
    })
    const metadata = await sharp(output).metadata()
    expect(metadata.width).toBe(1600)
    expect(metadata.height).toBe(2000)
    expect(output.toString('utf8')).not.toContain('undefined')
  }, 15000)

  it('uses one canonical branded cover style for legacy variant inputs', async () => {
    const portrait = await sharp({ create: { width: 1024, height: 1536, channels: 3, background: '#b9b0a4' } }).png().toBuffer()
    const common = { portrait, memberName: 'Ada Lovelace', tailoring: 'female' as const, fields: {} }
    const charcoal = await renderPortfolioCover({ ...common, variant: 'executive-charcoal' })
    const ivory = await renderPortfolioCover({ ...common, variant: 'leadership-ivory' })
    expect(charcoal.equals(ivory)).toBe(true)
  }, 15000)

  it('keeps the simplified footer readable with an orange brand accent', async () => {
    const portrait = await sharp({ create: { width: 1024, height: 1536, channels: 3, background: '#f5f5f4' } }).png().toBuffer()
    const output = await renderPortfolioCover({
      portrait,
      memberName: 'Ada Lovelace',
      tailoring: 'female',
      variant: 'executive-charcoal',
      fields: { fieldOfStudy: 'Engineering', country: 'Nigeria', degreeClass: 'First Class' },
    })
    const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true })
    const rgbAt = (x: number, y: number) => Array.from(data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3))

    expect(rgbAt(20, 1940).every(channel => channel < 40)).toBe(true)
    const accent = rgbAt(80, 1995)
    expect(accent[0]).toBeGreaterThan(180)
    expect(accent[0]).toBeGreaterThan(accent[2] * 2)
  }, 15000)
})
