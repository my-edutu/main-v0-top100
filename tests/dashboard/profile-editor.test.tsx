import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('@/app/dashboard/_providers/dashboard-member', () => ({ useDashboardMember: vi.fn() }))
import { ProfileEditorFields } from '@/app/dashboard/_sections/profile-section'
import { validateProfileDraft } from '@/app/dashboard/_lib/profile-editor'
const draft = { headline: 'Founder', field: 'Climate', location: 'Lagos', organization: 'AFL', bio: 'My story', emailVisible: false, recruiterVisible: true }
describe('complete profile editor', () => {
  it('renders every text field and the current BIO together', () => {
    const html = renderToStaticMarkup(<ProfileEditorFields draft={draft} onChange={() => {}} />)
    for (const field of ['headline','field','location','organization','bio']) expect(html).toContain(`profile-answer-${field}`)
    expect(html).toContain('My story')
  })
  it('allows optional fields to be cleared and rejects oversized BIOs', () => {
    expect(validateProfileDraft({ ...draft, bio: '' })).toBeNull()
    expect(validateProfileDraft({ ...draft, bio: 'x'.repeat(2001) })).toContain('2,000')
  })
})
