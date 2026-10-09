'use client'

import { useEffect, useRef, useState } from 'react'
import Image from '@/components/safe-image'
import AwardeePortrait from './AwardeePortrait'

export default function AwardeeMediaCarousel({ name, portraitSources, coverUrl }: { name: string; portraitSources: (string | null | undefined)[]; coverUrl: string | null }) {
  const track = useRef<HTMLDivElement>(null)
  const pauseUntil = useRef(0)
  const [active, setActive] = useState(0)
  const [coverFailed, setCoverFailed] = useState(false)
  const hasCover = Boolean(coverUrl) && !coverFailed

  function show(index: number) {
    pauseUntil.current = Date.now() + 10000
    track.current?.scrollTo({ left: (track.current?.clientWidth ?? 0) * index, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    setActive(index)
  }

  useEffect(() => {
    if (!hasCover) return
    const timer = window.setInterval(() => {
      if (Date.now() < pauseUntil.current || !track.current) return
      const next = Math.round(track.current.scrollLeft / track.current.clientWidth) === 0 ? 1 : 0
      track.current.scrollTo({ left: track.current.clientWidth * next, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
      setActive(next)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [hasCover])

  return (
    <div className="mx-auto w-40 sm:mx-0 sm:w-52">
      <div ref={track} className="flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth rounded-[18px] bg-stone-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onPointerDown={() => { pauseUntil.current = Date.now() + 10000 }} onScroll={(event) => { const element = event.currentTarget; setActive(Math.round(element.scrollLeft / element.clientWidth)) }}>
        <div id="awardee-portrait-slide" className="relative h-full w-full shrink-0 snap-center scroll-mt-28"><AwardeePortrait name={name} sources={portraitSources} /></div>
        {hasCover && coverUrl && <div id="awardee-cover-slide" className="relative h-full w-full shrink-0 snap-center scroll-mt-28 bg-[#fff4e4]"><Image src={coverUrl} alt={`${name} awardee cover`} fill sizes="(max-width: 640px) 160px, 208px" className="object-contain" onError={() => { setCoverFailed(true); show(0) }} /></div>}
      </div>
      {hasCover && <div className="mt-2 flex justify-center gap-1 sm:justify-start" aria-label={`${name} profile images`}>
        <a href="#awardee-portrait-slide" onClick={(event) => { event.preventDefault(); show(0) }} aria-label="Show profile portrait" aria-current={active === 0 ? 'true' : undefined} className="inline-flex min-h-11 items-center rounded-full border border-stone-200 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100">Portrait</a>
        <a href="#awardee-cover-slide" onClick={(event) => { event.preventDefault(); show(1) }} aria-label="Show awardee cover" aria-current={active === 1 ? 'true' : undefined} className="inline-flex min-h-11 items-center rounded-full border border-stone-200 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100">Cover</a>
      </div>}
    </div>
  )
}
