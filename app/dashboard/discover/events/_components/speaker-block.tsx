import Link from 'next/link'
import { ArrowUpRight, UserRound } from 'lucide-react'
import type { ProgrammeSpeaker } from '@/lib/events/programme-api'

export function SpeakerBlock({ speaker }: { speaker: ProgrammeSpeaker | null }) {
  if (!speaker || speaker.status !== 'published') {
    return (
      <div className="programme-speaker programme-speaker-placeholder">
        <div className="programme-speaker-avatar"><UserRound aria-hidden="true" className="h-5 w-5" /></div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">Featured speaker</p>
          <p className="mt-1 text-sm font-medium text-stone-900">Speaker to be unveiled</p>
        </div>
      </div>
    )
  }

  return (
    <Link href={`/dashboard/discover/speakers/${speaker.slug}`} className="programme-speaker group/speaker">
      <div className="programme-speaker-avatar overflow-hidden bg-orange-100">
        {speaker.portraitUrl ? <img src={speaker.portraitUrl} alt="" className="h-full w-full object-cover" /> : <UserRound aria-hidden="true" className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">Featured speaker</p>
        <p className="mt-1 truncate text-sm font-semibold text-stone-950">{speaker.name}</p>
        <p className="truncate text-xs text-stone-500">{[speaker.role, speaker.organisation].filter(Boolean).join(' · ') || 'View profile'}</p>
      </div>
      <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-stone-400 transition group-hover/speaker:-translate-y-0.5 group-hover/speaker:translate-x-0.5 group-hover/speaker:text-orange-600" />
    </Link>
  )
}
