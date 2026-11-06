import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ProfileBiography from '@/app/awardees/[slug]/ProfileBiography'
import { buildProfileContent } from '@/lib/seo/profile-content'

it('renders named headings and original claims as readable content', () => {
  const profile = { name: 'Amina Ali', is_public: true, year: '2026', bio: 'Leadership journey: I helped 350 students.\n\nNotable impact: I built a library.' }
  const html = renderToStaticMarkup(<ProfileBiography name={profile.name} content={buildProfileContent(profile)} />)
  expect(html).toContain('About Amina Ali')
  expect(html).toContain('Leadership journey</h3>')
  expect(html).toContain('I helped 350 students.')
  expect(html).toContain('I built a library.')
  expect(html).toContain('Class of 2026')
})
it('escapes submitted markup and omits private biographies', () => {
  const profile = { name: 'Amina', is_public: true, bio: '<script>alert(1)</script>' }
  const html = renderToStaticMarkup(<ProfileBiography name={profile.name} content={buildProfileContent(profile)} />)
  expect(html).toContain('&lt;script&gt;')
  expect(html).not.toContain('<script>')
  expect(renderToStaticMarkup(<ProfileBiography name="Amina" content={buildProfileContent({ ...profile, is_public: false })} />)).toBe('')
})
