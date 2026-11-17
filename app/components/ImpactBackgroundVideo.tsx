"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play } from "lucide-react"

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

export default function ImpactBackgroundVideo({ deferUntilVisible = false }: { deferUntilVisible?: boolean }) {
  const reducedMotion = usePrefersReducedMotion()
  const video = useRef<HTMLVideoElement>(null)
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false)
  const [playing, setPlaying] = useState(false)
  const videoEnabled = !reducedMotion && (!deferUntilVisible || hasEnteredViewport)
  const action = playing ? "Pause background video" : "Play background video"

  useEffect(() => {
    const player = video.current
    if (!player || reducedMotion || !deferUntilVisible || hasEnteredViewport) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasEnteredViewport(true)
        observer.disconnect()
      }
    })
    observer.observe(player)
    return () => observer.disconnect()
  }, [deferUntilVisible, hasEnteredViewport, reducedMotion])

  return (
    <>
      <video
        key={videoEnabled ? "motion" : "poster"}
        ref={video}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover"
        src={videoEnabled ? "/impact-hero.mp4" : undefined}
        poster="/impact-hero-poster.webp"
        autoPlay={videoEnabled}
        loop
        muted
        playsInline
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {videoEnabled && (
        <button
          type="button"
          aria-label={action}
          title={action}
          className="absolute bottom-3 right-4 z-10 grid size-11 place-items-center rounded-full border border-white/50 bg-slate-950/80 text-[#fff] transition hover:bg-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-5 sm:right-6"
          onClick={() => {
            const player = video.current
            if (!player) return
            if (player.paused) void player.play().catch(() => setPlaying(false))
            else player.pause()
          }}
        >
          {playing ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
        </button>
      )}
    </>
  )
}
