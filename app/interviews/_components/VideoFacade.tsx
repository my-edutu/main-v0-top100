'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'

import { cn } from '@/lib/utils'

type VideoFacadeProps = {
  videoId: string
  title: string
  thumbnailUrl: string | null
  className?: string
}

/**
 * Renders a thumbnail and only mounts the YouTube iframe once the user asks for
 * it. A grid of live embeds pulls in the player bundle for every card and makes
 * the page crawl.
 */
export default function VideoFacade({ videoId, title, thumbnailUrl, className }: VideoFacadeProps) {
  const [playing, setPlaying] = useState(false)

  return (
    <div
      className={cn(
        'relative aspect-video w-full overflow-hidden rounded-[22px] bg-slate-900',
        className,
      )}
    >
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play interview: ${title}`}
          className="group absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-400"
        >
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : null}
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-lg transition group-hover:scale-110">
            <Play className="ml-1 h-6 w-6 fill-orange-600 text-orange-600" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  )
}
