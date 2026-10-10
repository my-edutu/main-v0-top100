import type { LiveCalendarEvent } from './live-calendar'

export async function fetchLiveCalendarEvents(): Promise<LiveCalendarEvent[]> {
  const response = await fetch('/api/events/live-calendar', { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not load the live calendar')
  const payload = await response.json() as { events?: LiveCalendarEvent[] }
  if (!Array.isArray(payload.events)) throw new Error('The live calendar response is invalid')
  return payload.events
}
