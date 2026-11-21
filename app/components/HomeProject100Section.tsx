import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { project100OutreachPhotos, project100OutreachSource } from "@/lib/project100/outreach-photos"

import PhotoSlideshow from "./PhotoSlideshow"

export default function HomeProject100Section() {
  return (
    <section id="project100-scholarship" aria-labelledby="home-project100-title" className="scroll-mt-24 bg-[#fff] py-10 text-slate-950 sm:py-16">
      <div className="container grid items-center gap-6 md:grid-cols-2 lg:gap-12">
        <div>
          <h2 id="home-project100-title" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Project100 Scholarship
          </h2>
          <p className="mt-3 max-w-md text-base leading-7 text-slate-700 sm:text-lg">
            Some children miss school because it costs too much. Top100 helps pay school fees and gives children books and pens. This helps them go back to class and stay in school.
          </p>
          <Link href="/initiatives/project100" className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-orange-800 underline underline-offset-4 hover:text-orange-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">
            Learn about Project100 <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <figure className="min-w-0">
          <PhotoSlideshow photos={project100OutreachPhotos} label="Project100 school visit photos" intervalMs={1800} photoClassName="aspect-[4/3]" sizes="(max-width: 767px) calc(100vw - 32px), 50vw" />
          <figcaption className="mt-2 text-xs text-slate-600">
            Photos from <a href={project100OutreachSource} className="underline underline-offset-2">Project100 Scholarship’s school visits</a>.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
