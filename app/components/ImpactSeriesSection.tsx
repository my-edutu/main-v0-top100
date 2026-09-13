"use client"

import { ArrowRight, ArrowUpRight, Play } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

type ImpactSeriesSectionProps = {
  stacked?: boolean
  videos?: readonly {
    title: string
    image: string
    href?: string
    author?: string
    awardeeHref?: string
  }[]
}

const defaultVideos = [
  {
    title: "The Uncomfortable Truth About Winning Elite Scholarships | Success Ndubuisi Okafor",
    image: "https://i.ytimg.com/vi/41hmjQYnL5U/hqdefault.jpg",
    href: "https://youtu.be/41hmjQYnL5U?si=IaKY6caqZ9-suDfF",
    author: "Success Ndubuisi Okafor",
    awardeeHref: "/awardees/ndubuisi-success-ifeanyichukwu",
  },
  {
    title: "From Self-Leadership to Societal Impact | Goodness Ajamu",
    image: "https://i.ytimg.com/vi/qQPn5qTg9TU/hqdefault.jpg",
    href: "https://youtu.be/qQPn5qTg9TU?si=BhTFur0ZtafCxoUX",
    author: "Goodness Ajamu",
    awardeeHref: "/awardees/goodness-ajamu",
  },
  {
    title: "How to Build a Roadmap for Career Success | Lilian Onofiok",
    image: "https://i.ytimg.com/vi/EWz_ooX-x7s/hqdefault.jpg",
    href: "https://youtu.be/EWz_ooX-x7s?si=cBwoB_VeHqu14WRU",
    author: "Lilian Onofiok",
    awardeeHref: "/awardees/onofiok-lillian-okpo",
  },
] as const

export default function ImpactSeriesSection({ videos = defaultVideos, stacked = false }: ImpactSeriesSectionProps) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 3
  const pageCount = stacked ? Math.max(1, Math.ceil(videos.length / pageSize)) : 1
  const safeCurrentPage = Math.min(currentPage, pageCount - 1)
  const visibleVideos = stacked ? videos.slice(safeCurrentPage * pageSize, (safeCurrentPage + 1) * pageSize) : videos

  return (
    <section className={stacked ? "relative overflow-hidden bg-white py-14 text-slate-950 sm:py-20" : "relative overflow-hidden bg-[#10151f] py-16 text-white sm:py-20"}>
      {!stacked && <>
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-700/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
      </>}
      <div className="container relative space-y-8">
        {!stacked && <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Impact series</p>
            <h2 className="text-3xl font-semibold tracking-tight !text-white sm:text-4xl">Interviews with Leaders Making Impact</h2>
            <p className="max-w-xl text-sm leading-7 text-white/70 sm:text-base">
              Meet the people, projects, and conversations shaping a more ambitious future for Africa.
            </p>
          </div>
        </div>}

        <div className={stacked ? 'grid grid-cols-1 gap-10 md:gap-14' : '-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] md:overflow-visible md:px-0 md:pb-0'}>
          {visibleVideos.map((video, index) => {
            const card = (
              <article className={stacked ? "group relative aspect-video overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200" : "group relative min-h-[270px] overflow-hidden rounded-2xl bg-white/5"}>
                {activeVideo === video.href ? (
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`${video.href?.replace('youtu.be/', 'www.youtube-nocookie.com/embed/').split('?')[0]}?autoplay=1&rel=0`}
                    title={`Playing ${video.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <Image
                      src={video.image}
                      alt=""
                      fill
                      sizes={stacked ? "(max-width: 768px) 100vw, 768px" : "(max-width: 768px) 86vw, 50vw"}
                      priority={index === 0}
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className={stacked ? "relative flex h-full items-center justify-center p-5" : "relative flex min-h-[270px] items-center justify-center p-5"}>
                      <span className="flex size-16 items-center justify-center rounded-full bg-white text-slate-950 shadow-xl transition duration-300 group-hover:scale-110 group-hover:bg-orange-400" aria-hidden="true">
                        {video.href ? <Play className="ml-1 size-6 fill-current" /> : <ArrowUpRight className="size-5" />}
                      </span>
                    </div>
                  </>
                )}
              </article>
            )

            if (stacked) {
              return (
                <div key={video.title} className="space-y-4">
                  {activeVideo === video.href ? (
                    <div>{card}</div>
                  ) : (
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => video.href && setActiveVideo(video.href)}
                      aria-label={`Play ${video.title}`}
                    >
                      {card}
                    </button>
                  )}
                  <div className="space-y-2 px-1">
                    <h3 className="max-w-3xl text-xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-2xl">{video.title}</h3>
                    {video.author && video.awardeeHref ? (
                      <p className="text-sm text-slate-600 sm:text-base">
                        Interview with{" "}
                        <Link href={video.awardeeHref} className="font-semibold text-orange-700 underline decoration-orange-300 underline-offset-4 transition hover:text-orange-900">
                          {video.author}
                        </Link>
                      </p>
                    ) : null}
                    {video.href ? (
                      <a href={video.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 pt-1 text-sm font-semibold text-slate-900 underline decoration-orange-400 underline-offset-4 transition hover:text-orange-700">
                        Watch the full interview <ArrowUpRight className="size-4" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </div>
              )
            }

            return activeVideo === video.href ? <div key={video.title}>{card}</div> : (
              <button
                key={video.title}
                type="button"
                className="block min-w-[86vw] snap-start text-left md:min-w-0"
                onClick={() => video.href && setActiveVideo(video.href)}
                aria-label={`Play ${video.title}`}
              >
                {card}
              </button>
            )
          })}
        </div>

        {stacked && (
          <nav className="flex flex-wrap items-center justify-center gap-2 pt-1" aria-label="Interview pages">
            {Array.from({ length: pageCount }, (_, page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                aria-label={`Go to interview page ${page + 1}`}
                aria-current={safeCurrentPage === page ? "page" : undefined}
                className={safeCurrentPage === page ? "inline-flex size-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white" : "inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-700"}
              >
                {page + 1}
              </button>
            ))}
          </nav>
        )}

        {!stacked && <div className="-mt-1 flex items-center justify-start gap-4 pt-0">
          <Link href="/impactseries" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
            View more impact
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>}
      </div>
    </section>
  )
}
