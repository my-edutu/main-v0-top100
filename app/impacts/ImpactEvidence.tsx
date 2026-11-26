import Link from "next/link"
import { ArrowRight, Download } from "lucide-react"

import Image from "@/components/safe-image"
import { pageOg } from "@/lib/og-pages"

const reportPaths = [
  "/reports/back-in-class",
  "/reports/beyond-recognition",
  "/reports/opportunity-2027",
] as const

const sessionsPdf = "/reports/top100-2026-empowerment-sessions-impact-report.pdf"
const reports = [
  ...reportPaths.map(href => ({ ...pageOg(href), href })),
  {
    href: sessionsPdf,
    title: "2026 Empowerment Sessions",
    eyebrow: "Impact report",
    subtitle: "Who spoke, what they covered, and how Top100 estimated attendance",
    hero: "/images/past-sessions-hero.webp",
  },
]
const cardClass = "grid grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)] overflow-hidden rounded-2xl border border-orange-100 bg-[#fffaf2] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
const coverSizes = "(min-width: 1024px) 384px, (min-width: 640px) 40vw, 38vw"
const cardContentClass = "min-w-0 p-3 sm:p-6"
const cardLabelClass = "text-xs font-bold uppercase tracking-wide text-orange-800"
const cardTitleClass = "mt-1 text-lg font-semibold leading-tight sm:text-2xl"
const cardDescriptionClass = "mt-2 text-sm leading-5 text-slate-700 sm:leading-6"
const reportLinkClass = "inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-orange-800 underline underline-offset-4 hover:text-orange-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"

export default function ImpactEvidence() {
  return (
    <section id="case-studies" aria-labelledby="case-studies-title" className="scroll-mt-24 bg-white py-10 sm:py-16">
      <div className="container max-w-5xl">
        <h2 id="case-studies-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Impact reports and case studies</h2>
        <article className={`mt-5 ${cardClass}`}>
          <div className="relative min-h-40">
            <Image src="/images/empowher-showcase.jpg" alt="Young women wearing SWIS EmpowHER shirts" fill sizes={coverSizes} className="object-cover" />
          </div>
          <div className={cardContentClass}>
            <p className={cardLabelClass}>EmpowHER case study</p>
            <h3 className={cardTitleClass}>44 women chosen for EmpowHER</h3>
            <p className="mt-2 text-xs text-slate-600 sm:text-sm"><time dateTime="2026-05-02">2 May 2026</time> · Nigeria</p>
            <p className={cardDescriptionClass}>SWIS Africa chose 44 students for training and advice. In September, the group shared 10 projects.</p>
            <Link href="/impacts/empowher" className={`mt-1 ${reportLinkClass}`}>
              Read the full story <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </div>
        </article>

        <ul id="impact-reports" aria-label="Impact reports" className="mt-3 grid scroll-mt-24 gap-3 sm:mt-4 sm:gap-4">
          {reports.map(({ href, title, subtitle, hero, eyebrow }) => (
            <li key={href} className={cardClass}>
              {hero && (
                <div className="relative min-h-40 bg-[#f5f0e7]">
                  <Image src={hero} alt="" fill sizes={coverSizes} className="object-cover" />
                </div>
              )}
              <div className={hero ? cardContentClass : `col-span-2 ${cardContentClass}`}>
                <p className={cardLabelClass}>{eyebrow}</p>
                <h3 className={cardTitleClass}>{title}</h3>
                {subtitle && <p className={cardDescriptionClass}>{subtitle}.</p>}
                {href === sessionsPdf ? (
                  <div className="mt-1 flex flex-wrap gap-x-4">
                    <a href={href} aria-label="Read more about the 2026 Empowerment Sessions (PDF)" className={reportLinkClass}>
                      Read more (PDF) <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                    </a>
                    <a href={href} download className={reportLinkClass}>
                      <Download aria-hidden="true" className="size-4 shrink-0" /> Download PDF
                    </a>
                  </div>
                ) : (
                  <Link href={href} aria-label={`Read more about ${title}`} className={`mt-1 ${reportLinkClass}`}>
                    Read more <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
