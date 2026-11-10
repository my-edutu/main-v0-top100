import { afterEach, describe, expect, it, vi } from 'vitest'
import { memberMentorshipOpen, readMentorProfile, readMentorSlot } from '@/lib/mentors/contracts'

afterEach(() => vi.unstubAllEnvs())

describe('Impact Africa mentorship', () => {
  it('keeps member access locked unless explicitly enabled', () => {
    vi.stubEnv('IMPACT_AFRICA_MEMBER_MENTORSHIP_ENABLED', '')
    expect(memberMentorshipOpen()).toBe(false)
    vi.stubEnv('IMPACT_AFRICA_MEMBER_MENTORSHIP_ENABLED', '1')
    expect(memberMentorshipOpen()).toBe(false)
    vi.stubEnv('IMPACT_AFRICA_MEMBER_MENTORSHIP_ENABLED', 'true')
    expect(memberMentorshipOpen()).toBe(true)
  })

  it('accepts a professional profile without copying account or contact details', () => {
    const form = new FormData()
    for (const [name, value] of Object.entries({
      name: '  Ada Obi ', headline: 'Product lead', bio: 'I help teams build useful tools.',
      expertise: 'Product design, Career growth', user_id: 'someone-else', email: 'hidden@example.test',
    })) form.set(name, value)
    expect(readMentorProfile(form)).toEqual({
      name: 'Ada Obi', headline: 'Product lead', bio: 'I help teams build useful tools.',
      expertise: 'Product design, Career growth', accepting_requests: false,
    })
  })

  it('rejects non-HTTPS meeting URLs and requires an explicit time zone', () => {
    const form = new FormData()
    form.set('startsAt', '2026-12-01T15:15:00')
    form.set('meetingUrl', 'https://meet.example.test/room')
    expect(() => readMentorSlot(form, 0)).toThrow(/time/i)
    form.set('startsAt', '2026-12-01T15:15:00.000Z')
    form.set('meetingUrl', 'javascript:alert(1)')
    expect(() => readMentorSlot(form, 0)).toThrow(/HTTPS/i)
    form.set('meetingUrl', 'https://meet.example.test/room')
    expect(readMentorSlot(form, 0).starts_at).toBe('2026-12-01T15:15:00.000Z')
  })
})
