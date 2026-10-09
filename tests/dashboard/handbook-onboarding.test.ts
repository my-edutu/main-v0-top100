import { describe, expect, it, vi } from 'vitest'

import { saveHandbookProgress, shouldShowHandbookPrompt } from '@/lib/dashboard/handbook-onboarding'

describe('participant handbook onboarding', () => {
  it('queues the prompt only after the Top100 Moment has completed or been dismissed', () => {
    expect(shouldShowHandbookPrompt({ eligible: true, promptSeenAt: null, momentCompleted: false, momentDismissed: false })).toBe(false)
    expect(shouldShowHandbookPrompt({ eligible: true, promptSeenAt: null, momentCompleted: false, momentDismissed: true })).toBe(true)
    expect(shouldShowHandbookPrompt({ eligible: true, promptSeenAt: null, momentCompleted: true, momentDismissed: false })).toBe(true)
  })

  it('keeps prompt display and handbook read acknowledgement independent', () => {
    expect(shouldShowHandbookPrompt({ eligible: true, promptSeenAt: '2026-10-09T10:00:00.000Z', momentCompleted: true, momentDismissed: false })).toBe(false)
    expect(shouldShowHandbookPrompt({ eligible: false, promptSeenAt: null, momentCompleted: true, momentDismissed: false })).toBe(false)
  })

  it('rejects failed read saves so the UI can keep the checklist incomplete', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ message: 'Could not save that update.' }), { status: 503 }))

    await expect(saveHandbookProgress('handbookRead', fetcher as typeof fetch)).rejects.toThrow('Could not save that update.')
    expect(fetcher).toHaveBeenCalledWith('/api/member/onboarding-journey', expect.objectContaining({ method: 'PATCH' }))
  })
})
