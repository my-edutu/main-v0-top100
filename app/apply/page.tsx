import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Globe2 } from "lucide-react"

import AwardeesCarousel from "./_components/awardees-carousel"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { APPLY_AWARDEE_FORM_URL } from "@/lib/applications"
import { getAwardees } from "@/lib/awardees"

export const metadata: Metadata = {
  title: "Apply for the 2026 Africa Future Leaders Program",
  description:
    "Explore the 2026 Africa Future Leaders Program, its benefits, and the path into the application and partnership flow.",
  openGraph: {
    title: "Apply for the 2026 Africa Future Leaders Program",
    description:
      "Applications are open for the 2026 Africa Future Leaders cohort. Explore benefits, visibility, and partner opportunities.",
    images: ["/top100 magazine.webp"],
  },
}

const faqItems = [
  {
    question: "Who can apply for the 2026 awardee cohort?",
    answer:
      "The awardee route is designed for first-class graduates and emerging leaders already building measurable impact in their communities, campuses, or industries.",
  },
  {
    question: "Can an organisation or brand partner with Top100?",
    answer:
      "Yes. Use the partnership route to share sponsorship goals, collaboration ideas, campaign concepts, or ecosystem support opportunities with the team.",
  },
  {
    question: "How does the review process work?",
    answer:
      "Each submission is reviewed by the admin team, then routed to the right lead for follow-up, shortlisting, or the next conversation.",
  },
  {
    question: "How will I know if my application has been received?",
    answer:
      "After you submit, your entry is stored in the review queue and the team follows up directly by email when there is a decision or next step.",
  },
]

const APPLY_NEXT_STEP_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_115655_b4d9cd77-feed-43cd-a198-af78ebdf1f7a.mp4'

export default async function ApplyLandingPage() {
  const awardees = await getAwardees()

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_22%),linear-gradient(180deg,#fffaf4_0%,#ffffff_50%,#f5efe4_100%)]">
      <section className="relative flex min-h-[70vh] items-center overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-center text-center">
          <div className="flex w-full flex-col items-center justify-center gap-6 sm:gap-7 lg:gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-orange-700 shadow-sm backdrop-blur">
              2026 application open
            </div>

            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 sm:gap-5">
              <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                The 2026 Africa Future Leaders Program Is Now Open
              </h1>

              <p className="max-w-2xl text-pretty text-base leading-8 text-slate-600 sm:text-lg lg:text-xl">
                Join the next set of leaders with remarkable impact across the continent. Open to first-class graduates only.
              </p>
            </div>

            <div className="mx-auto flex w-full max-w-xl flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
              <Button asChild className="h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 text-[#fff] shadow-none hover:opacity-95 sm:w-64">
                <a href={APPLY_AWARDEE_FORM_URL} target="_blank" rel="noopener noreferrer">
                  Start application
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-full border-orange-200 bg-white px-8 text-orange-700 hover:bg-orange-50 sm:w-64">
                <Link href="/partnership">
                  Partner with us
                  <Globe2 className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-[360px] items-center justify-center overflow-hidden bg-black px-4 py-16 text-center sm:min-h-[420px] sm:px-6 lg:min-h-[460px] lg:px-8">
        <div className="absolute inset-0">
          <Image
            src="/african-students-celebrating-achievement-at-gradua.jpg"
            alt="Top100 Africa Future Leaders impact background"
            fill
            className="object-cover object-center"
            sizes="100vw"
          />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/55" />
        </div>

        <div className="relative mx-auto max-w-4xl space-y-6 text-[#fff]">
          <h2
            className="text-balance text-3xl font-semibold leading-[1.02] tracking-tight drop-shadow-[0_4px_22px_rgba(0,0,0,0.55)] sm:text-4xl lg:text-5xl"
            style={{ color: '#fff' }}
          >
            One network. Many stories.
          </h2>
          <p
            className="mx-auto max-w-2xl text-pretty text-base leading-7 drop-shadow-[0_3px_16px_rgba(0,0,0,0.55)] sm:text-lg sm:leading-8"
            style={{ color: '#fff' }}
          >
            Join a continent-wide community of first-class graduates and emerging leaders creating measurable impact
            across 31 countries.
          </p>
        </div>
      </section>

      <AwardeesCarousel awardees={awardees} />

      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="rounded-[28px] border border-[#e9dfd0] bg-white px-6 py-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.18)] sm:px-8 sm:py-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-orange-700">
                Frequently asked questions
              </p>
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Everything you may want to know before applying.
              </h2>
            </div>

            <Accordion type="single" collapsible className="mt-6">
              {faqItems.map((item, index) => (
                <AccordionItem key={item.question} value={`faq-${index}`} className="border-[#eadfce]">
                  <AccordionTrigger className="text-left text-base font-semibold text-slate-950 hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-7 text-slate-600">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="relative overflow-hidden rounded-[32px] px-6 py-7 text-[#fff] sm:px-8 sm:py-8">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              aria-hidden="true"
              preload="metadata"
            >
              <source src={APPLY_NEXT_STEP_VIDEO_URL} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/65 to-slate-950/55" />

            <div className="relative z-10 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#fff]/80">
                Next step
              </p>
              <h3 className="text-balance text-3xl font-semibold tracking-tight sm:text-[2rem]">
                Ready to join the next class of Africa Future Leaders?
              </h3>
              <p className="text-sm leading-7 text-[#fff]/80 sm:text-base">
                Start your awardee application or open the partnership route if you want to back the movement with visibility, funding, or collaboration.
              </p>
            </div>

            <div className="relative z-10 mt-8 flex flex-col gap-3">
              <Button asChild className="h-14 rounded-full bg-white px-8 text-orange-700 shadow-none hover:bg-orange-50">
                <a href={APPLY_AWARDEE_FORM_URL} target="_blank" rel="noopener noreferrer">
                  Apply now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-full border-white/60 bg-transparent px-8 text-[#fff] hover:bg-white/15">
                <Link href="/partnership">
                  Partner with us
                  <Globe2 className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
