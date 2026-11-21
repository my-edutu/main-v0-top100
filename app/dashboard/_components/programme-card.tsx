import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SafeImage from '@/components/safe-image'

export type ProgrammeCardData = {
  slug: string
  title: string
  month: string
  status: string
  summary?: string
}

const illustration = {
  learning: ['programmes/school-books.svg', 'amber'],
  community: ['promo-community.svg', 'mint'],
  speaker: ['programmes/speaker-mic.svg', 'lavender'],
  career: ['programmes/career-case.svg', 'mint'],
  research: ['programmes/innovation-chip.svg', 'lavender'],
  fieldwork: ['programmes/field-notes.svg', 'mint'],
  recognition: ['promo-award.svg', 'amber'],
} as const

const themes: Partial<Record<string, keyof typeof illustration>> = {
  'project100-education-access': 'learning',
  'community-impact-onboarding': 'community',
  'leadership-kickoff': 'speaker',
  'career-pathways-cohort-1': 'career',
  'career-clinic': 'career',
  'youth-leadership-forum': 'speaker',
  'girls-in-stem-mentorship': 'research',
  'campus-summit': 'learning',
  'research-collaboration': 'research',
  'entrepreneurship-digital-skills': 'career',
  'ai-for-africa': 'research',
  'campus-impact-lab-june': 'fieldwork',
  'volunteer-action-day': 'community',
  'community-impact-challenge': 'community',
  'climate-campus-challenge': 'fieldwork',
  'women-in-leadership-and-stem': 'speaker',
  'public-health-wellbeing': 'community',
  'campus-impact-lab-september': 'fieldwork',
  'cross-border-opportunity-labs': 'research',
  'career-pathways-cohort-2': 'career',
  'civic-participation': 'speaker',
  'future-leaders-festival-awards': 'recognition',
  'stories-with-receipts': 'fieldwork',
  'impact-finance-learning-report': 'fieldwork',
  'community-recognition-planning': 'recognition',
}

function ProgrammeArtwork({ slug }: { slug: string }) {
  const [artwork] = illustration[themes[slug] ?? 'community']
  return <span className="programme-card-art" aria-hidden="true">
    <SafeImage src={`/illustrations/${artwork}`} alt="" fill sizes="128px" unoptimized className="object-contain" />
  </span>
}

export function ProgrammeCard({ programme, inRail = false }: { programme: ProgrammeCardData; inRail?: boolean }) {
  const [, tone] = illustration[themes[programme.slug] ?? 'community']

  return (
    <Link
      href={`/dashboard/discover/programmes/${programme.slug}`}
      prefetch={false}
      data-programme-tone={tone}
      className={`programme-roadmap-card${inRail ? ' programme-card-rail' : ''}`}
    >
      <span className="programme-roadmap-copy">
        <span className="programme-roadmap-status">{programme.month} 2027 · {programme.status}</span>
        <span className="programme-roadmap-title">{programme.title}</span>
        {programme.summary && <span className="programme-roadmap-summary">{programme.summary}</span>}
        <span className="programme-roadmap-label">View programme <ArrowRight size={16} aria-hidden="true" /></span>
      </span>
      <ProgrammeArtwork slug={programme.slug} />
    </Link>
  )
}

export function ProgrammeDetailHeader({ programme, format }: {
  programme: ProgrammeCardData
  format: string
}) {
  const [, tone] = illustration[themes[programme.slug] ?? "community"]

  return (
    <header data-programme-tone={tone} className="programme-roadmap-card programme-detail-header">
      <div className="programme-roadmap-copy">
        <p className="programme-roadmap-status">{programme.month} 2027 · {format} · {programme.status}</p>
        <h1 className="programme-roadmap-title">{programme.title}</h1>
        {programme.summary && <p className="programme-roadmap-summary">{programme.summary}</p>}
      </div>
      <ProgrammeArtwork slug={programme.slug} />
    </header>
  )
}
