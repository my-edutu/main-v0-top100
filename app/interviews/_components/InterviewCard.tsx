import Image from 'next/image'
import Link from 'next/link'
import { FileText, Play } from 'lucide-react'

import type { InterviewCardView } from '@/lib/interviews/mappers'

export default function InterviewCard({ interview }: { interview: InterviewCardView }) {
  const meta = [interview.country, interview.cohortYear ? `${interview.cohortYear} cohort` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link
      href={`/interviews/${interview.slug}`}
      className="group flex flex-col overflow-hidden rounded-[22px] border border-orange-100 bg-white transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_18px_40px_-24px_rgba(249,115,22,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
        {interview.thumbnailUrl ? (
          <Image
            src={interview.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500" />
        )}

        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
          {interview.format === 'written' ? (
            <>
              <FileText className="h-3 w-3" aria-hidden="true" /> Written
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-orange-700" aria-hidden="true" /> Video
            </>
          )}
        </span>

        {interview.durationLabel ? (
          <span className="absolute bottom-3 right-3 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {interview.durationLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <h3 className="text-base font-semibold leading-snug text-slate-900 group-hover:text-orange-700">
          {interview.title}
        </h3>
        <p className="text-sm font-semibold text-orange-600">{interview.awardeeName}</p>
        {meta ? <p className="text-xs text-slate-500">{meta}</p> : null}
      </div>
    </Link>
  )
}
