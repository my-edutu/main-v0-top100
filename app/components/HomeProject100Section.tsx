import Link from "next/link"
import { ArrowRight } from "lucide-react"

import PhotoSlideshow from "./PhotoSlideshow"

const outreachPhotos = [
  ["17-delta", "Students and volunteers gather outside a school in Delta State"],
  ["02-anambra", "Children sit together during a school visit in Anambra"],
  ["08-bayelsa", "The Project100 team speaks to students in a hall in Bayelsa"],
  ["27-lagos", "Students and volunteers hold signs at a school visit in Lagos"],
  ["07-bayelsa", "Volunteers and a student pose together outside a school in Bayelsa"],
  ["18-delta", "Students stand beside a volunteer at a school in Delta State"],
  ["28-lagos", "Volunteers meet students in a school yard in Lagos"],
  ["09-bayelsa", "The outreach team poses together in a school hall in Bayelsa"],
  ["19-delta", "A volunteer hands school supplies to a student in Delta State"],
  ["30-lagos", "Students sit in rows during a school visit in Lagos"],
  ["10-bayelsa", "A black-and-white photo of the outreach in a school hall in Bayelsa"],
  ["20-delta", "Volunteers speak to students in a school yard in Delta State"],
  ["29-lagos", "Two outreach volunteers hold a blue sign at a school in Lagos"],
  ["11-bayelsa", "A volunteer takes a group photo outside a school in Bayelsa"],
  ["22-delta", "Students gather in groups for the school visit in Delta State"],
  ["16-bayelsa", "A team member stands with students in a school hall in Bayelsa"],
  ["23-delta", "A volunteer speaks to students from the steps in Delta State"],
  ["25-delta", "A volunteer meets a student on the school steps in Delta State"],
].map(([filename, alt], id) => ({ id, src: `/project100/outreach/${filename}.webp`, alt }))

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
          <PhotoSlideshow photos={outreachPhotos} label="Project100 school visit photos" intervalMs={1800} photoClassName="aspect-[4/3]" sizes="(max-width: 767px) calc(100vw - 32px), 50vw" />
          <figcaption className="mt-2 text-xs text-slate-600">
            Photos from <a href="https://www.linkedin.com/showcase/project100-schoharships/" className="underline underline-offset-2">Project100 Scholarship’s school visits</a>.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
