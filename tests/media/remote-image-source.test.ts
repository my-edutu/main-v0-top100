import { describe, expect, it } from 'vitest'
import { resolveRemoteImageSource, isDriveImage } from '@/lib/media/remote-image-source'
describe('Drive image handling', () => {
  it.each(['https://drive.google.com/open?id=abc_123','https://drive.google.com/file/d/abc_123/view','https://drive.google.com/uc?export=view&id=abc_123'])('converts %s', source => {
    expect(resolveRemoteImageSource(source)).toBe('https://drive.google.com/thumbnail?id=abc_123&sz=w800')
    expect(isDriveImage(source)).toBe(true)
  })
  it('retains resource keys', () => expect(resolveRemoteImageSource('https://drive.google.com/open?id=abc&resourcekey=key')).toContain('resourcekey=key'))
  it.each(['https://drive.google.com/open', 'https://drive.google.com/open?id=bad%2Fid','javascript:alert(1)','//bad.test/a','nonsense'])('rejects invalid image %s', source => expect(resolveRemoteImageSource(source)).toBeNull())
  it('routes migrated public objects to current storage', () => {
    expect(resolveRemoteImageSource('https://zsavekrhfwrpqudhjvlq.supabase.co/storage/v1/object/public/awardees/photo.JPG'))
      .toBe('https://supabase.top100afl.com/storage/v1/object/public/awardees/photo.JPG')
    const signed = 'https://zsavekrhfwrpqudhjvlq.supabase.co/storage/v1/object/sign/awardees/photo.JPG?token=abc'
    expect(resolveRemoteImageSource(signed)).toBe(signed)
  })
  it('preserves normal sources', () => {
    for (const source of ['/portrait.png','https://supabase.top100afl.com/portrait.png','blob:https://example.com/abc']) expect(resolveRemoteImageSource(source)).toBe(source)
  })
})
