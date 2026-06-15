import Image from "next/image"
import { Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

type BlogCoverProps = {
  imageUrl?: string | null
  title: string
  className?: string
  priority?: boolean
  sizes?: string
  variant?: "card" | "hero"
}

export default function BlogCover({
  imageUrl,
  title,
  className,
  priority = false,
  sizes,
  variant = "card",
}: BlogCoverProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-gradient-to-br from-zinc-950 via-orange-950 to-rose-700",
        className,
      )}
      aria-label={title}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          priority={priority}
          sizes={sizes}
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_42%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.16),_transparent_38%)]" />
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-orange-400/20 blur-3xl" />
          <div className="relative flex h-full min-h-full items-center justify-center p-4 text-center">
            <div className="max-w-[90%] space-y-3">
              <div
                className={cn(
                  "mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/80",
                  variant === "hero" && "px-4 py-2 text-[11px]",
                )}
              >
                <Sparkles className="h-3 w-3" />
                Top100 Stories
              </div>
              <p
                className={cn(
                  "font-semibold text-white/95",
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
