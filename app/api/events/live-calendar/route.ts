import { NextResponse } from 'next/server'
import { loadAflCalendarEvents } from '@/lib/events/live-calendar'

export async function GET() {
  try {
    const events = await loadAflCalendarEvents()
    // Keep private recording/document attachment URLs out of the public calendar response.
    const publicEvents = events.map(({ attachments: _attachments, ...event }) => event)
    return NextResponse.json({ events: publicEvents }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300' } })
  } catch (error) {
    console.error('[live-calendar] Could not load calendar:', error)
    return NextResponse.json({ message: 'The live programme calendar is temporarily unavailable.' }, { status: 503 })
  }
}
