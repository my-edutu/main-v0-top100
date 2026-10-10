export const AFL_2026_CALENDAR = {
  campaignId: 'afl-2026-event-calendar-october-10',
  title: 'Africa Future Leaders 2026 Event Calendar',
  message: 'The event calendar is now available. View the full schedule, or add it to your Google Calendar to keep all the dates together. You can choose your own reminder settings in Google Calendar.',
  viewUrl: 'https://calendar.google.com/calendar/embed?src=c_49723456ee568795051f3fc2ced0b8ae4972bc67f5b4f73b578072979e23e298%40group.calendar.google.com&ctz=Africa%2FLagos',
  addUrl: 'https://calendar.google.com/calendar/u/0?cid=Y180OTcyMzQ1NmVlNTY4Nzk1MDUxZjNmYzJjZWQwYjhhZTQ5NzJiYzY3ZjViNGY3M2I1NzgwNzI5NzllMjNlMjk4QGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20',
  artwork: '/programme/afl-october-2026/onboarding-2026.jpg',
} as const

// October 10 in Lagos (UTC+1). The popup is deliberately unavailable after today.
export const AFL_2026_CALENDAR_POPUP_START = Date.parse('2026-10-09T23:00:00Z')
export const AFL_2026_CALENDAR_POPUP_END = Date.parse('2026-10-10T23:00:00Z')

export function isAflCalendarPopupDay(now: number): boolean {
  return now >= AFL_2026_CALENDAR_POPUP_START && now < AFL_2026_CALENDAR_POPUP_END
}
