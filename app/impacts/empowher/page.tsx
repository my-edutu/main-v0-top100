import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { ogMetadata } from "@/lib/og"
import { pageOg } from "@/lib/og-pages"
import { SITE_URL } from "@/lib/site"

const caseStudyPath = "/impacts/empowher"
const caseStudyCard = pageOg(caseStudyPath)

export const metadata: Metadata = {
  title: caseStudyCard.title,
  description: caseStudyCard.subtitle,
  alternates: { canonical: `${SITE_URL}${caseStudyPath}` },
  ...ogMetadata(caseStudyCard, { url: caseStudyPath }),
}

export default function EmpowHERCaseStudy() {
  return (
    <article className="container max-w-3xl py-10 sm:py-16">
      <Link href="/impacts#case-studies" className="font-semibold text-orange-800 underline underline-offset-4">Back to Impact</Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">44 women chosen for EmpowHER</h1>
      <p className="mt-3 text-sm text-slate-600"><time dateTime="2026-05-02">2 May 2026</time> · Nigeria</p>
      <figure className="my-6">
        <Image src="/images/empowher-showcase.jpg" alt="Young women wearing SWIS EmpowHER shirts" width={980} height={653} className="h-auto w-full rounded-2xl" />
        <figcaption className="mt-2 text-xs text-slate-600">Photo from SWIS Africa.</figcaption>
      </figure>
      <div className="space-y-6 text-base leading-7 text-slate-700">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-slate-950">What happened</h2>
          <p>SWIS Africa chose 44 women in their last year of university. The programme gave them a place to build skills, get advice, and work in teams. On 26 September, the teams shared 10 projects. They worked on ideas for science, jobs, and new businesses.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-slate-950">Who helped</h2>
          <p>SWIS Africa led the programme with Top100. The European Union and Global Youth Mobilization supported it through the Youth Empowerment Fund.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-slate-950">What the numbers show</h2>
          <p>SWIS Africa reported 44 people chosen and 10 projects shared. A later check would show how many people finished the programme or found work.</p>
        </section>
        <ul className="space-y-2">
          <li><a className="text-orange-800 underline underline-offset-4" href="https://www.swisafrica.org/post/swis-africa-selects-44-women-for-inaugural-empowher-program">SWIS Africa’s update on the 44 students</a></li>
          <li><a className="text-orange-800 underline underline-offset-4" href="https://www.swisafrica.org/post/from-classroom-to-showcase-swis-empowher-fellows-present-their-final-projects">SWIS Africa’s report on the 10 projects</a></li>
        </ul>
      </div>
    </article>
  )
}
