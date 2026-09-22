import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ProgrammeEventCard } from '@/app/dashboard/discover/events/_components/programme-event-card'
import type { MemberProgrammeEvent } from '@/lib/events/programme-api'

const fixtureWithoutSpeaker: MemberProgrammeEvent = {
  id: 'event-1',
  slug: 'global-talent-playbook',
  title: 'The Global Talent Playbook: How to Become Competitive Beyond Africa',
  subtitle: null,
  summary: 'A practical session on global competitiveness.',
  description: null,
  location: 'Virtual',
  startAt: '2026-10-11T15:00:00.000Z',
  endAt: '2026-10-11T16:00:00.000Z',
  registrationUrl: 'https://meet.example.test',
  registrationLabel: 'Join session',
  featuredImageUrl: null,
  status: 'published',
  visibility: 'public',
  programmeLabel: 'Africa Future Leaders October 2026',
  sessionNumber: 1,
  learningOutcomes: ['Build a stronger global signal'],
  timezone: 'Africa/Lagos',
  reminderMinutes: 1440,
  calendarUrl: '/api/events/event-1/calendar.ics',
  speaker: null,
}

describe('member programme event cards', () => {
  it('renders the speaker placeholder and keeps calendar action separate from event navigation', () => {
    const markup = renderToStaticMarkup(<ProgrammeEventCard event={fixtureWithoutSpeaker} />)
    expect(markup).toContain('Speaker to be unveiled')
    expect(markup).toContain('Add to calendar')
    expect(markup).toContain('/dashboard/discover/events/global-talent-playbook')
  })
})
