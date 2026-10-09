import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  profiles: [] as Record<string, unknown>[],
  awardees: [] as Record<string, unknown>[],
  upsert: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: vi.fn(async () => ({ admin: { id: 'admin' } })) }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({
  from(table: string) {
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn(async () => ({ data: mocks.profiles, error: null })),
      in: vi.fn(async () => ({ data: mocks.awardees, error: null })),
      upsert: mocks.upsert,
    }
    return query
  },
}) }))
vi.mock('@/lib/push/send', () => ({ sendMemberPush: mocks.push }))

import { POST } from '@/app/api/admin/notifications/broadcast/route'
import { resolveHandbookAudience, isParticipantHandbookPath, handbookAudienceFingerprint } from '@/lib/dashboard/participant-handbook-broadcast'

function request(body: unknown) {
  return new Request('https://www.top100afl.com/api/admin/notifications/broadcast', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mocks.profiles = []
  mocks.awardees = []
  mocks.upsert.mockReset().mockImplementation(() => ({
    select: vi.fn(async () => ({ data: [{ user_id: 'member-a' }], error: null })),
  }))
  mocks.push.mockReset().mockResolvedValue({ sent: 0 })
})

describe('participant handbook notification audience', () => {
  it('includes every member profile regardless of approval or cohort, but excludes admins', () => {
    const profiles = [
      { id: 'eligible', role: 'user', membership_status: 'approved', cohort: '2026' },
      { id: 'pending', role: 'user', membership_status: 'pending', cohort: '2026' },
      { id: 'ambiguous-cohort', role: 'user', membership_status: 'approved', cohort: '' },
      { id: 'missing-awardee', role: 'user', membership_status: 'approved', cohort: '2026' },
      { id: 'conflict', role: 'user', membership_status: 'approved', cohort: '2026' },
      { id: 'admin', role: 'admin', membership_status: 'approved', cohort: '2026' },
    ]
    const awardees = [
      { profile_id: 'eligible', year: 2026 },
      { profile_id: 'conflict', year: 2025 },
      { profile_id: 'conflict', year: 2026 },
    ]

    expect(resolveHandbookAudience(profiles)).toEqual([
      'eligible', 'pending', 'ambiguous-cohort', 'missing-awardee', 'conflict',
    ])
  })

  it('accepts only the exact same-origin handbook path', () => {
    expect(isParticipantHandbookPath('/handbooks/2026-participant-handbook.pdf')).toBe(true)
    expect(isParticipantHandbookPath('https://evil.example/handbooks/2026-participant-handbook.pdf')).toBe(false)
    expect(isParticipantHandbookPath('/dashboard')).toBe(false)
  })

  it('previews all member profiles without inserting or pushing notifications', async () => {
    mocks.profiles = [
      { id: 'member-a', role: 'user', membership_status: 'approved', cohort: '2026' },
      { id: 'member-b', role: 'user', membership_status: 'pending', cohort: '2025' },
    ]

    const response = await POST(request({ campaign: 'participant-handbook-2026', action: 'preview' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ action: 'preview', recipients: 2, audienceFingerprint: handbookAudienceFingerprint(['member-a', 'member-b']) })
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('rejects caller-supplied external handbook destinations', async () => {
    const response = await POST(request({
      campaign: 'participant-handbook-2026',
      action: 'preview',
      ctaUrl: 'https://evil.example/collect',
    }))

    expect(response.status).toBe(400)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('requires a fresh matching preview before sending to all members', async () => {
    mocks.profiles = [
      { id: 'member-a', role: 'user', membership_status: 'approved', cohort: '2026' },
      { id: 'member-b', role: 'user', membership_status: 'pending', cohort: '2025' },
    ]
    mocks.upsert.mockImplementation(() => ({
      select: vi.fn(async () => ({ data: [{ user_id: 'member-a' }], error: null })),
    }))

    mocks.upsert.mockImplementation(() => ({
      select: vi.fn(async () => ({ data: [{ user_id: 'member-a' }, { user_id: 'member-b' }], error: null })),
    }))
    const response = await POST(request({ campaign: 'participant-handbook-2026', action: 'send', expectedRecipients: 2, audienceFingerprint: handbookAudienceFingerprint(['member-a', 'member-b']) }))

    expect(response.status).toBe(201)
    expect(mocks.upsert).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({
      user_id: 'member-a',
      cta_url: '/handbooks/2026-participant-handbook.pdf',
      cta_label: 'Open handbook',
      campaign_id: 'afl-2026-participant-handbook',
      metadata: expect.objectContaining({ audience: 'all' }),
    })]), { onConflict: 'user_id,campaign_id', ignoreDuplicates: true })
  })

  it('does not send when the member audience changes after preview', async () => {
    mocks.profiles = [{ id: 'member-a', role: 'user', membership_status: 'approved', cohort: '2026' }]
    mocks.awardees = [{ profile_id: 'member-a', year: 2026 }]

    const response = await POST(request({ campaign: 'participant-handbook-2026', action: 'send', expectedRecipients: 2 }))

    expect(response.status).toBe(409)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('does not send to a changed audience with the same recipient count', async () => {
    mocks.profiles = [{ id: 'new-member', role: 'user', membership_status: 'approved', cohort: '2026' }]
    mocks.awardees = [{ profile_id: 'new-member', year: 2026 }]

    const response = await POST(request({
      campaign: 'participant-handbook-2026',
      action: 'send',
      expectedRecipients: 1,
      audienceFingerprint: handbookAudienceFingerprint(['previous-member']),
    }))

    expect(response.status).toBe(409)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('does not send duplicate push notifications when the campaign was already delivered', async () => {
    mocks.profiles = [{ id: 'member-a', role: 'user', membership_status: 'approved', cohort: '2026' }]
    mocks.awardees = [{ profile_id: 'member-a', year: 2026 }]
    mocks.upsert.mockImplementation(() => ({
      select: vi.fn(async () => ({ data: [], error: null })),
    }))

    const response = await POST(request({ campaign: 'participant-handbook-2026', action: 'send', expectedRecipients: 1, audienceFingerprint: handbookAudienceFingerprint(['member-a']) }))

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ action: 'send', recipients: 0, push: null })
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
