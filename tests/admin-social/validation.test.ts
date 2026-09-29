import { describe, expect, it } from 'vitest'
import { parseDraftInput, parseMarkPostedInput } from '@/lib/admin-social/validation'

describe('admin social draft validation', () => {
  it('accepts the supported platform and a bounded caption', () => {
    expect(parseDraftInput({
      awardeeId: '24c4f56b-f3d8-4f8a-81d8-a09509e04511',
      platform: 'linkedin',
      caption: 'A public introduction.',
    })).toEqual({
      awardeeId: '24c4f56b-f3d8-4f8a-81d8-a09509e04511',
      platform: 'linkedin',
      caption: 'A public introduction.',
    })
  })

  it('rejects unsupported platforms, invalid awardee IDs, and oversized captions', () => {
    expect(parseDraftInput({ awardeeId: 'not-a-uuid', platform: 'x', caption: 'hi' })).toBeNull()
    expect(parseDraftInput({
      awardeeId: '24c4f56b-f3d8-4f8a-81d8-a09509e04511',
      platform: 'facebook',
      caption: 'x'.repeat(5001),
    })).toBeNull()
  })

  it('accepts an omitted public post URL and rejects non-HTTPS URLs', () => {
    expect(parseMarkPostedInput({})).toEqual({ publicPostUrl: null })
    expect(parseMarkPostedInput({ publicPostUrl: 'http://example.com/post' })).toBeNull()
    expect(parseMarkPostedInput({ publicPostUrl: 'javascript:alert(1)' })).toBeNull()
  })
})
