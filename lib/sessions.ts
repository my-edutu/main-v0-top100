import { PROGRAMME_ARTWORK } from '@/lib/events/programme-artwork'
import { formatProgrammeDate } from '@/lib/events/programme'
import type { LiveCalendarEvent } from '@/lib/events/live-calendar'
import { getSpeaker } from '@/lib/speakers'

export type SessionResourceType = 'video' | 'presentation' | 'workshop' | 'writeup'

export interface SessionResource {
  title: string
  type: SessionResourceType
  url: string
  description?: string
  presenter?: string
}

export interface Session {
  slug: string
  year: number
  title: string
  presenter?: string
  date?: string
  coverImage?: string
  locked?: boolean
  unlockAt?: string
  includeRecordingInResources?: boolean
  summary?: string
  featured?: boolean
  resources: SessionResource[]
}

export const archiveYears = [2024, 2025, 2026] as const

const umunna = getSpeaker('odinakachi-umunna')

function isSessionLocked(session: Session): boolean {
  if (!session.locked) return false
  if (!session.unlockAt) return true
  const unlockAt = Date.parse(session.unlockAt)
  return !Number.isFinite(unlockAt) || Date.now() < unlockAt
}

const additionalSessionDescriptions: Array<{ topic: RegExp; summary: string }> = [
  {
    topic: /^(?:the opportunity builder:|bloom\s*[-–—])/i,
    summary: 'Your potential creates more opportunities when people can see the value you bring. This session explores how to position yourself for world class opportunities by connecting your strengths and ambitions with a clear sense of purpose. Consider how visibility, relationships, and the way you communicate your work can help your contribution reach the right people and places. Reflect on what you want to be known for, where you want to make an impact, and the next steps that can help you move from potential to purpose and build a global outlook.',
  },
  {
    topic: /^(?:succeeding in the ai era:|succeeding in a tech driven society[;:])/i,
    summary: 'Technology is changing the way young leaders learn, work, and make decisions. This session explores how to position yourself in a tech driven society, make better decisions, and build a competitive advantage. Consider how you assess new information, choose the tools and skills that support your goals, and stay focused on the human judgement behind important decisions. Reflect on where technology is changing your field and how you can keep learning and contribute with purpose.',
  },
  {
    topic: /^from problem to product to market:/i,
    summary: 'A solution becomes valuable when it addresses a problem that matters to the people expected to use it. This session follows the journey from understanding a need to shaping a product and finding a place for it in the market. Explore the questions behind that journey: who experiences the problem, how they manage it today, what a useful solution would change, and why someone would choose to pay for it. Whether you are considering a new venture or developing an existing idea, use this session to examine your assumptions and connect your ambition with the needs of potential customers. It is an invitation to think carefully about the problem before deciding what to build.',
  },
  {
    topic: /^from knowledge to impact:/i,
    summary: 'What you know becomes more useful when you can think it through, explain it clearly, and connect it with action. This session explores the relationship between clear thinking, effective communication, and meaningful impact. Consider how you form a point of view, distinguish a useful idea from a collection of information, and communicate in a way that helps others understand why it matters. For emerging leaders, these abilities shape how you contribute to conversations, make proposals, and bring people into your work. Use the session to reflect on the ideas you want to share, the audience you hope to reach, and the change you want your contribution to support.',
  },
  {
    topic: /^the employability advantage:/i,
    summary: 'Getting hired and growing into leadership both begin with understanding the contribution you can make. This session explores how to position yourself for opportunities, communicate your strengths, and approach your career with a clearer sense of direction. Consider how your skills, experience, and interests fit the work you want to do, and how to make that connection understandable to a potential employer. The conversation also invites you to look beyond the application stage and reflect on how you continue learning, take responsibility, and build trust once an opportunity begins. Whether you are seeking your first role or preparing for your next step, use this session to consider how you want to grow and what you need to develop along the way.',
  },
  {
    topic: /^the collaboration advantage:/i,
    summary: 'Relationships can open possibilities that are difficult to create alone. This session explores how strategic connections, partnerships, and collaboration across borders can bring people and ideas together around shared opportunities. Consider what makes a relationship useful to everyone involved: a clear purpose, complementary strengths, mutual trust, and a willingness to contribute. For leaders working across communities, sectors, or countries, collaboration also asks for an understanding of different priorities and ways of working. Use this session to reflect on the relationships around your work, the partners who could help it develop, and the value you could offer in return. The aim is to approach connection with intention and build a foundation for working together.',
  },
]

