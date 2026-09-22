import Image from 'next/image'
import { PROGRAMME_ARTWORK } from '@/lib/events/programme-artwork'

export function ProgrammeCover({ sessionNumber, title, date, className = '' }: { sessionNumber: number | null; title: string; date?: string; className?: string }) {
  const artwork = PROGRAMME_ARTWORK[sessionNumber ?? 0]
  return <div className={`programme-cover ${className}`}>
    <Image src={artwork?.src ?? '/programme/afl-october-2026/onboarding.png'} alt={artwork?.alt ?? title} fill sizes="(max-width: 700px) 100vw, 220px" className="object-cover" />
    <div className="programme-cover-wash" />
    <div className="programme-cover-copy"><span>{sessionNumber === 0 ? 'Onboarding' : `Session ${String(sessionNumber ?? '').padStart(2, '0')}`}</span><strong>{title}</strong>{date ? <small>{date}</small> : null}</div>
  </div>
}
