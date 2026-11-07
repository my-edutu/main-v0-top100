import { describe, expect, it } from 'vitest'
import { assessProfileQuality, qualityLinkUrl } from '@/lib/admin/profile-quality'

const profile = { awardee_id: 'awardee', profile_id: null, name: 'Awardee 274', slug: 'awardee-274', is_public: true }

describe('profile quality', () => {
  it('flags original bio gaps even when the public page has a generated introduction', () => {
    const { row } = assessProfileQuality({ ...profile, headline: 'Top100 Africa Future Leader', year: '2026' }, {})
    expect(row).toMatchObject({ missingBio: true, missingHeadline: true, missingPhoto: true, year: '2026' })
    expect(row.details).toContain('Confirm the awardee’s name')
  })

  it('separates malformed addresses from links that need a network check', () => {
    const { row, targets } = assessProfileQuality({
      ...profile,
      avatar_url: '/photo.jpg',
      cover_image_url: '/photo.jpg',
      bio: 'I mentor student teams.',
      headline: 'Engineering researcher',
    }, { website: 'not a link', linkedin: 'https://linkedin.com/in/example' })
    expect(row).toMatchObject({ missingBio: false, missingHeadline: false, missingPhoto: false, linkCount: 2 })
    expect(row.invalidLinks).toEqual([{ label: 'website', host: '', status: 'broken', reason: 'Invalid web address' }])
    expect(targets).toHaveLength(2)
  })

  it('rejects credentialed URLs, alternate ports and relative paths that escape the site', () => {
    for (const url of ['https://user:secret@example.com', 'https://example.com:8080', '//example.com/escape', '/\\example.com/escape', 'file:///tmp/item']) {
      expect(qualityLinkUrl(url)).toBeNull()
    }
  })
})
