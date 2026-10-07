import { describe, expect, it } from 'vitest'
import { countryKey, getDiscoverySummary, hasProfilePhoto, shufflePeople } from '../../lib/awardee-discovery'

describe('awardee discovery', () => {
  it('shuffles without losing, duplicating, or mutating records', () => {
    const people = ['A', 'B', 'C', 'D']
    const result = shufflePeople(people, () => 0)
    expect(result).toEqual(['B', 'C', 'D', 'A'])
    expect(people).toEqual(['A', 'B', 'C', 'D'])
    expect([...result].sort()).toEqual(people)
  })
  it('only accepts an actual profile photo for highlights', () => {
    expect(hasProfilePhoto({ avatar_url: ' https://example.com/photo.jpg ' })).toBe(true)
    expect(hasProfilePhoto({ avatar_url: ' ', cover_image_url: 'https://example.com/cover.jpg' })).toBe(false)
    expect(hasProfilePhoto({ avatar_url: '/image-unavailable.svg' })).toBe(false)
  })
  it('counts countries consistently without treating missing values as countries', () => {
    expect(countryKey(' NIGERIA ')).toBe(countryKey('Nigeria'))
    const summary = getDiscoverySummary([
      { country: 'Nigeria', year: 2025 },
      { country: ' NIGERIA ', year: 2025 },
      { country: 'Ghana', year: 2024 },
      { country: null, year: null },
      { country: 'Lagos', year: 2025 },
      { country: 'Hhhjjjj', year: 2025 },
    ])
    expect(summary.leaders).toBe(6)
    expect(summary.countries).toEqual([{ key: 'nigeria', name: 'Nigeria', count: 2 }, { key: 'ghana', name: 'Ghana', count: 1 }])
    expect(summary.cohorts).toBe(2)
  })
})