const availableSessions: Session[] = [
  {
    slug: '2026-onboarding',
    year: 2026,
    title: 'Africa Future Leaders 2026: Cohort Onboarding',
    presenter: 'Emmanuella Igboafu',
    coverImage: PROGRAMME_ARTWORK[0]?.src,
    summary: 'Your Africa Future Leaders journey starts here. Join Emmanuella Igboafu for a welcome to the 2026 cohort and an introduction to the October learning programme. This onboarding session sets the context for the experience ahead: a space to develop your thinking, learn alongside other emerging leaders, and connect what you learn with the work you want to do in your community. As you begin, consider what you hope to gain, the experiences you can share, and the relationships you want to build. Meaningful participation starts with curiosity, a willingness to contribute, and an openness to perspectives beyond your own. Whether you are joining the cohort for the first time or returning to the recording, use this session to orient yourself, reflect on your goals, and prepare for the conversations and learning ahead.',
    featured: true,
    resources: [],
  },
  {
    slug: '2026-day-1',
    year: 2026,
    title: 'Beyond the Paycheck: How to Build Valuable Skills, Increase Your Earning Power and Create Financial Options Early in Your Career',
    presenter: umunna?.name ?? 'Odinakachi Umunna',
    coverImage: '/images/session-beyond-the-paycheck.jpg',
    summary: 'The early years of your career are an opportunity to build skills and experience that can shape your choices for years to come. Join Odinakachi Umunna for a session on developing valuable skills, increasing your earning power, and creating financial options as your career grows. Reflect on the problems you can help solve, the abilities you want to strengthen, and how to make the value of your work clear to others. The topic invites you to consider how your learning, experience, and professional decisions fit together over time. Whether you are starting out or thinking about your next move, use this session to assess where you are today and identify the capabilities you want to build for the future.',
    featured: true,
    resources: [
      {
        title: 'Beyond the Paycheck session slides',
        type: 'presentation',
        url: '/api/session-materials/beyond-the-paycheck/presentation',
      },
      {
        title: 'Session recording',
        type: 'video',
        url: 'https://drive.google.com/file/d/1z5o0D9gepxqm6Iebzb95uCDE8_MAr7V_/preview',
      },
    ],
  },
  {
    slug: '2026-from-idea-to-scale',
    year: 2026,
    title: 'From Idea to Scale: How to Build Ventures, Programmes and Communities That Actually Grow [workshop]',
    presenter: 'Nwosu Paul Light',
    coverImage: '/images/session-from-idea-to-scale.jpg',
    includeRecordingInResources: true,
    summary: 'Turning an idea into something that grows requires decisions about who it serves, how it works, and what will keep it going. This workshop explores that journey through ventures, programmes, and communities, inviting you to think about the foundations behind meaningful growth. Consider the need your idea addresses, the value it offers, and the people whose participation could help it develop. As an initiative grows, questions about delivery, resources, relationships, and purpose become increasingly important. Use this workshop to look at your own idea or existing work, identify the assumptions that need attention, and consider what a practical next stage could look like. The goal is to connect your ambition with a clearer understanding of what growth will require.',
    featured: true,
    resources: [
      {
        title: 'From Idea to Scale session recording',
        type: 'video',
        url: 'https://drive.google.com/file/d/1yhon1_IU_3VVvu6rt8BwJ82uToaPVuVc/view?usp=sharing',
      },
      {
        title: 'From Idea to Scale workshop preview',
        type: 'presentation',
        url: '/api/session-materials/from-idea-to-scale/presentation',
      },
    ],
  },
  {
    slug: '2026-bloom-positioning',
    year: 2026,
    title: 'BLOOM - Positioning Yourself for World Class Opportunities: From Potential to Purpose, Visibility and Global Impact',
    presenter: 'Cynthia Ohaeri',
    coverImage: '/images/session-bloom-positioning.jpg',
    includeRecordingInResources: true,
    summary: 'Your potential creates more opportunities when people can see the value you bring. This session explores how to position yourself for world class opportunities by connecting your strengths and ambitions with a clear sense of purpose. Consider how visibility, relationships, and the way you communicate your work can help your contribution reach the right people and places. Reflect on what you want to be known for, where you want to make an impact, and the next steps that can help you move from potential to purpose and build a global outlook.',
    featured: true,
    resources: [
      {
        title: 'Cynthia Ohaeri BLOOM session recording',
        type: 'video',
        url: 'https://drive.google.com/file/d/1kR5dRZbhziH5tA1LUp6ii3gyG42Gz8Xg/view?usp=sharing',
      },
      {
        title: 'BLOOM session preview',
        type: 'presentation',
        url: '/api/session-materials/bloom/presentation',
      },
    ],
  },
  {
    slug: '2026-tech-driven-society',
    year: 2026,
    title: 'Succeeding in a tech driven society; How Young Leaders Can position themselves in Making Better Decisions and Building Competitive Advantage',
    presenter: 'Emmanuel Chukwu',
    coverImage: '/images/session-tech-driven-society.jpg',
    locked: true,
    unlockAt: '2026-10-23T00:00:00+01:00',
    summary: 'Technology is changing the way young leaders learn, work, and make decisions. This session explores how to position yourself in a tech driven society, make better decisions, and build a competitive advantage. Consider how you assess new information, choose the tools and skills that support your goals, and stay focused on the human judgement behind important decisions. Reflect on where technology is changing your field and how you can keep learning and contribute with purpose.',
    featured: true,
    resources: [
      {
        title: 'Succeeding in a tech driven society session recording',
        type: 'video',
        url: 'https://drive.google.com/file/d/1iyzOszSw4YhIKOBKc69_a6gbbYgsFe4j/view?usp=sharing',
      },
    ],
  },
]

