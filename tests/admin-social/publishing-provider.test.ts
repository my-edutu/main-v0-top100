import { describe, expect, it, vi } from 'vitest'
import { createSocialPublisher, publishingConfiguration } from '@/lib/admin-social/publishing-provider'
import { PublicationRejected } from '@/lib/admin-social/publish-spotlight'
const env = {
  SOCIAL_LINKEDIN_ACCESS_TOKEN: 'secret', SOCIAL_LINKEDIN_ORGANIZATION_ID: '123', SOCIAL_LINKEDIN_VERSION: '202607',
  SOCIAL_META_PAGE_ACCESS_TOKEN: 'secret', SOCIAL_FACEBOOK_PAGE_ID: '456', SOCIAL_META_VERSION: 'v24.0', SOCIAL_INSTAGRAM_USER_ID: '789', SOCIAL_X_USER_ACCESS_TOKEN: 'secret',
}
describe('direct social publishing adapters', () => {
  it('exposes only configuration flags, never credentials', () => {
    expect(publishingConfiguration({}).every(a => !a.configured)).toBe(true)
    expect(publishingConfiguration(env).every(a => a.configured)).toBe(true)
    expect(JSON.stringify(publishingConfiguration(env))).not.toContain('secret')
  })
  it('posts to the configured organization and requires the LinkedIn receipt', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:123' } }))
    const result = await createSocialPublisher(env, fetcher)('linkedin', 'Reviewed caption', null)
    expect(result.postId).toBe('urn:li:share:123')
    const init = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init[1].body))).toMatchObject({ author: 'urn:li:organization:123', commentary: 'Reviewed caption' })
    const noReceipt = createSocialPublisher(env, vi.fn(async () => new Response(null, { status: 201 })))
    await expect(noReceipt('linkedin', 'Caption', null)).rejects.not.toBeInstanceOf(PublicationRejected)
  })
  it('classifies a definite rejection separately from server/network uncertainty', async () => {
    const rejected = createSocialPublisher(env, vi.fn(async () => new Response('secret', { status: 403 })))
    await expect(rejected('x', 'Caption', null)).rejects.toBeInstanceOf(PublicationRejected)
    const ambiguous = createSocialPublisher(env, vi.fn(async () => new Response('secret', { status: 503 })))
    await expect(ambiguous('x', 'Caption', null)).rejects.not.toBeInstanceOf(PublicationRejected)
  })
  it('waits for Instagram media readiness before publishing and retains success if permalink lookup fails', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ id: '111' }))
      .mockResolvedValueOnce(Response.json({ status_code: 'FINISHED' }))
      .mockResolvedValueOnce(Response.json({ id: '222' }))
      .mockRejectedValueOnce(new Error('offline'))
    expect(await createSocialPublisher(env, fetcher)('instagram', 'Caption', 'https://example.com/image.jpg')).toEqual({ postId: '222', postUrl: null })
    expect(fetcher.mock.calls[2][0]).toContain('/789/media_publish')
    expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({ creation_id: '111' })
  })
  it('never publishes a failed Instagram media container', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ id: '111' })).mockResolvedValueOnce(Response.json({ status_code: 'ERROR' }))
    await expect(createSocialPublisher(env, fetcher)('instagram', 'Caption', 'https://example.com/image.jpg')).rejects.toBeInstanceOf(PublicationRejected)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
