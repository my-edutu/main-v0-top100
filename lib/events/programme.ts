export const PROGRAMME_SESSION_MINUTES = 60
export const PROGRAMME_LABEL = 'Africa Future Leaders October 2026'
export const REMINDER_MINUTES = [15, 30, 60, 1440] as const

export type ReminderMinutes = (typeof REMINDER_MINUTES)[number]

export type ProgrammeScheduleItem = {
  sessionNumber: number
  slug: string
  title: string
  date: string
  time: string
  startAt: string
  endAt: string
  durationMinutes: number
}

const WAT = '+01:00'

const scheduleItem = (
  sessionNumber: number,
  slug: string,
  title: string,
  date: string,
  time: string,
): ProgrammeScheduleItem => {
  const [hour, minute] = time.split(':').map(Number)
  const endHour = hour + 1
  const endTime = `${String(endHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  return {
    sessionNumber,
    slug,
    title,
    date,
    time,
    startAt: `${date}T${time}:00${WAT}`,
    endAt: `${date}T${endTime}:00${WAT}`,
    durationMinutes: PROGRAMME_SESSION_MINUTES,
  }
}

export const PROGRAMME_SCHEDULE: ProgrammeScheduleItem[] = [
  scheduleItem(0, 'afl-2026-cohort-onboarding', 'Africa Future Leaders 2026: Cohort Onboarding', '2026-10-10', '16:00'),
  scheduleItem(1, 'global-talent-playbook', 'The Global Talent Playbook: How to Become Competitive Beyond Africa', '2026-10-11', '16:00'),
  scheduleItem(2, 'beyond-the-paycheck', 'Beyond the Paycheck: Building Career Capital and Financial Power', '2026-10-13', '18:00'),
  scheduleItem(3, 'from-expertise-to-authority', 'From Expertise to Authority: Becoming a Voice People Listen To', '2026-10-15', '18:00'),
  scheduleItem(4, 'leadership-multiplier', 'The Leadership Multiplier: How to Build People, Teams and Movements', '2026-10-17', '16:00'),
  scheduleItem(5, 'africas-hard-problems', "Africa's Hard Problems: Turning Complexity Into Opportunity", '2026-10-20', '18:00'),
  scheduleItem(6, 'ai-native-leadership', 'AI-Native Leadership: Leading in a World Built Around AI', '2026-10-22', '18:00'),
  scheduleItem(7, 'from-knowledge-to-ideas', 'From Knowledge to Ideas: How to Produce Thinking That Matters', '2026-10-24', '16:00'),
  scheduleItem(8, 'collaboration-advantage', 'The Collaboration Advantage: Building Across Borders, Sectors and Industries', '2026-10-27', '18:00'),
  scheduleItem(9, 'beyond-the-initiative', 'Beyond the Initiative: Building Solutions That Actually Scale', '2026-10-29', '18:00'),
  scheduleItem(10, 'the-10-year-question', 'The 10-Year Question: What Will Your Leadership Have Changed?', '2026-10-31', '16:00'),
]

export function validateProgrammeEventInput(input: { startAt: string; endAt: string }): void {
  const start = Date.parse(input.startAt)
  const end = Date.parse(input.endAt)

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('Programme event dates must be valid')
  }
  if (end <= start) {
    throw new Error('Programme event end must be after the start')
  }
  if (end - start > PROGRAMME_SESSION_MINUTES * 60 * 1000) {
    throw new Error(`Programme event duration cannot exceed ${PROGRAMME_SESSION_MINUTES} minutes`)
  }
}

export function formatProgrammeDate(value: string, timeZone = 'Africa/Lagos'): string {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(new Date(value))
}
