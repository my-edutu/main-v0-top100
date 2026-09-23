import Image from 'next/image'
import { PROGRAMME_ARTWORK } from '@/lib/events/programme-artwork'

export function ProgrammeCover({ sessionNumber, className = '' }: { sessionNumber: number | null; className?: string }) {
  const artwork = PROGRAMME_ARTWORK[sessionNumber ?? 0]
  return <div className={`programme-cover ${className}`}>
    <Image src={artwork?.src ?? '/programme/afl-october-2026/onboarding.png'} alt="" fill sizes="(max-width: 700px) 100vw, 220px" className="object-cover" />
    <div className="programme-cover-wash" />
    <span className="programme-cover-label">{sessionNumber === 0 ? 'Onboarding' : `Session ${String(sessionNumber ?? '').padStart(2, '0')}`}</span>
  </div>
}
