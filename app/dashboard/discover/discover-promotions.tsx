'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Pause, Play } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'

import SafeImage from '@/components/safe-image'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import project100Cover from '@/public/dashboard/banners/project100-scholarship-roadside.png'

const promotions = [
  {
    title: 'Opportunities',
    description: 'Find scholarships, fellowships and roles.',
    href: '/dashboard/discover/opportunities',
    image: '/edutu-top100-partnership.png',
    background: 'bg-[#fff0ce]',
    imageBlend: 'from-[#fff0ce]',
  },
  {
    title: 'Project100 Scholarship',
    description: 'Join your group. Keep a child in school.',
    href: '/dashboard/me/project100-scholarship',
    image: project100Cover,
    background: 'bg-[#dff2e7]',
    imageBlend: 'from-[#dff2e7]',
  },
]

export function DiscoverPromotions() {
  const carousel = useRef<HTMLDivElement>(null)
  const [api, setApi] = useState<CarouselApi>()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!api) return
    const update = () => setActive(api.selectedScrollSnap())
    api.on('select', update).on('reInit', update)
    return () => { api.off('select', update).off('reInit', update) }
  }, [api])

  useEffect(() => {
    if (!api || paused || reducedMotion) return

    const timer = window.setInterval(() => {
      if (!document.hidden && !carousel.current?.matches(':hover, :focus-within')) {
        api.scrollTo((api.selectedScrollSnap() + 1) % promotions.length)
      }
    }, 6000)
    return () => window.clearInterval(timer)
  }, [active, api, paused, reducedMotion])

  return (
    <Carousel
      ref={carousel}
      setApi={setApi}
      opts={{ loop: true, breakpoints: { '(prefers-reduced-motion: reduce)': { duration: 0 } } }}
      aria-label="Featured on Discover"
    >
      <CarouselContent className="ml-0 touch-pan-y">
        {promotions.map((promotion, index) => (
          <CarouselItem key={promotion.href} className="pl-0" aria-label={promotion.title} aria-hidden={index !== active}>
            <Link
              href={promotion.href}
              aria-label={promotion.title}
              tabIndex={index === active ? 0 : -1}
              className={`relative isolate flex min-h-[132px] items-center overflow-hidden rounded-2xl px-4 py-4 text-[#211d24] focus-visible:!outline-offset-[-3px] sm:min-h-[152px] sm:px-7 ${promotion.background}`}
            >
              <div className="pointer-events-none absolute inset-y-0 right-0 w-[48%] sm:w-1/2">
                <SafeImage src={promotion.image} alt="" fill sizes="(max-width: 640px) 48vw, 50vw" className="object-cover object-[65%_50%]" draggable={false} />
                <div className={`absolute inset-0 bg-gradient-to-r ${promotion.imageBlend} via-transparent to-transparent`} />
              </div>
              <div className="relative max-w-[62%] sm:max-w-[50%]">
                <h2 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">{promotion.title}</h2>
                <p className="mt-1.5 text-sm leading-snug">{promotion.description}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold">
                  Explore <ArrowUpRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="flex items-center justify-center">
        {promotions.map((promotion, index) => (
          <button
            key={promotion.href}
            type="button"
            aria-label={`Show ${promotion.title}`}
            aria-pressed={index === active}
            onClick={() => api?.scrollTo(index, Boolean(reducedMotion))}
            className="grid h-11 w-11 place-items-center rounded-full"
          >
            <span aria-hidden="true" className={`h-2 rounded-full ${index === active ? 'w-5 bg-[#9a3412]' : 'w-2 bg-stone-400'}`} />
          </button>
        ))}
        {!reducedMotion && (
          <button
            type="button"
            aria-label={paused ? 'Play featured cards' : 'Pause featured cards'}
            onClick={() => setPaused(value => !value)}
            className="grid h-11 w-11 place-items-center rounded-full text-stone-600"
          >
            {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          </button>
        )}
      </div>
    </Carousel>
  )
}
