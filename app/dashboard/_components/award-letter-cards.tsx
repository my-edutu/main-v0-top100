'use client'

import Link from 'next/link'
import Image from '@/components/safe-image'
import { ArrowRight, Files } from 'lucide-react'
import { awardLettersPath, canCreateAwardLetters, letterOptions } from '../_lib/award-letters'
import { useDashboardMember } from '../_providers/dashboard-member'

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2'

type AwardDocumentBanner = {
  title: string
  surface: string
  artwork: string
  description: string
} & ({ href: string; action: string } | { href?: never; action?: never })

const letterBanners: AwardDocumentBanner[] = [
  {
    title: letterOptions.recommendation.title,
    surface: 'bg-[linear-gradient(108deg,#FFDD38_0%,#FFE870_57%,#FFF2B4_100%)] text-[#261D06]',
    artwork: '/images/award-letters/recommendation.webp',
    description: 'Create a recommendation for a scholarship, job or programme, or reopen a saved letter.',
    href: `${awardLettersPath}/recommendation`,
    action: 'Open recommendations',
  },
  {
    title: letterOptions.invitation.title,
    surface: 'bg-[linear-gradient(108deg,#DAD4FF_0%,#E5DDFF_57%,#F5E6F9_100%)] text-[#281C4D]',
    artwork: '/images/award-letters/invitation.webp',
    description: 'Download your festival invitation for travel or sponsorship.',
    href: `${awardLettersPath}/invitation`,
    action: 'Create invitation',
  },
  {
    title: 'Africa Future Leaders Certificate',
    surface: 'bg-[linear-gradient(108deg,#C6EBD9_0%,#DAF0DF_57%,#EDF6DF_100%)] text-[#173C30]',
    artwork: '/images/award-letters/certificate.webp',
    description: 'A digital certificate recognising your Africa Future Leaders award.',
  },
]

function DocumentBanner({ title, surface, artwork, description, href, action }: AwardDocumentBanner) {
  const layout = `group relative isolate grid min-h-[172px] min-w-0 grid-cols-[minmax(0,1fr)_minmax(76px,30%)] items-center overflow-hidden rounded-[24px] px-4 py-5 sm:min-h-[205px] sm:grid-cols-[minmax(0,1fr)_minmax(130px,33%)] sm:px-8 sm:py-6 ${surface}`
  const content = <>
    <div className="relative z-10 min-w-0">
      <h2 className="text-lg font-bold leading-tight tracking-tight sm:text-[1.65rem]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-5 sm:text-base sm:leading-6">{description}</p>
      {href ? (
        <span className="mt-4 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold leading-tight text-[#171412] sm:gap-2 sm:px-4 sm:text-sm">
          {action}
          <ArrowRight size={15} className="shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      ) : <p className="mt-4 text-sm font-semibold">Coming soon</p>}
    </div>
    <div className="pointer-events-none absolute inset-y-1 right-0 w-[29%] sm:inset-y-0 sm:right-3 sm:w-[34%]" aria-hidden="true">
      <Image src={artwork} alt="" fill sizes="(max-width: 639px) 29vw, 305px" className={href ? 'object-contain motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]' : 'object-contain'} />
    </div>
  </>

  return href ? <Link href={href} className={`${layout} ${focus}`}>{content}</Link> : <article className={layout}>{content}</article>
}

export function AwardLettersHomeCard() {
  const { member } = useDashboardMember()
  if (!canCreateAwardLetters(member)) return null

  return (
    <Link href={awardLettersPath} className={`group flex min-w-0 items-center gap-4 rounded-2xl border border-[#EBDDCA] bg-[#FFF8E7] p-4 text-[#171412] transition-colors hover:border-[#D68A38] hover:bg-[#FFF1D0] sm:p-5 ${focus}`}>
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#FFDF45]">
        <Files size={23} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold leading-tight tracking-tight">Your award letters</span>
        <span className="mt-1 block text-sm leading-5 text-[#625449]">Recommendations, festival invitations and certificates</span>
      </span>
      <ArrowRight size={20} className="shrink-0" aria-hidden="true" />
    </Link>
  )
}

export function AwardLetterCards() {
  const { member } = useDashboardMember()
  return (
    <section className="mx-auto max-w-4xl py-1 text-[#171412]" aria-label="Award documents">
      {canCreateAwardLetters(member) ? <>
        <p className="text-sm leading-6 text-[#625449] sm:text-base">Create and download your Top100 award documents.</p>
        <div className="mt-4 grid gap-3 sm:gap-4">
          {letterBanners.map(banner => <DocumentBanner key={banner.title} {...banner} />)}
        </div>
      </> : <p className="mt-2 text-sm text-[#625449]">Letters are available to Top100 awardees.</p>}
    </section>
  )
}
