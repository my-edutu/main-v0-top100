import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { renderSpotlightImage } from '@/lib/admin-social/spotlight-image'
describe('Instagram image conversion', () => {
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
