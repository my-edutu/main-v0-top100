import { describe, expect, it } from 'vitest'

import { buildCalendarEvent } from '@/lib/events/calendar'

describe('programme calendar serialization', () => {
  it('serializes a stable UID, WAT event, escaped text, and one reminder alarm', () => {
    const result = buildCalendarEvent({
      id: 'event-1',
      title: 'Ideas, growth; and\nscale',
      summary: 'Line 1\nLine 2',
      description: 'Open https://example.test?a=1&b=2',
      startAt: '2026-10-11T15:00:00.000Z',
      endAt: '2026-10-11T16:00:00.000Z',
      timezone: 'Africa/Lagos',
      meetingUrl: 'https://meet.example.test/room',
      speakerName: null,
      reminderMinutes: 1440,
    })

    expect(result.uid).toBe('event-1@top100afl.com')
    expect(result.ics).toContain('DTSTART;TZID=Africa/Lagos:20261011T160000')
    expect(result.ics).toContain('DTEND;TZID=Africa/Lagos:20261011T170000')
    expect(result.ics).toContain('TRIGGER:-P1D')
    expect(result.ics).toContain('SUMMARY:Ideas\\, growth\\; and\\nscale')
    expect(result.ics).toContain('URL:https://meet.example.test/room')
  })

  it('omits the alarm when the reminder is disabled', () => {
    const result = buildCalendarEvent({
      id: 'event-2',
      title: 'No reminder',
      summary: null,
      description: null,
      startAt: '2026-10-11T15:00:00.000Z',
      endAt: '2026-10-11T16:00:00.000Z',
      timezone: 'Africa/Lagos',
      meetingUrl: null,
      speakerName: null,
      reminderMinutes: null,
    })

    expect(result.alarmTrigger).toBeNull()
    expect(result.ics).not.toContain('BEGIN:VALARM')
  })
})
