import { describe, expect, it } from 'vitest'

import { currentBioDestination, publicBioDestination } from '@/lib/dashboard/bio-routing'

describe('BIO routing', () => {
  it('sends signed-out visitors to login with a safe return path', () => {
    expect(currentBioDestination(null, null)).toBe('/login?redirect=%2Fbio')
  })

  it('sends members without a public slug to the BIO editor', () => {
    expect(currentBioDestination('member-1', null)).toBe('/dashboard/me/profile')
  })

  it('sends a linked member to their short BIO URL', () => {
    expect(currentBioDestination('member-1', 'amara-okafor')).toBe('/bio/amara-okafor')
  })

  it('maps a valid short BIO URL to the canonical awardee page', () => {
    expect(publicBioDestination('amara-okafor')).toBe('/awardees/amara-okafor')
  })

  it.each(['', '../admin', 'https://evil.example', 'name/other', 'Name With Spaces'])(
    'rejects an invalid public BIO slug: %s',
    (slug) => expect(publicBioDestination(slug)).toBeNull(),
  )
})
