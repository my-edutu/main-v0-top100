import { describe, it, expect, vi } from 'vitest'
import { captionInstructions } from '@/lib/admin-social/openai-caption'
import { validateSpotlightCaption, completeSpotlightCaption } from '@/lib/admin-social/spotlight'
import { publishSpotlight } from '@/lib/admin-social/publish-spotlight'

const url = 'https://top100afl.com/awardees/amara'
describe('spotlight copy', () => {
  it('defaults to third person and grounds the story in the bio', () => {
    expect(captionInstructions('linkedin')).toContain('third person')
    expect(captionInstructions('linkedin')).toContain('Top100 Africa Future Leaders')
    expect(captionInstructions('x')).toContain('280')
  })
  it('includes the canonical link exactly once and rejects oversized copy', () => {
    expect(completeSpotlightCaption('Meet Amara.', url)).toBe(`Meet Amara.\n\n${url}`)
    expect(completeSpotlightCaption(`Meet Amara. ${url}`, url)).toBe(`Meet Amara. ${url}`)
    expect(validateSpotlightCaption('instagram', 'a'.repeat(2201), url)).toBeTruthy()
    expect(validateSpotlightCaption('x', '界'.repeat(140) + ' ' + url, url)).toBeTruthy()
    expect(validateSpotlightCaption('x', 'Meet Amara. ' + url, url)).toBeNull()
    expect(validateSpotlightCaption('linkedin', 'Missing link', url)).toBeTruthy()
  })
})

describe('publication delivery', () => {
  it('never posts without an atomic claim, including already published or uncertain records', async () => {
    const send = vi.fn()
    const previous = { platform: 'linkedin', state: 'published', postId: '123' }
    const result = await publishSpotlight({ claim: async () => null, read: async () => previous, finish: vi.fn(), send })
    expect(result).toEqual(previous)
    expect(send).not.toHaveBeenCalled()
  })
  it('records an ambiguous failure without allowing automatic retry', async () => {
    const finish = vi.fn(async () => undefined)
    await publishSpotlight({ claim: async () => 'claim', read: vi.fn(), finish, send: async () => { throw new Error('secret token') } })
    expect(finish).toHaveBeenCalledWith('claim', expect.objectContaining({ state: 'uncertain' }))
    expect(JSON.stringify(finish.mock.calls)).not.toContain('secret token')
  })
  it('does not turn a successful remote post into a retryable failure when persistence fails', async () => {
    const result = await publishSpotlight({ claim: async () => 'claim', read: vi.fn(), finish: async () => { throw new Error('db offline') }, send: async () => ({ postId: 'remote-1', postUrl: null }) })
    expect(result.state).toBe('uncertain')
  })
})
