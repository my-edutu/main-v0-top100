import { describe, expect, it } from 'vitest'

import { PARTICIPANT_HANDBOOK } from '@/lib/handbook/participant-handbook'

describe('2026 participant handbook configuration', () => {
  it('uses one same-origin, versioned handbook path', () => {
    expect(PARTICIPANT_HANDBOOK).toMatchObject({
      year: 2026,
      path: '/handbooks/2026-participant-handbook.pdf',
    })
    expect(PARTICIPANT_HANDBOOK.path).not.toMatch(/^https?:\/\//)
  })

  it('gives the notification, popup, and checklist their distinct purposes', () => {
    expect(PARTICIPANT_HANDBOOK.notificationTitle).toBe('Your 2026 participant handbook is ready')
    expect(PARTICIPANT_HANDBOOK.notificationMessage).toBe('Find your first steps, programme information, and key dates in one guide.')
    expect(PARTICIPANT_HANDBOOK.notificationCta).toBe('Open handbook')
    expect(PARTICIPANT_HANDBOOK.popupTitle).toBe('Your next steps are in one place.')
    expect(PARTICIPANT_HANDBOOK.checklistTitle).toBe('Read the 2026 participant handbook')
  })
})
