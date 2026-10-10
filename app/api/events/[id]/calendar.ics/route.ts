import { NextRequest } from 'next/server'

import { buildCalendarEvent } from '@/lib/events/calendar'
import { isAfricaFutureLeadersProgrammeEvent, toMemberProgrammeEvent } from '@/lib/events/programme-api'
import { AFL_2026_CALENDAR } from '@/lib/events/afl-2026-calendar'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-server'
import { hasValidDemoSession, isLoopbackDevelopment } from '@/lib/dev-dashboard/auth'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('events')
    .select('*, programme_speakers(id, slug, name, portrait_url, role, organisation, biography, website_url, linkedin_url, social_url, status)')
    .eq('id', id)
    .eq('status', 'published')
    .in('visibility', ['public', 'awardee_only'])
    .maybeSingle()

  if (error) {
    console.error('[events/calendar] Failed to load event:', error)
    return Response.json({ message: 'Could not create the calendar entry.' }, { status: 500 })
  }
  if (!data) return Response.json({ message: 'Event not found.' }, { status: 404 })

  if (data.visibility === 'awardee_only') {
    const user = await getCurrentUser()
    const isDemo = isLoopbackDevelopment(_request) && hasValidDemoSession(_request)
    if (!user?.id && !isDemo) return Response.json({ message: 'Event not found.' }, { status: 404 })
  }

  if (isAfricaFutureLeadersProgrammeEvent(data)) {
    return Response.redirect(AFL_2026_CALENDAR.addUrl, 302)
  }

  const event = toMemberProgrammeEvent({ ...data, speaker: data.programme_speakers })
  if (!event.startAt || !event.endAt) return Response.json({ message: 'This event has no valid schedule.' }, { status: 422 })

  const calendar = buildCalendarEvent({
    id: event.id,
    title: event.title,
    summary: event.summary,
    description: event.description,
    startAt: event.startAt,
    endAt: event.endAt,
    timezone: event.timezone,
    meetingUrl: event.registrationUrl,
    speakerName: event.speaker?.name ?? null,
    reminderMinutes: event.reminderMinutes,
  })

  return new Response(calendar.ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug || event.id}.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
