import { describe, expect, it } from 'vitest'
import { buildProfileContent } from '@/lib/seo/profile-content'
const base = { name: 'Amina Ali', slug: 'amina', is_public: true, year: '2026', field_of_study: 'Economics' }
describe('fact-preserving public biographies', () => {
  it('supplies a factual biography for missing bios without inventing a career', () => {
    const result = buildProfileContent(base)
    expect(result.introduction).toContain('Amina Ali')
    expect(result.introduction).toContain('2026')
    expect(result.biography).toContain('Economics')
    expect(result.biography).not.toMatch(/graduate|expert|economist|Nigeria/)
    expect(result.reviewFlags).toContain('missing-biography')
  })
  it('structures known imported labels and preserves every submitted claim and number', () => {
    const bio = 'Education level: Graduate\n\nCGPA / academic achievement: 4.6\n\nLeadership journey: I earned a 4.70/5.00 CGPA.\nI helped 267 students.\n\nNotable impact: We reached 350 people.'
    const result = buildProfileContent({ ...base, bio })
    expect(result.sections.map(section => section.heading)).toContain('Leadership journey')
    expect(result.sections.flatMap(section => section.paragraphs).join('\n')).toContain('I helped 267 students.')
    expect(result.biography).toContain('4.6')
    expect(result.biography).toContain('4.70/5.00')
    expect(result.biography).toContain('350')
    expect(result.reviewFlags).toContain('academic-figures-need-review')
  })
  it('does not turn repeated course fields into a school or country into nationality', () => {
    const result = buildProfileContent({ ...base, current_school: 'Economics', country: 'Lagos, Nigeria' })
    expect(result.details.filter(detail => detail.value === 'Economics')).toHaveLength(1)
    expect(result.details.find(detail => detail.value === 'Economics')?.label).toBe('Background / field of study')
    expect(result.biography).not.toMatch(/alumn|nationality|graduated/)
  })
  it('does not invent years, headlines, or identities for sparse records', () => {
    const result = buildProfileContent({ name: 'Awardee 274', is_public: true, bio: 'Original first-person words.' })
    expect(result.introduction).toBe('')
    expect(result.biography).toContain('Original first-person words.')
    expect(result.recognition).not.toMatch(/2025|2026/)
    expect(result.reviewFlags).toContain('missing-real-name')
  })
  it('keeps unknown colon text and links as biography text', () => {
    const bio = 'My goal is simple: teach.\n\nhttps://example.com/work\n\nI built a project.'
    expect(buildProfileContent({ ...base, bio }).sections.flatMap(s => s.paragraphs)).toEqual(bio.split('\n\n'))
  })
  it('uses explicit public facts only and omits all private profiles', () => {
    const privateFields = { email: 'private@example.com', phone: '+12345', metadata: { secret: 'hidden' } }
    expect(JSON.stringify(buildProfileContent({ ...base, ...privateFields }))).not.toMatch(/private@example|12345|hidden/)
    const result = buildProfileContent({ ...base, is_public: false, bio: 'PRIVATE BIO' })
    expect(result.biography).toBe('')
    expect(result.description).toBe('')
  })
})
