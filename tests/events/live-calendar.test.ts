import { describe, expect, it } from 'vitest'
import { parseAflCalendar } from '@/lib/events/live-calendar'

describe('live AFL calendar', () => {
  it('uses edited Google event details, including its conference link and time', () => {
    const feed = `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:session@example.com\r\nDTSTART:20261010T180000Z\r\nDTEND:20261010T190000Z\r\nSUMMARY:Africa Future Leaders — Awardee Onboarding\r\nDESCRIPTION:<p><strong>Session:</strong><br><strong>Impact Beyond \r\n Recognition</strong></p>\r\nX-GOOGLE-CONFERENCE:https://meet.google.com/abc-defg-hij\r\nEND:VEVENT\r\nEND:VCALENDAR`
    expect(parseAflCalendar(feed)).toEqual([{
      id: 'session@example.com',
      title: 'Impact Beyond Recognition',
      startAt: '2026-10-10T18:00:00Z',
      endAt: '2026-10-10T19:00:00Z',
      meetUrl: 'https://meet.google.com/abc-defg-hij',
      cover: '/programme/afl-october-2026/onboarding-2026.jpg',
    }])
  })
})
