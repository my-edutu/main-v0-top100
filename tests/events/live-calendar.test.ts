import { describe, expect, it } from 'vitest'
import { parseAflCalendar } from '@/lib/events/live-calendar'
import { AFL_2026_MEET_URL } from '@/lib/events/afl-2026-calendar'

describe('live AFL calendar', () => {
  it('preserves edited Google event details alongside supplementary programme events', () => {
    const feed = `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:session@example.com\r\nDTSTART:20261010T180000Z\r\nDTEND:20261010T190000Z\r\nSUMMARY:Africa Future Leaders — Awardee Onboarding\r\nDESCRIPTION:<p><strong>Session:</strong><br><strong>Impact Beyond \r\n Recognition</strong></p>\r\nX-GOOGLE-CONFERENCE:https://meet.google.com/abc-defg-hij\r\nEND:VEVENT\r\nEND:VCALENDAR`
    const events = parseAflCalendar(feed)
    expect(events.find(event => event.id === 'session@example.com')).toEqual({
      id: 'session@example.com',
      title: 'Impact Beyond Recognition',
      startAt: '2026-10-10T18:00:00Z',
      endAt: '2026-10-10T19:00:00Z',
      meetUrl: AFL_2026_MEET_URL,
      cover: '/programme/afl-october-2026/onboarding-2026.jpg',
      attachments: [],
    })
    expect(events.filter(event => /^The Global Opportunity Playbook:/.test(event.title))).toHaveLength(1)
  })
  it('uses the calendar version of a supplementary session without duplicating or rescheduling it', () => {
    const events = parseAflCalendar(`BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:edited-playbook\nDTSTART:20261105T160000Z\nDTEND:20261105T170000Z\nSUMMARY:The Global Opportunity Playbook: Updated\nEND:VEVENT\nEND:VCALENDAR`)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ id: 'edited-playbook', startAt: '2026-11-05T16:00:00Z', endAt: '2026-11-05T17:00:00Z' })
  })
})
