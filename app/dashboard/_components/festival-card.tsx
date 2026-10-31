import Link from 'next/link'
import Image from '@/components/safe-image'
import { ArrowUpRight } from 'lucide-react'
import { FESTIVAL_IMAGE } from '@/lib/festival/config'
import './festival.css'

export function FestivalCard() {
  return (
    <Link
      href="/dashboard/festival"
      className="festival-card"
      aria-labelledby="festival-card-title"
    >
      <Image
        src={FESTIVAL_IMAGE}
        alt="Africa Future Leaders Festival 2026 stage in an auditorium"
        fill
        sizes="(min-width: 1024px) 1000px, 100vw"
        priority
      />
      <span className="festival-card__shade" aria-hidden="true" />
      <span className="festival-card__content">
        <span id="festival-card-title" className="festival-card__title">
          Attend Africa Future Leaders Festival
        </span>
        <span className="festival-card__action">
          Register your interest <ArrowUpRight size={18} aria-hidden="true" />
        </span>
      </span>
    </Link>
  )
}
