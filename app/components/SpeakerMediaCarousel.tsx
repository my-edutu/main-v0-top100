"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"

import type { Speaker } from "@/lib/speakers"

export default function SpeakerMediaCarousel({ speaker }: { speaker: Speaker }) {
  const slides = useMemo(
    () => [
      { src: speaker.portrait, alt: `${speaker.name} portrait` },
      {
        src: speaker.bioArtwork ?? speaker.announcementArtwork ?? speaker.portrait,
        alt: `${speaker.name} Top100 speaker artwork`,
      },
    ],
    [speaker.announcementArtwork, speaker.bioArtwork, speaker.name, speaker.portrait],
  )
  const [active, setActive] = useState(0)
  const [canAnimate, setCanAnimate] = useState(false)
  const reduceMotion = useReducedMotion()
  const railRef = useRef<HTMLDivElement | null>(null)
  const slideRefs = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    setCanAnimate(reduceMotion === false)
  }, [reduceMotion])

  useEffect(() => {
    if (!canAnimate || slides.length < 2) return

    const timer = setInterval(() => {
      const next = (active + 1) % slides.length
      setActive(next)
      const slide = slideRefs.current[next]
      const rail = railRef.current
      if (slide && rail) {
        rail.scrollTo({ left: slide.offsetLeft - rail.offsetLeft, behavior: "smooth" })
      }
    }, 7000)

    return () => clearInterval(timer)
  }, [active, canAnimate, slides.length])

  const goTo = (index: number) => {
    setActive(index)
    const slide = slideRefs.current[index]
    const rail = railRef.current
    if (slide && rail) {
      rail.scrollTo({ left: slide.offsetLeft - rail.offsetLeft, behavior: "smooth" })
    }
  }

  return (
    <section
      aria-label={`${speaker.name} profile images`}
      className="space-y-4"
      data-speaker-media-carousel={speaker.name}
    >
      <div ref={railRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] lg:grid lg:grid-cols-2 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {slides.map((slide, index) => (
          <figure
            key={`${slide.src}-${index}`}
            ref={(node) => {
              slideRefs.current[index] = node
            }}
            className="relative min-w-[86%] snap-center overflow-hidden rounded-[1.75rem] bg-slate-200 sm:min-w-[68%] lg:min-w-0"
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              width={720}
              height={900}
              className="aspect-[4/5] h-auto w-full object-cover"
              sizes="(max-width: 1023px) 86vw, 38vw"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent px-5 pb-4 pt-14 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {index === 0 ? "Profile portrait" : "Top100 story"}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 lg:hidden">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Swipe to explore</p>
        <div className="flex items-center gap-2" aria-label="Choose profile image">
          {slides.map((slide, index) => (
            <button
              key={`${slide.src}-dot`}
              type="button"
              aria-label={`Show image ${index + 1}`}
              aria-current={active === index}
              onClick={() => goTo(index)}
              className={`h-2 rounded-full transition-[width,background-color] motion-reduce:transition-none ${active === index ? "w-7 bg-orange-700" : "w-2 bg-slate-300"}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
