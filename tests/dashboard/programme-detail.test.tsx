import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProgrammeEventDetail } from '@/app/dashboard/discover/events/_components/programme-event-detail'
import type { MemberProgrammeEvent } from '@/lib/events/programme-api'

const event: MemberProgrammeEvent = {
  id: 'event-1', slug: 'global-talent-playbook', title: 'The Global Talent Playbook', subtitle: null,
  summary: 'Build an edge beyond Africa.', description: 'A practical session for ambitious leaders.', location: null,
  startAt: '2026-10-11T15:00:00.000Z', endAt: '2026-10-11T16:00:00.000Z', registrationUrl: null,
  registrationLabel: 'Event details', featuredImageUrl: null, status: 'published', visibility: 'public',
  programmeLabel: 'Africa Future Leaders', sessionNumber: 1, learningOutcomes: ['See the competitive landscape'],
  timezone: 'Africa/Lagos', reminderMinutes: 30, calendarUrl: '/api/events/event-1/calendar.ics', speaker: null,
}

describe('ProgrammeEventDetail', () => {
  it('exposes the learning outcomes, speaker placeholder, and calendar action', () => {
    const markup = renderToStaticMarkup(<ProgrammeEventDetail event={event} />)
    expect(markup).toContain(event.title)
    expect(markup).toContain('See the competitive landscape')
    expect(markup).toContain('Speaker to be unveiled')
    expect(markup).toContain('Add full calendar')
  })
})
