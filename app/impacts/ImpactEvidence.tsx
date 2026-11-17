import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Download } from "lucide-react"

const reportPath = "/reports/top100-2026-empowerment-sessions-impact-report.pdf"

export default function ImpactEvidence() {
  return (
    <>
      <section id="case-studies" aria-labelledby="case-studies-title" className="scroll-mt-24 bg-[#fff] py-10 sm:py-16">
        <div className="container max-w-5xl">
          <h2 id="case-studies-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Case study</h2>
          <article className="mt-4 grid grid-cols-[1fr_1.65fr] overflow-hidden rounded-2xl border border-orange-100 bg-[#fffaf2] sm:grid-cols-[1fr_1.5fr]">
            <div className="relative min-h-40">
              <Image src="/images/empowher-showcase.jpg" alt="Young women wearing SWIS EmpowHER shirts" fill sizes="(max-width: 639px) 38vw, 390px" className="object-cover" />
            </div>
            <div className="min-w-0 p-3 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-800">EmpowHER</p>
              <h3 className="mt-1 text-lg font-semibold leading-tight sm:text-2xl">44 women chosen for EmpowHER</h3>
              <p className="mt-2 text-xs text-slate-600 sm:text-sm"><time dateTime="2026-05-02">2 May 2026</time> · Nigeria</p>
              <p className="mt-2 text-sm leading-5 text-slate-700 sm:leading-6">SWIS Africa chose 44 students for training and advice. In September, the group shared 10 projects.</p>
              <Link href="/impacts/empowher" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-orange-800 underline underline-offset-4 hover:text-orange-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">
                Read the full story <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
              </Link>
            </div>
          </article>
        </div>
      </section>
      <section id="impact-reports" aria-labelledby="impact-reports-title" className="scroll-mt-24 border-t border-orange-100 bg-[#fffaf2] py-8 sm:py-12">
        <div className="container flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="impact-reports-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Download impact reports</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-700 sm:text-base">
              See who spoke, what they covered, and how we worked out the attendance estimate for the 2026 Empowerment Sessions.
            </p>
          </div>
          <a href={reportPath} download className="inline-flex min-h-11 w-fit shrink-0 items-center justify-center gap-2 rounded-full bg-orange-700 px-5 text-sm font-semibold text-[#fff] hover:bg-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">
            <Download aria-hidden="true" className="size-4" /> Download 2026 report (PDF)
          </a>
        </div>
      </section>
    </>
  )
}
