import { describe, expect, it, vi } from 'vitest'
import { shareSocialDraft } from '@/lib/admin-social/share'

describe('shareSocialDraft', () => {
  it('shares caption and profile link if file sharing is unavailable', async () => {
    const share = vi.fn(async () => undefined)
    const outcome = await shareSocialDraft({
      caption: 'Hello', profileUrl: 'https://top100afl.com/awardees/amara', imageUrl: null,
    }, { share, canShare: () => false })
    expect(share).toHaveBeenCalledWith({
      title: 'Africa Future Leaders', text: 'Hello', url: 'https://top100afl.com/awardees/amara',
    })
    expect(outcome).toBe('shared')
  })

  it('treats cancellation as neutral and reports unsupported share separately', async () => {
    const cancelled = await shareSocialDraft({ caption: 'Hello', profileUrl: 'https://top100afl.com', imageUrl: null }, {
      share: vi.fn(async () => { throw new DOMException('Cancelled', 'AbortError') }),
    })
    const unavailable = await shareSocialDraft({ caption: 'Hello', profileUrl: 'https://top100afl.com', imageUrl: null }, {})
    expect(cancelled).toBe('cancelled')
    expect(unavailable).toBe('unavailable')
  })

  it('keeps sharing caption and link when image loading fails', async () => {
    const share = vi.fn(async () => undefined)
    const outcome = await shareSocialDraft({ caption: 'Hello', profileUrl: 'https://top100afl.com/p', imageUrl: 'https://cdn.example/cover.png' }, {
      share, canShare: () => false,
    }, vi.fn(async () => { throw new Error('blocked by CORS') }) as typeof fetch)
    expect(outcome).toBe('shared')
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: 'Hello', url: 'https://top100afl.com/p' }))
  })

  it('attaches the selected cover when the device supports sharing files', async () => {
    const share = vi.fn(async () => undefined)
    const canShare = vi.fn((data?: { files?: File[] }) => Boolean(data?.files?.length))
    const fetchImage = vi.fn(async () => new Response(new Blob(['cover'], { type: 'image/png' }))) as typeof fetch

    const outcome = await shareSocialDraft({
      caption: 'Hello', profileUrl: 'https://top100afl.com/p', imageUrl: 'https://cdn.example/cover.png',
    }, { share, canShare }, fetchImage)

    expect(outcome).toBe('shared_with_image')
    expect(share).toHaveBeenCalledTimes(1)
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Africa Future Leaders',
      text: 'Hello',
      url: 'https://top100afl.com/p',
      files: [expect.objectContaining({ name: 'afl-awardee.png', type: 'image/png' })],
    }))
  })

  it('uses a prepared image immediately after the admin clicks Share', async () => {
    const share = vi.fn(async () => undefined)
    const image = new File(['cover'], 'amara.png', { type: 'image/png' })
    const fetchImage = vi.fn()

    const outcome = await shareSocialDraft({
      caption: 'Hello', profileUrl: 'https://top100afl.com/p', imageUrl: 'https://cdn.example/cover.png',
    }, { share, canShare: (data) => Boolean(data?.files?.length) }, fetchImage as typeof fetch, image)

    expect(outcome).toBe('shared_with_image')
    expect(fetchImage).not.toHaveBeenCalled()
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [image] }))
  })

  it('does not fetch an image after the admin click when preloading was blocked', async () => {
    const share = vi.fn(async () => undefined)
    const fetchImage = vi.fn()

    const result = shareSocialDraft({
      caption: 'Hello', profileUrl: 'https://top100afl.com/p', imageUrl: 'https://cdn.example/cover.png',
    }, { share, canShare: () => false }, fetchImage as typeof fetch, null)

    expect(share).toHaveBeenCalledWith(expect.not.objectContaining({ files: expect.anything() }))
    expect(fetchImage).not.toHaveBeenCalled()
    await expect(result).resolves.toBe('shared')
  })

  it('does not open a second text-only share sheet after image-share cancellation', async () => {
    const share = vi.fn(async () => { throw new DOMException('Cancelled', 'AbortError') })
    const fetchImage = vi.fn(async () => new Response(new Blob(['cover'], { type: 'image/jpeg' }))) as typeof fetch

    const outcome = await shareSocialDraft({
      caption: 'Hello', profileUrl: 'https://top100afl.com/p', imageUrl: 'https://cdn.example/cover.jpg',
    }, { share, canShare: (data) => Boolean(data?.files?.length) }, fetchImage)

    expect(outcome).toBe('cancelled')
    expect(share).toHaveBeenCalledTimes(1)
  })
})
