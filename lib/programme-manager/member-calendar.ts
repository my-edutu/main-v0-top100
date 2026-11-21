import 'server-only'
import calendar from './calendar.json'

export type MemberCalendarItem = {
  id: string
  title: string
  month: string
  format: string
}

const communityTitle = 'Community onboarding + 20 alumni connector invitations'
const careerTitle = 'Career Pathways Labs — Cohort 1 (6 weeks)'
const memberTitles: Record<string, string> = {
  'Project100 route qualification and conditional school-return pilot': 'Project100 education access pilot',
  [communityTitle]: 'Community Impact Network',
}

export const memberCalendar: MemberCalendarItem[] = calendar.map(({ title, month, format }) => ({
  id: title === communityTitle ? 'community-impact-network'
    : title === careerTitle ? 'career-pathways'
    : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
  title: memberTitles[title] ?? title,
  month,
  format,
}))