function getAttachmentResource(attachment: NonNullable<LiveCalendarEvent['attachments']>[number]): SessionResource | undefined {
  const mimeType = attachment.mimeType?.toLowerCase() ?? ''
  const filename = attachment.title.toLowerCase()
  const type: SessionResourceType | undefined = mimeType.startsWith('video/') || /recording|video/.test(filename)
    ? 'video'
    : /presentation|slides|\.pdf$/.test(filename) || mimeType === 'application/pdf'
      ? 'presentation'
      : /workshop|template|exercise/.test(filename)
        ? 'workshop'
        : /chat|notes|transcript|document/.test(filename) || mimeType.startsWith('text/') || mimeType.includes('google-apps.document')
          ? 'writeup'
          : undefined
  if (!type) return undefined

  const title = type === 'video'
    ? 'Session recording'
    : type === 'writeup' && /chat/i.test(attachment.title)
      ? 'Session chat'
      : attachment.title.replace(/\s+-\s+\d{4}\/.*$/, '').trim()

  return { title, type, url: attachment.url }
}

function toArchiveSession(event: LiveCalendarEvent): Session {
  const isOnboarding = /awardee onboarding/i.test(event.title)
  const isUmunnaSession = /^beyond the paycheck:/i.test(event.title)
  const isIdeaToScale = /^from idea to scale:/i.test(event.title)
  const isBloomSession = /^(?:the opportunity builder:|bloom\s*[-–—])/i.test(event.title)
  const isTechSession = /^(?:succeeding in the ai era:|succeeding in a tech driven society[;:])/i.test(event.title)
  const isKnowledgeImpactSession = /^from knowledge to impact:/i.test(event.title)
  const available = isOnboarding
    ? availableSessions[0]
    : isUmunnaSession
      ? availableSessions[1]
      : isIdeaToScale
        ? availableSessions[2]
        : isBloomSession
          ? availableSessions[3]
          : isTechSession ? availableSessions[4] : undefined

  return {
    ...(available ?? {
      slug: `locked-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      year: 2026,
      resources: [],
    }),
    // The archive title follows the member-facing programme event title.
    title: isOnboarding
      ? 'Africa Future Leaders 2026: Cohort Onboarding'
      : isBloomSession
        ? availableSessions[3].title
        : isTechSession ? availableSessions[4].title : event.title,
    summary: available?.summary ?? additionalSessionDescriptions.find(({ topic }) => topic.test(event.title))?.summary,
    date: formatProgrammeDate(event.startAt),
    coverImage: isOnboarding
      ? event.cover ?? available?.coverImage
      : isKnowledgeImpactSession ? '/images/session-from-knowledge-to-impact.jpg' : available?.coverImage,
    presenter: isOnboarding
      ? 'Emmanuella Igboafu'
      : isUmunnaSession
        ? (umunna?.name ?? 'Odinakachi Umunna')
        : isIdeaToScale
          ? 'Nwosu Paul Light'
          : isBloomSession ? 'Cynthia Ohaeri' : isTechSession ? 'Emmanuel Chukwu' : undefined,
    resources: [...(available?.resources ?? []), ...(event.attachments ?? []).map(getAttachmentResource).filter((resource): resource is SessionResource => Boolean(resource))]
      .filter((resource, index, all) => all.findIndex((candidate) => candidate.url === resource.url) === index),
    locked: !available || isSessionLocked(available),
  }
}

export function getSessionBySlug(slug: string): Session | undefined {
  const session = availableSessions.find((candidate) => candidate.slug === slug)
  return session && !isSessionLocked(session) ? session : undefined
}

export function getSessionsByYear(calendarEvents: LiveCalendarEvent[] = []): Array<{ year: number; sessions: Session[] }> {
  const currentSessions = calendarEvents.length > 0
    ? calendarEvents
      .filter((event) => event.title.trim().length > 0)
      .filter((event, index, all) => all.findIndex((candidate) => candidate.title === event.title) === index)
      .map(toArchiveSession)
    : availableSessions.map((session) => ({ ...session, locked: isSessionLocked(session) }))
  const years = new Set<number>([...archiveYears, ...currentSessions.map((session) => session.year)])

  return [...years]
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      sessions: currentSessions.filter((session) => session.year === year),
    }))
}
