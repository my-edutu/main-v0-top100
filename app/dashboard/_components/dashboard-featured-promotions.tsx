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

const homePromotions = [
  { title: 'Find your community.', href: '/dashboard/discover/groups' },
  ...promotions,
]

export function DashboardFeaturedPromotions({ home = false }: { home?: boolean }) {
  const cards = home ? homePromotions : promotions
  const region = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const [api, setApi] = useState<CarouselApi>()
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!api) return
    const update = () => setActive(api.selectedScrollSnap())
    api.on('select', update).on('reInit', update)
    return () => { api.off('select', update).off('reInit', update) }
  }, [api])

  useEffect(() => {
    if (!api || paused || reducedMotion) return
    const timer = window.setInterval(() => {
      if (!document.hidden && !region.current?.matches(':hover, :focus-within')) {
        api.scrollTo((api.selectedScrollSnap() + 1) % cards.length)
      }
    }, 6000)
    return () => window.clearInterval(timer)
  }, [active, api, cards.length, paused, reducedMotion])

  return (
    <Carousel
      ref={region}
      className={home ? 'col-span-full' : undefined}
      setApi={setApi}
      opts={{ loop: true, breakpoints: { '(prefers-reduced-motion: reduce)': { duration: 0 } } }}
      aria-label={home ? 'Featured on Home' : 'Featured on Discover'}
    >
      <CarouselContent className="ml-0 touch-pan-y">
        {cards.map((promotion, index) => (
          <CarouselItem key={promotion.href} className="pl-0" aria-label={promotion.title} aria-hidden={index !== active}>
            {'image' in promotion ? <Link
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
            </Link> : (
              <Link
                href={promotion.href}
                aria-label={promotion.title}
                tabIndex={index === active ? 0 : -1}
                className="discover-advert discover-advert--whatsapp !aspect-auto !min-h-[132px] sm:!min-h-[152px]"
              >
                <div className="discover-advert__copy">
                  <p>Your people are here</p>
                  <h2>Find your community.</h2>
                  <span>Discover your group <ArrowUpRight size={14} aria-hidden="true" /></span>
                </div>
                <div className="discover-advert__art" aria-hidden="true">
                  <svg viewBox="0 0 64 64" focusable="false">
                    <circle cx="32" cy="32" r="27" fill="#fff" />
                    <path fill="#075e54" d="M32 5C17.1 5 5 17 5 31.8c0 4.8 1.3 9.4 3.7 13.5L5 59l14.1-3.7A27 27 0 1 0 32 5Zm0 48.7c-4.2 0-8.3-1.1-11.9-3.4l-.9-.5-8.4 2.2 2.2-8.2-.6-1A21.5 21.5 0 1 1 32 53.7Z" />
                    <path fill="#075e54" d="M43.8 37.3c-.7-.4-4-2-4.7-2.2-.6-.2-1.1-.4-1.5.4-.5.7-1.8 2.2-2.2 2.7-.4.5-.8.5-1.5.2-.7-.4-2.9-1.1-5.5-3.4-2-1.8-3.4-4-3.8-4.7-.4-.7 0-1.1.3-1.4.3-.3.7-.8 1.1-1.2.4-.4.5-.7.7-1.1.2-.5.1-.9 0-1.2-.2-.4-1.5-3.6-2.1-4.9-.5-1.2-1.1-1-1.5-1h-1.3c-.5 0-1.2.2-1.8.9-.6.7-2.4 2.3-2.4 5.5s2.5 6.4 2.8 6.9c.4.5 4.8 7.4 11.6 10.4 1.6.7 2.8 1.1 3.8 1.4 1.6.5 3 .4 4.1.2 1.3-.2 4-1.6 4.6-3.2.6-1.6.6-2.9.4-3.2-.2-.3-.6-.5-1.3-.8Z" />
                  </svg>
                </div>
              </Link>
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="flex justify-center">
        {!home && cards.map((card, index) => (
          <button
            key={card.href}
            type="button"
            aria-label={`Show ${card.title.replace(/\.$/, '')}`}
            aria-pressed={active === index}
            onClick={() => api?.scrollTo(index, Boolean(reducedMotion))}
            className="grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-orange-700"
          >
            <span aria-hidden="true" className={`h-2 rounded-full ${active === index ? 'w-5 bg-[#9a3412]' : 'w-2 bg-stone-400'}`} />
          </button>
        ))}
        {!reducedMotion && <button
          type="button"
          aria-label={paused ? 'Play featured cards' : 'Pause featured cards'}
          onClick={() => setPaused(value => !value)}
          className={home
            ? 'sr-only focus:not-sr-only focus:absolute focus:bottom-2 focus:right-2 focus:z-10 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:outline-2 focus:outline-orange-700'
            : 'grid size-11 place-items-center rounded-full text-stone-600 focus-visible:outline-2 focus-visible:outline-orange-700'}
        >
          {home ? (paused ? 'Play featured cards' : 'Pause featured cards')
            : paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        </button>}
      </div>
    </Carousel>
  )
}
