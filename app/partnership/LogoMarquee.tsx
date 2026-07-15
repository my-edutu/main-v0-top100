"use client"

import Image from "next/image"
import { Building2, Globe2, Landmark, Briefcase, Banknote } from "lucide-react"

// Cycle a small set of icons for institutions without a brand mark on file.
const ICONS = [Landmark, Building2, Globe2, Briefcase, Banknote]

type Institution = { name: string; logo: string | null }

/**
 * Marquee of institutions our speakers are affiliated with. Renders the real
 * brand mark from /public/logos when available, and falls back to an icon.
 */
export default function LogoMarquee({
  items,
  offset = 0,
}: {
  items: Institution[]
  offset?: number
}) {
  // Duplicate the list so the horizontal loop is seamless.
  const loop = [...items, ...items]

  return (
    <div className="group relative overflow-hidden py-2">
      {/* soft edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#faf6ef] to-transparent sm:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#faf6ef] to-transparent sm:w-28" />

      <div className="animate-partner-marquee flex w-max items-center gap-3 group-hover:[animation-play-state:paused]">
        {loop.map((item, index) => {
          const Icon = ICONS[(offset + index) % ICONS.length]
          return (
            <div
              key={`${item.name}-${index}`}
              className="flex h-16 shrink-0 items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white px-6"
            >
              {item.logo ? (
                <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                  <Image
                    src={item.logo}
                    alt={`${item.name} logo`}
                    width={24}
                    height={24}
                    className="h-6 w-6 object-contain"
                  />
                </span>
              ) : (
                <Icon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              )}
              <span className="whitespace-nowrap text-base font-semibold tracking-tight text-slate-500 transition-colors duration-300 hover:text-slate-900 sm:text-lg">
                {item.name}
              </span>
            </div>
          )
        })}
      </div>

      <style jsx global>{`
        @keyframes partner-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .animate-partner-marquee {
          animation: partner-marquee 55s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-partner-marquee {
            animation: none;
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
