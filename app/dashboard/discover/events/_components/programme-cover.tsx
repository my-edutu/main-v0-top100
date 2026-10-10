import Image from '@/components/safe-image'
import { PROGRAMME_ARTWORK } from '@/lib/events/programme-artwork'

export function ProgrammeCover({ sessionNumber, className = '' }: { sessionNumber: number | null; className?: string }) {
  const artwork = PROGRAMME_ARTWORK[sessionNumber ?? 0]
  return <div className={`programme-cover ${className}`}>
    <Image src={artwork?.src ?? '/programme/afl-october-2026/onboarding-2026.jpg'} alt="" fill sizes="(max-width: 700px) 100vw, 220px" className={sessionNumber === 0 ? 'bg-[#FFC528] object-contain' : 'object-cover'} />
    {sessionNumber !== 0 ? <div className="programme-cover-wash" /> : null}
    {sessionNumber !== 0 ? <span className="programme-cover-label">Session {String(sessionNumber ?? '').padStart(2, '0')}</span> : null}
  </div>
}
