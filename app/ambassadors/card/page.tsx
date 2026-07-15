import type { Metadata } from "next"

import ShareCardStudio from "./ShareCardStudio"

export const metadata: Metadata = {
  title: "Ambassador Share Card",
  description:
    "Create your personalised Top100 Africa Future Leaders ambassador card. Add your photo, download it, and share it with your community.",
  openGraph: {
    title: "Ambassador Share Card | Top100 Africa Future Leaders",
    description:
      "Add your photo, download your ambassador card, and share it with your community.",
  },
}

export default function AmbassadorCardPage() {
  return (
    <main className="bg-white">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-600">
            Ambassadors
          </span>
          <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Make your ambassador card
          </h1>
          <p className="mt-4 text-pretty text-lg text-slate-600">
            Add your photo, set your name and title, and download a card ready to post. It takes
            about a minute — and your photo never leaves your device.
          </p>
        </div>

        <div className="mt-12">
          <ShareCardStudio />
        </div>
      </section>
    </main>
  )
}
