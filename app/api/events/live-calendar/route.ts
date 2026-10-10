import { NextResponse } from 'next/server'
import { AFL_2026_ICS_URL, parseAflCalendar } from '@/lib/events/live-calendar'

export async function GET() {
  try {
    const response = await fetch(AFL_2026_ICS_URL, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new Error(`Google Calendar returned ${response.status}`)
    const events = parseAflCalendar(await response.text())
    if (!events.length) throw new Error('Google Calendar returned no events')
    return NextResponse.json({ events }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300' } })
  } catch (error) {
    console.error('[live-calendar] Could not load calendar:', error)
    return NextResponse.json({ message: 'The live programme calendar is temporarily unavailable.' }, { status: 503 })
  }
}
