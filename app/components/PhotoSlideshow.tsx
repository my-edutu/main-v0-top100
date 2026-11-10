"use client"

import { useEffect, useRef, useState } from "react"
import { useInView } from "framer-motion"
import { Pause, Play } from "lucide-react"

import Image from "@/components/safe-image"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { cn } from "@/lib/utils"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"

type Photo = { id: number; src: string; alt: string }

export default function PhotoSlideshow({
  photos,
  label,
  intervalMs = 4000,
  className,
  photoClassName = "aspect-video",
  sizes = "(max-width: 928px) calc(100vw - 32px), 896px",
}: {
  photos: Photo[]
  label: string
  intervalMs?: number
  className?: string
  photoClassName?: string
  sizes?: string
}) {
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(0)
  const [paused, setPaused] = useState(false)
  const carousel = useRef<HTMLDivElement>(null)
  const isInView = useInView(carousel, { amount: 0.25 })
  const reducedMotion = usePrefersReducedMotion()
  const canRotate = !reducedMotion && photos.length > 1

  useEffect(() => {
    if (!api) return
    const syncSelection = () => setSelected(api.selectedScrollSnap())
    syncSelection()
    api.on("select", syncSelection)
    return () => { api.off("select", syncSelection) }
  }, [api])

  useEffect(() => {
    if (!api || !isInView || !canRotate || paused) return

    const interval = window.setInterval(() => {
      if (!document.hidden) api.scrollNext()
    }, intervalMs)
    return () => window.clearInterval(interval)
  }, [api, canRotate, intervalMs, isInView, paused, selected])

  const rotationAction = paused ? "Play photo slideshow" : "Pause photo slideshow"

  return (
    <Carousel
      ref={carousel}
      aria-label={label}
      tabIndex={0}
      setApi={setApi}
      opts={{ loop: true, breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } } }}
      className={cn("overflow-hidden rounded-2xl border border-orange-100 bg-[#fff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 sm:rounded-3xl", className)}
    >
      <CarouselContent className="ml-0 touch-pan-y touch-pinch-zoom">
        {photos.map((photo, index) => (
          <CarouselItem
            key={photo.id}
            aria-label={`${index + 1} of ${photos.length}`}
            aria-hidden={index !== selected}
            className={cn("relative bg-orange-50 pl-0", photoClassName)}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes={sizes}
              className="object-contain"
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      {canRotate && (
        <button
          type="button"
          aria-label={rotationAction}
          title={rotationAction}
          className="absolute bottom-2 right-2 grid size-11 place-items-center rounded-full bg-slate-950/85 text-[#fff] hover:bg-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-4 sm:right-4"
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}
        </button>
      )}
    </Carousel>
  )
}
