import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], member: {} }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = state.cursor++
    if (!(index in state.values)) state.values[index] = typeof initial === 'function' ? initial() : initial
    return [state.values[index], (value: unknown) => { state.values[index] = typeof value === 'function' ? value(state.values[index]) : value }]
  },
  useEffect: vi.fn(),
}))
vi.mock('@/app/dashboard/_providers/dashboard-member', () => ({ useDashboardMember: () => ({ member: state.member, refreshMember: vi.fn(), replaceMember: vi.fn() }) }))
import { ProfileSection } from '@/app/dashboard/_sections/profile-section'
import { validateProfileDraft } from '@/app/dashboard/_lib/profile-editor'
import { createDemoDashboardStore } from '@/lib/dev-dashboard/store'
const draft = { headline: 'Founder', field: 'Climate', location: 'Lagos', organization: 'AFL', bio: 'My story', emailVisible: false, recruiterVisible: true }
beforeEach(() => { state.cursor = 0; state.values = []; state.member = { ...createDemoDashboardStore().profile, ...draft } })
describe('complete profile editor', () => {
  it('opens the current editor with all About you fields and the saved BIO together', () => {
    const overview = ProfileSection()
    overview.props.onEdit()
    state.cursor = 0
    const html = renderToStaticMarkup(ProfileSection())
    for (const field of ['headline','field','location','organization','bio']) expect(html).toContain(`profile-answer-${field}`)
    for (const value of ['Founder', 'Climate', 'Lagos', 'AFL']) expect(html).toContain(`value="${value}"`)
    expect(html).toContain('My story')
    expect(html).toContain('Profile editing steps')
  })
  it('allows optional fields to be cleared and rejects oversized BIOs', () => {
    expect(validateProfileDraft({ ...draft, bio: '' })).toBeNull()
    expect(validateProfileDraft({ ...draft, bio: 'x'.repeat(5001) })).toContain('5,000')
  })
})
