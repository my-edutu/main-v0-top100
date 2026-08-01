import type { Metadata } from "next"

import { ogMetadata } from "@/lib/og"
import { pageOg } from "@/lib/og-pages"
import { isWaitlistProgramSlug, type WaitlistProgramSlug } from "@/lib/waitlist-programs"
import WaitlistForm from "./WaitlistForm"

export const metadata: Metadata = {
  title: "Join the Waiting List | Top100 Africa Future Leaders",
  description:
    "None of our programmes are open for registration yet. Join the waiting list and we'll email you the moment the Africa Future Leaders Summit 2026, Talk100 Live, or Project100 sessions open.",
  ...ogMetadata(pageOg("/waitlist"), { url: "/waitlist" }),
}

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string }>
}) {
  const { program } = await searchParams
  const initialProgram: WaitlistProgramSlug = isWaitlistProgramSlug(program) ? program : "general"

  return (
    <main className="bg-white">
      <section className="container py-12 md:py-20">
        <div className="mx-auto max-w-2xl">
          <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
            Registration not open yet
          </span>

          <h1 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight text-zinc-900">
            Join the <span className="text-orange-600">waiting list</span>
          </h1>

          <p className="mt-4 text-base md:text-lg text-zinc-500 font-medium">
            Our programmes — including the Africa Future Leaders Summit 2026 in Lagos — are still in
            planning. Dates, venue, and registration are not confirmed yet. Leave your details and
            you&apos;ll be the first to hear when they open.
          </p>

          <div className="mt-8 rounded-3xl border border-zinc-100 bg-zinc-50 p-6 md:p-8">
            <WaitlistForm initialProgram={initialProgram} />
          </div>

          <p className="mt-6 text-xs text-zinc-400">
            We only use your details to notify you about the programme you selected. No spam.
          </p>
        </div>
      </section>
    </main>
  )
}
