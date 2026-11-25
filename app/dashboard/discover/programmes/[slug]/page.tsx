import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Clock } from 'lucide-react'

import Image from '@/components/safe-image'
import { project100OutreachPhotos, project100OutreachSource } from '@/lib/project100/outreach-photos'
import { ProgrammeDetailHeader } from '../../../_components/programme-card'
import { ProgrammeActionBar, programmeActionClass } from '../programme-action-bar'
import { programmes } from '../roadmap'
import { Project100Countdown } from './project100-countdown'

const base = '/dashboard/discover/programmes'
const featuredOutreachPhotos = project100OutreachPhotos.slice(0, 4)

export default async function ProgrammeDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const programme = programmes.find(item => item.slug === slug)

  if (!programme) notFound()

  const isCommunity = programme.id === 'community-impact-network'
  const isProject100 = slug === 'project100-education-access'
  const previewProject100 = process.env.NODE_ENV === 'development' && process.env.PROJECT100_LAUNCH_PREVIEW === 'true'

  return (
    <article className="mx-auto max-w-3xl space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <ProgrammeDetailHeader programme={programme} format={programme.format} />

      <section className="space-y-2" aria-labelledby="about-programme">
        <h2 id="about-programme" className="text-xl font-bold text-[#211d19]">About this programme</h2>
        {isCommunity ? <>
          <p className="text-base leading-7 text-[#514940]">You can help someone take their next step. The Community Impact Network brings Top100 members together to share what they know and help their communities.</p>
          <p className="text-base leading-7 text-[#514940]">Think of a student about to face their first job interview. You could tell them what helped you, run a practice interview, or introduce them to someone in their field.</p>
        </> : programme.description && <p className="text-base leading-7 text-[#514940]">{programme.description}</p>}
        {isProject100 && <>
          <p className="text-base leading-7 text-[#514940]">Top100 plans to work with a local education partner and families to find out what each child needs. That could mean help with fees, a uniform or school supplies. After children return, the team plans to check in with families and schools to see how they’re doing and help with barriers that come up.</p>
          <p className="text-sm leading-6 text-[#625b52]">The campaign launches on December 1, 2026. The school-return pilot is planned for January 2027, pending partner approval and child safety checks.</p>
        </>}
      </section>

      {isProject100 && <section className="space-y-3" aria-labelledby="project100-gallery">
        <h2 id="project100-gallery" className="text-xl font-bold text-[#211d19]">Project100 school visits</h2>
        <p className="text-sm leading-6 text-[#625b52]">Photos from earlier outreach in Delta, Anambra, Bayelsa and Lagos.</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {featuredOutreachPhotos.map(({ id, src, alt }) => (
            <li key={id}>
              <a href={src} className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a3412]">
                <Image src={src} alt={alt} fill sizes="(max-width: 639px) 50vw, 190px" className="object-cover" />
              </a>
            </li>
          ))}
        </ul>
        <a href={project100OutreachSource} className="inline-flex min-h-11 items-center text-sm font-semibold text-orange-800 underline underline-offset-4">See Project100 outreach updates on LinkedIn</a>
      </section>}

      {isCommunity && <>
        <section className="space-y-3" aria-labelledby="community-roles">
          <h2 id="community-roles" className="text-xl font-bold text-[#211d19]">Ways to get involved</h2>
          <ul className="space-y-3 text-sm leading-6 text-[#514940] sm:text-base">
            <li><strong className="text-[#211d19]">Speak at a session.</strong> Tell your story, join a panel, or teach a skill people can use.</li>
            <li><strong className="text-[#211d19]">Mentor someone.</strong> Help a member work on a goal, prepare for an interview, or decide what to do next.</li>
            <li><strong className="text-[#211d19]">Lend a hand.</strong> Help run a workshop or take part in a local project.</li>
            <li><strong className="text-[#211d19]">Make a connection.</strong> Introduce the team to a school, alumni group, or local partner.</li>
          </ul>
        </section>
        <section className="space-y-2" aria-labelledby="community-next-steps">
          <h2 id="community-next-steps" className="text-xl font-bold text-[#211d19]">What happens after you apply</h2>
          <p className="text-base leading-7 text-[#514940]">
            Tell us how you’d like to help and when you’re free. The Top100 team may reach out when there’s an activity that fits your skills and time.
          </p>
        </section>
      </>}

      {isCommunity ? <ProgrammeActionBar>
        <Link href={`${base}/${programme.slug}/apply`} className={programmeActionClass}>
          Express your interest <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </ProgrammeActionBar> : isProject100 ? <ProgrammeActionBar>
        {previewProject100 ? <Link href="/dashboard/me/project100-scholarship" className={programmeActionClass}>
          Preview Project100 <ArrowRight size={18} aria-hidden="true" />
        </Link> : <Project100Countdown />}
      </ProgrammeActionBar> : <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5" aria-labelledby="take-part">
        <h2 id="take-part" className="text-lg font-bold text-[#211d19]">Taking part</h2>
        <p className="text-sm leading-6 text-[#625b52]">Top100 will share dates and participation details once this programme is confirmed.</p>
        <ProgrammeActionBar>
          <p className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-stone-700">
            <Clock size={18} aria-hidden="true" /> Coming soon
          </p>
        </ProgrammeActionBar>
      </section>}
    </article>
  )
}
