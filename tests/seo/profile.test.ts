import { describe, expect, it } from 'vitest'
import { profileDescription, profileStructuredData } from '@/lib/seo/profile'
import { emptyTalentDraft } from '@/lib/talent/contracts'
import StructuredData from '@/components/StructuredData'

describe('public profile SEO', () => {
  it('creates readable descriptions without splitting words', () => {
    expect(profileDescription('  Amina\n builds useful projects. ', 'fallback')).toBe('Amina builds useful projects.')
    expect(profileDescription('', 'Profile fallback')).toBe('Profile fallback')
    expect(profileDescription('leadership '.repeat(30), 'fallback').length).toBeLessThanOrEqual(160)
    expect(profileDescription('leadership '.repeat(30), 'fallback')).toMatch(/leadership…$/)
  })
  it('describes the person without inferring nationality or alumni status', () => {
    const schema = profileStructuredData({ slug: 'amina-ali', name: 'Amina Ali', is_public: true, awardee_id: '1', profile_id: null, current_school: 'University', country: 'Kenya', bio: 'Project leader' }, ['https://example.com/amina'])
    expect(schema['@type']).toBe('ProfilePage')
    expect(schema.mainEntity['@id']).toBe(`${schema.url}#person`)
    expect(schema.mainEntity.sameAs).toEqual(['https://example.com/amina'])
    expect(schema.mainEntity).not.toHaveProperty('nationality')
    expect(schema.mainEntity).not.toHaveProperty('alumniOf')
  })
  it('normalizes images and excludes invalid or duplicate identity links', () => {
    const profile = { slug: 'leader', name: 'Leader', awardee_id: '1', profile_id: null, is_public: true, avatar_url: '/portrait.jpg' }
    const schema = profileStructuredData(profile, ['https://example.com/me', 'javascript:alert(1)', 'https://example.com/me'])
    expect(schema.mainEntity.image).toBe('https://top100afl.com/portrait.jpg')
    expect(schema.mainEntity.sameAs).toEqual(['https://example.com/me'])
    expect(profileStructuredData({ ...profile, avatar_url: 'javascript:alert(1)' }, []).mainEntity.image).toBeUndefined()
  })
  it('uses only the supplied public portfolio to enrich the existing person', () => {
    const profile = { slug: 'leader', name: 'Leader', awardee_id: '1', profile_id: null, is_public: true, interests: ['Research'] }
    const details = { ...emptyTalentDraft(), summary: 'Builds solar microgrids.', skills: ['Energy modelling', 'Research'], linkedinUrl: 'https://example.com/leader' }
    const schema = profileStructuredData(profile, ['https://example.com/leader'], details)
    expect(schema.mainEntity.description).toBe(details.summary)
    expect(schema.mainEntity.knowsAbout).toEqual(['Research', 'Energy modelling'])
    expect(schema.mainEntity.sameAs).toEqual(['https://example.com/leader'])
    expect(profileStructuredData(profile, []).mainEntity.knowsAbout).toEqual(['Research'])
  })

  it('keeps user text from terminating the JSON-LD script', () => {
    const element = StructuredData({ data: { name: '</script><script>alert(1)</script>' } })
    const json = element.props.dangerouslySetInnerHTML.__html
    expect(json).not.toContain('<')
    expect(JSON.parse(json).name).toBe('</script><script>alert(1)</script>')
  })
})
