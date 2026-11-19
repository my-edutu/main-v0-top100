import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { renderSpotlightImage } from '@/lib/admin-social/spotlight-image'
describe('Instagram image conversion', () => {
  it('adds the awardee identity and brand below the photo on a feature card', async () => {
    const png = await sharp({ create: { width: 50, height: 80, channels: 3, background: '#ee8833' } }).png().toBuffer()
    const image = await renderSpotlightImage('https://media.top100afl.com/cover.png', vi.fn(async () => new Response(png)), { name: 'Amara & Partners <Leader>', headline: 'Building community', country: 'Nigeria', year: 2026 })
    const { data } = await sharp(image).extract({ left: 0, top: 1260, width: 1080, height: 90 }).raw().toBuffer({ resolveWithObject: true })
    // The branded footer is dark ink; the legacy conversion has a white margin.
    expect(data[0]).toBeLessThan(60)
    expect(await sharp(image).metadata()).toMatchObject({ width: 1080, height: 1350, format: 'jpeg' })
    const portraitCenter = await sharp(image).extract({ left: 540, top: 550, width: 1, height: 1 }).raw().toBuffer()
    expect(portraitCenter[0]).toBeGreaterThan(200)
    expect(portraitCenter[2]).toBeLessThan(100)
  }, 15_000)
  it('converts a PNG into a 1080 x 1350 JPEG without cropping', async () => {
    const png = await sharp({ create: { width: 50, height: 80, channels: 3, background: '#ee8833' } }).png().toBuffer()
    const image = await renderSpotlightImage('https://media.top100afl.com/cover.png', vi.fn(async () => new Response(png)))
    expect(await sharp(image).metadata()).toMatchObject({ format: 'jpeg', width: 1080, height: 1350 })
  })
  it('blocks arbitrary hosts, URL credentials, redirects and oversized images', async () => {
    const fetcher = vi.fn()
    await expect(renderSpotlightImage('http://127.0.0.1/internal', fetcher)).rejects.toThrow()
    await expect(renderSpotlightImage('https://user:pass@media.top100afl.com/img', fetcher)).rejects.toThrow()
    expect(fetcher).not.toHaveBeenCalled()
    const large = vi.fn(async () => new Response('', { headers: { 'content-length': '9000000' } }))
    await expect(renderSpotlightImage('https://media.top100afl.com/img', large)).rejects.toThrow()
    expect(large).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: 'error' }))
  })
})
