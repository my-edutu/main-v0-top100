"use client"

import { useState } from "react"
import Image from "next/image"
import { Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

type BlogCoverProps = {
  imageUrl?: string | null
  fallbackImageUrls?: readonly string[]
  title: string
  alt?: string | null
  className?: string
  priority?: boolean
  sizes?: string
  variant?: "card" | "hero"
}

/**
 * Seeded posts point at `/placeholder.svg`, which loads fine but renders as a
 * grey stock box. Treat it as "no cover" so the branded fallback shows instead.
 */
const hasRealCover = (url?: string | null) =>
  Boolean(url) && !url!.startsWith("/placeholder.svg")

/**
 * `fill` with no `sizes` makes Next assume 100vw and hand back a full-width
 * render, which is how covers used to pull megabytes out of Storage for a card
 * a few hundred pixels wide. Callers that know their layout pass their own.
 */
const DEFAULT_SIZES: Record<NonNullable<BlogCoverProps["variant"]>, string> = {
  card: "(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw",
  hero: "(max-width: 1200px) 100vw, 1200px",
}

export default function BlogCover({
  imageUrl,
  fallbackImageUrls = [],
  title,
  alt,
  className,
  priority = false,
  sizes,
  variant = "card",
}: BlogCoverProps) {
  const candidates = [...new Set([imageUrl, ...fallbackImageUrls].filter(hasRealCover))] as string[]
  const candidateKey = candidates.join("\u0000")
  const [imageState, setImageState] = useState({ candidateKey, activeIndex: 0 })
  const activeImageIndex = imageState.candidateKey === candidateKey ? imageState.activeIndex : 0

  const activeImage = candidates[activeImageIndex]

  return (
    // The brand gradient is set inline: globals.css rewrites `from-zinc-950`
    // to a near-white under html.light, which used to leave the fallback cover
    // rendering white-on-white.
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={{
        backgroundImage:
          "linear-gradient(135deg, #fbbf24 0%, #f59e0b 52%, #d97706 100%)",
      }}
      aria-label={title}
      data-story-cover-count={candidates.length}
    >
      {activeImage ? (
        <Image
          key={`${candidateKey}-${activeImageIndex}`}
          src={activeImage}
          alt={alt ?? title}
          fill
          className="object-cover"
          priority={priority}
          sizes={sizes ?? DEFAULT_SIZES[variant]}
          onError={() => {
            setImageState({
              candidateKey,
              activeIndex: advanceStoryCoverIndex(activeImageIndex, candidates.length),
            })
          }}
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.30),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(180,83,9,0.22),_transparent_40%)]" />
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#ffffff40] blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-[#b4530933] blur-3xl" />
          <div className="relative flex h-full min-h-full items-center justify-center p-4 text-center">
            <div className="max-w-[90%] space-y-3">
              <div
                className={cn(
                  "mx-auto inline-flex items-center gap-2 rounded-full border border-[#451a0333] bg-[#ffffff59] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#451a03]",
                  variant === "hero" && "px-4 py-2 text-[11px]",
                )}
              >
                <Sparkles className="h-3 w-3" />
                Top100 Stories
              </div>
              <p
                className={cn(
                  "font-semibold text-[#451a03]",
                  variant === "hero"
                    ? "text-sm sm:text-lg"
                    : "text-xs leading-relaxed sm:text-sm line-clamp-3",
                )}
              >
                {title}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function advanceStoryCoverIndex(currentIndex: number, candidateCount: number): number {
  return Math.min(currentIndex + 1, candidateCount)
}
